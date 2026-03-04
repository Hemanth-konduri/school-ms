# Fix: "Could not find a relationship" Error

## Problem
Error: `Could not find a relationship between 'students' and 'schools' in the schema cache`

This means the `students` table doesn't have proper foreign key constraints to related tables.

## Solution

### Step 1: Check Current Schema (Optional)
Run this to see what's missing:
```sql
-- File: check_schema.sql
-- Run in Supabase SQL Editor
```

### Step 2: Fix Students Table Foreign Keys
Run this SQL in Supabase SQL Editor:

```sql
-- File: fix_students_foreign_keys.sql

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
```

### Step 3: Fix Teachers Table Foreign Keys
Run this SQL in Supabase SQL Editor:

```sql
-- File: fix_teachers_foreign_keys.sql

-- Add foreign key constraint from teachers to schools
ALTER TABLE teachers
DROP CONSTRAINT IF EXISTS teachers_school_id_fkey;

ALTER TABLE teachers
ADD CONSTRAINT teachers_school_id_fkey 
FOREIGN KEY (school_id) 
REFERENCES schools(id) 
ON DELETE CASCADE;
```

### Step 4: Refresh Supabase Schema Cache
After running the SQL:
1. Go to Supabase Dashboard
2. Click on your project
3. Go to Settings → API
4. Click "Refresh schema cache" button (or wait a few minutes)

### Step 5: Test
1. Refresh your browser (Ctrl+Shift+R)
2. Go to Admin Dashboard → Manage Students
3. Should now load without errors

## Why This Happens

Supabase uses PostgREST which relies on foreign key relationships to enable nested queries like:
```javascript
.select('id, name, schools(name), programs(name)')
```

Without foreign keys, Supabase doesn't know how to join the tables.

## What the Fix Does

### For Students Table
- Links `school_id` → `schools.id`
- Links `program_id` → `programs.id`
- Links `group_id` → `groups.id`
- Links `batch_id` → `batches.id`

### For Teachers Table
- Links `school_id` → `schools.id`

### ON DELETE Behavior
- `CASCADE`: If school/program/group is deleted, delete the student/teacher too
- `SET NULL`: If batch is deleted, set student's batch_id to NULL (don't delete student)

## Verification

After running the fix, verify with:
```sql
-- Check students foreign keys
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
    AND tc.table_name = 'students';
```

Should show:
- students_school_id_fkey → schools
- students_program_id_fkey → programs
- students_group_id_fkey → groups
- students_batch_id_fkey → batches

## Troubleshooting

### Error: "violates foreign key constraint"
This means you have data in students table with invalid school_id/program_id/group_id values.

**Fix**: Clean up invalid data first:
```sql
-- Find students with invalid school_id
SELECT id, name, school_id 
FROM students 
WHERE school_id NOT IN (SELECT id FROM schools);

-- Option 1: Delete invalid students
DELETE FROM students 
WHERE school_id NOT IN (SELECT id FROM schools);

-- Option 2: Update to valid school_id
UPDATE students 
SET school_id = (SELECT id FROM schools LIMIT 1)
WHERE school_id NOT IN (SELECT id FROM schools);
```

### Error: "column does not exist"
The students table is missing required columns.

**Fix**: Add missing columns:
```sql
ALTER TABLE students ADD COLUMN IF NOT EXISTS school_id UUID;
ALTER TABLE students ADD COLUMN IF NOT EXISTS program_id UUID;
ALTER TABLE students ADD COLUMN IF NOT EXISTS group_id UUID;
ALTER TABLE students ADD COLUMN IF NOT EXISTS batch_id UUID;
```

### Still Not Working?
1. Clear browser cache (Ctrl+Shift+R)
2. Check browser console (F12) for errors
3. Verify all tables exist: schools, programs, groups, batches, students
4. Check Supabase logs for detailed error messages
5. Wait 5 minutes for schema cache to refresh automatically

## Quick Fix (All-in-One)

Run this single SQL script:

```sql
-- Complete fix for students and teachers relationships

-- Students foreign keys
ALTER TABLE students DROP CONSTRAINT IF EXISTS students_school_id_fkey;
ALTER TABLE students ADD CONSTRAINT students_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_program_id_fkey;
ALTER TABLE students ADD CONSTRAINT students_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE;

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_group_id_fkey;
ALTER TABLE students ADD CONSTRAINT students_group_id_fkey FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE;

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_batch_id_fkey;
ALTER TABLE students ADD CONSTRAINT students_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE SET NULL;

-- Teachers foreign keys
ALTER TABLE teachers DROP CONSTRAINT IF EXISTS teachers_school_id_fkey;
ALTER TABLE teachers ADD CONSTRAINT teachers_school_id_fkey FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;

-- Done! Refresh schema cache in Supabase Dashboard
```
