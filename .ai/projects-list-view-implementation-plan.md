# View Implementation Plan: Project List / Selection

## 1. Overview
The Project List view is the first post-login destination. It lists the user’s projects, supports pagination and basic filters, and is the entry point to open a project-scoped area (Chat/Files/Facts/Settings). It also provides access to project creation and optional “show archived” (soft-deleted) projects.

## 2. View Routing
- **View path**: `/projects`
- **Primary navigation targets**:
  - Open project: `/projects/:projectId/chat`
  - Create project: `/projects/new`
  - Account settings: `/settings/account`

## 3. Component Structure

```
ProjectsPage.astro
└─ <ProjectsListView client:load />
   ├─ PageHeader
   │  ├─ Title
   │  ├─ AccountSettingsLink
   │  └─ CreateProjectButton
   ├─ FiltersBar
   │  ├─ PhaseFilterSelect
   │  ├─ ShowArchivedToggle
   │  └─ (optional) SearchInput (client-side name filtering)
   ├─ ProjectsList
   │  ├─ ProjectCard | ProjectRow (responsive)
   │  └─ EmptyState
   ├─ PaginationControls
   └─ ApiErrorBanner
```

## 4. Component Details

### `ProjectsPage.astro`
- **Component description**: Route shell for `/projects`; mounts the interactive list view.
- **Main elements**: `<main>` container, layout wrapper.
- **Handled events**: none.
- **Validation conditions**: none.
- **Types**: none.
- **Props**: none.

### `ProjectsListView` (React)
- **Component description**: Fetches project list and renders filters, list, and pagination. Handles auth/session gating.
- **Main elements**:
  - Filters region
  - List region (table or cards)
  - Pagination footer
- **Handled events**:
  - Filter change: phase / include_deleted
  - Pagination change: page / limit
  - “Open” project: navigate to `/projects/${id}/chat`
  - “Create project”: navigate to `/projects/new`
- **Validation conditions (UI-level)**
  - `limit` must be within API max (<= 100). Default to 20.
  - `phase` must be a valid `ConstructionPhase` enum (use `isConstructionPhase` guard from `frontend/src/types/api.ts`).
- **Types (DTO + ViewModel)**
  - DTOs:
    - `ProjectListParams`
    - `ProjectListResponse`
    - `ProjectListItem`
    - `ConstructionPhase`
  - ViewModels:
    - `ProjectsQueryVM`:
      - `page: number`
      - `limit: number`
      - `phase: ConstructionPhase | 'ALL'`
      - `include_deleted: boolean`
      - `sort_by: 'created_at' | 'updated_at' | 'name'`
      - `sort_order: 'asc' | 'desc'`
    - `ProjectsListVM`:
      - `items: ProjectListItem[]`
      - `pagination: { page: number; limit: number; total_items: number; total_pages: number }`
      - `isLoading: boolean`
      - `error: { status?: number; code?: string; message: string } | null`
- **Props**: none (route-scoped)

### `FiltersBar` (React)
- **Component description**: Allows filtering list results (server-side via query params).
- **Main elements**: select, toggle, optional input.
- **Handled events**: `onChange` updates query state and resets `page` to 1.
- **Validation conditions**:
  - Phase option set must match `ConstructionPhase` constants + “All”.
- **Types**: `ConstructionPhase`, `ProjectsQueryVM`
- **Props**:
  - `query: ProjectsQueryVM`
  - `onChange: (next: ProjectsQueryVM) => void`

### `ProjectsList` (React)
- **Component description**: Renders projects as responsive cards (mobile) or a table (desktop).
- **Main elements**:
  - `<ul>` / `<table>`
  - per-row “Open” button/link
  - optional “Deleted” badge for archived items
- **Handled events**:
  - `onOpen(projectId)`
- **Validation**: none.
- **Types**: `ProjectListItem`
- **Props**:
  - `items: ProjectListItem[]`
  - `onOpen: (projectId: string) => void`

### `PaginationControls` (React, shared)
- **Component description**: Generic pagination controls.
- **Main elements**: previous/next buttons, current page indicator, optional page size select.
- **Handled events**: change page / change limit.
- **Validation conditions**:
  - Prevent navigation outside `[1..total_pages]`
- **Types**: `PaginationInfo`
- **Props**:
  - `page: number`
  - `totalPages: number`
  - `limit: number`
  - `onPageChange: (page: number) => void`
  - `onLimitChange?: (limit: number) => void`

## 5. Types
New types recommended for view clarity (in `frontend/src/types/viewModels.ts` or colocated):
- `ProjectsQueryVM` (see above)
- `ProjectsListVM` (see above)

## 6. State Management
- **Local state** in `ProjectsListView`:
  - `query: ProjectsQueryVM`
  - `data: ProjectListResponse | null`
  - `isLoading: boolean`
  - `error: ApiErrorVM | null`
- **Suggested custom hook**:
  - `useProjectsList(query: ProjectListParams)`:
    - Fetches `GET /api/projects`
    - Debounces client-side name search if added (optional)
    - Cancels stale requests via `AbortController`

## 7. API Integration
- Endpoint: `GET /api/projects`
- Request type: `ProjectListParams`
- Response type: `ProjectListResponse`
- Frontend action:
  - Build query string from `ProjectListParams` and call `fetchJson<ProjectListResponse>()`
  - Attach `Authorization: Bearer <supabase_access_token>` (from Supabase session)
- Error handling:
  - `401`: redirect to `/login?redirectTo=/projects`
  - `400`: show “Invalid filters” (should be prevented by UI)

## 8. User Interactions
- **Open project**: navigates to project chat route
- **Change phase filter**: reload list with server-side filter
- **Show archived toggle**: reload list with `include_deleted=true`; show “Archived projects can’t be restored in MVP” message
- **Pagination**: navigate pages; keep filters
- **Create project**: navigate to `/projects/new`

## 9. Conditions and Validation
- Only allow selecting phases from `ConstructionPhase` enum.
- Enforce `limit <= 100`; recommend limiting UI options (20/50/100).
- If `include_deleted=false`, do not render “deleted” projects even if returned (defensive).

## 10. Error Handling
- `401 UNAUTHORIZED`: treat as session expired; redirect to login with return.
- `503 SERVICE_UNAVAILABLE`: show banner and “Retry”.
- `429 RATE_LIMITED`: show “Too many requests; try again in X seconds” (use `X-RateLimit-Reset` header if available; otherwise generic).
- Empty list: show friendly empty state with CTA to create project.

## 11. Implementation Steps
1. Add Astro route `src/pages/projects/index.astro`.
2. Implement `ProjectsListView` React island and basic layout components.
3. Add `useProjectsList` hook and minimal API client helper (`fetchJson` + auth header).
4. Implement filters with strict enum options and pagination controls.
5. Add error banner mapping for 401/403/503/429 and a retry button.
