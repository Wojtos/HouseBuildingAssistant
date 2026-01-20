/**
 * ProjectsListView Component
 *
 * Main view for listing user's projects with filters, pagination,
 * and navigation to project-scoped views.
 */

import { useCallback } from 'react';
import { useProjectsList } from '../hooks/useProjectsList';
import { PaginationControls } from './PaginationControls';
import { PhaseBadge } from './PhaseBadge';
import { InlineErrorBanner, InlineInfoBanner } from './InlineErrorBanner';
import { ConstructionPhase, type ProjectListItem } from '../types/api';
import { getPhaseLabel } from './PhaseSelect';

/**
 * Format date for display
 */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format relative time
 */
function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return formatDate(isoString);
}

/**
 * ProjectCard component for mobile view
 */
function ProjectCard({
  project,
  onOpen,
}: {
  project: ProjectListItem;
  onOpen: (id: string) => void;
}) {
  const isDeleted = project.deleted_at !== null;

  return (
    <div
      className={`rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md ${
        isDeleted ? 'border-gray-300 bg-gray-50 opacity-75' : 'border-gray-200'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-lg font-semibold text-gray-900">
              {project.name}
            </h3>
            {isDeleted && (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                Archived
              </span>
            )}
          </div>
          {project.location && (
            <p className="mt-1 truncate text-sm text-gray-500">
              {project.location}
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <PhaseBadge value={project.current_phase} />
        <span className="text-sm text-gray-500">
          {formatRelativeTime(project.updated_at)}
        </span>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => onOpen(project.id)}
          disabled={isDeleted}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {isDeleted ? 'Archived' : 'Open Project'}
        </button>
      </div>
    </div>
  );
}

/**
 * ProjectRow component for desktop table view
 */
function ProjectRow({
  project,
  onOpen,
}: {
  project: ProjectListItem;
  onOpen: (id: string) => void;
}) {
  const isDeleted = project.deleted_at !== null;

  return (
    <tr
      className={`transition-colors hover:bg-gray-50 ${
        isDeleted ? 'bg-gray-50 opacity-75' : ''
      }`}
    >
      <td className="whitespace-nowrap px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{project.name}</span>
          {isDeleted && (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              Archived
            </span>
          )}
        </div>
        {project.location && (
          <p className="mt-1 text-sm text-gray-500">{project.location}</p>
        )}
      </td>
      <td className="whitespace-nowrap px-6 py-4">
        <PhaseBadge value={project.current_phase} />
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
        {formatDate(project.created_at)}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
        {formatRelativeTime(project.updated_at)}
      </td>
      <td className="whitespace-nowrap px-6 py-4 text-right">
        <button
          type="button"
          onClick={() => onOpen(project.id)}
          disabled={isDeleted}
          className="inline-flex items-center rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          Open
        </button>
      </td>
    </tr>
  );
}

/**
 * FiltersBar component
 */
function FiltersBar({
  phase,
  includeDeleted,
  onPhaseChange,
  onIncludeDeletedChange,
  disabled,
}: {
  phase: string;
  includeDeleted: boolean;
  onPhaseChange: (phase: string) => void;
  onIncludeDeletedChange: (include: boolean) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      {/* Phase filter */}
      <div className="flex items-center gap-2">
        <label
          htmlFor="phase-filter"
          className="text-sm font-medium text-gray-700"
        >
          Phase:
        </label>
        <select
          id="phase-filter"
          value={phase}
          onChange={(e) => onPhaseChange(e.target.value)}
          disabled={disabled}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
        >
          <option value="ALL">All Phases</option>
          {Object.values(ConstructionPhase).map((p) => (
            <option key={p} value={p}>
              {getPhaseLabel(p)}
            </option>
          ))}
        </select>
      </div>

      {/* Show archived toggle */}
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={includeDeleted}
          onChange={(e) => onIncludeDeletedChange(e.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
        />
        <span className="text-sm text-gray-700">Show archived</span>
      </label>
    </div>
  );
}

/**
 * Empty state component
 */
function EmptyState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
      <svg
        className="mx-auto h-12 w-12 text-gray-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
      <h3 className="mt-4 text-lg font-medium text-gray-900">
        {hasFilters ? 'No projects match your filters' : 'No projects yet'}
      </h3>
      <p className="mt-2 text-sm text-gray-500">
        {hasFilters
          ? 'Try adjusting your filters or clear them to see all projects.'
          : 'Get started by creating your first building project.'}
      </p>
      {!hasFilters && (
        <div className="mt-6">
          <a
            href="/projects/new"
            className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg
              className="-ml-1 mr-2 h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            Create Project
          </a>
        </div>
      )}
    </div>
  );
}

/**
 * Loading skeleton
 */
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg border border-gray-200 bg-white p-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="h-5 w-48 rounded bg-gray-200" />
              <div className="mt-2 h-4 w-32 rounded bg-gray-100" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <div className="h-6 w-24 rounded-full bg-gray-200" />
            <div className="h-4 w-20 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * ProjectsListView component
 */
export function ProjectsListView() {
  const {
    items = [],
    pagination,
    query,
    isLoading,
    error,
    updateQuery,
    refresh,
    clearError,
  } = useProjectsList();

  const handleOpenProject = useCallback((projectId: string) => {
    window.location.href = `/projects/${projectId}/chat`;
  }, []);

  const handleCreateProject = useCallback(() => {
    window.location.href = '/projects/new';
  }, []);

  const hasFilters = query.phase !== 'ALL' || query.include_deleted;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <header className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Projects</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your building projects
              </p>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/settings/account"
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg
                  className="-ml-1 mr-2 h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Settings
              </a>
              <button
                type="button"
                onClick={handleCreateProject}
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                <svg
                  className="-ml-1 mr-2 h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                New Project
              </button>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="mb-6">
          <FiltersBar
            phase={query.phase}
            includeDeleted={query.include_deleted}
            onPhaseChange={(phase) => updateQuery({ phase })}
            onIncludeDeletedChange={(include) =>
              updateQuery({ include_deleted: include })
            }
            disabled={isLoading}
          />
        </div>

        {/* Archived info banner */}
        {query.include_deleted && (
          <div className="mb-6">
            <InlineInfoBanner
              message="Showing archived projects. These projects are read-only and cannot be restored in MVP."
            />
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="mb-6">
            <InlineErrorBanner
              message={error.message}
              actionLabel={error.isRetryable ? error.retryLabel : undefined}
              onAction={error.isRetryable ? refresh : clearError}
            />
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <LoadingSkeleton />
        ) : items.length === 0 ? (
          <EmptyState hasFilters={hasFilters} />
        ) : (
          <>
            {/* Mobile Cards */}
            <div className="space-y-4 lg:hidden">
              {items.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onOpen={handleOpenProject}
                />
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden lg:block">
              <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        Project
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        Phase
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        Created
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500"
                      >
                        Updated
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {items.map((project) => (
                      <ProjectRow
                        key={project.id}
                        project={project}
                        onOpen={handleOpenProject}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pagination */}
            {pagination && pagination.total_pages > 1 && (
              <div className="mt-6">
                <PaginationControls
                  page={query.page}
                  totalPages={pagination.total_pages}
                  limit={query.limit}
                  totalItems={pagination.total_items}
                  onPageChange={(page) => updateQuery({ page })}
                  onLimitChange={(limit) => updateQuery({ limit })}
                  disabled={isLoading}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
