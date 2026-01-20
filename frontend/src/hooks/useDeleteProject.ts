/**
 * useDeleteProject Hook
 *
 * Custom hook for deleting (soft delete) a project.
 */

import { useState, useCallback } from 'react';
import { fetchJson, ApiError, handleApiError } from '../lib/apiClient';
import type { ProjectDeleteResponse } from '../types/api';

interface UseDeleteProjectState {
  /** Whether delete is in progress */
  isDeleting: boolean;
  /** Error message if delete failed */
  deleteError: string | null;
}

interface UseDeleteProjectActions {
  /** Delete the project (soft delete) */
  deleteProject: () => Promise<boolean>;
  /** Clear the error state */
  clearError: () => void;
}

export type UseDeleteProjectReturn = UseDeleteProjectState & UseDeleteProjectActions;

export function useDeleteProject(projectId: string): UseDeleteProjectReturn {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteProject = useCallback(async (): Promise<boolean> => {
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await fetchJson<ProjectDeleteResponse>(
        `/api/projects/${projectId}`,
        { method: 'DELETE' }
      );

      // Redirect to projects list after successful delete
      window.location.href = '/projects';
      return true;
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 401) {
          handleApiError(err, `/projects/${projectId}/settings`);
          return false;
        }

        if (err.statusCode === 403) {
          setDeleteError('You do not have permission to delete this project.');
          return false;
        }

        if (err.statusCode === 404) {
          setDeleteError('Project not found.');
          return false;
        }

        setDeleteError(handleApiError(err));
      } else {
        setDeleteError(err instanceof Error ? err.message : 'Failed to delete project');
      }

      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [projectId]);

  const clearError = useCallback(() => {
    setDeleteError(null);
  }, []);

  return {
    isDeleting,
    deleteError,
    deleteProject,
    clearError,
  };
}
