# View Implementation Plan: Project Settings

## 1. Overview
Project Settings allows users to edit project metadata (name, location, current phase) and to soft delete a project. It must match API validation rules and clearly communicate that delete is soft and that restore is not part of MVP (unless later added).

## 2. View Routing
- **View path**: `/projects/:projectId/settings`
- **Related**:
  - back to chat: `/projects/:projectId/chat`
  - back to projects list: `/projects`

## 3. Component Structure

```
ProjectSettingsPage.astro
└─ (ProjectLayout.astro)
   └─ <ProjectSettingsView client:load projectId="..." />
      ├─ SettingsHeader
      ├─ ProjectSettingsForm
      │  ├─ NameField
      │  ├─ LocationField
      │  ├─ PhaseSelect
      │  ├─ SaveButton
      │  └─ FormStatus
      ├─ DangerZone
      │  ├─ DeleteProjectButton
      │  └─ DeleteConfirmDialog
      └─ ApiErrorBanner
```

## 4. Component Details

### `ProjectSettingsPage.astro`
- **Component description**: Route shell for settings view.
- **Main elements**: content container.
- **Handled events**: none.
- **Types**: none.
- **Props**: none.

### `ProjectSettingsView` (React)
- **Component description**: Loads project details, edits and saves updates, and handles soft delete with confirmation.
- **Main elements**:
  - Editable form
  - Danger zone section
- **Handled events**:
  - On mount: `GET /api/projects/{project_id}`
  - On submit: `PUT /api/projects/{project_id}`
  - On delete confirm: `DELETE /api/projects/{project_id}` then redirect to `/projects`
- **Validation conditions (per API plan)**
  - `name`:
    - required, non-empty trimmed
    - max 255 chars
  - `location`:
    - optional, max 500 chars
  - `current_phase`:
    - must be valid `ConstructionPhase`
- **Types (DTO + ViewModel)**
  - DTOs:
    - `ProjectDetailResponse`
    - `ProjectUpdateRequest`
    - `ProjectResponse`
    - `ProjectDeleteResponse`
    - `ConstructionPhase`
  - ViewModels:
    - `ProjectSettingsFormVM`:
      - `name: string`
      - `location: string`
      - `current_phase: ConstructionPhase`
      - `isLoading: boolean`
      - `isSaving: boolean`
      - `isDirty: boolean`
      - `fieldErrors: { name?: string; location?: string; current_phase?: string }`
      - `loadError: string | null`
      - `saveError: string | null`
      - `isDeleting: boolean`
      - `deleteError: string | null`
- **Props**:
  - `projectId: string`

### `DangerZone` (React)
- **Component description**: Presents destructive action and confirmation dialog.
- **Main elements**: button + dialog with project name and warning.
- **Handled events**: open/close dialog, confirm delete.
- **Validation**:
  - confirm dialog requires explicit confirmation (e.g., type project name) (recommended).
- **Types**: `ProjectDeleteResponse`.
- **Props**:
  - `projectName: string`
  - `onDelete: () => Promise<void>`
  - `isDeleting: boolean`

## 5. Types
New view model:
- `ProjectSettingsFormVM`

## 6. State Management
- Suggested hooks:
  - `useProject(projectId)` to load initial data (shared with shell)
  - `useUpdateProject(projectId)` to save form
  - `useDeleteProject(projectId)` to delete
- Use `loadedProject` + `draft` pattern for dirty tracking.

## 7. API Integration
- `GET /api/projects/{project_id}` → `ProjectDetailResponse`
- `PUT /api/projects/{project_id}` (body: `ProjectUpdateRequest`) → `ProjectResponse`
- `DELETE /api/projects/{project_id}` → `ProjectDeleteResponse`

## 8. User Interactions
- **Edit fields**: enable Save when dirty
- **Save**: validate → update → show “Saved”
- **Delete project**:
  - open confirmation dialog
  - confirm delete
  - redirect to `/projects` and show “Project archived” (optional)

## 9. Conditions and Validation
- Disable Save if:
  - `!isDirty` OR `isSaving` OR required fields invalid.
- After delete:
  - ensure project-scoped routes are no longer accessible; treat as 404 (API returns 404 for soft deleted on single GET).

## 10. Error Handling
- `401`: redirect to login with return
- `403`: redirect to `/projects`
- `404`: show project not found UI
- `422`: map field errors (name missing, invalid phase)
- `503/429`: show banner + retry

## 11. Implementation Steps
1. Add Astro route `src/pages/projects/[projectId]/settings.astro`.
2. Implement `ProjectSettingsView` with load, edit, save.
3. Add `DangerZone` section with confirmation dialog and delete flow.
4. Add validation per API constraints and robust error mapping.
