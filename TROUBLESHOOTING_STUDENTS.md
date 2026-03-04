# Troubleshooting: Students Not Showing

## Issue
Students are not displaying in the Manage Students page even though data exists in the database.

## Solutions

### 1. Run the SQL Migration First
The page requires `is_disabled` and `disabled_at` columns. Run this SQL in Supabase:

```sql
-- File: add_student_disable_columns.sql
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS is_disabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_students_is_disabled ON students(is_disabled);
```

### 2. Check Browser Console
Open Developer Tools (F12) and check the Console tab for errors:
- Look for "Error fetching students:" messages
- Check for any Supabase query errors

### 3. Verify Data Structure
Make sure your students table has these columns:
- id
- name
- admission_number
- email
- phone
- academic_year
- batch_id
- school_id
- program_id
- group_id
- roll_number
- semester

### 4. Check Filters
The page loads ALL students by default. If you have filters applied:
- Click "Clear All" button to reset filters
- Click "Apply" button to reload data

### 5. Verify Foreign Keys
Students must have valid references to:
- schools table (school_id)
- programs table (program_id)
- groups table (group_id)

### 6. Check RLS Policies
Ensure your Supabase Row Level Security policies allow:
- SELECT on students table
- SELECT on schools, programs, groups, batches tables

Example policy:
```sql
-- Allow authenticated users to read students
CREATE POLICY "Allow authenticated read" ON students
FOR SELECT TO authenticated
USING (true);
```

### 7. Test Query Directly
Run this in Supabase SQL Editor:
```sql
SELECT 
  id, name, admission_number, email, phone, academic_year, batch_id,
  school_id, program_id, group_id, roll_number, semester
FROM students
ORDER BY name
LIMIT 10;
```

If this returns data, the issue is with the frontend.
If this returns nothing, check your data insertion.

## Enable/Disable Feature

Yes, the enable functionality is included! The same button works for both:
- **Orange Ban icon** = Disable account (when currently enabled)
- **Green Ban icon** = Enable account (when currently disabled)

The button color and text change based on the current state:
- Disabled accounts show green hover color
- Enabled accounts show orange hover color

## Quick Test
1. Open browser console (F12)
2. Go to Manage Students page
3. Look for any red error messages
4. Check Network tab for failed API calls
5. Verify the students query returns data

## Still Not Working?
Check these common issues:
- [ ] SQL migration was run successfully
- [ ] Browser cache cleared (Ctrl+Shift+R)
- [ ] Supabase connection is working
- [ ] User has admin role permissions
- [ ] Students table has data
- [ ] Foreign key relationships are valid
