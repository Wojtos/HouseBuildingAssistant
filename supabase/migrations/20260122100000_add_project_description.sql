-- migration: add_project_description
-- description: Add description column to projects table for UC-0 context injection
-- dependencies: 20251222100200_create_core_tables

-- Add description column to projects table
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS description TEXT;

COMMENT ON COLUMN public.projects.description IS 'Optional project description for AI context awareness';
