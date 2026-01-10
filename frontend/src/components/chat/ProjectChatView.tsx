/**
 * ProjectChatView Component
 *
 * Main view for project chat. Loads initial message history, renders thread and composer,
 * manages send lifecycle (optimistic user message + pending assistant placeholder),
 * and handles CSAT submission.
 */

import { useCallback } from 'react';
import { ChatThread } from './ChatThread';
import { ChatComposer } from './ChatComposer';
import { InlineErrorBanner } from '../InlineErrorBanner';
import { useProjectChat } from '../../hooks/useProjectChat';

interface ProjectChatViewProps {
  /** Project ID for the chat */
  projectId: string;
}

/**
 * ProjectChatView is the main container for the project chat interface
 */
export function ProjectChatView({ projectId }: ProjectChatViewProps) {
  const {
    messages,
    draft,
    isLoadingInitial,
    isLoadingOlder,
    isSending,
    hasMoreOlder,
    errorBanner,
    pendingAssistantId,
    showStillWorking,
    loadOlder,
    setDraft,
    sendMessage,
    retryLastSend,
    submitCsat,
    clearError,
  } = useProjectChat(projectId);

  /**
   * Handle CSAT submission
   */
  const handleCsatSubmit = useCallback(
    (messageId: string, rating: 1 | 2 | 3 | 4 | 5) => {
      submitCsat(messageId, rating);
    },
    [submitCsat]
  );

  /**
   * Handle retry action
   */
  const handleRetry = useCallback(() => {
    clearError();
    retryLastSend();
  }, [clearError, retryLastSend]);

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Error banner */}
      {errorBanner && (
        <div className="border-b border-red-100 px-4 py-3">
          <InlineErrorBanner
            message={errorBanner.message}
            actionLabel={errorBanner.isRetryable ? errorBanner.retryLabel : undefined}
            onAction={errorBanner.isRetryable ? handleRetry : undefined}
          />
        </div>
      )}

      {/* Chat thread */}
      <ChatThread
        messages={messages}
        isLoading={isLoadingInitial}
        onLoadOlder={loadOlder}
        canLoadOlder={hasMoreOlder}
        isLoadingOlder={isLoadingOlder}
        projectId={projectId}
        onCsatSubmit={handleCsatSubmit}
        pendingAssistantId={pendingAssistantId}
        showStillWorking={showStillWorking}
      />

      {/* Chat composer */}
      <ChatComposer
        draft={draft}
        onDraftChange={setDraft}
        onSend={sendMessage}
        isSending={isSending}
      />
    </div>
  );
}
