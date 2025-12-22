-- migration: disable_rls_policies
-- description: Drop all Row Level Security policies created in 20251222100400_enable_rls_policies
-- affected: all tables with RLS policies
-- dependencies: 20251222100400_enable_rls_policies
--
-- This migration removes all RLS policies to disable access restrictions.
-- Tables will still have RLS enabled, but without policies no access will be granted
-- (except for service role which bypasses RLS).

-- =============================================================================
-- DROP PROFILES TABLE POLICIES
-- =============================================================================

drop policy if exists "authenticated users can select their own profile" on public.profiles;
drop policy if exists "authenticated users can update their own profile" on public.profiles;

-- =============================================================================
-- DROP PROJECTS TABLE POLICIES
-- =============================================================================

drop policy if exists "authenticated users can select their own projects" on public.projects;
drop policy if exists "authenticated users can insert their own projects" on public.projects;
drop policy if exists "authenticated users can update their own projects" on public.projects;
drop policy if exists "authenticated users can delete their own projects" on public.projects;

-- =============================================================================
-- DROP PROJECT_MEMORY TABLE POLICIES
-- =============================================================================

drop policy if exists "authenticated users can select memory for their projects" on public.project_memory;
drop policy if exists "authenticated users can insert memory for their projects" on public.project_memory;
drop policy if exists "authenticated users can update memory for their projects" on public.project_memory;
drop policy if exists "authenticated users can delete memory for their projects" on public.project_memory;

-- =============================================================================
-- DROP DOCUMENTS TABLE POLICIES
-- =============================================================================

drop policy if exists "authenticated users can select documents for their projects" on public.documents;
drop policy if exists "authenticated users can insert documents for their projects" on public.documents;
drop policy if exists "authenticated users can update documents for their projects" on public.documents;
drop policy if exists "authenticated users can delete documents for their projects" on public.documents;

-- =============================================================================
-- DROP DOCUMENT_CHUNKS TABLE POLICIES
-- =============================================================================

drop policy if exists "authenticated users can select chunks for their projects" on public.document_chunks;
drop policy if exists "authenticated users can insert chunks for their projects" on public.document_chunks;
drop policy if exists "authenticated users can update chunks for their projects" on public.document_chunks;
drop policy if exists "authenticated users can delete chunks for their projects" on public.document_chunks;

-- =============================================================================
-- DROP MESSAGES TABLE POLICIES
-- =============================================================================

drop policy if exists "authenticated users can select messages for their projects" on public.messages;
drop policy if exists "authenticated users can insert messages for their projects" on public.messages;
drop policy if exists "authenticated users can update messages for their projects" on public.messages;
drop policy if exists "authenticated users can delete messages for their projects" on public.messages;

-- =============================================================================
-- DROP MEMORY_AUDIT_TRAIL TABLE POLICIES
-- =============================================================================

drop policy if exists "authenticated users can select audit trail for their projects" on public.memory_audit_trail;
drop policy if exists "authenticated users can insert audit trail for their projects" on public.memory_audit_trail;

-- =============================================================================
-- DROP ROUTING_AUDITS TABLE POLICIES
-- =============================================================================

drop policy if exists "authenticated users can select routing audits for their projects" on public.routing_audits;
drop policy if exists "authenticated users can insert routing audits for their projects" on public.routing_audits;
drop policy if exists "authenticated users can update routing audits for their projects" on public.routing_audits;

-- =============================================================================
-- DROP USAGE_LOGS TABLE POLICIES
-- =============================================================================

drop policy if exists "authenticated users can select their own usage logs" on public.usage_logs;
drop policy if exists "authenticated users can insert their own usage logs" on public.usage_logs;

