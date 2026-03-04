-- Add columns for disabling teacher accounts
-- Run this in your Supabase SQL Editor

ALTER TABLE teachers 
ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_teachers_is_disabled ON teachers(is_disabled);

-- Add comment
COMMENT ON COLUMN teachers.is_disabled IS 'Whether the teacher account is disabled';
COMMENT ON COLUMN teachers.disabled_at IS 'Timestamp when the account was disabled';
