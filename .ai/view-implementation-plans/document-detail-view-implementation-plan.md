# View Implementation Plan: Document Detail (Metadata + Chunk Browsing)

## 1. Overview
Document Detail shows one document’s metadata and processing state, and provides a chunk browser for extracted text. It supports deep linking to a specific chunk index (for traceability and sharing into chat), copying chunk text, and soft delete.

## 2. View Routing
- **View path**: `/projects/:projectId/files/:documentId`
- **Optional deep link query**: `?chunkIndex=<number>` to auto-scroll/open that chunk.

## 3. Component Structure

```
DocumentDetailPage.astro
└─ (ProjectLayout.astro)
   └─ <DocumentDetailView client:load projectId="..." documentId="..." />
      ├─ DocumentHeader
      │  ├─ BackLink (/files)
      │  ├─ DocumentTitle
      │  ├─ StatusBadge
      │  └─ DeleteButton
      ├─ DocumentMetaPanel
      │  ├─ FileType
      │  ├─ CreatedAt
      │  ├─ ChunkCount
      │  └─ ErrorMessage (if FAILED)
      ├─ ProcessingMonitor (if not COMPLETED)
      ├─ ChunkBrowser (if COMPLETED)
      │  ├─ ChunkList
      │  ├─ ChunkItem (snippet + metadata)
      │  ├─ ChunkDetailDrawer/Modal (full text)
      │  └─ PaginationControls
      └─ ApiErrorBanner
```

## 4. Component Details

### `DocumentDetailPage.astro`
- **Component description**: Route shell for document detail.
- **Main elements**: content container.
- **Handled events**: none.
- **Types**: none.
- **Props**: none.

### `DocumentDetailView` (React)
- **Component description**: Loads document metadata; polls if processing; loads chunks when ready; handles deep links and deletion.
- **Main elements**:
  - header + metadata
  - status monitor
  - chunk browser
- **Handled events**:
  - On mount: `GET /documents/{document_id}`
  - If state not terminal: poll `GET /documents/{document_id}` until `COMPLETED|FAILED`
  - When `COMPLETED`: load chunks `GET /chunks`
  - On pagination: load next chunk page
  - On chunk click: open detail modal/drawer
  - Copy chunk text
  - Delete: confirm → `DELETE /documents/{document_id}` → navigate back to list
- **Validation conditions**
  - `projectId` and `documentId` should look like UUIDs (lightweight).
  - Chunk list query: `limit <= 100`.
  - `chunkIndex` query param must be a non-negative integer.
- **Types (DTO + ViewModel)**
  - DTOs:
    - `DocumentDetailResponse`
    - `DocumentChunkListParams`, `DocumentChunkListResponse`, `DocumentChunkItem`
    - `DocumentDeleteResponse`
    - `ProcessingState`
  - ViewModels:
    - `DocumentDetailVM`:
      - `document: DocumentDetailResponse | null`
      - `isLoadingDocument: boolean`
      - `isPolling: boolean`
      - `chunks: DocumentChunkItem[]`
      - `chunksPagination: { page: number; limit: number; total_pages: number; total_items: number } | null`
      - `isLoadingChunks: boolean`
      - `selectedChunkId: string | null`
      - `selectedChunkIndex: number | null`
      - `error: ApiErrorVM | null`
      - `isDeleting: boolean`
- **Props**:
  - `projectId: string`
  - `documentId: string`

### `ProcessingMonitor` (React)
- **Component description**: Presents distinct UI for `PENDING_UPLOAD/UPLOADED/PROCESSING/FAILED`.
- **Main elements**: status badge, description, spinner, “Refresh” button.
- **Handled events**: manual refresh (re-fetch document).
- **Validation**: none.
- **Types**: `ProcessingState`.
- **Props**:
  - `processing_state: ProcessingState`
  - `error_message: string | null`
  - `onRefresh: () => void`

### `ChunkBrowser` (React)
- **Component description**: Paginates and displays extracted text chunks with traceability metadata.
- **Main elements**:
  - list/table
  - pagination controls
  - modal/drawer for full chunk
- **Handled events**:
  - paginate
  - open chunk
  - copy chunk text
  - “Copy link to this chunk” (compose URL with `?chunkIndex=` or `#chunk-<index>`)
- **Validation**:
  - page/limit bounds
- **Types**: `DocumentChunkItem`.
- **Props**:
  - `chunks: DocumentChunkItem[]`
  - `pagination: PaginationInfo`
  - `onPageChange: (page: number) => void`
  - `onOpenChunk: (chunk: DocumentChunkItem) => void`

## 5. Types
No new DTO types required; reuse from `frontend/src/types/api.ts`.
Recommended view models:
- `DocumentDetailVM`

## 6. State Management
- Suggested hooks:
  - `useDocument(projectId, documentId)`:
    - loads document
    - starts/stops polling based on `processing_state`
  - `useDocumentChunks(projectId, documentId, params)`:
    - loads paginated chunks
  - `useDeleteDocument(projectId)`:
    - deletes document and returns `DocumentDeleteResponse`
- Polling strategy:
  - poll every 2–3s while `UPLOADED|PROCESSING`, with exponential backoff and a max interval cap (optional)
  - stop polling on `COMPLETED|FAILED`

## 7. API Integration
- `GET /api/projects/{project_id}/documents/{document_id}`
  - Response: `DocumentDetailResponse`
- `GET /api/projects/{project_id}/documents/{document_id}/chunks`
  - Request: `DocumentChunkListParams`
  - Response: `DocumentChunkListResponse`
- `DELETE /api/projects/{project_id}/documents/{document_id}`
  - Response: `DocumentDeleteResponse`

## 8. User Interactions
- **Open page**: show metadata quickly; if not completed, show processing monitor.
- **Processing**: show clear states; allow user to leave and come back (polling resumes).
- **Browse chunks**: paginate; open full chunk; copy text; deep link to chunk.
- **Delete**: confirm dialog; on success return to `/files`.

## 9. Conditions and Validation
- Only show chunk list when `processing_state === COMPLETED`.
- If `FAILED`, show `error_message` and guidance to re-upload (link back to `/files`).
- If deep link `chunkIndex` is present:
  - ensure it’s within loaded page; if not, compute target page from `chunkIndex` and load that page (requires knowing `limit`)

## 10. Error Handling
- `401`: redirect to login with return
- `403`: back to `/projects`
- `404`: show “Document not found” with CTA to `/files`
- `503/429`: show banner; keep current view state
- Chunk load errors: show retry button for chunks separately from document metadata

## 11. Implementation Steps
1. Add Astro route `src/pages/projects/[projectId]/files/[documentId].astro`.
2. Implement `DocumentDetailView` with document fetch + polling logic.
3. Implement `ChunkBrowser` with pagination and chunk detail modal/drawer.
4. Add deep link support via `chunkIndex` query param.
5. Implement delete with confirmation and post-delete navigation.
