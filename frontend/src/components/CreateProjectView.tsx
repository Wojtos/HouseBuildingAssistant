/**
 * CreateProjectView Component
 * 
 * Main view for creating a new project. Handles form state, validation,
 * API integration, and navigation on success.
 */

import { useState, type FormEvent } from 'react';
import { InlineErrorBanner } from './InlineErrorBanner';
import { PhaseSelect } from './PhaseSelect';
import { fetchJson, ApiError, handleApiError } from '../lib/apiClient';
import type {
  ProjectCreateRequest,
  ProjectResponse,
  ConstructionPhase,
} from '../types/api';
import type { CreateProjectFormVM } from '../types/viewModels';

/**
 * Character limits for validation (matching API requirements)
 */
const MAX_NAME_LENGTH = 255;
const MAX_LOCATION_LENGTH = 500;

/**
 * CreateProjectView component
 */
export function CreateProjectView() {
  const [formState, setFormState] = useState<CreateProjectFormVM>({
    name: '',
    location: '',
    current_phase: '', // Empty means use server default (LAND_SELECTION)
    isSubmitting: false,
    fieldErrors: {},
    submitError: null,
  });

  /**
   * Update a single form field and clear its error
   */
  const updateField = (
    field: keyof Pick<CreateProjectFormVM, 'name' | 'location' | 'current_phase'>,
    value: string
  ) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
      fieldErrors: {
        ...prev.fieldErrors,
        [field]: undefined,
      },
      submitError: null,
    }));
  };

  /**
   * Validate form fields client-side
   * Returns true if valid, false otherwise and sets fieldErrors
   */
  const validateForm = (): boolean => {
    const errors: CreateProjectFormVM['fieldErrors'] = {};

    // Validate name (required, max length)
    const trimmedName = formState.name.trim();
    if (!trimmedName) {
      errors.name = 'Project name is required.';
    } else if (trimmedName.length > MAX_NAME_LENGTH) {
      errors.name = `Project name must be ${MAX_NAME_LENGTH} characters or less.`;
    }

    // Validate location (optional, max length)
    if (formState.location.trim().length > MAX_LOCATION_LENGTH) {
      errors.location = `Location must be ${MAX_LOCATION_LENGTH} characters or less.`;
    }

    // Set errors if any
    if (Object.keys(errors).length > 0) {
      setFormState((prev) => ({ ...prev, fieldErrors: errors }));
      return false;
    }

    return true;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Client-side validation
    if (!validateForm()) {
      // Focus first invalid field
      const firstError = Object.keys(formState.fieldErrors)[0];
      if (firstError) {
        document.getElementById(firstError)?.focus();
      }
      return;
    }

    // Set submitting state
    setFormState((prev) => ({
      ...prev,
      isSubmitting: true,
      submitError: null,
      fieldErrors: {},
    }));

    try {
      // Build request payload
      const payload: ProjectCreateRequest = {
        name: formState.name.trim(),
      };

      // Add optional fields only if provided
      if (formState.location.trim()) {
        payload.location = formState.location.trim();
      }

      if (formState.current_phase) {
        payload.current_phase = formState.current_phase as ConstructionPhase;
      }

      // Call API
      const response = await fetchJson<ProjectResponse>('/api/projects', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // Success - redirect to project chat
      window.location.href = `/projects/${response.id}/chat`;
    } catch (error) {
      // Handle API errors
      if (error instanceof ApiError) {
        // Handle validation errors (422)
        if (error.statusCode === 422 && error.details?.field) {
          setFormState((prev) => ({
            ...prev,
            isSubmitting: false,
            fieldErrors: {
              ...prev.fieldErrors,
              [error.details!.field!]: error.details!.reason || error.message,
            },
            submitError: error.message,
          }));
          return;
        }

        // Handle authentication errors (401) - will redirect in handleApiError
        if (error.statusCode === 401) {
          handleApiError(error, '/projects/new');
          return;
        }

        // Other API errors
        setFormState((prev) => ({
          ...prev,
          isSubmitting: false,
          submitError: handleApiError(error),
        }));
      } else {
        // Generic error
        setFormState((prev) => ({
          ...prev,
          isSubmitting: false,
          submitError:
            error instanceof Error
              ? error.message
              : 'An unexpected error occurred. Please try again.',
        }));
      }
    }
  };

  /**
   * Handle back navigation
   */
  const handleBack = () => {
    window.location.href = '/projects';
  };

  const isFormValid =
    formState.name.trim() !== '' && !formState.isSubmitting;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div>
          <button
            type="button"
            onClick={handleBack}
            className="mb-4 flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            disabled={formState.isSubmitting}
          >
            <svg
              className="mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Projects
          </button>
          
          <h2 className="text-center text-3xl font-bold tracking-tight text-gray-900">
            Create New Project
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Start tracking your building project with AI-powered assistance
          </p>
        </div>

        {/* Form Card */}
        <div className="rounded-lg bg-white px-6 py-8 shadow sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Project Name Field */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-gray-700"
              >
                Project Name <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formState.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  disabled={formState.isSubmitting}
                  maxLength={MAX_NAME_LENGTH}
                  className={`block w-full appearance-none rounded-md border px-3 py-2 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 sm:text-sm ${
                    formState.fieldErrors.name
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } ${
                    formState.isSubmitting
                      ? 'bg-gray-100 text-gray-500'
                      : ''
                  }`}
                  placeholder="My Dream House"
                  aria-invalid={!!formState.fieldErrors.name}
                  aria-describedby={
                    formState.fieldErrors.name ? 'name-error' : 'name-hint'
                  }
                />
              </div>
              {formState.fieldErrors.name && (
                <p id="name-error" className="mt-1 text-sm text-red-600">
                  {formState.fieldErrors.name}
                </p>
              )}
              <p id="name-hint" className="mt-1 text-xs text-gray-500">
                {formState.name.length}/{MAX_NAME_LENGTH} characters
              </p>
            </div>

            {/* Location Field */}
            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700"
              >
                Location <span className="text-gray-400">(optional)</span>
              </label>
              <div className="mt-1">
                <input
                  id="location"
                  name="location"
                  type="text"
                  value={formState.location}
                  onChange={(e) => updateField('location', e.target.value)}
                  disabled={formState.isSubmitting}
                  maxLength={MAX_LOCATION_LENGTH}
                  className={`block w-full appearance-none rounded-md border px-3 py-2 placeholder-gray-400 shadow-sm focus:outline-none focus:ring-2 sm:text-sm ${
                    formState.fieldErrors.location
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                  } ${
                    formState.isSubmitting
                      ? 'bg-gray-100 text-gray-500'
                      : ''
                  }`}
                  placeholder="123 Main St, City, State"
                  aria-invalid={!!formState.fieldErrors.location}
                  aria-describedby={
                    formState.fieldErrors.location
                      ? 'location-error'
                      : 'location-hint'
                  }
                />
              </div>
              {formState.fieldErrors.location && (
                <p id="location-error" className="mt-1 text-sm text-red-600">
                  {formState.fieldErrors.location}
                </p>
              )}
              <p id="location-hint" className="mt-1 text-xs text-gray-500">
                {formState.location.length}/{MAX_LOCATION_LENGTH} characters
              </p>
            </div>

            {/* Current Phase Field */}
            <div>
              <label
                htmlFor="current_phase"
                className="block text-sm font-medium text-gray-700"
              >
                Current Phase <span className="text-gray-400">(optional)</span>
              </label>
              <div className="mt-1">
                <PhaseSelect
                  value={formState.current_phase}
                  onChange={(value) => updateField('current_phase', value)}
                  allowEmpty={true}
                  disabled={formState.isSubmitting}
                  error={formState.fieldErrors.current_phase}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Default: Land Selection
              </p>
            </div>

            {/* Submit Error Banner */}
            {formState.submitError && (
              <InlineErrorBanner message={formState.submitError} />
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleBack}
                disabled={formState.isSubmitting}
                className="flex flex-1 justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={!isFormValid}
                className="flex flex-1 justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:hover:bg-gray-300"
              >
                {formState.isSubmitting ? (
                  <span className="flex items-center">
                    <svg
                      className="mr-2 h-4 w-4 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Creating...
                  </span>
                ) : (
                  'Create Project'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
