-- Migration: Create Execution Spans Table for Distributed Tracing
-- Implements Mastra-inspired span-based observability

-- Create execution_spans table
CREATE TABLE IF NOT EXISTS flowmaestro.execution_spans (
    trace_id UUID NOT NULL,
    span_id UUID PRIMARY KEY,
    parent_span_id UUID,
    name TEXT NOT NULL,
    span_type TEXT NOT NULL,
    entity_id TEXT,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_ms INTEGER,
    status TEXT NOT NULL,
    input JSONB,
    output JSONB,
    error JSONB,
    attributes JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries

-- Index for trace lookups (most common query)
CREATE INDEX IF NOT EXISTS idx_execution_spans_trace_id
ON flowmaestro.execution_spans (trace_id, started_at DESC);

-- Index for span type filtering (e.g., all workflow runs, all LLM calls)
CREATE INDEX IF NOT EXISTS idx_execution_spans_span_type
ON flowmaestro.execution_spans (span_type, started_at DESC);

-- Index for entity filtering (e.g., all spans for a specific workflow/agent)
CREATE INDEX IF NOT EXISTS idx_execution_spans_entity_id
ON flowmaestro.execution_spans (entity_id, started_at DESC);

-- Index for user filtering (via attributes JSONB)
CREATE INDEX IF NOT EXISTS idx_execution_spans_user_id
ON flowmaestro.execution_spans ((attributes->>'userId'), started_at DESC);

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_execution_spans_status
ON flowmaestro.execution_spans (status, started_at DESC);

-- Index for date range queries
CREATE INDEX IF NOT EXISTS idx_execution_spans_started_at
ON flowmaestro.execution_spans (started_at DESC);

-- Composite index for common queries (entity + span type + date)
CREATE INDEX IF NOT EXISTS idx_execution_spans_composite
ON flowmaestro.execution_spans (entity_id, span_type, started_at DESC);

-- GIN index for JSONB attributes for flexible filtering
CREATE INDEX IF NOT EXISTS idx_execution_spans_attributes
ON flowmaestro.execution_spans USING gin (attributes);

-- Add comment for documentation
COMMENT ON TABLE flowmaestro.execution_spans IS 'Distributed tracing spans for workflow and agent execution observability';
COMMENT ON COLUMN flowmaestro.execution_spans.trace_id IS 'Unique identifier for the entire trace (all related spans)';
COMMENT ON COLUMN flowmaestro.execution_spans.span_id IS 'Unique identifier for this specific span';
COMMENT ON COLUMN flowmaestro.execution_spans.parent_span_id IS 'ID of the parent span (null for root spans)';
COMMENT ON COLUMN flowmaestro.execution_spans.span_type IS 'Type of span (workflow_run, agent_run, tool_execution, model_generation, etc.)';
COMMENT ON COLUMN flowmaestro.execution_spans.entity_id IS 'ID of the entity being traced (workflow_id, agent_id, node_id, etc.)';
COMMENT ON COLUMN flowmaestro.execution_spans.attributes IS 'JSONB attributes (userId, modelId, tokens, etc.) for filtering and analysis';
