-- Fix: Add foreign key relationships for students table
-- Run this in your Supabase SQL Editor

-- Add foreign key constraint from students to schools
ALTER TABLE students
DROP CONSTRAINT IF EXISTS students_school_id_fkey;

ALTER TABLE students
ADD CONSTRAINT students_school_id_fkey 
FOREIGN KEY (school_id) 
REFERENCES schools(id) 
ON DELETE CASCADE;

-- Add foreign key constraint from students to programs
ALTER TABLE students
DROP CONSTRAINT IF EXISTS students_program_id_fkey;

ALTER TABLE students
ADD CONSTRAINT students_program_id_fkey 
FOREIGN KEY (program_id) 
REFERENCES programs(id) 
ON DELETE CASCADE;

-- Add foreign key constraint from students to groups
ALTER TABLE students
DROP CONSTRAINT IF EXISTS students_group_id_fkey;

ALTER TABLE students
ADD CONSTRAINT students_group_id_fkey 
FOREIGN KEY (group_id) 
REFERENCES groups(id) 
ON DELETE CASCADE;

-- Add foreign key constraint from students to batches
ALTER TABLE students
DROP CONSTRAINT IF EXISTS students_batch_id_fkey;

ALTER TABLE students
ADD CONSTRAINT students_batch_id_fkey 
FOREIGN KEY (batch_id) 
REFERENCES batches(id) 
ON DELETE SET NULL;

-- Verify the constraints were added
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'students';
