/**
 * CsatControl Component
 *
 * Inline rating control shown only on assistant messages.
 * Displays 5-button rating group (1-5) with pressed state.
 */

import { useState, useCallback, memo } from 'react';

interface CsatControlProps {
  /** Project ID for API call */
  projectId: string;
  /** Message ID to rate */
  messageId: string;
  /** Current rating value (1-5 or null) */
  currentRating: number | null;
  /** Callback when rating is selected */
  onRated: (rating: 1 | 2 | 3 | 4 | 5) => void;
}

/**
 * CsatControl displays a 5-star rating interface for assistant messages
 */
export const CsatControl = memo(function CsatControl({
  messageId,
  currentRating,
  onRated,
}: CsatControlProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSaved, setShowSaved] = useState(false);

  const handleRatingClick = useCallback(
    async (rating: 1 | 2 | 3 | 4 | 5) => {
      if (isSubmitting) return;

      setIsSubmitting(true);
      try {
        await onRated(rating);
        setShowSaved(true);
        // Hide "Saved" indicator after 2 seconds
        setTimeout(() => setShowSaved(false), 2000);
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, onRated]
  );

  const ratings: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];

  return (
    <div className="mt-2 flex items-center gap-2">
      <span className="text-xs text-gray-500">Rate this response:</span>
      <div
        className="flex gap-1"
        role="group"
        aria-label="Rate this response from 1 to 5"
      >
        {ratings.map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => handleRatingClick(rating)}
            disabled={isSubmitting}
            aria-pressed={currentRating === rating}
            aria-label={`Rate ${rating} out of 5`}
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
              currentRating === rating
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } ${isSubmitting ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            {rating}
          </button>
        ))}
      </div>
      {showSaved && (
        <span className="text-xs text-green-600" aria-live="polite">
          Saved
        </span>
      )}
    </div>
  );
});
