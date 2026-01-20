/**
 * ProjectSettingsView Component
 *
 * Allows users to edit project metadata and delete (archive) the project.
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useProject } from '../hooks/useProject';
import { useDeleteProject } from '../hooks/useDeleteProject';
import { InlineErrorBanner, InlineSuccessBanner } from './InlineErrorBanner';
import { PhaseSelect } from './PhaseSelect';
import type { ConstructionPhase, ProjectUpdateRequest } from '../types/api';
import type { ProjectSettingsFormVM } from '../types/viewModels';

interface ProjectSettingsViewProps {
  projectId: string;
}

// =============================================================================
// Validation
// =============================================================================

const MAX_NAME_LENGTH = 255;
const MAX_LOCATION_LENGTH = 500;

interface ValidationErrors {
  name?: string;
  location?: string;
  current_phase?: string;
}

function validateForm(values: {
  name: string;
  location: string;
  current_phase: string;
}): ValidationErrors {
  const errors: ValidationErrors = {};

  const trimmedName = values.name.trim();
  if (!trimmedName) {
    errors.name = 'Project name is required';
  } else if (trimmedName.length > MAX_NAME_LENGTH) {
    errors.name = `Name must be ${MAX_NAME_LENGTH} characters or less`;
  }

  if (values.location.length > MAX_LOCATION_LENGTH) {
    errors.location = `Location must be ${MAX_LOCATION_LENGTH} characters or less`;
  }

  if (!values.current_phase) {
    errors.current_phase = 'Phase is required';
  }

  return errors;
}

// =============================================================================
// Delete Confirmation Dialog
// =============================================================================

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  projectName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteConfirmDialog({
  isOpen,
  projectName,
  onConfirm,
  onCancel,
  isDeleting,
}: DeleteConfirmDialogProps) {
  const [confirmText, setConfirmText] = useState('');

  // Reset confirmation text when dialog opens
  useEffect(() => {
    if (isOpen) {
      setConfirmText('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const canConfirm = confirmText.toLowerCase() === projectName.toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-medium text-gray-900">Archive Project</h3>
            <p className="mt-2 text-sm text-gray-500">
              This will archive the project and all its data. The project will no longer be accessible.
            </p>
            <p className="mt-4 text-sm text-gray-700">
              To confirm, type <span className="font-medium">"{projectName}"</span> below:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="Type project name to confirm"
              className="mt-2 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
              autoFocus
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!canConfirm || isDeleting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDeleting ? 'Archiving...' : 'Archive Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Danger Zone
// =============================================================================

interface DangerZoneProps {
  projectName: string;
  onDelete: () => Promise<void>;
  isDeleting: boolean;
  deleteError: string | null;
}

function DangerZone({ projectName, onDelete, isDeleting, deleteError }: DangerZoneProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleConfirm = async () => {
    await onDelete();
    // Dialog will close on redirect or if error occurs
  };

  return (
    <div className="mt-10 rounded-lg border border-red-200 bg-red-50 p-6">
      <h3 className="text-lg font-medium text-red-900">Danger Zone</h3>
      <p className="mt-2 text-sm text-red-700">
        Once you archive a project, it cannot be easily restored. Please be certain.
      </p>

      {deleteError && (
        <div className="mt-4">
          <InlineErrorBanner message={deleteError} />
        </div>
      )}

      <button
        onClick={() => setIsDialogOpen(true)}
        disabled={isDeleting}
        className="mt-4 rounded-md border border-red-600 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
      >
        Archive this project
      </button>

      <DeleteConfirmDialog
        isOpen={isDialogOpen}
        projectName={projectName}
        onConfirm={handleConfirm}
        onCancel={() => setIsDialogOpen(false)}
        isDeleting={isDeleting}
      />
    </div>
  );
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div>
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="mt-2 h-10 w-full rounded bg-gray-200" />
      </div>
      <div>
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="mt-2 h-10 w-full rounded bg-gray-200" />
      </div>
      <div>
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="mt-2 h-10 w-full rounded bg-gray-200" />
      </div>
      <div className="h-10 w-24 rounded bg-gray-200" />
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ProjectSettingsView({ projectId }: ProjectSettingsViewProps) {
  const {
    project,
    isLoading: isLoadingProject,
    error: loadError,
    updateProject,
    refresh,
  } = useProject(projectId);

  const {
    isDeleting,
    deleteError,
    deleteProject,
  } = useDeleteProject(projectId);

  // Form state
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [currentPhase, setCurrentPhase] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize form when project loads
  useEffect(() => {
    if (project) {
      setName(project.name);
      setLocation(project.location || '');
      setCurrentPhase(project.current_phase);
    }
  }, [project]);

  // Check if form is dirty
  const isDirty = useMemo(() => {
    if (!project) return false;
    return (
      name !== project.name ||
      location !== (project.location || '') ||
      currentPhase !== project.current_phase
    );
  }, [project, name, location, currentPhase]);

  // Validation errors
  const errors = useMemo(() => {
    return validateForm({ name, location, current_phase: currentPhase });
  }, [name, location, currentPhase]);

  const hasErrors = Object.keys(errors).length > 0;

  // Handle save
  const handleSave = useCallback(async () => {
    if (hasErrors || isSaving || !isDirty) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const updateData: ProjectUpdateRequest = {
      name: name.trim(),
      location: location.trim() || undefined,
      current_phase: currentPhase as ConstructionPhase,
    };

    const success = await updateProject(updateData);

    if (success) {
      setSaveSuccess(true);
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      setSaveError('Failed to save changes. Please try again.');
    }

    setIsSaving(false);
  }, [hasErrors, isSaving, isDirty, name, location, currentPhase, updateProject]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    await deleteProject();
  }, [deleteProject]);

  const isLoading = isLoadingProject;

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Project Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your project details and configuration
        </p>
      </div>

      {/* Load Error */}
      {loadError && loadError.isRetryable && (
        <div className="mb-6">
          <InlineErrorBanner
            message={loadError.message}
            actionLabel="Retry"
            onAction={refresh}
          />
        </div>
      )}

      {/* Save Error */}
      {saveError && (
        <div className="mb-6">
          <InlineErrorBanner message={saveError} />
        </div>
      )}

      {/* Save Success */}
      {saveSuccess && (
        <div className="mb-6">
          <InlineSuccessBanner message="Settings saved successfully" />
        </div>
      )}

      {/* Form */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : project ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="space-y-6">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Project Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 sm:text-sm ${
                  errors.name
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                placeholder="My House Project"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? 'name-error' : undefined}
              />
              {errors.name && (
                <p id="name-error" className="mt-1 text-sm text-red-600">
                  {errors.name}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {name.length}/{MAX_NAME_LENGTH} characters
              </p>
            </div>

            {/* Location Field */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                Location
              </label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={`mt-1 block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-2 sm:text-sm ${
                  errors.location
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                    : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
                }`}
                placeholder="123 Main St, City, State"
                aria-invalid={!!errors.location}
                aria-describedby={errors.location ? 'location-error' : undefined}
              />
              {errors.location && (
                <p id="location-error" className="mt-1 text-sm text-red-600">
                  {errors.location}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                {location.length}/{MAX_LOCATION_LENGTH} characters
              </p>
            </div>

            {/* Phase Select */}
            <div>
              <label htmlFor="phase" className="block text-sm font-medium text-gray-700">
                Current Phase <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <PhaseSelect
                  value={currentPhase}
                  onChange={setCurrentPhase}
                  error={errors.current_phase}
                />
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={!isDirty || hasErrors || isSaving}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              {isDirty && !hasErrors && (
                <span className="text-sm text-gray-500">You have unsaved changes</span>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Project not found state is handled by ProjectShell
        null
      )}

      {/* Danger Zone */}
      {project && (
        <DangerZone
          projectName={project.name}
          onDelete={handleDelete}
          isDeleting={isDeleting}
          deleteError={deleteError}
        />
      )}
    </div>
  );
}
