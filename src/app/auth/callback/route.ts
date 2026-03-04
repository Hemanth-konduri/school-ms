import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboards/admin'

  if (code) {
    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            response.cookies.set({ name, value: '', ...options })
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

    if (!profile) {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?error=not_registered`)
    }
    if (!profile.is_active) {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?error=inactive`)
    }

    const { data: student } = await supabase
      .from('students')
      .select('is_disabled')
      .eq('email', user.email)
      .maybeSingle()

    if (student?.is_disabled) {
      await supabase.auth.signOut()
      return NextResponse.redirect(`${origin}/login?error=disabled`)
    }

    return response
  }

  return NextResponse.redirect(`${origin}/login`)
}
