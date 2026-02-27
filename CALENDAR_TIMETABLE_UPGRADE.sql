-- =============================================
-- CALENDAR-BASED TIMETABLE SYSTEM UPGRADE
-- =============================================
-- This replaces the old class_schedules system with a more flexible,
-- calendar-based timetable that supports datetime, recurring events, and conflict detection

-- =============================================
-- 1. DROP OLD TABLE (if migrating from old system)
-- =============================================
-- DROP TABLE IF EXISTS public.class_schedules CASCADE;

-- =============================================
-- 2. NEW CALENDAR-BASED TIMETABLE TABLES
-- =============================================

-- Main timetable events table
CREATE TABLE public.timetable_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 12),
  
  -- Datetime fields instead of day_of_week + time
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  
  -- Location
  room TEXT,
  building TEXT,
  
  -- Event type (lecture, practical, lab, etc.)
  event_type TEXT DEFAULT 'lecture' CHECK (event_type IN ('lecture', 'practical', 'lab', 'seminar', 'exam', 'other')),
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'rescheduled')),
  
  -- Notes
  notes TEXT,
  
  -- Tracking
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_datetime CHECK (end_time > start_time)
);

-- Recurring timetable events (for weekly/monthly recurring schedules)
CREATE TABLE public.timetable_recurring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL,
  
  -- Time pattern
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  
  -- Location
  room TEXT,
  building TEXT,
  
  -- Event type
  event_type TEXT DEFAULT 'lecture' CHECK (event_type IN ('lecture', 'practical', 'lab', 'seminar', 'exam', 'other')),
  
  -- Recurrence settings
  recurrence_type TEXT DEFAULT 'weekly' CHECK (recurrence_type IN ('weekly', 'biweekly', 'monthly')),
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Skip dates (for holidays, special days)
  skip_dates TIMESTAMP[], 
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  
  -- Tracking
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_recurring_time CHECK (end_time > start_time)
);

-- Timetable holidays/exceptions (e.g., semester break, exams, holidays)
CREATE TABLE public.timetable_exceptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  
  -- Date range
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Type of exception
  exception_type TEXT NOT NULL CHECK (exception_type IN ('holiday', 'exam_period', 'break', 'special_event', 'other')),
  
  -- Description
  title TEXT NOT NULL,
  description TEXT,
  
  -- Tracking
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT valid_exception_dates CHECK (end_date >= start_date)
);

-- Timetable conflict logs (for audit trail)
CREATE TABLE public.timetable_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES public.timetable_events(id) ON DELETE SET NULL,
  recurring_id UUID REFERENCES public.timetable_recurring(id) ON DELETE SET NULL,
  
  -- Conflict details
  conflict_type TEXT NOT NULL CHECK (conflict_type IN ('teacher_double_booking', 'batch_overlap', 'room_conflict', 'other')),
  conflicting_event_id UUID REFERENCES public.timetable_events(id) ON DELETE SET NULL,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'critical')),
  
  -- Resolution
  is_resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES public.profiles(id),
  
  -- Tracking
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.timetable_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_recurring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_conflicts ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 4. RLS POLICIES
-- =============================================

-- Admins can manage timetable events
CREATE POLICY "Allow admins to manage timetable events"
ON public.timetable_events FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role_id IN (SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin'))
  )
);

-- Teachers can view their own schedule
CREATE POLICY "Allow teachers to view their schedule"
ON public.timetable_events FOR SELECT
USING (
  teacher_id = (
    SELECT id FROM public.teachers
    WHERE email = (SELECT email FROM public.profiles WHERE auth_user_id = auth.uid())
  )
  OR EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role_id IN (SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin'))
  )
);

-- Similar policies for recurring, exceptions, and conflicts
CREATE POLICY "Allow admins to manage timetable recurring"
ON public.timetable_recurring FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role_id IN (SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin'))
  )
);

CREATE POLICY "Allow admins to manage timetable exceptions"
ON public.timetable_exceptions FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role_id IN (SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin'))
  )
);

CREATE POLICY "Allow admins to view conflicts"
ON public.timetable_conflicts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role_id IN (SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin'))
  )
);

-- =============================================
-- 5. INDEXES FOR PERFORMANCE
-- =============================================

-- Events indexes
CREATE INDEX idx_timetable_events_batch_semester ON public.timetable_events(batch_id, semester);
CREATE INDEX idx_timetable_events_teacher ON public.timetable_events(teacher_id);
CREATE INDEX idx_timetable_events_subject ON public.timetable_events(subject_id);
CREATE INDEX idx_timetable_events_datetime ON public.timetable_events(start_time, end_time);
CREATE INDEX idx_timetable_events_status ON public.timetable_events(status);
CREATE INDEX idx_timetable_events_room ON public.timetable_events(room);

-- Recurring indexes
CREATE INDEX idx_recurring_batch_semester ON public.timetable_recurring(batch_id, semester);
CREATE INDEX idx_recurring_teacher ON public.timetable_recurring(teacher_id);
CREATE INDEX idx_recurring_subject ON public.timetable_recurring(subject_id);
CREATE INDEX idx_recurring_day ON public.timetable_recurring(day_of_week);
CREATE INDEX idx_recurring_date_range ON public.timetable_recurring(start_date, end_date);

-- Exceptions indexes
CREATE INDEX idx_exceptions_batch_date ON public.timetable_exceptions(batch_id, start_date, end_date);
CREATE INDEX idx_exceptions_type ON public.timetable_exceptions(exception_type);

-- Conflicts indexes
CREATE INDEX idx_conflicts_event ON public.timetable_conflicts(event_id);
CREATE INDEX idx_conflicts_type ON public.timetable_conflicts(conflict_type);
CREATE INDEX idx_conflicts_resolved ON public.timetable_conflicts(is_resolved);

-- =============================================
-- 6. HELPER FUNCTION - Generate events from recurring
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_recurring_events(
  p_recurring_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE (
  event_id UUID,
  event_date DATE,
  start_time TIMESTAMP,
  end_time TIMESTAMP
) AS $$
DECLARE
  v_rec RECORD;
  v_current_date DATE;
  v_start_ts TIMESTAMP;
  v_end_ts TIMESTAMP;
  v_day_diff INTEGER;
BEGIN
  SELECT * INTO v_rec FROM public.timetable_recurring WHERE id = p_recurring_id;
  
  IF v_rec IS NULL THEN
    RETURN;
  END IF;

  v_current_date := GREATEST(v_rec.start_date, p_start_date);
  
  WHILE v_current_date <= LEAST(COALESCE(v_rec.end_date, p_end_date), p_end_date) LOOP
    -- Check if this date is not in skip_dates
    IF NOT (v_rec.skip_dates @> ARRAY[v_current_date::TIMESTAMP]) THEN
      -- Check day of week matches
      IF EXTRACT(DOW FROM v_current_date)::INTEGER = v_rec.day_of_week THEN
        v_start_ts := v_current_date + v_rec.start_time;
        v_end_ts := v_current_date + v_rec.end_time;
        
        event_id := gen_random_uuid();
        event_date := v_current_date;
        start_time := v_start_ts;
        end_time := v_end_ts;
        
        RETURN NEXT;
      END IF;
    END IF;
    
    -- Move to next occurrence based on recurrence type
    v_current_date := CASE v_rec.recurrence_type
      WHEN 'weekly' THEN v_current_date + INTERVAL '1 week'
      WHEN 'biweekly' THEN v_current_date + INTERVAL '2 weeks'
      WHEN 'monthly' THEN v_current_date + INTERVAL '1 month'
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- 7. HELPER FUNCTION - Check for conflicts
-- =============================================

CREATE OR REPLACE FUNCTION public.check_timetable_conflicts(
  p_batch_id UUID,
  p_teacher_id UUID,
  p_room TEXT,
  p_start_time TIMESTAMP,
  p_end_time TIMESTAMP,
  p_exclude_event_id UUID DEFAULT NULL
)
RETURNS TABLE (
  conflict_found BOOLEAN,
  conflict_type TEXT,
  conflicting_with TEXT
) AS $$
DECLARE
  v_teacher_conflicts INTEGER;
  v_batch_conflicts INTEGER;
  v_room_conflicts INTEGER;
BEGIN
  -- Check teacher double-booking
  SELECT COUNT(*) INTO v_teacher_conflicts
  FROM public.timetable_events
  WHERE teacher_id = p_teacher_id
  AND status = 'active'
  AND (id != COALESCE(p_exclude_event_id, '00000000-0000-0000-0000-000000000000'))
  AND (
    (start_time, end_time) OVERLAPS (p_start_time, p_end_time)
  );

  IF v_teacher_conflicts > 0 THEN
    conflict_found := TRUE;
    conflict_type := 'teacher_double_booking';
    conflicting_with := 'Teacher is already scheduled';
    RETURN NEXT;
  END IF;

  -- Check batch overlapping classes
  SELECT COUNT(*) INTO v_batch_conflicts
  FROM public.timetable_events
  WHERE batch_id = p_batch_id
  AND status = 'active'
  AND (id != COALESCE(p_exclude_event_id, '00000000-0000-0000-0000-000000000000'))
  AND (
    (start_time, end_time) OVERLAPS (p_start_time, p_end_time)
  );

  IF v_batch_conflicts > 0 THEN
    conflict_found := TRUE;
    conflict_type := 'batch_overlap';
    conflicting_with := 'Batch already has a scheduled class';
    RETURN NEXT;
  END IF;

  -- Check room conflicts
  IF p_room IS NOT NULL THEN
    SELECT COUNT(*) INTO v_room_conflicts
    FROM public.timetable_events
    WHERE room = p_room
    AND status = 'active'
    AND (id != COALESCE(p_exclude_event_id, '00000000-0000-0000-0000-000000000000'))
    AND (
      (start_time, end_time) OVERLAPS (p_start_time, p_end_time)
    );

    IF v_room_conflicts > 0 THEN
      conflict_found := TRUE;
      conflict_type := 'room_conflict';
      conflicting_with := 'Room is already booked';
      RETURN NEXT;
    END IF;
  END IF;

  -- No conflicts found
  IF NOT conflict_found THEN
    conflict_found := FALSE;
    conflict_type := 'none';
    conflicting_with := NULL;
    RETURN NEXT;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================
-- 8. DATA MIGRATION (from old class_schedules if exists)
-- =============================================

-- =============================================
-- 9. DATA MIGRATION (from old class_schedules if exists)
-- =============================================

-- If you have existing data in class_schedules, run this migration:
-- INSERT INTO public.timetable_recurring (
--   batch_id, subject_id, teacher_id, semester, day_of_week, start_time, end_time,
--   room, event_type, recurrence_type, start_date, end_date, created_by
-- )
-- SELECT
--   batch_id, subject_id, teacher_id, semester,
--   CASE day_of_week
--     WHEN 'Sunday' THEN 0
--     WHEN 'Monday' THEN 1
--     WHEN 'Tuesday' THEN 2
--     WHEN 'Wednesday' THEN 3
--     WHEN 'Thursday' THEN 4
--     WHEN 'Friday' THEN 5
--     WHEN 'Saturday' THEN 6
--   END,
--   start_time, end_time, room, 'lecture', 'weekly',
--   CURRENT_DATE, CURRENT_DATE + INTERVAL '4 months',
--   (SELECT id FROM public.profiles LIMIT 1)
-- FROM public.class_schedules;
