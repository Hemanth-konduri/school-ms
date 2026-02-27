# Notification Management System - Implementation Guide

## Overview
A comprehensive notification management system that allows admins to create, send, schedule, and manage notifications for different user types within the school management application.

---

## Database Schema

### Tables Created

#### 1. **notifications**
Main table storing all notification data.

```sql
- id (UUID): Primary Key
- title (TEXT): Notification title
- message (TEXT): Notification body/description
- priority (TEXT): normal | important | urgent
- notification_type (TEXT): in_app | email | push | all
- attachment_url (TEXT): URL to PDF or image
- attachment_type (TEXT): pdf | image
- link_url (TEXT): Internal app link (e.g., /dashboards/admin/academics)
- created_by (UUID): References profiles(id) - creator
- status (TEXT): draft | scheduled | sent | expired
- scheduled_at (TIMESTAMP): When to send if scheduled
- sent_at (TIMESTAMP): When actually sent
- expires_at (TIMESTAMP): Expiry time for notification
- created_at (TIMESTAMP): Creation timestamp
- updated_at (TIMESTAMP): Last update timestamp
```

#### 2. **notification_targets**
Specifies which users/groups should receive each notification.

```sql
- id (UUID): Primary Key
- notification_id (UUID): References notifications(id) - OneToMany
- target_type (TEXT): role | school | program | group | batch | teacher | student | everyone
- target_value (TEXT): The actual value (e.g., role name, school id, etc.)
- created_at (TIMESTAMP)
```

#### 3. **user_notifications**
Tracks which users have received notifications and their read status.

```sql
- id (UUID): Primary Key
- notification_id (UUID): References notifications(id)
- recipient_id (UUID): References profiles(id)
- is_read (BOOLEAN): Read status
- read_at (TIMESTAMP): When marked as read
- created_at (TIMESTAMP)
- UNIQUE(notification_id, recipient_id): Prevents duplicate records
```

#### 4. **notification_logs**
Audit trail for notification delivery attempts.

```sql
- id (UUID): Primary Key
- notification_id (UUID): References notifications(id)
- recipient_id (UUID): References profiles(id) - nullable
- delivery_type (TEXT): in_app | email | push
- status (TEXT): pending | sent | failed | bounced
- error_message (TEXT): Error details if failed
- delivered_at (TIMESTAMP)
- created_at (TIMESTAMP)
```

---

## Features Implemented

### 1. **Create Notification**

#### Step 1: Select Target User Types
- ✅ Students
- ✅ Teachers
- ✅ Admins
- ✅ Staff
- ✅ Everyone (selects all)
- Multi-select capability

#### Step 2: Target Audience Filtering (Hierarchical)
**For Students:**
- All students
- Specific school
- Specific program
- Specific department/group
- Specific batch
- Specific academic year

**For Teachers:**
- All teachers
- Specific school
- Specific department
- (Future: Specific batch assignment)

**For Admins/Staff:**
- All admins
- Specific role type
- (Future: Specific department)

#### Step 3: Notification Content
- Title (required)
- Message/Description (required)
- Priority: Normal | Important | Urgent
- Notification Type: In-App | Email | Push | All Channels
- Optional Attachment URL
- Optional Link URL (for redirecting users)
- Optional Expiry Date

#### Step 4: Send/Schedule
- Send Immediately
- Schedule for Later (with date/time)

### 2. **Manage Notifications**

#### Notification History
Display all created notifications with:
- Title
- Target roles
- Created date & time
- Priority badge
- Created by
- Status badge (Sent/Scheduled/Draft/Expired)

#### Actions per Notification
- 👁 View full details
- ✏ Edit (if scheduled or draft)
- 🗑 Delete

#### Advanced Filtering
- Search by title keyword
- Filter by status (Sent/Scheduled/Draft/Expired)
- Filter by priority (Normal/Important/Urgent)
- Filter by date range or specific date
- (Future: Filter by role type, batch, program, status)

---

## API Routes

### 1. **POST /api/notifications/send**
Send notification to target users.
```json
Request: { "notificationId": "uuid" }
Response: { "success": true, "recipients": 45 }
```

### 2. **GET /api/notifications/count**
Get unread notification count for current user.
```json
Response: { "unread_count": 3 }
```

### 3. **PATCH /api/notifications/mark-read**
Mark a notification as read for current user.
```json
Request: { "notificationId": "uuid" }
Response: { "success": true }
```

### 4. **GET /api/notifications/list**
Retrieve user's notifications.
```
Query Params: ?unread_only=true
Response: { "notifications": [...] }
```

---

## UI Components Used (shadcn/ui)
- ✅ Card
- ✅ Button
- ✅ Input
- ✅ Select
- ✅ Alert
- ✅ Checkbox
- ✅ Badge

---

## Row Level Security (RLS)

### Policies Implemented

**notifications table:**
- ✅ Admins can create/read/update/delete
- ✅ Regular users can only read (view history through dashboard)

**user_notifications table:**
- ✅ Users can view their own notifications
- ✅ Users can update their own read status
- ✅ Admins have full access

**notification_targets table:**
- ✅ Admins can manage targets

**notification_logs table:**
- ✅ Only admins can view logs

---

## Future Enhancements

### Phase 2
- ✅ Email notification sending integration (SendGrid/AWS SES)
- ✅ Push notification integration (Firebase Cloud Messaging)
- ✅ Advanced scheduling (cron jobs)
- ✅ Template-based notifications
- ✅ Notification analytics dashboard

### Phase 3
- ✅ Bulk edit notifications
- ✅ Duplicate notification feature
- ✅ Notification preview for different user types
- ✅ A/B testing for notifications
- ✅ Webhook support for external integrations

---

## Database Setup Instructions

Run the SQL in your Supabase editor:

```sql
-- Copy and paste the notification tables from application.sql
-- The schema includes all 4 tables with indexes and RLS policies
```

---

## Usage Example (Frontend)

### Create Notification
```typescript
const response = await fetch('/api/notifications/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ notificationId: 'uuid' })
})
```

### Get Notification Count
```typescript
const { unread_count } = await fetch('/api/notifications/count').then(r => r.json())
```

### Mark as Read
```typescript
await fetch('/api/notifications/mark-read', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ notificationId: 'uuid' })
})
```

---

## Integration Points

### Dashboard
- Notifications card links to `/dashboards/admin/notifications`
- Badge shows unread count (when navbar integration complete)

### User Dashboard (Future)
- Small notification panel in navbar
- Unread count badge
- Quick view of 5 latest notifications
- Mark as read/unread
- Delete from panel

### Email Integration (Future)
- Scheduled emails using background jobs
- Email templates customizable
- Tracking opens/clicks

---

## Hierarchy Respect

The system respects the academic hierarchy:
- **Batch-level notifications** → Only students in that batch
- **Department-level notifications** → All students in that department
- **Program-level notifications** → All students in that program
- **School-level notifications** → All students in that school
- **Role-level notifications** → All users with that role

This prevents notification spam and ensures targeted communication.

---

## Testing Checklist

- [ ] Create basic in-app notification
- [ ] Test with multiple user types selected
- [ ] Test hierarchical filtering (school → program → group → batch)
- [ ] Test scheduled notification
- [ ] View notification history
- [ ] Filter notifications by status/priority/date
- [ ] Edit draft notification
- [ ] Delete notification
- [ ] Mark notification as read
- [ ] Check unread count updates
- [ ] Test with different user roles (admin, teacher, student)

---

## Support
For issues or questions, refer to the Notification Management page in the admin dashboard.
