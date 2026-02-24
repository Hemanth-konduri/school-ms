'use client'

import { Bell, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Header() {
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('*, roles(name)')
        .eq('auth_user_id', user.id)
        .single()
      setProfile(data)
    }
  }

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">Dashboard</h2>
      </div>
      
      <div className="flex items-center gap-4">
        <button className="p-2 hover:bg-slate-100 transition-colors">
          <Bell className="w-5 h-5 text-slate-600" />
        </button>
        
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-900">{profile?.full_name || 'User'}</p>
            <p className="text-xs text-slate-500">{profile?.roles?.name || 'Role'}</p>
          </div>
          <div className="w-10 h-10 bg-red-600 flex items-center justify-center text-white font-semibold">
            <User className="w-5 h-5" />
          </div>
        </div>
      </div>
    </header>
  )
}
