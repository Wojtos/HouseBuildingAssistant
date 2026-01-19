/**
 * InlineErrorBanner Component
 *
 * Shared error display component used across the application.
 * Displays error messages with optional action button and proper accessibility attributes.
 * Styled to match Google's clean error presentation.
 */

import type { ErrorBannerVM } from '../types/viewModels';

interface InlineErrorBannerProps extends ErrorBannerVM {}

/**
 * Error icon component
 */
function ErrorIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/**
 * InlineErrorBanner displays error messages with proper ARIA attributes
 * for screen readers and accessibility.
 *
 * @param props - Error banner view model properties
 */
export function InlineErrorBanner({
  title,
  message,
  actionLabel,
  onAction,
}: InlineErrorBannerProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className="rounded-lg border border-red-200 bg-red-50 p-4"
    >
      <div className="flex">
        <ErrorIcon className="h-5 w-5 flex-shrink-0 text-red-500" />
        <div className="ml-3 flex-1">
          {title && (
            <h3 className="text-sm font-medium text-red-800">{title}</h3>
          )}
          <p className={`text-sm text-red-700 ${title ? 'mt-1' : ''}`}>
            {message}
          </p>
          {actionLabel && onAction && (
            <div className="mt-3">
              <button
                type="button"
                onClick={onAction}
                className="rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-800 transition-colors duration-200 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                {actionLabel}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Success banner variant for confirmation messages
 */
export function InlineSuccessBanner({
  title,
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-green-200 bg-green-50 p-4"
    >
      <div className="flex">
        <svg
          className="h-5 w-5 flex-shrink-0 text-green-500"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
            clipRule="evenodd"
          />
        </svg>
        <div className="ml-3">
          {title && (
            <h3 className="text-sm font-medium text-green-800">{title}</h3>
          )}
          <p className={`text-sm text-green-700 ${title ? 'mt-1' : ''}`}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Info banner variant for informational messages
 */
export function InlineInfoBanner({
  title,
  message,
}: {
  title?: string;
  message: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-lg border border-blue-200 bg-blue-50 p-4"
    >
      <div className="flex">
        <svg
          className="h-5 w-5 flex-shrink-0 text-blue-500"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
            clipRule="evenodd"
          />
        </svg>
        <div className="ml-3">
          {title && (
            <h3 className="text-sm font-medium text-blue-800">{title}</h3>
          )}
          <p className={`text-sm text-blue-700 ${title ? 'mt-1' : ''}`}>
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}
