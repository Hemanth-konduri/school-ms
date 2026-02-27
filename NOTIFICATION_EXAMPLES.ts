/**
 * NOTIFICATION SYSTEM - TEST & EXAMPLES
 * 
 * Examples of how to use the notification system
 */

// ============================================
// EXAMPLE 1: Create a notification for all students
// ============================================
const createStudentNotification = async () => {
  const response = await fetch('/dashboards/admin/notifications', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Important: Semester Exam Schedule Released',
      message: `Dear Students,\n\nThe exam schedule for the upcoming semester is now available on the academic hierarchy page.\n\nPlease review it carefully and note all important dates.`,
      priority: 'important',
      notif_type: 'in_app',
      link_url: '/dashboards/admin/academics',
      schedule_type: 'immediate',
      selectedRoles: ['students'],
      schoolFilter: '', // empty = all students
    })
  })
}

// ============================================
// EXAMPLE 2: Create notification for specific program
// ============================================
const createProgramNotification = async (
  schoolId: string,
  programId: string,
  title: string,
  message: string
) => {
  // In the UI, user would:
  // 1. Select "Students" role
  // 2. Choose School
  // 3. Choose Program
  // 4. System automatically filters to students in that program
  // 5. Send notification
}

// ============================================
// EXAMPLE 3: Create urgent notification
// ============================================
const createUrgentAlert = async () => {
  // Admin needs to send urgent notice to everyone
  const notification = {
    title: '🚨 URGENT: Campus Closed Tomorrow',
    message: 'Due to unforeseen circumstances, the campus will remain closed tomorrow.',
    priority: 'urgent',
    notif_type: 'all', // in_app, email, push
    schedule_type: 'immediate',
    selectedRoles: ['students', 'teachers', 'admins', 'staff'] // everyone
  }
  // System sends to all users immediately
}

// ============================================
// EXAMPLE 4: Schedule notification
// ============================================
const scheduleNotification = async () => {
  const notification = {
    title: 'Result Declaration Day',
    message: 'Results for Semester 3 will be announced on 15th March 2024 at 10:00 AM',
    priority: 'important',
    schedule_type: 'scheduled',
    scheduled_at: '2024-03-15T10:00:00',
    selectedRoles: ['students'],
    batchFilter: 'sem-3-batch-a'
  }
  // System stores and sends automatically on specified date/time
}

// ============================================
// EXAMPLE 5: Get user's notifications
// ============================================
const getUserNotifications = async () => {
  const response = await fetch('/api/notifications/list?unread_only=false')
  const { notifications } = await response.json()
  
  notifications.forEach((notif: any) => {
    console.log({
      title: notif.notifications.title,
      isRead: notif.is_read,
      readAt: notif.read_at,
      priority: notif.notifications.priority,
      createdAt: notif.notifications.created_at
    })
  })
}

// ============================================
// EXAMPLE 6: Get unread count
// ============================================
const getUnreadCount = async () => {
  const response = await fetch('/api/notifications/count')
  const { unread_count } = await response.json()
  console.log(`You have ${unread_count} unread notifications`)
}

// ============================================
// EXAMPLE 7: Mark notification as read
// ============================================
const markAsRead = async (notificationId: string) => {
  const response = await fetch('/api/notifications/mark-read', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notificationId })
  })
  const { success } = await response.json()
  if (success) {
    console.log('Notification marked as read')
  }
}

// ============================================
// EXAMPLE 8: Notification with attachment
// ============================================
const notificationWithAttachment = async () => {
  const notification = {
    title: 'Important Notice - Updated Syllabus',
    message: 'Please find the updated syllabus for all subjects attached below.',
    priority: 'important',
    attachment_url: 'https://example.com/updated-syllabus.pdf',
    schedule_type: 'immediate',
    selectedRoles: ['students']
  }
}

// ============================================
// EXAMPLE 9: Filter notifications in history
// ============================================
const filterNotificationsExample = () => {
  // In Notification History tab, admin can:
  
  // Search by title
  const searchQuery = 'exam'
  
  // Filter by status
  const status = 'sent' // or 'scheduled', 'draft', 'expired'
  
  // Filter by priority
  const priority = 'urgent' // or 'important', 'normal'
  
  // Filter by date
  const dateFilter = '2024-03-15'
  
  // Combined: Find urgent exams that were sent on March 15
  // notifications.filter(n => 
  //   n.title.includes('exam') && 
  //   n.status === 'sent' && 
  //   n.priority === 'urgent' &&
  //   n.created_at.startsWith('2024-03-15')
  // )
}

// ============================================
// DATABASE STRUCTURE REFERENCE
// ============================================

/*
CREATE TABLE notifications {
  id: UUID
  title: 'Semester Exam Schedule Released' ← User enters
  message: 'The exam schedule is now available...' ← User enters
  priority: 'important' (normal|important|urgent) ← User selects
  notification_type: 'in_app' (in_app|email|push|all) ← User selects
  attachment_url: 'https://example.com/schedule.pdf' ← Optional
  attachment_type: 'pdf' ← Auto from URL
  link_url: '/dashboards/admin/academics' ← Optional
  created_by: <admin-profile-id>
  status: 'sent' ← Auto set based on send vs schedule
  scheduled_at: '2024-03-15T10:00:00' ← If scheduled
  sent_at: '2024-03-14T09:30:00' ← Auto on send
  expires_at: '2024-04-15' ← Optional
  created_at: '2024-03-14T09:30:00' ← Auto
}

CREATE TABLE notification_targets {
  id: UUID
  notification_id: <notification-id>
  target_type: 'role' (role|school|program|group|batch|student|teacher|everyone)
  target_value: 'students' (role name or id)
}

CREATE TABLE user_notifications {
  id: UUID
  notification_id: <notification-id>
  recipient_id: <user-profile-id>
  is_read: false
  read_at: null ← Set when user reads
  created_at: '2024-03-14T09:30:00'
}

CREATE TABLE notification_logs {
  id: UUID
  notification_id: <notification-id>
  recipient_id: <user-profile-id>
  delivery_type: 'in_app'
  status: 'sent' (pending|sent|failed|bounced)
  error_message: null
  delivered_at: '2024-03-14T09:30:05'
}
*/

// ============================================
// REAL-WORLD SCENARIOS
// ============================================

const scenarios = {
  scenario1: `
    SCENARIO: New Assignment Posted
    
    Admin goes to Notifications → Create
    1. Selects "Students"
    2. Selects School → Program → Group → Batch
    3. Title: "New Assignment in Data Structures"
    4. Message: "Assignment 5 has been posted. Due: 20th March"
    5. Priority: Important
    6. Link: "/dashboards/admin/academics"
    7. Sends Immediately
    
    Result: Only students in that specific batch get the notification
  `,
  
  scenario2: `
    SCENARIO: All Teachers Meeting
    
    Admin goes to Notifications → Create
    1. Selects "Teachers"
    2. No additional filters (all teachers)
    3. Title: "Staff Meeting - 3:00 PM Today"
    4. Message: "Location: Conference Room A"
    5. Priority: Important (time-sensitive)
    6. Sends Immediately
    
    Result: All teachers across all schools get the notification
  `,
  
  scenario3: `
    SCENARIO: Announce New Holiday
    
    Admin goes to Notifications → Create
    1. Selects "Everyone" (Students + Teachers + Staff + Admins)
    2. Title: "New Holiday Announced"
    3. Message: "Foundation Day - 25th May will be a public holiday"
    4. Priority: Normal
    5. Attachment: "holiday-calendar.pdf"
    6. Sends Immediately
    
    Result: Everyone in the system gets the notification
  `,
  
  scenario4: `
    SCENARIO: Exam Schedule for Specific Group
    
    Admin goes to Notifications → Create
    1. Selects "Students"
    2. School: XYZ School
    3. Program: B.Tech
    4. Group: CSE (Computer Science)
    5. Batch: CSE-1
    6. Title: "Exam Schedule Released - CSE Batch"
    7. Message: "Your exam schedule is now available"
    8. Priority: Important
    9. Link: "/dashboards/admin/classes"
    10. Sends Immediately
    
    Result: Only CSE-1 batch students get the notification
  `,
  
  scenario5: `
    SCENARIO: Schedule Newsletter
    
    Admin goes to Notifications → Create
    1. Selects "Students"
    2. Title: "Monthly Newsletter - March 2024"
    3. Message: "Check our latest updates, achievements, and announcements"
    4. Priority: Normal
    5. Schedule Type: "Schedule for Later"
    6. Scheduled Date/Time: "2024-03-20 at 9:00 AM"
    7. Link: "/dashboards/admin/announcements"
    8. Creates Notification
    
    Result: Notification is stored, system sends automatically on specified date/time
  `
}

// ============================================
// API USAGE IN COMPONENTS
// ============================================

// React Component Example
/*
export function NotificationCenter() {
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    // Get unread count
    fetch('/api/notifications/count')
      .then(r => r.json())
      .then(data => setUnreadCount(data.unread_count))

    // Get notifications
    fetch('/api/notifications/list?unread_only=false')
      .then(r => r.json())
      .then(data => setNotifications(data.notifications))
  }, [])

  const handleMarkAsRead = async (notificationId) => {
    await fetch('/api/notifications/mark-read', {
      method: 'PATCH',
      body: JSON.stringify({ notificationId })
    })
    // Refresh notifications
  }

  return (
    <div>
      <h2>Notifications ({unreadCount} unread)</h2>
      {notifications.map(notif => (
        <div key={notif.id}>
          <h3>{notif.notifications.title}</h3>
          <p>{notif.notifications.message}</p>
          <button onClick={() => handleMarkAsRead(notif.notification_id)}>
            Mark as Read
          </button>
        </div>
      ))}
    </div>
  )
}
*/

export {}
