-- Analytics Aggregation Tables
--
-- Purpose: Pre-aggregated views of span data for fast analytics queries
--
-- Tables:
-- - daily_analytics: Daily aggregated metrics per user/entity
-- - hourly_analytics: Hourly aggregated metrics for recent data
-- - model_usage_stats: Model-specific usage and cost statistics

-- Daily Analytics Aggregation
-- Stores daily rollups of execution metrics, token usage, and costs
CREATE TABLE IF NOT EXISTS flowmaestro.daily_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Temporal dimensions
    date DATE NOT NULL,
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,

    -- Entity dimensions
    entity_type VARCHAR(50) NOT NULL, -- 'agent', 'workflow', 'model', 'global'
    entity_id VARCHAR(255), -- agent_id, workflow_id, or model name

    -- Execution metrics
    total_executions BIGINT DEFAULT 0,
    successful_executions BIGINT DEFAULT 0,
    failed_executions BIGINT DEFAULT 0,
    avg_duration_ms NUMERIC(10, 2),
    max_duration_ms BIGINT,
    min_duration_ms BIGINT,

    -- Token usage (for MODEL_GENERATION spans)
    total_prompt_tokens BIGINT DEFAULT 0,
    total_completion_tokens BIGINT DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,

    -- Cost tracking (USD)
    total_input_cost NUMERIC(12, 6) DEFAULT 0,
    total_output_cost NUMERIC(12, 6) DEFAULT 0,
    total_cost NUMERIC(12, 6) DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_daily_analytics UNIQUE (date, user_id, entity_type, entity_id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_daily_analytics_date ON flowmaestro.daily_analytics(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_user ON flowmaestro.daily_analytics(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_analytics_entity ON flowmaestro.daily_analytics(entity_type, entity_id, date DESC);

-- Hourly Analytics Aggregation
-- Stores hourly rollups for real-time/recent analytics
CREATE TABLE IF NOT EXISTS flowmaestro.hourly_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Temporal dimensions
    hour TIMESTAMPTZ NOT NULL, -- Truncated to hour
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,

    -- Entity dimensions
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255),

    -- Execution metrics
    total_executions BIGINT DEFAULT 0,
    successful_executions BIGINT DEFAULT 0,
    failed_executions BIGINT DEFAULT 0,
    avg_duration_ms NUMERIC(10, 2),
    max_duration_ms BIGINT,
    min_duration_ms BIGINT,

    -- Token usage
    total_prompt_tokens BIGINT DEFAULT 0,
    total_completion_tokens BIGINT DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,

    -- Cost tracking (USD)
    total_input_cost NUMERIC(12, 6) DEFAULT 0,
    total_output_cost NUMERIC(12, 6) DEFAULT 0,
    total_cost NUMERIC(12, 6) DEFAULT 0,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_hourly_analytics UNIQUE (hour, user_id, entity_type, entity_id)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_hourly_analytics_hour ON flowmaestro.hourly_analytics(hour DESC);
CREATE INDEX IF NOT EXISTS idx_hourly_analytics_user ON flowmaestro.hourly_analytics(user_id, hour DESC);
CREATE INDEX IF NOT EXISTS idx_hourly_analytics_entity ON flowmaestro.hourly_analytics(entity_type, entity_id, hour DESC);

-- Model Usage Statistics
-- Detailed breakdown of usage per model/provider
CREATE TABLE IF NOT EXISTS flowmaestro.model_usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Temporal dimensions
    date DATE NOT NULL,
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,

    -- Model dimensions
    provider VARCHAR(100) NOT NULL, -- 'openai', 'anthropic', 'google'
    model VARCHAR(255) NOT NULL, -- Full model identifier

    -- Usage metrics
    total_calls BIGINT DEFAULT 0,
    successful_calls BIGINT DEFAULT 0,
    failed_calls BIGINT DEFAULT 0,

    -- Token metrics
    total_prompt_tokens BIGINT DEFAULT 0,
    total_completion_tokens BIGINT DEFAULT 0,
    total_tokens BIGINT DEFAULT 0,
    avg_tokens_per_call NUMERIC(10, 2),

    -- Cost metrics (USD)
    total_input_cost NUMERIC(12, 6) DEFAULT 0,
    total_output_cost NUMERIC(12, 6) DEFAULT 0,
    total_cost NUMERIC(12, 6) DEFAULT 0,
    avg_cost_per_call NUMERIC(12, 6),

    -- Performance metrics
    avg_duration_ms NUMERIC(10, 2),
    p50_duration_ms BIGINT,
    p95_duration_ms BIGINT,
    p99_duration_ms BIGINT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraints
    CONSTRAINT unique_model_usage_stats UNIQUE (date, user_id, provider, model)
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_model_usage_date ON flowmaestro.model_usage_stats(date DESC);
CREATE INDEX IF NOT EXISTS idx_model_usage_user ON flowmaestro.model_usage_stats(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_model_usage_provider ON flowmaestro.model_usage_stats(provider, model, date DESC);
CREATE INDEX IF NOT EXISTS idx_model_usage_cost ON flowmaestro.model_usage_stats(total_cost DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION flowmaestro.update_analytics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
DROP TRIGGER IF EXISTS daily_analytics_updated_at ON flowmaestro.daily_analytics;
CREATE TRIGGER daily_analytics_updated_at
    BEFORE UPDATE ON flowmaestro.daily_analytics
    FOR EACH ROW
    EXECUTE FUNCTION flowmaestro.update_analytics_updated_at();

DROP TRIGGER IF EXISTS hourly_analytics_updated_at ON flowmaestro.hourly_analytics;
CREATE TRIGGER hourly_analytics_updated_at
    BEFORE UPDATE ON flowmaestro.hourly_analytics
    FOR EACH ROW
    EXECUTE FUNCTION flowmaestro.update_analytics_updated_at();

DROP TRIGGER IF EXISTS model_usage_stats_updated_at ON flowmaestro.model_usage_stats;
CREATE TRIGGER model_usage_stats_updated_at
    BEFORE UPDATE ON flowmaestro.model_usage_stats
    FOR EACH ROW
    EXECUTE FUNCTION flowmaestro.update_analytics_updated_at();

-- Materialized View: Recent Activity Summary (Last 7 Days)
-- Fast queries for dashboard "at a glance" metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS flowmaestro.recent_activity_summary AS
SELECT
    user_id,
    SUM(total_executions) as total_executions,
    SUM(successful_executions) as successful_executions,
    SUM(failed_executions) as failed_executions,
    SUM(total_tokens) as total_tokens,
    SUM(total_cost) as total_cost,
    AVG(avg_duration_ms) as avg_duration_ms
FROM flowmaestro.daily_analytics
WHERE date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY user_id;

-- Index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_recent_activity_user ON flowmaestro.recent_activity_summary(user_id);

-- Comment on tables
COMMENT ON TABLE flowmaestro.daily_analytics IS 'Daily aggregated analytics for executions, tokens, and costs';
COMMENT ON TABLE flowmaestro.hourly_analytics IS 'Hourly aggregated analytics for real-time monitoring';
COMMENT ON TABLE flowmaestro.model_usage_stats IS 'Detailed model usage and cost statistics';
COMMENT ON MATERIALIZED VIEW flowmaestro.recent_activity_summary IS 'Summary of recent activity for quick dashboard loading';
