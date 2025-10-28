-- Migration: Add Credentials and Integrations
-- Created: 2024-10-27
-- Description: Add credentials table for encrypted API keys and OAuth tokens, and integrations table

-- Create credentials table
CREATE TABLE IF NOT EXISTS flowmaestro.credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'api_key', 'oauth2', 'basic_auth', 'custom'
    provider VARCHAR(100) NOT NULL, -- 'openai', 'anthropic', 'slack', 'google', etc.
    encrypted_data TEXT NOT NULL, -- AES-256 encrypted JSON
    metadata JSONB DEFAULT '{}', -- { scopes, expires_at, account_info }
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'invalid', 'expired', 'revoked'
    last_tested_at TIMESTAMP,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create integrations table
CREATE TABLE IF NOT EXISTS flowmaestro.integrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    config JSONB NOT NULL,
    credential_id UUID REFERENCES flowmaestro.credentials(id) ON DELETE SET NULL,
    user_id UUID NOT NULL,
    enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for credentials
CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON flowmaestro.credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_credentials_provider ON flowmaestro.credentials(provider);
CREATE INDEX IF NOT EXISTS idx_credentials_status ON flowmaestro.credentials(status);
CREATE INDEX IF NOT EXISTS idx_credentials_type ON flowmaestro.credentials(type);

-- Create indexes for integrations
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON flowmaestro.integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_type ON flowmaestro.integrations(type);
CREATE INDEX IF NOT EXISTS idx_integrations_credential_id ON flowmaestro.integrations(credential_id);

-- Create triggers for updated_at
CREATE TRIGGER update_credentials_updated_at BEFORE UPDATE ON flowmaestro.credentials
    FOR EACH ROW EXECUTE FUNCTION flowmaestro.update_updated_at_column();

CREATE TRIGGER update_integrations_updated_at BEFORE UPDATE ON flowmaestro.integrations
    FOR EACH ROW EXECUTE FUNCTION flowmaestro.update_updated_at_column();
