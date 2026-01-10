/**
 * ChatComposer Component
 *
 * Text input area with send button, character counter, and keyboard shortcuts.
 * Handles Enter to send, Shift+Enter for newline.
 */

import { useCallback, useRef, useId, memo, type KeyboardEvent } from 'react';
import { MAX_MESSAGE_LENGTH } from '../../hooks/useProjectChat';

interface ChatComposerProps {
  /** Current draft message */
  draft: string;
  /** Callback when draft changes */
  onDraftChange: (value: string) => void;
  /** Callback to send message */
  onSend: () => void;
  /** Whether a message is currently being sent */
  isSending: boolean;
  /** Optional validation error for draft */
  draftError?: string;
}

/**
 * Character count warning threshold (show counter when near limit)
 */
const CHAR_WARNING_THRESHOLD = 3800;

/**
 * ChatComposer provides a textarea with send functionality
 */
export const ChatComposer = memo(function ChatComposer({
  draft,
  onDraftChange,
  onSend,
  isSending,
  draftError,
}: ChatComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const textareaId = useId();

  const trimmedDraft = draft.trim();
  const charCount = draft.length;
  const isOverLimit = charCount > MAX_MESSAGE_LENGTH;
  const showCharCounter = charCount >= CHAR_WARNING_THRESHOLD;
  const canSend = trimmedDraft !== '' && !isOverLimit && !isSending;

  /**
   * Handle keyboard events for sending message
   */
  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Enter without Shift sends message
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (canSend) {
          onSend();
        }
      }
    },
    [canSend, onSend]
  );

  /**
   * Handle send button click
   */
  const handleSendClick = useCallback(() => {
    if (canSend) {
      onSend();
    }
  }, [canSend, onSend]);

  /**
   * Handle textarea change
   */
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onDraftChange(e.target.value);
    },
    [onDraftChange]
  );

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="mx-auto max-w-4xl">
        <div className="relative">
          <textarea
            ref={textareaRef}
            id={textareaId}
            value={draft}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={isSending}
            placeholder="Ask a question about your project..."
            rows={3}
            aria-label="Message input"
            aria-invalid={!!draftError || isOverLimit}
            aria-describedby={
              draftError || isOverLimit ? `${textareaId}-error` : undefined
            }
            className={`w-full resize-none rounded-lg border px-4 py-3 pr-16 text-sm shadow-sm focus:outline-none focus:ring-2 ${
              isOverLimit || draftError
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
            } ${isSending ? 'cursor-not-allowed bg-gray-50' : ''}`}
          />

          {/* Send button */}
          <button
            type="button"
            onClick={handleSendClick}
            disabled={!canSend}
            aria-label="Send message"
            className={`absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
              canSend
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'cursor-not-allowed bg-gray-200 text-gray-400'
            }`}
          >
            {isSending ? (
              <svg
                className="h-4 w-4 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            )}
          </button>
        </div>

        {/* Helper row */}
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">
              Enter
            </kbd>{' '}
            to send,{' '}
            <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs">
              Shift + Enter
            </kbd>{' '}
            for new line
          </p>

          {/* Character counter */}
          {showCharCounter && (
            <p
              id={`${textareaId}-error`}
              className={`text-xs ${
                isOverLimit ? 'font-medium text-red-600' : 'text-gray-500'
              }`}
            >
              {charCount}/{MAX_MESSAGE_LENGTH}
            </p>
          )}
        </div>

        {/* Validation error */}
        {draftError && (
          <p id={`${textareaId}-error`} className="mt-1 text-sm text-red-600">
            {draftError}
          </p>
        )}
      </div>
    </div>
  );
});
