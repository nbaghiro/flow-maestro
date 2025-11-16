-- Migration: Create Database Connections Table
-- Created: 2025-11-16
-- Description: Create database_connections table for user-configured database credentials (separate from external integrations)

CREATE TABLE IF NOT EXISTS flowmaestro.database_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('postgresql', 'mysql', 'mongodb')),

    -- Connection details (NOT encrypted - user-managed within workflow builder)
    host VARCHAR(255),
    port INTEGER,
    database VARCHAR(255),
    username VARCHAR(255),
    password VARCHAR(255),
    connection_string TEXT,
    ssl_enabled BOOLEAN DEFAULT false,

    -- Additional options
    options JSONB DEFAULT '{}'::jsonb,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_database_connections_user_id
ON flowmaestro.database_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_database_connections_provider
ON flowmaestro.database_connections(provider);

-- Add comment
COMMENT ON TABLE flowmaestro.database_connections IS 'User-configured database connections for database nodes (separate from external integrations)';
