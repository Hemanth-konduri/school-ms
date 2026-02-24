'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Users, BookOpen, GraduationCap, TrendingUp } from 'lucide-react'

export default function Dashboard() {
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

  const stats = [
    { icon: Users, label: 'Total Students', value: '1,234', color: 'bg-blue-500' },
    { icon: BookOpen, label: 'Total Classes', value: '45', color: 'bg-green-500' },
    { icon: GraduationCap, label: 'Teachers', value: '89', color: 'bg-purple-500' },
    { icon: TrendingUp, label: 'Attendance', value: '94%', color: 'bg-red-500' },
  ]

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back, {profile?.full_name}!</h1>
        <p className="text-slate-600">Here's what's happening in your school today</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="bg-white border-2 border-slate-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 mb-1">{stat.label}</p>
                  <p className="text-3xl font-bold text-slate-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} w-12 h-12 flex items-center justify-center text-white`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
