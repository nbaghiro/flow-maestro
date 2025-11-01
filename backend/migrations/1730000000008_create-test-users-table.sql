-- Migration: Create test_users table
-- Created: 2025-11-01
-- Description: Create test_users table for testing database node functionality

CREATE TABLE IF NOT EXISTS flowmaestro.test_users (
    user_id INTEGER PRIMARY KEY,
    full_name VARCHAR(255),
    email VARCHAR(255),
    city VARCHAR(255),
    company VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_test_users_email ON flowmaestro.test_users(email);

-- Add a comment to the table
COMMENT ON TABLE flowmaestro.test_users IS 'Test table for database node operations';
