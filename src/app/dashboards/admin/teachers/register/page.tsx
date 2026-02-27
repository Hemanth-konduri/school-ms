'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, CheckCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface School { id: string; name: string }
interface Teacher {
  id: string; name: string; email: string; phone: string | null
  employee_id: string | null; designation: string | null; department: string | null
  is_active: boolean; schools: { name: string } | null
}

export default function RegisterTeacherPage() {
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [form, setForm] = useState({
    name: '', email: '', phone: '', employee_id: '',
    designation: '', department: '', school_id: ''
  })

  useEffect(() => {
    supabase.from('schools').select('id, name').order('name').then(({ data }) => setSchools(data || []))
    fetchTeachers()
  }, [])

  const fetchTeachers = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('teachers')
      .select('id, name, email, phone, employee_id, designation, department, is_active, schools(name)')
      .order('name')
    setTeachers((data as any) || [])
    setLoading(false)
  }

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    setError(''); setSuccess('')
    if (!form.name.trim() || !form.email.trim()) return setError('Name and email are required.')
    setSaving(true)
    const { error: err } = await supabase.from('teachers').insert({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim() || null,
      employee_id: form.employee_id.trim() || null,
      designation: form.designation.trim() || null,
      department: form.department.trim() || null,
      school_id: form.school_id || null,
    })
    setSaving(false)
    if (err) return setError(err.message.includes('email') ? 'Email already registered.' : err.message)
    setSuccess(`Teacher "${form.name}" registered successfully!`)
    setForm({ name: '', email: '', phone: '', employee_id: '', designation: '', department: '', school_id: '' })
    fetchTeachers()
    setTimeout(() => setSuccess(''), 4000)
  }

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from('teachers').update({ is_active: !current }).eq('id', id)
    fetchTeachers()
  }

  const deleteTeacher = async (id: string, name: string) => {
    if (!confirm(`Delete teacher "${name}"? All assignments will be removed.`)) return
    await supabase.from('teachers').delete().eq('id', id)
    fetchTeachers()
  }

  const inputClass = "rounded-none border-gray-200 focus-visible:ring-green-400"

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      <div className="relative bg-gradient-to-br from-[#faf8f3] to-[#f0ebe0] shadow-md overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(#666 1px, transparent 1px), linear-gradient(90deg, #666 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />
        <div className="relative max-w-6xl mx-auto px-8 py-10">
          <Button variant="ghost" onClick={() => router.push('/dashboards/admin/teachers')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 px-0 hover:bg-transparent">
            <ArrowLeft className="h-4 w-4" /> Back to Teachers
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-600 flex items-center justify-center shadow-lg">
              <UserPlus className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Register Teacher</h1>
              <p className="text-gray-500 text-sm mt-1">Add new teaching staff to the system</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <Card className="rounded-none shadow-sm border-gray-100">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-base font-bold text-gray-700">Teacher Details</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> {success}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Full Name *</Label>
                <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Dr. Rajesh Kumar" className={inputClass} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Email *</Label>
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="teacher@example.com" className={inputClass} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Phone</Label>
                <Input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 9876543210" className={inputClass} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Employee ID</Label>
                <Input value={form.employee_id} onChange={e => set('employee_id', e.target.value)} placeholder="e.g. EMP001" className={inputClass} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Designation</Label>
                <Input value={form.designation} onChange={e => set('designation', e.target.value)} placeholder="e.g. Associate Professor" className={inputClass} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Department</Label>
                <Input value={form.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Computer Science" className={inputClass} />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">School</Label>
                <Select value={form.school_id || 'none'} onValueChange={v => set('school_id', v === 'none' ? '' : v)}>
                  <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Select School" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific school</SelectItem>
                    {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSubmit} disabled={saving} className="w-full bg-green-600 hover:bg-green-700 text-white rounded-none font-semibold mt-2">
              {saving ? 'Registering...' : 'Register Teacher'}
            </Button>
          </CardContent>
        </Card>

        {/* Teacher List */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Registered Teachers
            <span className="ml-2 text-sm font-normal text-gray-400">({teachers.length})</span>
          </h2>
          {loading ? (
            <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>
          ) : teachers.length === 0 ? (
            <Card className="rounded-none shadow-sm border-gray-100">
              <CardContent className="p-8 text-center text-gray-400 text-sm">No teachers yet.</CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {teachers.map(t => (
                <Card key={t.id} className="rounded-none shadow-sm border-gray-100 p-0">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 bg-green-100 flex items-center justify-center text-xs font-bold text-green-700 flex-shrink-0 mt-0.5">
                          {t.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800 text-sm">{t.name}</div>
                          <div className="text-xs text-gray-400">{t.email}</div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {t.designation && <Badge variant="outline" className="text-xs border-gray-200 text-gray-600">{t.designation}</Badge>}
                            {t.department && <Badge variant="secondary" className="text-xs">{t.department}</Badge>}
                            {(t.schools as any)?.name && <Badge variant="outline" className="text-xs border-green-200 text-green-700 bg-green-50">{(t.schools as any)?.name}</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button onClick={() => toggleActive(t.id, t.is_active)}
                          className={`text-xs px-2 py-0.5 font-semibold border ${t.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                          {t.is_active ? 'Active' : 'Inactive'}
                        </button>
                        <Button variant="ghost" size="sm" onClick={() => deleteTeacher(t.id, t.name)}
                          className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
