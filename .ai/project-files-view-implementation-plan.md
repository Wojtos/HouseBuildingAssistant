# View Implementation Plan: Project Files (Document List + Upload + Processing)

## 1. Overview
Project Files is the document hub for a project. Users can upload documents/photos, track processing state (OCR + chunking + embeddings), browse documents, delete documents (soft delete), and navigate to semantic search and document detail views.

## 2. View Routing
- **View path**: `/projects/:projectId/files`
- **Related routes**:
  - Document detail: `/projects/:projectId/files/:documentId`
  - Search: `/projects/:projectId/files/search`

## 3. Component Structure

```
ProjectFilesPage.astro
└─ (ProjectLayout.astro)
   └─ <ProjectFilesView client:load projectId="..." />
      ├─ FilesHeader
      │  ├─ Title
      │  ├─ UploadButton
      │  └─ SearchLink
      ├─ UploadDialog
      │  └─ DocumentUploader (step flow)
      ├─ FiltersBar
      │  ├─ ProcessingStateFilter
      │  ├─ FileTypeFilter
      │  └─ ShowArchivedToggle (optional)
      ├─ DocumentList
      │  └─ DocumentRow / DocumentCard
      ├─ PaginationControls
      └─ ApiErrorBanner
```

## 4. Component Details

### `ProjectFilesPage.astro`
- **Component description**: Route shell for `/projects/:projectId/files`.
- **Main elements**: content container.
- **Handled events**: none.
- **Types**: none.
- **Props**: none.

### `ProjectFilesView` (React)
- **Component description**: Fetches document list, renders upload flow and list UI, and dispatches delete actions.
- **Main elements**:
  - Header with actions
  - Filters
  - Document list
  - Pagination
- **Handled events**:
  - On mount / query change: load documents (`GET /documents`)
  - Start upload: open upload dialog
  - Delete document: confirm → call `DELETE /documents/{document_id}` → refresh list
  - Open detail: navigate to `/projects/:projectId/files/:documentId`
- **Validation conditions (API-aligned)**
  - List params:
    - `limit <= 100`
    - `processing_state` must be valid `ProcessingState`
  - Upload (create document request):
    - `name` required, max 255
    - `file_type` must be one of `SupportedFileTypes`
    - `file_size <= 10MB (10485760)`
- **Types (DTO + ViewModel)**
  - DTOs:
    - `DocumentListParams`, `DocumentListResponse`, `DocumentListItem`
    - `ProcessingState`
    - `DocumentCreateRequest`, `DocumentCreateResponse`
    - `DocumentConfirmResponse`
    - `DocumentDetailResponse`
    - `DocumentDeleteResponse`
    - `SupportedFileTypes`, `SupportedFileType`, `isSupportedFileType`
  - ViewModels:
    - `DocumentListQueryVM`:
      - `page: number`
      - `limit: number`
      - `processing_state: ProcessingState | 'ALL'`
      - `file_type: string | 'ALL'`
      - `include_deleted: boolean`
    - `UploadFlowVM`:
      - `step: 'select_file' | 'creating_record' | 'uploading' | 'confirming' | 'monitoring' | 'completed' | 'failed'`
      - `file: File | null`
      - `createResponse: DocumentCreateResponse | null`
      - `uploadProgress: number` (0..100)
      - `error: string | null`
      - `documentId?: string`
- **Props**:
  - `projectId: string`

### `DocumentUploader` (React)
- **Component description**: Encapsulates the multi-step upload flow:
  1) create document record (presigned URL)
  2) direct upload to `upload_url`
  3) confirm upload
  4) poll document status until terminal state
- **Main elements**:
  - file picker input
  - progress/status UI
  - “Restart upload” action on expiry/410
- **Handled events**:
  - file selection
  - start upload
  - retry/restart
- **Validation conditions**
  - File type must match `SupportedFileTypes`
  - Size must be <= 10MB
  - File name length <= 255
- **Types**: `DocumentCreateRequest/Response`, `DocumentConfirmResponse`, `DocumentDetailResponse`, `ProcessingState`
- **Props**:
  - `projectId: string`
  - `onCompleted?: (documentId: string) => void` (refresh list and optionally navigate)

### `DocumentRow` / `DocumentCard` (React)
- **Component description**: Displays document metadata and processing status; provides actions.
- **Main elements**: name, file type, created_at, state badge, chunk_count; actions (Open/Delete).
- **Handled events**:
  - open
  - delete (opens confirm dialog)
- **Validation**: none.
- **Types**: `DocumentListItem`.
- **Props**:
  - `item: DocumentListItem`
  - `onOpen: (documentId: string) => void`
  - `onDelete: (documentId: string) => void`

## 5. Types
Add view models:
- `DocumentListQueryVM`
- `UploadFlowVM`
- Shared:
  - `ApiErrorVM`

## 6. State Management
- Suggested hooks:
  - `useDocumentsList(projectId: string, params: DocumentListParams)`:
    - returns `{ data, isLoading, error, refresh }`
  - `useDocumentUpload(projectId: string)`:
    - returns `{ start(file), state: UploadFlowVM, reset() }`
    - uses `XMLHttpRequest` or `fetch` with streams for progress (progress is optional; can show indeterminate)
  - `useDeleteDocument(projectId: string)`:
    - `deleteDocument(documentId)`

## 7. API Integration
- `GET /api/projects/{project_id}/documents`
  - Request: `DocumentListParams`
  - Response: `DocumentListResponse`
- `POST /api/projects/{project_id}/documents`
  - Request: `DocumentCreateRequest`
  - Response: `DocumentCreateResponse` (includes `upload_url` + expiry)
- Direct upload to `upload_url` (Supabase Storage presigned URL)
  - Method and headers depend on URL type; default to `PUT` with file body (validate against backend expectations; if unclear, use `fetch(upload_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })`)
- `POST /api/projects/{project_id}/documents/{document_id}/confirm`
  - Response: `DocumentConfirmResponse`
- `GET /api/projects/{project_id}/documents/{document_id}` (poll)
  - Response: `DocumentDetailResponse`
- `DELETE /api/projects/{project_id}/documents/{document_id}`
  - Response: `DocumentDeleteResponse`

## 8. User Interactions
- **Upload a file**:
  - Select file → validation errors shown immediately if invalid
  - Create record → show “Preparing upload…”
  - Uploading → show progress/indeterminate spinner
  - Confirming → show “Finalizing…”
  - Monitoring → show “Processing…” and allow user to close dialog and continue browsing (upload state should persist in view state)
  - Completed → show success and refresh list
- **Filter list**: updates server query and resets page to 1
- **Open document**: navigates to detail view
- **Delete**: requires confirmation; on success refresh list

## 9. Conditions and Validation
- Upload validation:
  - `file.type` must pass `isSupportedFileType(file.type)`
  - `file.size <= 10_485_760`
  - `file.name.length <= 255`
- Confirm expiry:
  - If confirm returns `410 Gone`, show “Upload link expired. Start upload again.” and recreate document record (restart flow).
- Soft delete:
  - After delete, the document should disappear from list unless `include_deleted=true`.

## 10. Error Handling
- `401`: redirect to login with return
- `403`: project access denied → back to `/projects`
- `404`: project not found → not-found UI
- `413 Payload Too Large`: show “Max size is 10MB”
- `422 Unprocessable Entity`: unsupported file type; show supported types list
- `409 Conflict` on confirm: show “Already confirmed” and proceed to monitoring
- `400` on confirm (file missing): show “Upload failed; please retry”
- `503/429`: show banner and allow retry; keep selected file if safe

## 11. Implementation Steps
1. Add Astro route `src/pages/projects/[projectId]/files/index.astro`.
2. Implement `ProjectFilesView`, `DocumentList`, and `DocumentUploader`.
3. Implement `useDocumentsList`, `useDocumentUpload`, `useDeleteDocument` hooks.
4. Implement presigned upload handling + confirm + polling with clear states.
5. Add strong error mapping (410/413/422/409) and UX for restart/retry.
