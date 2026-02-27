'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CalendarRange, Plus, Trash2, CheckCircle, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'

interface School { id: string; name: string }
interface AcademicYear {
  id: string; name: string; start_date: string; end_date: string
  working_days: number[]; working_start_time: string; working_end_time: string
  is_active: boolean; schools: { name: string } | null
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function AcademicYearPage() {
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>([])
  const [years, setYears] = useState<AcademicYear[]>([])
  const [loading, setLoading] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<AcademicYear | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '', school_id: '', start_date: '', end_date: '',
    working_days: [1, 2, 3, 4, 5] as number[],
    working_start_time: '09:30', working_end_time: '16:15',
  })

  useEffect(() => {
    supabase.from('schools').select('id, name').order('name').then(({ data }) => setSchools(data || []))
    fetchYears()
  }, [])

  const fetchYears = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('academic_years')
      .select('id, name, start_date, end_date, working_days, working_start_time, working_end_time, is_active, schools(name)')
      .order('start_date', { ascending: false })
    setYears((data as any) || [])
    setLoading(false)
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', school_id: '', start_date: '', end_date: '', working_days: [1,2,3,4,5], working_start_time: '09:30', working_end_time: '16:15' })
    setError(''); setDialogOpen(true)
  }

  const openEdit = (y: AcademicYear) => {
    setEditing(y)
    setForm({
      name: y.name, school_id: (y.schools as any)?.id || '',
      start_date: y.start_date, end_date: y.end_date,
      working_days: y.working_days || [1,2,3,4,5],
      working_start_time: y.working_start_time?.slice(0,5) || '09:30',
      working_end_time: y.working_end_time?.slice(0,5) || '16:15',
    })
    setError(''); setDialogOpen(true)
  }

  const toggleDay = (d: number) => {
    setForm(f => ({
      ...f,
      working_days: f.working_days.includes(d)
        ? f.working_days.filter(x => x !== d)
        : [...f.working_days, d].sort()
    }))
  }

  const handleSave = async () => {
    setError('')
    if (!form.name.trim() || !form.school_id || !form.start_date || !form.end_date)
      return setError('Name, school, start date and end date are required.')
    if (form.start_date >= form.end_date) return setError('End date must be after start date.')
    if (form.working_days.length === 0) return setError('Select at least one working day.')
    setSaving(true)
    const payload = {
      name: form.name.trim(), school_id: form.school_id,
      start_date: form.start_date, end_date: form.end_date,
      working_days: form.working_days,
      working_start_time: form.working_start_time + ':00',
      working_end_time: form.working_end_time + ':00',
    }
    const { error: err } = editing
      ? await supabase.from('academic_years').update(payload).eq('id', editing.id)
      : await supabase.from('academic_years').insert(payload)
    setSaving(false)
    if (err) return setError(err.message)
    setSuccess(editing ? 'Updated!' : 'Academic year created!')
    setTimeout(() => setSuccess(''), 3000)
    setDialogOpen(false)
    fetchYears()
  }

  const toggleActive = async (id: string, val: boolean) => {
    await supabase.from('academic_years').update({ is_active: !val }).eq('id', id)
    fetchYears()
  }

  const deleteYear = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will remove all semester plans and timetables linked to it.`)) return
    await supabase.from('academic_years').delete().eq('id', id)
    fetchYears()
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
              <div className="w-14 h-14 bg-blue-600 flex items-center justify-center shadow-lg">
                <CalendarRange className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Academic Year Setup</h1>
                <p className="text-gray-500 text-sm mt-1">Foundation calendar — defines the academic year structure</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {success && <div className="flex items-center gap-1 text-green-700 text-sm font-medium bg-green-50 px-3 py-2 border border-green-200"><CheckCircle className="h-4 w-4" /> {success}</div>}
              <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white rounded-none font-semibold">
                <Plus className="h-4 w-4 mr-2" /> New Academic Year
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Loading...</div>
        ) : years.length === 0 ? (
          <Card className="rounded-none shadow-sm border-gray-100">
            <CardContent className="p-16 text-center">
              <CalendarRange className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No academic years defined yet</p>
              <Button onClick={openCreate} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-none font-semibold">
                <Plus className="h-4 w-4 mr-2" /> Create First Academic Year
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {years.map(y => (
              <Card key={y.id} className="rounded-none shadow-sm border-gray-100 p-0">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-2 h-16 flex-shrink-0 mt-0.5 ${y.is_active ? 'bg-blue-500' : 'bg-gray-300'}`} />
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-lg font-bold text-gray-800">{y.name}</h3>
                          <Badge variant="outline" className={y.is_active ? 'border-green-200 text-green-700 bg-green-50' : 'border-gray-200 text-gray-400'}>
                            {y.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                          {(y.schools as any)?.name && (
                            <Badge variant="secondary" className="text-xs">{(y.schools as any)?.name}</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-4 text-xs text-gray-500 mb-2">
                          <span>📅 {new Date(y.start_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })} → {new Date(y.end_date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })}</span>
                          <span>⏰ {y.working_start_time?.slice(0,5)} – {y.working_end_time?.slice(0,5)}</span>
                        </div>
                        <div className="flex gap-1">
                          {DAY_LABELS.map((d, i) => (
                            <span key={i} className={`text-xs px-1.5 py-0.5 font-semibold ${y.working_days?.includes(i) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-300'}`}>{d}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => toggleActive(y.id, y.is_active)}
                        className={`text-xs h-8 px-3 font-semibold ${y.is_active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}>
                        {y.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(y)}
                        className="h-8 w-8 p-0 hover:bg-blue-50 hover:text-blue-600">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteYear(y.id, y.name)}
                        className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-500">
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-none max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Academic Year' : 'New Academic Year'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Year Name * (e.g. 2025-26)</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="2025-26" className="rounded-none border-gray-200 focus-visible:ring-blue-400" />
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">School *</Label>
              <Select value={form.school_id || 'none'} onValueChange={v => setForm(f => ({ ...f, school_id: v === 'none' ? '' : v }))}>
                <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Select School" /></SelectTrigger>
                <SelectContent><SelectItem value="none">Select School</SelectItem>{schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Start Date *</Label>
                <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} className="rounded-none border-gray-200 focus-visible:ring-blue-400" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">End Date *</Label>
                <Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} className="rounded-none border-gray-200 focus-visible:ring-blue-400" />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-2 block">Working Days *</Label>
              <div className="flex gap-2">
                {DAY_LABELS.map((d, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i)}
                    className={`flex-1 py-1.5 text-xs font-semibold border transition-colors ${form.working_days.includes(i) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300'}`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">School Start Time</Label>
                <Input type="time" value={form.working_start_time} onChange={e => setForm(f => ({ ...f, working_start_time: e.target.value }))} className="rounded-none border-gray-200 focus-visible:ring-blue-400" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">School End Time</Label>
                <Input type="time" value={form.working_end_time} onChange={e => setForm(f => ({ ...f, working_end_time: e.target.value }))} className="rounded-none border-gray-200 focus-visible:ring-blue-400" />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-none">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white rounded-none font-semibold">
              {saving ? 'Saving...' : editing ? 'Update' : 'Create Academic Year'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
