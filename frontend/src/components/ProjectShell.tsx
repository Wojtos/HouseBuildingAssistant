/**
 * ProjectShell Component
 *
 * Persistent layout wrapper for all project-scoped routes.
 * Loads project context, provides navigation, and handles phase updates.
 */

import { useCallback, type ReactNode } from 'react';
import { useProject } from '../hooks/useProject';
import { PhaseBadge } from './PhaseBadge';
import { InlineErrorBanner } from './InlineErrorBanner';
import { LogoutButton } from './LogoutButton';
import type { ConstructionPhase } from '../types/api';
import type { ProjectNavKey } from '../types/viewModels';

interface ProjectShellProps {
  /** Project ID from route params */
  projectId: string;
  /** Currently active navigation key */
  activeNavKey: ProjectNavKey;
  /** Child content to render */
  children?: ReactNode;
}

/**
 * Navigation items configuration
 */
const NAV_ITEMS: { key: ProjectNavKey; label: string; href: (id: string) => string }[] = [
  { key: 'chat', label: 'Chat', href: (id) => `/projects/${id}/chat` },
  { key: 'files', label: 'Files', href: (id) => `/projects/${id}/files` },
  { key: 'facts', label: 'Facts', href: (id) => `/projects/${id}/facts` },
  { key: 'settings', label: 'Settings', href: (id) => `/projects/${id}/settings` },
];

/**
 * Loading skeleton for project header
 */
function HeaderSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center gap-4">
        <div className="h-6 w-48 rounded bg-gray-200" />
        <div className="h-6 w-24 rounded-full bg-gray-200" />
      </div>
      <div className="mt-1 h-4 w-32 rounded bg-gray-100" />
    </div>
  );
}

/**
 * Project not found state
 */
function ProjectNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="text-center">
        <svg
          className="mx-auto h-16 w-16 text-gray-400"
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
        <h2 className="mt-4 text-xl font-semibold text-gray-900">
          Project not found
        </h2>
        <p className="mt-2 text-gray-500">
          The project you're looking for doesn't exist or you don't have access to it.
        </p>
        <a
          href="/projects"
          className="mt-6 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Back to Projects
        </a>
      </div>
    </div>
  );
}

/**
 * ProjectShell component
 */
export function ProjectShell({
  projectId,
  activeNavKey,
  children,
}: ProjectShellProps) {
  const {
    project,
    isLoading,
    error,
    isUpdatingPhase,
    refresh,
    updatePhase,
    clearError,
  } = useProject(projectId);

  const handlePhaseChange = useCallback(
    (phase: string) => {
      updatePhase(phase as ConstructionPhase);
    },
    [updatePhase]
  );

  // Show not found state for 404 errors
  if (!isLoading && error && !error.isRetryable) {
    return <ProjectNotFound />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-blue-600 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Left section: Back + Project Info */}
            <div className="flex items-center gap-4">
              {/* Back to projects link */}
              <a
                href="/projects"
                className="flex items-center text-sm font-medium text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                title="Back to all projects"
              >
                <svg
                  className="mr-1.5 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                Projects
              </a>

              <span className="text-gray-300" aria-hidden="true">
                |
              </span>

              {/* Project info */}
              {isLoading ? (
                <HeaderSkeleton />
              ) : project ? (
                <div className="flex items-center gap-3">
                  <div>
                    <h1 className="text-lg font-semibold text-gray-900">
                      {project.name}
                    </h1>
                    {project.location && (
                      <p className="text-sm text-gray-500">{project.location}</p>
                    )}
                  </div>
                  <PhaseBadge
                    value={project.current_phase}
                    onChange={handlePhaseChange}
                    editable={true}
                    isUpdating={isUpdatingPhase}
                  />
                </div>
              ) : null}
            </div>

            {/* Right section: Nav + Logout */}
            <div className="flex items-center gap-4">
              {/* Primary navigation */}
              <nav className="hidden items-center gap-1 sm:flex" aria-label="Project navigation">
                {NAV_ITEMS.map((item) => {
                  const isActive = item.key === activeNavKey;
                  return (
                    <a
                      key={item.key}
                      href={item.href(projectId)}
                      className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-blue-50 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {item.label}
                    </a>
                  );
                })}
              </nav>

              <span className="hidden text-gray-300 sm:inline" aria-hidden="true">
                |
              </span>

              <LogoutButton className="text-sm font-medium text-gray-600 hover:text-gray-900" />
            </div>
          </div>

          {/* Mobile navigation */}
          <nav
            className="flex gap-1 overflow-x-auto pb-2 sm:hidden"
            aria-label="Project navigation"
          >
            {NAV_ITEMS.map((item) => {
              const isActive = item.key === activeNavKey;
              return (
                <a
                  key={item.key}
                  href={item.href(projectId)}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ${
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Global status region */}
      {error && error.isRetryable && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-3">
          <div className="mx-auto max-w-7xl">
            <InlineErrorBanner
              message={error.message}
              actionLabel={error.retryLabel}
              onAction={error.retryLabel === 'Dismiss' ? clearError : refresh}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <main id="main-content" className="flex-1">
        {children}
      </main>
    </div>
  );
}
