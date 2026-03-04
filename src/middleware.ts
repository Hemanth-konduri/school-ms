import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// ── Next.js REQUIRES this to be exported as `middleware` ──────────────────────
// Named export, not default. This is what Next.js looks for.
export async function middleware(request: NextRequest) {
  // ── Confirm middleware is actually running ──────────────────────────────
  // Check your TERMINAL (not browser console) for this log.
  // If you don't see it when visiting /dashboards — the file location is wrong.
  

  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Refresh session — required on every request
  const { data: { user } } = await supabase.auth.getUser()
 

  const { pathname } = request.nextUrl

  // ── Protect all dashboard routes ───────────────────────────────────────
  if (pathname.startsWith('/dashboards')) {
    if (!user) {
      
      return NextResponse.redirect(new URL('/login', request.url))
    }

    // ── Check if student is disabled ──────────────────────────────────
    // This runs server-side on EVERY dashboard request — it cannot be
    // bypassed by the client-side onAuthStateChange race condition.
    const { data: student } = await supabase
      .from('students')
      .select('is_disabled, disabled_at')
      .eq('email', user.email)
      .maybeSingle()

    

    if (student?.is_disabled) {
     
      await supabase.auth.signOut()

      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'disabled')

      if (student.disabled_at) {
        loginUrl.searchParams.set('date', encodeURIComponent(student.disabled_at))
      }

      // Clear all supabase session cookies
      const redirectRes = NextResponse.redirect(loginUrl)
      request.cookies.getAll().forEach(cookie => {
        if (cookie.name.includes('sb-') || cookie.name.includes('supabase')) {
          redirectRes.cookies.set(cookie.name, '', { maxAge: 0, path: '/' })
        }
      })
      return redirectRes
    }

    // ── Check if teacher is disabled ──────────────────────────────────
    const { data: teacher } = await supabase
      .from('teachers')
      .select('is_disabled, disabled_at')
      .eq('email', user.email)
      .maybeSingle()

   

    if (teacher?.is_disabled) {
     
      await supabase.auth.signOut()

      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'disabled')

      if (teacher.disabled_at) {
        loginUrl.searchParams.set('date', encodeURIComponent(teacher.disabled_at))
      }

      const redirectRes = NextResponse.redirect(loginUrl)
      request.cookies.getAll().forEach(cookie => {
        if (cookie.name.includes('sb-') || cookie.name.includes('supabase')) {
          redirectRes.cookies.set(cookie.name, '', { maxAge: 0, path: '/' })
        }
      })
      return redirectRes
    }

    // ── Check if profile is deactivated (admin disabled) ─────────────
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('email', user.email)
      .maybeSingle()

   

    if (profile && !profile.is_active) {
    
      await supabase.auth.signOut()

      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'inactive')

      const redirectRes = NextResponse.redirect(loginUrl)
      request.cookies.getAll().forEach(cookie => {
        if (cookie.name.includes('sb-') || cookie.name.includes('supabase')) {
          redirectRes.cookies.set(cookie.name, '', { maxAge: 0, path: '/' })
        }
      })
      return redirectRes
    }
  }

  // ── Redirect logged-in users away from /login ──────────────────────────
  if (user && pathname === '/login') {
    const params = new URLSearchParams(request.nextUrl.search)
    // Don't redirect if there's an error param — let the error show
    if (!params.get('error')) {
      return NextResponse.redirect(new URL('/dashboards/admin', request.url))
    }
  }

  return response
}

// ── This config tells Next.js WHICH routes to run middleware on ───────────────
// Without this, middleware might not run on your routes at all.
export const config = {
  matcher: [
    '/dashboards/:path*',
    '/login',
  ],
}
