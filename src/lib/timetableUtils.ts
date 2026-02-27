/**
 * Timetable Utility Functions
 * Helper functions for calendar-based timetable management
 */

export interface TimetableEvent {
  id: string
  batch_id: string
  subject_id: string
  teacher_id: string
  start_time: string
  end_time: string
  room?: string
  event_type: string
  semester: number
  notes?: string
}

export interface ConflictInfo {
  type: 'teacher_double_booking' | 'batch_overlap' | 'room_conflict'
  severity: 'info' | 'warning' | 'critical'
  message: string
}

/**
 * Format time display
 */
export function formatTime(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

/**
 * Format date display
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Get week start date
 */
export function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day
  return new Date(d.setDate(diff))
}

/**
 * Get week end date
 */
export function getWeekEnd(date: Date = new Date()): Date {
  const start = getWeekStart(date)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return end
}

/**
 * Check if two time ranges overlap
 */
export function timeRangesOverlap(
  start1: Date | string,
  end1: Date | string,
  start2: Date | string,
  end2: Date | string
): boolean {
  const s1 = new Date(start1)
  const e1 = new Date(end1)
  const s2 = new Date(start2)
  const e2 = new Date(end2)
  return s1 < e2 && s2 < e1
}

/**
 * Get duration in hours
 */
export function getDurationHours(startTime: Date | string, endTime: Date | string): number {
  const start = new Date(startTime)
  const end = new Date(endTime)
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60)
}

/**
 * Get day of week name
 */
export function getDayName(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', { weekday: 'long' })
}

/**
 * Get day of week number (0-6, Sunday-Saturday)
 */
export function getDayNumber(date: Date | string): number {
  const d = new Date(date)
  return d.getDay()
}

/**
 * Group events by day
 */
export function groupEventsByDay(events: TimetableEvent[]): {
  [key: string]: TimetableEvent[]
} {
  const grouped: { [key: string]: TimetableEvent[] } = {}
  
  events.forEach(event => {
    const date = new Date(event.start_time)
    const dayKey = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
    
    if (!grouped[dayKey]) {
      grouped[dayKey] = []
    }
    grouped[dayKey].push(event)
  })

  // Sort events within each day by start time
  Object.keys(grouped).forEach(day => {
    grouped[day].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  })

  return grouped
}

/**
 * Group events by teacher
 */
export function groupEventsByTeacher(
  events: TimetableEvent[],
  teacherNames?: { [teacherId: string]: string }
): { [key: string]: TimetableEvent[] } {
  const grouped: { [key: string]: TimetableEvent[] } = {}
  
  events.forEach(event => {
    const teacherKey = teacherNames?.[event.teacher_id] || event.teacher_id
    
    if (!grouped[teacherKey]) {
      grouped[teacherKey] = []
    }
    grouped[teacherKey].push(event)
  })

  // Sort events within each teacher by start time
  Object.keys(grouped).forEach(teacher => {
    grouped[teacher].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  })

  return grouped
}

/**
 * Validate event times
 */
export function validateEventTimes(startTime: Date | string, endTime: Date | string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const start = new Date(startTime)
  const end = new Date(endTime)

  if (start >= end) {
    errors.push('Start time must be before end time')
  }

  const duration = getDurationHours(start, end)
  if (duration > 8) {
    errors.push('Class duration should not exceed 8 hours')
  }

  if (duration < 0.25) {
    errors.push('Class duration should be at least 15 minutes')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Check if time is within school hours
 */
export function isWithinSchoolHours(time: Date | string): boolean {
  const t = new Date(time)
  const hours = t.getHours()
  // Default school hours: 8 AM to 6 PM
  return hours >= 8 && hours < 18
}

/**
 * Get hour slots for calendar grid
 */
export function getHourSlots(fromHour = 8, toHour = 18): string[] {
  const slots: string[] = []
  for (let i = fromHour; i < toHour; i++) {
    slots.push(`${i.toString().padStart(2, '0')}:00`)
    slots.push(`${i.toString().padStart(2, '0')}:30`)
  }
  return slots
}

/**
 * Calculate event position for grid display
 */
export function calculateEventPosition(
  eventStart: Date | string,
  eventEnd: Date | string,
  dayStart: Date | string,
  dayEnd: Date | string
): { top: number; height: number } {
  const eStart = new Date(eventStart)
  const eEnd = new Date(eventEnd)
  const dStart = new Date(dayStart)
  const dEnd = new Date(dayEnd)

  const totalMinutes = (dEnd.getTime() - dStart.getTime()) / (1000 * 60)
  const offsetMinutes = (eStart.getTime() - dStart.getTime()) / (1000 * 60)
  const eventMinutes = (eEnd.getTime() - eStart.getTime()) / (1000 * 60)

  const top = (offsetMinutes / totalMinutes) * 100
  const height = (eventMinutes / totalMinutes) * 100

  return { top, height }
}

/**
 * Get event color based on type
 */
export function getEventColor(eventType: string): string {
  const colors: { [key: string]: string } = {
    lecture: 'bg-blue-500',
    practical: 'bg-green-500',
    lab: 'bg-purple-500',
    seminar: 'bg-orange-500',
    exam: 'bg-red-500',
    other: 'bg-gray-500'
  }
  return colors[eventType] || colors.other
}

/**
 * Export events to iCalendar format
 */
export function exportToICalendar(events: TimetableEvent[], batchName: string): string {
  let ical = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//School MS//Timetable//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:${batchName} Timetable
X-WR-TIMEZONE:UTC
BEGIN:VEVENT
SUMMARY:Batch Timetable - ${batchName}
DESCRIPTION:Timetable for ${batchName}
UID:${new Date().getTime()}@school-ms.local
DTSTAMP:${new Date().toISOString()}
END:VEVENT
`

  events.forEach(event => {
    const start = new Date(event.start_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    const end = new Date(event.end_time).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

    ical += `BEGIN:VEVENT
UID:${event.id}@school-ms.local
SUMMARY:${event.event_type.toUpperCase()} - ${event.subject_id}
DTSTART:${start}
DTEND:${end}
LOCATION:${event.room || 'TBD'}
DESCRIPTION:${event.notes || 'Class'}
STATUS:CONFIRMED
END:VEVENT
`
  })

  ical += `END:VCALENDAR`
  return ical
}

/**
 * Format timetable for printing
 */
export function formatForPrint(events: TimetableEvent[]): string {
  let html = '<table style="width:100%; border-collapse: collapse;">'
  html += '<tr><th>Time</th><th>Subject</th><th>Teacher</th><th>Room</th><th>Type</th></tr>'

  events.forEach(event => {
    html += `<tr>
      <td>${formatTime(event.start_time)} - ${formatTime(event.end_time)}</td>
      <td>${event.subject_id}</td>
      <td>${event.teacher_id}</td>
      <td>${event.room || '-'}</td>
      <td>${event.event_type}</td>
    </tr>`
  })

  html += '</table>'
  return html
}

/**
 * Check if event is today
 */
export function isEventToday(eventDate: Date | string): boolean {
  const today = new Date()
  const other = new Date(eventDate)
  return (
    today.getFullYear() === other.getFullYear() &&
    today.getMonth() === other.getMonth() &&
    today.getDate() === other.getDate()
  )
}

/**
 * Check if event is upcoming (within next 7 days)
 */
export function isEventUpcoming(eventDate: Date | string): boolean {
  const now = new Date()
  const event = new Date(eventDate)
  const daysFromNow = (event.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  return daysFromNow >= 0 && daysFromNow <= 7
}
