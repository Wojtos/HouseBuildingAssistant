-- migration: enable_rls_policies
-- description: Create Row Level Security policies for all tables
-- affected: all tables with RLS enabled
-- dependencies: 20251222100300_create_indexes
--
-- This migration creates granular RLS policies for each table and operation type.
-- Policies are split by role (authenticated/anon) and operation (select/insert/update/delete)
-- for maximum clarity and maintainability.
--
-- Security Model:
-- - Users can only access their own data
-- - Project-related data is accessible only to the project owner
-- - Document chunks inherit permissions through the documents->projects chain
-- - Audit tables follow the same project-based permissions

-- =============================================================================
-- PROFILES TABLE POLICIES
-- =============================================================================

-- Users can view their own profile
create policy "authenticated users can select their own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

comment on policy "authenticated users can select their own profile" on public.profiles is 
'Allows users to read their own profile data';

-- Users can update their own profile
create policy "authenticated users can update their own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

comment on policy "authenticated users can update their own profile" on public.profiles is 
'Allows users to modify their own profile settings';

-- Note: Profile creation is handled by trigger, so no insert policy needed
-- Note: Profile deletion cascades from auth.users deletion

-- =============================================================================
-- PROJECTS TABLE POLICIES
-- =============================================================================

-- Users can view their own projects
create policy "authenticated users can select their own projects"
on public.projects for select
to authenticated
using (auth.uid() = user_id);

comment on policy "authenticated users can select their own projects" on public.projects is 
'Allows users to view all projects they own';

-- Users can create projects for themselves
create policy "authenticated users can insert their own projects"
on public.projects for insert
to authenticated
with check (auth.uid() = user_id);

comment on policy "authenticated users can insert their own projects" on public.projects is 
'Allows users to create new projects under their account';

-- Users can update their own projects
create policy "authenticated users can update their own projects"
on public.projects for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

comment on policy "authenticated users can update their own projects" on public.projects is 
'Allows users to modify projects they own (prevents ownership transfer)';

-- Users can delete their own projects
create policy "authenticated users can delete their own projects"
on public.projects for delete
to authenticated
using (auth.uid() = user_id);

comment on policy "authenticated users can delete their own projects" on public.projects is 
'Allows users to delete projects they own (cascades to related data)';

-- =============================================================================
-- PROJECT_MEMORY TABLE POLICIES
-- =============================================================================

-- Users can view memory for their projects
create policy "authenticated users can select memory for their projects"
on public.project_memory for select
to authenticated
using (
    exists (
        select 1 from public.projects
        where projects.id = project_memory.project_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can select memory for their projects" on public.project_memory is 
'Allows users to read project memory for projects they own';

-- Users can create memory for their projects
create policy "authenticated users can insert memory for their projects"
on public.project_memory for insert
to authenticated
with check (
    exists (
        select 1 from public.projects
        where projects.id = project_memory.project_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can insert memory for their projects" on public.project_memory is 
'Allows users to create project memory for projects they own';

-- Users can update memory for their projects
create policy "authenticated users can update memory for their projects"
on public.project_memory for update
to authenticated
using (
    exists (
        select 1 from public.projects
        where projects.id = project_memory.project_id
        and projects.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.projects
        where projects.id = project_memory.project_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can update memory for their projects" on public.project_memory is 
'Allows users to modify project memory for projects they own';

-- Users can delete memory for their projects
create policy "authenticated users can delete memory for their projects"
on public.project_memory for delete
to authenticated
using (
    exists (
        select 1 from public.projects
        where projects.id = project_memory.project_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can delete memory for their projects" on public.project_memory is 
'Allows users to delete project memory for projects they own';

-- =============================================================================
-- DOCUMENTS TABLE POLICIES
-- =============================================================================

-- Users can view documents in their projects
create policy "authenticated users can select documents for their projects"
on public.documents for select
to authenticated
using (
    exists (
        select 1 from public.projects
        where projects.id = documents.project_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can select documents for their projects" on public.documents is 
'Allows users to view documents in projects they own';

-- Users can upload documents to their projects
create policy "authenticated users can insert documents for their projects"
on public.documents for insert
to authenticated
with check (
    exists (
        select 1 from public.projects
        where projects.id = documents.project_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can insert documents for their projects" on public.documents is 
'Allows users to upload documents to projects they own';

-- Users can update documents in their projects
create policy "authenticated users can update documents for their projects"
on public.documents for update
to authenticated
using (
    exists (
        select 1 from public.projects
        where projects.id = documents.project_id
        and projects.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.projects
        where projects.id = documents.project_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can update documents for their projects" on public.documents is 
'Allows users to modify documents in projects they own';

-- Users can delete documents from their projects
create policy "authenticated users can delete documents for their projects"
on public.documents for delete
to authenticated
using (
    exists (
        select 1 from public.projects
        where projects.id = documents.project_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can delete documents for their projects" on public.documents is 
'Allows users to delete documents from projects they own (cascades to chunks)';

-- =============================================================================
-- DOCUMENT_CHUNKS TABLE POLICIES
-- =============================================================================

-- Users can view chunks from their project documents
create policy "authenticated users can select chunks for their projects"
on public.document_chunks for select
to authenticated
using (
    exists (
        select 1 from public.projects
        where projects.id = document_chunks.project_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can select chunks for their projects" on public.document_chunks is 
'Allows users to view document chunks from projects they own (optimized with denormalized project_id)';

-- Users can create chunks for their project documents
create policy "authenticated users can insert chunks for their projects"
on public.document_chunks for insert
to authenticated
with check (
    exists (
        select 1 from public.projects
        where projects.id = document_chunks.project_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can insert chunks for their projects" on public.document_chunks is 
'Allows users to create document chunks for projects they own';

-- Users can update chunks in their project documents
create policy "authenticated users can update chunks for their projects"
on public.document_chunks for update
to authenticated
using (
    exists (
        select 1 from public.projects
        where projects.id = document_chunks.project_id
        and projects.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.projects
        where projects.id = document_chunks.project_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can update chunks for their projects" on public.document_chunks is 
'Allows users to modify document chunks for projects they own';

-- Users can delete chunks from their project documents
create policy "authenticated users can delete chunks for their projects"
on public.document_chunks for delete
to authenticated
using (
    exists (
        select 1 from public.projects
        where projects.id = document_chunks.project_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can delete chunks for their projects" on public.document_chunks is 
'Allows users to delete document chunks from projects they own';

-- =============================================================================
-- MESSAGES TABLE POLICIES
-- =============================================================================

-- Users can view messages in their projects
create policy "authenticated users can select messages for their projects"
on public.messages for select
to authenticated
using (
    exists (
        select 1 from public.projects
        where projects.id = messages.project_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can select messages for their projects" on public.messages is 
'Allows users to view chat history for projects they own';

-- Users can create messages in their projects
create policy "authenticated users can insert messages for their projects"
on public.messages for insert
to authenticated
with check (
    exists (
        select 1 from public.projects
        where projects.id = messages.project_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can insert messages for their projects" on public.messages is 
'Allows users to send messages in projects they own';

-- Users can update messages in their projects (e.g., adding CSAT ratings)
create policy "authenticated users can update messages for their projects"
on public.messages for update
to authenticated
using (
    exists (
        select 1 from public.projects
        where projects.id = messages.project_id
        and projects.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.projects
        where projects.id = messages.project_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can update messages for their projects" on public.messages is 
'Allows users to update messages in projects they own (e.g., adding satisfaction ratings)';

-- Users can delete messages from their projects
create policy "authenticated users can delete messages for their projects"
on public.messages for delete
to authenticated
using (
    exists (
        select 1 from public.projects
        where projects.id = messages.project_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can delete messages for their projects" on public.messages is 
'Allows users to delete messages from projects they own';

-- =============================================================================
-- MEMORY_AUDIT_TRAIL TABLE POLICIES
-- =============================================================================

-- Users can view audit trail for their projects
create policy "authenticated users can select audit trail for their projects"
on public.memory_audit_trail for select
to authenticated
using (
    exists (
        select 1 from public.projects
        where projects.id = memory_audit_trail.project_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can select audit trail for their projects" on public.memory_audit_trail is 
'Allows users to view memory change history for projects they own';

-- Backend service can insert audit records
-- Note: Insert policy allows authenticated users (backend runs as service role)
create policy "authenticated users can insert audit trail for their projects"
on public.memory_audit_trail for insert
to authenticated
with check (
    exists (
        select 1 from public.projects
        where projects.id = memory_audit_trail.project_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can insert audit trail for their projects" on public.memory_audit_trail is 
'Allows backend services to create audit records for memory changes';

-- Audit records should not be updated or deleted (append-only log)
-- No update or delete policies intentionally omitted

-- =============================================================================
-- ROUTING_AUDITS TABLE POLICIES
-- =============================================================================

-- Users can view routing audits for messages in their projects
create policy "authenticated users can select routing audits for their projects"
on public.routing_audits for select
to authenticated
using (
    exists (
        select 1 from public.messages
        join public.projects on projects.id = messages.project_id
        where messages.id = routing_audits.message_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can select routing audits for their projects" on public.routing_audits is 
'Allows users to view routing decisions for messages in projects they own';

-- Backend service can insert routing audit records
create policy "authenticated users can insert routing audits for their projects"
on public.routing_audits for insert
to authenticated
with check (
    exists (
        select 1 from public.messages
        join public.projects on projects.id = messages.project_id
        where messages.id = routing_audits.message_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can insert routing audits for their projects" on public.routing_audits is 
'Allows backend services to create routing audit records';

-- Backend may update confidence scores or reasoning after initial creation
create policy "authenticated users can update routing audits for their projects"
on public.routing_audits for update
to authenticated
using (
    exists (
        select 1 from public.messages
        join public.projects on projects.id = messages.project_id
        where messages.id = routing_audits.message_id
        and projects.user_id = auth.uid()
    )
)
with check (
    exists (
        select 1 from public.messages
        join public.projects on projects.id = messages.project_id
        where messages.id = routing_audits.message_id
        and projects.user_id = auth.uid()
    )
);

comment on policy "authenticated users can update routing audits for their projects" on public.routing_audits is 
'Allows backend services to update routing audit records';

-- =============================================================================
-- USAGE_LOGS TABLE POLICIES
-- =============================================================================

-- Users can view their own usage logs
create policy "authenticated users can select their own usage logs"
on public.usage_logs for select
to authenticated
using (auth.uid() = user_id);

comment on policy "authenticated users can select their own usage logs" on public.usage_logs is 
'Allows users to view their own API usage and costs';

-- Backend service can insert usage logs
create policy "authenticated users can insert their own usage logs"
on public.usage_logs for insert
to authenticated
with check (auth.uid() = user_id);

comment on policy "authenticated users can insert their own usage logs" on public.usage_logs is 
'Allows backend services to log usage for authenticated users';

-- Usage logs should not be updated or deleted (append-only log)
-- No update or delete policies intentionally omitted



