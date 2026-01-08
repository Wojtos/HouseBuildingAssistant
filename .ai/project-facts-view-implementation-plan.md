# View Implementation Plan: Project Facts (Read-only Memory)

## 1. Overview
Project Facts displays the structured project memory (JSONB) in a user-friendly, read-only format. It helps users understand what the system “knows” about their project and provides a “Suggest correction” action that routes back to Chat (no direct editing in MVP). Optionally, it can show an audit trail timeline.

## 2. View Routing
- **View path**: `/projects/:projectId/facts`
- **Optional audit panel**: inline (tab/accordion) using `/memory/audit`
- **Suggest correction**: navigates to `/projects/:projectId/chat` with a prefilled prompt (via query param or local state)

## 3. Component Structure

```
ProjectFactsPage.astro
└─ (ProjectLayout.astro)
   └─ <ProjectFactsView client:load projectId="..." />
      ├─ FactsHeader
      │  ├─ Title
      │  └─ SuggestCorrectionButton
      ├─ FactsViewer
      │  ├─ DomainAccordion
      │  │  └─ DomainPanel (FINANCE, PERMITTING, ...)
      │  │     └─ KeyValueList / JSONViewer (fallback)
      │  └─ EmptyState
      ├─ (optional) AuditPanel
      │  ├─ AuditList
      │  └─ PaginationControls
      └─ ApiErrorBanner
```

## 4. Component Details

### `ProjectFactsPage.astro`
- **Component description**: Route shell for facts view.
- **Main elements**: content container.
- **Handled events**: none.
- **Types**: none.
- **Props**: none.

### `ProjectFactsView` (React)
- **Component description**: Loads memory and displays it grouped by top-level domain keys; optionally loads audit trail.
- **Main elements**:
  - accordion/cards for domains
  - “Suggest correction” CTA
  - optional audit section
- **Handled events**:
  - On mount: `GET /memory`
  - (Optional) load audit: `GET /memory/audit?page&limit`
  - Suggest correction: navigate to chat with prefilled message
- **Validation conditions**
  - None at form level (read-only), but must defensively handle unexpected JSON shapes.
- **Types (DTO + ViewModel)**
  - DTOs:
    - `ProjectMemoryResponse`
    - `ProjectMemoryData`
    - `MemoryAuditListParams`
    - `MemoryAuditListResponse`
    - `MemoryAuditItem`
  - ViewModels:
    - `FactsDomainVM`:
      - `domainKey: string` (e.g. "FINANCE")
      - `facts: unknown` (domain object)
      - `isEmpty: boolean`
    - `ProjectFactsVM`:
      - `memory: ProjectMemoryResponse | null`
      - `domains: FactsDomainVM[]`
      - `isLoading: boolean`
      - `error: ApiErrorVM | null`
      - `audit?: { data: MemoryAuditItem[]; pagination: PaginationInfo }`
      - `isLoadingAudit?: boolean`
- **Props**:
  - `projectId: string`

### `FactsViewer` (React)
- **Component description**: Renders memory domains with stable ordering and good empty states.
- **Main elements**:
  - accordion list
  - key/value rendering for objects; fallback JSON pretty print for unknown shapes
- **Handled events**: expand/collapse domain.
- **Validation**: none.
- **Types**: `FactsDomainVM`.
- **Props**:
  - `domains: FactsDomainVM[]`
  - `updatedAt: string | null`

### `SuggestCorrectionButton` (React)
- **Component description**: Builds a structured prompt and sends user to chat.
- **Main elements**: button/link.
- **Handled events**: click → navigate.
- **Validation**: none.
- **Types**: none.
- **Props**:
  - `projectId: string`
  - `memory?: ProjectMemoryResponse | null` (optional for prompt context)

## 5. Types
No new DTO types required; use `ProjectMemoryData` as flexible JSON.
Recommended view models:
- `FactsDomainVM`
- `ProjectFactsVM`

## 6. State Management
- Suggested hooks:
  - `useProjectMemory(projectId: string)`:
    - loads `GET /memory`
  - `useMemoryAudit(projectId: string, params)` (optional):
    - loads `GET /memory/audit`
- Domain extraction strategy:
  - `domains = Object.entries(memory.data).map(([key, value]) => ...)`
  - Ensure stable ordering: prefer known keys first (FINANCE, PERMITTING, ...) then alphabetical for unknown keys.

## 7. API Integration
- `GET /api/projects/{project_id}/memory`
  - Response: `ProjectMemoryResponse`
- Optional:
  - `GET /api/projects/{project_id}/memory/audit`
  - Request: `MemoryAuditListParams`
  - Response: `MemoryAuditListResponse`

## 8. User Interactions
- **View facts**: user expands domains and copies values.
- **Empty state**: if `data` is `{}` or has no meaningful domains, show guidance: “No facts captured yet — ask in Chat.”
- **Suggest correction**: navigates to chat with a prefilled message, e.g.:
  - “I think the PERMITTING.setbacks.front value is wrong. Please update it to …”

## 9. Conditions and Validation
- Treat memory as read-only in UI:
  - no inline edit controls
  - make it explicit with helper text
- Defensive rendering:
  - if a domain value is not an object, show it as a primitive or JSON string.

## 10. Error Handling
- `401`: redirect to login with return
- `403`: back to `/projects`
- `404`: project not found → not-found UI
- `422` should not occur for GET, but handle generically
- `503/429`: banner + retry

## 11. Implementation Steps
1. Add Astro route `src/pages/projects/[projectId]/facts.astro`.
2. Implement `ProjectFactsView` + `FactsViewer` accordion rendering.
3. Add `useProjectMemory` hook for `GET /memory`.
4. Implement “Suggest correction” deep link to chat (query param or local storage draft keyed by projectId).
5. (Optional) Add `AuditPanel` using `useMemoryAudit` hook with pagination.
