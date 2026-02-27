/**
 * Notification System Utilities
 * Helpers for managing notifications, filtering users, and handling delivery
 */

import { SupabaseClient } from '@supabase/supabase-js'

interface NotificationTarget {
  target_type: string
  target_value: string | null
}

/**
 * Get all profile IDs that should receive a notification based on targets
 */
export async function getNotificationRecipients(
  supabase: SupabaseClient,
  notificationId: string,
  targets: NotificationTarget[]
): Promise<string[]> {
  const recipientIds = new Set<string>()

  for (const target of targets) {
    if (target.target_type === 'everyone') {
      // Get all profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
      profiles?.forEach(p => recipientIds.add(p.id))
    } else if (target.target_type === 'role') {
      // Get all profiles with specific role
      const { data: role } = await supabase
        .from('roles')
        .select('id')
        .eq('name', target.target_value)
        .single()

      if (role) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('role_id', role.id)
        profiles?.forEach(p => recipientIds.add(p.id))
      }
    } else if (target.target_type === 'school') {
      // Get all students in a school
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('school_id', target.target_value)
      // Note: Students table has id, but we need to link to profiles somehow
      // This might require additional schema adjustments
    } else if (target.target_type === 'program') {
      // Get all students in a program
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('program_id', target.target_value)
    } else if (target.target_type === 'group') {
      // Get all students in a group/department
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('group_id', target.target_value)
    } else if (target.target_type === 'batch') {
      // Get all students in a batch
      const { data: students } = await supabase
        .from('students')
        .select('id')
        .eq('batch_id', target.target_value)
    } else if (target.target_type === 'student') {
      // Specific student
      if (target.target_value) {
        recipientIds.add(target.target_value)
      }
    } else if (target.target_type === 'teacher') {
      // Specific teacher or all teachers
      if (target.target_value === 'all') {
        const { data: teachers } = await supabase
          .from('teachers')
          .select('id')
        teachers?.forEach(t => recipientIds.add(t.id))
      } else {
        recipientIds.add(target.target_value || '')
      }
    }
  }

  return Array.from(recipientIds)
}

/**
 * Format notification display
 */
export function formatNotification(notification: any) {
  return {
    ...notification,
    createdAt: new Date(notification.created_at),
    sentAt: notification.sent_at ? new Date(notification.sent_at) : null,
    scheduledAt: notification.scheduled_at ? new Date(notification.scheduled_at) : null,
    expiresAt: notification.expires_at ? new Date(notification.expires_at) : null,
  }
}

/**
 * Check if notification has expired
 */
export function isNotificationExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

/**
 * Get priority icon/color
 */
export function getPriorityDisplay(priority: string): { color: string; label: string } {
  switch (priority) {
    case 'urgent':
      return { color: 'red', label: '🔴 Urgent' }
    case 'important':
      return { color: 'orange', label: '🟠 Important' }
    case 'normal':
    default:
      return { color: 'gray', label: '🟢 Normal' }
  }
}

/**
 * Get status display
 */
export function getStatusDisplay(status: string): { color: string; label: string } {
  switch (status) {
    case 'sent':
      return { color: 'green', label: '✅ Sent' }
    case 'scheduled':
      return { color: 'blue', label: '⏰ Scheduled' }
    case 'draft':
      return { color: 'gray', label: '📝 Draft' }
    case 'expired':
      return { color: 'red', label: '❌ Expired' }
    default:
      return { color: 'gray', label: status }
  }
}

/**
 * Validate notification before sending
 */
export function validateNotification(notification: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!notification.title?.trim()) {
    errors.push('Title is required')
  }

  if (!notification.message?.trim()) {
    errors.push('Message is required')
  }

  if (!['normal', 'important', 'urgent'].includes(notification.priority)) {
    errors.push('Invalid priority')
  }

  if (!['in_app', 'email', 'push', 'all'].includes(notification.notification_type)) {
    errors.push('Invalid notification type')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * Get next scheduled notification check time
 */
export function getNextCheckTime(notifications: any[]): Date | null {
  const scheduled = notifications
    .filter(n => n.status === 'scheduled' && n.scheduled_at)
    .map(n => new Date(n.scheduled_at))
    .filter(d => d > new Date())
    .sort((a, b) => a.getTime() - b.getTime())

  return scheduled.length > 0 ? scheduled[0] : null
}
