-- migration: create_indexes
-- description: Create indexes for optimized query performance
-- affected: projects, documents, document_chunks, messages, usage_logs
-- dependencies: 20251222100200_create_core_tables
--
-- This migration creates both standard B-tree indexes for relational queries
-- and HNSW vector indexes for efficient semantic search.

-- =============================================================================
-- B-TREE INDEXES (Standard Relational Queries)
-- =============================================================================

-- Index for retrieving all projects belonging to a user
-- Used frequently in project listing and filtering operations
create index idx_projects_user_id on public.projects(user_id);

comment on index public.idx_projects_user_id is 'Optimizes queries filtering projects by user_id';

-- Index for retrieving all documents in a project
-- Used when displaying project documents and during document processing
create index idx_documents_project_id on public.documents(project_id);

comment on index public.idx_documents_project_id is 'Optimizes queries filtering documents by project_id';

-- Composite index for document processing state queries
-- Allows efficient lookup of documents by state for background processing jobs
create index idx_documents_processing_state on public.documents(processing_state, created_at);

comment on index public.idx_documents_processing_state is 'Optimizes queries for finding documents by processing state, ordered by creation time';

-- Index for project-scoped vector searches
-- CRITICAL: This index allows the database to filter by project_id before
-- performing expensive vector similarity searches, ensuring multi-tenant performance
create index idx_document_chunks_project_id on public.document_chunks(project_id);

comment on index public.idx_document_chunks_project_id is 'Optimizes project-scoped RAG queries by allowing pre-filtering before vector search';

-- Index for retrieving all chunks belonging to a document
-- Used when displaying document details or reprocessing documents
create index idx_document_chunks_document_id on public.document_chunks(document_id);

comment on index public.idx_document_chunks_document_id is 'Optimizes queries filtering chunks by document_id';

-- Composite index for efficient chat history retrieval
-- Supports queries that load recent messages for a project
create index idx_messages_project_created on public.messages(project_id, created_at desc);

comment on index public.idx_messages_project_created is 'Optimizes chat history queries with project scoping and time-based ordering';

-- Index for filtering messages by user
-- Used for user-specific message history and analytics
create index idx_messages_user_id on public.messages(user_id);

comment on index public.idx_messages_user_id is 'Optimizes queries filtering messages by user_id';

-- Index for message role filtering
-- Useful for analytics that separate user vs assistant messages
create index idx_messages_role on public.messages(role);

comment on index public.idx_messages_role is 'Optimizes queries filtering messages by role (user/assistant)';

-- Composite index for user cost monitoring and usage analytics
-- Supports queries that track usage over time for billing/limits
create index idx_usage_logs_user_created on public.usage_logs(user_id, created_at desc);

comment on index public.idx_usage_logs_user_created is 'Optimizes usage tracking queries with user scoping and time-based ordering';

-- Index for project-level cost tracking
-- Allows efficient project cost rollups and analytics
create index idx_usage_logs_project_id on public.usage_logs(project_id) where project_id is not null;

comment on index public.idx_usage_logs_project_id is 'Optimizes project-specific usage queries (partial index excludes nulls)';

-- Index for audit trail queries
-- Used when investigating changes to a specific project's memory
create index idx_memory_audit_project_created on public.memory_audit_trail(project_id, created_at desc);

comment on index public.idx_memory_audit_project_created is 'Optimizes memory change history queries with project scoping and time ordering';

-- Index for routing audit analysis
-- Used to track orchestrator performance and debug routing decisions
create index idx_routing_audits_message_id on public.routing_audits(message_id);

comment on index public.idx_routing_audits_message_id is 'Optimizes lookup of routing decisions for specific messages';

-- Index for orchestrator performance analysis
-- Supports queries analyzing confidence scores over time
create index idx_routing_audits_created on public.routing_audits(created_at desc);

comment on index public.idx_routing_audits_created is 'Optimizes time-based queries for routing audit analytics';

-- =============================================================================
-- VECTOR INDEXES (Semantic Search)
-- =============================================================================

-- HNSW index for vector similarity search on document embeddings
-- HNSW (Hierarchical Navigable Small World) provides faster search than IVFFlat
-- at the cost of slightly higher memory usage - chosen to meet 10-second response
-- time requirement for RAG queries
--
-- Parameters:
-- - vector_cosine_ops: Use cosine distance (most common for text embeddings)
-- - m=16: Number of connections per node (default, good balance of speed/memory)
-- - ef_construction=64: Size of dynamic candidate list during index build (default)
--
-- Note: Index creation may take time on large datasets. Consider creating with
-- lower ef_construction initially, then recreating if needed.
create index idx_document_chunks_embedding on public.document_chunks 
using hnsw (embedding vector_cosine_ops)
with (m = 16, ef_construction = 64);

comment on index public.idx_document_chunks_embedding is 'HNSW index for fast cosine similarity search on embeddings (optimized for <10s response time)';

-- Composite index combining project filtering with vector search
-- This allows the query planner to efficiently filter by project_id before
-- performing vector similarity, which is critical for multi-tenant performance
-- Note: pgvector doesn't support multi-column vector indexes, so we rely on
-- the separate idx_document_chunks_project_id and query planner optimization


