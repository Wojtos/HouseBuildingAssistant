/**
 * DocumentDetailView Component
 *
 * Shows document metadata, processing status, and extracted content chunks.
 * Supports polling for processing state updates and deep linking to specific chunks.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { InlineErrorBanner, InlineInfoBanner } from './InlineErrorBanner';
import { PaginationControls } from './PaginationControls';
import { useDocument, useDocumentChunks, useDeleteDocument } from '../hooks/useDocuments';
import type { DocumentChunkItem, ProcessingState } from '../types/api';

interface DocumentDetailViewProps {
  projectId: string;
  documentId: string;
}

// =============================================================================
// Processing State Badge
// =============================================================================

const PROCESSING_STATE_STYLES: Record<ProcessingState | string, { bg: string; text: string; label: string }> = {
  PENDING_UPLOAD: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Pending Upload' },
  UPLOADED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Uploaded' },
  PROCESSING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Processing' },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-700', label: 'Completed' },
  FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Failed' },
};

function ProcessingStateBadge({ state }: { state: string }) {
  const style = PROCESSING_STATE_STYLES[state] || PROCESSING_STATE_STYLES.PENDING_UPLOAD;
  return (
    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

// =============================================================================
// File Type Icon (larger for detail view)
// =============================================================================

function FileTypeIcon({ fileType }: { fileType: string | null }) {
  const isPdf = fileType === 'application/pdf';
  const isImage = fileType?.startsWith('image/');

  if (isPdf) {
    return (
      <svg className="h-16 w-16 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    );
  }

  if (isImage) {
    return (
      <svg className="h-16 w-16 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }

  return (
    <svg className="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

// =============================================================================
// Processing Monitor
// =============================================================================

interface ProcessingMonitorProps {
  processingState: ProcessingState | string;
  errorMessage: string | null;
  isPolling: boolean;
  onRefresh: () => void;
}

function ProcessingMonitor({ processingState, errorMessage, isPolling, onRefresh }: ProcessingMonitorProps) {
  if (processingState === 'COMPLETED') {
    return null;
  }

  if (processingState === 'FAILED') {
    return (
      <div className="mt-6">
        <InlineErrorBanner
          title="Processing Failed"
          message={errorMessage || 'Document processing failed. Please try re-uploading the document.'}
          actionLabel="Back to Files"
          onAction={() => window.history.back()}
        />
      </div>
    );
  }

  if (processingState === 'PROCESSING') {
    return (
      <div className="mt-6 rounded-lg bg-yellow-50 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-yellow-600 border-t-transparent" />
            <p className="text-sm text-yellow-800">
              Document is being processed. {isPolling ? 'Updates will appear automatically.' : ''}
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="text-sm font-medium text-yellow-700 hover:text-yellow-900"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  if (processingState === 'UPLOADED') {
    return (
      <div className="mt-6 rounded-lg bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-blue-800">
            Document uploaded successfully. OCR processing will begin shortly.
          </p>
          <button
            onClick={onRefresh}
            className="text-sm font-medium text-blue-700 hover:text-blue-900"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  // PENDING_UPLOAD
  return (
    <div className="mt-6 rounded-lg bg-gray-50 p-4">
      <p className="text-sm text-gray-600">
        Waiting for file upload...
      </p>
    </div>
  );
}

// =============================================================================
// Chunk Item Component
// =============================================================================

interface ChunkItemProps {
  chunk: DocumentChunkItem;
  isSelected: boolean;
  onClick: () => void;
  onCopy: () => void;
}

function ChunkItem({ chunk, isSelected, onClick, onCopy }: ChunkItemProps) {
  const snippet = chunk.content.length > 200
    ? chunk.content.substring(0, 200) + '...'
    : chunk.content;

  const pageNumber = chunk.metadata?.page_number as number | undefined;

  return (
    <div
      id={`chunk-${chunk.chunk_index}`}
      className={`rounded-lg border p-4 transition-colors cursor-pointer ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              Chunk #{chunk.chunk_index + 1}
            </span>
            {pageNumber && (
              <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                Page {pageNumber}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
            {snippet}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onCopy();
          }}
          className="flex-shrink-0 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          title="Copy chunk text"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Chunk Detail Modal
// =============================================================================

interface ChunkDetailModalProps {
  chunk: DocumentChunkItem;
  projectId: string;
  documentId: string;
  onClose: () => void;
}

function ChunkDetailModal({ chunk, projectId, documentId, onClose }: ChunkDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyText = async () => {
    await navigator.clipboard.writeText(chunk.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/projects/${projectId}/files/${documentId}?chunkIndex=${chunk.chunk_index}`;
    await navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const pageNumber = chunk.metadata?.page_number as number | undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="mx-4 max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">
              Chunk #{chunk.chunk_index + 1}
            </h2>
            {pageNumber && (
              <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                Page {pageNumber}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[50vh] overflow-y-auto p-6">
          <p className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
            {chunk.content}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <div className="text-xs text-gray-500">
            Created: {new Date(chunk.created_at).toLocaleString()}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopyLink}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {linkCopied ? 'Link Copied!' : 'Copy Link'}
            </button>
            <button
              onClick={handleCopyText}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? 'Copied!' : 'Copy Text'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Chunk Browser Component
// =============================================================================

interface ChunkBrowserProps {
  projectId: string;
  documentId: string;
  initialChunkIndex?: number;
}

function ChunkBrowser({ projectId, documentId, initialChunkIndex }: ChunkBrowserProps) {
  const {
    chunks,
    pagination,
    isLoading,
    error,
    page,
    limit,
    loadPage,
    refresh,
  } = useDocumentChunks(projectId, documentId);

  const [selectedChunk, setSelectedChunk] = useState<DocumentChunkItem | null>(null);
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);

  // Load initial page based on chunkIndex deep link
  useEffect(() => {
    if (initialChunkIndex !== undefined && initialChunkIndex >= 0) {
      const targetPage = Math.floor(initialChunkIndex / limit) + 1;
      loadPage(targetPage);
    } else {
      loadPage(1);
    }
  }, [initialChunkIndex, limit, loadPage]);

  // Scroll to chunk when deep link is present
  useEffect(() => {
    if (initialChunkIndex !== undefined && chunks.length > 0) {
      const chunkElement = document.getElementById(`chunk-${initialChunkIndex}`);
      if (chunkElement) {
        chunkElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [initialChunkIndex, chunks]);

  const handleCopyChunk = async (chunk: DocumentChunkItem) => {
    await navigator.clipboard.writeText(chunk.content);
    setCopiedChunkId(chunk.id);
    setTimeout(() => setCopiedChunkId(null), 2000);
  };

  if (isLoading && chunks.length === 0) {
    return (
      <div className="mt-6 flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span className="ml-3 text-sm text-gray-600">Loading chunks...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-6">
        <InlineErrorBanner
          message={error.message}
          actionLabel={error.isRetryable ? error.retryLabel : undefined}
          onAction={error.isRetryable ? refresh : undefined}
        />
      </div>
    );
  }

  if (chunks.length === 0) {
    return (
      <div className="mt-6">
        <InlineInfoBanner message="No text chunks were extracted from this document." />
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-900">
          Extracted Text Chunks
        </h2>
        {pagination && (
          <span className="text-sm text-gray-500">
            {pagination.total_items} chunks total
          </span>
        )}
      </div>

      {/* Chunk list */}
      <div className="space-y-3">
        {chunks.map((chunk) => (
          <ChunkItem
            key={chunk.id}
            chunk={chunk}
            isSelected={initialChunkIndex === chunk.chunk_index}
            onClick={() => setSelectedChunk(chunk)}
            onCopy={() => handleCopyChunk(chunk)}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="mt-6">
          <PaginationControls
            page={page}
            totalPages={pagination.total_pages}
            limit={limit}
            totalItems={pagination.total_items}
            onPageChange={loadPage}
            disabled={isLoading}
          />
        </div>
      )}

      {/* Chunk detail modal */}
      {selectedChunk && (
        <ChunkDetailModal
          chunk={selectedChunk}
          projectId={projectId}
          documentId={documentId}
          onClose={() => setSelectedChunk(null)}
        />
      )}
    </div>
  );
}

// =============================================================================
// Document Detail View
// =============================================================================

export function DocumentDetailView({ projectId, documentId }: DocumentDetailViewProps) {
  const { document, isLoading, isPolling, error, refresh } = useDocument(projectId, documentId);
  const { isDeleting, deleteError, deleteDocument, clearError } = useDeleteDocument(projectId);

  // Parse chunkIndex from URL query params
  const chunkIndex = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const params = new URLSearchParams(window.location.search);
    const idx = params.get('chunkIndex');
    if (idx !== null) {
      const parsed = parseInt(idx, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
    return undefined;
  }, []);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      return;
    }

    const success = await deleteDocument(documentId);
    if (success) {
      window.location.href = `/projects/${projectId}/files`;
    }
  };

  const handleBack = () => {
    window.location.href = `/projects/${projectId}/files`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-6">
        <button
          onClick={handleBack}
          className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Files
        </button>
        <InlineErrorBanner
          message={error.message}
          actionLabel={error.isRetryable ? error.retryLabel : 'Go to Files'}
          onAction={error.isRetryable ? refresh : handleBack}
        />
      </div>
    );
  }

  if (!document) {
    return null;
  }

  const formattedDate = new Date(document.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Back button */}
      <button
        onClick={handleBack}
        className="mb-6 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
      >
        <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Files
      </button>

      {/* Delete error */}
      {deleteError && (
        <div className="mb-6">
          <InlineErrorBanner
            message={deleteError}
            actionLabel="Dismiss"
            onAction={clearError}
          />
        </div>
      )}

      {/* Document header */}
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-start gap-6">
            <FileTypeIcon fileType={document.file_type} />
            <div className="flex-1">
              <h1 className="text-2xl font-semibold text-gray-900">{document.name}</h1>
              <div className="mt-2 flex items-center gap-4">
                <ProcessingStateBadge state={document.processing_state} />
                {isPolling && (
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                    Auto-updating
                  </span>
                )}
                <span className="text-sm text-gray-500">{formattedDate}</span>
              </div>
            </div>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>

        {/* Metadata */}
        <div className="p-6">
          <h2 className="mb-4 text-lg font-medium text-gray-900">Document Information</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">File Type</dt>
              <dd className="mt-1 text-sm text-gray-900">{document.file_type || 'Unknown'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Processing State</dt>
              <dd className="mt-1 text-sm text-gray-900">{document.processing_state}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Chunks Extracted</dt>
              <dd className="mt-1 text-sm text-gray-900">{document.chunk_count}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Document ID</dt>
              <dd className="mt-1 font-mono text-xs text-gray-600">{document.id}</dd>
            </div>
          </dl>

          {/* Processing Monitor */}
          <ProcessingMonitor
            processingState={document.processing_state}
            errorMessage={document.error_message}
            isPolling={isPolling}
            onRefresh={refresh}
          />

          {/* Chunk browser (only when completed and has chunks) */}
          {document.processing_state === 'COMPLETED' && document.chunk_count > 0 && (
            <ChunkBrowser
              projectId={projectId}
              documentId={documentId}
              initialChunkIndex={chunkIndex}
            />
          )}

          {/* No chunks message */}
          {document.processing_state === 'COMPLETED' && document.chunk_count === 0 && (
            <div className="mt-6">
              <InlineInfoBanner message="No text was extracted from this document." />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
