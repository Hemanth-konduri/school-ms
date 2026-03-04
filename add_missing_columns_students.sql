-- Fix: Add missing columns to students table first, then add foreign keys
-- Run this in Supabase SQL Editor

-- Step 1: Add missing columns if they don't exist
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE students ADD COLUMN IF NOT EXISTS program_id UUID;
ALTER TABLE students ADD COLUMN IF NOT EXISTS group_id UUID;
ALTER TABLE students ADD COLUMN IF NOT EXISTS batch_id UUID;

-- Step 2: Add foreign key constraints
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_school_id_fkey;
ALTER TABLE students ADD CONSTRAINT students_school_id_fkey 
FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_program_id_fkey;
ALTER TABLE students ADD CONSTRAINT students_program_id_fkey 
FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_group_id_fkey;
ALTER TABLE students ADD CONSTRAINT students_group_id_fkey 
FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_batch_id_fkey;
ALTER TABLE students ADD CONSTRAINT students_batch_id_fkey 
FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL;

-- Step 3: Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' 
    AND column_name IN ('school_id', 'program_id', 'group_id', 'batch_id');
