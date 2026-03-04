-- Fix: Add missing columns to students table
-- Your students table is missing: school_id, program_id, group_id, academic_year

-- Step 1: Add missing columns
ALTER TABLE students ADD COLUMN school_id UUID;
ALTER TABLE students ADD COLUMN program_id UUID;
ALTER TABLE students ADD COLUMN group_id UUID;
ALTER TABLE students ADD COLUMN academic_year TEXT;

-- Step 2: Add foreign key constraints (skip batch_id since it already exists)
ALTER TABLE students 
ADD CONSTRAINT students_school_id_fkey 
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE students 
ADD CONSTRAINT students_program_id_fkey 
FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;

ALTER TABLE students 
ADD CONSTRAINT students_group_id_fkey 
FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

-- Step 3: Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' 
ORDER BY ordinal_position;
