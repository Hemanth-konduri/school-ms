import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboards/admin'

  if (code) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            void name; void value; void options
          },
          remove(name: string, options: any) {
            void name; void options
          },
        },
      }
    )

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) return NextResponse.redirect(`${origin}/login?error=exchange_failed`)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?error=no_user`)
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('email', user.email)
      .maybeSingle()

    if (profile && !profile.is_active) {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?error=inactive`)
    }

    const [{ data: student }, { data: teacher }] = await Promise.all([
      supabase
        .from('students')
        .select('is_disabled')
        .eq('email', user.email)
        .maybeSingle(),
      supabase
        .from('teachers')
        .select('id')
        .eq('email', user.email)
        .maybeSingle(),
    ])

    if (student?.is_disabled) {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?error=disabled`)
    }

    // If no profile and not present in students/teachers, block.
    if (!profile && !student && !teacher) {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?error=not_registered`)
    }

    const target = student ? '/dashboards/student' : teacher ? '/dashboards/teacher' : next
    return NextResponse.redirect(`${origin}${target}`)
  }

  return NextResponse.redirect(`${origin}/login`)
}
