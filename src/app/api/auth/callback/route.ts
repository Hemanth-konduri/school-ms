import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  let redirectPath = '/dashboards/admin'
  const tempResponse = NextResponse.redirect(`${origin}${redirectPath}`)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          tempResponse.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          tempResponse.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Step 1: Exchange code for session
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    console.error('Code exchange failed:', exchangeError.message)
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`)
  }

  // Step 2: Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=no_user`)
  }

  // Step 3: Check students table FIRST — before the profile is_active check.
  // This is critical: handleDisable sets BOTH students.is_disabled=true AND
  // profiles.is_active=false. If we check profile.is_active first we lose the
  // disabled_at date and show the wrong generic message.
  const { data: student } = await supabase
    .from('students')
    .select('is_disabled, disabled_at')
    .eq('email', user.email)
    .maybeSingle()

  if (student?.is_disabled) {
    await supabase.auth.signOut()
    // Pass the disabled date in the URL so the login page can show:
    // "Your account was disabled on 2 March 2026. Contact your administrator."
    const disabledAt = student.disabled_at
      ? encodeURIComponent(student.disabled_at)
      : ''
    return NextResponse.redirect(
      `${origin}/login?error=disabled${disabledAt ? `&date=${disabledAt}` : ''}`
    )
  }

  // Step 4: Check profile exists
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_active, role_id')
    .eq('email', user.email)
    .maybeSingle()

  if (!profile) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=not_registered`)
  }

  // Step 5: Check profile is_active (admin-level deactivation, not student disable)
  if (!profile.is_active) {
    await supabase.auth.signOut()
    return NextResponse.redirect(`${origin}/login?error=inactive`)
  }

  // Step 6: Get role name and route
  const { data: role } = await supabase
    .from('roles')
    .select('name')
    .eq('id', profile.role_id)
    .single()

  const roleName = role?.name?.toLowerCase() ?? ''

  if (roleName === 'student')                              redirectPath = '/dashboards/student'
  else if (roleName === 'teacher')                         redirectPath = '/dashboards/teacher'
  else if (roleName === 'admin' || roleName === 'super_admin') redirectPath = '/dashboards/admin'

  // Build final redirect with session cookies copied over
  const finalResponse = NextResponse.redirect(`${origin}${redirectPath}`)
  tempResponse.cookies.getAll().forEach(cookie => finalResponse.cookies.set(cookie))
  return finalResponse
}