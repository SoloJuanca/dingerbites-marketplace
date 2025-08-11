-- Migration: Add support for guest users
-- This migration adds the is_guest column to the users table to distinguish guest users from registered users

-- Add is_guest column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_guest BOOLEAN DEFAULT false;

-- Create index for faster queries on guest users
CREATE INDEX IF NOT EXISTS idx_users_is_guest ON users(is_guest);

-- Update existing users to be non-guest by default
UPDATE users SET is_guest = false WHERE is_guest IS NULL;

-- Add comment to the column
COMMENT ON COLUMN users.is_guest IS 'True for guest users created during checkout without password, false for registered users';
