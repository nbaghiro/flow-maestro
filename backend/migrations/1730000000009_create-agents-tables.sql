-- Migration: Create agents tables
-- Description: Stores AI agents, their executions, and conversation history

-- agents table
CREATE TABLE flowmaestro.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    model VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    connection_id UUID REFERENCES flowmaestro.connections(id) ON DELETE SET NULL,
    system_prompt TEXT NOT NULL,
    temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
    max_tokens INTEGER DEFAULT 4000 CHECK (max_tokens > 0),
    max_iterations INTEGER DEFAULT 100 CHECK (max_iterations > 0 AND max_iterations <= 1000),
    available_tools JSONB DEFAULT '[]'::jsonb,
    memory_config JSONB DEFAULT '{
        "type": "buffer",
        "max_messages": 20
    }'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- agent_executions table
CREATE TABLE flowmaestro.agent_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES flowmaestro.agents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'running',
    conversation_history JSONB DEFAULT '[]'::jsonb,
    iterations INTEGER DEFAULT 0,
    tool_calls_count INTEGER DEFAULT 0,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP,
    error TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    CHECK (status IN ('running', 'completed', 'failed', 'cancelled'))
);

-- agent_messages table (for efficient querying and pagination)
CREATE TABLE flowmaestro.agent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id UUID NOT NULL REFERENCES flowmaestro.agent_executions(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL,
    content TEXT NOT NULL,
    tool_calls JSONB,
    tool_name VARCHAR(255),
    tool_call_id VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (role IN ('user', 'assistant', 'system', 'tool'))
);

-- Indexes for agents table
CREATE INDEX idx_agents_user_id ON flowmaestro.agents(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_agents_created_at ON flowmaestro.agents(created_at DESC);
CREATE INDEX idx_agents_name ON flowmaestro.agents(name) WHERE deleted_at IS NULL;

-- Indexes for agent_executions table
CREATE INDEX idx_agent_executions_agent_id ON flowmaestro.agent_executions(agent_id);
CREATE INDEX idx_agent_executions_user_id ON flowmaestro.agent_executions(user_id);
CREATE INDEX idx_agent_executions_status ON flowmaestro.agent_executions(status);
CREATE INDEX idx_agent_executions_started_at ON flowmaestro.agent_executions(started_at DESC);

-- Indexes for agent_messages table
CREATE INDEX idx_agent_messages_execution_id ON flowmaestro.agent_messages(execution_id);
CREATE INDEX idx_agent_messages_created_at ON flowmaestro.agent_messages(created_at DESC);
CREATE INDEX idx_agent_messages_role ON flowmaestro.agent_messages(role);

-- Trigger for updated_at on agents table
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON flowmaestro.agents
    FOR EACH ROW EXECUTE FUNCTION flowmaestro.update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE flowmaestro.agents IS 'Stores AI agent configurations';
COMMENT ON TABLE flowmaestro.agent_executions IS 'Stores agent execution sessions';
COMMENT ON TABLE flowmaestro.agent_messages IS 'Stores individual messages in agent conversations';

COMMENT ON COLUMN flowmaestro.agents.model IS 'LLM model identifier (e.g., gpt-4, claude-3-opus)';
COMMENT ON COLUMN flowmaestro.agents.provider IS 'LLM provider (openai, anthropic, google, cohere)';
COMMENT ON COLUMN flowmaestro.agents.system_prompt IS 'System prompt that defines agent behavior';
COMMENT ON COLUMN flowmaestro.agents.available_tools IS 'Array of tool definitions available to agent';
COMMENT ON COLUMN flowmaestro.agents.memory_config IS 'Configuration for agent memory management';
COMMENT ON COLUMN flowmaestro.agent_executions.conversation_history IS 'Full conversation history as JSON array';
COMMENT ON COLUMN flowmaestro.agent_messages.tool_calls IS 'Tool calls made by assistant (for assistant role messages)';
