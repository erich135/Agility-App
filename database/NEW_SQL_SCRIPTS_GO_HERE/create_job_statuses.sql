-- ============================================
-- Job Statuses Configuration Table
-- ============================================
-- Allows admins to manage job statuses dynamically
-- instead of hardcoding them in the frontend.

CREATE TABLE IF NOT EXISTS job_statuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key VARCHAR(50) NOT NULL UNIQUE,           -- e.g. 'not_started', 'in_progress'
  label VARCHAR(100) NOT NULL,               -- e.g. 'Not Started', 'In Progress'
  color_bg VARCHAR(100) NOT NULL DEFAULT 'bg-gray-100 text-gray-700 border-gray-200',
  color_dot VARCHAR(50) NOT NULL DEFAULT 'bg-gray-400',
  board_header_color VARCHAR(50) NOT NULL DEFAULT 'bg-gray-500',
  board_bg_color VARCHAR(50) NOT NULL DEFAULT 'bg-gray-50',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_closed BOOLEAN NOT NULL DEFAULT false,  -- true = "done" state (completed, cancelled)
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the default statuses
INSERT INTO job_statuses (key, label, color_bg, color_dot, board_header_color, board_bg_color, is_closed, sort_order)
VALUES
  ('not_started',    'Not Started',       'bg-gray-100 text-gray-700 border-gray-200',   'bg-gray-400',   'bg-gray-500',   'bg-gray-50',   false, 10),
  ('in_progress',    'In Progress',       'bg-blue-100 text-blue-700 border-blue-200',   'bg-blue-500',   'bg-blue-500',   'bg-blue-50',   false, 20),
  ('waiting_client', 'Waiting on Client', 'bg-yellow-100 text-yellow-700 border-yellow-200', 'bg-yellow-500', 'bg-yellow-500', 'bg-yellow-50', false, 30),
  ('waiting_sars',   'Waiting on SARS',   'bg-orange-100 text-orange-700 border-orange-200', 'bg-orange-500', 'bg-orange-500', 'bg-orange-50', false, 40),
  ('under_review',   'Under Review',      'bg-purple-100 text-purple-700 border-purple-200', 'bg-purple-500', 'bg-purple-500', 'bg-purple-50', false, 50),
  ('completed',      'Completed',         'bg-green-100 text-green-700 border-green-200',  'bg-green-500',  'bg-green-500',  'bg-green-50',  true,  60),
  ('cancelled',      'Cancelled',         'bg-red-100 text-red-700 border-red-200',      'bg-red-400',    'bg-red-500',    'bg-red-50',    true,  70)
ON CONFLICT (key) DO NOTHING;

-- Index for sorting and filtering
CREATE INDEX IF NOT EXISTS idx_job_statuses_sort ON job_statuses(sort_order);
CREATE INDEX IF NOT EXISTS idx_job_statuses_active ON job_statuses(is_active) WHERE is_active = true;
