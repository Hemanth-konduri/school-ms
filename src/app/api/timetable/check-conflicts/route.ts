import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
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
    const {
      batch_id,
      teacher_id,
      room,
      start_time,
      end_time,
      exclude_event_id
    } = await request.json()

    const conflicts: any[] = []

    // Check teacher double-booking
    const { data: teacherConflicts } = await supabase
      .from('timetable_events')
      .select('id, subject_id, start_time, end_time, subjects(name)')
      .eq('teacher_id', teacher_id)
      .eq('status', 'active')
      .lt('start_time', new Date(end_time).toISOString())
      .gt('end_time', new Date(start_time).toISOString())

    if (teacherConflicts && teacherConflicts.length > 0) {
      const filtered = teacherConflicts.filter(c => c.id !== exclude_event_id)
      if (filtered.length > 0) {
        conflicts.push({
          type: 'teacher_double_booking',
          severity: 'critical',
          message: `Teacher is already scheduled for ${filtered[0].subjects?.name || 'another subject'}`,
          conflictingWith: filtered[0]
        })
      }
    }

    // Check batch overlapping classes
    const { data: batchConflicts } = await supabase
      .from('timetable_events')
      .select('id, subject_id, start_time, end_time, subjects(name)')
      .eq('batch_id', batch_id)
      .eq('status', 'active')
      .lt('start_time', new Date(end_time).toISOString())
      .gt('end_time', new Date(start_time).toISOString())

    if (batchConflicts && batchConflicts.length > 0) {
      const filtered = batchConflicts.filter(c => c.id !== exclude_event_id)
      if (filtered.length > 0) {
        conflicts.push({
          type: 'batch_overlap',
          severity: 'critical',
          message: `Batch already has a scheduled class for ${filtered[0].subjects?.name || 'another subject'}`,
          conflictingWith: filtered[0]
        })
      }
    }

    // Check room conflicts
    if (room) {
      const { data: roomConflicts } = await supabase
        .from('timetable_events')
        .select('id, subject_id, start_time, end_time, subjects(name)')
        .eq('room', room)
        .eq('status', 'active')
        .lt('start_time', new Date(end_time).toISOString())
        .gt('end_time', new Date(start_time).toISOString())

      if (roomConflicts && roomConflicts.length > 0) {
        const filtered = roomConflicts.filter(c => c.id !== exclude_event_id)
        if (filtered.length > 0) {
          conflicts.push({
            type: 'room_conflict',
            severity: 'warning',
            message: `Room is already booked for ${filtered[0].subjects?.name || 'another class'}`,
            conflictingWith: filtered[0]
          })
        }
      }
    }

    return NextResponse.json({
      conflicts,
      hasConflicts: conflicts.length > 0,
      criticalConflicts: conflicts.filter(c => c.severity === 'critical').length
    })
  } catch (error: any) {
    console.error('Conflict check error:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
