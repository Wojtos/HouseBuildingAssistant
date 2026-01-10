/**
 * ChatThread Component
 *
 * Renders message list with scroll management (stick-to-bottom behavior).
 * Displays user and assistant messages with CSAT controls for assistant messages.
 */

import {
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  memo,
  type RefObject,
} from 'react';
import { CsatControl } from './CsatControl';
import type { ChatMessageVM } from '../../types/viewModels';

interface ChatThreadProps {
  /** Array of messages to display */
  messages: ChatMessageVM[];
  /** Whether initial messages are loading */
  isLoading: boolean;
  /** Callback to load older messages */
  onLoadOlder: () => void;
  /** Whether more older messages exist */
  canLoadOlder: boolean;
  /** Whether older messages are currently loading */
  isLoadingOlder: boolean;
  /** Project ID for CSAT submission */
  projectId: string;
  /** Callback when CSAT rating is submitted */
  onCsatSubmit: (messageId: string, rating: 1 | 2 | 3 | 4 | 5) => void;
  /** ID of pending assistant message */
  pendingAssistantId: string | null;
  /** Whether to show "Still working..." text */
  showStillWorking: boolean;
}

/**
 * Threshold in pixels for "near bottom" detection
 */
const NEAR_BOTTOM_THRESHOLD = 100;

/**
 * Format timestamp for display
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Hook to track if scroll is near bottom
 */
function useScrollNearBottom(
  containerRef: RefObject<HTMLDivElement | null>,
  threshold: number = NEAR_BOTTOM_THRESHOLD
) {
  const isNearBottomRef = useRef(true);

  const updateScrollPosition = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    isNearBottomRef.current = distanceFromBottom <= threshold;
  }, [containerRef, threshold]);

  return { isNearBottomRef, updateScrollPosition };
}

/**
 * MessageBubble component for individual messages
 */
const MessageBubble = memo(function MessageBubble({
  message,
  projectId,
  onCsatSubmit,
  isPending,
  showStillWorking,
}: {
  message: ChatMessageVM;
  projectId: string;
  onCsatSubmit: (messageId: string, rating: 1 | 2 | 3 | 4 | 5) => void;
  isPending: boolean;
  showStillWorking: boolean;
}) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const isFailed = message.status === 'failed';

  // Determine message content
  let displayContent = message.content;
  if (isPending && showStillWorking) {
    displayContent = 'Still working…';
  }

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
      aria-label={`${isUser ? 'You' : 'Assistant'} said`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? isFailed
              ? 'bg-red-100 text-red-800'
              : 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900'
        } ${isPending ? 'animate-pulse' : ''}`}
      >
        {/* Message content */}
        <p className="whitespace-pre-wrap break-words text-sm">
          {displayContent}
        </p>

        {/* Timestamp */}
        <p
          className={`mt-1 text-xs ${
            isUser
              ? isFailed
                ? 'text-red-600'
                : 'text-blue-200'
              : 'text-gray-500'
          }`}
        >
          {formatTimestamp(message.created_at)}
          {isFailed && ' • Failed to send'}
        </p>

        {/* CSAT control for assistant messages */}
        {isAssistant && !isPending && !isFailed && (
          <CsatControl
            projectId={projectId}
            messageId={message.id}
            currentRating={message.csat_rating ?? null}
            onRated={(rating) => onCsatSubmit(message.id, rating)}
          />
        )}

        {/* Agent info for debugging (optional) */}
        {isAssistant && message.agent_id && !isPending && (
          <p className="mt-1 text-xs text-gray-400">
            Agent: {message.agent_id}
          </p>
        )}
      </div>
    </div>
  );
});

/**
 * ChatThread renders the message list with scroll management
 */
export const ChatThread = memo(function ChatThread({
  messages,
  isLoading,
  onLoadOlder,
  canLoadOlder,
  isLoadingOlder,
  projectId,
  onCsatSubmit,
  pendingAssistantId,
  showStillWorking,
}: ChatThreadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isNearBottomRef, updateScrollPosition } =
    useScrollNearBottom(containerRef);

  /**
   * Scroll to bottom of container
   */
  const scrollToBottom = useCallback(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, []);

  /**
   * Auto-scroll when new messages arrive if near bottom
   */
  useLayoutEffect(() => {
    if (isNearBottomRef.current) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom, isNearBottomRef]);

  /**
   * Scroll to bottom on initial load
   */
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      scrollToBottom();
    }
  }, [isLoading, messages.length, scrollToBottom]);

  /**
   * Handle scroll events
   */
  const handleScroll = useCallback(() => {
    updateScrollPosition();
  }, [updateScrollPosition]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="h-8 w-8 animate-spin text-blue-600"
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
          <p className="text-sm text-gray-500">Loading messages...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-8 w-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">Start a conversation</h3>
          <p className="mt-1 text-sm text-gray-500">
            Ask questions about your building project and get AI-powered assistance.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto"
      role="log"
      aria-live="polite"
      aria-label="Chat messages"
    >
      <div className="mx-auto max-w-4xl px-4 py-6">
        {/* Load older button */}
        {canLoadOlder && (
          <div className="mb-4 flex justify-center">
            <button
              type="button"
              onClick={onLoadOlder}
              disabled={isLoadingOlder}
              className="flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoadingOlder ? (
                <>
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
                  Loading...
                </>
              ) : (
                <>
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
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                  Load older messages
                </>
              )}
            </button>
          </div>
        )}

        {/* Message list */}
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              projectId={projectId}
              onCsatSubmit={onCsatSubmit}
              isPending={message.id === pendingAssistantId}
              showStillWorking={showStillWorking}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
