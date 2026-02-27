'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Layers, CheckCircle, UserCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface School { id: string; name: string }
interface Program { id: string; name: string }
interface Batch { id: string; name: string; academic_year: string }
interface Teacher { id: string; name: string; designation: string | null; department: string | null }
interface Assignment {
  id: string
  batches: { name: string; academic_year: string } | null
  teachers: { name: string; designation: string | null } | null
}

export default function AssignClassTeacherPage() {
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])

  const [form, setForm] = useState({ school_id: '', program_id: '', batch_id: '', teacher_id: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    supabase.from('schools').select('id, name').order('name').then(({ data }) => setSchools(data || []))
    supabase.from('teachers').select('id, name, designation, department').eq('is_active', true).order('name').then(({ data }) => setTeachers(data || []))
    fetchAssignments()
  }, [])

  useEffect(() => {
    if (form.school_id) {
      setForm(f => ({ ...f, program_id: '', batch_id: '' }))
      setPrograms([]); setBatches([])
      supabase.from('programs').select('id, name').eq('school_id', form.school_id).order('name').then(({ data }) => setPrograms(data || []))
    } else { setPrograms([]); setBatches([]) }
  }, [form.school_id])

  useEffect(() => {
    if (form.program_id) {
      setForm(f => ({ ...f, batch_id: '' }))
      setBatches([])
      supabase.from('batches').select('id, name, academic_year').eq('program_id', form.program_id).order('name').then(({ data }) => setBatches(data || []))
    } else { setBatches([]) }
  }, [form.program_id])

  const fetchAssignments = async () => {
    const { data } = await supabase
      .from('class_teachers')
      .select('id, batches(name, academic_year), teachers(name, designation)')
      .order('assigned_at', { ascending: false })
    setAssignments((data as any) || [])
  }

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleAssign = async () => {
    setError(''); setSuccess('')
    if (!form.batch_id || !form.teacher_id) return setError('Select both batch and teacher.')
    setSaving(true)
    const { error: err } = await supabase.from('class_teachers').upsert(
      { batch_id: form.batch_id, teacher_id: form.teacher_id },
      { onConflict: 'batch_id' }
    )
    setSaving(false)
    if (err) return setError(err.message)
    setSuccess('Class teacher assigned successfully!')
    setForm(f => ({ ...f, batch_id: '', teacher_id: '' }))
    fetchAssignments()
    setTimeout(() => setSuccess(''), 4000)
  }

  const removeAssignment = async (id: string) => {
    if (!confirm('Remove this class teacher assignment?')) return
    await supabase.from('class_teachers').delete().eq('id', id)
    fetchAssignments()
  }

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      <div className="relative bg-gradient-to-br from-[#faf8f3] to-[#f0ebe0] shadow-md overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(#666 1px, transparent 1px), linear-gradient(90deg, #666 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />
        <div className="relative max-w-5xl mx-auto px-8 py-10">
          <Button variant="ghost" onClick={() => router.push('/dashboards/admin/teachers')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 px-0 hover:bg-transparent">
            <ArrowLeft className="h-4 w-4" /> Back to Teachers
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 flex items-center justify-center shadow-lg">
              <UserCheck className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Assign Class Teacher</h1>
              <p className="text-gray-500 text-sm mt-1">One class teacher per batch — re-assigning replaces the existing one</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <Card className="rounded-none shadow-sm border-gray-100">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-base font-bold text-gray-700">New Assignment</CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6 space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
            {success && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> {success}
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">School</Label>
              <Select value={form.school_id || 'none'} onValueChange={v => set('school_id', v === 'none' ? '' : v)}>
                <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Select School" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select School</SelectItem>
                  {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Program</Label>
              <Select value={form.program_id || 'none'} onValueChange={v => set('program_id', v === 'none' ? '' : v)} disabled={!form.school_id}>
                <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Select Program" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select Program</SelectItem>
                  {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Batch *</Label>
              <Select value={form.batch_id || 'none'} onValueChange={v => set('batch_id', v === 'none' ? '' : v)} disabled={!form.program_id}>
                <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Select Batch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select Batch</SelectItem>
                  {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({b.academic_year})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Teacher *</Label>
              <Select value={form.teacher_id || 'none'} onValueChange={v => set('teacher_id', v === 'none' ? '' : v)}>
                <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Select Teacher" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select Teacher</SelectItem>
                  {teachers.map(t => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}{t.designation ? ` — ${t.designation}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 border border-blue-100 p-3 text-xs text-blue-700">
              ⚠ If this batch already has a class teacher, they will be replaced automatically.
            </div>

            <Button onClick={handleAssign} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-none font-semibold">
              {saving ? 'Assigning...' : 'Assign Class Teacher'}
            </Button>
          </CardContent>
        </Card>

        {/* Current Assignments */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Current Assignments
            <span className="ml-2 text-sm font-normal text-gray-400">({assignments.length})</span>
          </h2>
          {assignments.length === 0 ? (
            <Card className="rounded-none shadow-sm border-gray-100">
              <CardContent className="p-8 text-center text-gray-400 text-sm">No assignments yet.</CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {assignments.map(a => (
                <Card key={a.id} className="rounded-none shadow-sm border-gray-100 p-0">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Layers className="h-4 w-4 text-blue-500" />
                        <span className="font-semibold text-gray-800 text-sm">{(a.batches as any)?.name}</span>
                        <Badge variant="outline" className="text-xs border-blue-200 text-blue-700 bg-blue-50">
                          {(a.batches as any)?.academic_year}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <UserCheck className="h-3 w-3 text-green-500" />
                        {(a.teachers as any)?.name}
                        {(a.teachers as any)?.designation && ` · ${(a.teachers as any)?.designation}`}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeAssignment(a.id)}
                      className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
