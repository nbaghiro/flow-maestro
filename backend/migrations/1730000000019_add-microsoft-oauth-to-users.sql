-- Migration: Add Microsoft OAuth Fields to Users
-- Created: 2024-11-26
-- Description: Add Microsoft OAuth support fields to users table for SSO login

-- Add Microsoft ID column to users table
ALTER TABLE flowmaestro.users
    ADD COLUMN IF NOT EXISTS microsoft_id VARCHAR(255) UNIQUE;

-- Create index on microsoft_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_microsoft_id ON flowmaestro.users(microsoft_id);

-- Drop the existing constraint that only allows google auth
ALTER TABLE flowmaestro.users
    DROP CONSTRAINT IF EXISTS check_oauth_user_has_google_id;

-- Add updated check constraint to support both Google and Microsoft OAuth
-- Note: Users can have any combination of auth methods (local, google, microsoft)
-- At minimum: local users need password, OAuth users need their respective ID
ALTER TABLE flowmaestro.users
    ADD CONSTRAINT check_user_auth_method
    CHECK (
        -- Local users must have a password
        (auth_provider = 'local' AND password_hash IS NOT NULL) OR
        -- Google OAuth users must have google_id
        (auth_provider = 'google' AND google_id IS NOT NULL) OR
        -- Microsoft OAuth users must have microsoft_id
        (auth_provider = 'microsoft' AND microsoft_id IS NOT NULL)
    );
