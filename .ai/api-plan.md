# REST API Plan

## 1. Resources

| Resource | Database Table(s) | Description |
|----------|------------------|-------------|
| Profile | `profiles` | User profile extending Supabase Auth |
| Project | `projects` | User's construction projects |
| ProjectMemory | `project_memory`, `memory_audit_trail` | Structured JSONB facts per project |
| Document | `documents`, `document_chunks` | Uploaded files and OCR-extracted chunks |
| Message | `messages`, `routing_audits` | Chat history with AI agents |
| Usage | `usage_logs` | Token/API usage tracking |

---

## 2. Endpoints

### 2.1 Profile Endpoints

#### GET /api/profiles/me
Get the current authenticated user's profile.

**Response Payload:**
```json
{
  "id": "uuid",
  "full_name": "string",
  "preferred_units": "METRIC | IMPERIAL",
  "language": "en",
  "created_at": "ISO8601 timestamp",
  "updated_at": "ISO8601 timestamp"
}
```

**Success Codes:**
- `200 OK` - Profile retrieved successfully

**Error Codes:**
- `401 Unauthorized` - Missing or invalid authentication token
- `404 Not Found` - Profile not found (user exists in auth but no profile record)

---

#### PUT /api/profiles/me
Update the current user's profile.

**Request Payload:**
```json
{
  "full_name": "string",
  "preferred_units": "METRIC | IMPERIAL",
  "language": "en | pl | de | ..."
}
```

**Response Payload:**
```json
{
  "id": "uuid",
  "full_name": "string",
  "preferred_units": "METRIC | IMPERIAL",
  "language": "en",
  "created_at": "ISO8601 timestamp",
  "updated_at": "ISO8601 timestamp"
}
```

**Validation:**
- `preferred_units` must be one of: `METRIC`, `IMPERIAL`
- `language` must be a valid 2-character ISO 639-1 code

**Success Codes:**
- `200 OK` - Profile updated successfully

**Error Codes:**
- `400 Bad Request` - Invalid field values
- `401 Unauthorized` - Missing or invalid authentication token
- `422 Unprocessable Entity` - Validation failed

---

### 2.2 Project Endpoints

#### GET /api/projects
List all projects for the authenticated user.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `sort_by` | string | `created_at` | Sort field: `created_at`, `updated_at`, `name` |
| `sort_order` | string | `desc` | Sort order: `asc`, `desc` |
| `phase` | string | - | Filter by construction phase |
| `include_deleted` | boolean | false | Include soft-deleted projects |

**Response Payload:**
```json
{
  "data": [
    {
      "id": "uuid",
      "name": "string",
      "location": "string",
      "current_phase": "LAND_SELECTION",
      "created_at": "ISO8601 timestamp",
      "updated_at": "ISO8601 timestamp",
      "deleted_at": "ISO8601 timestamp | null"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_items": 45,
    "total_pages": 3
  }
}
```

**Success Codes:**
- `200 OK` - Projects retrieved successfully

**Error Codes:**
- `401 Unauthorized` - Missing or invalid authentication token
- `400 Bad Request` - Invalid query parameters

---

#### POST /api/projects
Create a new project.

**Request Payload:**
```json
{
  "name": "string (required)",
  "location": "string (optional)",
  "current_phase": "LAND_SELECTION (optional, default: LAND_SELECTION)"
}
```

**Response Payload:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "string",
  "location": "string",
  "current_phase": "LAND_SELECTION",
  "created_at": "ISO8601 timestamp",
  "updated_at": "ISO8601 timestamp"
}
```

**Validation:**
- `name` is required and must be non-empty
- `current_phase` must be a valid `construction_phase` enum value

**Success Codes:**
- `201 Created` - Project created successfully

**Error Codes:**
- `400 Bad Request` - Missing required fields
- `401 Unauthorized` - Missing or invalid authentication token
- `422 Unprocessable Entity` - Validation failed

**Side Effects:**
- Creates an empty `project_memory` record with `data: {}`

---

#### GET /api/projects/{project_id}
Get a specific project by ID.

**Path Parameters:**
- `project_id` (uuid) - Project identifier

**Response Payload:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "string",
  "location": "string",
  "current_phase": "DESIGN",
  "created_at": "ISO8601 timestamp",
  "updated_at": "ISO8601 timestamp",
  "document_count": 5,
  "message_count": 42
}
```

**Success Codes:**
- `200 OK` - Project retrieved successfully

**Error Codes:**
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this project
- `404 Not Found` - Project not found

---

#### PUT /api/projects/{project_id}
Update a project.

**Path Parameters:**
- `project_id` (uuid) - Project identifier

**Request Payload:**
```json
{
  "name": "string",
  "location": "string",
  "current_phase": "PERMITTING"
}
```

**Response Payload:**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "string",
  "location": "string",
  "current_phase": "PERMITTING",
  "created_at": "ISO8601 timestamp",
  "updated_at": "ISO8601 timestamp"
}
```

**Validation:**
- `current_phase` must be a valid `construction_phase` enum value

**Success Codes:**
- `200 OK` - Project updated successfully

**Error Codes:**
- `400 Bad Request` - Invalid field values
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this project
- `404 Not Found` - Project not found
- `422 Unprocessable Entity` - Validation failed

---

#### DELETE /api/projects/{project_id}
Soft delete a project (sets `deleted_at` timestamp).

**Path Parameters:**
- `project_id` (uuid) - Project identifier

**Response Payload:**
```json
{
  "id": "uuid",
  "deleted_at": "ISO8601 timestamp"
}
```

**Success Codes:**
- `200 OK` - Project soft deleted successfully

**Error Codes:**
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this project
- `404 Not Found` - Project not found

**Side Effects:**
- Sets `deleted_at` timestamp on the project
- Soft deleted projects are excluded from list queries by default
- Associated resources remain accessible but hidden with the project

**Note:** All DELETE operations in this API use soft deletes. Records are marked with a `deleted_at` timestamp rather than being permanently removed. This allows for data recovery and audit trails.

---

### 2.3 Project Memory Endpoints

#### GET /api/projects/{project_id}/memory
Get the structured memory for a project.

**Path Parameters:**
- `project_id` (uuid) - Project identifier

**Response Payload:**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "data": {
    "FINANCE": {
      "budget": 500000,
      "currency": "USD",
      "loan_type": "construction"
    },
    "PERMITTING": {
      "zoning": "R-1",
      "setbacks": {
        "front": "25ft",
        "side": "10ft"
      }
    }
  },
  "updated_at": "ISO8601 timestamp"
}
```

**Success Codes:**
- `200 OK` - Memory retrieved successfully

**Error Codes:**
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this project
- `404 Not Found` - Project not found

---

#### PATCH /api/projects/{project_id}/memory
Update the project memory (deep merge with existing data).

**Path Parameters:**
- `project_id` (uuid) - Project identifier

**Request Payload:**
```json
{
  "data": {
    "PERMITTING": {
      "permit_status": "approved"
    }
  },
  "agent_id": "string (optional)",
  "change_summary": "string (optional)"
}
```

**Response Payload:**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "data": {
    "FINANCE": {
      "budget": 550000,
      "currency": "USD"
    },
    "PERMITTING": {
      "zoning": "R-1",
      "permit_status": "approved"
    }
  },
  "updated_at": "ISO8601 timestamp"
}
```

**Validation:**
- `data` must be a valid JSON object
- JSON Schema validation performed by Python backend for critical fields:
  - Budget must be numeric if present
  - Dates must be valid ISO8601 format
  - Enum fields must match allowed values

**Success Codes:**
- `200 OK` - Memory updated successfully

**Error Codes:**
- `400 Bad Request` - Invalid JSON structure
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this project
- `404 Not Found` - Project not found
- `422 Unprocessable Entity` - JSON Schema validation failed

**Side Effects:**
- Creates a `memory_audit_trail` record with previous and new data

---

#### GET /api/projects/{project_id}/memory/audit
Get the audit trail for project memory changes.

**Path Parameters:**
- `project_id` (uuid) - Project identifier

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |

**Response Payload:**
```json
{
  "data": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "agent_id": "FINANCE_AGENT",
      "change_summary": "Updated budget to 550000",
      "previous_data": {},
      "new_data": {},
      "created_at": "ISO8601 timestamp"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_items": 15,
    "total_pages": 1
  }
}
```

**Success Codes:**
- `200 OK` - Audit trail retrieved successfully

**Error Codes:**
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this project
- `404 Not Found` - Project not found

---

### 2.4 Document Endpoints

#### GET /api/projects/{project_id}/documents
List all documents for a project.

**Path Parameters:**
- `project_id` (uuid) - Project identifier

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |
| `processing_state` | string | - | Filter by state: `PENDING_UPLOAD`, `UPLOADED`, `PROCESSING`, `COMPLETED`, `FAILED` |
| `file_type` | string | - | Filter by file type |
| `include_deleted` | boolean | false | Include soft-deleted documents |

**Response Payload:**
```json
{
  "data": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "name": "zoning_permit.pdf",
      "file_type": "application/pdf",
      "processing_state": "COMPLETED",
      "error_message": null,
      "chunk_count": 12,
      "created_at": "ISO8601 timestamp",
      "deleted_at": "ISO8601 timestamp | null"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_items": 5,
    "total_pages": 1
  }
}
```

**Success Codes:**
- `200 OK` - Documents retrieved successfully

**Error Codes:**
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this project
- `404 Not Found` - Project not found

---

#### POST /api/projects/{project_id}/documents
Create a document record and get a presigned upload URL.

**Path Parameters:**
- `project_id` (uuid) - Project identifier

**Request Payload:**
```json
{
  "name": "zoning_permit.pdf",
  "file_type": "application/pdf",
  "file_size": 1048576
}
```

**Response Payload:**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "name": "zoning_permit.pdf",
  "file_type": "application/pdf",
  "processing_state": "PENDING_UPLOAD",
  "upload_url": "https://storage.supabase.co/...",
  "upload_url_expires_at": "ISO8601 timestamp",
  "created_at": "ISO8601 timestamp"
}
```

**Validation:**
- `name` is required, max 255 characters
- `file_type` must be one of supported types: `application/pdf`, `image/png`, `image/jpeg`, `image/tiff`, `text/plain`
- `file_size` is required, max 10MB (10485760 bytes)

**Success Codes:**
- `201 Created` - Document record created, upload URL generated

**Error Codes:**
- `400 Bad Request` - Missing required fields
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this project
- `404 Not Found` - Project not found
- `413 Payload Too Large` - File size exceeds limit
- `422 Unprocessable Entity` - Unsupported file type

**Notes:**
- The `upload_url` is a presigned URL for direct upload to Supabase Storage
- URL expires after 15 minutes
- Frontend should upload file directly to this URL, then call confirm endpoint

---

#### POST /api/projects/{project_id}/documents/{document_id}/confirm
Confirm that file upload is complete and trigger OCR processing.

**Path Parameters:**
- `project_id` (uuid) - Project identifier
- `document_id` (uuid) - Document identifier

**Request Payload:**
```json
{}
```

**Response Payload:**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "name": "zoning_permit.pdf",
  "file_type": "application/pdf",
  "processing_state": "UPLOADED",
  "created_at": "ISO8601 timestamp"
}
```

**Success Codes:**
- `200 OK` - Upload confirmed, processing started

**Error Codes:**
- `400 Bad Request` - File not found in storage
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this project
- `404 Not Found` - Project or document not found
- `409 Conflict` - Document already confirmed
- `410 Gone` - Upload URL expired, create new document

**Side Effects:**
- Verifies file exists in storage at expected path
- Updates `processing_state` from `PENDING_UPLOAD` to `UPLOADED`
- Triggers async OCR processing pipeline
- Processing updates state to `PROCESSING`, then `COMPLETED` or `FAILED`

---

#### GET /api/projects/{project_id}/documents/{document_id}
Get a specific document's details.

**Path Parameters:**
- `project_id` (uuid) - Project identifier
- `document_id` (uuid) - Document identifier

**Response Payload:**
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "name": "zoning_permit.pdf",
  "file_type": "application/pdf",
  "processing_state": "COMPLETED",
  "error_message": null,
  "chunk_count": 12,
  "created_at": "ISO8601 timestamp"
}
```

**Success Codes:**
- `200 OK` - Document retrieved successfully

**Error Codes:**
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this project
- `404 Not Found` - Project or document not found

---

#### DELETE /api/projects/{project_id}/documents/{document_id}
Soft delete a document (sets `deleted_at` timestamp).

**Path Parameters:**
- `project_id` (uuid) - Project identifier
- `document_id` (uuid) - Document identifier

**Response Payload:**
```json
{
  "id": "uuid",
  "deleted_at": "ISO8601 timestamp"
}
```

**Success Codes:**
- `200 OK` - Document soft deleted successfully

**Error Codes:**
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this project
- `404 Not Found` - Project or document not found

**Side Effects:**
- Sets `deleted_at` timestamp on the document
- Associated `document_chunks` are excluded from search queries
- Soft deleted documents are excluded from list queries by default

---

#### GET /api/projects/{project_id}/documents/{document_id}/chunks
Get all text chunks for a document.

**Path Parameters:**
- `project_id` (uuid) - Project identifier
- `document_id` (uuid) - Document identifier

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 20 | Items per page (max 100) |

**Response Payload:**
```json
{
  "data": [
    {
      "id": "uuid",
      "document_id": "uuid",
      "content": "Zoning Classification: R-1 Single Family Residential...",
      "chunk_index": 0,
      "metadata": {
        "page_number": 1,
        "category": "zoning"
      },
      "created_at": "ISO8601 timestamp"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total_items": 12,
    "total_pages": 1
  }
}
```

**Success Codes:**
- `200 OK` - Chunks retrieved successfully

**Error Codes:**
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this project
- `404 Not Found` - Project or document not found

---

#### POST /api/projects/{project_id}/documents/search
Perform semantic search across all document chunks in a project.

**Path Parameters:**
- `project_id` (uuid) - Project identifier

**Request Payload:**
```json
{
  "query": "What are the setback requirements?",
  "limit": 5,
  "threshold": 0.7
}
```

**Response Payload:**
```json
{
  "results": [
    {
      "chunk_id": "uuid",
      "document_id": "uuid",
      "document_name": "zoning_permit.pdf",
      "content": "Front setback: 25 feet. Side setback: 10 feet...",
      "chunk_index": 3,
      "similarity_score": 0.92,
      "metadata": {
        "page_number": 2
      }
    }
  ],
  "query": "What are the setback requirements?",
  "total_results": 3
}
```

**Validation:**
- `query` is required
- `limit` must be between 1 and 20 (default: 5)
- `threshold` must be between 0 and 1 (default: 0.7)

**Success Codes:**
- `200 OK` - Search completed successfully

**Error Codes:**
- `400 Bad Request` - Missing query or invalid parameters
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this project
- `404 Not Found` - Project not found

---

### 2.5 Chat/Message Endpoints

#### GET /api/projects/{project_id}/messages
Get chat history for a project.

**Path Parameters:**
- `project_id` (uuid) - Project identifier

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 50 | Items per page (max 100) |
| `before` | timestamp | - | Get messages before this timestamp |
| `after` | timestamp | - | Get messages after this timestamp |

**Response Payload:**
```json
{
  "data": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "role": "user",
      "content": "What permits do I need for a single-family home?",
      "agent_id": null,
      "csat_rating": null,
      "created_at": "ISO8601 timestamp"
    },
    {
      "id": "uuid",
      "project_id": "uuid",
      "role": "assistant",
      "content": "For a single-family home, you typically need...",
      "agent_id": "REGULATORY_PERMITTING_AGENT",
      "csat_rating": 5,
      "created_at": "ISO8601 timestamp"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_items": 42,
    "total_pages": 1
  }
}
```

**Success Codes:**
- `200 OK` - Messages retrieved successfully

**Error Codes:**
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this project
- `404 Not Found` - Project not found

---

#### POST /api/projects/{project_id}/chat
Send a message and receive an AI response.

**Path Parameters:**
- `project_id` (uuid) - Project identifier

**Request Payload:**
```json
{
  "content": "What should I consider when selecting a plot of land?"
}
```

**Response Payload:**
```json
{
  "id": "uuid",
  "role": "assistant",
  "content": "When selecting a plot of land for your home, consider these key factors...",
  "agent_id": "LAND_FEASIBILITY_AGENT",
  "routing_metadata": {
    "confidence": 0.95,
    "reasoning": "Query relates to land selection criteria"
  },
  "created_at": "ISO8601 timestamp"
}
```

**Validation:**
- `content` is required and must be non-empty
- Maximum content length: 4000 characters

**Success Codes:**
- `200 OK` - Message processed and response generated

**Error Codes:**
- `400 Bad Request` - Missing or empty content
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this project
- `404 Not Found` - Project not found
- `422 Unprocessable Entity` - Content too long
- `503 Service Unavailable` - AI service temporarily unavailable

**Side Effects:**
- Creates `messages` records for both user and assistant
- Creates `routing_audits` record for the assistant message
- May update `project_memory` if agent extracts new facts
- Creates `usage_logs` record for token consumption
- Performs vector search on document chunks for context

**Performance:**
- Maximum response time: 10 seconds (as per PRD)

**Notes:**
- Only the assistant message is returned; the user message is stored but not echoed back
- Frontend already has the user's message content from the request

---

#### POST /api/projects/{project_id}/messages/{message_id}/feedback
Submit CSAT feedback for an assistant message.

**Path Parameters:**
- `project_id` (uuid) - Project identifier
- `message_id` (uuid) - Message identifier

**Request Payload:**
```json
{
  "csat_rating": 5
}
```

**Response Payload:**
```json
{
  "id": "uuid",
  "csat_rating": 5,
  "updated_at": "ISO8601 timestamp"
}
```

**Validation:**
- `csat_rating` must be an integer between 1 and 5
- Can only rate assistant messages (role = 'assistant')

**Success Codes:**
- `200 OK` - Feedback submitted successfully

**Error Codes:**
- `400 Bad Request` - Invalid rating value
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this project
- `404 Not Found` - Project or message not found
- `422 Unprocessable Entity` - Cannot rate user messages

---

### 2.6 Usage Endpoints

#### GET /api/usage
Get usage statistics for the authenticated user.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start_date` | date | 30 days ago | Start of date range |
| `end_date` | date | today | End of date range |
| `group_by` | string | `day` | Grouping: `day`, `week`, `month` |

**Response Payload:**
```json
{
  "summary": {
    "total_tokens": 125000,
    "total_cost": 2.45,
    "total_requests": 89
  },
  "by_period": [
    {
      "period": "2024-01-15",
      "tokens": 15000,
      "cost": 0.30,
      "requests": 12
    }
  ],
  "by_api": [
    {
      "api_name": "OpenRouter",
      "tokens": 100000,
      "cost": 2.00
    },
    {
      "api_name": "Google Search",
      "tokens": 0,
      "cost": 0.45
    }
  ]
}
```

**Success Codes:**
- `200 OK` - Usage retrieved successfully

**Error Codes:**
- `401 Unauthorized` - Missing or invalid authentication token
- `400 Bad Request` - Invalid date range

---

#### GET /api/projects/{project_id}/usage
Get usage statistics for a specific project.

**Path Parameters:**
- `project_id` (uuid) - Project identifier

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `start_date` | date | 30 days ago | Start of date range |
| `end_date` | date | today | End of date range |

**Response Payload:**
```json
{
  "project_id": "uuid",
  "summary": {
    "total_tokens": 45000,
    "total_cost": 0.89,
    "total_requests": 34
  },
  "by_api": [
    {
      "api_name": "OpenRouter",
      "tokens": 40000,
      "cost": 0.80
    }
  ]
}
```

**Success Codes:**
- `200 OK` - Usage retrieved successfully

**Error Codes:**
- `401 Unauthorized` - Missing or invalid authentication token
- `403 Forbidden` - User does not own this project
- `404 Not Found` - Project not found

---

### 2.7 Health Check Endpoint

#### GET /api/health
Check API and dependent services health status.

**Response Payload:**
```json
{
  "status": "healthy",
  "version": "1.0.0",
  "timestamp": "ISO8601 timestamp",
  "services": {
    "database": "healthy",
    "supabase_auth": "healthy",
    "openrouter": "healthy",
    "ocr_service": "healthy"
  }
}
```

**Success Codes:**
- `200 OK` - All services healthy

**Error Codes:**
- `503 Service Unavailable` - One or more services unhealthy

---

## 3. Authentication and Authorization

### 3.1 Authentication Mechanism

The API uses **Supabase Authentication** with JWT tokens.

**Implementation:**
1. Users authenticate via Supabase Auth (email/password, OAuth providers)
2. Supabase issues a JWT token upon successful authentication
3. Client includes the JWT in the `Authorization` header for all API requests:
   ```
   Authorization: Bearer <supabase_jwt_token>
   ```

### 3.2 Token Validation

The Python backend validates tokens by:
1. Extracting the JWT from the `Authorization` header
2. Verifying the JWT signature using the Supabase JWT secret
3. Checking token expiration
4. Extracting the `user_id` (sub claim) for authorization

### 3.3 Authorization Rules

**Resource-Level Authorization:**

| Resource | Authorization Rule |
|----------|-------------------|
| Profile | User can only access/modify their own profile (`auth.uid() = id`) |
| Project | User can only access projects they own (`auth.uid() = user_id`) |
| Project Memory | Access through parent project ownership |
| Documents | Access through parent project ownership |
| Messages | Access through parent project ownership |
| Usage Logs | User can only view their own usage data |

**Row-Level Security (RLS):**
- All database tables (except `web_search_cache`) have RLS enabled
- RLS policies enforce the authorization rules at the database level
- Provides defense-in-depth security

### 3.4 Rate Limiting

| Endpoint Category | Rate Limit |
|------------------|------------|
| Chat endpoints | 20 requests/minute per user |
| Document upload | 10 requests/minute per user |
| Document search | 30 requests/minute per user |
| Read operations | 100 requests/minute per user |
| Write operations | 50 requests/minute per user |

**Rate Limit Headers:**
```
X-RateLimit-Limit: 20
X-RateLimit-Remaining: 15
X-RateLimit-Reset: 1704067200
```

---

## 4. Validation and Business Logic

### 4.1 Validation Rules by Resource

#### Profile
| Field | Validation |
|-------|------------|
| `full_name` | String, max 255 characters |
| `preferred_units` | Enum: `METRIC`, `IMPERIAL` |
| `language` | String, exactly 2 characters (ISO 639-1) |

#### Project
| Field | Validation |
|-------|------------|
| `name` | Required, non-empty string, max 255 characters |
| `location` | Optional string, max 500 characters |
| `current_phase` | Enum: `LAND_SELECTION`, `FEASIBILITY`, `PERMITTING`, `DESIGN`, `SITE_PREP`, `FOUNDATION`, `SHELL_SYSTEMS`, `PROCUREMENT`, `FINISHES_FURNISHING`, `COMPLETED` |

#### Project Memory
| Field | Validation |
|-------|------------|
| `data` | Required, valid JSON object |
| `data.*.budget` | Numeric if present |
| `data.*.dates.*` | Valid ISO8601 date strings |
| Custom JSON Schema | Validated by Python backend for domain-specific fields |

#### Document
| Field | Validation |
|-------|------------|
| `name` | Required, max 255 characters |
| `file_type` | Required, must be one of: `application/pdf`, `image/png`, `image/jpeg`, `image/tiff`, `text/plain` |
| `file_size` | Required, max 10MB (10485760 bytes) |
| `processing_state` | Enum: `PENDING_UPLOAD`, `UPLOADED`, `PROCESSING`, `COMPLETED`, `FAILED` |

#### Message
| Field | Validation |
|-------|------------|
| `content` | Required, non-empty, max 4000 characters |
| `csat_rating` | Integer between 1 and 5 |
| `role` | Enum: `user`, `assistant` |

### 4.2 Business Logic Implementation

#### 4.2.1 Chat Processing Pipeline

The `/api/projects/{project_id}/chat` endpoint implements the core AI agent logic:

1. **Context Loading:**
   - Fetch current project memory (structured JSONB)
   - Perform vector similarity search on document chunks
   - Load recent message history (last N messages)

2. **Orchestrator Routing:**
   - Analyze user query with context
   - Route to appropriate specialized agent (1 of 9)
   - Log routing decision to `routing_audits`

3. **Agent Response Generation:**
   - Selected agent processes query with full context
   - Agent may perform Google Search for grounding
   - Agent generates response following mandatory preamble template

4. **Memory Updates:**
   - Agent may extract new facts from conversation
   - Update `project_memory` with new facts
   - Create `memory_audit_trail` entry

5. **Usage Logging:**
   - Record token consumption
   - Calculate estimated cost
   - Store in `usage_logs`

#### 4.2.2 Document Processing Pipeline

The document upload uses a two-step flow with presigned URLs:

1. **Create Document Record (Sync):**
   - Validate file type and size from request metadata
   - Create `documents` record with state `PENDING_UPLOAD`
   - Generate presigned upload URL for Supabase Storage
   - Return document record with upload URL to client

2. **Frontend Direct Upload:**
   - Frontend uploads file directly to Supabase Storage using presigned URL
   - No backend involvement during actual file transfer

3. **Confirm Upload (Sync):**
   - Frontend calls confirm endpoint after successful upload
   - Backend verifies file exists in storage
   - Update state to `UPLOADED`
   - Trigger async processing

4. **OCR Processing (Async):**
   - Update state to `PROCESSING`
   - Extract text via OCR service
   - Handle errors (set state to `FAILED` with `error_message`)

5. **Chunking:**
   - Split text into semantic chunks (500-1000 tokens each)
   - Preserve metadata (page numbers, categories)

6. **Embedding:**
   - Generate vector embeddings for each chunk
   - Use configured embedding model (e.g., `text-embedding-3-small`)

7. **Storage:**
   - Store chunks with embeddings in `document_chunks`
   - Update document state to `COMPLETED`

#### 4.2.3 Semantic Search

The vector search endpoint uses pgvector's HNSW index:

1. **Query Embedding:**
   - Generate embedding for user query
   
2. **Similarity Search:**
   - Find nearest neighbors using cosine similarity
   - Filter by project_id (denormalized for performance)
   - Apply similarity threshold
   - Return top-k results

3. **Result Enrichment:**
   - Include document metadata
   - Calculate similarity scores

#### 4.2.4 Project Phase Progression

Phase changes are tracked for success metrics:

1. User or agent updates `current_phase`
2. System validates phase transition is valid
3. Phase change is logged for analytics
4. Used to measure "User Progression" success criteria

### 4.3 Error Handling

All endpoints return consistent error responses:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable error message",
    "details": {
      "field": "specific_field",
      "reason": "Detailed reason for the error"
    }
  }
}
```

**Error Codes:**
| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `FORBIDDEN` | 403 | User lacks permission for resource |
| `NOT_FOUND` | 404 | Resource does not exist |
| `VALIDATION_ERROR` | 422 | Request failed validation |
| `RATE_LIMITED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Dependent service unavailable |

### 4.4 Caching Strategy

**Web Search Cache:**
- Google Search results cached in `web_search_cache`
- Cache key: MD5 hash of query
- TTL: Configurable expiration
- Reduces API costs for repeated searches

**Response Caching:**
- GET endpoints support `ETag` headers
- Clients can use `If-None-Match` for conditional requests
- Reduces bandwidth and improves performance

### 4.5 Soft Deletes

All DELETE operations use soft deletes instead of permanent removal:

**Implementation:**
- Resources have a `deleted_at` timestamp column (nullable)
- DELETE endpoints set `deleted_at` to current timestamp
- `deleted_at = NULL` indicates active (non-deleted) record

**Query Behavior:**
- List endpoints exclude soft-deleted records by default
- Add `?include_deleted=true` query parameter to include deleted records
- Single resource GET returns 404 for soft-deleted records

**Affected Resources:**
| Resource | Cascade Behavior |
|----------|-----------------|
| Project | Soft delete hides associated documents, messages, memory |
| Document | Soft delete excludes chunks from search results |
| Message | Individual messages can be soft deleted |

**Benefits:**
- Data recovery possible without database backups
- Audit trail preserved for compliance
- Referential integrity maintained
- User can "undo" accidental deletions

