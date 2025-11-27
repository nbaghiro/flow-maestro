-- Migration: Create Workflow Versions Table
-- Created: 2025-11-25
-- Description: Introduce workflow versioning with snapshot storage and optional naming support

CREATE TABLE IF NOT EXISTS flowmaestro.workflow_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES flowmaestro.workflows(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,
    name VARCHAR(255),
    description TEXT,
    snapshot JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

