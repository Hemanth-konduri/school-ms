-- Diagnose student dashboard issue
-- Run this and share the results

-- 1. Check if students table has profile_id or email column
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'students' 
  AND column_name IN ('profile_id', 'email', 'auth_user_id');

-- 2. Check profiles table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
  AND column_name IN ('id', 'auth_user_id', 'email');

-- 3. Check if there's a student record for a test email
-- Replace 'student@example.com' with actual student email
SELECT * FROM students WHERE email = 'student@example.com';

-- 4. Check if there's a profile for that email
SELECT id, email, auth_user_id FROM profiles WHERE email = 'student@example.com';

-- 5. Check foreign key from profiles to students
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'profiles';
