-- Insert sample timetable events for teacher
-- Replace the UUIDs with actual values from your database

-- First, get the teacher_id, batch_id, and subject_id from your database
-- Teacher: kondurihemanth220806@gmail.com (ID: 31bd75b0-3ad5-4469-8582-1f2aff9b22e5)

-- Example: Insert timetable events for today
INSERT INTO timetable_events (
  batch_id,
  subject_id,
  teacher_id,
  start_time,
  end_time,
  room,
  event_type,
  status,
  notes
) VALUES
-- Class 1: 9:00 AM - 10:00 AM
(
  (SELECT id FROM batches LIMIT 1), -- Replace with actual batch_id
  (SELECT id FROM subjects LIMIT 1), -- Replace with actual subject_id
  '31bd75b0-3ad5-4469-8582-1f2aff9b22e5', -- Teacher ID
  CURRENT_DATE + INTERVAL '9 hours',
  CURRENT_DATE + INTERVAL '10 hours',
  'Room 101',
  'lecture',
  'scheduled',
  'Introduction to the topic'
),
-- Class 2: 11:00 AM - 12:00 PM
(
  (SELECT id FROM batches LIMIT 1),
  (SELECT id FROM subjects LIMIT 1),
  '31bd75b0-3ad5-4469-8582-1f2aff9b22e5',
  CURRENT_DATE + INTERVAL '11 hours',
  CURRENT_DATE + INTERVAL '12 hours',
  'Room 102',
  'lecture',
  'scheduled',
  'Continuation of morning session'
),
-- Class 3: 2:00 PM - 3:00 PM
(
  (SELECT id FROM batches LIMIT 1),
  (SELECT id FROM subjects LIMIT 1),
  '31bd75b0-3ad5-4469-8582-1f2aff9b22e5',
  CURRENT_DATE + INTERVAL '14 hours',
  CURRENT_DATE + INTERVAL '15 hours',
  'Lab 201',
  'practical',
  'scheduled',
  'Hands-on practice session'
);

-- To check what batch_id and subject_id exist, run:
-- SELECT id, name FROM batches;
-- SELECT id, name FROM subjects;
