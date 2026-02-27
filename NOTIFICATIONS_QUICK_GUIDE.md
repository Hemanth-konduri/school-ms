# 🔔 Notification System - Quick Reference Guide

## What's Included

### ✅ **Implemented Features**

#### 1. Database Schema (application.sql)
- `notifications` - Main notification table
- `notification_targets` - Specifies which users receive notifications
- `user_notifications` - Tracks read/unread status per user
- `notification_logs` - Audit trail
- Row Level Security policies for all tables
- Optimized indexes for performance

#### 2. Notification Management Page
**Location:** `/dashboards/admin/notifications`

**Features:**
- 📝 **Create Tab**
  - Select multiple user types (Students, Teachers, Admins, Staff, Everyone)
  - Hierarchical filtering (School → Program → Group → Batch)
  - Content creation (Title, Message, Priority, Type)
  - Schedule notifications
  - Optional attachments and links

- 📊 **History Tab**
  - View all notifications
  - Filter by status (Sent/Scheduled/Draft/Expired)
  - Filter by priority (Normal/Important/Urgent)
  - Search by title
  - Filter by date
  - View notification details
  - Delete notifications
  - Edit drafts (future)

#### 3. API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/notifications/send` | POST | Send notification to target users |
| `/api/notifications/count` | GET | Get unread notification count |
| `/api/notifications/mark-read` | PATCH | Mark notification as read |
| `/api/notifications/list` | GET | Get user's notifications |

#### 4. UI Components
- NotificationBadge component (for navbar)
- All shadcn/ui components for consistency

#### 5. Utility Functions
- `notificationUtils.ts` with helpers for:
  - Getting notification recipients
  - Formatting notifications
  - Checking expiry
  - Priority/Status display
  - Validation

---

## 🚀 Getting Started

### 1. Update Database
Copy and run the SQL from `application.sql` in your Supabase SQL editor:
```sql
-- Run lines 250+ which contain the notification schema
```

### 2. Access Notification Manager
1. Go to Admin Dashboard
2. Click "Notifications" card
3. Start creating notifications!

### 3. Create Your First Notification
1. **Step 1:** Select user types (e.g., Students)
2. **Step 2:** (Optional) Filter by School/Program/Batch
3. **Step 3:** Enter Title, Message, Priority
4. **Step 4:** Send Immediately or Schedule
5. Click "Send Notification"

---

## 📋 Target Audience Options

### For Students:
- All students
- By School
- By Program
- By Department/Group
- By Batch
- By Academic Year

### For Teachers:
- All teachers
- By School
- By Department

### For Admins/Staff:
- All admins
- By Role type

### Everyone:
- Select "Everyone" to send to all user types

---

## 🎯 Priority Levels

| Level | Use Case |
|-------|----------|
| 🟢 Normal | General announcements, updates |
| 🟠 Important | Important reminders, deadlines |
| 🔴 Urgent | Critical alerts, immediate action needed |

---

## 📧 Notification Types

| Type | Status | Notes |
|------|--------|-------|
| 🔵 In-App | ✅ Ready | Immediate, appears in app |
| 📨 Email | 🔜 Future | Scheduled integration |
| 🔔 Push | 🔜 Future | Mobile app integration |
| 🔀 All | 🔜 Future | Multi-channel delivery |

---

## 🔐 Security

The system includes:
- **Row Level Security (RLS):** Only admins can create/manage notifications
- **User Privacy:** Users only see their own notifications
- **Role-based Access:** Based on user roles and hierarchy
- **Audit Trail:** All deliveries logged

---

## 🧪 Testing Checklist

```
- [ ] Create in-app notification for Students
- [ ] Select specific School + Program
- [ ] Set priority to Urgent
- [ ] Send immediately
- [ ] View in Notification History
- [ ] Test filters (status, priority, date)
- [ ] Open notification details
- [ ] Test with different user types
- [ ] Test scheduling (select future date/time)
- [ ] Test search functionality
```

---

## 🔄 Workflow Example

**Scenario:** Announce new exam schedule to CSE students

1. Admin goes to Notifications → Create tab
2. Selects "Students" user type
3. Selects:
   - School: XYZ School
   - Program: B.Tech
   - Group: CSE (Department)
   - Batch: CSE-1 (optional)
4. Enters:
   - Title: "New Exam Schedule Released"
   - Message: "Exam schedule for Semester 5 is now available..."
   - Priority: Important
   - Link: "/dashboards/admin/academics/schedule" (future)
5. Sends immediately
6. All CSE students receive the notification

---

## 📊 Future Phases

### Phase 2
- ✉️ Email integration (SendGrid/AWS SES)
- 📱 Push notifications (Firebase)
- ⏱️ Advanced scheduling with cron jobs
- 📋 Notification templates

### Phase 3
- 📈 Analytics dashboard
- 🔁 A/B testing
- 🪝 Webhook support
- 📋 Bulk operations
- 👁️ Notification preview

---

## 🐛 Troubleshooting

### Issue: Cannot see Notifications card
**Solution:** Make sure you're an admin user logged in

### Issue: No notifications in history
**Solution:** Create a new notification first via the Create tab

### Issue: API routes not working
**Solution:** Check that your .env.local has correct Supabase URL/Key

### Issue: RLS errors
**Solution:** Ensure your profile is marked as admin role

---

## 📞 Support

For more details, see:
- `NOTIFICATION_SYSTEM.md` - Full technical documentation
- `/dashboards/admin/notifications` - Interactive admin interface

---

## 🎓 Key Concepts

### Notification Targets
You specify WHO gets a notification:
- By role (student, teacher, admin)
- By location (school, program, department)
- By group (batch, class)
- Everyone

### Notification Status
- **Draft:** Not yet sent
- **Scheduled:** Set for future delivery
- **Sent:** Successfully delivered
- **Expired:** Past expiry date

### Read Status
Each user gets their own read status:
- ✅ Read: User has viewed it
- ❌ Unread: Not viewed yet

---

Happy notifying! 🎉
