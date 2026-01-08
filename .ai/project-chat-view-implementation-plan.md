# View Implementation Plan: Project Chat

## 1. Overview
Project Chat is the primary user interaction surface. It shows message history, allows sending new messages, handles up to ~10s response latency with strong pending/retry states, and collects CSAT feedback (1–5) for assistant messages.

## 2. View Routing
- **View path**: `/projects/:projectId/chat`
- **Dependencies**: rendered inside Project Shell (`/projects/:projectId/*`)

## 3. Component Structure

```
ProjectChatPage.astro
└─ (ProjectLayout.astro)
   └─ <ProjectChatView client:load projectId="..." />
      ├─ ChatHeader (optional; may rely on shell)
      ├─ ChatThread
      │  ├─ MessageGroup (optional)
      │  ├─ MessageBubble (user)
      │  ├─ MessageBubble (assistant)
      │  │  ├─ MessageContent
      │  │  ├─ (optional) MessageDetails (agent_id, routing_metadata)
      │  │  └─ CsatControl
      │  ├─ PendingAssistantBubble
      │  └─ LoadOlderButton
      ├─ ChatComposer
      │  ├─ Textarea
      │  ├─ SendButton
      │  └─ HelperRow (Enter/Shift+Enter hints; link to Files)
      └─ ApiErrorBanner
```

## 4. Component Details

### `ProjectChatPage.astro`
- **Component description**: Route shell for chat view; uses project layout.
- **Main elements**: content container.
- **Handled events**: none.
- **Types**: none.
- **Props**: none.

### `ProjectChatView` (React)
- **Component description**: Loads initial message history, renders thread and composer, manages send lifecycle (optimistic user message + pending assistant placeholder), and handles CSAT submission.
- **Main elements**:
  - Scrollable message list region with `aria-live` updates for new messages
  - Composer anchored to bottom
- **Handled events**:
  - Initial load: `GET /messages` (latest page)
  - Load older: `GET /messages?before=<oldest.created_at>`
  - Send: `POST /chat`
  - CSAT: `POST /messages/{message_id}/feedback`
  - Retry:
    - resend last user message (guard against accidental duplicates)
    - retry chat request if assistant response failed
- **Validation conditions (per API plan)**
  - Outgoing message `content`:
    - required, non-empty after trim
    - max 4000 characters (client-enforce; show counter/inline message)
  - CSAT:
    - only for assistant messages
    - integer 1..5
- **Types (DTO + ViewModel)**
  - DTOs:
    - `MessageListParams`, `MessageListResponse`, `MessageItem`
    - `ChatRequest`, `ChatResponse`
    - `MessageFeedbackRequest`, `MessageFeedbackResponse`
    - `MessageRole`
  - ViewModels (recommended):
    - `ChatMessageVM`:
      - `id: string` (UUID for persisted messages; `temp-...` for optimistic user messages)
      - `role: 'user' | 'assistant'`
      - `content: string`
      - `created_at: string` (ISO)
      - `agent_id?: string | null`
      - `routing_metadata?: { confidence: number; reasoning: string } | null`
      - `csat_rating?: number | null`
      - `status?: 'sent' | 'pending' | 'failed'` (for optimistic/pending UI)
    - `ChatComposerVM`:
      - `draft: string`
      - `isSending: boolean`
      - `draftError?: string`
    - `ChatPaginationVM`:
      - `isLoadingInitial: boolean`
      - `isLoadingOlder: boolean`
      - `hasMoreOlder: boolean` (derived from pagination)
      - `oldestTimestamp?: string`
- **Props**:
  - `projectId: string`

### `ChatThread` (React)
- **Component description**: Renders message list and handles scroll management (stick-to-bottom behavior).
- **Main elements**: `<ol>` or `<div role="log">` with message items.
- **Handled events**:
  - On new message: auto-scroll if user is near bottom; otherwise show “New messages” indicator.
- **Validation**: none.
- **Types**: `ChatMessageVM`.
- **Props**:
  - `messages: ChatMessageVM[]`
  - `isLoading: boolean`
  - `onLoadOlder: () => void`
  - `canLoadOlder: boolean`

### `ChatComposer` (React)
- **Component description**: Textarea + send button with Enter/Shift+Enter behavior.
- **Main elements**:
  - `<textarea>`
  - Send `<button>`
  - optional character counter
- **Handled events**:
  - `onKeyDown`: Enter to send, Shift+Enter for newline
  - `onSubmit`: call send handler
- **Validation**:
  - disable send when draft is empty/whitespace or > 4000
- **Types**: `ChatComposerVM`.
- **Props**:
  - `draft: string`
  - `onDraftChange: (value: string) => void`
  - `onSend: () => void`
  - `isSending: boolean`
  - `draftError?: string`

### `CsatControl` (React)
- **Component description**: Inline rating control shown only on assistant messages.
- **Main elements**: 5-button rating group (1..5) with pressed state.
- **Handled events**:
  - click rating → submit feedback
- **Validation**:
  - must only render/submit for assistant messages
  - rating must be 1..5
- **Types**: `MessageFeedbackRequest`, `MessageFeedbackResponse`.
- **Props**:
  - `projectId: string`
  - `messageId: string`
  - `currentRating: number | null`
  - `onRated: (nextRating: number) => void` (optimistic update)

## 5. Types
Use existing DTOs from `frontend/src/types/api.ts` for API contracts.
Add view models:
- `ChatMessageVM`, `ChatComposerVM`, `ChatPaginationVM` (see above)

## 6. State Management
Recommended approach: a dedicated hook encapsulating chat lifecycle.
- `useProjectChat(projectId: string)`:
  - **State**:
    - `messages: ChatMessageVM[]`
    - `draft: string`
    - `isLoadingInitial`, `isLoadingOlder`
    - `isSending`
    - `errorBanner: ApiErrorVM | null`
    - `pendingAssistantId?: string` (for placeholder)
  - **Actions**:
    - `loadInitial()`
    - `loadOlder()`
    - `sendMessage()`
    - `retryLastSend()`
    - `submitCsat(messageId, rating)`
- Use `AbortController` to cancel in-flight history loads when projectId changes.

## 7. API Integration
- `GET /api/projects/{project_id}/messages`
  - Request type: `MessageListParams`
  - Response type: `MessageListResponse`
  - Notes:
    - Use `before=<oldest.created_at>` to load older history.
- `POST /api/projects/{project_id}/chat`
  - Request type: `ChatRequest`
  - Response type: `ChatResponse` (assistant message only)
  - Frontend action:
    - Optimistically append user message
    - Add pending assistant placeholder
    - On success, replace placeholder with `ChatResponse`
- `POST /api/projects/{project_id}/messages/{message_id}/feedback`
  - Request type: `MessageFeedbackRequest`
  - Response type: `MessageFeedbackResponse`

## 8. User Interactions
- **Send message**:
  - User message appears immediately.
  - Assistant placeholder appears (“Thinking…”).
  - After ~3–5s, optionally switch placeholder text to “Still working…” (no additional API call).
- **Retry**:
  - If `POST /chat` fails (network/503), show “Retry” action; keep draft or keep last sent content for resend.
- **Rate response**:
  - Clicking a rating submits; on success show “Saved”.
  - Prevent accidental double submit while in-flight.
- **Load older**:
  - “Load older messages” button loads previous page.

## 9. Conditions and Validation
- Disable send while `isSending` to prevent duplicates.
- Client-enforce max 4000 chars; show remaining count when near limit.
- Only display CSAT control for `role === 'assistant'`.
- Respect rate limits:
  - If `429`, disable send temporarily and show reset time if available.

## 10. Error Handling
- `401`: redirect to `/login?redirectTo=/projects/:projectId/chat`
- `403`: redirect to `/projects` (“You don’t have access to this project.”)
- `404`: show not-found recovery CTA (back to projects)
- `422`: if content too long, show inline composer error (should be prevented by UI)
- `503`: show banner “Assistant unavailable” with retry
- Network timeout/offline: show offline banner; keep draft in state (optional: persist in `localStorage` by `projectId`)

## 11. Implementation Steps
1. Add Astro route `src/pages/projects/[projectId]/chat.astro` using `ProjectLayout.astro`.
2. Implement `ProjectChatView`, `ChatThread`, `ChatComposer`, and `CsatControl`.
3. Implement `useProjectChat` hook and API calls using DTOs from `frontend/src/types/api.ts`.
4. Add optimistic send + pending assistant placeholder logic.
5. Add robust error mapping and redirects for 401/403/404, plus retry UX for 503/network.
6. Add a11y behaviors: focus retention, `aria-live` for new messages, keyboard send shortcuts.
