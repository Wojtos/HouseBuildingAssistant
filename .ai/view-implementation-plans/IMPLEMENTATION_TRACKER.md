# View Implementation Tracker

This document tracks the order, status, and dependencies for implementing all view components in the HomeBuild AI Assistant MVP.

## Implementation Phases

### Phase 1: Foundation (Critical Path)
**Goal**: Enable user authentication and basic navigation infrastructure.

| # | View | Status | Dependencies | Priority | Notes |
|---|------|--------|--------------|----------|-------|
| 1 | **Auth** (Sign in / Sign up) | 🟡 In Progress | None | **Critical** | Basic UI complete, needs integration testing |
| 2 | **Error Recovery** (403, 404, Offline) | 🔴 Not Started | None | **Critical** | Used by all views for error handling |

### Phase 2: Project Management (Core)
**Goal**: Enable project creation and navigation.

| # | View | Status | Dependencies | Priority | Notes |
|---|------|--------|--------------|----------|-------|
| 3 | **Projects List** | 🔴 Not Started | Auth (#1) | **Critical** | First post-login destination |
| 4 | **Create Project** | 🟢 Completed | Auth (#1), Projects List (#3) | **Critical** | Needed before accessing project-scoped views |
| 5 | **Project Shell** (Layout Wrapper) | 🔴 Not Started | Auth (#1), Projects List (#3) | **Critical** | Required wrapper for all project-scoped routes |

### Phase 3: Core Features (MVP Critical)
**Goal**: Enable primary user interactions and document management.

| # | View | Status | Dependencies | Priority | Notes |
|---|------|--------|--------------|----------|-------|
| 6 | **Project Chat** | 🟢 Completed | Project Shell (#5) | **Critical** | Primary user interaction surface |
| 7 | **Project Files** (Document List + Upload) | 🔴 Not Started | Project Shell (#5) | **Critical** | Required for RAG/document context |
| 8 | **Document Detail** | 🔴 Not Started | Project Shell (#5), Project Files (#7) | **High** | View individual documents and chunks |

### Phase 4: Enhanced Features
**Goal**: Add advanced functionality for better user experience.

| # | View | Status | Dependencies | Priority | Notes |
|---|------|--------|--------------|----------|-------|
| 9 | **Document Search** (Semantic Search) | 🔴 Not Started | Project Shell (#5), Project Files (#7) | **High** | Enables finding facts across documents |
| 10 | **Project Facts** (Memory Viewer) | 🔴 Not Started | Project Shell (#5) | **High** | Shows structured project memory |
| 11 | **Project Settings** | 🔴 Not Started | Project Shell (#5) | **Medium** | Project metadata management |

### Phase 5: Polish
**Goal**: User account management and preferences.

| # | View | Status | Dependencies | Priority | Notes |
|---|------|--------|--------------|----------|-------|
| 12 | **Account Settings** | 🔴 Not Started | Auth (#1) | **Medium** | User profile preferences |

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
- **Completed**: 2
- **In Progress**: 1
- **Not Started**: 9
- **Completion**: 17% (25% including in-progress)

### Phase Progress
- **Phase 1**: 0/2 complete, 1/2 in progress (50% in progress)
- **Phase 2**: 1/3 (33%)
- **Phase 3**: 1/3 (33%)
- **Phase 4**: 0/3 (0%)
- **Phase 5**: 0/1 (0%)

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
**Date**: 2026-01-10
**Updated By**: Claude (Cursor AI)
**Version**: 1.3

---

## Change Log

| Date | View | Change | Notes |
|------|------|--------|-------|
| 2026-01-10 | Project Chat | ✅ Implementation completed | Full chat view with message thread, composer, CSAT controls, optimistic updates, error handling |
| 2026-01-10 | Auth | 🟡 Status updated to In Progress | UI components complete, needs full integration with backend auth flow |
| 2026-01-10 | Create Project | ✅ Implementation completed | Includes CreateProjectView, PhaseSelect component, API client utilities, mock auth for development |
| 2026-01-10 | Backend Auth | 🔧 Mock auth added | MOCK_AUTH=true enables development without full Supabase auth |
| 2026-01-10 | Auth | ✅ Initial implementation | Sign in/sign up flows with Supabase auth |
| 2025-01-XX | All | Initial tracker created | Established implementation order and dependencies |
