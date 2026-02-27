# 🚀 Calendar Timetable - Quick Start Guide

## Installation & Setup (5 minutes)

### Step 1: Apply Database Schema

Copy the entire contents of `CALENDAR_TIMETABLE_UPGRADE.sql` and paste it into your Supabase SQL Editor:

1. Open Supabase Console → Your Project → SQL Editor
2. Create a new query and paste the entire SQL
3. Click "Run"
4. Wait for all tables, indexes, and functions to be created

**Expected output:** ✅ Successfully executed

### Step 2: Install NPM Packages

```bash
cd school-ms
npm install react-big-calendar date-fns
npm run build  # Test that everything compiles
```

### Step 3: Access the Calendar

Navigate to: http://localhost:3000/dashboards/admin/classes/calendar-timetable

You should see:
- Batch selector dropdown
- Week view calendar grid
- Navigation buttons (Previous/Next)
- "New Event" button

---

## Basic Usage

### Creating an Event

1. Click "New Event" button
2. Fill in the form:
   - **Subject** - Pick from dropdown (populated from selected batch)
   - **Teacher** - Pick from active teachers list
   - **Start Time** - YYYY-MM-DD HH:MM format
   - **End Time** - Must be after start time
   - **Room** - Optional (e.g., "A101")
   - **Event Type** - Lecture, Practical, Lab, Seminar, or Exam
   - **Notes** - Optional additional info

3. System checks for conflicts:
   - 🔴 **Teacher double-booked?** → Error (cannot save)
   - 🔴 **Batch overlap?** → Error (cannot save)  
   - 🟡 **Room conflict?** → Warning (shows alert)

4. Click "Create Event" if no critical conflicts

### Viewing the Schedule

**Week View (Default)**
- 7 columns = Sunday to Saturday
- Click event to edit
- Hover to see edit/delete buttons
- Color coded by event type

**Navigating Weeks**
- Use "← Prev" / "Next →" buttons
- Or pick date from picker

**Filter by Batch**
- Change batch in dropdown
- Calendar automatically reloads

### Editing Events

1. Click event card in calendar
2. Modal opens with current values
3. Edit any field
4. System checks conflicts again
5. Click "Update Event"

### Deleting Events

1. Click event in calendar
2. Modal opens
3. Hover over event or look for delete button
4. Click trash icon
5. Confirm deletion

---

## Understanding Conflict Detection

### How It Works

When you try to create/save an event, the system checks:

#### 1. Teacher Double-Booking
```
Teacher: Dr. Smith
Existing: Mon 9:00-10:00 (Math)
New attempt: Mon 9:30-10:30 (Physics)
❌ CONFLICT: Times overlap - cannot save
```

#### 2. Batch Overlap
```
Batch: CS-2024-A
Existing: Mon 9:00-10:00 (Database)
New attempt: Mon 9:30-10:30 (Networks)
❌ CONFLICT: Batch can't have 2 classes same time
```

#### 3. Room Conflict
```
Room: A101
Existing: Mon 9:00-10:00 (Math Class)
New attempt: Mon 9:30-10:30 (Physics Lab)
⚠️ WARNING: Room occupied - review before saving
```

### Severity Levels

| Level | Color | Meaning | Action |
|-------|-------|---------|--------|
| 🔴 Critical | Red | Block save | Fix and retry |
| 🟡 Warning | Yellow | Alert user | Review and decide |
| 🔵 Info | Blue | Notification | Just inform |

---

## API Examples

### Check Conflicts Before Saving

```typescript
// Called automatically in the form, but you can call it directly

const response = await fetch('/api/timetable/check-conflicts', {
  method: 'POST',
  body: JSON.stringify({
    batch_id: 'abc123',
    teacher_id: 'def456',
    room: 'A101',
    start_time: '2024-01-15T09:00:00Z',
    end_time: '2024-01-15T10:00:00Z'
  })
})

const result = await response.json()
// result.conflicts = [...]
// result.hasConflicts = true/false
// result.criticalConflicts = number
```

### Get Events for Week

```typescript
const response = await fetch(
  '/api/timetable/events?batch_id=xyz&start_date=2024-01-15&end_date=2024-01-21'
)
const { events } = await response.json()
```

### Create Event

```typescript
const response = await fetch('/api/timetable/events', {
  method: 'POST',
  body: JSON.stringify({
    batch_id: 'abc123',
    subject_id: 'sub456',
    teacher_id: 'tch789',
    start_time: '2024-01-15T09:00:00Z',
    end_time: '2024-01-15T10:00:00Z',
    room: 'A101',
    event_type: 'lecture',
    semester: 1,
    notes: 'Introduction to topic'
  })
})
```

---

## Database Queries

### Find All Events for a Batch

```sql
SELECT 
  e.*,
  s.name as subject_name,
  t.name as teacher_name
FROM timetable_events e
JOIN subjects s ON e.subject_id = s.id
JOIN teachers t ON e.teacher_id = t.id
WHERE e.batch_id = '...'
  AND e.status = 'active'
ORDER BY e.start_time;
```

### Find Teacher's Schedule

```sql
SELECT *
FROM timetable_events
WHERE teacher_id = '...'
  AND status = 'active'
ORDER BY start_time;
```

### Check for Conflicts

```sql
-- Teacher conflicts
SELECT *
FROM timetable_events
WHERE teacher_id = '...'
  AND status = 'active'
  AND tsrange(start_time, end_time) && tsrange('2024-01-15 09:00'::timestamp, '2024-01-15 10:00'::timestamp);

-- Batch conflicts  
SELECT *
FROM timetable_events
WHERE batch_id = '...'
  AND status = 'active'
  AND tsrange(start_time, end_time) && tsrange('2024-01-15 09:00'::timestamp, '2024-01-15 10:00'::timestamp);

-- Room conflicts
SELECT *
FROM timetable_events
WHERE room = 'A101'
  AND status = 'active'
  AND tsrange(start_time, end_time) && tsrange('2024-01-15 09:00'::timestamp, '2024-01-15 10:00'::timestamp);
```

---

## Utility Functions Guide

Imported from `src/lib/timetableUtils.ts`:

### Time Formatting

```typescript
import { formatTime, formatDate, getDurationHours } from '@/lib/timetableUtils'

formatTime(new Date()) // "14:30"
formatDate(new Date()) // "Jan 15, 2024"
getDurationHours('2024-01-15T09:00:00', '2024-01-15T10:30:00') // 1.5
```

### Schedule Helpers

```typescript
import { getWeekStart, getWeekEnd, timeRangesOverlap } from '@/lib/timetableUtils'

const weekStart = getWeekStart() // Sunday of current week
const weekEnd = getWeekEnd() // Saturday of current week
const overlap = timeRangesOverlap(start1, end1, start2, end2) // true/false
```

### Grouping Data

```typescript
import { groupEventsByDay, groupEventsByTeacher } from '@/lib/timetableUtils'

const byDay = groupEventsByDay(events)
// { "01/15/2024": [...], "01/16/2024": [...] }

const byTeacher = groupEventsByTeacher(events)
// { "Dr. Smith": [...], "Prof. Jones": [...] }
```

---

## Common Tasks

### Task: Display a Teacher's Weekly Schedule

```tsx
'use client'
import { useEffect, useState } from 'react'

export default function TeacherSchedule({ teacherId }: { teacherId: string }) {
  const [events, setEvents] = useState([])

  useEffect(() => {
    fetch(`/api/timetable/events?teacher_id=${teacherId}`)
      .then(r => r.json())
      .then(({ events }) => setEvents(events))
  }, [teacherId])

  return (
    <div>
      {events.map(event => (
        <div key={event.id}>
          <h3>{event.subjects.name}</h3>
          <p>{event.start_time} - {event.end_time}</p>
          <p>Room: {event.room}</p>
        </div>
      ))}
    </div>
  )
}
```

### Task: Prevent Scheduling During Exams

Add to conflict detection:

```sql
-- Check if period is exam period
SELECT COUNT(*) as exam_period_count
FROM timetable_exceptions
WHERE batch_id = $1
  AND exception_type = 'exam_period'
  AND start_date <= DATE($2)
  AND end_date >= DATE($2);
```

### Task: Bulk Create Weekly Schedule

```typescript
const createWeeklySchedule = async (batchId: string, schedule: any[]) => {
  for (const item of schedule) {
    const startDate = new Date(item.date)
    startDate.setHours(item.startHour, 0, 0)
    
    const endDate = new Date(startDate)
    endDate.setHours(item.endHour, 0, 0)

    await fetch('/api/timetable/events', {
      method: 'POST',
      body: JSON.stringify({
        batch_id: batchId,
        subject_id: item.subjectId,
        teacher_id: item.teacherId,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        room: item.room,
        event_type: 'lecture'
      })
    })
  }
}
```

---

## Troubleshooting

### "Batch not loading in dropdown"
- Check that batches exist in database
- Verify RLS policies allow reading batches
- Check browser console for errors

### "Events not showing in calendar"
- Select a batch first (required)
- Check date range is correct
- Verify events exist in selected batch/date range
- Clear cache: Ctrl+Shift+Delete

### "Conflict detection not working"
- Check API endpoint reachability: `/api/timetable/check-conflicts`
- Verify Supabase connection
- Check RLS policies are enabled
- Review error message in console

### "Can't delete/edit event"
- Verify you have admin permissions
- Check RLS policy allows the operation
- Confirm event status is 'active' (not cancelled)

---

## Performance Tips

1. **Always select a batch first** - Reduces query load
2. **Use date range filters** - Avoids loading all events
3. **Large calendars?** - Consider pagination
4. **Room conflicts taking time?** - Index the room column

```sql
-- Add if needed:
CREATE INDEX idx_events_room ON timetable_events(room) 
WHERE status = 'active';
```

---

## Next Steps

1. ✅ Database schema applied
2. ✅ Calendar loading and working
3. ⏭️ Create sample data:
   - Add 3-4 batches
   - Assign teachers
   - Create sample events
4. ⏭️ Test conflict detection with overlapping events
5. ⏭️ Try different viewing modes and filters

---

## Need Help?

📖 **Full Documentation:** `CALENDAR_TIMETABLE_README.md`  
🔧 **API Details:** `/api/timetable/*` route files  
🛠️ **Utilities:** `src/lib/timetableUtils.ts`  
📦 **Database:** `CALENDAR_TIMETABLE_UPGRADE.sql`

**Last Updated:** February 2026
