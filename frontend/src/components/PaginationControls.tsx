/**
 * PaginationControls Component
 *
 * Reusable pagination controls with previous/next buttons,
 * current page indicator, and optional page size selector.
 */

interface PaginationControlsProps {
  /** Current page (1-based) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Items per page */
  limit: number;
  /** Total number of items */
  totalItems?: number;
  /** Callback when page changes */
  onPageChange: (page: number) => void;
  /** Optional callback when limit changes */
  onLimitChange?: (limit: number) => void;
  /** Whether controls are disabled */
  disabled?: boolean;
}

/**
 * Available page size options
 */
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

/**
 * PaginationControls component
 */
export function PaginationControls({
  page,
  totalPages,
  limit,
  totalItems,
  onPageChange,
  onLimitChange,
  disabled = false,
}: PaginationControlsProps) {
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  const handlePrevious = () => {
    if (canGoPrevious && !disabled) {
      onPageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext && !disabled) {
      onPageChange(page + 1);
    }
  };

  const handleLimitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (onLimitChange) {
      onLimitChange(Number(e.target.value));
    }
  };

  // Calculate item range
  const startItem = totalItems ? (page - 1) * limit + 1 : 0;
  const endItem = totalItems ? Math.min(page * limit, totalItems) : 0;

  return (
    <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
      {/* Item count */}
      {totalItems !== undefined && totalItems > 0 && (
        <p className="text-sm text-gray-700">
          Showing <span className="font-medium">{startItem}</span> to{' '}
          <span className="font-medium">{endItem}</span> of{' '}
          <span className="font-medium">{totalItems}</span> results
        </p>
      )}

      <div className="flex items-center gap-4">
        {/* Page size selector */}
        {onLimitChange && (
          <div className="flex items-center gap-2">
            <label
              htmlFor="page-size"
              className="text-sm text-gray-600"
            >
              Per page:
            </label>
            <select
              id="page-size"
              value={limit}
              onChange={handleLimitChange}
              disabled={disabled}
              className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-100"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Navigation buttons */}
        <nav
          className="flex items-center gap-1"
          aria-label="Pagination"
        >
          <button
            type="button"
            onClick={handlePrevious}
            disabled={!canGoPrevious || disabled}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            aria-label="Previous page"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>

          {/* Page indicator */}
          <span className="px-3 text-sm text-gray-700">
            Page <span className="font-medium">{page}</span> of{' '}
            <span className="font-medium">{totalPages || 1}</span>
          </span>

          <button
            type="button"
            onClick={handleNext}
            disabled={!canGoNext || disabled}
            className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
            aria-label="Next page"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </nav>
      </div>
    </div>
  );
}
