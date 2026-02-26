-- =============================================
-- ACADEMIC HIERARCHY SCHEMA
-- =============================================

-- 1. Schools Table
CREATE TABLE public.schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

-- 2. Programs Table
CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, school_id)
);

-- 3. Groups/Departments Table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, school_id, program_id)
);

-- 4. Batches Table
CREATE TABLE public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  academic_year TEXT NOT NULL,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.programs(id) ON DELETE CASCADE,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(name, academic_year, group_id)
);

-- 5. Students Table
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  admission_number TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  school_id UUID NOT NULL REFERENCES public.schools(id),
  program_id UUID NOT NULL REFERENCES public.programs(id),
  group_id UUID NOT NULL REFERENCES public.groups(id),
  academic_year TEXT NOT NULL,
  batch_id UUID REFERENCES public.batches(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS
ALTER TABLE public.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Schools Policies
CREATE POLICY "Allow admins to manage schools"
ON public.schools
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role_id IN (
      SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin')
    )
  )
);

-- Programs Policies
CREATE POLICY "Allow admins to manage programs"
ON public.programs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role_id IN (
      SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin')
    )
  )
);

-- Groups Policies
CREATE POLICY "Allow admins to manage groups"
ON public.groups
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role_id IN (
      SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin')
    )
  )
);

-- Batches Policies
CREATE POLICY "Allow admins to manage batches"
ON public.batches
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role_id IN (
      SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin')
    )
  )
);

-- Students Policies
CREATE POLICY "Allow admins to manage students"
ON public.students
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.auth_user_id = auth.uid()
    AND profiles.role_id IN (
      SELECT id FROM public.roles WHERE name IN ('super_admin', 'admin')
    )
  )
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX idx_programs_school ON public.programs(school_id);
CREATE INDEX idx_groups_school_program ON public.groups(school_id, program_id);
CREATE INDEX idx_batches_group_year ON public.batches(group_id, academic_year);
CREATE INDEX idx_students_batch ON public.students(batch_id);
CREATE INDEX idx_students_unassigned ON public.students(school_id, program_id, group_id, academic_year) WHERE batch_id IS NULL;
