'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CalendarDays, CheckCircle, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface School { id: string; name: string }
interface Program { id: string; name: string }
interface Batch { id: string; name: string; academic_year: string }
interface Subject { id: string; name: string; code: string | null }
interface Teacher { id: string; name: string }
interface Schedule {
  id: string; day_of_week: string; start_time: string; end_time: string; room: string | null; semester: number
  batches: { name: string } | null
  subjects: { name: string; code: string | null } | null
  teachers: { name: string } | null
}

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const SEMESTERS = Array.from({ length: 12 }, (_, i) => i + 1)

const DAY_COLORS: Record<string, string> = {
  Monday: 'bg-blue-50 text-blue-700 border-blue-200',
  Tuesday: 'bg-green-50 text-green-700 border-green-200',
  Wednesday: 'bg-violet-50 text-violet-700 border-violet-200',
  Thursday: 'bg-orange-50 text-orange-700 border-orange-200',
  Friday: 'bg-pink-50 text-pink-700 border-pink-200',
  Saturday: 'bg-teal-50 text-teal-700 border-teal-200',
  Sunday: 'bg-red-50 text-red-700 border-red-200',
}

export default function CreateSchedulePage() {
  const router = useRouter()

  const [schools, setSchools] = useState<School[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])

  const [form, setForm] = useState({
    school_id: '', program_id: '', batch_id: '', semester: '',
    subject_id: '', teacher_id: '', day_of_week: '', start_time: '', end_time: '', room: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    supabase.from('schools').select('id, name').order('name').then(({ data }) => setSchools(data || []))
    fetchSchedules()
  }, [])

  useEffect(() => {
    if (form.school_id) {
      setForm(f => ({ ...f, program_id: '', batch_id: '', semester: '', subject_id: '', teacher_id: '' }))
      setPrograms([]); setBatches([]); setSubjects([]); setTeachers([])
      supabase.from('programs').select('id, name').eq('school_id', form.school_id).order('name').then(({ data }) => setPrograms(data || []))
    }
  }, [form.school_id])

  useEffect(() => {
    if (form.program_id) {
      setForm(f => ({ ...f, batch_id: '', semester: '', subject_id: '', teacher_id: '' }))
      setBatches([]); setSubjects([]); setTeachers([])
      supabase.from('batches').select('id, name, academic_year').eq('program_id', form.program_id).order('name').then(({ data }) => setBatches(data || []))
    }
  }, [form.program_id])

  useEffect(() => {
    if (form.batch_id && form.semester) {
      setForm(f => ({ ...f, subject_id: '', teacher_id: '' }))
      setSubjects([]); setTeachers([])
      supabase.from('subjects').select('id, name, code').eq('batch_id', form.batch_id).eq('semester', parseInt(form.semester)).order('name').then(({ data }) => setSubjects(data || []))
    }
  }, [form.batch_id, form.semester])

  // Fetch only teachers assigned to that subject+batch
  useEffect(() => {
    if (form.subject_id && form.batch_id) {
      setForm(f => ({ ...f, teacher_id: '' }))
      setTeachers([])
      supabase
        .from('subject_teachers')
        .select('teachers(id, name)')
        .eq('subject_id', form.subject_id)
        .eq('batch_id', form.batch_id)
        .then(({ data }) => {
          const t = (data || []).map((d: any) => d.teachers).filter(Boolean)
          setTeachers(t)
        })
    }
  }, [form.subject_id])

  const fetchSchedules = async () => {
    const { data } = await supabase
      .from('class_schedules')
      .select('id, day_of_week, start_time, end_time, room, semester, batches(name), subjects(name, code), teachers(name)')
      .order('day_of_week').order('start_time')
    setSchedules((data as any) || [])
  }

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleCreate = async () => {
    setError(''); setSuccess('')
    const { batch_id, subject_id, teacher_id, day_of_week, start_time, end_time, semester } = form
    if (!batch_id || !subject_id || !teacher_id || !day_of_week || !start_time || !end_time || !semester)
      return setError('All fields except room are required.')
    if (start_time >= end_time) return setError('End time must be after start time.')

    setSaving(true)
    const { error: err } = await supabase.from('class_schedules').insert({
      batch_id, subject_id, teacher_id,
      semester: parseInt(semester),
      day_of_week, start_time, end_time,
      room: form.room.trim() || null
    })
    setSaving(false)
    if (err) return setError(err.message)
    setSuccess('Class schedule created!')
    setForm(f => ({ ...f, day_of_week: '', start_time: '', end_time: '', room: '' }))
    fetchSchedules()
    setTimeout(() => setSuccess(''), 4000)
  }

  const deleteSchedule = async (id: string) => {
    if (!confirm('Delete this schedule entry?')) return
    await supabase.from('class_schedules').delete().eq('id', id)
    fetchSchedules()
  }

  const formatTime = (t: string) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hr = parseInt(h)
    return `${hr > 12 ? hr - 12 : hr}:${m} ${hr >= 12 ? 'PM' : 'AM'}`
  }

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      <div className="relative bg-gradient-to-br from-[#faf8f3] to-[#f0ebe0] shadow-md overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(#666 1px, transparent 1px), linear-gradient(90deg, #666 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />
        <div className="relative max-w-6xl mx-auto px-8 py-10">
          <Button variant="ghost" onClick={() => router.push('/dashboards/admin/classes')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 px-0 hover:bg-transparent">
            <ArrowLeft className="h-4 w-4" /> Back to Classes
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 flex items-center justify-center shadow-lg">
              <CalendarDays className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Create Class Schedule</h1>
              <p className="text-gray-500 text-sm mt-1">Add class slots — only teachers assigned to the subject will appear</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <Card className="rounded-none shadow-sm border-gray-100">
          <CardHeader className="px-6 pt-6 pb-4">
            <CardTitle className="text-base font-bold text-gray-700">New Schedule Entry</CardTitle>
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
                <SelectContent><SelectItem value="none">Select School</SelectItem>{schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Program</Label>
              <Select value={form.program_id || 'none'} onValueChange={v => set('program_id', v === 'none' ? '' : v)} disabled={!form.school_id}>
                <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Select Program" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Select Program</SelectItem>{programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Batch *</Label>
                <Select value={form.batch_id || 'none'} onValueChange={v => set('batch_id', v === 'none' ? '' : v)} disabled={!form.program_id}>
                  <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Batch" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Select Batch</SelectItem>{batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Semester *</Label>
                <Select value={form.semester || 'none'} onValueChange={v => set('semester', v === 'none' ? '' : v)} disabled={!form.batch_id}>
                  <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Semester" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Select Semester</SelectItem>{SEMESTERS.map(s => <SelectItem key={s} value={String(s)}>Sem {s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Subject *</Label>
              <Select value={form.subject_id || 'none'} onValueChange={v => set('subject_id', v === 'none' ? '' : v)} disabled={!form.semester || subjects.length === 0}>
                <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder={subjects.length === 0 && form.semester ? 'No subjects found' : 'Select Subject'} /></SelectTrigger>
                <SelectContent><SelectItem value="none">Select Subject</SelectItem>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Teacher *
                <span className="text-gray-400 font-normal ml-1">(only assigned teachers shown)</span>
              </Label>
              <Select value={form.teacher_id || 'none'} onValueChange={v => set('teacher_id', v === 'none' ? '' : v)} disabled={!form.subject_id || teachers.length === 0}>
                <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder={teachers.length === 0 && form.subject_id ? 'No teacher assigned to this subject' : 'Select Teacher'} /></SelectTrigger>
                <SelectContent><SelectItem value="none">Select Teacher</SelectItem>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
              {form.subject_id && teachers.length === 0 && (
                <p className="text-xs text-orange-500 mt-1">Assign a teacher to this subject first.</p>
              )}
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Day *</Label>
              <Select value={form.day_of_week || 'none'} onValueChange={v => set('day_of_week', v === 'none' ? '' : v)}>
                <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Day of Week" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Select Day</SelectItem>{DAYS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Start Time *</Label>
                <Input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className="rounded-none border-gray-200 focus-visible:ring-indigo-400" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">End Time *</Label>
                <Input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className="rounded-none border-gray-200 focus-visible:ring-indigo-400" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Room</Label>
                <Input value={form.room} onChange={e => set('room', e.target.value)} placeholder="e.g. A101" className="rounded-none border-gray-200 focus-visible:ring-indigo-400" />
              </div>
            </div>

            <Button onClick={handleCreate} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-none font-semibold">
              {saving ? 'Creating...' : 'Create Schedule Entry'}
            </Button>
          </CardContent>
        </Card>

        {/* Recent Schedules */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">All Schedule Entries
            <span className="ml-2 text-sm font-normal text-gray-400">({schedules.length})</span>
          </h2>
          {schedules.length === 0 ? (
            <Card className="rounded-none shadow-sm border-gray-100">
              <CardContent className="p-8 text-center text-gray-400 text-sm">No schedules yet.</CardContent>
            </Card>
          ) : (
            <div className="space-y-2 max-h-[650px] overflow-y-auto">
              {schedules.map(s => (
                <Card key={s.id} className="rounded-none shadow-sm border-gray-100 p-0">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-start gap-3">
                      <Badge variant="outline" className={`text-xs flex-shrink-0 mt-0.5 ${DAY_COLORS[s.day_of_week] || ''}`}>
                        {s.day_of_week.slice(0, 3)}
                      </Badge>
                      <div>
                        <div className="font-semibold text-gray-800 text-sm">{(s.subjects as any)?.name}
                          {(s.subjects as any)?.code && <span className="ml-1 text-gray-400 font-normal text-xs">({(s.subjects as any)?.code})</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {(s.batches as any)?.name} · Sem {s.semester} · {formatTime(s.start_time)}–{formatTime(s.end_time)}
                          {s.room && ` · Room ${s.room}`}
                        </div>
                        <div className="text-xs text-gray-400">{(s.teachers as any)?.name}</div>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deleteSchedule(s.id)}
                      className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-500 flex-shrink-0">
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
