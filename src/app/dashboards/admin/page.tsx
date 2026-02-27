'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Settings, LogOut, Users, GraduationCap, BookOpen, ClipboardList, FileText, Award, Bell, Shield, Calendar, BarChart, Building2, Layers } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')
  const [greeting, setGreeting] = useState('')

  useEffect(() => {
    checkUser()
    const hour = new Date().getHours()
    if (hour < 12) setGreeting('Good Morning')
    else if (hour < 18) setGreeting('Good Afternoon')
    else setGreeting('Good Evening')
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError) throw userError
      if (!user) { router.replace('/login'); return }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*, roles(name)')
        .eq('auth_user_id', user.id)
        .single()

      if (profileError || !profileData) {
        router.replace('/login')
        return
      }

      setProfile({ ...profileData, avatar_url: user.user_metadata?.avatar_url })
    } catch (error: any) {
      console.error('Dashboard auth check failed:', error)
      setAuthError(error?.message || 'Unable to verify session')
      router.replace('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const apps = [
    { title: 'Academic Hierarchy', desc: 'Schools, programs, groups & batches', icon: Layers, color: 'bg-violet-50 hover:bg-violet-100', iconColor: 'text-violet-600', link: '/dashboards/admin/academics' },
    { title: 'Manage Students', desc: 'Add and organize student accounts', icon: Users, color: 'bg-blue-50 hover:bg-blue-100', iconColor: 'text-blue-600', link: '/dashboards/admin/students' },
    { title: 'Manage Teachers', desc: 'Add and manage teaching staff', icon: GraduationCap, color: 'bg-green-50 hover:bg-green-100', iconColor: 'text-green-600', link: '/dashboards/admin/teachers' },
    { title: 'Classes', desc: 'Organize courses and schedules', icon: BookOpen, color: 'bg-purple-50 hover:bg-purple-100', iconColor: 'text-purple-600', link: '/dashboards/admin/classes' },
    { title: 'Exams', desc: 'Create and manage examinations', icon: ClipboardList, color: 'bg-orange-50 hover:bg-orange-100', iconColor: 'text-orange-600', link: '/dashboards/admin/exams' },
    { title: 'Results', desc: 'View and publish exam results', icon: FileText, color: 'bg-teal-50 hover:bg-teal-100', iconColor: 'text-teal-600', link: '/dashboards/admin/results' },
    { title: 'Attendance', desc: 'Track student attendance', icon: Calendar, color: 'bg-pink-50 hover:bg-pink-100', iconColor: 'text-pink-600', link: '/dashboards/admin/attendance' },
    { title: 'Reports', desc: 'Generate analytics and reports', icon: BarChart, color: 'bg-indigo-50 hover:bg-indigo-100', iconColor: 'text-indigo-600', link: '/dashboards/admin/reports' },
    { title: 'Notifications', desc: 'System alerts and announcements', icon: Bell, color: 'bg-yellow-50 hover:bg-yellow-100', iconColor: 'text-yellow-600', link: '/dashboards/admin/notifications' },
  ]

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#f5f1ea]">Loading...</div>
  if (authError) return <div className="min-h-screen flex items-center justify-center bg-[#f5f1ea] text-red-600">{authError}</div>

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      <div className="relative bg-gradient-to-br from-[#faf8f3] to-[#f0ebe0] shadow-md overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(to bottom, rgba(100,100,100,0.8) 0%, rgba(100,100,100,0.4) 50%, transparent 100%), linear-gradient(#666 1px, transparent 1px), linear-gradient(90deg, #666 1px, transparent 1px)`,
            backgroundSize: '100% 100%, 30px 30px, 30px 30px',
          }}
        />
        <div className="absolute top-10 right-20 opacity-5"><Shield className="h-32 w-32 text-gray-600" /></div>
        <div className="absolute bottom-10 left-20 opacity-5"><BookOpen className="h-28 w-28 text-gray-600" /></div>
        <div className="absolute top-1/2 right-1/3 opacity-5"><Award className="h-24 w-24 text-gray-600" /></div>

        <div className="relative max-w-7xl mx-auto px-8 py-10">
          <div className="flex items-center justify-between">
            <div className="w-16 h-16 bg-white shadow-lg flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-800">SM</span>
            </div>
            <div className="flex-1 ml-8">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-gray-800">{greeting}, {profile?.full_name}!</h1>
                <Badge className="bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100">
                  <Shield className="h-3 w-3 mr-1" />
                  {profile?.roles?.name || 'Administrator'}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">{profile?.email}</p>
            </div>
            <div className="flex items-center gap-3 bg-white/60 backdrop-blur px-4 py-2 shadow-sm">
              <div className="hover:bg-white/80 transition-all cursor-pointer p-2"><Settings className="h-5 w-5 text-gray-600" /></div>
              <div onClick={handleLogout} className="hover:bg-white/80 transition-all cursor-pointer p-2"><LogOut className="h-5 w-5 text-gray-600" /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-8">School Management Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {apps.map((app, index) => {
            const Icon = app.icon
            const BgIcon = app.icon
            return (
              <button
                key={app.title}
                onClick={() => app.link && router.push(app.link)}
                className={`${app.color} p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-2 text-left relative group overflow-hidden`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute -right-6 -bottom-6 opacity-[0.08] group-hover:opacity-[0.12] transition-opacity duration-300">
                  <BgIcon className="h-32 w-32" />
                </div>
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`${app.iconColor} p-3 bg-white/60 shadow-sm`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    {app.title === 'Academic Hierarchy' && (
                      <span className="text-xs bg-violet-200 text-violet-700 px-2 py-0.5 font-medium">NEW</span>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">{app.title}</h3>
                  <p className="text-sm text-gray-600">{app.desc}</p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
