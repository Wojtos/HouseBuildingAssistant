/**
 * useDocuments Hooks
 *
 * Custom hooks for document list, upload, and delete operations.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchJson, ApiError, handleApiError } from '../lib/apiClient';
import { getAccessToken } from '../lib/supabaseClient';
import type {
  DocumentListParams,
  DocumentListResponse,
  DocumentListItem,
  DocumentCreateRequest,
  DocumentCreateResponse,
  DocumentConfirmResponse,
  DocumentDetailResponse,
  DocumentDeleteResponse,
  DocumentChunkItem,
  DocumentChunkListResponse,
  DocumentSearchRequest,
  DocumentSearchResult,
  DocumentSearchResponse,
  ProcessingState,
  PaginationInfo,
} from '../types/api';
import type { ApiErrorVM, DocumentListQueryVM, UploadFlowVM, UploadFlowStep } from '../types/viewModels';
import { isSupportedFileType, SupportedFileTypes } from '../types/api';

// =============================================================================
// useDocumentsList Hook
// =============================================================================

interface UseDocumentsListState {
  documents: DocumentListItem[];
  pagination: PaginationInfo | null;
  isLoading: boolean;
  error: ApiErrorVM | null;
}

interface UseDocumentsListActions {
  refresh: () => Promise<void>;
  setQuery: (query: Partial<DocumentListQueryVM>) => void;
}

export type UseDocumentsListReturn = UseDocumentsListState & {
  query: DocumentListQueryVM;
} & UseDocumentsListActions;

const DEFAULT_QUERY: DocumentListQueryVM = {
  page: 1,
  limit: 20,
  processing_state: 'ALL',
  file_type: 'ALL',
  include_deleted: false,
};

export function useDocumentsList(projectId: string): UseDocumentsListReturn {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiErrorVM | null>(null);
  const [query, setQueryState] = useState<DocumentListQueryVM>(DEFAULT_QUERY);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchDocuments = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams();
      params.set('page', String(query.page));
      params.set('limit', String(query.limit));

      if (query.processing_state !== 'ALL') {
        params.set('processing_state', query.processing_state);
      }
      if (query.file_type !== 'ALL') {
        params.set('file_type', query.file_type);
      }
      if (query.include_deleted) {
        params.set('include_deleted', 'true');
      }

      const response = await fetchJson<DocumentListResponse>(
        `/api/projects/${projectId}/documents?${params.toString()}`,
        { signal: abortControllerRef.current.signal }
      );

      setDocuments(response.data);
      setPagination(response.pagination);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      if (err instanceof ApiError) {
        if (err.statusCode === 401) {
          handleApiError(err, `/projects/${projectId}/files`);
          return;
        }

        if (err.statusCode === 403) {
          window.location.href = '/projects';
          return;
        }

        if (err.statusCode === 404) {
          setError({
            message: 'Project not found',
            isRetryable: false,
          });
          return;
        }

        setError({
          message: handleApiError(err),
          isRetryable: err.statusCode >= 500 || err.statusCode === 429,
          retryLabel: 'Retry',
        });
      } else {
        setError({
          message: err instanceof Error ? err.message : 'Failed to load documents',
          isRetryable: true,
          retryLabel: 'Retry',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId, query]);

  const refresh = useCallback(async () => {
    await fetchDocuments();
  }, [fetchDocuments]);

  const setQuery = useCallback((updates: Partial<DocumentListQueryVM>) => {
    setQueryState((prev) => {
      const newQuery = { ...prev, ...updates };
      // Reset page to 1 when filters change (not when page itself changes)
      if (updates.page === undefined && (
        updates.processing_state !== undefined ||
        updates.file_type !== undefined ||
        updates.include_deleted !== undefined
      )) {
        newQuery.page = 1;
      }
      return newQuery;
    });
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    documents,
    pagination,
    isLoading,
    error,
    query,
    refresh,
    setQuery,
  };
}

// =============================================================================
// useDocumentUpload Hook
// =============================================================================

interface UseDocumentUploadState {
  state: UploadFlowVM;
}

interface UseDocumentUploadActions {
  selectFile: (file: File) => void;
  startUpload: () => Promise<void>;
  reset: () => void;
}

export type UseDocumentUploadReturn = UseDocumentUploadState & UseDocumentUploadActions;

const INITIAL_UPLOAD_STATE: UploadFlowVM = {
  step: 'select_file',
  file: null,
  uploadProgress: 0,
  error: null,
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILE_NAME_LENGTH = 255;

export function useDocumentUpload(
  projectId: string,
  onCompleted?: (documentId: string) => void
): UseDocumentUploadReturn {
  const [state, setState] = useState<UploadFlowVM>(INITIAL_UPLOAD_STATE);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const selectFile = useCallback((file: File) => {
    // Validate file type
    if (!isSupportedFileType(file.type)) {
      setState({
        ...INITIAL_UPLOAD_STATE,
        file,
        error: `Unsupported file type. Supported types: ${SupportedFileTypes.join(', ')}`,
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      setState({
        ...INITIAL_UPLOAD_STATE,
        file,
        error: 'File size exceeds 10MB limit.',
      });
      return;
    }

    // Validate file name length
    if (file.name.length > MAX_FILE_NAME_LENGTH) {
      setState({
        ...INITIAL_UPLOAD_STATE,
        file,
        error: 'File name too long (max 255 characters).',
      });
      return;
    }

    setState({
      ...INITIAL_UPLOAD_STATE,
      file,
      error: null,
    });
  }, []);

  const pollDocumentStatus = useCallback(
    async (documentId: string) => {
      try {
        const response = await fetchJson<DocumentDetailResponse>(
          `/api/projects/${projectId}/documents/${documentId}`
        );

        // Stop polling on terminal states or UPLOADED (since OCR pipeline isn't implemented yet)
        const terminalStates = ['COMPLETED', 'FAILED', 'UPLOADED'];
        if (terminalStates.includes(response.processing_state)) {
          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          if (response.processing_state === 'COMPLETED' || response.processing_state === 'UPLOADED') {
            setState((prev) => ({
              ...prev,
              step: 'completed',
            }));
            onCompleted?.(documentId);
          } else {
            setState((prev) => ({
              ...prev,
              step: 'failed',
              error: response.error_message || 'Document processing failed',
            }));
          }
        }
      } catch (err) {
        // Ignore polling errors - will retry on next interval
        console.error('Polling error:', err);
      }
    },
    [projectId, onCompleted]
  );

  const startUpload = useCallback(async () => {
    const { file } = state;
    if (!file) {
      setState((prev) => ({ ...prev, error: 'No file selected' }));
      return;
    }

    // Step 1: Create document record
    setState((prev) => ({ ...prev, step: 'creating_record', error: null }));

    try {
      const createRequest: DocumentCreateRequest = {
        name: file.name,
        file_type: file.type,
        file_size: file.size,
      };

      const createResponse = await fetchJson<DocumentCreateResponse>(
        `/api/projects/${projectId}/documents`,
        {
          method: 'POST',
          body: JSON.stringify(createRequest),
        }
      );

      setState((prev) => ({
        ...prev,
        documentId: createResponse.id,
        uploadUrl: createResponse.upload_url,
        uploadUrlExpiresAt: createResponse.upload_url_expires_at,
        step: 'uploading',
      }));

      // Step 2: Upload file to presigned URL
      // Note: Do NOT include Authorization header - the signed URL contains the token
      const uploadResponse = await fetch(createResponse.upload_url, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status ${uploadResponse.status}`);
      }

      setState((prev) => ({ ...prev, step: 'confirming', uploadProgress: 100 }));

      // Step 3: Confirm upload
      const confirmResponse = await fetchJson<DocumentConfirmResponse>(
        `/api/projects/${projectId}/documents/${createResponse.id}/confirm`,
        { method: 'POST' }
      );

      // Step 4: Start polling for processing status
      setState((prev) => ({ ...prev, step: 'monitoring' }));

      // Start polling
      pollingIntervalRef.current = setInterval(() => {
        pollDocumentStatus(createResponse.id);
      }, 2000);

      // Also poll immediately
      pollDocumentStatus(createResponse.id);
    } catch (err) {
      if (err instanceof ApiError) {
        // Handle specific error codes
        if (err.statusCode === 410) {
          setState((prev) => ({
            ...prev,
            step: 'failed',
            error: 'Upload link expired. Please start upload again.',
          }));
          return;
        }

        if (err.statusCode === 413) {
          setState((prev) => ({
            ...prev,
            step: 'failed',
            error: 'File too large. Maximum size is 10MB.',
          }));
          return;
        }

        if (err.statusCode === 422) {
          setState((prev) => ({
            ...prev,
            step: 'failed',
            error: err.message || 'Unsupported file type.',
          }));
          return;
        }

        if (err.statusCode === 409) {
          // Already confirmed - proceed to monitoring
          setState((prev) => ({ ...prev, step: 'monitoring' }));
          return;
        }

        if (err.statusCode === 400) {
          setState((prev) => ({
            ...prev,
            step: 'failed',
            error: 'Upload failed. Please try again.',
          }));
          return;
        }

        setState((prev) => ({
          ...prev,
          step: 'failed',
          error: handleApiError(err),
        }));
      } else {
        setState((prev) => ({
          ...prev,
          step: 'failed',
          error: err instanceof Error ? err.message : 'Upload failed',
        }));
      }
    }
  }, [projectId, state, pollDocumentStatus]);

  const reset = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setState(INITIAL_UPLOAD_STATE);
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return {
    state,
    selectFile,
    startUpload,
    reset,
  };
}

// =============================================================================
// useDeleteDocument Hook
// =============================================================================

interface UseDeleteDocumentState {
  isDeleting: boolean;
  deleteError: string | null;
}

interface UseDeleteDocumentActions {
  deleteDocument: (documentId: string) => Promise<boolean>;
  clearError: () => void;
}

export type UseDeleteDocumentReturn = UseDeleteDocumentState & UseDeleteDocumentActions;

export function useDeleteDocument(projectId: string): UseDeleteDocumentReturn {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const deleteDocument = useCallback(
    async (documentId: string): Promise<boolean> => {
      setIsDeleting(true);
      setDeleteError(null);

      try {
        await fetchJson<DocumentDeleteResponse>(
          `/api/projects/${projectId}/documents/${documentId}`,
          { method: 'DELETE' }
        );

        return true;
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.statusCode === 401) {
            handleApiError(err, `/projects/${projectId}/files`);
            return false;
          }

          setDeleteError(handleApiError(err));
        } else {
          setDeleteError(err instanceof Error ? err.message : 'Failed to delete document');
        }

        return false;
      } finally {
        setIsDeleting(false);
      }
    },
    [projectId]
  );

  const clearError = useCallback(() => {
    setDeleteError(null);
  }, []);

  return {
    isDeleting,
    deleteError,
    deleteDocument,
    clearError,
  };
}

// =============================================================================
// useDocument Hook (Single document with polling)
// =============================================================================

interface UseDocumentState {
  document: DocumentDetailResponse | null;
  isLoading: boolean;
  isPolling: boolean;
  error: ApiErrorVM | null;
}

interface UseDocumentActions {
  refresh: () => Promise<void>;
}

export type UseDocumentReturn = UseDocumentState & UseDocumentActions;

const POLLING_INTERVAL = 2000; // 2 seconds
const TERMINAL_STATES: ProcessingState[] = ['COMPLETED', 'FAILED'];

export function useDocument(projectId: string, documentId: string): UseDocumentReturn {
  const [document, setDocument] = useState<DocumentDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<ApiErrorVM | null>(null);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchDocument = useCallback(async (isInitial = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (isInitial) {
      setIsLoading(true);
      setError(null);
    }

    try {
      const response = await fetchJson<DocumentDetailResponse>(
        `/api/projects/${projectId}/documents/${documentId}`,
        { signal: abortControllerRef.current.signal }
      );

      setDocument(response);

      // Check if we should start/stop polling
      const isTerminal = TERMINAL_STATES.includes(response.processing_state as ProcessingState);
      if (!isTerminal && !pollingIntervalRef.current) {
        // Start polling
        setIsPolling(true);
        pollingIntervalRef.current = setInterval(() => {
          fetchDocument(false);
        }, POLLING_INTERVAL);
      } else if (isTerminal && pollingIntervalRef.current) {
        // Stop polling
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        setIsPolling(false);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      if (err instanceof ApiError) {
        if (err.statusCode === 401) {
          handleApiError(err, `/projects/${projectId}/files/${documentId}`);
          return;
        }

        if (err.statusCode === 403) {
          window.location.href = '/projects';
          return;
        }

        if (err.statusCode === 404) {
          setError({
            message: 'Document not found',
            isRetryable: false,
          });
          return;
        }

        setError({
          message: handleApiError(err),
          isRetryable: err.statusCode >= 500 || err.statusCode === 429,
          retryLabel: 'Retry',
        });
      } else {
        setError({
          message: err instanceof Error ? err.message : 'Failed to load document',
          isRetryable: true,
          retryLabel: 'Retry',
        });
      }
    } finally {
      if (isInitial) {
        setIsLoading(false);
      }
    }
  }, [projectId, documentId]);

  const refresh = useCallback(async () => {
    await fetchDocument(true);
  }, [fetchDocument]);

  // Initial fetch
  useEffect(() => {
    fetchDocument(true);
  }, [fetchDocument]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    document,
    isLoading,
    isPolling,
    error,
    refresh,
  };
}

// =============================================================================
// useDocumentChunks Hook
// =============================================================================

interface UseDocumentChunksState {
  chunks: DocumentChunkItem[];
  pagination: PaginationInfo | null;
  isLoading: boolean;
  error: ApiErrorVM | null;
}

interface UseDocumentChunksActions {
  loadPage: (page: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export type UseDocumentChunksReturn = UseDocumentChunksState & {
  page: number;
  limit: number;
} & UseDocumentChunksActions;

export function useDocumentChunks(
  projectId: string,
  documentId: string,
  initialLimit = 10
): UseDocumentChunksReturn {
  const [chunks, setChunks] = useState<DocumentChunkItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<ApiErrorVM | null>(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(initialLimit);

  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchChunks = useCallback(async (targetPage: number) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', String(targetPage));
      params.set('limit', String(limit));

      const response = await fetchJson<DocumentChunkListResponse>(
        `/api/projects/${projectId}/documents/${documentId}/chunks?${params.toString()}`,
        { signal: abortControllerRef.current.signal }
      );

      setChunks(response.data);
      setPagination(response.pagination);
      setPage(targetPage);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      if (err instanceof ApiError) {
        if (err.statusCode === 401) {
          handleApiError(err, `/projects/${projectId}/files/${documentId}`);
          return;
        }

        setError({
          message: handleApiError(err),
          isRetryable: err.statusCode >= 500 || err.statusCode === 429,
          retryLabel: 'Retry',
        });
      } else {
        setError({
          message: err instanceof Error ? err.message : 'Failed to load chunks',
          isRetryable: true,
          retryLabel: 'Retry',
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [projectId, documentId, limit]);

  const loadPage = useCallback(async (newPage: number) => {
    await fetchChunks(newPage);
  }, [fetchChunks]);

  const refresh = useCallback(async () => {
    await fetchChunks(page);
  }, [fetchChunks, page]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    chunks,
    pagination,
    isLoading,
    error,
    page,
    limit,
    loadPage,
    refresh,
  };
}

// =============================================================================
// useDocumentSearch Hook
// =============================================================================

interface UseDocumentSearchState {
  results: DocumentSearchResult[];
  query: string;
  totalResults: number;
  isSearching: boolean;
  error: ApiErrorVM | null;
  hasSearched: boolean;
}

interface UseDocumentSearchActions {
  search: (request: DocumentSearchRequest) => Promise<void>;
  clearResults: () => void;
}

export type UseDocumentSearchReturn = UseDocumentSearchState & UseDocumentSearchActions;

export function useDocumentSearch(projectId: string): UseDocumentSearchReturn {
  const [results, setResults] = useState<DocumentSearchResult[]>([]);
  const [query, setQuery] = useState('');
  const [totalResults, setTotalResults] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<ApiErrorVM | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  const search = useCallback(async (request: DocumentSearchRequest) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsSearching(true);
    setError(null);
    setHasSearched(true);

    try {
      const response = await fetchJson<DocumentSearchResponse>(
        `/api/projects/${projectId}/documents/search`,
        {
          method: 'POST',
          body: JSON.stringify(request),
          signal: abortControllerRef.current.signal,
        }
      );

      setResults(response.results);
      setQuery(response.query);
      setTotalResults(response.total_results);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      if (err instanceof ApiError) {
        if (err.statusCode === 401) {
          handleApiError(err, `/projects/${projectId}/files/search`);
          return;
        }

        if (err.statusCode === 403) {
          window.location.href = '/projects';
          return;
        }

        if (err.statusCode === 404) {
          setError({
            message: 'Project not found',
            isRetryable: false,
          });
          return;
        }

        setError({
          message: handleApiError(err),
          isRetryable: err.statusCode >= 500 || err.statusCode === 429,
          retryLabel: 'Try Again',
        });
      } else {
        setError({
          message: err instanceof Error ? err.message : 'Search failed',
          isRetryable: true,
          retryLabel: 'Try Again',
        });
      }
    } finally {
      setIsSearching(false);
    }
  }, [projectId]);

  const clearResults = useCallback(() => {
    setResults([]);
    setQuery('');
    setTotalResults(0);
    setHasSearched(false);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    results,
    query,
    totalResults,
    isSearching,
    error,
    hasSearched,
    search,
    clearResults,
  };
}
