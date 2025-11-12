-- Enable pgvector extension if not already enabled
-- (Should already be enabled from migration 1730000000004)

-- Ensure public schema is in search path for vector type
SET search_path TO flowmaestro, public;

-- Agent Conversation Embeddings Table
-- Stores vector embeddings for agent conversation messages to enable semantic search
-- with context window retrieval for better conversation continuity

CREATE TABLE IF NOT EXISTS flowmaestro.agent_conversation_embeddings (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Foreign keys
    agent_id UUID NOT NULL REFERENCES flowmaestro.agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,
    execution_id UUID NOT NULL REFERENCES flowmaestro.agent_executions(id) ON DELETE CASCADE,

    -- Message identification
    message_id TEXT NOT NULL, -- ID from ConversationMessage
    message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant', 'system', 'tool')),
    message_index INTEGER NOT NULL, -- Position in conversation (for context windows)

    -- Message content (denormalized for fast retrieval)
    content TEXT NOT NULL,

    -- Vector embedding
    embedding vector(1536) NOT NULL, -- Default OpenAI text-embedding-3-small dimension

    -- Embedding metadata
    embedding_model TEXT NOT NULL, -- e.g., "text-embedding-3-small"
    embedding_provider TEXT NOT NULL, -- e.g., "openai"

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Ensure unique constraint
    UNIQUE(execution_id, message_id)
);

-- Indexes for efficient querying

-- 1. Primary lookup by execution
CREATE INDEX idx_agent_conv_embeddings_execution
ON flowmaestro.agent_conversation_embeddings(execution_id);

-- 2. Lookup by agent and user (for cross-execution memory)
CREATE INDEX idx_agent_conv_embeddings_agent_user
ON flowmaestro.agent_conversation_embeddings(agent_id, user_id);

-- 3. Vector similarity search (HNSW index for fast nearest neighbor search)
CREATE INDEX idx_agent_conv_embeddings_vector
ON flowmaestro.agent_conversation_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 4. Message ordering within execution (for context windows)
CREATE INDEX idx_agent_conv_embeddings_exec_index
ON flowmaestro.agent_conversation_embeddings(execution_id, message_index);

-- 5. Composite index for filtered similarity search
CREATE INDEX idx_agent_conv_embeddings_agent_user_created
ON flowmaestro.agent_conversation_embeddings(agent_id, user_id, created_at DESC);

-- 6. Message role filtering (e.g., search only user or assistant messages)
CREATE INDEX idx_agent_conv_embeddings_role
ON flowmaestro.agent_conversation_embeddings(message_role);

-- Comments
COMMENT ON TABLE flowmaestro.agent_conversation_embeddings IS
'Stores vector embeddings of agent conversation messages for semantic search with context window retrieval';

COMMENT ON COLUMN flowmaestro.agent_conversation_embeddings.message_index IS
'Zero-based position of message in conversation, used for retrieving context windows (N messages before/after)';

COMMENT ON COLUMN flowmaestro.agent_conversation_embeddings.embedding IS
'Vector embedding of message content for semantic similarity search';

COMMENT ON INDEX idx_agent_conv_embeddings_vector IS
'HNSW index for fast approximate nearest neighbor search using cosine similarity';
