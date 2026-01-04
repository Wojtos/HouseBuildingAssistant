# API Endpoint Implementation Plan: Document Endpoints

## 1. Endpoint Overview
Implementation of document management and semantic search as specified in Section 2.4 of the REST API Plan. These endpoints support the RAG pipeline by handling file uploads, OCR confirmation, listing, and similarity search across document chunks.

## 2. Request Details

### GET /api/projects/{project_id}/documents
- **HTTP Method:** GET
- **Query Parameters:** `page`, `limit`, `processing_state`, `file_type`, `include_deleted`

### POST /api/projects/{project_id}/documents
- **HTTP Method:** POST
- **Request Body:** `DocumentCreateRequest` (`name`, `file_type`, `file_size`)
- **Action:** Create `PENDING_UPLOAD` record and return presigned URL.

### POST /api/projects/{project_id}/documents/{document_id}/confirm
- **HTTP Method:** POST
- **Action:** Verify file in storage, set to `UPLOADED`, trigger async OCR.

### GET /api/projects/{project_id}/documents/{document_id}
- **HTTP Method:** GET

### DELETE /api/projects/{project_id}/documents/{document_id}
- **HTTP Method:** DELETE
- **Action:** Soft delete (set `deleted_at`).

### GET /api/projects/{project_id}/documents/{document_id}/chunks
- **HTTP Method:** GET
- **Action:** Retrieve all text chunks for a document.

### POST /api/projects/{project_id}/documents/search
- **HTTP Method:** POST
- **Request Body:** `DocumentSearchRequest` (`query`, `limit`, `threshold`)
- **Action:** Semantic search across all project document chunks.

## 3. Used Types
- **Schemas (app/schemas/document.py):** All DTOs for list, create, confirm, detail, chunks, and search results.
- **Models (app/db/models.py):** `Document`, `DocumentChunk`.
- **Enums (app/db/enums.py):** `ProcessingState`.

## 4. Response Details
- **201 Created:** For `POST /documents`, returns `DocumentCreateResponse` with `upload_url`.
- **200 OK:** For other successful operations.
- **401/403/404:** Standard auth/ownership/missing errors.
- **413 Payload Too Large:** File size exceeds 10MB.
- **422 Unprocessable Entity:** Unsupported MIME type.

## 5. Data Flow
1. **Creation:** User requests upload -> Backend creates record + presigned URL via Supabase Storage API -> User uploads to Storage.
2. **Confirmation:** User calls `/confirm` -> Backend verifies file existence -> Sets state to `UPLOADED` -> Triggers background OCR/Chunking/Embedding task.
3. **Search:** User sends query -> Backend generates embedding -> Performs vector search in `document_chunks` table -> Returns matching results with similarity scores.

## 6. Security Considerations
- **Storage Protection:** Presigned URLs expire after 15 minutes.
- **File Validation:** MIME type and size checked before record creation.
- **Authorization:** `verify_project_ownership` ensures documents are only accessed/modified by the project owner.

## 7. Error Handling
- **OCR Failure:** Async task updates `processing_state` to `FAILED` and sets `error_message`.
- **Storage Sync:** If `/confirm` is called but file is missing, return 400.

## 8. Performance
- **Vector Search:** Currently Python-based cosine similarity in `DocumentRetrievalService`; should be migrated to pgvector RPC for production.
- **Soft Deletes:** Filtered out by default in list and search queries.

## 9. Implementation Steps
1. Create `backend/app/services/document_service.py` for CRUD and management logic.
2. Extend `backend/app/services/document_retrieval_service.py` if needed (already has basic search and chunk retrieval).
3. Create `backend/app/api/documents.py`.
4. Implement endpoints using `DocumentService` and `DocumentRetrievalService`.
5. Integrate with Supabase Storage for presigned URLs.
6. Add unit tests for upload flow (mocking Storage) and search.

