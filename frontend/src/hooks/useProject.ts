/**
 * useProject Hook
 *
 * Custom hook for fetching and managing a single project's details.
 * Used by ProjectShell to load project context.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchJson, ApiError, handleApiError } from '../lib/apiClient';
import type {
  ProjectDetailResponse,
  ProjectUpdateRequest,
  ProjectResponse,
  ConstructionPhase,
} from '../types/api';
import type { ProjectContextVM, ApiErrorVM } from '../types/viewModels';

interface UseProjectState {
  /** Project data */
  project: ProjectContextVM | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: ApiErrorVM | null;
  /** Whether phase update is in progress */
  isUpdatingPhase: boolean;
}

interface UseProjectActions {
  /** Refresh project data */
  refresh: () => Promise<void>;
  /** Update project phase */
  updatePhase: (phase: ConstructionPhase) => Promise<boolean>;
  /** Update project (general) */
  updateProject: (data: ProjectUpdateRequest) => Promise<boolean>;
  /** Clear error */
  clearError: () => void;
}

export type UseProjectReturn = UseProjectState & UseProjectActions;

/**
 * Convert API response to ProjectContextVM
 */
function toProjectContextVM(
  projectId: string,
  response: ProjectDetailResponse
): ProjectContextVM {
  return {
    projectId,
    name: response.name,
    location: response.location,
    current_phase: response.current_phase,
    document_count: response.document_count,
    message_count: response.message_count,
    isLoading: false,
    error: null,
    isUpdatingPhase: false,
  };
}

/**
 * Custom hook for managing a single project
 */
export function useProject(projectId: string): UseProjectReturn {
  const [project, setProject] = useState<ProjectContextVM | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiErrorVM | null>(null);
  const [isUpdatingPhase, setIsUpdatingPhase] = useState(false);

  // AbortController for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch project details
   */
  const fetchProject = useCallback(async () => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchJson<ProjectDetailResponse>(
        `/api/projects/${projectId}`,
        { signal: abortControllerRef.current.signal }
      );

      setProject(toProjectContextVM(projectId, response));
    } catch (err) {
      // Ignore aborted requests
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      if (err instanceof ApiError) {
        // Handle 401 - redirect to login
        if (err.statusCode === 401) {
          handleApiError(err, `/projects/${projectId}/chat`);
          return;
        }

        // Handle 403 - redirect to projects list
        if (err.statusCode === 403) {
          window.location.href = '/projects';
          return;
        }

        // Handle 404 - project not found
        if (err.statusCode === 404) {
          setError({
            message: 'Project not found',
            isRetryable: false,
          });
          return;
        }

        // Other errors
        setError({
          message: handleApiError(err),
          isRetryable: err.statusCode >= 500 || err.statusCode === 429,
          retryLabel: 'Retry',
        });
      } else {
        setError({
          message: err instanceof Error ? err.message : 'Failed to load project',
          isRetryable: true,
          retryLabel: 'Retry',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  /**
   * Refresh project data
   */
  const refresh = useCallback(async () => {
    await fetchProject();
  }, [fetchProject]);

  /**
   * Update project phase
   */
  const updatePhase = useCallback(
    async (phase: ConstructionPhase): Promise<boolean> => {
      if (isUpdatingPhase) return false;

      setIsUpdatingPhase(true);

      // Optimistically update the phase
      const previousPhase = project?.current_phase;
      if (project) {
        setProject({ ...project, current_phase: phase });
      }

      try {
        const response = await fetchJson<ProjectResponse>(
          `/api/projects/${projectId}`,
          {
            method: 'PUT',
            body: JSON.stringify({ current_phase: phase }),
          }
        );

        // Update with response data
        if (project) {
          setProject({
            ...project,
            current_phase: response.current_phase,
          });
        }

        return true;
      } catch (err) {
        // Revert on failure
        if (project && previousPhase) {
          setProject({ ...project, current_phase: previousPhase });
        }

        if (err instanceof ApiError) {
          if (err.statusCode === 401) {
            handleApiError(err, `/projects/${projectId}/chat`);
            return false;
          }

          setError({
            message: "Couldn't update phase. Please try again.",
            isRetryable: true,
            retryLabel: 'Dismiss',
          });
        } else {
          setError({
            message: 'Failed to update phase',
            isRetryable: true,
            retryLabel: 'Dismiss',
          });
        }

        return false;
      } finally {
        setIsUpdatingPhase(false);
      }
    },
    [projectId, project, isUpdatingPhase]
  );

  /**
   * Update project (general)
   */
  const updateProject = useCallback(
    async (data: ProjectUpdateRequest): Promise<boolean> => {
      try {
        const response = await fetchJson<ProjectResponse>(
          `/api/projects/${projectId}`,
          {
            method: 'PUT',
            body: JSON.stringify(data),
          }
        );

        // Update local state
        if (project) {
          setProject({
            ...project,
            name: response.name,
            location: response.location,
            current_phase: response.current_phase,
          });
        }

        return true;
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.statusCode === 401) {
            handleApiError(err, `/projects/${projectId}/settings`);
            return false;
          }

          setError({
            message: handleApiError(err),
            isRetryable: err.statusCode >= 500,
            retryLabel: 'Dismiss',
          });
        } else {
          setError({
            message: 'Failed to update project',
            isRetryable: true,
            retryLabel: 'Dismiss',
          });
        }

        return false;
      }
    },
    [projectId, project]
  );

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch on mount and when projectId changes
  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    project,
    isLoading,
    error,
    isUpdatingPhase,
    refresh,
    updatePhase,
    updateProject,
    clearError,
  };
}
