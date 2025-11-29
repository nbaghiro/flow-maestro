-- Migration: Add email verification support
-- Description: Add email verification fields to users table and create email verification tokens table
-- Author: Claude
-- Date: 2025-11-28

-- Add email verification fields to users table
ALTER TABLE flowmaestro.users
    ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP NULL;

-- Create index for email_verified field
CREATE INDEX IF NOT EXISTS idx_users_email_verified
    ON flowmaestro.users(email_verified);

-- Create email_verification_tokens table
CREATE TABLE IF NOT EXISTS flowmaestro.email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES flowmaestro.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,  -- Email to verify (may differ from current user email)
    token_hash VARCHAR(255) NOT NULL UNIQUE,  -- SHA-256 hash of the token
    expires_at TIMESTAMP NOT NULL,
    verified_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45) NULL,  -- Track requesting IP for security audit
    user_agent TEXT NULL  -- Track user agent for security audit
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id
    ON flowmaestro.email_verification_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token_hash
    ON flowmaestro.email_verification_tokens(token_hash);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_email
    ON flowmaestro.email_verification_tokens(email);

CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at
    ON flowmaestro.email_verification_tokens(expires_at);

-- Set existing users as verified (backward compatibility)
-- This ensures existing users don't need to verify their emails
UPDATE flowmaestro.users
SET email_verified = TRUE,
    email_verified_at = created_at
WHERE email_verified IS NULL OR email_verified = FALSE;

-- Add comments to tables and columns
COMMENT ON TABLE flowmaestro.email_verification_tokens IS 'Stores hashed email verification tokens with expiry and usage tracking';
COMMENT ON COLUMN flowmaestro.users.email_verified IS 'Whether the user has verified their email address';
COMMENT ON COLUMN flowmaestro.users.email_verified_at IS 'Timestamp when email was verified';
COMMENT ON COLUMN flowmaestro.email_verification_tokens.token_hash IS 'SHA-256 hash of the verification token (never store plain tokens)';
COMMENT ON COLUMN flowmaestro.email_verification_tokens.verified_at IS 'Timestamp when token was used to verify email (NULL if unused)';
COMMENT ON COLUMN flowmaestro.email_verification_tokens.ip_address IS 'IP address from which verification was requested';
COMMENT ON COLUMN flowmaestro.email_verification_tokens.user_agent IS 'User agent from which verification was requested';
