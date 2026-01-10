/**
 * InlineErrorBanner Component
 * 
 * Shared error display component used across the application.
 * Displays error messages with optional action button and proper accessibility attributes.
 */

import type { ErrorBannerVM } from '../types/viewModels';

interface InlineErrorBannerProps extends ErrorBannerVM {}

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
      <div className="flex flex-col gap-2">
        {title && (
          <h3 className="text-sm font-semibold text-red-800">{title}</h3>
        )}
        <p className="text-sm text-red-700">{message}</p>
        {actionLabel && onAction && (
          <div className="mt-2">
            <button
              type="button"
              onClick={onAction}
              className="text-sm font-medium text-red-800 underline hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              {actionLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
