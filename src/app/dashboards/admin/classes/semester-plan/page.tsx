'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, BookOpen, Plus, Trash2, CheckCircle, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

interface AcademicYear { id: string; name: string }
interface School { id: string; name: string }
interface Program { id: string; name: string }
interface Batch { id: string; name: string; academic_year: string }
interface SemesterPlan {
  id: string; semester: number; start_date: string; end_date: string
  total_teaching_weeks: number | null; notes: string | null
  daily_start_time: string; daily_end_time: string
  academic_years: { name: string } | null
  batches: { name: string } | null
  programs: { name: string } | null
  schools: { name: string } | null
}

const SEMESTERS = Array.from({ length: 12 }, (_, i) => i + 1)
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function SemesterPlanPage() {
  const router = useRouter()
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [schools, setSchools] = useState<School[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [plans, setPlans] = useState<SemesterPlan[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SemesterPlan | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    academic_year_id: '', school_id: '', program_id: '', batch_id: '',
    semester: '', start_date: '', end_date: '', total_teaching_weeks: '',
    daily_start_time: '09:30', daily_end_time: '16:15',
    working_days: [1,2,3,4,5] as number[], notes: ''
  })

  // Cascades for form
  const [formPrograms, setFormPrograms] = useState<Program[]>([])
  const [formBatches, setFormBatches] = useState<Batch[]>([])

  useEffect(() => {
    supabase.from('academic_years').select('id, name').order('start_date', { ascending: false }).then(({ data }) => setAcademicYears(data || []))
    supabase.from('schools').select('id, name').order('name').then(({ data }) => setSchools(data || []))
    fetchPlans()
  }, [])

  useEffect(() => {
    if (form.school_id) {
      setForm(f => ({ ...f, program_id: '', batch_id: '' }))
      setFormPrograms([]); setFormBatches([])
      supabase.from('programs').select('id, name').eq('school_id', form.school_id).order('name').then(({ data }) => setFormPrograms(data || []))
    }
  }, [form.school_id])

  useEffect(() => {
    if (form.program_id) {
      setForm(f => ({ ...f, batch_id: '' }))
      setFormBatches([])
      supabase.from('batches').select('id, name, academic_year').eq('program_id', form.program_id).order('name').then(({ data }) => setFormBatches(data || []))
    }
  }, [form.program_id])

  const fetchPlans = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('semester_plans')
      .select('id, semester, start_date, end_date, total_teaching_weeks, notes, daily_start_time, daily_end_time, academic_years(name), batches(name), programs(name), schools(name)')
      .order('start_date', { ascending: false })
    setPlans((data as any) || [])
    setLoading(false)
  }

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))
  const toggleDay = (d: number) => setForm(f => ({ ...f, working_days: f.working_days.includes(d) ? f.working_days.filter(x => x !== d) : [...f.working_days, d].sort() }))

  const openCreate = () => {
    setEditing(null)
    setForm({ academic_year_id: '', school_id: '', program_id: '', batch_id: '', semester: '', start_date: '', end_date: '', total_teaching_weeks: '', daily_start_time: '09:30', daily_end_time: '16:15', working_days: [1,2,3,4,5], notes: '' })
    setFormPrograms([]); setFormBatches([])
    setError(''); setDialogOpen(true)
  }

  const handleSave = async () => {
    setError('')
    if (!form.academic_year_id || !form.batch_id || !form.semester || !form.start_date || !form.end_date)
      return setError('Academic year, batch, semester, and dates are required.')
    if (form.start_date >= form.end_date) return setError('End date must be after start date.')
    setSaving(true)
    const payload = {
      academic_year_id: form.academic_year_id,
      school_id: form.school_id || null,
      program_id: form.program_id || null,
      batch_id: form.batch_id,
      semester: parseInt(form.semester),
      start_date: form.start_date, end_date: form.end_date,
      total_teaching_weeks: form.total_teaching_weeks ? parseInt(form.total_teaching_weeks) : null,
      daily_start_time: form.daily_start_time + ':00',
      daily_end_time: form.daily_end_time + ':00',
      working_days: form.working_days,
      notes: form.notes.trim() || null,
    }
    const { error: err } = editing
      ? await supabase.from('semester_plans').update(payload).eq('id', editing.id)
      : await supabase.from('semester_plans').insert(payload)
    setSaving(false)
    if (err) return setError(err.message.includes('unique') ? 'This batch already has a plan for this semester and year.' : err.message)
    setSuccess(editing ? 'Updated!' : 'Semester plan created!')
    setTimeout(() => setSuccess(''), 3000)
    setDialogOpen(false)
    fetchPlans()
  }

  const deletePlan = async (id: string) => {
    if (!confirm('Delete this semester plan? Timetable templates linked to it will also be removed.')) return
    await supabase.from('semester_plans').delete().eq('id', id)
    fetchPlans()
  }

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      <div className="relative bg-gradient-to-br from-[#faf8f3] to-[#f0ebe0] shadow-md overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(#666 1px, transparent 1px), linear-gradient(90deg, #666 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />
        <div className="relative max-w-5xl mx-auto px-8 py-10">
          <Button variant="ghost" onClick={() => router.push('/dashboards/admin/classes')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 px-0 hover:bg-transparent">
            <ArrowLeft className="h-4 w-4" /> Back to Classes
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-teal-600 flex items-center justify-center shadow-lg">
                <BookOpen className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Semester Planning</h1>
                <p className="text-gray-500 text-sm mt-1">Define semester dates, weeks, and hours per batch</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {success && <div className="flex items-center gap-1 text-green-700 text-sm font-medium bg-green-50 px-3 py-2 border border-green-200"><CheckCircle className="h-4 w-4" /> {success}</div>}
              <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700 text-white rounded-none font-semibold">
                <Plus className="h-4 w-4 mr-2" /> New Semester Plan
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : plans.length === 0 ? (
          <Card className="rounded-none shadow-sm border-gray-100">
            <CardContent className="p-16 text-center">
              <BookOpen className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No semester plans yet</p>
              <p className="text-gray-400 text-sm mt-1">Create an academic year first, then add semester plans.</p>
              <Button onClick={openCreate} className="mt-4 bg-teal-600 hover:bg-teal-700 text-white rounded-none font-semibold">
                <Plus className="h-4 w-4 mr-2" /> Create Semester Plan
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {plans.map(p => (
              <Card key={p.id} className="rounded-none shadow-sm border-gray-100 p-0">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="w-2 h-14 bg-teal-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="font-bold text-gray-800">Semester {p.semester}</h3>
                          <Badge variant="outline" className="text-xs border-teal-200 text-teal-700 bg-teal-50">{(p.batches as any)?.name}</Badge>
                          <Badge variant="secondary" className="text-xs">{(p.academic_years as any)?.name}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                          <span>📅 {new Date(p.start_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })} → {new Date(p.end_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</span>
                          {p.total_teaching_weeks && <span>📚 {p.total_teaching_weeks} teaching weeks</span>}
                          <span>⏰ {p.daily_start_time?.slice(0,5)} – {p.daily_end_time?.slice(0,5)}</span>
                        </div>
                        {p.notes && <p className="text-xs text-gray-400 mt-1">{p.notes}</p>}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => deletePlan(p.id)}
                      className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-none max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Semester Plan' : 'New Semester Plan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Academic Year *</Label>
              <Select value={form.academic_year_id || 'none'} onValueChange={v => set('academic_year_id', v === 'none' ? '' : v)}>
                <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Select Academic Year" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Select Year</SelectItem>{academicYears.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

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
                <SelectContent><SelectItem value="none">Select Program</SelectItem>{formPrograms.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Batch *</Label>
                <Select value={form.batch_id || 'none'} onValueChange={v => set('batch_id', v === 'none' ? '' : v)} disabled={!form.program_id}>
                  <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Batch" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Select Batch</SelectItem>{formBatches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Semester *</Label>
                <Select value={form.semester || 'none'} onValueChange={v => set('semester', v === 'none' ? '' : v)}>
                  <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Semester" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Select</SelectItem>{SEMESTERS.map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Start Date *</Label>
                <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className="rounded-none border-gray-200 focus-visible:ring-teal-400" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">End Date *</Label>
                <Input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className="rounded-none border-gray-200 focus-visible:ring-teal-400" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Teaching Weeks</Label>
                <Input type="number" value={form.total_teaching_weeks} onChange={e => set('total_teaching_weeks', e.target.value)} placeholder="e.g. 18" className="rounded-none border-gray-200 focus-visible:ring-teal-400" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Start Time</Label>
                <Input type="time" value={form.daily_start_time} onChange={e => set('daily_start_time', e.target.value)} className="rounded-none border-gray-200 focus-visible:ring-teal-400" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">End Time</Label>
                <Input type="time" value={form.daily_end_time} onChange={e => set('daily_end_time', e.target.value)} className="rounded-none border-gray-200 focus-visible:ring-teal-400" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-2 block">Working Days</Label>
              <div className="flex gap-2">
                {DAY_LABELS.map((d, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i)}
                    className={`flex-1 py-1.5 text-xs font-semibold border transition-colors ${form.working_days.includes(i) ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-500 border-gray-200 hover:border-teal-300'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Notes</Label>
              <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Optional notes..." rows={2} className="rounded-none border-gray-200 focus-visible:ring-teal-400 resize-none" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-none">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white rounded-none font-semibold">
              {saving ? 'Saving...' : editing ? 'Update' : 'Create Semester Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
