# View Implementation Plan: Create Project

## 1. Overview
Create Project is a focused form that creates a new project with required `name` and optional `location` and `current_phase`. On success it redirects the user into the newly created project (recommended: to Chat).

## 2. View Routing
- **View path**: `/projects/new`
- **Success redirect**: `/projects/:projectId/chat` (or `/projects/:projectId/settings` if you want users to confirm metadata first)

## 3. Component Structure

```
CreateProjectPage.astro
└─ <CreateProjectView client:load />
   ├─ PageHeader (Back to /projects)
   ├─ CreateProjectForm
   │  ├─ NameField (required)
   │  ├─ LocationField (optional)
   │  ├─ PhaseSelect (optional; default LAND_SELECTION)
   │  ├─ SubmitButton
   │  └─ InlineValidationErrors
   └─ ApiErrorBanner
```

## 4. Component Details

### `CreateProjectPage.astro`
- **Component description**: Route shell for `/projects/new`.
- **Main elements**: `<main>`, centered form container.
- **Handled events**: none.
- **Types**: none.
- **Props**: none.

### `CreateProjectView` (React)
- **Component description**: Manages form state, client-side validation, calls create endpoint, handles success navigation and error mapping.
- **Main elements**:
  - `<form>`
  - Inputs for name/location
  - Phase select dropdown
  - Primary submit button
- **Handled events**:
  - `onSubmit`: calls API `POST /api/projects`
  - `onChange`: updates field state and clears relevant errors
  - `onClick` back: navigate `/projects`
- **Validation conditions (must mirror API plan)**
  - `name`:
    - required, non-empty (trim)
    - max 255 chars (enforce to avoid 422)
  - `location`:
    - optional, max 500 chars
  - `current_phase`:
    - optional; if provided must be valid `ConstructionPhase`
- **Types (DTO + ViewModel)**
  - DTOs:
    - `ProjectCreateRequest`
    - `ProjectResponse`
    - `ConstructionPhase`
  - ViewModels:
    - `CreateProjectFormVM`:
      - `name: string`
      - `location: string`
      - `current_phase: ConstructionPhase | ''` (empty means “use server default”)
      - `isSubmitting: boolean`
      - `fieldErrors: { name?: string; location?: string; current_phase?: string }`
      - `submitError: string | null`
- **Props**: none.

### `PhaseSelect` (React, shared)
- **Component description**: Select control for `ConstructionPhase`. Also reused in Project Shell quick-change and Project Settings.
- **Main elements**: `<select>` (or shadcn/ui Select).
- **Handled events**: `onChange(value)`.
- **Validation**: only allow values from `ConstructionPhase`.
- **Types**: `ConstructionPhase`.
- **Props**:
  - `value: ConstructionPhase | ''`
  - `onChange: (value: ConstructionPhase | '') => void`
  - `allowEmpty?: boolean`

## 5. Types
New types recommended:
- `CreateProjectFormVM` (see above)

## 6. State Management
- Local state in `CreateProjectView` for `CreateProjectFormVM`.
- Suggested hook:
  - `useCreateProject()`:
    - Exposes `createProject(input: ProjectCreateRequest): Promise<ProjectResponse>`
    - Handles error parsing into `ErrorResponse` when possible.

## 7. API Integration
- Endpoint: `POST /api/projects`
- Request type: `ProjectCreateRequest`
- Response type: `ProjectResponse`
- Frontend action:
  - `fetchJson<ProjectResponse>('/api/projects', { method: 'POST', body: ProjectCreateRequest })`
  - Set `Authorization` header from Supabase access token.
- Relevant errors:
  - `401`: redirect to `/login?redirectTo=/projects/new`
  - `400/422`: map to field-level errors; show summary.

## 8. User Interactions
- **Submit (valid)** → creates project → navigates into project
- **Submit (invalid)** → focuses first invalid field; shows error summary
- **Back** → returns to `/projects` without saving

## 9. Conditions and Validation
- Trim `name` on submit.
- Keep a character counter (optional) to help users stay below limits.
- Only allow `ConstructionPhase` values; do not allow arbitrary strings.

## 10. Error Handling
- `422 VALIDATION_ERROR`: show per-field messages and a top summary
- `503 SERVICE_UNAVAILABLE`: show retry and keep form values
- `429 RATE_LIMITED`: show retry-after guidance (if headers available)

## 11. Implementation Steps
1. Add Astro route `src/pages/projects/new.astro`.
2. Implement `CreateProjectView` React component with controlled inputs and client validation.
3. Add `PhaseSelect` shared component (or implement inline for now).
4. Implement `useCreateProject` hook using existing DTOs from `frontend/src/types/api.ts`.
5. Add error mapping for 400/422/503/429 and redirect logic for 401.
