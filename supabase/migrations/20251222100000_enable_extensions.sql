-- migration: enable_extensions
-- description: Enable required PostgreSQL extensions for the HomeBuild AI Assistant
-- affected: database-wide extensions
-- dependencies: none
-- 
-- This migration enables the pgvector extension which provides vector data types
-- and vector similarity search capabilities required for RAG (Retrieval Augmented Generation)
-- functionality.

-- Enable the pgvector extension for storing and searching embeddings
-- This extension adds the 'vector' data type and similarity search operators
-- Required for semantic search capabilities in document_chunks table
create extension if not exists vector with schema public;

-- Verify the extension is available
comment on extension vector is 'Vector similarity search for RAG capabilities';

