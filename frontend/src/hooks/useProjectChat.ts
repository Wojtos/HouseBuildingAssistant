/**
 * useProjectChat Hook
 *
 * Custom hook encapsulating chat lifecycle for a project.
 * Manages message history, sending messages, CSAT feedback, and error handling.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { fetchJson, ApiError, handleApiError } from '../lib/apiClient';
import type {
  MessageListResponse,
  MessageItem,
  ChatRequest,
  ChatResponse,
  MessageFeedbackRequest,
  MessageFeedbackResponse,
} from '../types/api';
import type { ChatMessageVM, ApiErrorVM } from '../types/viewModels';

/**
 * Maximum message content length (client-enforced)
 */
export const MAX_MESSAGE_LENGTH = 4000;

/**
 * Time before showing "Still working..." placeholder text
 */
const STILL_WORKING_DELAY_MS = 5000;

/**
 * Convert MessageItem from API to ChatMessageVM
 */
function toMessageVM(item: MessageItem): ChatMessageVM {
  return {
    id: item.id,
    role: item.role,
    content: item.content,
    created_at: item.created_at,
    agent_id: item.agent_id,
    csat_rating: item.csat_rating,
    status: 'sent',
  };
}

/**
 * Convert ChatResponse to ChatMessageVM
 */
function chatResponseToVM(response: ChatResponse): ChatMessageVM {
  return {
    id: response.id,
    role: response.role,
    content: response.content,
    created_at: response.created_at,
    agent_id: response.agent_id,
    routing_metadata: response.routing_metadata,
    status: 'sent',
  };
}

interface UseProjectChatState {
  /** All messages in the chat thread */
  messages: ChatMessageVM[];
  /** Current draft message */
  draft: string;
  /** Loading initial message history */
  isLoadingInitial: boolean;
  /** Loading older messages */
  isLoadingOlder: boolean;
  /** Sending a message */
  isSending: boolean;
  /** Whether more older messages exist */
  hasMoreOlder: boolean;
  /** Error banner state */
  errorBanner: ApiErrorVM | null;
  /** ID of pending assistant placeholder */
  pendingAssistantId: string | null;
  /** Whether placeholder should show "Still working..." */
  showStillWorking: boolean;
}

interface UseProjectChatActions {
  /** Load initial message history */
  loadInitial: () => Promise<void>;
  /** Load older messages */
  loadOlder: () => Promise<void>;
  /** Update draft message */
  setDraft: (value: string) => void;
  /** Send message */
  sendMessage: () => Promise<void>;
  /** Retry last failed send */
  retryLastSend: () => Promise<void>;
  /** Submit CSAT rating for a message */
  submitCsat: (messageId: string, rating: 1 | 2 | 3 | 4 | 5) => Promise<void>;
  /** Clear error banner */
  clearError: () => void;
}

export type UseProjectChatReturn = UseProjectChatState & UseProjectChatActions;

/**
 * Custom hook for managing project chat state and actions
 */
export function useProjectChat(projectId: string): UseProjectChatReturn {
  const [messages, setMessages] = useState<ChatMessageVM[]>([]);
  const [draft, setDraft] = useState('');
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const [errorBanner, setErrorBanner] = useState<ApiErrorVM | null>(null);
  const [pendingAssistantId, setPendingAssistantId] = useState<string | null>(
    null
  );
  const [showStillWorking, setShowStillWorking] = useState(false);

  // Track last sent content for retry
  const lastSentContentRef = useRef<string | null>(null);
  // AbortController for cancelling in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);
  // Timeout ref for "Still working..." text
  const stillWorkingTimeoutRef = useRef<number | null>(null);

  /**
   * Clean up on projectId change or unmount
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (stillWorkingTimeoutRef.current) {
        window.clearTimeout(stillWorkingTimeoutRef.current);
      }
    };
  }, [projectId]);

  /**
   * Load initial message history
   */
  const loadInitial = useCallback(async () => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setIsLoadingInitial(true);
    setErrorBanner(null);

    try {
      const response = await fetchJson<MessageListResponse>(
        `/api/projects/${projectId}/messages?limit=20`,
        { signal: abortControllerRef.current.signal }
      );

      const messageVMs = response.data.map(toMessageVM);
      // Messages come in reverse chronological order, reverse for display
      setMessages(messageVMs.reverse());
      setHasMoreOlder(response.pagination.page < response.pagination.total_pages);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return; // Ignore aborted requests
      }

      if (error instanceof ApiError) {
        if (error.statusCode === 401) {
          handleApiError(error, `/projects/${projectId}/chat`);
          return;
        }
        if (error.statusCode === 403) {
          window.location.href = '/projects';
          return;
        }
        if (error.statusCode === 404) {
          setErrorBanner({
            message: 'Project not found.',
            isRetryable: false,
          });
          return;
        }
      }

      setErrorBanner({
        message: handleApiError(error),
        isRetryable: true,
        retryLabel: 'Retry',
      });
    } finally {
      setIsLoadingInitial(false);
    }
  }, [projectId]);

  /**
   * Load older messages (pagination)
   */
  const loadOlder = useCallback(async () => {
    if (isLoadingOlder || messages.length === 0) return;

    const oldestMessage = messages[0];
    if (!oldestMessage) return;

    setIsLoadingOlder(true);

    try {
      const response = await fetchJson<MessageListResponse>(
        `/api/projects/${projectId}/messages?before=${oldestMessage.created_at}&limit=20`
      );

      const messageVMs = response.data.map(toMessageVM);
      // Prepend older messages
      setMessages((prev) => [...messageVMs.reverse(), ...prev]);
      setHasMoreOlder(response.pagination.page < response.pagination.total_pages);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.statusCode === 401) {
          handleApiError(error, `/projects/${projectId}/chat`);
          return;
        }
      }
      setErrorBanner({
        message: handleApiError(error),
        isRetryable: true,
        retryLabel: 'Retry loading older messages',
      });
    } finally {
      setIsLoadingOlder(false);
    }
  }, [projectId, isLoadingOlder, messages]);

  /**
   * Send a message
   */
  const sendMessage = useCallback(async () => {
    const content = draft.trim();
    if (!content || isSending) return;

    // Validate length
    if (content.length > MAX_MESSAGE_LENGTH) {
      setErrorBanner({
        message: `Message too long. Maximum ${MAX_MESSAGE_LENGTH} characters.`,
        isRetryable: false,
      });
      return;
    }

    setIsSending(true);
    setErrorBanner(null);
    lastSentContentRef.current = content;

    // Create optimistic user message
    const tempUserId = `temp-user-${Date.now()}`;
    const userMessage: ChatMessageVM = {
      id: tempUserId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      status: 'pending',
    };

    // Create pending assistant placeholder
    const tempAssistantId = `temp-assistant-${Date.now()}`;
    const assistantPlaceholder: ChatMessageVM = {
      id: tempAssistantId,
      role: 'assistant',
      content: 'Thinking…',
      created_at: new Date().toISOString(),
      status: 'pending',
    };

    // Add messages optimistically
    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setPendingAssistantId(tempAssistantId);
    setDraft('');
    setShowStillWorking(false);

    // Start "Still working..." timeout
    stillWorkingTimeoutRef.current = window.setTimeout(() => {
      setShowStillWorking(true);
    }, STILL_WORKING_DELAY_MS);

    try {
      const request: ChatRequest = { content };
      const response = await fetchJson<ChatResponse>(
        `/api/projects/${projectId}/chat`,
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      );

      // Clear timeout
      if (stillWorkingTimeoutRef.current) {
        window.clearTimeout(stillWorkingTimeoutRef.current);
        stillWorkingTimeoutRef.current = null;
      }

      // Replace placeholders with real messages
      const realAssistantMessage = chatResponseToVM(response);
      setMessages((prev) => {
        return prev.map((msg) => {
          if (msg.id === tempUserId) {
            return { ...msg, status: 'sent' };
          }
          if (msg.id === tempAssistantId) {
            return realAssistantMessage;
          }
          return msg;
        });
      });

      setPendingAssistantId(null);
      lastSentContentRef.current = null;
    } catch (error) {
      // Clear timeout
      if (stillWorkingTimeoutRef.current) {
        window.clearTimeout(stillWorkingTimeoutRef.current);
        stillWorkingTimeoutRef.current = null;
      }

      if (error instanceof ApiError) {
        if (error.statusCode === 401) {
          handleApiError(error, `/projects/${projectId}/chat`);
          return;
        }

        // Handle rate limiting
        if (error.statusCode === 429) {
          setErrorBanner({
            message: 'Too many requests. Please wait a moment.',
            isRetryable: true,
            retryLabel: 'Retry',
          });
        } else if (error.statusCode === 503) {
          setErrorBanner({
            message: 'Assistant unavailable. Please try again.',
            isRetryable: true,
            retryLabel: 'Retry',
          });
        } else {
          setErrorBanner({
            message: handleApiError(error),
            isRetryable: true,
            retryLabel: 'Retry',
          });
        }
      } else {
        setErrorBanner({
          message:
            error instanceof Error
              ? error.message
              : 'Failed to send message. Please try again.',
          isRetryable: true,
          retryLabel: 'Retry',
        });
      }

      // Mark messages as failed
      setMessages((prev) => {
        return prev.map((msg) => {
          if (msg.id === tempUserId || msg.id === tempAssistantId) {
            return { ...msg, status: 'failed' };
          }
          return msg;
        });
      });

      // Remove failed assistant placeholder
      setMessages((prev) => prev.filter((msg) => msg.id !== tempAssistantId));
      setPendingAssistantId(null);
    } finally {
      setIsSending(false);
      setShowStillWorking(false);
    }
  }, [draft, isSending, projectId]);

  /**
   * Retry last failed send
   */
  const retryLastSend = useCallback(async () => {
    if (!lastSentContentRef.current) return;

    // Remove failed user message
    setMessages((prev) => prev.filter((msg) => msg.status !== 'failed'));

    // Restore draft and send
    setDraft(lastSentContentRef.current);

    // Need to wait for state update before sending
    // We'll use the sendMessage with the content directly
    const content = lastSentContentRef.current;
    lastSentContentRef.current = null;

    // Send immediately
    setIsSending(true);
    setErrorBanner(null);
    lastSentContentRef.current = content;

    // Create optimistic user message
    const tempUserId = `temp-user-${Date.now()}`;
    const userMessage: ChatMessageVM = {
      id: tempUserId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
      status: 'pending',
    };

    // Create pending assistant placeholder
    const tempAssistantId = `temp-assistant-${Date.now()}`;
    const assistantPlaceholder: ChatMessageVM = {
      id: tempAssistantId,
      role: 'assistant',
      content: 'Thinking…',
      created_at: new Date().toISOString(),
      status: 'pending',
    };

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setPendingAssistantId(tempAssistantId);
    setDraft('');
    setShowStillWorking(false);

    stillWorkingTimeoutRef.current = window.setTimeout(() => {
      setShowStillWorking(true);
    }, STILL_WORKING_DELAY_MS);

    try {
      const request: ChatRequest = { content };
      const response = await fetchJson<ChatResponse>(
        `/api/projects/${projectId}/chat`,
        {
          method: 'POST',
          body: JSON.stringify(request),
        }
      );

      if (stillWorkingTimeoutRef.current) {
        window.clearTimeout(stillWorkingTimeoutRef.current);
        stillWorkingTimeoutRef.current = null;
      }

      const realAssistantMessage = chatResponseToVM(response);
      setMessages((prev) => {
        return prev.map((msg) => {
          if (msg.id === tempUserId) {
            return { ...msg, status: 'sent' };
          }
          if (msg.id === tempAssistantId) {
            return realAssistantMessage;
          }
          return msg;
        });
      });

      setPendingAssistantId(null);
      lastSentContentRef.current = null;
    } catch (error) {
      if (stillWorkingTimeoutRef.current) {
        window.clearTimeout(stillWorkingTimeoutRef.current);
        stillWorkingTimeoutRef.current = null;
      }

      if (error instanceof ApiError && error.statusCode === 401) {
        handleApiError(error, `/projects/${projectId}/chat`);
        return;
      }

      setErrorBanner({
        message: handleApiError(error),
        isRetryable: true,
        retryLabel: 'Retry',
      });

      setMessages((prev) => {
        return prev.map((msg) => {
          if (msg.id === tempUserId) {
            return { ...msg, status: 'failed' };
          }
          return msg;
        });
      });

      setMessages((prev) => prev.filter((msg) => msg.id !== tempAssistantId));
      setPendingAssistantId(null);
    } finally {
      setIsSending(false);
      setShowStillWorking(false);
    }
  }, [projectId]);

  /**
   * Submit CSAT rating for a message
   */
  const submitCsat = useCallback(
    async (messageId: string, rating: 1 | 2 | 3 | 4 | 5) => {
      // Find the message to update
      const message = messages.find((m) => m.id === messageId);
      if (!message || message.role !== 'assistant') return;

      // Optimistically update the rating
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, csat_rating: rating } : msg
        )
      );

      try {
        const request: MessageFeedbackRequest = { csat_rating: rating };
        await fetchJson<MessageFeedbackResponse>(
          `/api/projects/${projectId}/messages/${messageId}/feedback`,
          {
            method: 'POST',
            body: JSON.stringify(request),
          }
        );
      } catch (error) {
        // Revert on failure
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, csat_rating: message.csat_rating }
              : msg
          )
        );

        if (error instanceof ApiError && error.statusCode === 401) {
          handleApiError(error, `/projects/${projectId}/chat`);
          return;
        }

        setErrorBanner({
          message: 'Failed to save rating. Please try again.',
          isRetryable: false,
        });
      }
    },
    [projectId, messages]
  );

  /**
   * Clear error banner
   */
  const clearError = useCallback(() => {
    setErrorBanner(null);
  }, []);

  // Load initial messages on mount
  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  return {
    messages,
    draft,
    isLoadingInitial,
    isLoadingOlder,
    isSending,
    hasMoreOlder,
    errorBanner,
    pendingAssistantId,
    showStillWorking,
    loadInitial,
    loadOlder,
    setDraft,
    sendMessage,
    retryLastSend,
    submitCsat,
    clearError,
  };
}
