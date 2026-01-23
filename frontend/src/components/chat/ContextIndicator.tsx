/**
 * ContextIndicator Component
 *
 * Displays visual indicators showing which context sources were used
 * when generating an AI response (UC-0, UC-1, UC-2, UC-4).
 */

import type { ContextMetadata } from '../../types/api';

interface ContextIndicatorProps {
  metadata: ContextMetadata;
}

/**
 * Shows small badges indicating which context sources were used
 */
export function ContextIndicator({ metadata }: ContextIndicatorProps) {
  const hasAnyContext =
    metadata.used_project_context ||
    metadata.used_memory ||
    metadata.used_documents ||
    metadata.used_web_search;

  if (!hasAnyContext) {
    return null;
  }

  return (
    <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
      <span className="text-gray-400">Used:</span>

      {metadata.used_project_context && (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded"
          title="Project context was included"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
            />
          </svg>
          Project
        </span>
      )}

      {metadata.used_memory && (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded"
          title="Project memory/facts were included"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          Memory
        </span>
      )}

      {metadata.used_documents && (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded"
          title={`${metadata.document_count} document chunk(s) retrieved`}
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          {metadata.document_count} Doc{metadata.document_count !== 1 ? 's' : ''}
        </span>
      )}

      {metadata.used_web_search && (
        <span
          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-50 text-green-600 rounded"
          title="Web search was performed for current information"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
          Web
        </span>
      )}
    </div>
  );
}
