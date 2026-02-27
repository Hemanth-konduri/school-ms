import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { notificationId } = await request.json()
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options)
        },
        remove(name: string, options: any) {
          cookieStore.delete(name)
        },
      },
    }
  )

  try {
    // Get notification details
    const { data: notification, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('id', notificationId)
      .single()

    if (notifError) throw notifError

    // Get notification targets
    const { data: targets, error: targetsError } = await supabase
      .from('notification_targets')
      .select('*')
      .eq('notification_id', notificationId)

    if (targetsError) throw targetsError

    // Determine which users should receive this notification
    const userIds = new Set<string>()

    // Get all user roles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, role_id')

    if (profilesError) throw profilesError

    // Get role mappings
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, name')

    if (rolesError) throw rolesError

    const roleMap = new Map(roles!.map(r => [r.id, r.name]))

    // Filter users based on targets
    targets!.forEach(target => {
      if (target.target_type === 'role') {
        profiles!.forEach(profile => {
          if (roleMap.get(profile.role_id) === target.target_value) {
            userIds.add(profile.id)
          }
        })
      } else if (target.target_type === 'school') {
        // For school, find all students in that school
        // This would require joining with students table
      } else if (target.target_type === 'program') {
        // For program
      } else if (target.target_type === 'group') {
        // For group
      } else if (target.target_type === 'batch') {
        // For batch
      }
    })

    // Create user_notifications records for each recipient
    if (userIds.size > 0) {
      const userNotifications = Array.from(userIds).map(recipientId => ({
        notification_id: notificationId,
        recipient_id: recipientId,
        is_read: false
      }))

      const { error: insertError } = await supabase
        .from('user_notifications')
        .insert(userNotifications)

      if (insertError) throw insertError
    }

    return NextResponse.json({ success: true, recipients: userIds.size })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
}
