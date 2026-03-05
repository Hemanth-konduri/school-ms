-- Create attendance tables and storage bucket

-- 1. Teacher attendance sessions table
CREATE TABLE IF NOT EXISTS teacher_attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES timetable_events(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  marked_at TIMESTAMPTZ NOT NULL,
  student_window_ends_at TIMESTAMPTZ NOT NULL,
  photo_path TEXT,
  photo_url TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, teacher_id)
);

-- 2. Student attendance records table
CREATE TABLE IF NOT EXISTS student_attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES timetable_events(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'manual_present', 'manual_absent')),
  marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  marked_by_teacher_id UUID REFERENCES teachers(id),
  photo_path TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, student_id)
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_teacher_sessions_event ON teacher_attendance_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_teacher_sessions_teacher ON teacher_attendance_sessions(teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_records_event ON student_attendance_records(event_id);
CREATE INDEX IF NOT EXISTS idx_student_records_student ON student_attendance_records(student_id);

-- 4. Enable RLS
ALTER TABLE teacher_attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_attendance_records ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for teacher_attendance_sessions
DROP POLICY IF EXISTS "Teachers can insert their own sessions" ON teacher_attendance_sessions;
CREATE POLICY "Teachers can insert their own sessions" ON teacher_attendance_sessions
  FOR INSERT TO authenticated WITH CHECK (
    teacher_id IN (SELECT id FROM teachers WHERE email = auth.jwt()->>'email')
  );

DROP POLICY IF EXISTS "Teachers can update their own sessions" ON teacher_attendance_sessions;
CREATE POLICY "Teachers can update their own sessions" ON teacher_attendance_sessions
  FOR UPDATE TO authenticated USING (
    teacher_id IN (SELECT id FROM teachers WHERE email = auth.jwt()->>'email')
  );

DROP POLICY IF EXISTS "Everyone can read sessions" ON teacher_attendance_sessions;
CREATE POLICY "Everyone can read sessions" ON teacher_attendance_sessions
  FOR SELECT TO authenticated USING (true);

-- 6. RLS Policies for student_attendance_records
DROP POLICY IF EXISTS "Students can insert their own records" ON student_attendance_records;
CREATE POLICY "Students can insert their own records" ON student_attendance_records
  FOR INSERT TO authenticated WITH CHECK (
    student_id IN (SELECT id FROM students WHERE email = auth.jwt()->>'email')
  );

DROP POLICY IF EXISTS "Students can read their own records" ON student_attendance_records;
CREATE POLICY "Students can read their own records" ON student_attendance_records
  FOR SELECT TO authenticated USING (
    student_id IN (SELECT id FROM students WHERE email = auth.jwt()->>'email')
    OR batch_id IN (SELECT batch_id FROM students WHERE email = auth.jwt()->>'email')
  );

DROP POLICY IF EXISTS "Teachers can read all records" ON student_attendance_records;
CREATE POLICY "Teachers can read all records" ON student_attendance_records
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Teachers can update records" ON student_attendance_records;
CREATE POLICY "Teachers can update records" ON student_attendance_records
  FOR UPDATE TO authenticated USING (
    auth.jwt()->>'email' IN (SELECT email FROM teachers)
  );

-- 7. Create storage bucket for attendance proofs (run in Supabase Dashboard > Storage)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('attendance-proofs', 'attendance-proofs', false);

-- 8. Storage policies (run in Supabase Dashboard > Storage > attendance-proofs > Policies)
-- Allow authenticated users to upload:
-- CREATE POLICY "Authenticated users can upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attendance-proofs');
-- Allow authenticated users to read:
-- CREATE POLICY "Authenticated users can read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'attendance-proofs');
