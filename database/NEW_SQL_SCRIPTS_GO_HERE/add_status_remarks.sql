-- Add status_remarks column to job_register
-- Allows users to provide context for the current status,
-- e.g. "Waiting on customer to provide a valuation to finalise the bank letter"
ALTER TABLE job_register
  ADD COLUMN IF NOT EXISTS status_remarks TEXT;

COMMENT ON COLUMN job_register.status_remarks IS 'Free-text remark explaining the current status, e.g. what we are waiting on';
