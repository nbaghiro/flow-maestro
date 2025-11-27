-- Migration: Add OAuth Fields to Users
-- Created: 2024-11-23
-- Description: Add Google OAuth support fields to users table

-- Add OAuth-specific columns to users table
ALTER TABLE flowmaestro.users
    ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE,
    ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) DEFAULT 'local',
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Create index on google_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_google_id ON flowmaestro.users(google_id);

-- Create index on auth_provider for analytics
CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON flowmaestro.users(auth_provider);

-- Make password_hash optional for OAuth users (they don't have passwords)
ALTER TABLE flowmaestro.users
    ALTER COLUMN password_hash DROP NOT NULL;

-- Add check constraint to ensure OAuth users have google_id
ALTER TABLE flowmaestro.users
    ADD CONSTRAINT check_oauth_user_has_google_id
    CHECK (
        (auth_provider = 'local' AND password_hash IS NOT NULL) OR
        (auth_provider = 'google' AND google_id IS NOT NULL)
    );
