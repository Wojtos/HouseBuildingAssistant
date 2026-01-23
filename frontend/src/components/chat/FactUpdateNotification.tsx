/**
 * FactUpdateNotification Component
 *
 * Shows a success notification after facts have been saved to project memory.
 */

interface FactUpdateNotificationProps {
  /** Number of facts stored */
  storedCount: number;
  /** Domains that were updated */
  domains: string[];
  /** Project ID for navigation */
  projectId: string;
  /** Called when notification is dismissed */
  onDismiss: () => void;
}

/**
 * Format domain names for display
 */
function formatDomains(domains: string[]): string {
  return domains
    .map((d) => d.replace(/_/g, ' ').toLowerCase())
    .join(', ');
}

export function FactUpdateNotification({
  storedCount,
  domains,
  projectId,
  onDismiss,
}: FactUpdateNotificationProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
      {/* Success icon */}
      <div className="flex-shrink-0">
        <svg
          className="h-5 w-5 text-green-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-green-800">
          {storedCount} fact{storedCount !== 1 ? 's' : ''} saved
        </p>
        <p className="text-green-700 text-xs">
          Updated: {formatDomains(domains)}
        </p>
      </div>

      {/* View Facts link */}
      <a
        href={`/projects/${projectId}/facts`}
        className="flex-shrink-0 inline-flex items-center gap-1 text-green-700 hover:text-green-900 text-sm font-medium"
      >
        View Facts
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
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>

      {/* Dismiss button */}
      <button
        type="button"
        className="flex-shrink-0 text-green-500 hover:text-green-700"
        onClick={onDismiss}
        aria-label="Dismiss"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  );
}
