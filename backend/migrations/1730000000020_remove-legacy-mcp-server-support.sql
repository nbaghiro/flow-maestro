-- Migration: Remove MCP Server Support
-- Description: Remove external MCP server support in favor of provider-based auto-exposed MCP tools
-- Date: 2024-11-26

-- Remove connections that use external MCP servers
DELETE FROM flowmaestro.connections WHERE mcp_server_url IS NOT NULL;

-- Drop MCP-specific columns
ALTER TABLE flowmaestro.connections DROP COLUMN IF EXISTS mcp_server_url;
ALTER TABLE flowmaestro.connections DROP COLUMN IF EXISTS mcp_tools;

-- Note: The connection_method column uses a CHECK constraint defined in migration 006
-- We need to update it to remove 'mcp' as a valid option
-- First, drop the existing constraint if it exists
DO $$
BEGIN
    -- Drop the constraint that validates connection_method and mcp_server_url relationship
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'connections_mcp_url_check'
        AND table_schema = 'flowmaestro'
    ) THEN
        ALTER TABLE flowmaestro.connections DROP CONSTRAINT connections_mcp_url_check;
    END IF;
END $$;

-- Update the column comment to reflect the supported methods
COMMENT ON COLUMN flowmaestro.connections.connection_method IS 'Authentication method: api_key, oauth2, basic_auth, custom';
