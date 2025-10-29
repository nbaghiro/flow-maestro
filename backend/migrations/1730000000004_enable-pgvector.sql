-- Migration: Enable pgvector extension for vector similarity search
-- This extension adds support for storing and querying vector embeddings

-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify the extension is installed
-- You can query: SELECT * FROM pg_extension WHERE extname = 'vector';
