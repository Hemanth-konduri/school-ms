'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, AlertTriangle, Plus, Trash2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'

interface School { id: string; name: string }
interface AcademicYear { id: string; name: string }
interface Batch { id: string; name: string }
interface Exception {
  id: string; start_date: string; end_date: string
  exception_type: string; title: string; description: string | null
  schools: { name: string } | null
  batches: { name: string } | null
  academic_years: { name: string } | null
}

const EXCEPTION_TYPES = ['holiday','exam_period','break','special_event','other']
const TYPE_COLORS: Record<string, string> = {
  holiday: 'bg-red-50 text-red-700 border-red-200',
  exam_period: 'bg-orange-50 text-orange-700 border-orange-200',
  break: 'bg-blue-50 text-blue-700 border-blue-200',
  special_event: 'bg-purple-50 text-purple-700 border-purple-200',
  other: 'bg-gray-50 text-gray-700 border-gray-200',
}
const TYPE_BAR: Record<string, string> = {
  holiday: 'bg-red-400', exam_period: 'bg-orange-400', break: 'bg-blue-400',
  special_event: 'bg-purple-400', other: 'bg-gray-400'
}

export default function ExceptionsPage() {
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>([])
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [exceptions, setExceptions] = useState<Exception[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    school_id: '', academic_year_id: '', batch_id: '',
    start_date: '', end_date: '', exception_type: 'holiday',
    title: '', description: ''
  })

  useEffect(() => {
    supabase.from('schools').select('id, name').order('name').then(({ data }) => setSchools(data || []))
    supabase.from('academic_years').select('id, name').order('name').then(({ data }) => setAcademicYears(data || []))
    supabase.from('batches').select('id, name').order('name').then(({ data }) => setBatches(data || []))
    fetchExceptions()
  }, [])

  const fetchExceptions = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('timetable_exceptions')
      .select('id, start_date, end_date, exception_type, title, description, schools(name), batches(name), academic_years(name)')
      .order('start_date', { ascending: false })
    setExceptions((data as any) || [])
    setLoading(false)
  }

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSave = async () => {
    setError('')
    if (!form.title.trim() || !form.start_date || !form.end_date || !form.exception_type)
      return setError('Title, type, and dates are required.')
    if (form.start_date > form.end_date) return setError('End date must be on or after start date.')
    setSaving(true)
    const { error: err } = await supabase.from('timetable_exceptions').insert({
      title: form.title.trim(),
      exception_type: form.exception_type,
      start_date: form.start_date,
      end_date: form.end_date,
      description: form.description.trim() || null,
      school_id: form.school_id || null,
      batch_id: form.batch_id || null,
      academic_year_id: form.academic_year_id || null,
    })
    setSaving(false)
    if (err) return setError(err.message)
    setSuccess('Exception added! Timetable events on these dates will be excluded.')
    setTimeout(() => setSuccess(''), 5000)
    setDialogOpen(false)
    setForm({ school_id: '', academic_year_id: '', batch_id: '', start_date: '', end_date: '', exception_type: 'holiday', title: '', description: '' })
    fetchExceptions()
  }

  const deleteException = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return
    await supabase.from('timetable_exceptions').delete().eq('id', id)
    fetchExceptions()
  }

  // Group by type
  const grouped = exceptions.reduce((acc, e) => {
    if (!acc[e.exception_type]) acc[e.exception_type] = []
    acc[e.exception_type].push(e)
    return acc
  }, {} as Record<string, Exception[]>)

  const dayCount = (s: string, e: string) => {
    const diff = new Date(e).getTime() - new Date(s).getTime()
    return Math.ceil(diff / (1000*60*60*24)) + 1
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
              <div className="w-14 h-14 bg-orange-500 flex items-center justify-center shadow-lg">
                <AlertTriangle className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Holidays & Exceptions</h1>
                <p className="text-gray-500 text-sm mt-1">Mark holidays, exam periods, and breaks — auto-excluded from timetables</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {success && <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-xs flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {success}</div>}
              <Button onClick={() => { setError(''); setDialogOpen(true) }} className="bg-orange-500 hover:bg-orange-600 text-white rounded-none font-semibold">
                <Plus className="h-4 w-4 mr-2" /> Add Exception
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : exceptions.length === 0 ? (
          <Card className="rounded-none shadow-sm border-gray-100">
            <CardContent className="p-16 text-center">
              <AlertTriangle className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No exceptions defined yet</p>
              <p className="text-gray-400 text-sm mt-1">Add holidays, exam periods, or semester breaks.</p>
              <Button onClick={() => setDialogOpen(true)} className="mt-4 bg-orange-500 hover:bg-orange-600 text-white rounded-none font-semibold">
                <Plus className="h-4 w-4 mr-2" /> Add First Exception
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {EXCEPTION_TYPES.filter(t => grouped[t]?.length > 0).map(type => (
              <div key={type}>
                <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wider flex items-center gap-2">
                  <div className={`w-2 h-2 ${TYPE_BAR[type]}`} />
                  {type.replace('_', ' ')}
                  <span className="text-gray-400 font-normal normal-case">({grouped[type].length})</span>
                </h3>
                <div className="space-y-2">
                  {grouped[type].map(ex => (
                    <Card key={ex.id} className="rounded-none shadow-sm border-gray-100 p-0">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-1.5 h-12 flex-shrink-0 ${TYPE_BAR[ex.exception_type]}`} />
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-semibold text-gray-800">{ex.title}</span>
                              <Badge variant="outline" className={`text-xs ${TYPE_COLORS[ex.exception_type]}`}>
                                {ex.exception_type.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-gray-400">{dayCount(ex.start_date, ex.end_date)} day{dayCount(ex.start_date, ex.end_date) > 1 ? 's' : ''}</span>
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                              <span>📅 {new Date(ex.start_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}
                                {ex.start_date !== ex.end_date && ` → ${new Date(ex.end_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}`}
                              </span>
                              {(ex.schools as any)?.name && <span>🏫 {(ex.schools as any)?.name}</span>}
                              {(ex.batches as any)?.name && <span>👥 {(ex.batches as any)?.name}</span>}
                              {!(ex.batches as any)?.name && <span className="text-orange-500">⚠ Applies to all batches</span>}
                            </div>
                            {ex.description && <p className="text-xs text-gray-400 mt-0.5">{ex.description}</p>}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => deleteException(ex.id, ex.title)}
                          className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-500">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-none max-w-md">
          <DialogHeader>
            <DialogTitle>Add Holiday / Exception</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Title * (e.g. Diwali Holiday)</Label>
              <Input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Holiday / Event name" className="rounded-none border-gray-200 focus-visible:ring-orange-400" />
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Type *</Label>
              <Select value={form.exception_type} onValueChange={v => set('exception_type', v)}>
                <SelectTrigger className="rounded-none border-gray-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EXCEPTION_TYPES.map(t => <SelectItem key={t} value={t}>{t.replace('_',' ').replace(/\b\w/g, l => l.toUpperCase())}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Start Date *</Label>
                <Input type="date" value={form.start_date} onChange={e => set('start_date', e.target.value)} className="rounded-none border-gray-200 focus-visible:ring-orange-400" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">End Date *</Label>
                <Input type="date" value={form.end_date} onChange={e => set('end_date', e.target.value)} className="rounded-none border-gray-200 focus-visible:ring-orange-400" />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Academic Year (optional)</Label>
              <Select value={form.academic_year_id || 'all'} onValueChange={v => set('academic_year_id', v === 'all' ? '' : v)}>
                <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="All Years" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Academic Years</SelectItem>
                  {academicYears.map(y => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">School (optional)</Label>
              <Select value={form.school_id || 'all'} onValueChange={v => set('school_id', v === 'all' ? '' : v)}>
                <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="All Schools" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Batch (optional — leave empty to apply to all)</Label>
              <Select value={form.batch_id || 'all'} onValueChange={v => set('batch_id', v === 'all' ? '' : v)}>
                <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="All Batches" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Description</Label>
              <Textarea value={form.description} onChange={e => set('description', e.target.value)}
                placeholder="Optional description..." rows={2} className="rounded-none border-gray-200 focus-visible:ring-orange-400 resize-none" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-none">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white rounded-none font-semibold">
              {saving ? 'Saving...' : 'Add Exception'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
