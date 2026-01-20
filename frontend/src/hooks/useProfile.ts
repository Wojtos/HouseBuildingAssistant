/**
 * useProfile Hook
 *
 * Custom hook for profile operations (get and update user profile).
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchJson, ApiError, handleApiError } from '../lib/apiClient';
import type {
  ProfileResponse,
  ProfileUpdateRequest,
  MeasurementUnit,
} from '../types/api';
import type { ApiErrorVM } from '../types/viewModels';

// =============================================================================
// Types
// =============================================================================

export interface ProfileFormVM {
  full_name: string;
  preferred_units: MeasurementUnit;
  language: string;
  isLoading: boolean;
  isSaving: boolean;
  isDirty: boolean;
  fieldErrors: {
    full_name?: string;
    preferred_units?: string;
    language?: string;
  };
  loadError: ApiErrorVM | null;
  saveError: ApiErrorVM | null;
  lastSavedAt?: string;
}

interface UseProfileState {
  profile: ProfileResponse | null;
  form: ProfileFormVM;
}

interface UseProfileActions {
  updateForm: (updates: Partial<Pick<ProfileFormVM, 'full_name' | 'preferred_units' | 'language'>>) => void;
  saveProfile: () => Promise<boolean>;
  refresh: () => Promise<void>;
}

export type UseProfileReturn = UseProfileState & UseProfileActions;

// =============================================================================
// Initial State
// =============================================================================

const INITIAL_FORM: ProfileFormVM = {
  full_name: '',
  preferred_units: 'METRIC',
  language: 'en',
  isLoading: true,
  isSaving: false,
  isDirty: false,
  fieldErrors: {},
  loadError: null,
  saveError: null,
};

// =============================================================================
// Validation
// =============================================================================

const MAX_FULL_NAME_LENGTH = 255;
const LANGUAGE_REGEX = /^[a-z]{2}$/;

function validateForm(form: ProfileFormVM): ProfileFormVM['fieldErrors'] {
  const errors: ProfileFormVM['fieldErrors'] = {};

  // Validate full_name (optional, max 255 chars)
  if (form.full_name && form.full_name.length > MAX_FULL_NAME_LENGTH) {
    errors.full_name = `Name must be ${MAX_FULL_NAME_LENGTH} characters or less`;
  }

  // Validate preferred_units
  if (!['METRIC', 'IMPERIAL'].includes(form.preferred_units)) {
    errors.preferred_units = 'Please select a valid unit system';
  }

  // Validate language (2 lowercase letters, ISO 639-1)
  const normalizedLang = form.language.toLowerCase().trim();
  if (!LANGUAGE_REGEX.test(normalizedLang)) {
    errors.language = 'Language must be a 2-letter code (e.g., "en")';
  }

  return errors;
}

// =============================================================================
// Hook
// =============================================================================

export function useProfile(): UseProfileReturn {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [form, setForm] = useState<ProfileFormVM>(INITIAL_FORM);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const loadedProfileRef = useRef<ProfileResponse | null>(null);

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setForm((prev) => ({
      ...prev,
      isLoading: true,
      loadError: null,
    }));

    try {
      const response = await fetchJson<ProfileResponse>(
        '/api/profiles/me',
        { signal: abortControllerRef.current.signal }
      );

      setProfile(response);
      loadedProfileRef.current = response;

      setForm({
        full_name: response.full_name || '',
        preferred_units: response.preferred_units,
        language: response.language,
        isLoading: false,
        isSaving: false,
        isDirty: false,
        fieldErrors: {},
        loadError: null,
        saveError: null,
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      let loadError: ApiErrorVM;

      if (err instanceof ApiError) {
        if (err.statusCode === 401) {
          handleApiError(err, '/settings/account');
          return;
        }

        if (err.statusCode === 404) {
          loadError = {
            message: "Your profile record wasn't found. Try signing out and signing back in. If it still happens, contact support.",
            isRetryable: true,
            retryLabel: 'Try Again',
          };
        } else {
          loadError = {
            message: handleApiError(err),
            isRetryable: err.statusCode >= 500 || err.statusCode === 429,
            retryLabel: 'Try Again',
          };
        }
      } else {
        loadError = {
          message: err instanceof Error ? err.message : 'Failed to load profile',
          isRetryable: true,
          retryLabel: 'Try Again',
        };
      }

      setForm((prev) => ({
        ...prev,
        isLoading: false,
        loadError,
      }));
    }
  }, []);

  // Update form fields
  const updateForm = useCallback((
    updates: Partial<Pick<ProfileFormVM, 'full_name' | 'preferred_units' | 'language'>>
  ) => {
    setForm((prev) => {
      const newForm = {
        ...prev,
        ...updates,
        saveError: null,
        fieldErrors: {},
      };

      // Calculate isDirty
      const loaded = loadedProfileRef.current;
      if (loaded) {
        newForm.isDirty = (
          newForm.full_name !== (loaded.full_name || '') ||
          newForm.preferred_units !== loaded.preferred_units ||
          newForm.language.toLowerCase().trim() !== loaded.language
        );
      }

      return newForm;
    });
  }, []);

  // Save profile
  const saveProfile = useCallback(async (): Promise<boolean> => {
    // Validate
    const errors = validateForm(form);
    if (Object.keys(errors).length > 0) {
      setForm((prev) => ({ ...prev, fieldErrors: errors }));
      return false;
    }

    setForm((prev) => ({
      ...prev,
      isSaving: true,
      saveError: null,
      fieldErrors: {},
    }));

    try {
      const request: ProfileUpdateRequest = {
        full_name: form.full_name || undefined,
        preferred_units: form.preferred_units,
        language: form.language.toLowerCase().trim(),
      };

      const response = await fetchJson<ProfileResponse>(
        '/api/profiles/me',
        {
          method: 'PUT',
          body: JSON.stringify(request),
        }
      );

      setProfile(response);
      loadedProfileRef.current = response;

      setForm((prev) => ({
        ...prev,
        full_name: response.full_name || '',
        preferred_units: response.preferred_units,
        language: response.language,
        isSaving: false,
        isDirty: false,
        lastSavedAt: new Date().toISOString(),
      }));

      return true;
    } catch (err) {
      let saveError: ApiErrorVM;

      if (err instanceof ApiError) {
        if (err.statusCode === 401) {
          handleApiError(err, '/settings/account');
          return false;
        }

        if (err.statusCode === 422 || err.errorCode === 'VALIDATION_ERROR') {
          // Map field errors
          const fieldErrors: ProfileFormVM['fieldErrors'] = {};
          if (err.details?.field) {
            const field = err.details.field as keyof ProfileFormVM['fieldErrors'];
            fieldErrors[field] = err.details.reason || err.message;
          }

          setForm((prev) => ({
            ...prev,
            isSaving: false,
            fieldErrors,
            saveError: Object.keys(fieldErrors).length === 0 ? {
              message: err.message || 'Validation error. Please check your input.',
              isRetryable: false,
            } : null,
          }));

          return false;
        }

        saveError = {
          message: handleApiError(err),
          isRetryable: err.statusCode >= 500 || err.statusCode === 429,
          retryLabel: 'Try Again',
        };
      } else {
        saveError = {
          message: err instanceof Error ? err.message : 'Failed to save profile',
          isRetryable: true,
          retryLabel: 'Try Again',
        };
      }

      setForm((prev) => ({
        ...prev,
        isSaving: false,
        saveError,
      }));

      return false;
    }
  }, [form]);

  // Initial fetch
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    profile,
    form,
    updateForm,
    saveProfile,
    refresh: fetchProfile,
  };
}
