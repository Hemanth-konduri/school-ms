'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CalendarDays, Plus, Trash2, CheckCircle, Zap, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'

interface SemesterPlan {
  id: string; semester: number
  batches: { id: string; name: string } | null
  programs: { name: string } | null
  schools: { name: string } | null
  academic_years: { name: string } | null
}
interface Subject { id: string; name: string; code: string | null }
interface Teacher { id: string; name: string }
interface Template {
  id: string; day_of_week: number; start_time: string; end_time: string
  teacher_id?: string | null
  room: string | null; event_type: string; color: string; is_active: boolean
  subjects: { name: string; code: string | null } | null
  teachers: { name: string } | null
}

const DAYS = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
const SHORT_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
const EVENT_TYPES = ['lecture','practical','lab','seminar','tutorial','other']
const COLORS = ['#3B82F6','#10B981','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#EC4899','#6366F1']

const DAY_BG: Record<number, string> = {
  0: 'border-l-red-400', 1: 'border-l-blue-500', 2: 'border-l-green-500',
  3: 'border-l-violet-500', 4: 'border-l-orange-500', 5: 'border-l-pink-500', 6: 'border-l-teal-500'
}

export default function TimetableBuilderPage() {
  const router = useRouter()
  const [semesterPlans, setSemesterPlans] = useState<SemesterPlan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<SemesterPlan | null>(null)
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)
  const [conflicts, setConflicts] = useState<string[]>([])

  const [form, setForm] = useState({
    day_of_week: '', start_time: '', end_time: '',
    subject_id: '', teacher_id: '', room: '', building: '',
    event_type: 'lecture', color: '#3B82F6'
  })

  useEffect(() => {
    supabase.from('semester_plans')
      .select('id, semester, batches(id, name), programs(name), schools(name), academic_years(name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setSemesterPlans((data as any) || []))
    supabase.from('teachers').select('id, name').eq('is_active', true).order('name').then(({ data }) => setTeachers(data || []))
  }, [])

  useEffect(() => {
    if (selectedPlan) {
      const batchId = (selectedPlan.batches as any)?.id
      if (batchId) {
        supabase.from('subjects').select('id, name, code').eq('batch_id', batchId).eq('semester', selectedPlan.semester).order('name').then(({ data }) => setSubjects(data || []))
      }
      fetchTemplates(selectedPlan.id)
    }
  }, [selectedPlan])

  const fetchTemplates = async (planId: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('timetable_templates')
      .select('id, day_of_week, start_time, end_time, room, event_type, color, is_active, subjects(name, code), teachers(name)')
      .eq('semester_plan_id', planId)
      .eq('is_active', true)
      .order('day_of_week').order('start_time')
    setTemplates((data as any) || [])
    setLoading(false)
  }

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const openCreate = () => {
    setForm({ day_of_week: '', start_time: '', end_time: '', subject_id: '', teacher_id: '', room: '', building: '', event_type: 'lecture', color: '#3B82F6' })
    setError(''); setConflicts([])
    setDialogOpen(true)
  }

  const checkConflicts = async () => {
    if (!form.start_time || !form.end_time || !selectedPlan) return []
    const batchId = (selectedPlan.batches as any)?.id
    const plan = selectedPlan

    // Build a fake timestamp for conflict checking using plan start_date
    const conflictList: string[] = []

    // Check against existing templates for same batch + day + time overlap
    const sameDay = templates.filter(t => t.day_of_week === parseInt(form.day_of_week))
    for (const t of sameDay) {
      const existStart = t.start_time
      const existEnd = t.end_time
      const newStart = form.start_time + ':00'
      const newEnd = form.end_time + ':00'
      if (newStart < existEnd && newEnd > existStart) {
        if (t.teacher_id === form.teacher_id || (t as any).teacher_id === form.teacher_id) {
          conflictList.push(`Teacher conflict with ${(t.subjects as any)?.name} on ${DAYS[t.day_of_week]}`)
        }
        conflictList.push(`Batch time overlap with ${(t.subjects as any)?.name} (${t.start_time.slice(0,5)}–${t.end_time.slice(0,5)})`)
      }
    }
    return conflictList
  }

  const handleSave = async () => {
    setError(''); setConflicts([])
    if (!selectedPlan) return setError('Select a semester plan first.')
    if (!form.day_of_week || !form.start_time || !form.end_time || !form.subject_id || !form.teacher_id)
      return setError('Day, time, subject and teacher are required.')
    if (form.start_time >= form.end_time) return setError('End time must be after start time.')

    const found = await checkConflicts()
    if (found.length > 0) {
      setConflicts(found)
      return
    }

    setSaving(true)
    const batchId = (selectedPlan.batches as any)?.id
    const { error: err } = await supabase.from('timetable_templates').insert({
      semester_plan_id: selectedPlan.id,
      batch_id: batchId,
      subject_id: form.subject_id,
      teacher_id: form.teacher_id,
      semester: selectedPlan.semester,
      day_of_week: parseInt(form.day_of_week),
      start_time: form.start_time + ':00',
      end_time: form.end_time + ':00',
      room: form.room.trim() || null,
      building: form.building.trim() || null,
      event_type: form.event_type,
      color: form.color,
    })
    setSaving(false)
    if (err) return setError(err.message)
    setSuccess('Slot added!')
    setTimeout(() => setSuccess(''), 3000)
    setDialogOpen(false)
    fetchTemplates(selectedPlan.id)
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this slot? Existing generated events will also be removed.')) return
    await supabase.from('timetable_templates').update({ is_active: false }).eq('id', id)
    if (selectedPlan) fetchTemplates(selectedPlan.id)
  }

  const generateEvents = async () => {
    if (!selectedPlan) return
    setGenerating(true)
    let total = 0
    for (const t of templates) {
      const { data } = await supabase.rpc('generate_events_from_template', { p_template_id: t.id })
      total += data || 0
    }
    setGenerating(false)
    setSuccess(`Generated ${total} class events from ${templates.length} template slots!`)
    setTimeout(() => setSuccess(''), 5000)
  }

  // Group by day
  const byDay = templates.reduce((acc, t) => {
    if (!acc[t.day_of_week]) acc[t.day_of_week] = []
    acc[t.day_of_week].push(t)
    return acc
  }, {} as Record<number, Template[]>)

  const activeDays = Object.keys(byDay).map(Number).sort()

  const formatTime = (t: string) => {
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-600 flex items-center justify-center shadow-lg">
                <CalendarDays className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Weekly Template Builder</h1>
                <p className="text-gray-500 text-sm mt-1">Create repeating weekly schedule — auto-generates for entire semester</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {success && <div className="flex items-center gap-1 text-green-700 text-sm bg-green-50 px-3 py-2 border border-green-200"><CheckCircle className="h-4 w-4" /> {success}</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Semester Plan Selector */}
        <Card className="mb-6 rounded-none shadow-sm border-gray-100">
          <CardContent className="px-6 py-5">
            <Label className="text-xs font-semibold text-gray-600 mb-2 block">Select Semester Plan</Label>
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-md">
                <Select value={selectedPlan?.id || 'none'} onValueChange={v => {
                  if (v === 'none') { setSelectedPlan(null); setTemplates([]) }
                  else setSelectedPlan(semesterPlans.find(p => p.id === v) || null)
                }}>
                  <SelectTrigger className="rounded-none border-gray-200 bg-white">
                    <SelectValue placeholder="Select a semester plan to build timetable for..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select Semester Plan</SelectItem>
                    {semesterPlans.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {(p.batches as any)?.name} · Sem {p.semester} · {(p.academic_years as any)?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedPlan && (
                <>
                  <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-none font-semibold">
                    <Plus className="h-4 w-4 mr-2" /> Add Slot
                  </Button>
                  <Button onClick={generateEvents} disabled={generating || templates.length === 0}
                    variant="outline" className="rounded-none font-semibold border-green-300 text-green-700 hover:bg-green-50">
                    <Zap className="h-4 w-4 mr-2" />
                    {generating ? 'Generating...' : 'Generate All Events'}
                  </Button>
                </>
              )}
            </div>
            {selectedPlan && (
              <div className="flex gap-3 mt-3 text-xs text-gray-500">
                <span>📚 {(selectedPlan.batches as any)?.name}</span>
                <span>· Semester {selectedPlan.semester}</span>
                <span>· {(selectedPlan.programs as any)?.name}</span>
                <span>· {(selectedPlan.schools as any)?.name}</span>
                <span>· {(selectedPlan.academic_years as any)?.name}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Generate Events Explanation */}
        {selectedPlan && templates.length > 0 && (
          <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 text-xs text-indigo-700 flex items-start gap-2">
            <Zap className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <span>
              Click <strong>Generate All Events</strong> to create individual calendar events for each slot across the entire semester, 
              automatically skipping holidays and exceptions.
            </span>
          </div>
        )}

        {/* Template Grid */}
        {!selectedPlan ? (
          <Card className="rounded-none shadow-sm border-gray-100">
            <CardContent className="p-16 text-center">
              <CalendarDays className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Select a semester plan above to start building</p>
            </CardContent>
          </Card>
        ) : loading ? (
          <div className="text-center py-12 text-gray-400">Loading template...</div>
        ) : templates.length === 0 ? (
          <Card className="rounded-none shadow-sm border-gray-100">
            <CardContent className="p-16 text-center">
              <CalendarDays className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No slots defined yet</p>
              <Button onClick={openCreate} className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-none font-semibold">
                <Plus className="h-4 w-4 mr-2" /> Add First Slot
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeDays.map(dayNum => (
              <Card key={dayNum} className="rounded-none shadow-sm border-gray-100 overflow-hidden p-0">
                <div className="px-5 py-3 bg-indigo-600 flex items-center justify-between">
                  <h3 className="text-white font-bold text-sm">{DAYS[dayNum]}</h3>
                  <Badge className="bg-white/20 text-white border-0 text-xs">{byDay[dayNum].length} slots</Badge>
                </div>
                <div className="divide-y divide-gray-50">
                  {byDay[dayNum].sort((a,b) => a.start_time.localeCompare(b.start_time)).map(t => (
                    <div key={t.id} className={`p-4 border-l-4 ${DAY_BG[t.day_of_week]} flex items-start justify-between`}>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 mt-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: t.color || '#3B82F6' }} />
                        <div>
                          <div className="font-semibold text-gray-800 text-sm">{(t.subjects as any)?.name}</div>
                          {(t.subjects as any)?.code && <div className="text-xs text-gray-400 font-mono">{(t.subjects as any)?.code}</div>}
                          <div className="text-xs text-gray-500 mt-0.5">{formatTime(t.start_time)} – {formatTime(t.end_time)}</div>
                          <div className="flex gap-1 mt-1">
                            <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-600 bg-indigo-50">{t.event_type}</Badge>
                            {t.room && <Badge variant="secondary" className="text-xs">Room {t.room}</Badge>}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">{(t.teachers as any)?.name}</div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteTemplate(t.id)}
                        className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-500 flex-shrink-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add Slot Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-none max-w-md">
          <DialogHeader>
            <DialogTitle>Add Weekly Slot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
            {conflicts.length > 0 && (
              <div className="p-3 bg-orange-50 border border-orange-200 text-orange-700 text-sm space-y-1">
                <div className="flex items-center gap-1 font-semibold"><AlertTriangle className="h-4 w-4" /> Conflicts Detected</div>
                {conflicts.map((c, i) => <div key={i} className="text-xs">• {c}</div>)}
                <div className="text-xs mt-2 text-orange-600">Fix the conflicts or adjust the time slot.</div>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Day of Week *</Label>
              <Select value={form.day_of_week || 'none'} onValueChange={v => set('day_of_week', v === 'none' ? '' : v)}>
                <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Select Day" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select Day</SelectItem>
                  {DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Start Time *</Label>
                <Input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className="rounded-none border-gray-200 focus-visible:ring-indigo-400" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">End Time *</Label>
                <Input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className="rounded-none border-gray-200 focus-visible:ring-indigo-400" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Subject *</Label>
              <Select value={form.subject_id || 'none'} onValueChange={v => set('subject_id', v === 'none' ? '' : v)}>
                <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder={subjects.length === 0 ? 'No subjects for this semester' : 'Select Subject'} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select Subject</SelectItem>
                  {subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</SelectItem>)}
                </SelectContent>
              </Select>
              {subjects.length === 0 && <p className="text-xs text-orange-500 mt-1">Add subjects for this semester first.</p>}
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Teacher *</Label>
              <Select value={form.teacher_id || 'none'} onValueChange={v => set('teacher_id', v === 'none' ? '' : v)}>
                <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Select Teacher" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select Teacher</SelectItem>
                  {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Event Type</Label>
                <Select value={form.event_type} onValueChange={v => set('event_type', v)}>
                  <SelectTrigger className="rounded-none border-gray-200"><SelectValue /></SelectTrigger>
                  <SelectContent>{EVENT_TYPES.map(e => <SelectItem key={e} value={e}>{e.charAt(0).toUpperCase() + e.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Room</Label>
                <Input value={form.room} onChange={e => set('room', e.target.value)} placeholder="e.g. A101" className="rounded-none border-gray-200 focus-visible:ring-indigo-400" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-2 block">Color</Label>
              <div className="flex gap-2">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => set('color', c)}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-none">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-none font-semibold">
              {saving ? 'Adding...' : 'Add Slot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
