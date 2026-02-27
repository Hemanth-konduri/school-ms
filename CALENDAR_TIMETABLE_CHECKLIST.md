# ✅ Calendar Timetable - Implementation Checklist

## Pre-Deployment Verification

Use this checklist to ensure everything is properly installed and configured.

---

## 📦 Installation Phase

- [ ] **SQL Schema Applied**
  ```
  File: CALENDAR_TIMETABLE_UPGRADE.sql
  Location: Supabase SQL Editor
  Tables created:
    ✓ timetable_events
    ✓ timetable_recurring
    ✓ timetable_exceptions
    ✓ timetable_conflicts
  Functions created:
    ✓ generate_recurring_events()
    ✓ check_timetable_conflicts()
  Indexes created: 20 indexes
  RLS Policies: Enabled on all tables
  ```

- [ ] **NPM Dependencies Installed**
  ```bash
  npm install react-big-calendar date-fns
  npm install --save-dev @types/react-big-calendar
  ```

- [ ] **Compile Test Passed**
  ```bash
  npm run build
  # Expected: ✓ compiled successfully
  # No TypeScript errors
  ```

---

## 📂 File Structure Verification

- [ ] **Main Component Created**
  ```
  src/app/dashboards/admin/classes/calendar-timetable/page.tsx
  Lines: 450+
  Exports: CalendarTimetablePage component
  ```

- [ ] **API Routes Created**
  ```
  ✓ src/app/api/timetable/events/route.ts
    - GET: List events
    - POST: Create event
    - PATCH: Update event
    - DELETE: Delete event (soft delete)
  
  ✓ src/app/api/timetable/check-conflicts/route.ts
    - POST: Check scheduling conflicts
  ```

- [ ] **Utility Functions Created**
  ```
  src/lib/timetableUtils.ts
  Lines: 300+
  Exports: 20+ utility functions
  Functions working:
    ✓ formatTime()
    ✓ formatDate()
    ✓ timeRangesOverlap()
    ✓ groupEventsByDay()
    ✓ groupEventsByTeacher()
    ✓ And 15+ more
  ```

- [ ] **Documentation Created**
  ```
  ✓ CALENDAR_TIMETABLE_UPGRADE.sql (Complete SQL schema)
  ✓ CALENDAR_TIMETABLE_README.md (Full documentation)
  ✓ CALENDAR_TIMETABLE_QUICKSTART.md (Quick start guide)
  ✓ CALENDAR_TIMETABLE_CHECKLIST.md (This file)
  ```

---

## 🗄️ Database Verification

### Tables
- [ ] **timetable_events**
  ```sql
  SELECT COUNT(*) FROM timetable_events;
  -- Should return 0 (or number of test events)
  ```

- [ ] **timetable_recurring**
  ```sql
  SELECT COUNT(*) FROM timetable_recurring;
  ```

- [ ] **timetable_exceptions**
  ```sql
  SELECT COUNT(*) FROM timetable_exceptions;
  ```

- [ ] **timetable_conflicts**
  ```sql
  SELECT COUNT(*) FROM timetable_conflicts;
  ```

### Indexes
- [ ] **Query Performance**
  ```sql
  -- Should use indexes (check EXPLAIN)
  EXPLAIN SELECT * FROM timetable_events 
  WHERE batch_id = '...' AND status = 'active'
  ORDER BY start_time;
  -- Expected: Uses index on (batch_id, status)
  ```

### Row Level Security
- [ ] **RLS Policies Active**
  ```sql
  SELECT * FROM pg_policies 
  WHERE tablename LIKE 'timetable%';
  -- Expected: 4-5 policy rows
  ```
  
- [ ] **Admin Access Working**
  - [ ] Admin user can view all timetables
  - [ ] Admin user can create events
  - [ ] Admin user can update events
  - [ ] Admin user can delete events

- [ ] **Teacher Access Working**
  - [ ] Teacher can only see own schedule
  - [ ] Teacher cannot modify timetables

---

## 🖥️ Frontend Verification

### Component Rendering
- [ ] **Page Loads Without Errors**
  ```
  Navigate to: /dashboards/admin/classes/calendar-timetable
  Expected: Page loads, no 404
  Console: No JavaScript errors
  ```

- [ ] **All UI Elements Visible**
  ```
  ✓ Calendar Timetable header
  ✓ Batch selector dropdown (filled with batches)
  ✓ View mode selector (Week, Day, Teacher)
  ✓ Week start date picker
  ✓ Previous/Next navigation buttons
  ✓ New Event button
  ✓ 7-day week grid
  ✓ Event cards (if any events exist)
  ```

- [ ] **Dropdowns Populated**
  ```
  ✓ Batch dropdown: Shows all batches
  ✓ View mode: Shows 3 options (Week, Day, Teacher)
  ✓ Subject dropdown (in modal): Shows subjects for batch
  ✓ Teacher dropdown (in modal): Shows all active teachers
  ✓ Event type dropdown: Shows all 6 types
  ```

### Interaction Tests
- [ ] **Create Event Modal**
  - [ ] Click "New Event" → Modal opens
  - [ ] Fill in all required fields
  - [ ] Click "Create Event" → Success message
  - [ ] Event appears in calendar

- [ ] **Edit Event**
  - [ ] Click event in calendar → Modal opens with data
  - [ ] Change some values
  - [ ] Click "Update Event" → Success
  - [ ] Calendar updates

- [ ] **Delete Event**
  - [ ] Click event → Modal opens
  - [ ] Look for delete button
  - [ ] Click delete → Confirm dialog
  - [ ] Event disappears from calendar

- [ ] **Navigation**
  - [ ] Click "← Prev" → Week changes back
  - [ ] Click "Next →" → Week changes forward
  - [ ] Date picker works → Calendar updates

- [ ] **Batch Filter**
  - [ ] Select different batch → Calendar reloads
  - [ ] Events change to match batch
  - [ ] Subjects dropdown updates

---

## ⚠️ Conflict Detection Verification

### Critical Conflicts (Must Prevent Save)

- [ ] **Teacher Double-Booking**
  ```
  Steps:
  1. Create event: Teacher A, Mon 9-10, Subject X
  2. Try to create: Teacher A, Mon 9:30-10:30, Subject Y
  3. Expected: Alert "Teacher is already scheduled"
  4. Save blocked: ❌ Event not created
  ```

- [ ] **Batch Overlap**
  ```
  Steps:
  1. Create event: Batch-2024-A, Mon 9-10, Subject X
  2. Try to create: Batch-2024-A, Mon 9:30-10:30, Subject Y
  3. Expected: Alert "Batch already has a scheduled class"
  4. Save blocked: ❌ Event not created
  ```

### Warning Conflicts (May Proceed)

- [ ] **Room Conflict**
  ```
  Steps:
  1. Create event: Room A101, Mon 9-10
  2. Try to create: Room A101, Mon 9:30-10:30
  3. Expected: Alert "Room is already booked"
  4. User can override: ⚠️ Can save if intentional
  ```

---

## 🔌 API Verification

### Check Conflicts Endpoint

- [ ] **Endpoint Reachable**
  ```bash
  curl -X POST http://localhost:3000/api/timetable/check-conflicts \
    -H "Content-Type: application/json" \
    -d '{
      "batch_id": "...",
      "teacher_id": "...",
      "room": "A101",
      "start_time": "2024-01-15T09:00:00Z",
      "end_time": "2024-01-15T10:00:00Z"
    }'
  
  Expected Response: 200 OK
  {
    "conflicts": [],
    "hasConflicts": false,
    "criticalConflicts": 0
  }
  ```

### Events List Endpoint

- [ ] **Get Events**
  ```bash
  curl "http://localhost:3000/api/timetable/events?batch_id=...&start_date=2024-01-15&end_date=2024-01-21"
  
  Expected: 200 OK with events array
  ```

### Create Event Endpoint

- [ ] **Create Event**
  ```bash
  curl -X POST http://localhost:3000/api/timetable/events \
    -H "Content-Type: application/json" \
    -d '{...event data...}'
  
  Expected: 200 OK with created event
  ```

---

## 🔐 Security Verification

### Authentication
- [ ] **Unauthenticated User Blocked**
  ```
  1. Logout
  2. Try to access /dashboards/admin/classes/calendar-timetable
  3. Expected: Redirected to login
  ```

- [ ] **Non-Admin User Cannot Create**
  ```
  1. Login as non-admin
  2. Try POST /api/timetable/events
  3. Expected: 401 Unauthorized or empty response
  ```

### Authorization
- [ ] **RLS Policies Enforced**
  ```sql
  -- As non-admin, should see no data:
  SELECT * FROM timetable_events;
  -- Expected: 0 rows
  ```

---

## 📊 Performance Verification

### Query Performance
- [ ] **Week Load Time < 1s**
  ```bash
  # Monitor Network tab in DevTools
  # GET /api/timetable/events should complete in < 1000ms
  ```

- [ ] **Create Event < 2s**
  ```bash
  # POST /api/timetable/events should complete in < 2000ms
  # Including conflict checking
  ```

- [ ] **Conflict Check < 500ms**
  ```bash
  # POST /api/timetable/check-conflicts should be fast
  # Expected: < 500ms
  ```

### Database Indexes
- [ ] **Indexes Exist**
  ```sql
  SELECT * FROM pg_indexes 
  WHERE tablename LIKE 'timetable%';
  -- Expected: 20+ index records
  ```

---

## 📱 Browser Compatibility

- [ ] **Chrome/Chromium**
  - [ ] Renders correctly
  - [ ] All interactions work
  - [ ] No console errors

- [ ] **Firefox**
  - [ ] Renders correctly
  - [ ] All interactions work

- [ ] **Safari**
  - [ ] Renders correctly
  - [ ] Date picker works

- [ ] **Mobile (iPhone/Android)**
  - [ ] Responsive layout
  - [ ] Touch interactions work
  - [ ] Modal opens/closes

---

## 🧪 Data Testing

### Test Data Creation

- [ ] **Create Sample Batches**
  ```
  Batches to create:
  ✓ CS-2024-Batch-A
  ✓ CS-2024-Batch-B
  ✓ Mech-2024-Batch-A
  ```

- [ ] **Create Sample Teachers**
  ```
  Teachers to create:
  ✓ Dr. Alice Johnson (Math)
  ✓ Prof. Bob Smith (Physics)
  ✓ Dr. Carol White (Chemistry)
  All marked as: is_active = true
  ```

- [ ] **Create Sample Events**
  ```
  Events to create:
  ✓ Monday 9-10: Math lecture, Dr. Alice, Room A101
  ✓ Tuesday 10-11: Physics practical, Prof. Bob, Room A102
  ✓ Wednesday 11-12: Chemistry lab, Dr. Carol, Room A103
  ✓ Thursday 2-3: Math tutorial, Dr. Alice, Room A101
  ✓ Friday 3-4: Physics tutorial, Prof. Bob, Room A102
  ```

- [ ] **Test Data Queries**
  ```sql
  -- Verify all test data created:
  SELECT COUNT(*) FROM batches; -- Should show 3+
  SELECT COUNT(*) FROM teachers WHERE is_active = true; -- Should show 3+
  SELECT COUNT(*) FROM timetable_events WHERE status = 'active'; -- Should show 5+
  ```

---

## 🚀 Deployment Readiness

- [ ] **All Files Committed to Git**
  ```bash
  git status
  # Expected: nothing to commit
  ```

- [ ] **Build Passes**
  ```bash
  npm run build
  # Expected: ✓ Successfully compiled
  ```

- [ ] **No TypeScript Errors**
  ```bash
  npm run type-check
  # Expected: Exit code 0
  ```

- [ ] **Environment Variables Set**
  ```
  .env.local should have:
  ✓ NEXT_PUBLIC_SUPABASE_URL
  ✓ NEXT_PUBLIC_SUPABASE_ANON_KEY
  ```

- [ ] **Database Backup Created**
  ```
  Before deploying:
  1. Backup your Supabase database
  2. Test restore procedure
  ```

---

## 📋 Post-Deployment Checklist

- [ ] **Calendar Works in Production**
  ```
  URL: https://your-domain.com/dashboards/admin/classes/calendar-timetable
  ```

- [ ] **Events Load Correctly**
  - [ ] No CORS errors
  - [ ] API endpoints accessible
  - [ ] Events display

- [ ] **Conflicts Detected in Production**
  ```
  Test with real data
  Verify alerts show up
  Verify save blocked
  ```

- [ ] **Performance Acceptable**
  ```
  Monitor performance in production
  Check Vercel analytics
  Ensure load times are acceptable
  ```

---

## 📞 Support References

**If any check fails:** Refer to:
1. ❌ **Component not rendering?** → Check `CALENDAR_TIMETABLE_README.md` - UI/UX section
2. ❌ **API not working?** → Check `CALENDAR_TIMETABLE_README.md` - API Endpoints section
3. ❌ **Database issues?** → Check SQL in `CALENDAR_TIMETABLE_UPGRADE.sql`
4. ❌ **Conflicts not detecting?** → Check `src/app/api/timetable/check-conflicts/route.ts`
5. ❌ **General help?** → Read `CALENDAR_TIMETABLE_QUICKSTART.md`

---

## ✨ Final Sign-Off

When all checks are complete, the calendar timetable system is **PRODUCTION READY** ✅

**System Status:** Ready for deployment
**Date Verified:** ____________  
**Verified By:** ____________  
**Notes:** ________________________

---

**Last Updated:** February 2026  
**Version:** 1.0.0
