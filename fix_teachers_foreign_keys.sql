-- Fix: Add foreign key relationships for teachers table
-- Run this in your Supabase SQL Editor

-- Add foreign key constraint from teachers to schools
ALTER TABLE teachers
DROP CONSTRAINT IF EXISTS teachers_school_id_fkey;

ALTER TABLE teachers
ADD CONSTRAINT teachers_school_id_fkey 
FOREIGN KEY (school_id) 
REFERENCES schools(id) 
ON DELETE CASCADE;

-- Verify the constraint was added
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
    AND tc.table_name = 'teachers';
