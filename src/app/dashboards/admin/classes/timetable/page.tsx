'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, LayoutList, GraduationCap, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'

interface Batch { id: string; name: string; academic_year: string }
interface Teacher { id: string; name: string }
interface Schedule {
  id: string; day_of_week: string; start_time: string; end_time: string
  room: string | null; semester: number
  subjects: { name: string; code: string | null } | null
  teachers: { name: string } | null
  batches: { name: string; academic_year: string } | null
}

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']

const DAY_BG: Record<string, string> = {
  Monday: 'border-l-blue-500',
  Tuesday: 'border-l-green-500',
  Wednesday: 'border-l-violet-500',
  Thursday: 'border-l-orange-500',
  Friday: 'border-l-pink-500',
  Saturday: 'border-l-teal-500',
  Sunday: 'border-l-red-500',
}

const DAY_HEADER: Record<string, string> = {
  Monday: 'bg-blue-600', Tuesday: 'bg-green-600', Wednesday: 'bg-violet-600',
  Thursday: 'bg-orange-500', Friday: 'bg-pink-600', Saturday: 'bg-teal-600', Sunday: 'bg-red-600',
}

const SEMESTERS = Array.from({ length: 12 }, (_, i) => i + 1)

export default function TimetablePage() {
  const router = useRouter()

  const [viewMode, setViewMode] = useState<'batch' | 'teacher'>('batch')
  const [batches, setBatches] = useState<Batch[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedBatch, setSelectedBatch] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [selectedSemester, setSelectedSemester] = useState('')
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('batches').select('id, name, academic_year').order('name').then(({ data }) => setBatches(data || []))
    supabase.from('teachers').select('id, name').eq('is_active', true).order('name').then(({ data }) => setTeachers(data || []))
  }, [])

  const fetchSchedules = async () => {
    setLoading(true)
    let query = supabase
      .from('class_schedules')
      .select('id, day_of_week, start_time, end_time, room, semester, subjects(name, code), teachers(name), batches(name, academic_year)')
      .order('start_time')

    if (viewMode === 'batch' && selectedBatch) {
      query = query.eq('batch_id', selectedBatch)
      if (selectedSemester) query = query.eq('semester', parseInt(selectedSemester))
    } else if (viewMode === 'teacher' && selectedTeacher) {
      query = query.eq('teacher_id', selectedTeacher)
    }

    const { data } = await query
    setSchedules((data as any) || [])
    setLoading(false)
  }

  // Group by day
  const byDay = DAYS.reduce((acc, day) => {
    acc[day] = schedules.filter(s => s.day_of_week === day).sort((a, b) => a.start_time.localeCompare(b.start_time))
    return acc
  }, {} as Record<string, Schedule[]>)

  const activeDays = DAYS.filter(d => byDay[d].length > 0)

  const formatTime = (t: string) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hr = parseInt(h)
    return `${hr > 12 ? hr - 12 : hr}:${m}${hr >= 12 ? 'PM' : 'AM'}`
  }

  const canFetch = (viewMode === 'batch' && selectedBatch) || (viewMode === 'teacher' && selectedTeacher)

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
              <div className="w-14 h-14 bg-pink-600 flex items-center justify-center shadow-lg">
                <LayoutList className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">View Timetable</h1>
                <p className="text-gray-500 text-sm mt-1">Batch-wise or teacher-wise weekly schedule</p>
              </div>
            </div>
            {/* Toggle */}
            <div className="flex bg-white shadow-sm border border-gray-100 overflow-hidden">
              <button
                onClick={() => { setViewMode('batch'); setSchedules([]) }}
                className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-colors ${viewMode === 'batch' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                <Layers className="h-4 w-4" /> Batch View
              </button>
              <button
                onClick={() => { setViewMode('teacher'); setSchedules([]) }}
                className={`px-4 py-2 text-sm font-semibold flex items-center gap-2 transition-colors ${viewMode === 'teacher' ? 'bg-indigo-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
                <GraduationCap className="h-4 w-4" /> Teacher View
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Filter */}
        <Card className="mb-8 rounded-none shadow-sm border-gray-100">
          <CardContent className="px-6 py-5">
            <div className="flex items-end gap-4 flex-wrap">
              {viewMode === 'batch' ? (
                <>
                  <div className="min-w-[200px]">
                    <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Select Batch *</Label>
                    <Select value={selectedBatch || 'none'} onValueChange={v => setSelectedBatch(v === 'none' ? '' : v)}>
                      <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Select Batch" /></SelectTrigger>
                      <SelectContent><SelectItem value="none">Select Batch</SelectItem>{batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({b.academic_year})</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="min-w-[160px]">
                    <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Semester (optional)</Label>
                    <Select value={selectedSemester || 'all'} onValueChange={v => setSelectedSemester(v === 'all' ? '' : v)}>
                      <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="All Semesters" /></SelectTrigger>
                      <SelectContent><SelectItem value="all">All Semesters</SelectItem>{SEMESTERS.map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="min-w-[220px]">
                  <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Select Teacher *</Label>
                  <Select value={selectedTeacher || 'none'} onValueChange={v => setSelectedTeacher(v === 'none' ? '' : v)}>
                    <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Select Teacher" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Select Teacher</SelectItem>{teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <Button onClick={fetchSchedules} disabled={!canFetch || loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-none font-semibold">
                {loading ? <span className="animate-spin mr-2">↻</span> : <LayoutList className="h-4 w-4 mr-2" />}
                Load Timetable
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Timetable Grid */}
        {schedules.length === 0 && !loading ? (
          <Card className="rounded-none shadow-sm border-gray-100">
            <CardContent className="p-16 text-center">
              <LayoutList className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No schedule found</p>
              <p className="text-gray-400 text-sm mt-1">Select a {viewMode === 'batch' ? 'batch' : 'teacher'} and click Load Timetable.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm text-gray-500">{schedules.length} class slot{schedules.length !== 1 ? 's' : ''} across {activeDays.length} day{activeDays.length !== 1 ? 's' : ''}</span>
            </div>

            {activeDays.map(day => (
              <Card key={day} className="rounded-none shadow-sm border-gray-100 overflow-hidden p-0">
                {/* Day Header */}
                <div className={`${DAY_HEADER[day]} px-6 py-3 flex items-center justify-between`}>
                  <h3 className="text-white font-bold">{day}</h3>
                  <Badge className="bg-white/20 text-white border-0 text-xs">{byDay[day].length} class{byDay[day].length !== 1 ? 'es' : ''}</Badge>
                </div>

                {/* Classes for this day */}
                <div className="divide-y divide-gray-50">
                  {byDay[day].map(slot => (
                    <div key={slot.id} className={`p-4 border-l-4 ${DAY_BG[slot.day_of_week]} flex items-center justify-between`}>
                      <div className="flex items-center gap-4">
                        {/* Time block */}
                        <div className="text-center min-w-[80px]">
                          <div className="text-sm font-bold text-gray-800">{formatTime(slot.start_time)}</div>
                          <div className="text-xs text-gray-400">to {formatTime(slot.end_time)}</div>
                        </div>
                        <div className="w-px h-10 bg-gray-200" />
                        {/* Subject + details */}
                        <div>
                          <div className="font-semibold text-gray-800 text-sm">
                            {(slot.subjects as any)?.name}
                            {(slot.subjects as any)?.code && (
                              <Badge variant="secondary" className="ml-2 text-xs font-mono font-normal">{(slot.subjects as any)?.code}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5 flex-wrap">
                            <span className="flex items-center gap-1">
                              <GraduationCap className="h-3 w-3" />
                              {(slot.teachers as any)?.name}
                            </span>
                            {viewMode === 'teacher' && (
                              <span className="flex items-center gap-1">
                                <Layers className="h-3 w-3" />
                                {(slot.batches as any)?.name}
                              </span>
                            )}
                            <Badge variant="outline" className="text-xs border-gray-200 text-gray-500">Sem {slot.semester}</Badge>
                            {slot.room && <span className="text-gray-400">Room {slot.room}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
