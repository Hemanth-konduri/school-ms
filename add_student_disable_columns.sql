-- Student table compatibility patch (safe to rerun)
-- Run this in your Supabase SQL Editor

ALTER TABLE students 
ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS roll_number TEXT,
ADD COLUMN IF NOT EXISTS semester INTEGER;

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_students_is_disabled ON students(is_disabled);
CREATE INDEX IF NOT EXISTS idx_students_roll_number ON students(roll_number);
CREATE INDEX IF NOT EXISTS idx_students_semester ON students(semester);

-- Add comment
COMMENT ON COLUMN students.is_disabled IS 'Whether the student account is disabled';
COMMENT ON COLUMN students.disabled_at IS 'Timestamp when the account was disabled';
COMMENT ON COLUMN students.roll_number IS 'Roll number within batch/group';
COMMENT ON COLUMN students.semester IS 'Current semester of student';

-- Ensure RLS and admin policy exist without duplicate-policy failures
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow admins to manage students" ON students;
CREATE POLICY "Allow admins to manage students"
ON students
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
      AND profiles.role_id IN (
        SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin')
      )
  )
);

-- Allow admins to enable/disable student login profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow admins to update profile status" ON profiles;
CREATE POLICY "Allow admins to update profile status"
ON profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role_id IN (
        SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin')
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.auth_user_id = auth.uid()
      AND p.role_id IN (
        SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin')
      )
  )
);
