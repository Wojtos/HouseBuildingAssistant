/**
 * ProjectFilesView Component
 *
 * Main view for document list, upload, and management.
 */

import { useState, useCallback, useRef } from 'react';
import { useDocumentsList, useDocumentUpload, useDeleteDocument } from '../hooks/useDocuments';
import { InlineErrorBanner, InlineSuccessBanner } from './InlineErrorBanner';
import { PaginationControls } from './PaginationControls';
import type { DocumentListItem, ProcessingState } from '../types/api';
import { SupportedFileTypes } from '../types/api';

interface ProjectFilesViewProps {
  projectId: string;
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
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

// =============================================================================
// File Type Icon
// =============================================================================

function FileTypeIcon({ fileType }: { fileType: string | null }) {
  const isPdf = fileType === 'application/pdf';
  const isImage = fileType?.startsWith('image/');

  if (isPdf) {
    return (
      <svg className="h-8 w-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        <text x="8" y="16" className="text-[6px] font-bold fill-red-500">PDF</text>
      </svg>
    );
  }

  if (isImage) {
    return (
      <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }

  return (
    <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

// =============================================================================
// Document Row
// =============================================================================

interface DocumentRowProps {
  document: DocumentListItem;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

function DocumentRow({ document, onOpen, onDelete }: DocumentRowProps) {
  const formattedDate = new Date(document.created_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 hover:bg-gray-50">
      <div className="flex items-center gap-4">
        <FileTypeIcon fileType={document.file_type} />
        <div>
          <button
            onClick={() => onOpen(document.id)}
            className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline"
          >
            {document.name}
          </button>
          <div className="mt-0.5 flex items-center gap-2 text-xs text-gray-500">
            <span>{formattedDate}</span>
            {document.chunk_count > 0 && (
              <>
                <span>•</span>
                <span>{document.chunk_count} chunks</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <ProcessingStateBadge state={document.processing_state} />
        <button
          onClick={() => onDelete(document.id)}
          className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
          title="Delete document"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// Upload Dialog
// =============================================================================

interface UploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onCompleted: () => void;
}

function UploadDialog({ isOpen, onClose, projectId, onCompleted }: UploadDialogProps) {
  const { state, selectFile, startUpload, reset } = useDocumentUpload(projectId, () => {
    onCompleted();
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      selectFile(file);
    }
  };

  const handleUpload = async () => {
    await startUpload();
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      selectFile(file);
    }
  };

  if (!isOpen) return null;

  const isUploading = ['creating_record', 'uploading', 'confirming', 'monitoring'].includes(state.step);
  const isCompleted = state.step === 'completed';
  const isFailed = state.step === 'failed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleClose}>
      <div
        className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Upload Document</h2>
          <button
            onClick={handleClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* File selection area */}
        {state.step === 'select_file' && (
          <>
            <div
              className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 text-center hover:border-blue-400"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                Drag and drop a file here, or{' '}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="font-medium text-blue-600 hover:underline"
                >
                  browse
                </button>
              </p>
              <p className="mt-1 text-xs text-gray-500">
                PDF, PNG, JPEG, TIFF, TXT up to 10MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={SupportedFileTypes.join(',')}
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            {state.file && !state.error && (
              <div className="mt-4 rounded-lg bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                  <FileTypeIcon fileType={state.file.type} />
                  <div className="flex-1 truncate">
                    <p className="text-sm font-medium text-gray-900">{state.file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(state.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleUpload}
                  className="mt-3 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Upload
                </button>
              </div>
            )}

            {state.error && (
              <div className="mt-4">
                <InlineErrorBanner message={state.error} />
              </div>
            )}
          </>
        )}

        {/* Upload progress */}
        {isUploading && (
          <div className="py-8 text-center">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            <p className="mt-4 text-sm font-medium text-gray-900">
              {state.step === 'creating_record' && 'Preparing upload...'}
              {state.step === 'uploading' && 'Uploading file...'}
              {state.step === 'confirming' && 'Finalizing...'}
              {state.step === 'monitoring' && 'Processing document...'}
            </p>
            <p className="mt-1 text-xs text-gray-500">This may take a few moments</p>
          </div>
        )}

        {/* Completed state */}
        {isCompleted && (
          <div className="py-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mt-4 text-sm font-medium text-gray-900">Upload complete!</p>
            <p className="mt-1 text-xs text-gray-500">Document has been processed successfully</p>
            <button
              onClick={handleClose}
              className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Done
            </button>
          </div>
        )}

        {/* Failed state */}
        {isFailed && (
          <div className="py-4">
            <InlineErrorBanner
              title="Upload failed"
              message={state.error || 'An error occurred during upload'}
              actionLabel="Try again"
              onAction={() => reset()}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Delete Confirm Dialog
// =============================================================================

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  documentName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

function DeleteConfirmDialog({
  isOpen,
  documentName,
  onConfirm,
  onCancel,
  isDeleting,
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div
        className="mx-4 w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-red-100">
            <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Delete Document</h3>
            <p className="mt-1 text-sm text-gray-500">
              Are you sure you want to delete "{documentName}"? This action cannot be undone.
            </p>
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
            disabled={isDeleting}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Filters Bar
// =============================================================================

interface FiltersBarProps {
  query: {
    processing_state: string;
    file_type: string;
    include_deleted: boolean;
  };
  onQueryChange: (updates: Partial<{ processing_state: string; file_type: string; include_deleted: boolean }>) => void;
}

function FiltersBar({ query, onQueryChange }: FiltersBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-lg bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-2">
        <label htmlFor="state-filter" className="text-sm font-medium text-gray-700">
          Status:
        </label>
        <select
          id="state-filter"
          value={query.processing_state}
          onChange={(e) => onQueryChange({ processing_state: e.target.value })}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="ALL">All</option>
          <option value="PENDING_UPLOAD">Pending Upload</option>
          <option value="UPLOADED">Uploaded</option>
          <option value="PROCESSING">Processing</option>
          <option value="COMPLETED">Completed</option>
          <option value="FAILED">Failed</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="type-filter" className="text-sm font-medium text-gray-700">
          Type:
        </label>
        <select
          id="type-filter"
          value={query.file_type}
          onChange={(e) => onQueryChange({ file_type: e.target.value })}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="ALL">All</option>
          <option value="application/pdf">PDF</option>
          <option value="image/png">PNG</option>
          <option value="image/jpeg">JPEG</option>
          <option value="image/tiff">TIFF</option>
          <option value="text/plain">Text</option>
        </select>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={query.include_deleted}
          onChange={(e) => onQueryChange({ include_deleted: e.target.checked })}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        Show archived
      </label>
    </div>
  );
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg className="h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
      <h3 className="mt-4 text-lg font-medium text-gray-900">No documents yet</h3>
      <p className="mt-1 text-sm text-gray-500">Upload your first document to get started</p>
      <button
        onClick={onUpload}
        className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Upload Document
      </button>
    </div>
  );
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-gray-100 px-4 py-4">
          <div className="h-8 w-8 rounded bg-gray-200" />
          <div className="flex-1">
            <div className="h-4 w-48 rounded bg-gray-200" />
            <div className="mt-2 h-3 w-24 rounded bg-gray-100" />
          </div>
          <div className="h-6 w-20 rounded-full bg-gray-200" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ProjectFilesView({ projectId }: ProjectFilesViewProps) {
  const {
    documents,
    pagination,
    isLoading,
    error,
    query,
    refresh,
    setQuery,
  } = useDocumentsList(projectId);

  const {
    isDeleting,
    deleteError,
    deleteDocument,
    clearError: clearDeleteError,
  } = useDeleteDocument(projectId);

  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleOpenDocument = useCallback((documentId: string) => {
    window.location.href = `/projects/${projectId}/files/${documentId}`;
  }, [projectId]);

  const handleDeleteClick = useCallback((documentId: string) => {
    const doc = documents.find((d) => d.id === documentId);
    if (doc) {
      setDeleteTarget({ id: doc.id, name: doc.name });
    }
  }, [documents]);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const success = await deleteDocument(deleteTarget.id);
    if (success) {
      setDeleteTarget(null);
      refresh();
    }
  }, [deleteTarget, deleteDocument, refresh]);

  const handleUploadCompleted = useCallback(() => {
    setIsUploadOpen(false);
    refresh();
  }, [refresh]);

  const handlePageChange = useCallback((page: number) => {
    setQuery({ page });
  }, [setQuery]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="mt-1 text-sm text-gray-500">
            Upload and manage project documents
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/projects/${projectId}/files/search`}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search
          </a>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Upload
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6">
          <InlineErrorBanner
            message={error.message}
            actionLabel={error.isRetryable ? 'Retry' : undefined}
            onAction={error.isRetryable ? refresh : undefined}
          />
        </div>
      )}

      {/* Delete Error Banner */}
      {deleteError && (
        <div className="mb-6">
          <InlineErrorBanner
            message={deleteError}
            actionLabel="Dismiss"
            onAction={clearDeleteError}
          />
        </div>
      )}

      {/* Filters */}
      <FiltersBar query={query} onQueryChange={setQuery} />

      {/* Document List */}
      <div className="mt-4 rounded-lg border border-gray-200 bg-white">
        {isLoading ? (
          <LoadingSkeleton />
        ) : documents.length === 0 ? (
          <EmptyState onUpload={() => setIsUploadOpen(true)} />
        ) : (
          <div>
            {documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                document={doc}
                onOpen={handleOpenDocument}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div className="mt-6">
          <PaginationControls
            currentPage={pagination.page}
            totalPages={pagination.total_pages}
            totalItems={pagination.total_items}
            onPageChange={handlePageChange}
          />
        </div>
      )}

      {/* Upload Dialog */}
      <UploadDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        projectId={projectId}
        onCompleted={handleUploadCompleted}
      />

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        documentName={deleteTarget?.name || ''}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isDeleting={isDeleting}
      />
    </div>
  );
}
