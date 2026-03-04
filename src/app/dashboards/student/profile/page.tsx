'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, User, Mail, Phone, Calendar, MapPin, Droplet,
  GraduationCap, BookOpen, Hash, Layers, Building2, Edit2, Save, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface StudentData {
  id: string; name: string; email: string; phone: string | null
  roll_number: string | null; semester: number | null
  admission_number: string | null
  batches: {
    name: string; academic_year: string
    programs: { name: string; schools: { name: string } }
    groups: { name: string }
  } | null
  profiles: {
    id: string
    date_of_birth: string | null; blood_group: string | null
    gender: string | null; address: string | null
  } | null
}

export default function StudentProfile() {
  const router = useRouter()
  const [student, setStudent] = useState<StudentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    phone: '', address: '', date_of_birth: '', blood_group: '', gender: ''
  })

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data, error } = await supabase
        .from('students')
        .select(`id,name,email,phone,roll_number,semester,admission_number,
          batches!students_batch_id_fkey(name,academic_year,
            programs!batches_program_id_fkey(name,schools!programs_school_id_fkey(name)),
            groups!batches_group_id_fkey(name))`)
        .eq('email', user.email)
        .single()

      console.log('Profile query:', { data, error, email: user.email })
      if (error) { console.error('Full error:', JSON.stringify(error)); setLoading(false); return }
      if (!data) { setLoading(false); return }

      setStudent({ ...data, profiles: null, batches: (data.batches as any) || null } as StudentData)
      setForm({
        phone: data.phone || '',
        address: '',
        date_of_birth: '',
        blood_group: '',
        gender: ''
      })
      setLoading(false)
    }
    load()
  }, [router])

  const handleSave = async () => {
    if (!student) return
    setSaving(true)
    await supabase.from('students').update({ phone: form.phone || null }).eq('id', student.id)
    setSaving(false)
    setEditing(false)
    window.location.reload()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F4EF] flex items-center justify-center">
        <div className="text-gray-400 font-semibold">Loading...</div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-[#F6F4EF] flex items-center justify-center">
        <div className="text-gray-400 font-semibold">No profile found</div>
      </div>
    )
  }

  const initials = student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bg-[#F6F4EF]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => router.push('/dashboards/student')}
            className="text-gray-500 hover:text-gray-800 px-0 hover:bg-transparent">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Button>
          {!editing ? (
            <Button onClick={() => setEditing(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white font-bold">
              <Edit2 className="h-4 w-4 mr-1.5" /> Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(false)}>
                <X className="h-4 w-4 mr-1.5" /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white font-bold">
                <Save className="h-4 w-4 mr-1.5" /> {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>

        <div className="bg-white border-2 border-gray-200 shadow-lg mb-6">
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-8 text-white">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 bg-white/20 flex items-center justify-center text-3xl font-black">
                {initials}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-black mb-1">{student.name}</h1>
                <div className="flex flex-wrap gap-3 text-sm text-white/90">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {student.email}
                  </span>
                  {student.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" /> {student.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-violet-600" /> Academic Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                { icon: Building2, label: 'School', value: student.batches?.programs?.schools?.name },
                { icon: BookOpen, label: 'Program', value: student.batches?.programs?.name },
                { icon: Layers, label: 'Group', value: student.batches?.groups?.name },
                { icon: GraduationCap, label: 'Batch', value: student.batches?.name },
                { icon: Calendar, label: 'Academic Year', value: student.batches?.academic_year },
                { icon: Hash, label: 'Roll Number', value: student.roll_number },
                { icon: BookOpen, label: 'Semester', value: student.semester },
                { icon: Hash, label: 'Admission Number', value: student.admission_number },
              ].map(({ icon: Icon, label, value }) => value && (
                <div key={label} className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200">
                  <Icon className="h-4 w-4 text-violet-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500 font-bold uppercase">{label}</div>
                    <div className="text-sm font-bold text-gray-800 mt-0.5">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6">
            <h2 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-violet-600" /> Personal Information
            </h2>
            
            {editing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-bold text-gray-600 mb-1.5 block">Phone Number</Label>
                  <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="Enter phone number" className="border-gray-300" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200">
                  <Phone className="h-4 w-4 text-violet-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-xs text-gray-500 font-bold uppercase">Phone</div>
                    <div className="text-sm font-bold text-gray-800 mt-0.5">{student.phone || '—'}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
