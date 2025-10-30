-- Migration: Rename Credentials to Connections and Add MCP Support
-- Created: 2025-10-29
-- Description: Unify credentials and integrations into a single "connections" table with MCP support

-- Step 1: Rename credentials table to connections
ALTER TABLE flowmaestro.credentials RENAME TO connections;

-- Step 2: Rename the 'type' column to 'connection_method' for clarity
ALTER TABLE flowmaestro.connections RENAME COLUMN type TO connection_method;

-- Step 3: Add MCP-specific columns
ALTER TABLE flowmaestro.connections
    ADD COLUMN mcp_server_url TEXT,
    ADD COLUMN mcp_tools JSONB,
    ADD COLUMN capabilities JSONB DEFAULT '{}';

-- Step 4: Add comments for clarity
COMMENT ON COLUMN flowmaestro.connections.connection_method IS 'Authentication method: api_key, oauth2, mcp, basic_auth, custom';
COMMENT ON COLUMN flowmaestro.connections.provider IS 'Service provider: openai, anthropic, slack, google, custom-mcp-server, etc.';
COMMENT ON COLUMN flowmaestro.connections.mcp_server_url IS 'MCP server URL (only for connection_method = mcp)';
COMMENT ON COLUMN flowmaestro.connections.mcp_tools IS 'Discovered MCP tools with their schemas (only for MCP connections)';
COMMENT ON COLUMN flowmaestro.connections.capabilities IS 'What this connection can do (permissions, scopes, available operations)';

-- Step 5: Update existing indexes (they need to reference the new table name)
-- Drop old indexes
DROP INDEX IF EXISTS flowmaestro.idx_credentials_user_id;
DROP INDEX IF EXISTS flowmaestro.idx_credentials_provider;
DROP INDEX IF EXISTS flowmaestro.idx_credentials_status;
DROP INDEX IF EXISTS flowmaestro.idx_credentials_type;

-- Create new indexes with updated names
CREATE INDEX IF NOT EXISTS idx_connections_user_id ON flowmaestro.connections(user_id);
CREATE INDEX IF NOT EXISTS idx_connections_provider ON flowmaestro.connections(provider);
CREATE INDEX IF NOT EXISTS idx_connections_status ON flowmaestro.connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_connection_method ON flowmaestro.connections(connection_method);
CREATE INDEX IF NOT EXISTS idx_connections_mcp_server_url ON flowmaestro.connections(mcp_server_url) WHERE mcp_server_url IS NOT NULL;

-- Step 6: Update the trigger name
DROP TRIGGER IF EXISTS update_credentials_updated_at ON flowmaestro.connections;
CREATE TRIGGER update_connections_updated_at BEFORE UPDATE ON flowmaestro.connections
    FOR EACH ROW EXECUTE FUNCTION flowmaestro.update_updated_at_column();

-- Step 7: Drop the integrations table completely (it's underutilized)
-- First drop the trigger
DROP TRIGGER IF EXISTS update_integrations_updated_at ON flowmaestro.integrations;

-- Drop indexes
DROP INDEX IF EXISTS flowmaestro.idx_integrations_user_id;
DROP INDEX IF EXISTS flowmaestro.idx_integrations_type;
DROP INDEX IF EXISTS flowmaestro.idx_integrations_credential_id;

-- Drop the table
DROP TABLE IF EXISTS flowmaestro.integrations;

-- Step 8: Create a constraint to ensure MCP connections have server_url
ALTER TABLE flowmaestro.connections
    ADD CONSTRAINT chk_mcp_server_url
    CHECK (
        (connection_method = 'mcp' AND mcp_server_url IS NOT NULL) OR
        (connection_method != 'mcp')
    );

-- Step 9: Add comment to the table itself
COMMENT ON TABLE flowmaestro.connections IS 'Unified external service connections supporting API keys, OAuth, and MCP. Any provider can have multiple connection methods.';
