-- ============================================
-- PASSWORD RESET MIGRATION
-- ============================================

-- Add password reset fields to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_sent_at TIMESTAMPTZ;

-- Create indexes for password reset
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token);
