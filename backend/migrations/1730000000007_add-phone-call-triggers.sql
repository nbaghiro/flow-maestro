-- Migration: Add Phone Call Triggers and Voice Infrastructure
-- Created: 2025-10-31
-- Description: Add phone_call trigger type and tables for tracking call executions and transcripts

-- Set search path
SET search_path TO flowmaestro, public;

-- Step 1: Add phone_call to trigger_type enum
ALTER TYPE trigger_type ADD VALUE IF NOT EXISTS 'phone_call';

-- Step 2: Create call_executions table
-- This tracks the lifecycle of each phone call
CREATE TABLE IF NOT EXISTS call_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Links to trigger and execution
    trigger_id UUID NOT NULL REFERENCES workflow_triggers(id) ON DELETE CASCADE,
    execution_id UUID REFERENCES executions(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Call identification
    call_sid VARCHAR(255) NOT NULL UNIQUE,
    livekit_room_name VARCHAR(255),

    -- Phone numbers (E.164 format)
    caller_number VARCHAR(20) NOT NULL,
    called_number VARCHAR(20) NOT NULL,

    -- Call metadata
    direction VARCHAR(20) NOT NULL DEFAULT 'inbound', -- inbound, outbound
    call_status VARCHAR(50) NOT NULL DEFAULT 'initiated', -- initiated, ringing, active, completed, failed, no_answer, busy, cancelled

    -- Timing information
    initiated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    answered_at TIMESTAMP NULL,
    ended_at TIMESTAMP NULL,
    call_duration_seconds INTEGER NULL,

    -- Caller information
    caller_name VARCHAR(255),
    caller_location VARCHAR(255),
    caller_carrier VARCHAR(255),

    -- Recording and transcript
    recording_enabled BOOLEAN DEFAULT false,
    recording_url TEXT,
    recording_duration_seconds INTEGER,

    -- Final state
    hangup_cause VARCHAR(100), -- normal, user_hangup, timeout, error, etc.
    error_message TEXT,

    -- Audio quality metrics
    audio_quality_metrics JSONB DEFAULT '{}', -- packet_loss, jitter, latency, etc.

    -- Billing
    cost_amount DECIMAL(10, 4),
    cost_currency VARCHAR(3) DEFAULT 'USD',

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 3: Create call_transcripts table
-- This stores the conversation history (user speech + AI responses)
CREATE TABLE IF NOT EXISTS call_transcripts (
    id BIGSERIAL PRIMARY KEY,
    call_execution_id UUID NOT NULL REFERENCES call_executions(id) ON DELETE CASCADE,

    -- Speaker identification
    speaker VARCHAR(20) NOT NULL, -- user, agent, system

    -- Transcript content
    text TEXT NOT NULL,
    confidence DECIMAL(4, 3), -- 0.000 to 1.000
    language VARCHAR(10) DEFAULT 'en-US',

    -- Timing
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP NULL,
    duration_ms INTEGER,

    -- Audio segment reference (for playback)
    audio_segment_url TEXT,

    -- Metadata
    is_final BOOLEAN DEFAULT true,
    interrupted BOOLEAN DEFAULT false, -- true if user barged in
    node_id UUID, -- which workflow node generated this (for agent speech)

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Step 4: Create call_events table
-- This stores detailed events during the call (for debugging and monitoring)
CREATE TABLE IF NOT EXISTS call_events (
    id BIGSERIAL PRIMARY KEY,
    call_execution_id UUID NOT NULL REFERENCES call_executions(id) ON DELETE CASCADE,

    -- Event details
    event_type VARCHAR(100) NOT NULL, -- agent_joined, speech_started, tts_complete, error, etc.
    event_data JSONB,
    severity VARCHAR(20) DEFAULT 'info', -- debug, info, warning, error, critical

    -- Timing
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Context
    node_id UUID,
    activity_id VARCHAR(255)
);

-- Step 5: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_executions_trigger_id ON call_executions(trigger_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_executions_execution_id ON call_executions(execution_id);
CREATE INDEX IF NOT EXISTS idx_call_executions_user_id ON call_executions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_executions_call_sid ON call_executions(call_sid);
CREATE INDEX IF NOT EXISTS idx_call_executions_status ON call_executions(call_status) WHERE ended_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_call_executions_caller_number ON call_executions(caller_number);
CREATE INDEX IF NOT EXISTS idx_call_executions_called_number ON call_executions(called_number);
CREATE INDEX IF NOT EXISTS idx_call_executions_created_at ON call_executions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_call_transcripts_call_execution_id ON call_transcripts(call_execution_id, started_at ASC);
CREATE INDEX IF NOT EXISTS idx_call_transcripts_speaker ON call_transcripts(speaker);
CREATE INDEX IF NOT EXISTS idx_call_transcripts_started_at ON call_transcripts(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_call_events_call_execution_id ON call_events(call_execution_id, timestamp ASC);
CREATE INDEX IF NOT EXISTS idx_call_events_event_type ON call_events(event_type);
CREATE INDEX IF NOT EXISTS idx_call_events_severity ON call_events(severity) WHERE severity IN ('error', 'critical');
CREATE INDEX IF NOT EXISTS idx_call_events_timestamp ON call_events(timestamp DESC);

-- Step 6: Create updated_at trigger
CREATE TRIGGER update_call_executions_updated_at BEFORE UPDATE ON call_executions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Add comments for documentation
COMMENT ON TABLE call_executions IS 'Tracks phone call lifecycle from initiation to completion';
COMMENT ON TABLE call_transcripts IS 'Stores conversation history (user speech + AI responses) for each call';
COMMENT ON TABLE call_events IS 'Detailed event log for debugging and monitoring call execution';

COMMENT ON COLUMN call_executions.call_sid IS 'Unique call identifier from SIP provider (Telnyx)';
COMMENT ON COLUMN call_executions.livekit_room_name IS 'LiveKit room name where the call is handled';
COMMENT ON COLUMN call_executions.caller_number IS 'E.164 format phone number of caller (+15551234567)';
COMMENT ON COLUMN call_executions.called_number IS 'E.164 format phone number that was called (FlowMaestro number)';
COMMENT ON COLUMN call_executions.call_status IS 'Current call state: initiated, ringing, active, completed, failed, etc.';
COMMENT ON COLUMN call_executions.hangup_cause IS 'Reason for call termination: normal, user_hangup, timeout, error, etc.';

COMMENT ON COLUMN call_transcripts.speaker IS 'Who spoke: user (caller), agent (AI), or system (prompts)';
COMMENT ON COLUMN call_transcripts.confidence IS 'STT confidence score (0.0 to 1.0)';
COMMENT ON COLUMN call_transcripts.interrupted IS 'True if user barged in during agent speech';

COMMENT ON COLUMN call_events.event_type IS 'Event type: agent_joined, speech_started, tts_complete, error, etc.';
COMMENT ON COLUMN call_events.severity IS 'Log level: debug, info, warning, error, critical';
