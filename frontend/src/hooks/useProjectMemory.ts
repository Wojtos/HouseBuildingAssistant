/**
 * useProjectMemory Hook
 *
 * Custom hook for fetching project memory (facts) data.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchJson, ApiError, handleApiError } from '../lib/apiClient';
import type { ProjectMemoryResponse } from '../types/api';
import type { ApiErrorVM, FactsDomainVM, ProjectFactsVM } from '../types/viewModels';

// =============================================================================
// Known domain keys for stable ordering
// =============================================================================

const KNOWN_DOMAIN_ORDER = [
  'FINANCE',
  'PERMITTING',
  'DESIGN',
  'SITE',
  'FOUNDATION',
  'STRUCTURE',
  'SYSTEMS',
  'FINISHES',
  'LEGAL',
  'TIMELINE',
  'CONTACTS',
];

/**
 * Check if a value is considered empty
 */
function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'object') {
    if (Array.isArray(value)) return value.length === 0;
    return Object.keys(value as object).length === 0;
  }
  if (typeof value === 'string') return value.trim() === '';
  return false;
}

/**
 * Parse memory data into sorted domain view models
 */
function parseDomainsFromMemory(data: Record<string, unknown>): FactsDomainVM[] {
  const domains: FactsDomainVM[] = [];

  // First, add known domains in order
  for (const key of KNOWN_DOMAIN_ORDER) {
    if (key in data) {
      domains.push({
        domainKey: key,
        facts: data[key],
        isEmpty: isEmptyValue(data[key]),
      });
    }
  }

  // Then add unknown domains alphabetically
  const unknownKeys = Object.keys(data)
    .filter((key) => !KNOWN_DOMAIN_ORDER.includes(key))
    .sort();

  for (const key of unknownKeys) {
    domains.push({
      domainKey: key,
      facts: data[key],
      isEmpty: isEmptyValue(data[key]),
    });
  }

  return domains;
}

// =============================================================================
// useProjectMemory Hook
// =============================================================================

interface UseProjectMemoryState {
  memory: ProjectMemoryResponse | null;
  domains: FactsDomainVM[];
  isLoading: boolean;
  error: ApiErrorVM | null;
}

interface UseProjectMemoryActions {
  refresh: () => Promise<void>;
  clearError: () => void;
}

export type UseProjectMemoryReturn = UseProjectMemoryState & UseProjectMemoryActions;

export function useProjectMemory(projectId: string): UseProjectMemoryReturn {
  const [memory, setMemory] = useState<ProjectMemoryResponse | null>(null);
  const [domains, setDomains] = useState<FactsDomainVM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiErrorVM | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchMemory = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchJson<ProjectMemoryResponse>(
        `/api/projects/${projectId}/memory`,
        { signal: abortControllerRef.current.signal }
      );

      setMemory(response);
      setDomains(parseDomainsFromMemory(response.data));
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      if (err instanceof ApiError) {
        if (err.statusCode === 401) {
          handleApiError(err, `/projects/${projectId}/facts`);
          return;
        }

        if (err.statusCode === 403) {
          window.location.href = '/projects';
          return;
        }

        if (err.statusCode === 404) {
          // Project or memory not found - show empty state
          setMemory(null);
          setDomains([]);
          return;
        }

        setError({
          message: handleApiError(err),
          isRetryable: err.statusCode >= 500 || err.statusCode === 429,
          retryLabel: 'Retry',
        });
      } else {
        setError({
          message: err instanceof Error ? err.message : 'Failed to load project facts',
          isRetryable: true,
          retryLabel: 'Retry',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const refresh = useCallback(async () => {
    await fetchMemory();
  }, [fetchMemory]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  useEffect(() => {
    fetchMemory();
  }, [fetchMemory]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    memory,
    domains,
    isLoading,
    error,
    refresh,
    clearError,
  };
}
