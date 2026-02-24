'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*, roles(name)')
      .eq('auth_user_id', user.id)
      .single()

    if (!profile) {
      await supabase.auth.signOut()
      router.push('/login')
      return
    }

    setUser(user)
    setProfile(profile)
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen p-8">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p><strong>Email:</strong> {profile?.email}</p>
            <p><strong>Name:</strong> {profile?.full_name}</p>
            <p><strong>Role:</strong> {profile?.roles?.name}</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
