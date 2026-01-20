/**
 * useProjectsList Hook
 *
 * Custom hook for fetching and managing the projects list.
 * Handles pagination, filtering, and error states.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchJson, ApiError, handleApiError } from '../lib/apiClient';
import type {
  ProjectListResponse,
  ProjectListItem,
  ProjectListParams,
  PaginationInfo,
} from '../types/api';
import type { ProjectsQueryVM, ApiErrorVM } from '../types/viewModels';

/**
 * Default query state
 */
const DEFAULT_QUERY: ProjectsQueryVM = {
  page: 1,
  limit: 20,
  phase: 'ALL',
  include_deleted: false,
  sort_by: 'updated_at',
  sort_order: 'desc',
};

interface UseProjectsListState {
  /** List of projects */
  items: ProjectListItem[];
  /** Pagination info */
  pagination: PaginationInfo | null;
  /** Current query state */
  query: ProjectsQueryVM;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: ApiErrorVM | null;
}

interface UseProjectsListActions {
  /** Update query and refetch */
  updateQuery: (updates: Partial<ProjectsQueryVM>) => void;
  /** Refresh current page */
  refresh: () => Promise<void>;
  /** Clear error */
  clearError: () => void;
}

export type UseProjectsListReturn = UseProjectsListState & UseProjectsListActions;

/**
 * Build API query params from view model
 */
function buildQueryParams(query: ProjectsQueryVM): ProjectListParams {
  const params: ProjectListParams = {
    page: query.page,
    limit: query.limit,
    sort_by: query.sort_by,
    sort_order: query.sort_order,
  };

  // Only add phase filter if not 'ALL'
  if (query.phase !== 'ALL') {
    params.phase = query.phase as ProjectListParams['phase'];
  }

  // Only add include_deleted if true
  if (query.include_deleted) {
    params.include_deleted = true;
  }

  return params;
}

/**
 * Build query string from params
 */
function toQueryString(params: ProjectListParams): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });

  return searchParams.toString();
}

/**
 * Custom hook for managing projects list
 */
export function useProjectsList(): UseProjectsListReturn {
  const [items, setItems] = useState<ProjectListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [query, setQuery] = useState<ProjectsQueryVM>(DEFAULT_QUERY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiErrorVM | null>(null);

  // AbortController for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Fetch projects with current query
   */
  const fetchProjects = useCallback(async (currentQuery: ProjectsQueryVM) => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const params = buildQueryParams(currentQuery);
      const queryString = toQueryString(params);
      const endpoint = `/api/projects${queryString ? `?${queryString}` : ''}`;

      const response = await fetchJson<ProjectListResponse>(endpoint, {
        signal: abortControllerRef.current.signal,
      });

      setItems(response.data);
      setPagination(response.pagination);
    } catch (err) {
      // Ignore aborted requests
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      if (err instanceof ApiError) {
        // Handle 401 - redirect to login
        if (err.statusCode === 401) {
          handleApiError(err, '/projects');
          return;
        }

        // Handle other errors
        setError({
          message: handleApiError(err),
          isRetryable: err.statusCode !== 400,
          retryLabel: 'Retry',
        });
      } else {
        setError({
          message: err instanceof Error ? err.message : 'Failed to load projects',
          isRetryable: true,
          retryLabel: 'Retry',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update query and trigger refetch
   */
  const updateQuery = useCallback((updates: Partial<ProjectsQueryVM>) => {
    setQuery((prev) => {
      const newQuery = { ...prev, ...updates };

      // Reset to page 1 when filters change (except when changing page)
      if (!('page' in updates)) {
        newQuery.page = 1;
      }

      return newQuery;
    });
  }, []);

  /**
   * Refresh current page
   */
  const refresh = useCallback(async () => {
    await fetchProjects(query);
  }, [fetchProjects, query]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Fetch on mount and when query changes
  useEffect(() => {
    fetchProjects(query);
  }, [query, fetchProjects]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    items,
    pagination,
    query,
    isLoading,
    error,
    updateQuery,
    refresh,
    clearError,
  };
}
