-- Migration: Cleanup local knowledge base files
-- This migration cleans up existing knowledge base data that was stored locally
-- All new uploads will use GCS storage

-- Delete all existing knowledge chunks (will cascade from documents)
DELETE FROM flowmaestro.knowledge_chunks;

-- Delete all existing knowledge documents
DELETE FROM flowmaestro.knowledge_documents;

-- Note: We're not deleting knowledge_bases table records
-- Users can keep their knowledge base configurations and re-upload documents

-- Add comment to file_path column to document that it now stores GCS URIs
COMMENT ON COLUMN flowmaestro.knowledge_documents.file_path
IS 'GCS URI in format: gs://bucket-name/user-id/kb-id/timestamp_filename';

-- Add comment to source_type column for clarity
COMMENT ON COLUMN flowmaestro.knowledge_documents.source_type
IS 'Source type: "file" for uploaded files (stored in GCS) or "url" for web URLs';
