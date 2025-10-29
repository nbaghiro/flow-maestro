-- Migration: Create knowledge base tables for RAG functionality
-- Supports file upload, document processing, embeddings, and similarity search

-- Knowledge Bases table
-- Stores the main knowledge base entities that group documents together
CREATE TABLE flowmaestro.knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    config JSONB NOT NULL DEFAULT '{
        "embeddingModel": "text-embedding-3-small",
        "embeddingProvider": "openai",
        "chunkSize": 1000,
        "chunkOverlap": 200,
        "embeddingDimensions": 1536
    }'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Knowledge Documents table
-- Stores individual documents (files or URLs) within a knowledge base
CREATE TABLE flowmaestro.knowledge_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    knowledge_base_id UUID NOT NULL REFERENCES flowmaestro.knowledge_bases(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- 'file' or 'url'
    source_url TEXT, -- Original URL if source_type is 'url'
    file_path TEXT, -- Local storage path for files
    file_type VARCHAR(50) NOT NULL, -- 'pdf', 'docx', 'txt', 'md', 'html', 'json', 'csv'
    file_size BIGINT, -- File size in bytes
    content TEXT, -- Extracted text content
    metadata JSONB DEFAULT '{}'::jsonb, -- { author, created_date, pages, language, etc. }
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'ready', 'failed'
    error_message TEXT, -- Error details if status is 'failed'
    processing_started_at TIMESTAMP,
    processing_completed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Knowledge Chunks table
-- Stores chunked text with vector embeddings for similarity search
CREATE TABLE flowmaestro.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES flowmaestro.knowledge_documents(id) ON DELETE CASCADE,
    knowledge_base_id UUID NOT NULL REFERENCES flowmaestro.knowledge_bases(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL, -- Sequential index of chunk within document
    content TEXT NOT NULL, -- Actual text content of the chunk
    embedding vector(1536), -- Vector embedding (dimension depends on model, 1536 for text-embedding-3-small)
    token_count INTEGER, -- Number of tokens in this chunk
    metadata JSONB DEFAULT '{}'::jsonb, -- { page, section, heading, start_char, end_char, etc. }
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for performance optimization

-- Knowledge Bases
CREATE INDEX idx_knowledge_bases_user_id ON flowmaestro.knowledge_bases(user_id);
CREATE INDEX idx_knowledge_bases_created_at ON flowmaestro.knowledge_bases(created_at DESC);

-- Knowledge Documents
CREATE INDEX idx_knowledge_documents_kb_id ON flowmaestro.knowledge_documents(knowledge_base_id);
CREATE INDEX idx_knowledge_documents_status ON flowmaestro.knowledge_documents(status);
CREATE INDEX idx_knowledge_documents_created_at ON flowmaestro.knowledge_documents(created_at DESC);
CREATE INDEX idx_knowledge_documents_source_type ON flowmaestro.knowledge_documents(source_type);

-- Knowledge Chunks
CREATE INDEX idx_knowledge_chunks_document_id ON flowmaestro.knowledge_chunks(document_id);
CREATE INDEX idx_knowledge_chunks_kb_id ON flowmaestro.knowledge_chunks(knowledge_base_id);
CREATE INDEX idx_knowledge_chunks_chunk_index ON flowmaestro.knowledge_chunks(document_id, chunk_index);

-- Vector similarity search index using HNSW algorithm
-- This enables fast approximate nearest neighbor search
-- Using cosine distance as the similarity metric
CREATE INDEX idx_knowledge_chunks_embedding_hnsw
ON flowmaestro.knowledge_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Note: HNSW parameters:
-- m = 16: Number of connections per layer (higher = better recall, more memory)
-- ef_construction = 64: Size of dynamic candidate list (higher = better index quality, slower build)

-- Comments for maintenance
COMMENT ON TABLE flowmaestro.knowledge_bases IS 'Stores knowledge base configurations for RAG workflows';
COMMENT ON TABLE flowmaestro.knowledge_documents IS 'Stores source documents (files/URLs) within knowledge bases';
COMMENT ON TABLE flowmaestro.knowledge_chunks IS 'Stores text chunks with vector embeddings for semantic search';
COMMENT ON COLUMN flowmaestro.knowledge_chunks.embedding IS 'Vector embedding for similarity search using cosine distance';
