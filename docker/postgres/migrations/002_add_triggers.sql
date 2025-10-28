-- Migration: Add Workflow Triggers Support
-- Created: 2025-10-27

-- Set search path
SET search_path TO flowmaestro, public;

-- Create trigger_type enum
DO $$ BEGIN
    CREATE TYPE trigger_type AS ENUM ('schedule', 'webhook', 'event', 'manual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create workflow_triggers table
CREATE TABLE IF NOT EXISTS workflow_triggers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    trigger_type trigger_type NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,

    -- Scheduling metadata
    last_triggered_at TIMESTAMP NULL,
    next_scheduled_at TIMESTAMP NULL,
    trigger_count INTEGER DEFAULT 0,

    -- Temporal workflow ID for scheduled triggers
    temporal_schedule_id VARCHAR(255) NULL,

    -- Webhook authentication
    webhook_secret VARCHAR(255) NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

-- Create trigger_executions table (tracks which trigger started which execution)
CREATE TABLE IF NOT EXISTS trigger_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trigger_id UUID NOT NULL REFERENCES workflow_triggers(id) ON DELETE CASCADE,
    execution_id UUID NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
    trigger_payload JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create webhook_logs table (for debugging webhook calls)
CREATE TABLE IF NOT EXISTS webhook_logs (
    id BIGSERIAL PRIMARY KEY,
    trigger_id UUID REFERENCES workflow_triggers(id) ON DELETE CASCADE,
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,

    -- Request details
    request_method VARCHAR(10) NOT NULL,
    request_path VARCHAR(500),
    request_headers JSONB,
    request_body JSONB,
    request_query JSONB,

    -- Response details
    response_status INTEGER,
    response_body JSONB,
    error TEXT,

    -- Execution tracking
    execution_id UUID REFERENCES executions(id) ON DELETE SET NULL,

    -- Metadata
    ip_address VARCHAR(45),
    user_agent TEXT,
    processing_time_ms INTEGER,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_workflow_id ON workflow_triggers(workflow_id);
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_type ON workflow_triggers(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_enabled ON workflow_triggers(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_next_scheduled ON workflow_triggers(next_scheduled_at)
    WHERE enabled = true AND trigger_type = 'schedule' AND next_scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_workflow_triggers_temporal_schedule ON workflow_triggers(temporal_schedule_id);

CREATE INDEX IF NOT EXISTS idx_trigger_executions_trigger_id ON trigger_executions(trigger_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trigger_executions_execution_id ON trigger_executions(execution_id);

CREATE INDEX IF NOT EXISTS idx_webhook_logs_trigger_id ON webhook_logs(trigger_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_workflow_id ON webhook_logs(workflow_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_execution_id ON webhook_logs(execution_id);

-- Create updated_at trigger
CREATE TRIGGER update_workflow_triggers_updated_at BEFORE UPDATE ON workflow_triggers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE workflow_triggers IS 'Stores trigger configurations for workflows (schedule, webhook, event)';
COMMENT ON TABLE trigger_executions IS 'Tracks which trigger initiated which workflow execution';
COMMENT ON TABLE webhook_logs IS 'Logs all incoming webhook requests for debugging and auditing';

COMMENT ON COLUMN workflow_triggers.config IS 'Type-specific configuration (cron expression, webhook settings, event filters)';
COMMENT ON COLUMN workflow_triggers.temporal_schedule_id IS 'Temporal schedule ID for cron-based triggers';
COMMENT ON COLUMN workflow_triggers.webhook_secret IS 'Secret key for webhook authentication (HMAC signature verification)';
