-- migration: add_deleted_at_columns
-- description: Add deleted_at columns for soft delete functionality on projects and documents
-- affected: projects, documents
-- dependencies: 20251222100200_create_core_tables
--
-- This migration adds soft delete support by adding deleted_at timestamp columns
-- to projects and documents tables.

-- =============================================================================
-- ADD DELETED_AT COLUMNS
-- =============================================================================

-- Add deleted_at to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

COMMENT ON COLUMN public.projects.deleted_at IS 'Soft delete timestamp - when set, project is considered archived';

-- Add deleted_at to documents table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone DEFAULT NULL;

COMMENT ON COLUMN public.documents.deleted_at IS 'Soft delete timestamp - when set, document is considered archived';

-- =============================================================================
-- INDEXES FOR SOFT DELETE QUERIES
-- =============================================================================

-- Index for filtering non-deleted projects
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON public.projects(deleted_at)
WHERE deleted_at IS NULL;

-- Index for filtering non-deleted documents
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON public.documents(deleted_at)
WHERE deleted_at IS NULL;

-- Composite index for project documents query (common query pattern)
CREATE INDEX IF NOT EXISTS idx_documents_project_id_deleted_at ON public.documents(project_id, deleted_at)
WHERE deleted_at IS NULL;
