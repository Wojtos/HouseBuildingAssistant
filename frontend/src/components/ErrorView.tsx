/**
 * ErrorView Component
 *
 * Shared error display component for 403, 404, and offline error pages.
 * Provides consistent messaging, accessibility, and navigation actions.
 */

import { useMemo } from 'react';
import type { ErrorViewVM, ErrorViewVariant } from '../types/viewModels';

/**
 * Props for ErrorView component
 */
interface ErrorViewProps {
  /** Error variant: 403 (forbidden), 404 (not found), or offline */
  variant: ErrorViewVariant;
  /** Optional return URL for "Go back" functionality */
  returnTo?: string;
}

/**
 * Validates and sanitizes the returnTo parameter to prevent open redirects.
 * Only allows same-origin paths that start with '/'.
 *
 * @param returnTo - The return URL to validate
 * @returns Safe return URL or default '/projects'
 */
function getSafeReturnTo(returnTo?: string): string {
  const defaultPath = '/projects';

  if (!returnTo) {
    return defaultPath;
  }

  // Must start with / to be a relative path
  if (!returnTo.startsWith('/')) {
    return defaultPath;
  }

  // Prevent protocol-relative URLs (//example.com)
  if (returnTo.startsWith('//')) {
    return defaultPath;
  }

  // Prevent URLs with protocols
  if (returnTo.includes('://')) {
    return defaultPath;
  }

  // Prevent javascript: URLs
  if (returnTo.toLowerCase().includes('javascript:')) {
    return defaultPath;
  }

  return returnTo;
}

/**
 * Generates error view configuration based on variant
 */
function getErrorConfig(
  variant: ErrorViewVariant,
  returnTo?: string
): ErrorViewVM {
  const safeReturnTo = getSafeReturnTo(returnTo);

  switch (variant) {
    case '403':
      return {
        variant: '403',
        title: 'Access Denied',
        description: "You don't have access to that resource.",
        primaryCta: {
          label: 'Back to projects',
          href: '/projects',
        },
      };

    case '404':
      // Check if returnTo includes /files for secondary CTA
      const showFilesLink = safeReturnTo.includes('/files');
      return {
        variant: '404',
        title: 'Page Not Found',
        description: "We couldn't find that page, project, or document.",
        primaryCta: {
          label: 'Back to projects',
          href: '/projects',
        },
        secondaryCta: showFilesLink
          ? {
              label: 'Back to files',
              href: safeReturnTo,
            }
          : undefined,
      };

    case 'offline':
      return {
        variant: 'offline',
        title: "You're Offline",
        description: 'Check your internet connection and try again.',
        primaryCta: {
          label: 'Retry',
          href: safeReturnTo,
        },
        secondaryCta: {
          label: 'Back to projects',
          href: '/projects',
        },
      };

    default:
      return {
        variant: '404',
        title: 'Something Went Wrong',
        description: 'An unexpected error occurred.',
        primaryCta: {
          label: 'Back to projects',
          href: '/projects',
        },
      };
  }
}

/**
 * Illustration component for error states
 */
function ErrorIllustration({ variant }: { variant: ErrorViewVariant }) {
  const iconContent = useMemo(() => {
    switch (variant) {
      case '403':
        return (
          <svg
            className="h-24 w-24 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
            />
          </svg>
        );
      case '404':
        return (
          <svg
            className="h-24 w-24 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z"
            />
          </svg>
        );
      case 'offline':
        return (
          <svg
            className="h-24 w-24 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3 3l18 18"
            />
          </svg>
        );
      default:
        return null;
    }
  }, [variant]);

  return (
    <div className="mb-6 flex items-center justify-center">{iconContent}</div>
  );
}

/**
 * ErrorView displays error pages with proper accessibility and navigation.
 *
 * Features:
 * - Consistent error messaging based on variant (403, 404, offline)
 * - Safe returnTo handling to prevent open redirects
 * - Accessible heading structure and focus management
 * - Primary and optional secondary call-to-action buttons
 *
 * @param props - Component properties
 */
export function ErrorView({ variant, returnTo }: ErrorViewProps) {
  const config = useMemo(
    () => getErrorConfig(variant, returnTo),
    [variant, returnTo]
  );

  const handleRetry = () => {
    if (variant === 'offline') {
      // For offline, try reloading the current page or navigate to returnTo
      window.location.reload();
    }
  };

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-16 text-center">
      <ErrorIllustration variant={variant} />

      <h1 className="mb-2 text-3xl font-semibold tracking-tight text-gray-900">
        {config.title}
      </h1>

      <p className="mb-8 max-w-md text-base text-gray-600">
        {config.description}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
        {variant === 'offline' ? (
          <button
            type="button"
            onClick={handleRetry}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {config.primaryCta.label}
          </button>
        ) : (
          <a
            href={config.primaryCta.href}
            className="inline-flex items-center justify-center rounded-md bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition-colors duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {config.primaryCta.label}
          </a>
        )}

        {config.secondaryCta && (
          <a
            href={config.secondaryCta.href}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-colors duration-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {config.secondaryCta.label}
          </a>
        )}
      </div>

      {/* Error code footer */}
      <p className="mt-12 text-sm text-gray-400">
        Error Code: {variant === 'offline' ? 'OFFLINE' : variant}
      </p>
    </div>
  );
}

export default ErrorView;
