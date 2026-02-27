'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { BookOpen, GraduationCap, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboards/admin')
      }
    }
    checkUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Verify profile exists
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('auth_user_id', session.user.id)
          .maybeSingle()

        if (!profile || !profile.is_active) {
          await supabase.auth.signOut()
          setError('Unauthorized email. Contact admin to get access.')
          setLoading(false)
        } else {
          router.push('/dashboards/admin')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [router])

  const handleGoogleLogin = async () => {
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) throw error
    } catch (error: any) {
      setError(error.message || 'Failed to login')
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-white">
      {/* Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808018_1px,transparent_1px),linear-gradient(to_bottom,#80808018_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:linear-gradient(to_bottom,white_20%,transparent)]" />
      
      {/* Decorative Icons */}
      <BookOpen className="absolute top-20 left-20 w-20 h-20 text-slate-400 opacity-40" />
      <GraduationCap className="absolute top-32 right-24 w-24 h-24 text-slate-400 opacity-35" />
      <Users className="absolute bottom-28 left-32 w-20 h-20 text-slate-400 opacity-40" />
      <BookOpen className="absolute bottom-16 right-16 w-16 h-16 text-slate-400 opacity-35" />
      
      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-white border-2 border-slate-200 shadow-xl p-10">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold text-slate-900 mb-3">Welcome Back</h1>
            <p className="text-slate-600">Sign in to access your school management dashboard and streamline your educational operations</p>
          </div>
          
          <Button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-red-600 hover:bg-red-700 text-white font-semibold py-4 px-6 shadow-lg transition-all duration-200 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {loading ? 'Redirecting...' : 'Sign in with Google'}
          </Button>
          
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Authentication Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
}
