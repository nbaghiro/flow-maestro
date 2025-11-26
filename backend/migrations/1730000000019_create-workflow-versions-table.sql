-- Migration: Create Workflow Versions Table
-- Created: 2025-11-25
-- Description: Introduce workflow versioning with snapshot storage and optional naming support

CREATE TABLE IF NOT EXISTS flowmaestro.workflow_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID NOT NULL REFERENCES flowmaestro.workflows(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    name VARCHAR(255),
    snapshot JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure one version number per workflow
CREATE UNIQUE INDEX IF NOT EXISTS workflow_versions_unique_per_workflow
ON flowmaestro.workflow_versions (workflow_id, version_number);
