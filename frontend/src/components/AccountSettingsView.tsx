/**
 * AccountSettingsView Component
 *
 * Allows users to view and update their profile preferences (full name, units, language).
 */

import { useCallback } from 'react';
import { InlineErrorBanner, InlineSuccessBanner } from './InlineErrorBanner';
import { useProfile } from '../hooks/useProfile';
import type { MeasurementUnit } from '../types/api';

// =============================================================================
// Preferred Units Select
// =============================================================================

interface PreferredUnitsSelectProps {
  value: MeasurementUnit;
  onChange: (value: MeasurementUnit) => void;
  disabled?: boolean;
  error?: string;
}

function PreferredUnitsSelect({ value, onChange, disabled, error }: PreferredUnitsSelectProps) {
  return (
    <div>
      <label htmlFor="preferred-units" className="block text-sm font-medium text-gray-700">
        Preferred Units
      </label>
      <select
        id="preferred-units"
        value={value}
        onChange={(e) => onChange(e.target.value as MeasurementUnit)}
        disabled={disabled}
        className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-300 bg-red-50' : 'border-gray-300'
        } disabled:bg-gray-100 disabled:cursor-not-allowed`}
      >
        <option value="METRIC">Metric (meters, kilograms)</option>
        <option value="IMPERIAL">Imperial (feet, pounds)</option>
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      <p className="mt-1 text-xs text-gray-500">
        Used for displaying measurements throughout the application.
      </p>
    </div>
  );
}

// =============================================================================
// Account Settings View
// =============================================================================

export function AccountSettingsView() {
  const { form, updateForm, saveProfile, refresh } = useProfile();

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    await saveProfile();
  }, [saveProfile]);

  const handleBack = () => {
    window.location.href = '/projects';
  };

  // Loading state
  if (form.isLoading) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  // Load error state
  if (form.loadError) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <button
          onClick={handleBack}
          className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Projects
        </button>
        <InlineErrorBanner
          title="Failed to Load Profile"
          message={form.loadError.message}
          actionLabel={form.loadError.isRetryable ? form.loadError.retryLabel : undefined}
          onAction={form.loadError.isRetryable ? refresh : undefined}
        />
      </div>
    );
  }

  const canSave = form.isDirty && !form.isSaving && Object.keys(form.fieldErrors).length === 0;

  return (
    <div className="mx-auto max-w-2xl p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={handleBack}
          className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Projects
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Account Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your profile preferences.
        </p>
      </div>

      {/* Success message */}
      {form.lastSavedAt && !form.isDirty && (
        <div className="mb-6">
          <InlineSuccessBanner message="Your settings have been saved successfully." />
        </div>
      )}

      {/* Save error */}
      {form.saveError && (
        <div className="mb-6">
          <InlineErrorBanner
            message={form.saveError.message}
            actionLabel={form.saveError.isRetryable ? form.saveError.retryLabel : undefined}
            onAction={form.saveError.isRetryable ? saveProfile : undefined}
          />
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="p-6">
            <h2 className="mb-6 text-lg font-medium text-gray-900">Profile Information</h2>

            <div className="space-y-6">
              {/* Full Name */}
              <div>
                <label htmlFor="full-name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  id="full-name"
                  value={form.full_name}
                  onChange={(e) => updateForm({ full_name: e.target.value })}
                  placeholder="Your name (optional)"
                  disabled={form.isSaving}
                  className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    form.fieldErrors.full_name ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                />
                {form.fieldErrors.full_name && (
                  <p className="mt-1 text-sm text-red-600">{form.fieldErrors.full_name}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  How you'd like to be addressed (max 255 characters).
                </p>
              </div>

              {/* Preferred Units */}
              <PreferredUnitsSelect
                value={form.preferred_units}
                onChange={(value) => updateForm({ preferred_units: value })}
                disabled={form.isSaving}
                error={form.fieldErrors.preferred_units}
              />

              {/* Language */}
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                  Language
                </label>
                <input
                  type="text"
                  id="language"
                  value={form.language}
                  onChange={(e) => updateForm({ language: e.target.value })}
                  placeholder="en"
                  maxLength={2}
                  disabled={form.isSaving}
                  className={`mt-1 block w-24 rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    form.fieldErrors.language ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                />
                {form.fieldErrors.language && (
                  <p className="mt-1 text-sm text-red-600">{form.fieldErrors.language}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  2-letter language code (e.g., "en" for English, "pl" for Polish).
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-gray-200 bg-gray-50 px-6 py-4 rounded-b-lg">
            <div className="text-sm text-gray-500">
              {form.isDirty ? (
                <span className="text-amber-600">You have unsaved changes</span>
              ) : form.lastSavedAt ? (
                <span>Last saved: {new Date(form.lastSavedAt).toLocaleTimeString()}</span>
              ) : null}
            </div>
            <button
              type="submit"
              disabled={!canSave}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {form.isSaving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
