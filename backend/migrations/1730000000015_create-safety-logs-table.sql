-- Migration: Create safety logs table
-- Purpose: Track all safety events for auditing and monitoring

BEGIN;

-- Create safety_logs table
CREATE TABLE IF NOT EXISTS flowmaestro.safety_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES flowmaestro.agents(id) ON DELETE CASCADE,
    execution_id UUID REFERENCES flowmaestro.agent_executions(id) ON DELETE CASCADE,
    thread_id UUID REFERENCES flowmaestro.threads(id) ON DELETE SET NULL,

    -- Safety check details
    check_type VARCHAR(50) NOT NULL CHECK (check_type IN (
        'pii_detection',
        'prompt_injection',
        'content_moderation',
        'custom_validator'
    )),
    action VARCHAR(20) NOT NULL CHECK (action IN ('allow', 'block', 'redact', 'warn')),
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('input', 'output')),

    -- Content (optional, for auditing)
    original_content TEXT, -- Store hashed or not at all for privacy
    redacted_content TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_safety_logs_user_id ON flowmaestro.safety_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_logs_agent_id ON flowmaestro.safety_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_safety_logs_execution_id ON flowmaestro.safety_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_safety_logs_thread_id ON flowmaestro.safety_logs(thread_id);
CREATE INDEX IF NOT EXISTS idx_safety_logs_check_type ON flowmaestro.safety_logs(check_type);
CREATE INDEX IF NOT EXISTS idx_safety_logs_action ON flowmaestro.safety_logs(action);
CREATE INDEX IF NOT EXISTS idx_safety_logs_created_at ON flowmaestro.safety_logs(created_at);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_safety_logs_agent_check_type ON flowmaestro.safety_logs(agent_id, check_type, created_at DESC);

-- Add agent safety configuration to agents table
ALTER TABLE flowmaestro.agents
ADD COLUMN IF NOT EXISTS safety_config JSONB DEFAULT '{
    "enablePiiDetection": true,
    "enablePromptInjectionDetection": true,
    "enableContentModeration": false,
    "piiRedactionEnabled": true,
    "promptInjectionAction": "warn",
    "contentModerationThreshold": 0.8
}'::jsonb;

-- Create view for safety metrics
CREATE OR REPLACE VIEW flowmaestro.safety_metrics AS
SELECT
    agent_id,
    check_type,
    action,
    direction,
    COUNT(*) as event_count,
    DATE_TRUNC('day', created_at) as day
FROM flowmaestro.safety_logs
GROUP BY agent_id, check_type, action, direction, DATE_TRUNC('day', created_at);

COMMIT;
