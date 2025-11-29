-- Migration: Add password reset tokens table
-- Description: Create table to store password reset tokens for forgot password functionality
-- Author: Claude
-- Date: 2025-11-28

-- Create password_reset_tokens table
CREATE TABLE IF NOT EXISTS flowmaestro.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,  -- SHA-256 hash of the token
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) NULL,  -- Track requesting IP for security audit
    user_agent TEXT NULL  -- Track user agent for security audit
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id
    ON flowmaestro.password_reset_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash
    ON flowmaestro.password_reset_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at
    ON flowmaestro.password_reset_tokens(expires_at);

-- Add comment to table
COMMENT ON TABLE flowmaestro.password_reset_tokens IS 'Stores hashed password reset tokens with expiry and usage tracking';
COMMENT ON COLUMN flowmaestro.password_reset_tokens.token_hash IS 'SHA-256 hash of the reset token (never store plain tokens)';
COMMENT ON COLUMN flowmaestro.password_reset_tokens.used_at IS 'Timestamp when token was used (NULL if unused)';
COMMENT ON COLUMN flowmaestro.password_reset_tokens.ip_address IS 'IP address from which reset was requested';
COMMENT ON COLUMN flowmaestro.password_reset_tokens.user_agent IS 'User agent from which reset was requested';
