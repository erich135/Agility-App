-- Add pause/resume functionality columns to time_entries table
-- Migration: add_timer_pause_columns.sql
-- Date: 2026-01-22

-- Add is_paused column to track if timer is paused
ALTER TABLE time_entries 
ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE;

-- Add paused_at to track when timer was paused
ALTER TABLE time_entries 
ADD COLUMN IF NOT EXISTS paused_at TIMESTAMPTZ;

-- Add resumed_at to track when timer was resumed
ALTER TABLE time_entries 
ADD COLUMN IF NOT EXISTS resumed_at TIMESTAMPTZ;

-- Add total_paused_duration to track cumulative pause time in seconds
ALTER TABLE time_entries 
ADD COLUMN IF NOT EXISTS total_paused_duration INTEGER DEFAULT 0;

-- Add index for querying paused timers
CREATE INDEX IF NOT EXISTS idx_time_entries_is_paused 
ON time_entries(is_paused) 
WHERE is_paused = TRUE;

-- Comment the columns
COMMENT ON COLUMN time_entries.is_paused IS 'Whether the timer is currently paused';
COMMENT ON COLUMN time_entries.paused_at IS 'Timestamp when timer was paused';
COMMENT ON COLUMN time_entries.resumed_at IS 'Timestamp when timer was resumed from pause';
COMMENT ON COLUMN time_entries.total_paused_duration IS 'Total paused duration in seconds';
