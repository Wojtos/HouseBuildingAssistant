-- migration: create_core_tables
-- description: Create all core tables for the HomeBuild AI Assistant
-- affected: profiles, projects, project_memory, documents, document_chunks, messages,
--           memory_audit_trail, routing_audits, web_search_cache, usage_logs
-- dependencies: 20251222100000_enable_extensions, 20251222100100_create_enums
--
-- This migration creates all application tables with proper constraints, defaults,
-- and relationships. Row Level Security is enabled but policies are applied in a
-- separate migration.

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- profiles: Extends Supabase Auth users with application-specific metadata
-- -----------------------------------------------------------------------------
create table public.profiles (
    id uuid primary key references auth.users on delete cascade,
    full_name text,
    preferred_units public.measurement_unit not null default 'METRIC',
    language varchar(2) not null default 'en',
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

comment on table public.profiles is 'User profiles extending Supabase Auth with application-specific preferences';
comment on column public.profiles.id is 'References auth.users.id - profile is created via trigger on user signup';
comment on column public.profiles.preferred_units is 'User preference for measurement system (metric vs imperial)';
comment on column public.profiles.language is 'ISO 639-1 two-letter language code';

-- Enable RLS on profiles table (policies will be added in separate migration)
alter table public.profiles enable row level security;

-- -----------------------------------------------------------------------------
-- projects: Users can manage multiple construction projects
-- -----------------------------------------------------------------------------
create table public.projects (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    name text not null,
    location text,
    current_phase public.construction_phase not null default 'LAND_SELECTION',
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

comment on table public.projects is 'Construction projects managed by users';
comment on column public.projects.id is 'UUID v7 recommended for time-ordered sorting (implemented at application layer)';
comment on column public.projects.user_id is 'Owner of the project';
comment on column public.projects.current_phase is 'Current phase in the construction lifecycle';

-- Enable RLS on projects table
alter table public.projects enable row level security;

-- -----------------------------------------------------------------------------
-- project_memory: Stores structured "facts" for a project in JSONB
-- -----------------------------------------------------------------------------
create table public.project_memory (
    id uuid primary key default gen_random_uuid(),
    project_id uuid unique not null references public.projects(id) on delete cascade,
    data jsonb not null default '{}',
    updated_at timestamp with time zone not null default now(),
    
    -- Ensure data is a valid JSON object (detailed validation happens in backend)
    constraint project_memory_data_is_object check (jsonb_typeof(data) = 'object')
);

comment on table public.project_memory is 'Unified structured memory store for project facts and context';
comment on column public.project_memory.project_id is 'One-to-one relationship with projects table';
comment on column public.project_memory.data is 'JSONB object containing structured project facts for AI context';
comment on constraint project_memory_data_is_object on public.project_memory is 'Ensures data column always contains a JSON object, not array or primitive';

-- Enable RLS on project_memory table
alter table public.project_memory enable row level security;

-- -----------------------------------------------------------------------------
-- documents: Metadata for files uploaded to Supabase Storage
-- -----------------------------------------------------------------------------
create table public.documents (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    name text not null,
    storage_path text not null,
    file_type text,
    processing_state public.processing_state not null default 'UPLOADED',
    error_message text,
    created_at timestamp with time zone not null default now()
);

comment on table public.documents is 'Metadata for documents uploaded to Supabase Storage';
comment on column public.documents.storage_path is 'Path to file in Supabase Storage bucket';
comment on column public.documents.processing_state is 'Current state in OCR/embedding pipeline';
comment on column public.documents.error_message is 'Populated when processing_state is FAILED';

-- Enable RLS on documents table
alter table public.documents enable row level security;

-- -----------------------------------------------------------------------------
-- document_chunks: OCR-extracted text chunks and their vector embeddings
-- -----------------------------------------------------------------------------
create table public.document_chunks (
    id uuid primary key default gen_random_uuid(),
    document_id uuid not null references public.documents(id) on delete cascade,
    project_id uuid not null references public.projects(id) on delete cascade,
    content text not null,
    embedding vector(1536),
    embedding_model text,
    chunk_index integer not null,
    metadata jsonb default '{}',
    created_at timestamp with time zone not null default now()
);

comment on table public.document_chunks is 'Text chunks extracted from documents with vector embeddings for semantic search';
comment on column public.document_chunks.document_id is 'Parent document reference (cascades on delete)';
comment on column public.document_chunks.project_id is 'Denormalized for efficient project-scoped vector searches';
comment on column public.document_chunks.embedding is 'Vector embedding (1536 dimensions for OpenAI text-embedding-3-small)';
comment on column public.document_chunks.embedding_model is 'Model used to generate embedding (e.g., text-embedding-3-small)';
comment on column public.document_chunks.chunk_index is 'Sequential index of chunk within parent document';
comment on column public.document_chunks.metadata is 'Additional metadata like page numbers, categories, etc.';

-- Enable RLS on document_chunks table
alter table public.document_chunks enable row level security;

-- -----------------------------------------------------------------------------
-- messages: Chat history between user and AI agents
-- -----------------------------------------------------------------------------
create table public.messages (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    user_id uuid not null references public.profiles(id) on delete cascade,
    role text not null,
    content text not null,
    agent_id text,
    routing_metadata jsonb default '{}',
    csat_rating integer,
    created_at timestamp with time zone not null default now(),
    
    -- Ensure role is either 'user' or 'assistant'
    constraint messages_role_check check (role in ('user', 'assistant')),
    
    -- Ensure CSAT rating is between 1 and 5 if provided
    constraint messages_csat_rating_check check (csat_rating is null or (csat_rating >= 1 and csat_rating <= 5))
);

comment on table public.messages is 'Chat history between users and AI agents';
comment on column public.messages.role is 'Message sender: user or assistant';
comment on column public.messages.agent_id is 'ID of specialized agent that generated the response (null for user messages)';
comment on column public.messages.routing_metadata is 'Orchestrator decision data for this message';
comment on column public.messages.csat_rating is 'Customer satisfaction rating (1-5 scale, optional)';

-- Enable RLS on messages table
alter table public.messages enable row level security;

-- =============================================================================
-- AUDIT AND UTILITY TABLES
-- =============================================================================

-- -----------------------------------------------------------------------------
-- memory_audit_trail: Tracks changes to structured project memory
-- -----------------------------------------------------------------------------
create table public.memory_audit_trail (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references public.projects(id) on delete cascade,
    agent_id text,
    change_summary text,
    previous_data jsonb,
    new_data jsonb,
    created_at timestamp with time zone not null default now()
);

comment on table public.memory_audit_trail is 'Audit log for all changes to project_memory table';
comment on column public.memory_audit_trail.agent_id is 'ID of the AI agent that made the change';
comment on column public.memory_audit_trail.change_summary is 'Human-readable description of what changed';
comment on column public.memory_audit_trail.previous_data is 'Snapshot of data before the change';
comment on column public.memory_audit_trail.new_data is 'Snapshot of data after the change';

-- Enable RLS on memory_audit_trail table
alter table public.memory_audit_trail enable row level security;

-- -----------------------------------------------------------------------------
-- routing_audits: Logs orchestrator decisions for performance analysis
-- -----------------------------------------------------------------------------
create table public.routing_audits (
    id uuid primary key default gen_random_uuid(),
    message_id uuid not null references public.messages(id) on delete cascade,
    orchestrator_decision text,
    confidence_score numeric,
    reasoning text,
    created_at timestamp with time zone not null default now(),
    updated_at timestamp with time zone not null default now()
);

comment on table public.routing_audits is 'Audit log for AI orchestrator routing decisions';
comment on column public.routing_audits.message_id is 'Reference to the assistant message this decision produced';
comment on column public.routing_audits.orchestrator_decision is 'Which agent was selected by the orchestrator';
comment on column public.routing_audits.confidence_score is 'Confidence level of the routing decision (0.0-1.0)';
comment on column public.routing_audits.reasoning is 'Explanation of why this agent was chosen';

-- Enable RLS on routing_audits table
alter table public.routing_audits enable row level security;

-- -----------------------------------------------------------------------------
-- web_search_cache: Caches Google Search results to reduce costs
-- -----------------------------------------------------------------------------
create table public.web_search_cache (
    query_hash text primary key,
    query text not null,
    results jsonb not null,
    expires_at timestamp with time zone not null,
    created_at timestamp with time zone not null default now()
);

comment on table public.web_search_cache is 'Cache for external web search results to reduce API costs';
comment on column public.web_search_cache.query_hash is 'MD5 hash of normalized query for fast lookup';
comment on column public.web_search_cache.query is 'Original search query text';
comment on column public.web_search_cache.results is 'Cached search results in JSON format';
comment on column public.web_search_cache.expires_at is 'When this cache entry should be considered stale';

-- Note: RLS not enabled on web_search_cache as it's a shared cache table
-- accessed by backend services, not directly by users

-- -----------------------------------------------------------------------------
-- usage_logs: Tracks token usage and API costs
-- -----------------------------------------------------------------------------
create table public.usage_logs (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    project_id uuid references public.projects(id) on delete set null,
    token_count integer,
    estimated_cost numeric(10, 6),
    api_name text,
    created_at timestamp with time zone not null default now()
);

comment on table public.usage_logs is 'Tracks API usage and costs per user and project';
comment on column public.usage_logs.user_id is 'User who incurred the cost';
comment on column public.usage_logs.project_id is 'Related project (nullable for user-level operations)';
comment on column public.usage_logs.token_count is 'Number of tokens consumed';
comment on column public.usage_logs.estimated_cost is 'Estimated cost in USD';
comment on column public.usage_logs.api_name is 'API service used (e.g., OpenRouter, Google Search)';

-- Enable RLS on usage_logs table
alter table public.usage_logs enable row level security;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Function to automatically update updated_at timestamp
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql security definer;

comment on function public.handle_updated_at is 'Trigger function to automatically update updated_at timestamp';

-- Apply updated_at trigger to relevant tables
create trigger set_updated_at before update on public.profiles
    for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.projects
    for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.project_memory
    for each row execute function public.handle_updated_at();

create trigger set_updated_at before update on public.routing_audits
    for each row execute function public.handle_updated_at();

-- Function to automatically create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, full_name, created_at, updated_at)
    values (new.id, new.raw_user_meta_data->>'full_name', now(), now());
    return new;
end;
$$ language plpgsql security definer;

comment on function public.handle_new_user is 'Automatically creates a profile entry when a new user signs up';

-- Trigger to create profile on user signup
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();



