-- Migration: add user_id to interrupt_inbox so push reminders
-- can be targeted to the person who captured the item.
--
-- Run once in the Supabase SQL editor.

ALTER TABLE interrupt_inbox
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_interrupt_inbox_user_id ON interrupt_inbox(user_id);
