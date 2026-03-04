-- Step 4: Populate existing students with data from their batches
-- Run this AFTER adding the columns

UPDATE students s
SET 
  school_id = b.school_id,
  program_id = b.program_id,
  group_id = b.group_id,
  academic_year = b.academic_year
FROM batches b
WHERE s.batch_id = b.id
  AND s.school_id IS NULL;

-- Verify the update
SELECT 
  s.name,
  s.admission_number,
  s.academic_year,
  sch.name as school_name,
  p.name as program_name,
  g.name as group_name,
  b.name as batch_name
FROM students s
LEFT JOIN schools sch ON s.school_id = sch.id
LEFT JOIN programs p ON s.program_id = p.id
LEFT JOIN groups g ON s.group_id = g.id
LEFT JOIN batches b ON s.batch_id = b.id
LIMIT 10;
