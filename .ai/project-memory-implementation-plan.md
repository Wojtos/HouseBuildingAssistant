# API Endpoint Implementation Plan: Project Memory Endpoints

## 1. Endpoint Overview
Implementation of structured project memory management as specified in Section 2.3 of the REST API Plan. These endpoints allow retrieval and updating of domain-specific project facts (JSONB) and access to the audit trail of changes.

## 2. Request Details

### GET /api/projects/{project_id}/memory
- **HTTP Method:** GET
- **URL Structure:** `/api/projects/{project_id}/memory`
- **Authentication:** Required (Supabase JWT)
- **Path Parameters:** `project_id` (UUID)

### PATCH /api/projects/{project_id}/memory
- **HTTP Method:** PATCH
- **URL Structure:** `/api/projects/{project_id}/memory`
- **Authentication:** Required (Supabase JWT)
- **Path Parameters:** `project_id` (UUID)
- **Request Body:** `ProjectMemoryUpdateRequest`
    - `data`: dict (required, JSONB to merge)
    - `agent_id`: string (optional)
    - `change_summary`: string (optional)

### GET /api/projects/{project_id}/memory/audit
- **HTTP Method:** GET
- **URL Structure:** `/api/projects/{project_id}/memory/audit`
- **Authentication:** Required (Supabase JWT)
- **Query Parameters:** `page`, `limit`

## 3. Used Types
- **Schemas (app/schemas/memory.py):**
    - `ProjectMemoryResponse`: DTO for current memory state.
    - `ProjectMemoryUpdateRequest`: Command model for updates.
    - `MemoryAuditListResponse`: Paginated list of audit entries.
- **Models (app/db/models.py):**
    - `ProjectMemory`: Current state record.
    - `MemoryAuditTrail`: History of changes.

## 4. Response Details
- **200 OK:** Successfully retrieved or updated. Returns appropriate DTO.
- **401 Unauthorized:** Missing or invalid token.
- **403 Forbidden:** User does not own the project.
- **404 Not Found:** Project or memory record not found.
- **422 Unprocessable Entity:** JSON Schema validation failed for memory data.

## 5. Data Flow
1. **Request Reception:** FastAPI router receives request.
2. **Authorization:** `verify_project_ownership` dependency ensures the user owns the project.
3. **Service Logic:**
    - `GET /memory`: `ProjectMemoryService.get_memory(project_id)` fetches from `project_memory`.
    - `PATCH /memory`:
        - `ProjectMemoryService.update_memory(project_id, updates)`
        - Performs deep merge of `data`.
        - Validates critical fields against internal JSON Schema.
        - Creates `MemoryAuditTrail` entry with `previous_data` and `new_data`.
    - `GET /audit`: `ProjectMemoryService.get_audit_trail(project_id, pagination)` fetches from `memory_audit_trail`.
4. **Response:** Return mapped DTOs.

## 6. Security Considerations
- **Ownership:** Enforced by `verify_project_ownership` dependency.
- **Data Integrity:** JSON Schema validation in the service layer prevents malformed or illegal values in critical fields (e.g., negative budget).

## 7. Error Handling
- **Deep Merge Conflicts:** Last-write-wins at the field level.
- **Validation Errors:** Return 422 with details on which field failed schema validation.

## 8. Performance
- **JSONB Operations:** Managed by the service layer using Python's dictionary merging.
- **Audit Volume:** Paginate audit trail to handle projects with extensive histories.

## 9. Implementation Steps
1. Extend `backend/app/services/project_memory_service.py`:
    - Implement `get_audit_trail` method with pagination.
    - Refine `update_memory` to handle `agent_id` and `change_summary` for auditing.
2. Create `backend/app/api/project_memory.py` (or add to `projects.py`). Given the scope, a separate file is better.
3. Implement the three endpoints using the service.
4. Add unit tests covering deep merge and audit trail creation.

