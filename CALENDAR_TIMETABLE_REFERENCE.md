# 📟 Calendar Timetable - Quick Reference Card

## 🚀 Installation (5 Steps)

```bash
# Step 1: Apply SQL Schema
# Copy entire CALENDAR_TIMETABLE_UPGRADE.sql → Supabase SQL Editor → Run

# Step 2: Install packages
npm install react-big-calendar date-fns

# Step 3: Test build
npm run build

# Step 4: Start local dev server
npm run dev

# Step 5: Open in browser
# Navigate to: http://localhost:3000/dashboards/admin/classes/calendar-timetable
```

---

## 📁 File Locations

```
Project Root
├── CALENDAR_TIMETABLE_UPGRADE.sql          ← Database schema
├── CALENDAR_TIMETABLE_README.md            ← Full documentation
├── CALENDAR_TIMETABLE_QUICKSTART.md        ← Quick start guide
├── CALENDAR_TIMETABLE_CHECKLIST.md         ← Deployment checklist
├── CALENDAR_TIMETABLE_SUMMARY.md           ← Overview
└── CALENDAR_TIMETABLE_REFERENCE.md         ← This file

src/
├── app/
│   └── dashboards/admin/classes/
│       └── calendar-timetable/
│           └── page.tsx                    ← Main calendar component
├── app/api/
│   └── timetable/
│       ├── events/
│       │   └── route.ts                    ← CRUD operations
│       └── check-conflicts/
│           └── route.ts                    ← Conflict validation
└── lib/
    └── timetableUtils.ts                   ← Helper functions
```

---

## 🎯 Common Tasks (Copy-Paste)

### Create Event via API

```bash
curl -X POST http://localhost:3000/api/timetable/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "batch_id": "abc123",
    "subject_id": "sub456", 
    "teacher_id": "tch789",
    "start_time": "2024-01-15T09:00:00Z",
    "end_time": "2024-01-15T10:00:00Z",
    "room": "A101",
    "event_type": "lecture",
    "semester": 1,
    "notes": "First class"
  }'
```

### Get Events for Week

```bash
curl "http://localhost:3000/api/timetable/events?batch_id=abc123&start_date=2024-01-15&end_date=2024-01-21"
```

### Check Conflicts

```bash
curl -X POST http://localhost:3000/api/timetable/check-conflicts \
  -H "Content-Type: application/json" \
  -d '{
    "batch_id": "abc123",
    "teacher_id": "tch789",
    "room": "A101",
    "start_time": "2024-01-15T09:00:00Z",
    "end_time": "2024-01-15T10:00:00Z"
  }'
```

### Update Event

```bash
curl -X PATCH "http://localhost:3000/api/timetable/events?id=event123" \
  -H "Content-Type: application/json" \
  -d '{
    "start_time": "2024-01-15T10:00:00Z",
    "end_time": "2024-01-15T11:00:00Z"
  }'
```

### Delete Event (Soft)

```bash
curl -X DELETE "http://localhost:3000/api/timetable/events?id=event123"
```

---

## 🗄️ SQL Quick Queries

### View All Active Events

```sql
SELECT 
  e.*,
  s.name as subject_name,
  t.name as teacher_name,
  b.name as batch_name
FROM timetable_events e
JOIN subjects s ON e.subject_id = s.id
JOIN teachers t ON e.teacher_id = t.id
JOIN batches b ON e.batch_id = b.id
WHERE e.status = 'active'
ORDER BY e.start_time;
```

### Find Teacher's Schedule

```sql
SELECT 
  e.*,
  s.name as subject_name,
  b.name as batch_name
FROM timetable_events e
JOIN subjects s ON e.subject_id = s.id
JOIN batches b ON e.batch_id = b.id
WHERE e.teacher_id = 'teacher-uuid-here'
ORDER BY e.start_time;
```

### Check for Teacher Conflicts

```sql
SELECT 
  t1.id, t1.subject_id, t1.start_time, t1.end_time,
  t2.id as conflicting_id, t2.subject_id as conflicting_subject,
  t2.start_time as conflicting_start
FROM timetable_events t1
JOIN timetable_events t2 ON t1.teacher_id = t2.teacher_id
  AND t1.id != t2.id
  AND t1.status = 'active'
  AND t2.status = 'active'
  AND tsrange(t1.start_time, t1.end_time) && tsrange(t2.start_time, t2.end_time)
ORDER BY t1.start_time;
```

### List Upcoming Events

```sql
SELECT 
  e.*,
  s.name as subject_name,
  t.name as teacher_name
FROM timetable_events e
JOIN subjects s ON e.subject_id = s.id
JOIN teachers t ON e.teacher_id = t.id
WHERE e.status = 'active'
  AND e.start_time >= NOW()
  AND e.start_time < NOW() + INTERVAL '7 days'
ORDER BY e.start_time;
```

### Room Usage Report

```sql
SELECT 
  room,
  COUNT(*) as total_classes,
  COUNT(DISTINCT batch_id) as batch_count,
  COUNT(DISTINCT teacher_id) as teacher_count,
  MIN(start_time) as first_class,
  MAX(end_time) as last_class
FROM timetable_events
WHERE status = 'active'
GROUP BY room
ORDER BY total_classes DESC;
```

---

## ⌨️ Keyboard Shortcuts (In UI)

| Action | Key | Notes |
|--------|-----|-------|
| Create Event | `Ctrl+N` | Not yet implemented |
| Save Event | `Ctrl+S` | Not yet implemented |
| Delete Event | `Delete` | Long press on event |
| Next Week | `→` | Not yet implemented |
| Previous Week | `←` | Not yet implemented |
| Today | `T` | Not yet implemented |

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| 404 on page load | Check route: `/dashboards/admin/classes/calendar-timetable` |
| Empty dropdown | Verify batch exists in database |
| No events showing | Select a batch first, check date range |
| Conflict check fails | Verify API endpoint responding |
| Slow performance | Check indexes created, clear cache |
| Auth error | Relogin, check Supabase credentials |

---

## 📊 Useful Counts & Stats

```sql
-- Total events
SELECT COUNT(*) FROM timetable_events WHERE status = 'active';

-- Events per batch
SELECT batch_id, COUNT(*) FROM timetable_events 
WHERE status = 'active' GROUP BY batch_id;

-- Events per teacher
SELECT teacher_id, COUNT(*) FROM timetable_events 
WHERE status = 'active' GROUP BY teacher_id;

-- Busiest days
SELECT DATE(start_time), COUNT(*) FROM timetable_events 
WHERE status = 'active' GROUP BY DATE(start_time) 
ORDER BY COUNT(*) DESC LIMIT 5;

-- Average class duration
SELECT AVG(EXTRACT(EPOCH FROM (end_time - start_time))/3600) as hours
FROM timetable_events WHERE status = 'active';

-- Conflict count
SELECT COUNT(*) FROM timetable_conflicts WHERE is_resolved = false;
```

---

## 🔌 Environment Setup

### Required ENV Variables

```env
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-secret-key
```

### Verify Connection

```bash
# Test Supabase connection
npx supabase status

# Or in your app:
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
const supabase = createClientComponentClient()
const { data: tables } = await supabase.from('timetable_events').select('*').limit(0)
console.log('Connected:', !!tables)
```

---

## 📱 Browser DevTools Tips

### Console Test

```javascript
// Test API in browser console
fetch('/api/timetable/events?batch_id=xyz')
  .then(r => r.json())
  .then(d => console.log(d))

// Check RLS policy
fetch('/api/timetable/events')
  .then(r => r.json())
  .then(d => console.log('Auth:', !!d.error))
```

### Network Tab

- Look for `/api/timetable/events` requests
- Check response time (should be < 1s)
- Verify status 200/201/204
- Check request headers have auth token

---

## 🎨 Theme Customization

### Colors by Event Type

Edit in `page.tsx`:

```typescript
const getEventColor = (type: string) => ({
  lecture: 'bg-blue-500',      // Main classes
  practical: 'bg-green-500',   // Hands-on
  lab: 'bg-purple-500',        // Lab work
  seminar: 'bg-orange-500',    // Discussions
  exam: 'bg-red-500',          // Assessments
  other: 'bg-gray-500'
}[type])
```

### Conflict Alert Colors

```typescript
const getConflictColor = (severity: string) => ({
  critical: 'border-red-500 bg-red-50',    // Block save
  warning: 'border-yellow-500 bg-yellow-50', // Alert
  info: 'border-blue-500 bg-blue-50'        // Notify
}[severity])
```

---

## 📚 Documentation Map

```
Need something?
│
├─ How to install?
│  └─ CALENDAR_TIMETABLE_QUICKSTART.md
│
├─ Full API reference?
│  └─ CALENDAR_TIMETABLE_README.md → API Endpoints
│
├─ Database schema?
│  └─ CALENDAR_TIMETABLE_UPGRADE.sql
│
├─ Pre-deployment check?
│  └─ CALENDAR_TIMETABLE_CHECKLIST.md
│
├─ System overview?
│  └─ CALENDAR_TIMETABLE_SUMMARY.md
│
└─ Quick reference?
   └─ CALENDAR_TIMETABLE_REFERENCE.md (this file)
```

---

## 🚀 Deployment Checklist (30 seconds)

- [ ] SQL schema applied to Supabase
- [ ] Dependencies installed (`npm install`)
- [ ] Build passes (`npm run build`)
- [ ] Component renders (`/calendar-timetable` loads)
- [ ] Can create event (test in UI)
- [ ] API working (check Network tab)
- [ ] Conflicts detected (test collision)
- [ ] Deploy (`git push` or `vercel deploy`)

---

## 💡 Pro Tips

1. **Use React DevTools** - Inspect component state
2. **Check Supabase Logs** - See actual SQL queries
3. **Monitor Network** - Identify slow endpoints
4. **Clear Cache** - Cmd+Shift+Delete or Ctrl+Shift+Delete
5. **Read RLS Errors** - They're usually very descriptive
6. **Use `created_at` for debugging** - Helps trace operations
7. **Index frequently queried fields** - In batch_id queries
8. **Test with production data** - Catch real-world issues

---

## 🔗 Useful Links

- [Supabase Docs](https://supabase.com/docs)
- [Next.js API Routes](https://nextjs.org/docs/api-routes/introduction)
- [PostgreSQL Range Queries](https://www.postgresql.org/docs/current/rangetypes.html)
- [React Big Calendar](https://jquense.github.io/react-big-calendar/)
- [ShadCN UI Components](https://ui.shadcn.com)

---

## ✨ Success Indicators

✅ Calendar loads in < 1 second  
✅ Can create event  
✅ Conflicts block save  
✅ API responds correctly  
✅ No console errors  
✅ Mobile responsive  
✅ Batch filter works  

**If all above work, you're DONE! 🎉**

---

**Last Updated:** February 2026  
**Version:** 1.0.0  
**Status:** Production Ready ✅
