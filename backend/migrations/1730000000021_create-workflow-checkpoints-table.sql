-- Migration: Create Workflow Checkpoints Table
-- Created: 2025-11-25
-- Description: Introduce workflow checkpoints with snapshot storage and optional naming support

CREATE TABLE IF NOT EXISTS flowmaestro.workflow_checkpoints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES flowmaestro.workflows(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    description TEXT,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for efficient querying
CREATE INDEX idx_workflow_checkpoints_workflow_id ON flowmaestro.workflow_checkpoints(workflow_id);
CREATE INDEX idx_workflow_checkpoints_created_by ON flowmaestro.workflow_checkpoints(created_by);
CREATE INDEX idx_workflow_checkpoints_workflow_active ON flowmaestro.workflow_checkpoints(workflow_id, created_at DESC) WHERE deleted_at IS NULL;
