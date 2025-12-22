# Database Schema Design: HomeBuild AI Assistant

This document outlines the PostgreSQL database schema for the HomeBuild AI Assistant, designed for Supabase and leveraging `pgvector` for RAG capabilities.

## 1. Tables and Columns

### 1.1. Enums
```sql
-- Track the current phase of the house building project
CREATE TYPE construction_phase AS ENUM (
    'LAND_SELECTION',
    'FEASIBILITY',
    'PERMITTING',
    'DESIGN',
    'SITE_PREP',
    'FOUNDATION',
    'SHELL_SYSTEMS',
    'PROCUREMENT',
    'FINISHES_FURNISHING',
    'COMPLETED'
);

-- Track the state of document processing (OCR/Embedding)
CREATE TYPE processing_state AS ENUM (
    'UPLOADED',
    'PROCESSING',
    'COMPLETED',
    'FAILED'
);

-- Measurement units for project tracking
CREATE TYPE measurement_unit AS ENUM (
    'METRIC',
    'IMPERIAL'
);
```

### 1.2. Core Tables

#### `profiles`
Extends Supabase Auth users with application-specific metadata.
- `id`: `uuid` (PK, references `auth.users`)
- `full_name`: `text`
- `preferred_units`: `measurement_unit` (default 'METRIC')
- `language`: `varchar(2)` (default 'en')
- `created_at`: `timestamp with time zone` (default `now()`)
- `updated_at`: `timestamp with time zone` (default `now()`)

#### `projects`
Users can manage multiple construction projects.
- `id`: `uuid` (PK, UUID v7 for time-ordered sorting)
- `user_id`: `uuid` (FK to `profiles.id`, NOT NULL)
- `name`: `text` (NOT NULL)
- `location`: `text`
- `current_phase`: `construction_phase` (default 'LAND_SELECTION')
- `created_at`: `timestamp with time zone` (default `now()`)
- `updated_at`: `timestamp with time zone` (default `now()`)

#### `project_memory`
Stores the structured "facts" for a project in a single JSONB object.
- `id`: `uuid` (PK, UUID v7)
- `project_id`: `uuid` (FK to `projects.id`, UNIQUE, NOT NULL)
- `data`: `jsonb` (NOT NULL, default '{}')
- `updated_at`: `timestamp with time zone` (default `now()`)
- **Constraint**: `CHECK (jsonb_matches_schema('{"type": "object"}', data))` (Validated further via Python backend)

#### `documents`
Metadata for files uploaded to Supabase Storage.
- `id`: `uuid` (PK, UUID v7)
- `project_id`: `uuid` (FK to `projects.id`, NOT NULL)
- `name`: `text` (NOT NULL)
- `storage_path`: `text` (NOT NULL, path in Supabase Storage)
- `file_type`: `text`
- `processing_state`: `processing_state` (default 'UPLOADED')
- `error_message`: `text` (for failed processing)
- `created_at`: `timestamp with time zone` (default `now()`)

#### `document_chunks`
OCR-extracted text chunks and their vector embeddings.
- `id`: `uuid` (PK, UUID v7)
- `document_id`: `uuid` (FK to `documents.id`, ON DELETE CASCADE, NOT NULL)
- `project_id`: `uuid` (FK to `projects.id`, NOT NULL) -- Denormalized for scoped searches
- `content`: `text` (NOT NULL)
- `embedding`: `vector(1536)` (Optimized for OpenAI `text-embedding-3-small`)
- `embedding_model`: `text` (e.g., 'text-embedding-3-small')
- `chunk_index`: `integer` (NOT NULL)
- `metadata`: `jsonb` (e.g., page numbers, categories)
- `created_at`: `timestamp with time zone` (default `now()`)

#### `messages`
Chat history between user and AI agents.
- `id`: `uuid` (PK, UUID v7)
- `project_id`: `uuid` (FK to `projects.id`, NOT NULL)
- `user_id`: `uuid` (FK to `profiles.id`, NOT NULL)
- `role`: `text` (CHECK role IN ('user', 'assistant'))
- `content`: `text` (NOT NULL)
- `agent_id`: `text` (ID of the specialized agent that responded)
- `routing_metadata`: `jsonb` (Orchestrator decision data)
- `csat_rating`: `integer` (CHECK csat_rating BETWEEN 1 AND 5)
- `created_at`: `timestamp with time zone` (default `now()`)

### 1.3. Audit and Utility Tables

#### `memory_audit_trail`
Tracks changes to structured project memory.
- `id`: `uuid` (PK, UUID v7)
- `project_id`: `uuid` (FK to `projects.id`, NOT NULL)
- `agent_id`: `text` (Agent making the change)
- `change_summary`: `text`
- `previous_data`: `jsonb`
- `new_data`: `jsonb`
- `created_at`: `timestamp with time zone` (default `now()`)

#### `routing_audits`
Logs orchestrator decisions for performance analysis.
- `id`: `uuid` (PK, UUID v7)
- `message_id`: `uuid` (FK to `messages.id`, NOT NULL)
- `orchestrator_decision`: `text`
- `confidence_score`: `numeric`
- `reasoning`: `text`
- `created_at`: `timestamp with time zone` (default `now()`)
- `updated_at`: `timestamp with time zone` (default `now()`)

#### `web_search_cache`
Caches Google Search results to reduce costs.
- `query_hash`: `text` (PK, md5 of query)
- `query`: `text` (NOT NULL)
- `results`: `jsonb` (NOT NULL)
- `expires_at`: `timestamp with time zone` (NOT NULL)
- `created_at`: `timestamp with time zone` (default `now()`)

#### `usage_logs`
Tracks token usage and API costs.
- `id`: `uuid` (PK, UUID v7)
- `user_id`: `uuid` (FK to `profiles.id`, NOT NULL)
- `project_id`: `uuid` (FK to `projects.id`)
- `token_count`: `integer`
- `estimated_cost`: `numeric(10, 6)`
- `api_name`: `text` (e.g., 'OpenRouter', 'Google Search')
- `created_at`: `timestamp with time zone` (default `now()`)

## 2. Relationships

- **Profiles to Projects**: 1:N (A user can have multiple projects).
- **Projects to Project Memory**: 1:1 (Each project has exactly one structured memory state).
- **Projects to Documents**: 1:N (A project contains many documents).
- **Documents to Document Chunks**: 1:N (A document is split into multiple chunks; deletion cascades).
- **Projects to Messages**: 1:N (A project has a chat history).
- **Messages to Routing Audits**: 1:1 (Each assistant message has a routing log entry).
- **Profiles to Usage Logs**: 1:N (A user's total costs are tracked across projects).

## 3. Indexes

- **B-Tree (Standard)**:
  - `projects(user_id)`: Fast retrieval of a user's projects.
  - `documents(project_id)`: Scoping documents to a project.
  - `document_chunks(project_id)`: Scoping vector searches.
  - `messages(project_id, created_at)`: Efficient chat history loading.
  - `usage_logs(user_id, created_at)`: Monitoring usage limits.

- **Vector (HNSW)**:
  - `document_chunks(embedding)`: `USING hnsw (embedding vector_cosine_ops)` for high-performance semantic search.

## 4. Row-Level Security (RLS) Policies

All tables (except `web_search_cache`) will have RLS enabled.

- **`profiles`**:
  - `SELECT`: `auth.uid() = id`
  - `UPDATE`: `auth.uid() = id`
- **`projects`**:
  - `ALL`: `auth.uid() = user_id`
- **`project_memory`**, **`documents`**, **`messages`**, **`usage_logs`**:
  - `ALL`: `EXISTS (SELECT 1 FROM projects WHERE projects.id = project_id AND projects.user_id = auth.uid())`
- **`document_chunks`**:
  - `ALL`: `EXISTS (SELECT 1 FROM documents JOIN projects ON documents.project_id = projects.id WHERE documents.id = document_id AND projects.user_id = auth.uid())`

## 5. Design Decisions & Notes

- **UUID v7 for Primary Keys**: All tables use UUID v7 (time-ordered) instead of v4 (random). This improves insert performance by keeping the index balanced and allows for natural chronological sorting without relying solely on `created_at`.
- **Embedding Dimension (1536)**: The vector dimension is set to 1536, which is the standard output size for OpenAI's `text-embedding-3-small` and `text-embedding-ada-002` models, ensuring compatibility with state-of-the-art RAG implementations.
- **Unified Memory**: Storing structured facts in a single JSONB record per project (`project_memory`) simplifies retrieval for the Orchestrator, ensuring it always has the full context in one query.
- **HNSW Indexing**: Chosen over IVF to prioritize the 10-second response time requirement, offering faster search at the cost of slightly higher memory usage.
- **Denormalization**: `project_id` is added to `document_chunks` despite being available via `documents` to allow the database to quickly filter embeddings by project before performing vector similarity, which is critical for multi-tenant performance.
- **Audit Trails**: Separate audit tables for memory and routing are included to support the "Success Criteria" (90% routing accuracy) and debug potential AI hallucinations.
- **Check Constraints**: Basic PostgreSQL constraints ensure data integrity for critical fields like `csat_rating` and `role`, while complex JSON schema validation is deferred to the Python backend.

