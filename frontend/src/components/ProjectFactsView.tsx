/**
 * ProjectFactsView Component
 *
 * Displays project memory (facts) in a read-only, organized format.
 * Allows users to suggest corrections via chat.
 */

import { useState, useCallback } from 'react';
import { useProjectMemory } from '../hooks/useProjectMemory';
import { InlineErrorBanner, InlineInfoBanner } from './InlineErrorBanner';
import type { FactsDomainVM } from '../types/viewModels';

interface ProjectFactsViewProps {
  projectId: string;
}

// =============================================================================
// Domain Label Formatting
// =============================================================================

const DOMAIN_LABELS: Record<string, string> = {
  FINANCE: 'Finance & Budget',
  PERMITTING: 'Permits & Approvals',
  DESIGN: 'Design & Architecture',
  SITE: 'Site Information',
  FOUNDATION: 'Foundation',
  STRUCTURE: 'Structure',
  SYSTEMS: 'Building Systems',
  FINISHES: 'Finishes & Interior',
  LEGAL: 'Legal & Contracts',
  TIMELINE: 'Timeline & Schedule',
  CONTACTS: 'Contacts & Vendors',
};

function getDomainLabel(key: string): string {
  return DOMAIN_LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

// =============================================================================
// JSON Value Renderer
// =============================================================================

interface ValueRendererProps {
  value: unknown;
  depth?: number;
}

function ValueRenderer({ value, depth = 0 }: ValueRendererProps) {
  if (value === null || value === undefined) {
    return <span className="text-gray-400 italic">Not set</span>;
  }

  if (typeof value === 'boolean') {
    return (
      <span className={value ? 'text-green-600' : 'text-red-600'}>
        {value ? 'Yes' : 'No'}
      </span>
    );
  }

  if (typeof value === 'number') {
    return <span className="font-mono text-blue-600">{value.toLocaleString()}</span>;
  }

  if (typeof value === 'string') {
    // Check if it's a date
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return (
          <span className="text-gray-900">
            {date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
        );
      }
    }

    // Check if it's a URL
    if (/^https?:\/\//.test(value)) {
      return (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:underline"
        >
          {value}
        </a>
      );
    }

    // Check if it's a currency amount
    if (/^\$[\d,]+(\.\d{2})?$/.test(value)) {
      return <span className="font-mono text-green-600">{value}</span>;
    }

    return <span className="text-gray-900">{value}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-gray-400 italic">Empty list</span>;
    }

    // Check if it's an array of primitives
    const allPrimitives = value.every((v) => typeof v !== 'object' || v === null);
    if (allPrimitives) {
      return (
        <ul className="list-inside list-disc space-y-1">
          {value.map((item, index) => (
            <li key={index} className="text-gray-900">
              <ValueRenderer value={item} depth={depth + 1} />
            </li>
          ))}
        </ul>
      );
    }

    return (
      <div className="space-y-2">
        {value.map((item, index) => (
          <div key={index} className="rounded-md bg-gray-50 p-3">
            <ValueRenderer value={item} depth={depth + 1} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      return <span className="text-gray-400 italic">No data</span>;
    }

    return (
      <dl className={`space-y-2 ${depth > 0 ? 'pl-4 border-l-2 border-gray-200' : ''}`}>
        {entries.map(([key, val]) => (
          <div key={key}>
            <dt className="text-sm font-medium text-gray-500">
              {key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </dt>
            <dd className="mt-0.5 text-sm">
              <ValueRenderer value={val} depth={depth + 1} />
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  // Fallback: JSON stringify
  return (
    <pre className="overflow-x-auto rounded bg-gray-100 p-2 text-xs">
      {JSON.stringify(value, null, 2)}
    </pre>
  );
}

// =============================================================================
// Domain Panel (Accordion Item)
// =============================================================================

interface DomainPanelProps {
  domain: FactsDomainVM;
  isExpanded: boolean;
  onToggle: () => void;
}

function DomainPanel({ domain, isExpanded, onToggle }: DomainPanelProps) {
  const label = getDomainLabel(domain.domainKey);

  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-4 text-left hover:bg-gray-50"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-3">
          <span className="text-base font-medium text-gray-900">{label}</span>
          {domain.isEmpty && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
              Empty
            </span>
          )}
        </div>
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="bg-gray-50 px-4 py-4">
          {domain.isEmpty ? (
            <p className="text-sm text-gray-500 italic">
              No facts recorded for this category yet.
            </p>
          ) : (
            <ValueRenderer value={domain.facts} />
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Facts Viewer (Accordion)
// =============================================================================

interface FactsViewerProps {
  domains: FactsDomainVM[];
  updatedAt: string | null;
}

function FactsViewer({ domains, updatedAt }: FactsViewerProps) {
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(() => {
    // Expand first non-empty domain by default
    const firstNonEmpty = domains.find((d) => !d.isEmpty);
    return firstNonEmpty ? new Set([firstNonEmpty.domainKey]) : new Set();
  });

  const toggleDomain = useCallback((key: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setExpandedDomains(new Set(domains.map((d) => d.domainKey)));
  }, [domains]);

  const collapseAll = useCallback(() => {
    setExpandedDomains(new Set());
  }, []);

  if (domains.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Controls */}
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {updatedAt && (
            <>
              Last updated:{' '}
              {new Date(updatedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="text-sm text-blue-600 hover:underline"
          >
            Expand all
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={collapseAll}
            className="text-sm text-blue-600 hover:underline"
          >
            Collapse all
          </button>
        </div>
      </div>

      {/* Accordion */}
      <div className="rounded-lg border border-gray-200 bg-white">
        {domains.map((domain) => (
          <DomainPanel
            key={domain.domainKey}
            domain={domain}
            isExpanded={expandedDomains.has(domain.domainKey)}
            onToggle={() => toggleDomain(domain.domainKey)}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Suggest Correction Button
// =============================================================================

interface SuggestCorrectionButtonProps {
  projectId: string;
}

function SuggestCorrectionButton({ projectId }: SuggestCorrectionButtonProps) {
  const handleClick = () => {
    // Navigate to chat with a prefilled prompt hint
    const message = encodeURIComponent(
      "I'd like to correct some information in the project facts. Please help me update:"
    );
    window.location.href = `/projects/${projectId}/chat?draft=${message}`;
  };

  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center gap-2 rounded-md border border-blue-600 bg-white px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
      Suggest Correction
    </button>
  );
}

// =============================================================================
// Empty State
// =============================================================================

function EmptyState({ projectId }: { projectId: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <svg className="h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
      <h3 className="mt-4 text-lg font-medium text-gray-900">No facts captured yet</h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500">
        Facts are automatically extracted from your conversations. Start chatting to build your project knowledge base.
      </p>
      <a
        href={`/projects/${projectId}/chat`}
        className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        Start Chat
      </a>
    </div>
  );
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function LoadingSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white">
            <div className="flex items-center justify-between px-4 py-4">
              <div className="h-5 w-32 rounded bg-gray-200" />
              <div className="h-5 w-5 rounded bg-gray-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ProjectFactsView({ projectId }: ProjectFactsViewProps) {
  const {
    memory,
    domains,
    isLoading,
    error,
    refresh,
  } = useProjectMemory(projectId);

  const hasNonEmptyDomains = domains.some((d) => !d.isEmpty);

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Project Facts</h1>
          <p className="mt-1 text-sm text-gray-500">
            Knowledge captured about your project
          </p>
        </div>
        <SuggestCorrectionButton projectId={projectId} />
      </div>

      {/* Info Banner */}
      <div className="mb-6">
        <InlineInfoBanner
          message="Facts are read-only and can only be updated through conversations. Use 'Suggest Correction' to update information via chat."
        />
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

      {/* Content */}
      {isLoading ? (
        <LoadingSkeleton />
      ) : !hasNonEmptyDomains ? (
        <EmptyState projectId={projectId} />
      ) : (
        <FactsViewer
          domains={domains}
          updatedAt={memory?.updated_at || null}
        />
      )}
    </div>
  );
}
