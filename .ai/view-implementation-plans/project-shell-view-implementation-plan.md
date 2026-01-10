# View Implementation Plan: Project Shell (Layout Wrapper)

## 1. Overview
Project Shell is the persistent per-project layout used by all project-scoped routes. It loads project context (`GET /api/projects/{project_id}`), enforces route guards (auth + ownership), provides primary navigation (Chat/Files/Facts/Settings), and exposes a globally visible phase badge with a quick “Change phase” control.

## 2. View Routing
- **Route pattern**: `/projects/:projectId/*`
- **Children**:
  - `/projects/:projectId/chat`
  - `/projects/:projectId/files`
  - `/projects/:projectId/files/search`
  - `/projects/:projectId/files/:documentId`
  - `/projects/:projectId/facts`
  - `/projects/:projectId/settings`

## 3. Component Structure

Astro pages for each child route should reuse a common layout (`ProjectLayout.astro`) which mounts a React `ProjectShell` island (or renders the shell directly in Astro + islands inside content).

```
ProjectLayout.astro
├─ <ProjectShell client:load projectId="..." currentRoute="..." />
│  ├─ TopBar
│  │  ├─ ProjectTitle (name + location)
│  │  ├─ PhaseBadge
│  │  └─ ProjectSwitcherLink (/projects)
│  ├─ PrimaryNav (Chat/Files/Facts/Settings)
│  ├─ GlobalStatusRegion (auth/project loading/error)
│  └─ ContentSlot (child view renders here)
└─ ChildViewIsland (chat/files/etc) OR rendered as static shell slot content
```

## 4. Component Details

### `ProjectLayout.astro` (new layout)
- **Component description**: Wraps all project routes; extracts `projectId` from params; provides consistent structure.
- **Main elements**: `<header>`, `<nav>`, `<main>`.
- **Handled events**: none.
- **Validation conditions**: `projectId` must look like a UUID (client-side lightweight check).
- **Types**: none.
- **Props**:
  - `projectId: string` (from route params)

### `ProjectShell` (React)
- **Component description**: Loads project context, drives navigation UI, and provides quick phase update.
- **Main elements**:
  - Navigation landmark(s)
  - Phase badge + button to open phase picker
  - Global status banner area
  - Content container (children rendered by page)
- **Handled events**:
  - On mount: load project (`GET /api/projects/{project_id}`)
  - Nav click: route navigation via `<a href>` (Astro) or `window.location.assign`
  - Phase change: call `PUT /api/projects/{project_id}` with `{ current_phase }`
  - “Switch project”: navigate to `/projects`
- **Validation conditions (API-aligned)**
  - `current_phase` must be valid `ConstructionPhase`
  - Only allow phase update when project loaded and no phase update in-flight
- **Types (DTO + ViewModel)**
  - DTOs:
    - `ProjectDetailResponse`
    - `ProjectUpdateRequest`
    - `ConstructionPhase`
  - ViewModels:
    - `ProjectContextVM`:
      - `projectId: string`
      - `name: string`
      - `location: string | null`
      - `current_phase: ConstructionPhase`
      - `document_count: number`
      - `message_count: number`
      - `isLoading: boolean`
      - `error: ApiErrorVM | null`
      - `isUpdatingPhase: boolean`
- **Props**:
  - `projectId: string`
  - `activeNavKey: 'chat' | 'files' | 'facts' | 'settings'`

### `PhaseBadge` + `PhasePicker` (React, shared)
- **Component description**: Shows current phase and enables quick updates from any project view.
- **Main elements**: badge + button that opens popover/dialog with phase options.
- **Handled events**:
  - open/close picker
  - select phase
  - submit update
- **Validation**: only allow `ConstructionPhase` values.
- **Types**: `ConstructionPhase`, `ProjectUpdateRequest`.
- **Props**:
  - `value: ConstructionPhase`
  - `onChange: (phase: ConstructionPhase) => void`
  - `disabled?: boolean`

## 5. Types
New types recommended:
- `ProjectContextVM` (see above)
- `ApiErrorVM` (shared across all views):
  - `status?: number`
  - `code?: string`
  - `message: string`
  - `details?: { field?: string; reason?: string }`

## 6. State Management
- Keep project context in shell-level state so child views can reference it without refetching (optional for MVP, but recommended).
- Suggested custom hooks:
  - `useProject(projectId: string)`:
    - `project: ProjectDetailResponse | null`
    - `isLoading`, `error`
    - `refresh()`
  - `useUpdateProject(projectId: string)`:
    - `updateProject(patch: ProjectUpdateRequest): Promise<ProjectResponse>`

## 7. API Integration
- `GET /api/projects/{project_id}`
  - Response: `ProjectDetailResponse`
- `PUT /api/projects/{project_id}`
  - Request: `ProjectUpdateRequest`
  - Response: `ProjectResponse`
- Auth header: `Authorization: Bearer <supabase_access_token>`

## 8. User Interactions
- **Enter project route**: shell loads project context; shows loading/skeleton
- **Change phase**: user selects a phase; shell updates; badge updates after success
- **Navigate tabs**: user switches between Chat/Files/Facts/Settings
- **Switch project**: link to `/projects`

## 9. Conditions and Validation
- Route guard conditions:
  - No session → redirect to `/login?redirectTo=<current path>`
  - `403 FORBIDDEN` → redirect to `/projects` with “no access”
  - `404 NOT_FOUND` → route to `/404` (or show inline not-found with CTA)
- UUID validation (lightweight): if `projectId` clearly invalid, fail fast with not-found UI (avoid hitting API).

## 10. Error Handling
- `401`: session expired → redirect to login with return
- `403`: access denied → redirect to projects list
- `404`: project not found → `/404` or contextual error within shell
- `422` on update: should not happen if phase is enum-driven; show generic “Couldn’t update phase”
- `503/429`: show banner; keep previous phase until success

## 11. Implementation Steps
1. Create `src/layouts/ProjectLayout.astro` and update project routes to use it.
2. Implement `ProjectShell` React component that loads project details and renders nav + phase picker.
3. Implement `useProject` and `useUpdateProject` hooks using DTOs in `frontend/src/types/api.ts`.
4. Add centralized API error mapping and consistent redirects for 401/403/404.
5. Ensure a11y landmarks (skip-to-content, nav landmarks) in shell layout.
