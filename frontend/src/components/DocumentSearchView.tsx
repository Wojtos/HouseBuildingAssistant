/**
 * DocumentSearchView Component
 *
 * Provides semantic search functionality across all project documents.
 * Displays search results with traceability to source documents and chunks.
 */

import { useState, useCallback } from 'react';
import { InlineErrorBanner } from './InlineErrorBanner';
import { useDocumentSearch } from '../hooks/useDocuments';
import type { DocumentSearchResult, DocumentSearchRequest } from '../types/api';

interface DocumentSearchViewProps {
  projectId: string;
}

// =============================================================================
// Search Form
// =============================================================================

interface SearchFormProps {
  onSearch: (request: DocumentSearchRequest) => void;
  isSearching: boolean;
}

function SearchForm({ onSearch, isSearching }: SearchFormProps) {
  const [query, setQuery] = useState('');
  const [limit, setLimit] = useState(5);
  const [threshold, setThreshold] = useState(0.7);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [errors, setErrors] = useState<{ query?: string; limit?: string; threshold?: string }>({});

  const validateAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: typeof errors = {};

    // Validate query
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      newErrors.query = 'Please enter a search query';
    }

    // Validate limit
    if (limit < 1 || limit > 20) {
      newErrors.limit = 'Limit must be between 1 and 20';
    }

    // Validate threshold
    if (threshold < 0 || threshold > 1) {
      newErrors.threshold = 'Threshold must be between 0 and 1';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    onSearch({
      query: trimmedQuery,
      limit,
      threshold,
    });
  };

  return (
    <form onSubmit={validateAndSubmit} className="space-y-4">
      {/* Query input */}
      <div>
        <label htmlFor="search-query" className="sr-only">
          Search query
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="text"
            id="search-query"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your documents... (e.g., 'What are the foundation requirements?')"
            className={`w-full rounded-lg border py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.query ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            disabled={isSearching}
          />
        </div>
        {errors.query && (
          <p className="mt-1 text-sm text-red-600">{errors.query}</p>
        )}
      </div>

      {/* Advanced options toggle */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          {showAdvanced ? 'Hide advanced options' : 'Show advanced options'}
          <svg
            className={`ml-1 inline-block h-4 w-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <button
          type="submit"
          disabled={isSearching}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSearching ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Searching...
            </>
          ) : (
            'Search'
          )}
        </button>
      </div>

      {/* Advanced options */}
      {showAdvanced && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Limit */}
            <div>
              <label htmlFor="search-limit" className="block text-sm font-medium text-gray-700">
                Max Results
              </label>
              <input
                type="number"
                id="search-limit"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value, 10) || 5)}
                min={1}
                max={20}
                className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.limit ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={isSearching}
              />
              {errors.limit && (
                <p className="mt-1 text-xs text-red-600">{errors.limit}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">1-20 results</p>
            </div>

            {/* Threshold */}
            <div>
              <label htmlFor="search-threshold" className="block text-sm font-medium text-gray-700">
                Similarity Threshold
              </label>
              <input
                type="number"
                id="search-threshold"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value) || 0.7)}
                min={0}
                max={1}
                step={0.05}
                className={`mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.threshold ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={isSearching}
              />
              {errors.threshold && (
                <p className="mt-1 text-xs text-red-600">{errors.threshold}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Higher = more relevant (0-1)</p>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

// =============================================================================
// Search Result Card
// =============================================================================

interface SearchResultCardProps {
  result: DocumentSearchResult;
  onOpen: (documentId: string, chunkIndex: number) => void;
}

function SearchResultCard({ result, onOpen }: SearchResultCardProps) {
  const snippet = result.content.length > 300
    ? result.content.substring(0, 300) + '...'
    : result.content;

  const pageNumber = result.metadata?.page_number as number | undefined;
  const similarityPercent = Math.round(result.similarity_score * 100);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 truncate">
            {result.document_name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Chunk #{result.chunk_index + 1}
            </span>
            {pageNumber && (
              <span className="inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                Page {pageNumber}
              </span>
            )}
            <span className="inline-flex items-center rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              {similarityPercent}% match
            </span>
          </div>
        </div>
        <button
          onClick={() => onOpen(result.document_id, result.chunk_index)}
          className="flex-shrink-0 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          View Source
        </button>
      </div>

      {/* Content snippet */}
      <p className="text-sm text-gray-600 whitespace-pre-wrap break-words leading-relaxed">
        {snippet}
      </p>
    </div>
  );
}

// =============================================================================
// Results Summary
// =============================================================================

interface ResultsSummaryProps {
  query: string;
  totalResults: number;
}

function ResultsSummary({ query, totalResults }: ResultsSummaryProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-200">
      <p className="text-sm text-gray-600">
        Found <span className="font-medium text-gray-900">{totalResults}</span> result{totalResults !== 1 ? 's' : ''} for{' '}
        <span className="font-medium text-gray-900">"{query}"</span>
      </p>
    </div>
  );
}

// =============================================================================
// Document Search View
// =============================================================================

export function DocumentSearchView({ projectId }: DocumentSearchViewProps) {
  const {
    results,
    query,
    totalResults,
    isSearching,
    error,
    hasSearched,
    search,
    clearResults,
  } = useDocumentSearch(projectId);

  const handleSearch = useCallback(async (request: DocumentSearchRequest) => {
    await search(request);
  }, [search]);

  const handleOpenResult = useCallback((documentId: string, chunkIndex: number) => {
    window.location.href = `/projects/${projectId}/files/${documentId}?chunkIndex=${chunkIndex}`;
  }, [projectId]);

  const handleBack = () => {
    window.location.href = `/projects/${projectId}/files`;
  };

  return (
    <div className="mx-auto max-w-4xl p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={handleBack}
          className="mb-4 inline-flex items-center text-sm text-gray-600 hover:text-gray-900"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Files
        </button>
        <h1 className="text-2xl font-semibold text-gray-900">Search Documents</h1>
        <p className="mt-1 text-sm text-gray-600">
          Find relevant information across all your project documents using semantic search.
        </p>
      </div>

      {/* Search form */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <SearchForm onSearch={handleSearch} isSearching={isSearching} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mt-6">
          <InlineErrorBanner
            message={error.message}
            actionLabel={error.isRetryable ? error.retryLabel : undefined}
            onAction={error.isRetryable ? clearResults : undefined}
          />
        </div>
      )}

      {/* Results */}
      <div className="mt-6" role="region" aria-live="polite" aria-atomic="true">
        {hasSearched && !error && (
          <>
            <ResultsSummary query={query} totalResults={totalResults} />

            {results.length === 0 ? (
              <div className="mt-8 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No results found</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Try adjusting your search terms or lowering the similarity threshold.
                </p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {results.map((result) => (
                  <SearchResultCard
                    key={`${result.document_id}-${result.chunk_index}`}
                    result={result}
                    onOpen={handleOpenResult}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Initial state */}
        {!hasSearched && !isSearching && (
          <div className="mt-8 text-center">
            <svg
              className="mx-auto h-16 w-16 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">Search your documents</h3>
            <p className="mt-2 text-sm text-gray-600">
              Enter a question or keywords above to find relevant information from your uploaded documents.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
