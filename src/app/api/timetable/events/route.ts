import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
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
    const { searchParams } = new URL(request.url)
    const batchId = searchParams.get('batch_id')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const teacherId = searchParams.get('teacher_id')

    let query = supabase
      .from('timetable_events')
      .select(`
        *,
        subjects(id, name, code),
        teachers(id, name, email)
      `)
      .eq('status', 'active')

    if (batchId) query = query.eq('batch_id', batchId)
    if (teacherId) query = query.eq('teacher_id', teacherId)
    if (startDate) query = query.gte('start_time', startDate)
    if (endDate) query = query.lte('end_time', endDate)

    const { data, error } = await query.order('start_time', { ascending: true })

    if (error) throw error

    return NextResponse.json({ events: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

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
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const eventData = await request.json()
    const profile = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()

    const { data, error } = await supabase
      .from('timetable_events')
      .insert([
        {
          ...eventData,
          created_by: profile.data?.id,
          status: 'active'
        }
      ])
      .select()

    if (error) throw error

    return NextResponse.json({ event: data?.[0] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
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
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('id')
    const updateData = await request.json()

    const { data, error } = await supabase
      .from('timetable_events')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', eventId)
      .select()

    if (error) throw error

    return NextResponse.json({ event: data?.[0] })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
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
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('id')

    // Soft delete by marking as cancelled
    const { error } = await supabase
      .from('timetable_events')
      .update({ status: 'cancelled' })
      .eq('id', eventId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
