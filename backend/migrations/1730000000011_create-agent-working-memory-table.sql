-- Migration: Create Agent Working Memory Table
-- Implements persistent working memory for agents with mutex protection

-- Create agent_working_memory table
CREATE TABLE IF NOT EXISTS flowmaestro.agent_working_memory (
    agent_id UUID NOT NULL,
    user_id UUID NOT NULL,
    working_memory TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    PRIMARY KEY (agent_id, user_id)
);

-- Create index for user lookups
CREATE INDEX IF NOT EXISTS idx_agent_working_memory_user_id
ON flowmaestro.agent_working_memory (user_id);

-- Create index for recent updates
CREATE INDEX IF NOT EXISTS idx_agent_working_memory_updated_at
ON flowmaestro.agent_working_memory (updated_at DESC);

-- Add foreign key constraints
ALTER TABLE flowmaestro.agent_working_memory
ADD CONSTRAINT fk_agent_working_memory_agent
FOREIGN KEY (agent_id) REFERENCES flowmaestro.agents(id) ON DELETE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE flowmaestro.agent_working_memory IS 'Persistent working memory for agents - stores key facts and context about users';
COMMENT ON COLUMN flowmaestro.agent_working_memory.agent_id IS 'ID of the agent this memory belongs to';
COMMENT ON COLUMN flowmaestro.agent_working_memory.user_id IS 'ID of the user this memory is about';
COMMENT ON COLUMN flowmaestro.agent_working_memory.working_memory IS 'Text content of working memory - key facts about the user';
COMMENT ON COLUMN flowmaestro.agent_working_memory.updated_at IS 'Last time this memory was updated';
COMMENT ON COLUMN flowmaestro.agent_working_memory.metadata IS 'Additional metadata (e.g., update history, tags)';
