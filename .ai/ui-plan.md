# UI Architecture for HomeBuild AI Assistant (MVP)

## 1. UI Structure Overview

HomeBuild AI Assistant is a **project-scoped** web application: users must select (or create) an active project before accessing core features (Chat, Project Files, Project Facts). The UI is organized into:

- **Global (account-scoped) area**: authentication, profile/preferences, and project selection/creation.
- **Per-project shell**: persistent navigation + project context (name/location/phase) + core feature views.

This architecture is designed to:

- **Match product scope**: responsive web chat with saved project progress, document upload for OCR/RAG, and project memory display.
- **Align with API capabilities (2.1–2.5)**: profile endpoints, project CRUD, memory retrieval/audit, document upload + chunk browsing + semantic search, and chat + CSAT feedback.
- **Meet UX constraints**: tolerate up to ~10s chat latency with strong pending/error/retry states; handle multi-step uploads with expirations and processing states.
- **Support accessibility and security**: keyboard navigable, focus-managed flows; consistent handling of 401/403/404 across project-scoped routes.

### Key requirements extracted from the PRD

- **Web-based chat interface**: responsive web UI with Supabase auth to save progress.
- **Project memory (RAG)**: structured project facts (JSONB) + document chunk retrieval (vector search) used by agents.
- **Iterative, phase-aware guidance**: guide the user through construction phases without forcing strict linearity.
- **Document/photo upload**: upload files for OCR/text extraction and retrieval; UI must allow listing files and browsing extracted chunks.
- **Latency tolerance**: up to **10 seconds** is acceptable; UX must support “waiting” states.
- **CSAT collection**: collect “helpfulness” feedback inline in chat (API supports 1–5 rating).

### API surface (2.1–2.5) the UI must be compatible with

- **Profiles**
  - `GET /api/profiles/me`: load user preferences for UI defaults.
  - `PUT /api/profiles/me`: update user preferences (units, language, name).
- **Projects**
  - `GET /api/projects`: list/select projects (supports pagination, phase filter, include_deleted).
  - `POST /api/projects`: create project (name required; optional location and phase).
  - `GET /api/projects/{project_id}`: fetch project details (incl. message_count/document_count).
  - `PUT /api/projects/{project_id}`: update name/location/current_phase.
  - `DELETE /api/projects/{project_id}`: soft delete.
- **Project memory**
  - `GET /api/projects/{project_id}/memory`: read structured facts (user-facing read-only).
  - `GET /api/projects/{project_id}/memory/audit`: show audit trail (optional transparency UI).
  - `PATCH /api/projects/{project_id}/memory`: exists but **not used directly by users** in MVP UX (agents update memory).
- **Documents**
  - `GET /api/projects/{project_id}/documents`: list documents + processing_state; filter/paginate.
  - `POST /api/projects/{project_id}/documents`: create document + get `upload_url` (15 min expiry).
  - `POST /api/projects/{project_id}/documents/{document_id}/confirm`: confirm upload; handles `410 Gone`.
  - `GET /api/projects/{project_id}/documents/{document_id}`: poll processing state.
  - `GET /api/projects/{project_id}/documents/{document_id}/chunks`: browse extracted chunk text.
  - `POST /api/projects/{project_id}/documents/search`: semantic search across chunks with traceability.
  - `DELETE /api/projects/{project_id}/documents/{document_id}`: soft delete.
- **Chat / messages**
  - `GET /api/projects/{project_id}/messages`: load history (supports page/limit and before/after timestamps).
  - `POST /api/projects/{project_id}/chat`: send user message and receive assistant response (may return routing_metadata).
  - `POST /api/projects/{project_id}/messages/{message_id}/feedback`: submit CSAT for assistant messages only.

### Derived MVP user stories (PRD does not list them explicitly)

- As a user, I can **sign in** so my project context is saved.
- As a user, I can **create and select a project** to scope guidance to my build.
- As a user, I can **chat** with the assistant and get guidance within acceptable latency.
- As a user, I can **upload documents/photos**, see processing progress, and browse extracted text.
- As a user, I can **search within project documents** to find relevant information and trace it back to the source.
- As a user, I can **review project facts** the system has learned (read-only), and request corrections via chat.
- As a user, I can **update my project phase** as my build progresses.
- As a user, I can provide **CSAT feedback** on assistant responses.

### Requirement → UI element mapping (explicit)

- **Project-scoped experience required** → Project selection gate; per-project shell; project_id embedded in all core routes.
- **Iterative guidance with phase awareness** → Global phase badge + “Change phase” control in project header and/or settings.
- **10s latency acceptable** → Chat optimistic send, “assistant thinking” placeholder, timeout/retry UI, offline handling.
- **Document upload + OCR pipeline** → Two-step upload wizard with presigned URL expiry messaging; document processing status + polling.
- **RAG document chunk browsing** → Document detail view with chunk pagination and “jump to chunk” navigation.
- **Semantic search with traceability** → Search results show snippet + document name + chunk index/page metadata; deep link to source chunk.
- **CSAT measurement** → Inline feedback controls on assistant messages; confirmation/error state after submission.

## 2. View List

> Paths below are expressed as route patterns; the actual implementation can be Astro routes + client-side islands, but the architectural contract is the same.

### A) Global (not project-scoped) views

- **Auth: Sign in / Sign up**
  - **View path**: `/login`, `/signup` (or unified `/auth`)
  - **Main purpose**: start authenticated session; handle session expiry recovery.
  - **Key information to display**: auth status, error messages, “return to where you left off”.
  - **Key view components**
    - Auth form(s), password reset entrypoint (if available), “continue” CTA.
    - Post-auth redirect logic to `/projects` if no active project.
  - **UX, accessibility, security considerations**
    - **Security**: never show API error details that leak internals; treat `401` as “session expired”.
    - **A11y**: labeled fields, error summary region with focus, keyboard-first submission.

- **Project list / selection (first post-login step)**
  - **View path**: `/projects`
  - **Main purpose**: select active project; create new project; optionally manage (rename/delete).
  - **Key information to display**
    - List of projects: name, location, current_phase, updated_at (and deleted_at if included).
    - Filters: phase filter, search by name (client-side) if needed.
    - Pagination controls (page/limit).
  - **Key view components**
    - Projects table/cards with “Open” action.
    - “Create project” dialog or dedicated route.
    - Optional “Show archived” toggle (maps to `include_deleted=true`) with clear warning that restore is not supported in 2.1–2.5.
  - **UX, accessibility, security considerations**
    - **Security**: on `403` from any project-scoped view, route back here with explanation.
    - **A11y**: table semantics on desktop; cards with headings/landmarks on mobile; keyboard actionable rows.

- **Create project**
  - **View path**: `/projects/new` (or modal from `/projects`)
  - **Main purpose**: create a new project with minimal friction.
  - **Key information to display**: required name; optional location; optional initial phase (default LAND_SELECTION).
  - **Key view components**
    - Form: name (required), location, phase selector.
    - Inline validation and API error mapping (400/422).
  - **UX, accessibility, security considerations**
    - **A11y**: error summary + per-field errors; focus first invalid field.
    - **Security**: avoid persisting partial sensitive data locally; rely on server validation.

- **Account settings (profile preferences)**
  - **View path**: `/settings/account`
  - **Main purpose**: edit user preferences used across the product.
  - **Key information to display**: full_name, preferred_units, language.
  - **Key view components**: settings form (GET + PUT `/api/profiles/me`), save state, success toast.
  - **UX, accessibility, security considerations**
    - **Security**: handle `404 profile missing` with a guided recovery message (“profile not found; please contact support or re-auth”).
    - **A11y**: form semantics; status messages announced.

### B) Project-scoped shell and views (active project required)

- **Project shell (layout wrapper)**
  - **View path**: `/projects/:projectId/*`
  - **Main purpose**: provide consistent navigation and project context to all project features.
  - **Key information to display**
    - Project name + location (if present).
    - Current phase badge (globally visible).
    - Global status area for auth/session errors and project loading.
  - **Key view components**
    - Responsive navigation (sidebar on desktop, bottom nav or drawer on mobile).
    - Project switcher (opens `/projects`).
    - Phase badge + lightweight “Change” control (writes via `PUT /api/projects/{project_id}`).
  - **UX, accessibility, security considerations**
    - **A11y**: skip-to-content; nav landmarks; roving tab index for nav items; focus trap for drawers.
    - **Security**: consistent handling of `401/403/404` across all child routes.

- **Project Chat**
  - **View path**: `/projects/:projectId/chat`
  - **Main purpose**: primary interaction for guidance and memory updates (via agents).
  - **Key information to display**
    - Message timeline (user + assistant), timestamps.
    - Assistant “thinking” state; error states; retry affordances.
    - Optional message metadata (agent_id; optionally routing confidence) in a collapsible “Details” area.
  - **Key view components**
    - Message list with grouping and virtualized rendering (optional for MVP; at least incremental rendering).
    - Composer: multiline input, send button, attachments shortcut linking to Project Files (not required for chat send).
    - History loader: “Load older messages” (uses `before` timestamp) and initial load of latest page.
    - CSAT controls on assistant messages (submits `csat_rating` 1–5).
    - Retry patterns:
      - resend last user message (guard against duplicates)
      - re-request assistant response if applicable (same user content).
  - **UX, accessibility, security considerations**
    - **Optimistic UX**: append user message immediately; show pending assistant placeholder; disable duplicate sends while pending.
    - **Latency handling**: visual timer/progress hint after ~3–5s; explicit “Still working…” message; safe cancel (client-side) without corrupting history.
    - **A11y**: ensure screen readers announce new messages; maintain input focus after send; keyboard shortcuts (Enter to send, Shift+Enter newline).
    - **Security**: on `503`, show “service unavailable” and retry; on `401`, prompt re-auth and resume draft.

- **Project Files (document list + upload + processing)**
  - **View path**: `/projects/:projectId/files`
  - **Main purpose**: upload documents/photos, track processing, browse, search, and manage documents.
  - **Key information to display**
    - Document list: name, file_type, created_at, processing_state, chunk_count, error_message (if failed).
    - Filters: processing_state, file_type; pagination.
    - Upload constraints: supported types and size limit (10MB).
  - **Key view components**
    - Upload entrypoint (“Upload files”) launching a step-based flow:
      1) Create document record (`POST /documents`) and receive `upload_url` + expiry
      2) Direct upload to `upload_url` (client-managed)
      3) Confirm (`POST /confirm`)
      4) Processing monitor with polling (`GET /documents/{id}`) until terminal state.
    - Document list with row actions: open details, delete (soft).
    - Project-wide semantic search panel (see next view) optionally embedded here as a tab.
  - **UX, accessibility, security considerations**
    - **Upload expiry**: if confirm returns `410 Gone`, clearly explain expiry and offer “Start upload again” (recreate document).
    - **Processing states**: show distinct badges and guidance per state; allow user to leave and come back (polling resumes).
    - **A11y**: file input labeled; progress bars with ARIA; error summaries for failed uploads.
    - **Security**: never expose raw presigned URLs in logs/UI beyond immediate upload step; treat delete as reversible only if API adds restore later.

- **Document detail (metadata + chunk browsing)**
  - **View path**: `/projects/:projectId/files/:documentId`
  - **Main purpose**: inspect a specific document and browse extracted content chunks.
  - **Key information to display**
    - Document metadata: name, type, created_at, processing_state, chunk_count, error_message.
    - Chunk list: chunk_index, content snippet, page_number/category metadata.
  - **Key view components**
    - Status header with actions: delete, back to list.
    - Processing monitor (poll if not COMPLETED).
    - Chunk browser with pagination; open chunk for full text; “copy chunk text”; “link to chunk”.
  - **UX, accessibility, security considerations**
    - **Traceability**: keep chunk index + page metadata visible; deep links to specific chunks for referencing in chat.
    - **A11y**: chunk list as accessible list/table; expand/collapse with proper aria-controls.

- **Project document semantic search**
  - **View path**: `/projects/:projectId/files/search` (or embedded in `/files`)
  - **Main purpose**: quickly find relevant facts across all uploaded documents.
  - **Key information to display**
    - Search query + result count.
    - Results with similarity score (optional), document name, chunk index, metadata (page), snippet.
  - **Key view components**
    - Search form with optional advanced controls: limit (1–20), threshold (0–1).
    - Results list with actions: “Open document”, “Jump to chunk”.
  - **UX, accessibility, security considerations**
    - **A11y**: results announced; keyboard navigable list; highlighted query terms without relying only on color.
    - **Security**: treat `404` as project not found; avoid revealing cross-project content.

- **Project Facts (read-only memory)**
  - **View path**: `/projects/:projectId/facts`
  - **Main purpose**: display structured project memory so users understand what the system “knows”.
  - **Key information to display**
    - Memory domains (FINANCE, PERMITTING, etc.) and key facts.
    - Last updated timestamp.
    - Optional audit timeline (who/what changed, if agent_id + summary exists).
  - **Key view components**
    - Domain accordion/cards; empty-state guidance (“No facts captured yet; ask in Chat”).
    - “Suggest correction” action that opens a guided prompt to Chat (no direct editing).
    - Optional “Audit” panel (pagination) using `/memory/audit`.
  - **UX, accessibility, security considerations**
    - **Expectation setting**: label as “read-only”; explain facts are maintained by the assistant.
    - **A11y**: accordion with correct semantics; copyable values; consistent headings.
    - **Security**: handle `403` by routing to project list; avoid exposing internal schema validation details on `422`.

- **Project Settings**
  - **View path**: `/projects/:projectId/settings`
  - **Main purpose**: manage project metadata and lifecycle.
  - **Key information to display**: name, location, current_phase; delete status.
  - **Key view components**
    - Editable form (PUT `/api/projects/{project_id}`).
    - Phase selector (same control surfaced in header for quick updates).
    - Delete project action (soft delete) with confirmation dialog.
  - **UX, accessibility, security considerations**
    - **Destructive actions**: confirm dialog with explicit project name; show that delete is soft.
    - **No restore in 2.1–2.5**: communicate limitation; optionally allow “view archived” on projects list only.

- **Error / recovery views**
  - **View path**: `/403`, `/404`, `/offline` (or inline banners within shell)
  - **Main purpose**: consistent recovery for auth/authorization/not-found and connectivity.
  - **Key information to display**: what happened, what the user can do next, primary CTA.
  - **Key view components**
    - 401 recovery: “Session expired → Sign in again → return to previous route”.
    - 403 recovery: “Access denied → Back to projects”.
    - 404 recovery: “Project/document not found → Back to projects/files”.
  - **UX, accessibility, security considerations**
    - **A11y**: clear headings and actions; focus on page load; avoid ambiguous language.
    - **Security**: do not indicate whether a forbidden resource exists; treat 403 and 404 carefully.

## 3. User Journey Map

### Primary journey: get guidance using project context (main use case)

1) **Authenticate** (`/login`)
   - User signs in (Supabase).
   - On session valid, route to project selection.

2) **Select or create a project** (`/projects`)
   - User chooses existing project (GET `/api/projects`), or creates a new one (POST `/api/projects`).

3) **Enter the project shell** (`/projects/:projectId/chat`)
   - Shell loads project context (GET `/api/projects/{project_id}`) and displays phase badge.
   - Chat view loads recent messages (GET `/messages` latest page).

4) **Ask a question**
   - User sends message (optimistic render).
   - UI calls POST `/chat` and shows pending assistant state (up to ~10s).
   - On success: assistant message appears; optional “Details” reveals agent_id/routing confidence if enabled.

5) **Provide CSAT**
   - User rates the assistant message inline (POST `/messages/{message_id}/feedback`).
   - UI confirms submission and prevents duplicate rating (or allows update if product decides; API supports overwriting via POST returning updated_at).

6) **Update phase (non-linear)**
   - User updates phase via header control or Project Settings (PUT `/projects/{project_id}`).
   - UI updates global phase badge immediately after success and reflects in project list.

### Supporting journey: upload a document and use it in guidance

1) Navigate to **Project Files** (`/projects/:projectId/files`)
2) Start upload flow:
   - Create document record (POST `/documents`) → receive `upload_url` and expiry.
   - Upload file to `upload_url`.
   - Confirm (POST `/confirm`).
3) Monitor processing:
   - Poll (GET `/documents/{document_id}`) until COMPLETED/FAILED.
4) Browse chunks:
   - Open document detail → list/paginate chunks (GET `/chunks`).
5) Search across documents:
   - Run semantic search (POST `/documents/search`) → open result’s document and jump to chunk.
6) Use in Chat:
   - User references findings; assistant can incorporate into memory (agent side effect).

### Supporting journey: review and correct project facts

1) Navigate to **Project Facts** (`/projects/:projectId/facts`) → GET `/memory`.
2) Review domains and facts; optionally inspect audit timeline → GET `/memory/audit`.
3) If a fact is wrong: click **Suggest correction** → pre-fills a structured prompt and routes user to Chat.

## 4. Layout and Navigation Structure

### Global navigation (outside a project)

- Unauthenticated: `/login`, `/signup`.
- Authenticated, no active project: land on `/projects`.
- Global header (optional) includes “Account settings” (`/settings/account`) and sign out.

### Per-project navigation (inside project shell)

Primary destinations (persistent, responsive):

- **Chat**: `/projects/:projectId/chat`
- **Project Files**: `/projects/:projectId/files`
- **Project Facts**: `/projects/:projectId/facts`
- **Settings**: `/projects/:projectId/settings`

Shell behaviors:

- **Project switcher** always available → `/projects`.
- **Phase badge** always visible; quick update control triggers PUT `/projects/:projectId`.
- **Responsive layout**
  - Desktop: left sidebar + content.
  - Mobile: bottom navigation or top bar + drawer; chat composer always reachable.
- **Route guards**
  - If no active projectId in route, redirect to `/projects`.
  - Standardized error routing:
    - `401` → auth recovery flow (re-auth + return).
    - `403` → return to `/projects` with “no access”.
    - `404` → contextual not-found; offer “Back to projects” and “Back to files/chat” where applicable.

## 5. Key Components

- **AppShell / ProjectShell**
  - Responsible for route guarding, loading project context, and rendering responsive navigation.

- **PhaseBadge + PhasePicker**
  - Global indicator and lightweight editor for `current_phase`, available in shell header and Project Settings.

- **ApiErrorBanner / ErrorBoundary**
  - Standardized mapping of API errors (401/403/404/409/410/413/422/503) into user-facing actions.

- **ChatThread**
  - Message list with incremental history loading, optimistic send states, and “assistant thinking / retry” states.

- **ChatComposer**
  - Input with accessible controls and draft persistence (optional) across route transitions.

- **CsatControl**
  - Inline feedback widget rendered only for assistant messages; submits rating and shows confirmation/error.

- **DocumentUploader (step flow)**
  - Encapsulates create → direct upload → confirm; handles expiry (410) and resumable UX.

- **DocumentList + DocumentRow**
  - Paginated list with filters, state badges, and actions (open/delete).

- **DocumentProcessingStatus**
  - Polling-aware component that renders distinct UI for PENDING_UPLOAD/UPLOADED/PROCESSING/COMPLETED/FAILED.

- **ChunkBrowser**
  - Paginated chunk list + chunk detail with deep linking and traceability metadata.

- **SemanticSearchPanel**
  - Search form + results list that deep links into `DocumentDetail` at a specific chunk.

- **FactsViewer**
  - Read-only memory display with domain grouping; optional audit timeline viewer; “Suggest correction” deep link into Chat.
