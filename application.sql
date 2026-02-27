-- create table public.roles (
--   id uuid primary key default gen_random_uuid(),
--   name text unique not null
-- );

-- insert into public.roles (name) values
-- ('super_admin'),
-- ('admin'),
-- ('principal'),
-- ('teacher'),
-- ('accountant'),
-- ('student'),
-- ('parent'),
-- ('staff');


-- create table public.profiles (
--   id uuid primary key default gen_random_uuid(),
--   email text unique not null,
--   full_name text,
--   role_id uuid references public.roles(id),
--   auth_user_id uuid unique,
--   is_active boolean default true,
--   created_at timestamp default now()
-- );


-- create or replace function public.handle_first_user()
-- returns trigger
-- language plpgsql
-- security definer
-- as $$
-- declare
--   user_count integer;
--   super_admin_role uuid;
-- begin

--   -- count profiles
--   select count(*) into user_count from public.profiles;

--   -- get super_admin role
--   select id into super_admin_role
--   from public.roles
--   where name = 'super_admin';

--   if user_count = 0 then
--     -- first login → create super admin profile
--     insert into public.profiles (email, role_id, auth_user_id)
--     values (new.email, super_admin_role, new.id);
--   else
--     -- other users → check if email exists
--     if not exists (
--       select 1 from public.profiles
--       where email = new.email
--       and is_active = true
--     ) then
--       raise exception 'Unauthorized email. Contact admin.';
--     end if;

--     -- link auth user id
--     update public.profiles
--     set auth_user_id = new.id
--     where email = new.email;
--   end if;

--   return new;
-- end;
-- $$;



-- create trigger on_auth_user_created
-- after insert on auth.users
-- for each row
-- execute procedure public.handle_first_user();


-- alter table public.profiles enable row level security;


-- create policy "Users can read own profile"
-- on public.profiles
-- for select
-- using (auth.uid() = auth_user_id);



-- create policy "Allow super_admin to insert users"
-- on public.profiles
-- for insert
-- with check (
--   exists (
--     select 1
--     from public.profiles p
--     join public.roles r on p.role_id = r.id
--     where p.auth_user_id = auth.uid()
--     and r.name = 'super_admin'
--   )
-- );



-- =============================================
-- ACADEMIC HIERARCHY SCHEMA
-- =============================================

-- -- 1. Schools Table
-- CREATE TABLE public.schools (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name TEXT NOT NULL UNIQUE,
--   created_at TIMESTAMP DEFAULT NOW(),
--   created_by UUID REFERENCES public.profiles(id)
-- );

-- -- 2. Programs Table
-- CREATE TABLE public.programs (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name TEXT NOT NULL,
--   school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
--   created_at TIMESTAMP DEFAULT NOW(),
--   UNIQUE(name, school_id)
-- );

-- -- 3. Groups/Departments Table
-- CREATE TABLE public.groups (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name TEXT NOT NULL,
--   school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
--   program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
--   created_at TIMESTAMP DEFAULT NOW(),
--   UNIQUE(name, school_id, program_id)
-- );

-- -- 4. Batches Table
-- CREATE TABLE public.batches (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name TEXT NOT NULL,
--   academic_year TEXT NOT NULL,
--   school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
--   program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
--   group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
--   created_at TIMESTAMP DEFAULT NOW(),
--   UNIQUE(name, academic_year, group_id)
-- );

-- -- 5. Students Table
-- CREATE TABLE public.students (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name TEXT NOT NULL,
--   admission_number TEXT NOT NULL UNIQUE,
--   email TEXT NOT NULL UNIQUE,
--   phone TEXT,
--   school_id UUID NOT NULL REFERENCES public.schools(id),
--   program_id UUID NOT NULL REFERENCES public.programs(id),
--   group_id UUID NOT NULL REFERENCES public.groups(id),
--   academic_year TEXT NOT NULL,
--   batch_id UUID REFERENCES public.batches(id),
--   created_at TIMESTAMP DEFAULT NOW()
-- );

-- -- =============================================
-- -- ROW LEVEL SECURITY POLICIES
-- -- =============================================

-- -- Enable RLS
-- ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- -- Schools Policies
-- CREATE POLICY "Allow admins to manage schools"
-- ON public.schools
-- FOR ALL
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.profiles
--     WHERE profiles.auth_user_id = auth.uid()
--     AND profiles.role_id IN (
--       SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin')
--     )
--   )
-- );

-- -- Programs Policies
-- CREATE POLICY "Allow admins to manage programs"
-- ON public.programs
-- FOR ALL
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.profiles
--     WHERE profiles.auth_user_id = auth.uid()
--     AND profiles.role_id IN (
--       SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin')
--     )
--   )
-- );

-- -- Groups Policies
-- CREATE POLICY "Allow admins to manage groups"
-- ON public.groups
-- FOR ALL
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.profiles
--     WHERE profiles.auth_user_id = auth.uid()
--     AND profiles.role_id IN (
--       SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin')
--     )
--   )
-- );

-- -- Batches Policies
-- CREATE POLICY "Allow admins to manage batches"
-- ON public.batches
-- FOR ALL
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.profiles
--     WHERE profiles.auth_user_id = auth.uid()
--     AND profiles.role_id IN (
--       SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin')
--     )
--   )
-- );

-- -- Students Policies
-- CREATE POLICY "Allow admins to manage students"
-- ON public.students
-- FOR ALL
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.profiles
--     WHERE profiles.auth_user_id = auth.uid()
--     AND profiles.role_id IN (
--       SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin')
--     )
--   )
-- );

-- -- =============================================
-- -- INDEXES FOR PERFORMANCE
-- -- =============================================

-- CREATE INDEX idx_programs_school ON public.programs(school_id);
-- CREATE INDEX idx_groups_school_program ON public.groups(school_id, program_id);
-- CREATE INDEX idx_batches_group_year ON public.batches(group_id, academic_year);
-- CREATE INDEX idx_students_batch ON public.students(batch_id);
-- CREATE INDEX idx_students_unassigned ON public.students(school_id, program_id, group_id, academic_year) WHERE batch_id IS NULL;



-- =============================================
-- PHASE 1: SUBJECTS (semester-wise per batch)
-- =============================================

CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 12),
  credits INTEGER DEFAULT 3,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, batch_id, semester)
);

-- =============================================
-- PHASE 2: TEACHERS
-- =============================================

CREATE TABLE public.teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  employee_id TEXT UNIQUE,
  designation TEXT,
  department TEXT,
  school_id UUID REFERENCES public.schools(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Class Teacher: one teacher per batch
CREATE TABLE public.class_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(batch_id) -- only one class teacher per batch
);

-- Subject Teacher: teacher assigned to subject for a specific batch+semester
CREATE TABLE public.subject_teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(subject_id, batch_id) -- one teacher per subject per batch
);

-- =============================================
-- PHASE 3: CLASS SCHEDULE / TIMETABLE
-- =============================================

CREATE TABLE public.class_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.batches(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  semester INTEGER NOT NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday')),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT valid_time CHECK (end_time > start_time)
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subject_teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admins to manage subjects"
ON public.subjects FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role_id IN (SELECT id FROM public.roles WHERE name IN ('super_admin','admin'))
  )
);

CREATE POLICY "Allow admins to manage teachers"
ON public.teachers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role_id IN (SELECT id FROM public.roles WHERE name IN ('super_admin','admin'))
  )
);

CREATE POLICY "Allow admins to manage class_teachers"
ON public.class_teachers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role_id IN (SELECT id FROM public.roles WHERE name IN ('super_admin','admin'))
  )
);

CREATE POLICY "Allow admins to manage subject_teachers"
ON public.subject_teachers FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role_id IN (SELECT id FROM public.roles WHERE name IN ('super_admin','admin'))
  )
);

CREATE POLICY "Allow admins to manage class_schedules"
ON public.class_schedules FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role_id IN (SELECT id FROM public.roles WHERE name IN ('super_admin','admin'))
  )
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_subjects_batch_semester ON public.subjects(batch_id, semester);
CREATE INDEX idx_subjects_school_program ON public.subjects(school_id, program_id);
CREATE INDEX idx_teachers_school ON public.teachers(school_id);
CREATE INDEX idx_teachers_active ON public.teachers(is_active);
CREATE INDEX idx_class_teachers_batch ON public.class_teachers(batch_id);
CREATE INDEX idx_subject_teachers_subject ON public.subject_teachers(subject_id);
CREATE INDEX idx_subject_teachers_teacher ON public.subject_teachers(teacher_id);
CREATE INDEX idx_subject_teachers_batch ON public.subject_teachers(batch_id);
CREATE INDEX idx_schedules_batch_semester ON public.class_schedules(batch_id, semester);
CREATE INDEX idx_schedules_teacher ON public.class_schedules(teacher_id);
CREATE INDEX idx_schedules_day ON public.class_schedules(day_of_week);

-- =============================================
-- NOTIFICATION MANAGEMENT SYSTEM
-- =============================================

-- Main Notifications Table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
  notification_type TEXT DEFAULT 'in_app' CHECK (notification_type IN ('in_app', 'email', 'push', 'all')),
  attachment_url TEXT,
  attachment_type TEXT CHECK (attachment_type IN ('pdf', 'image') OR attachment_type IS NULL),
  link_url TEXT,
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent', 'expired')),
  scheduled_at TIMESTAMP,
  sent_at TIMESTAMP,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notification Targets (which user types/roles/groups should receive this)
CREATE TABLE public.notification_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('role', 'school', 'program', 'group', 'batch', 'teacher', 'student', 'everyone')),
  target_value TEXT, -- role name, school id, program id, etc.
  created_at TIMESTAMP DEFAULT NOW()
);

-- User Notifications (for tracking which users received which notifications and read status)
CREATE TABLE public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(notification_id, recipient_id)
);

-- Notification Delivery Logs (for tracking delivery status)
CREATE TABLE public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  delivery_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
  error_message TEXT,
  delivered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Notification Policies
CREATE POLICY "Allow admins to manage notifications"
ON public.notifications FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role_id IN (SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin'))
  )
);

CREATE POLICY "Allow users to view their notifications"
ON public.user_notifications FOR SELECT
USING (
  recipient_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Allow users to update their notification read status"
ON public.user_notifications FOR UPDATE
USING (
  recipient_id = (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
);

CREATE POLICY "Allow admins to manage notification targets"
ON public.notification_targets FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role_id IN (SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin'))
  )
);

CREATE POLICY "Allow admins to view notification logs"
ON public.notification_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role_id IN (SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin'))
  )
);

-- Indexes for Performance
CREATE INDEX idx_notifications_created_by ON public.notifications(created_by);
CREATE INDEX idx_notifications_status ON public.notifications(status);
CREATE INDEX idx_notifications_scheduled_at ON public.notifications(scheduled_at);
CREATE INDEX idx_notification_targets_notification ON public.notification_targets(notification_id);
CREATE INDEX idx_user_notifications_recipient ON public.user_notifications(recipient_id);
CREATE INDEX idx_user_notifications_is_read ON public.user_notifications(is_read);
CREATE INDEX idx_notification_logs_notification ON public.notification_logs(notification_id);
CREATE INDEX idx_notification_logs_status ON public.notification_logs(status);
