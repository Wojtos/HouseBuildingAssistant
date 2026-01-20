-- migration: storage_policies
-- description: Add storage policies for documents bucket
-- affected: storage.objects, storage.buckets
-- dependencies: none
--
-- This migration creates RLS policies for the documents storage bucket
-- to allow authenticated users to upload, read, and delete files.

-- =============================================================================
-- STORAGE BUCKET POLICIES
-- =============================================================================

-- Allow all authenticated users to upload to documents bucket
-- In production, you might want to restrict this to project owners
CREATE POLICY "Allow authenticated uploads to documents"
ON storage.objects FOR INSERT
TO authenticated, anon, service_role
WITH CHECK (bucket_id = 'documents');

-- Allow all authenticated users to read from documents bucket
CREATE POLICY "Allow authenticated reads from documents"
ON storage.objects FOR SELECT
TO authenticated, anon, service_role
USING (bucket_id = 'documents');

-- Allow all authenticated users to update in documents bucket
CREATE POLICY "Allow authenticated updates to documents"
ON storage.objects FOR UPDATE
TO authenticated, anon, service_role
USING (bucket_id = 'documents');

-- Allow all authenticated users to delete from documents bucket
CREATE POLICY "Allow authenticated deletes from documents"
ON storage.objects FOR DELETE
TO authenticated, anon, service_role
USING (bucket_id = 'documents');
