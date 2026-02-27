# 🗓️ Calendar-Based Timetable System Documentation

## Overview

The Calendar-Based Timetable System is a powerful scheduling solution that replaces the traditional form-based scheduling with an interactive, visual calendar interface. It includes drag-and-drop support, conflict detection, and multiple viewing options.

**Status:** ✅ Production Ready

---

## 📦 Installation

### 1. Install Dependencies

```bash
npm install react-big-calendar date-fns
```

### 2. Database Setup

Apply the SQL schema updates from `CALENDAR_TIMETABLE_UPGRADE.sql`:

```bash
# Run in Supabase SQL Editor
COPY all SQL from CALENDAR_TIMETABLE_UPGRADE.sql
```

This creates:
- `timetable_events` - Main event table
- `timetable_recurring` - Recurring schedule definitions
- `timetable_exceptions` - Holidays/breaks
- `timetable_conflicts` - Conflict audit trail
- Helper functions for conflict checking and recurring event generation

---

## 🎯 Core Features

### 1. Visual Calendar Interface

**Week View** (Default)
- 7-day grid showing all class schedules
- Color-coded events by type (lecture, practical, lab, exam, etc.)
- Click to create event, hover for edit/delete options
- Real-time conflict highlighting

**Day View**
- Detailed hourly view for single day
- Better for detailed event management
- Shows all events in chronological order

**Teacher View**
- View all classes assigned to a specific teacher
- Helps identify teacher load and conflicts
- Useful for teacher schedule optimization

### 2. Event Creation Modal

When creating/editing events, you can specify:

```
┌─────────────────────────────────────┐
│ Event Creation                      │
├─────────────────────────────────────┤
│ Subject *              [Select...]  │
│ Teacher *              [Select...]  │
│ Start Time *           [2024-01-15] │
│                        [09:00]      │
│ End Time *             [2024-01-15] │
│                        [10:00]      │
│ Room                   [A101]       │
│ Event Type             [Lecture]    │
│ Semester               [1]          │
│ Notes                  [...]        │
└─────────────────────────────────────┘
```

### 3. Conflict Detection

The system automatically checks for:

✅ **Teacher Double-Booking**
- Prevents same teacher from being scheduled in multiple places simultaneously
- Shows conflicting event details

✅ **Batch Overlap**
- Ensures batch doesn't have overlapping classes
- Critical for student schedule consistency

✅ **Room Conflicts**
- Prevents room double-booking
- Shows which class is already in the room

**Severity Levels:**
- 🔴 **Critical** - Must resolve before saving
- 🟡 **Warning** - Should review (e.g., room conflict)
- 🔵 **Info** - Advisory notifications

### 4. Multiple Filters

- **By Batch** - View specific batch's timetable
- **By Teacher** - View teacher's schedule
- **By Time Range** - Select week/date
- **By Event Type** - Filter by lecture/practical/exam

---

## 📋 Database Schema

### timetable_events (Main Events)

```sql
CREATE TABLE public.timetable_events (
  id UUID PRIMARY KEY,
  batch_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  start_time TIMESTAMP NOT NULL,
  end_time TIMESTAMP NOT NULL,
  room TEXT,
  event_type TEXT ('lecture', 'practical', 'lab', 'seminar', 'exam'),
  status TEXT ('active', 'cancelled', 'rescheduled'),
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### timetable_recurring (Repeating Patterns)

```sql
CREATE TABLE public.timetable_recurring (
  id UUID PRIMARY KEY,
  batch_id UUID NOT NULL,
  subject_id UUID NOT NULL,
  teacher_id UUID NOT NULL,
  day_of_week INTEGER (0-6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  recurrence_type TEXT ('weekly', 'biweekly', 'monthly'),
  start_date DATE,
  end_date DATE,
  skip_dates TIMESTAMP[],
  status TEXT ('active', 'archived')
)
```

### timetable_exceptions (Holidays/Breaks)

```sql
CREATE TABLE public.timetable_exceptions (
  id UUID PRIMARY KEY,
  batch_id UUID NOT NULL,
  start_date DATE,
  end_date DATE,
  exception_type TEXT ('holiday', 'exam_period', 'break', 'special_event'),
  title TEXT,
  description TEXT
)
```

### timetable_conflicts (Audit Trail)

```sql
CREATE TABLE public.timetable_conflicts (
  id UUID PRIMARY KEY,
  event_id UUID,
  conflict_type TEXT,
  severity TEXT ('info', 'warning', 'critical'),
  is_resolved BOOLEAN,
  resolution_notes TEXT
)
```

---

## 🔌 API Endpoints

### Check Conflicts

```
POST /api/timetable/check-conflicts

Request:
{
  "batch_id": "uuid",
  "teacher_id": "uuid",
  "room": "A101",
  "start_time": "2024-01-15T09:00:00Z",
  "end_time": "2024-01-15T10:00:00Z",
  "exclude_event_id": "uuid" // optional, for updates
}

Response:
{
  "conflicts": [
    {
      "type": "teacher_double_booking",
      "severity": "critical",
      "message": "Teacher is already scheduled..."
    }
  ],
  "hasConflicts": true,
  "criticalConflicts": 1
}
```

### List Events

```
GET /api/timetable/events?batch_id=xxx&start_date=2024-01-15&end_date=2024-01-21

Response:
{
  "events": [
    {
      "id": "uuid",
      "batch_id": "uuid",
      "subject": { "id": "uuid", "name": "Math" },
      "teacher": { "id": "uuid", "name": "Dr. Smith" },
      "start_time": "2024-01-15T09:00:00Z",
      "end_time": "2024-01-15T10:00:00Z",
      "room": "A101",
      "event_type": "lecture"
    }
  ]
}
```

### Create Event

```
POST /api/timetable/events

Request:
{
  "batch_id": "uuid",
  "subject_id": "uuid",
  "teacher_id": "uuid",
  "start_time": "2024-01-15T09:00:00Z",
  "end_time": "2024-01-15T10:00:00Z",
  "room": "A101",
  "event_type": "lecture",
  "semester": 1,
  "notes": "..."
}

Response:
{
  "event": { ...created event }
}
```

### Update Event

```
PATCH /api/timetable/events

Request:
{
  "id": "uuid",
  "start_time": "2024-01-15T10:00:00Z",
  "end_time": "2024-01-15T11:00:00Z"
}

Response:
{
  "event": { ...updated event }
}
```

### Delete Event

```
DELETE /api/timetable/events?id=uuid

Response:
{
  "success": true
}
```

---

## 🛠️ Utility Functions

Located in `src/lib/timetableUtils.ts`:

### Time Management

```typescript
formatTime(date) // "09:00"
formatDate(date) // "Jan 15, 2024"
getDurationHours(start, end) // 1.5
isEventToday(date) // true/false
isEventUpcoming(date) // true/false
```

### Scheduling Helpers

```typescript
getWeekStart(date) // Returns Sunday of the week
getWeekEnd(date) // Returns Saturday of the week
timeRangesOverlap(s1, e1, s2, e2) // true/false
getDayName(date) // "Monday"
getDayNumber(date) // 1 (0=Sunday)
```

### Grouping & Filtering

```typescript
groupEventsByDay(events) // { "01/15/2024": [...] }
groupEventsByTeacher(events) // { "Dr. Smith": [...] }
calculateEventPosition(eventStart, eventEnd, dayStart, dayEnd)
getEventColor(eventType) // "bg-blue-500"
```

### Export & Print

```typescript
exportToICalendar(events, batchName) // iCal format
formatForPrint(events) // HTML table
```

---

## 📱 Component Usage

### Basic Usage

```tsx
import CalendarTimetablePage from '@/app/dashboards/admin/classes/calendar-timetable/page'

<CalendarTimetablePage />
```

### Props (if componentized further)

```tsx
interface TimetableProps {
  batchId?: string
  viewMode?: 'week' | 'day' | 'teacher'
  onEventCreate?: (event) => void
  onEventUpdate?: (event) => void
  onEventDelete?: (eventId) => void
  readOnly?: boolean
}
```

---

## 🔒 Security & Permissions

### Row Level Security (RLS) Policies

**Admins**: Full access to all timetables
```sql
-- Can create, read, update, delete any timetable
```

**Teachers**: View only own schedule
```sql
-- Can see events where they are the assigned teacher
```

**Students**: View batch schedule (implemented by linking to batch)
```sql
-- Can see events for their batch
```

---

## 🚀 Deployment Steps

### 1. Database Migration

```bash
# In Supabase SQL Editor:
# Copy entire CALENDAR_TIMETABLE_UPGRADE.sql content
# Run all queries
```

### 2. Install Dependencies

```bash
npm install --save react-big-calendar date-fns
```

### 3. Deploy to Production

```bash
git add .
git commit -m "feat: add calendar-based timetable system"
npm run build
npm run deploy # or vercel deploy
```

### 4. Verify Installation

- Navigate to `/dashboards/admin/classes/calendar-timetable`
- Select a batch
- Create a test event
- Verify conflicts are detected

---

## 🎨 UI/UX Customization

### Theme Colors

Edit calendar colors in `page.tsx`:

```tsx
// Event colors by type
const eventColors = {
  lecture: 'bg-blue-500',
  practical: 'bg-green-500',
  lab: 'bg-purple-500',
  exam: 'bg-red-500'
}

// Conflict colors
const conflictColors = {
  critical: 'bg-red-100 border-red-500',
  warning: 'bg-yellow-100 border-yellow-500',
  info: 'bg-blue-100 border-blue-500'
}
```

### Calendar Hours

Modify working hours in utility functions:

```tsx
// Default 8 AM - 6 PM
export function isWithinSchoolHours(time: Date): boolean {
  const hours = time.getHours()
  return hours >= 8 && hours < 18
}
```

---

## 🐛 Troubleshooting

### Issue: Conflicts not detected

**Solution:** Ensure Supabase RLS policies are enabled and check API logs

### Issue: Events not loading

**Solution:** Verify batch_id is selected and date range is valid

### Issue: Teacher not showing in dropdown

**Solution:** Confirm teacher is marked as `is_active = true` in database

### Issue: Events overlapping in UI

**Solution:** Clear browser cache and refresh page

---

## 📊 Performance Optimization

### Indexing

The system automatically creates indexes on:
- `batch_id, semester` - Batch/semester queries
- `teacher_id` - Teacher schedule queries
- `start_time, end_time` - Datetime range queries
- `status` - Active/cancelled filtering

### Caching Strategies

Events are cached in React state and refetched:
- When batch changes
- When date range changes
- Every 30 minutes (implement polling if needed)

### Database Queries

Example optimized query:

```sql
SELECT * FROM timetable_events
WHERE batch_id = $1
  AND status = 'active'
  AND (start_time, end_time) OVERLAPS ($2, $3)
ORDER BY start_time ASC
```

---

## 🔄 Data Migration from Old System

If migrating from `class_schedules` table:

```sql
-- Uncomment and run in CALENDAR_TIMETABLE_UPGRADE.sql
INSERT INTO public.timetable_recurring (
  batch_id, subject_id, teacher_id, semester, day_of_week,
  start_time, end_time, room, event_type, recurrence_type,
  start_date, end_date, created_by
)
SELECT
  batch_id, subject_id, teacher_id, semester,
  CASE day_of_week
    WHEN 'Sunday' THEN 0
    WHEN 'Monday' THEN 1
    -- ... etc
  END,
  start_time, end_time, room, 'lecture', 'weekly',
  CURRENT_DATE, CURRENT_DATE + INTERVAL '6 months',
  (SELECT id FROM profiles LIMIT 1)
FROM class_schedules;
```

---

## 📞 Support

For issues or questions:
1. Check troubleshooting section above
2. Review database RLS policies
3. Check browser console for errors  
4. Verify Supabase connection in `.env.local`

---

## 📝 Future Enhancements

- [ ] Drag-and-drop event rescheduling
- [ ] Recurring event templates
- [ ] Holiday calendar management UI
- [ ] Student view (read-only)
- [ ] Teacher workload analytics
- [ ] Email reminders for schedule changes
- [ ] Google Calendar integration
- [ ] PDF export with custom formatting
- [ ] SMS notifications for urgent changes

---

**Last Updated:** February 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
