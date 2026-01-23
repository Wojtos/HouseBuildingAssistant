/**
 * ProjectChatView Component
 *
 * Main view for project chat. Loads initial message history, renders thread and composer,
 * manages send lifecycle (optimistic user message + pending assistant placeholder),
 * and handles CSAT submission.
 *
 * Enhanced with:
 * - UC-3: Fact extraction confirmation dialog
 * - Fact update notifications
 */

import { useCallback } from 'react';
import { ChatThread } from './ChatThread';
import { ChatComposer } from './ChatComposer';
import { FactConfirmationDialog } from './FactConfirmationDialog';
import { FactUpdateNotification } from './FactUpdateNotification';
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
    pendingFacts,
    isConfirmingFacts,
    lastStoredFactCount,
    lastUpdatedDomains,
    loadOlder,
    setDraft,
    sendMessage,
    retryLastSend,
    submitCsat,
    clearError,
    confirmFacts,
    dismissFacts,
    clearFactNotification,
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

      {/* Fact update notification (UC-3) */}
      {lastStoredFactCount !== null && lastStoredFactCount > 0 && (
        <div className="border-b border-green-100 px-4 py-3">
          <FactUpdateNotification
            storedCount={lastStoredFactCount}
            domains={lastUpdatedDomains}
            projectId={projectId}
            onDismiss={clearFactNotification}
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

      {/* Fact confirmation dialog (UC-3) */}
      {pendingFacts && pendingFacts.length > 0 && (
        <FactConfirmationDialog
          facts={pendingFacts}
          isOpen={true}
          isConfirming={isConfirmingFacts}
          onConfirm={confirmFacts}
          onClose={dismissFacts}
        />
      )}
    </div>
  );
}
