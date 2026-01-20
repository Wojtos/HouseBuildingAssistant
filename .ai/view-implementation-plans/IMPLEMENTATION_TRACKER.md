# View Implementation Tracker

This document tracks the order, status, and dependencies for implementing all view components in the HomeBuild AI Assistant MVP.

## Implementation Phases

### Phase 1: Foundation (Critical Path)
**Goal**: Enable user authentication and basic navigation infrastructure.

| # | View | Status | Dependencies | Priority | Notes |
|---|------|--------|--------------|----------|-------|
| 1 | **Auth** (Sign in / Sign up) | 🟢 Completed | None | **Critical** | Full implementation: login/signup pages, AuthForm, API endpoints, middleware, hooks |
| 2 | **Error Recovery** (403, 404, Offline) | 🟢 Completed | None | **Critical** | ErrorView component, 403/404/offline pages, safe returnTo validation, middleware integration |

### Phase 2: Project Management (Core)
**Goal**: Enable project creation and navigation.

| # | View | Status | Dependencies | Priority | Notes |
|---|------|--------|--------------|----------|-------|
| 3 | **Projects List** | 🟢 Completed | Auth (#1) | **Critical** | ProjectsListView with filters, pagination, empty state, responsive design |
| 4 | **Create Project** | 🟢 Completed | Auth (#1), Projects List (#3) | **Critical** | Needed before accessing project-scoped views |
| 5 | **Project Shell** (Layout Wrapper) | 🟢 Completed | Auth (#1), Projects List (#3) | **Critical** | ProjectShell with navigation, phase picker, ProjectLayout.astro |

### Phase 3: Core Features (MVP Critical)
**Goal**: Enable primary user interactions and document management.

| # | View | Status | Dependencies | Priority | Notes |
|---|------|--------|--------------|----------|-------|
| 6 | **Project Chat** | 🟢 Completed | Project Shell (#5) | **Critical** | Primary user interaction surface |
| 7 | **Project Files** (Document List + Upload) | 🟢 Completed | Project Shell (#5) | **Critical** | ProjectFilesView, DocumentUploader, useDocumentsList/useDocumentUpload/useDeleteDocument hooks |
| 8 | **Document Detail** | 🟢 Completed | Project Shell (#5), Project Files (#7) | **High** | DocumentDetailView with chunk browser, polling, deep links, useDocument/useDocumentChunks hooks |

### Phase 4: Enhanced Features
**Goal**: Add advanced functionality for better user experience.

| # | View | Status | Dependencies | Priority | Notes |
|---|------|--------|--------------|----------|-------|
| 9 | **Document Search** (Semantic Search) | 🟢 Completed | Project Shell (#5), Project Files (#7) | **High** | DocumentSearchView with SearchResultCard, useDocumentSearch hook, advanced options |
| 10 | **Project Facts** (Memory Viewer) | 🟢 Completed | Project Shell (#5) | **High** | ProjectFactsView, FactsViewer accordion, useProjectMemory hook, SuggestCorrectionButton |
| 11 | **Project Settings** | 🟢 Completed | Project Shell (#5) | **Medium** | ProjectSettingsView, DangerZone, useDeleteProject hook, form validation |

### Phase 5: Polish
**Goal**: User account management and preferences.

| # | View | Status | Dependencies | Priority | Notes |
|---|------|--------|--------------|----------|-------|
| 12 | **Account Settings** | 🟢 Completed | Auth (#1) | **Medium** | AccountSettingsView with profile form, useProfile hook, validation, dirty state tracking |

---

## Status Legend

- 🔴 **Not Started** - Planning/design phase, not yet implemented
- 🟡 **In Progress** - Currently being implemented
- 🟢 **Completed** - Implementation finished and tested
- ⚠️ **Blocked** - Waiting on dependencies or external factors
- 🔵 **On Hold** - Temporarily paused

---

## Dependency Graph

```
Auth (#1)
├── Error Recovery (#2)
├── Projects List (#3)
│   ├── Create Project (#4)
│   └── Project Shell (#5)
│       ├── Project Chat (#6)
│       ├── Project Files (#7)
│       │   └── Document Detail (#8)
│       │       └── Document Search (#9)
│       ├── Project Facts (#10)
│       └── Project Settings (#11)
└── Account Settings (#12)
```

---

## Implementation Recommendations

### Critical Path (MVP Minimum)
To achieve a working MVP, these views must be completed in order:
1. Auth → Projects List → Create Project → Project Shell → Project Chat → Project Files

### Recommended Implementation Order
1. **Phase 1**: (Foundation)
   - Auth + Error Recovery
   - Establishes authentication flow and error handling infrastructure

2. **Phase 2**: (Project Management)
   - Projects List + Create Project + Project Shell
   - Enables project creation and navigation

3. **Phase 3**:(C ore Features)
   - Project Chat (primary interaction)
   - Project Files (document management)
   - Document Detail (viewing documents)

4. **Phase 4**: (Enhanced Features)
   - Document Search (semantic search)
   - Project Facts (memory viewer)
   - Project Settings (project management)

5. **Phase 5**: (Polish)
   - Account Settings (user preferences)

---

## Key Considerations

### Shared Components to Build Early
- `InlineErrorBanner` - Used by Auth, reused across all views
- `ApiErrorBanner` - Used by all API-backed views
- `PaginationControls` - Used by Projects List, Project Files, Document Detail
- `PhaseSelect` - Used by Create Project, Project Shell, Project Settings

### Shared Hooks to Build Early
- `useAuthRedirect()` - Auth flow
- `useProjectsList()` - Projects List
- `useProject()` - Project Shell (shared with Project Settings)
- `useProjectChat()` - Project Chat
- `useDocumentsList()` - Project Files
- `useDocumentUpload()` - Project Files

### API Endpoints Required
Ensure backend endpoints are ready before implementing dependent views:
- `/api/projects` (GET, POST) - For Projects List and Create Project
- `/api/projects/{id}` (GET, PUT, DELETE) - For Project Shell and Settings
- `/api/projects/{id}/chat` (POST) - For Project Chat
- `/api/projects/{id}/messages` (GET) - For Project Chat
- `/api/projects/{id}/documents` (GET, POST, DELETE) - For Project Files
- `/api/projects/{id}/documents/{id}` (GET) - For Document Detail
- `/api/projects/{id}/documents/search` (POST) - For Document Search
- `/api/projects/{id}/memory` (GET) - For Project Facts
- `/api/profiles/me` (GET, PUT) - For Account Settings

### Testing Strategy
- **Unit Tests**: Test shared components and hooks in isolation
- **Integration Tests**: Test view flows (auth → projects → chat)
- **E2E Tests**: Critical user journeys (sign up → create project → upload document → chat)

---

## Progress Tracking

### Overall Progress
- **Total Views**: 12
- **Completed**: 12
- **In Progress**: 0
- **Not Started**: 0
- **Completion**: 100% 🎉

### Phase Progress
- **Phase 1**: 2/2 (100%) - Auth and Error Recovery complete
- **Phase 2**: 3/3 (100%) - Projects List, Create Project, Project Shell complete
- **Phase 3**: 3/3 (100%) - Project Chat, Project Files, and Document Detail complete
- **Phase 4**: 3/3 (100%) - Document Search, Project Facts, and Project Settings complete
- **Phase 5**: 1/1 (100%) - Account Settings complete

---

## Notes and Decisions

### Design System
- Consider adopting shadcn/ui or similar component library early for consistency
- Establish Tailwind CSS design tokens early (colors, spacing, typography)

### State Management
- Consider React Context for shared project state (loaded in Project Shell)
- Use React Query or SWR for server state management (recommended)

### Routing Strategy
- Use Astro file-based routing for static shells
- Use React islands (`client:load`) for interactive components
- Implement route guards in Project Shell for auth checks

### Error Handling Strategy
- Centralize API error mapping in a shared utility
- Implement consistent redirect patterns (401 → login, 403 → projects)
- Use Error Recovery views for terminal error states

---

## Last Updated
**Date**: 2026-01-20
**Updated By**: Claude (Cursor AI)
**Version**: 1.7

---

## Change Log

| Date | View | Change | Notes |
|------|------|--------|-------|
| 2026-01-20 | Account Settings | ✅ Implementation completed | AccountSettingsView, useProfile hook, profile form with validation, dirty state tracking |
| 2026-01-20 | Document Search | ✅ Implementation completed | DocumentSearchView, SearchResultCard, useDocumentSearch hook, advanced options (limit/threshold) |
| 2026-01-20 | Document Detail | ✅ Implementation completed | Enhanced DocumentDetailView with ChunkBrowser, ChunkDetailModal, useDocument with polling, useDocumentChunks, deep link support |
| 2026-01-20 | Project Settings | ✅ Implementation completed | ProjectSettingsView, DangerZone, useDeleteProject hook, form validation, delete confirmation dialog |
| 2026-01-20 | Project Facts | ✅ Implementation completed | ProjectFactsView, FactsViewer accordion, useProjectMemory hook, domain parsing, SuggestCorrectionButton |
| 2026-01-20 | Project Files | ✅ Implementation completed | ProjectFilesView, DocumentUploader, useDocumentsList/useDocumentUpload/useDeleteDocument hooks, filters, pagination |
| 2026-01-20 | Projects List | ✅ Implementation completed | ProjectsListView, useProjectsList hook, PaginationControls, FiltersBar, responsive ProjectCard/ProjectRow |
| 2026-01-20 | Project Shell | ✅ Implementation completed | ProjectShell, ProjectLayout.astro, useProject hook, PhaseBadge with picker, navigation tabs |
| 2026-01-20 | Error Recovery | ✅ Implementation completed | 403/404/offline pages, ErrorView component, safe returnTo validation, middleware public paths |
| 2026-01-20 | Auth | ✅ Implementation completed | Full auth flow: login/signup pages, AuthForm component, API endpoints, middleware, useAuthRedirect hook |
| 2026-01-10 | Project Chat | ✅ Implementation completed | Full chat view with message thread, composer, CSAT controls, optimistic updates, error handling |
| 2026-01-10 | Auth | 🟡 Status updated to In Progress | UI components complete (later fully completed on 2026-01-20) |
| 2026-01-10 | Create Project | ✅ Implementation completed | Includes CreateProjectView, PhaseSelect component, API client utilities, mock auth for development |
| 2026-01-10 | Backend Auth | 🔧 Mock auth added | MOCK_AUTH=true enables development without full Supabase auth |
| 2026-01-10 | Auth | ✅ Initial implementation | Sign in/sign up flows with Supabase auth |
| 2025-01-XX | All | Initial tracker created | Established implementation order and dependencies |
