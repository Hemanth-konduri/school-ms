'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, LayoutList, GraduationCap, Layers, BookOpen,
  CheckCircle, ChevronLeft, ChevronRight, CalendarDays,
  Clock, MapPin, User, BookMarked
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, dateFnsLocalizer, Views, Navigate } from 'react-big-calendar'
import {
  format, parse, startOfWeek, getDay,
  addWeeks, subWeeks, addMonths, subMonths, addDays, subDays
} from 'date-fns'

// ─── Localizer ───────────────────────────────────────────────────────────────
const locales = { 'en-US': require('date-fns/locale/en-US') }
const localizer = dateFnsLocalizer({
  format, parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay, locales,
})

// ─── Types ────────────────────────────────────────────────────────────────────
interface Batch { id: string; name: string; academic_year: string }
interface Teacher { id: string; name: string }
interface CalendarEvent {
  id: string; title: string; start: Date; end: Date
  resource: {
    subject: string; subjectCode: string | null; teacher: string
    room: string | null; eventType: string; status: string
    color: string; semester: number; hasLesson: boolean
    lessonTopic: string | null; lessonStatus: string | null
  }
}

// ─── Color Maps ───────────────────────────────────────────────────────────────
const EVENT_TYPE_COLORS: Record<string, string> = {
  lecture: '#5B5EF4', practical: '#0EA5E9', lab: '#8B5CF6',
  seminar: '#F59E0B', tutorial: '#10B981', exam: '#EF4444', other: '#6B7280',
}
const STATUS_COLORS: Record<string, string> = {
  scheduled: '#5B5EF4', completed: '#10B981', cancelled: '#EF4444', rescheduled: '#F59E0B',
}
const LESSON_STATUS_BADGE: Record<string, string> = {
  planned: 'bg-blue-50 text-blue-600 border-blue-200',
  in_progress: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  skipped: 'bg-red-50 text-red-600 border-red-200',
}

// ─── Custom Week/Day Event ────────────────────────────────────────────────────
function WeekDayEvent({ event }: { event: CalendarEvent }) {
  const color = EVENT_TYPE_COLORS[event.resource.eventType] || event.resource.color
  return (
    <div
      className="h-full flex flex-col px-2 py-1 overflow-hidden"
      style={{ backgroundColor: color, borderLeft: `3px solid ${color}cc` }}
    >
      <div className="flex items-center gap-1">
        {event.resource.hasLesson && <div className="w-1.5 h-1.5 rounded-full bg-white/80 flex-shrink-0" />}
        <span className="text-white font-bold text-[11px] leading-tight truncate">{event.resource.subject}</span>
      </div>
      {event.resource.subjectCode && (
        <span className="text-white/70 text-[10px] font-mono">{event.resource.subjectCode}</span>
      )}
      <span className="text-white/80 text-[10px] truncate mt-0.5">👤 {event.resource.teacher}</span>
      {event.resource.room && (
        <span className="text-white/70 text-[10px]">📍 {event.resource.room}</span>
      )}
      {event.resource.lessonTopic && (
        <span className="text-white/80 text-[10px] truncate border-t border-white/20 mt-0.5 pt-0.5">
          📖 {event.resource.lessonTopic}
        </span>
      )}
    </div>
  )
}

// ─── Custom Month Event ───────────────────────────────────────────────────────
function MonthEvent({ event }: { event: CalendarEvent }) {
  const color = EVENT_TYPE_COLORS[event.resource.eventType] || event.resource.color
  return (
    <div
      className="flex items-center gap-1 px-1.5 py-0.5 text-[11px] font-bold text-white truncate"
      style={{ backgroundColor: color }}
    >
      <span className="truncate">{event.resource.subject}</span>
      {event.resource.hasLesson && <span className="text-white/60 text-[8px] flex-shrink-0">●</span>}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CalendarPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'batch' | 'teacher'>('batch')
  const [batches, setBatches] = useState<Batch[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedBatch, setSelectedBatch] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [currentView, setCurrentView] = useState<string>(Views.WEEK)

  // Dialogs
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [lessonOpen, setLessonOpen] = useState(false)
  const [lessonForm, setLessonForm] = useState({ topic_title: '', objective: '', notes: '', status: 'planned' })
  const [savingLesson, setSavingLesson] = useState(false)
  const [lessonSuccess, setLessonSuccess] = useState('')

  useEffect(() => {
    supabase.from('batches').select('id, name, academic_year').order('name').then(({ data }) => setBatches(data || []))
    supabase.from('teachers').select('id, name').eq('is_active', true).order('name').then(({ data }) => setTeachers(data || []))
  }, [])

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('timetable_events')
      .select(`id, start_time, end_time, room, event_type, status, semester,
        subjects(name, code), teachers(name),
        timetable_templates(color),
        lesson_topics(id, topic_title, status)`)
      .neq('status', 'cancelled').order('start_time')

    if (viewMode === 'batch' && selectedBatch) query = query.eq('batch_id', selectedBatch)
    else if (viewMode === 'teacher' && selectedTeacher) query = query.eq('teacher_id', selectedTeacher)
    else { setLoading(false); return }

    const { data } = await query
    if (!data) { setLoading(false); return }

    setEvents(data.map((e: any) => {
      const lesson = e.lesson_topics?.[0]
      return {
        id: e.id,
        title: e.subjects?.name || 'Class',
        start: new Date(e.start_time),
        end: new Date(e.end_time),
        resource: {
          subject: e.subjects?.name || '', subjectCode: e.subjects?.code || null,
          teacher: e.teachers?.name || '', room: e.room || null,
          eventType: e.event_type || 'lecture', status: e.status,
          color: e.timetable_templates?.color || EVENT_TYPE_COLORS[e.event_type] || '#5B5EF4',
          semester: e.semester, hasLesson: !!lesson,
          lessonTopic: lesson?.topic_title || null, lessonStatus: lesson?.status || null,
        }
      }
    }))
    setLoading(false)
  }, [viewMode, selectedBatch, selectedTeacher])

  // Navigate handler
  const handleNavigate = (action: string) => {
    if (action === Navigate.TODAY) { setCurrentDate(new Date()); return }
    const fwd = action === Navigate.NEXT
    setCurrentDate(d =>
      currentView === Views.WEEK ? (fwd ? addWeeks(d, 1) : subWeeks(d, 1)) :
      currentView === Views.MONTH ? (fwd ? addMonths(d, 1) : subMonths(d, 1)) :
      (fwd ? addDays(d, 1) : subDays(d, 1))
    )
  }

  // Toolbar label
  const toolbarLabel = () => {
    if (currentView === Views.WEEK) {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 })
      const we = new Date(ws.getTime() + 6 * 86400000)
      return `${format(ws, 'MMM d')} – ${format(we, 'MMM d, yyyy')}`
    }
    if (currentView === Views.DAY) return format(currentDate, 'EEEE, MMMM d, yyyy')
    return format(currentDate, 'MMMM yyyy')
  }

  const handleSelectEvent = (event: CalendarEvent) => { setSelectedEvent(event); setDetailOpen(true) }

  const openLessonEdit = async () => {
    if (!selectedEvent) return
    const { data } = await supabase.from('lesson_topics').select('topic_title, objective, notes, status')
      .eq('event_id', selectedEvent.id).maybeSingle()
    setLessonForm(data
      ? { topic_title: data.topic_title, objective: data.objective || '', notes: data.notes || '', status: data.status }
      : { topic_title: '', objective: '', notes: '', status: 'planned' })
    setDetailOpen(false)
    setLessonOpen(true)
  }

  const saveLessonTopic = async () => {
    if (!selectedEvent || !lessonForm.topic_title.trim()) return
    setSavingLesson(true)
    const { data: ex } = await supabase.from('lesson_topics').select('id').eq('event_id', selectedEvent.id).maybeSingle()
    const payload = {
      topic_title: lessonForm.topic_title.trim(),
      objective: lessonForm.objective.trim() || null,
      notes: lessonForm.notes.trim() || null,
      status: lessonForm.status,
      updated_at: new Date().toISOString()
    }
    if (ex) await supabase.from('lesson_topics').update(payload).eq('id', ex.id)
    else await supabase.from('lesson_topics').insert({ ...payload, event_id: selectedEvent.id })
    if (['completed', 'cancelled'].includes(lessonForm.status))
      await supabase.from('timetable_events').update({ status: lessonForm.status === 'completed' ? 'completed' : 'cancelled' }).eq('id', selectedEvent.id)
    setSavingLesson(false)
    setLessonSuccess('Saved!')
    setTimeout(() => setLessonSuccess(''), 3000)
    setLessonOpen(false)
    fetchEvents()
  }

  const canLoad = (viewMode === 'batch' && selectedBatch) || (viewMode === 'teacher' && selectedTeacher)

  return (
    <div className="min-h-screen bg-[#f5f1ea]">

      {/* ── Page Header ──────────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[#faf8f3] to-[#f0ebe0] shadow-md overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(#666 1px, transparent 1px), linear-gradient(90deg, #666 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />
        <div className="relative max-w-full px-8 py-8">
          <Button variant="ghost" onClick={() => router.push('/dashboards/admin/classes')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-5 px-0 hover:bg-transparent text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to Classes
          </Button>

          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Title */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-violet-600 flex items-center justify-center shadow-lg">
                <LayoutList className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Calendar Timetable</h1>
                <p className="text-gray-500 text-xs mt-0.5">Click any class to view details or add lesson topics</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Mode toggle */}
              <div className="flex border border-[#ddd8ce] overflow-hidden">
                {(['batch', 'teacher'] as const).map(m => (
                  <button key={m} onClick={() => { setViewMode(m); setEvents([]) }}
                    className={`px-3 py-2 text-xs font-bold flex items-center gap-1.5 transition-colors capitalize ${viewMode === m ? 'bg-violet-600 text-white' : 'bg-white text-gray-600 hover:bg-[#f0ebe0]'}`}>
                    {m === 'batch' ? <Layers className="h-3.5 w-3.5" /> : <GraduationCap className="h-3.5 w-3.5" />}
                    {m}
                  </button>
                ))}
              </div>

              {/* Selector */}
              {viewMode === 'batch' ? (
                <Select value={selectedBatch || 'none'} onValueChange={v => setSelectedBatch(v === 'none' ? '' : v)}>
                  <SelectTrigger className="rounded-none border-[#ddd8ce] bg-white w-52 text-sm h-9"><SelectValue placeholder="Select Batch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select Batch</SelectItem>
                    {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({b.academic_year})</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={selectedTeacher || 'none'} onValueChange={v => setSelectedTeacher(v === 'none' ? '' : v)}>
                  <SelectTrigger className="rounded-none border-[#ddd8ce] bg-white w-52 text-sm h-9"><SelectValue placeholder="Select Teacher" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select Teacher</SelectItem>
                    {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}

              <Button onClick={fetchEvents} disabled={loading || !canLoad}
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-none font-bold h-9 px-5 text-sm">
                {loading ? <><span className="animate-spin mr-1.5">↻</span>Loading</> : <><LayoutList className="h-4 w-4 mr-1.5" />Load Calendar</>}
              </Button>
            </div>
          </div>

          {/* Legend */}
          {events.length > 0 && (
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#ddd8ce]">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Event Types</span>
              {Object.entries(EVENT_TYPE_COLORS).slice(0, 5).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[11px] text-gray-500 font-semibold capitalize">{type}</span>
                </div>
              ))}
              <div className="ml-auto flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                <span className="text-[11px] text-gray-400">● = has lesson topic</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Calendar ──────────────────────────────────────────────────────────── */}
      <div className="px-6 py-5">
        <div className="border border-[#e5e0d8] bg-white shadow-sm overflow-hidden">

          {/* Injected Theme Styles */}
          <style>{`
            .rbc-calendar { font-family: inherit !important; background: #fff; }
            .rbc-toolbar { display: none !important; }

            /* Header row */
            .rbc-header {
              background: #faf8f3 !important;
              border-bottom: 2px solid #e8e2d8 !important;
              border-right: 1px solid #ede8df !important;
              padding: 9px 6px !important;
              font-size: 11px !important; font-weight: 800 !important;
              color: #6B7280 !important;
              text-transform: uppercase !important; letter-spacing: 0.07em !important;
            }
            .rbc-header.rbc-today { background: #ede9ff !important; color: #5B21B6 !important; }
            .rbc-header + .rbc-header { border-left: 1px solid #ede8df !important; }

            /* Time gutter */
            .rbc-label {
              font-size: 10px !important; font-weight: 700 !important;
              color: #9CA3AF !important; padding: 0 10px !important;
              text-transform: uppercase !important; letter-spacing: 0.03em !important;
            }

            /* Grid lines */
            .rbc-timeslot-group {
              border-bottom: 1px solid #f0ebe0 !important;
              min-height: 56px !important;
            }
            .rbc-time-slot { border-top: 1px dashed #f5f1ea !important; }
            .rbc-day-slot .rbc-time-slot { border-top: 1px dashed #eee8df !important; }
            .rbc-time-content > * + * > * { border-left: 1px solid #ede8df !important; }
            .rbc-time-content { border-top: 2px solid #e8e2d8 !important; }
            .rbc-time-view .rbc-row { border: none !important; }

            /* Today highlight */
            .rbc-today { background: #f5f3ff !important; }
            
            /* Non-working hour dim */
            .rbc-slot-selection { background: rgba(91,94,244,0.15) !important; }

            /* Events */
            .rbc-event {
              border-radius: 0 !important; border: none !important; padding: 0 !important;
              box-shadow: 1px 2px 4px rgba(0,0,0,0.12) !important;
            }
            .rbc-event.rbc-selected { box-shadow: 0 0 0 2px #7C3AED, 1px 2px 4px rgba(0,0,0,0.12) !important; }
            .rbc-event-content { height: 100% !important; }
            .rbc-event-label { display: none !important; }
            .rbc-event:focus { outline: none !important; }

            /* Month view */
            .rbc-month-view { border: none !important; }
            .rbc-month-row { border-top: 1px solid #ede8df !important; overflow: visible !important; }
            .rbc-month-row + .rbc-month-row { border-top: 1px solid #ede8df !important; }
            .rbc-day-bg + .rbc-day-bg { border-left: 1px solid #ede8df !important; }
            .rbc-date-cell {
              padding: 5px 8px !important; font-size: 11px !important;
              font-weight: 700 !important; color: #9CA3AF !important; text-align: right !important;
            }
            .rbc-date-cell.rbc-now a {
              background: #7C3AED !important; color: white !important;
              padding: 1px 5px !important; font-weight: 900 !important;
            }
            .rbc-off-range-bg { background: #faf9f7 !important; }
            .rbc-off-range .rbc-date-cell { color: #D1D5DB !important; }
            .rbc-month-header { background: #faf8f3 !important; }
            .rbc-row-bg .rbc-today { background: #f3f0ff !important; }

            /* Agenda */
            .rbc-agenda-view table { border: none !important; }
            .rbc-agenda-date-cell, .rbc-agenda-time-cell {
              font-size: 11px !important; font-weight: 700 !important; color: #6B7280 !important;
              padding: 10px 12px !important; background: #faf8f3 !important;
              border-bottom: 1px solid #ede8df !important;
            }
            .rbc-agenda-event-cell {
              padding: 10px 12px !important; border-bottom: 1px solid #ede8df !important; font-size: 12px !important;
            }
            .rbc-agenda-table thead > tr > th {
              background: #faf8f3 !important; border-bottom: 2px solid #e8e2d8 !important;
              font-size: 10px !important; font-weight: 800 !important;
              text-transform: uppercase !important; letter-spacing: 0.06em !important;
              color: #9CA3AF !important; padding: 8px 12px !important;
            }

            /* Current time line */
            .rbc-current-time-indicator { background: #7C3AED !important; height: 2px !important; z-index: 10 !important; }

            /* Show more */
            .rbc-show-more { color: #7C3AED !important; font-size: 10px !important; font-weight: 800 !important; background: transparent !important; }

            /* Scrollbar */
            .rbc-time-content::-webkit-scrollbar { width: 4px; }
            .rbc-time-content::-webkit-scrollbar-track { background: #f5f1ea; }
            .rbc-time-content::-webkit-scrollbar-thumb { background: #d5cfc5; }
          `}</style>

          {/* ── Custom Toolbar ──────────────────────────────────────────────── */}
          <div className="flex items-center justify-between px-5 py-3 border-b-2 border-[#e8e2d8] bg-[#faf8f3]">
            {/* Left: nav */}
            <div className="flex items-center gap-1">
              <button onClick={() => handleNavigate(Navigate.TODAY)}
                className="px-3 py-1.5 text-xs font-bold text-gray-600 bg-white border border-[#ddd8ce] hover:bg-[#f0ebe0] transition-colors">
                Today
              </button>
              <button onClick={() => handleNavigate(Navigate.PREVIOUS)}
                className="p-1.5 text-gray-500 bg-white border border-[#ddd8ce] hover:bg-[#f0ebe0] transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => handleNavigate(Navigate.NEXT)}
                className="p-1.5 text-gray-500 bg-white border border-[#ddd8ce] hover:bg-[#f0ebe0] transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Center: date label */}
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-bold text-gray-800">{toolbarLabel()}</span>
              {events.length > 0 && (
                <span className="text-xs text-gray-400 ml-1">({events.length} classes)</span>
              )}
            </div>

            {/* Right: view switcher */}
            <div className="flex border border-[#ddd8ce] overflow-hidden">
              {[
                { key: Views.MONTH, label: 'Month' },
                { key: Views.WEEK, label: 'Week' },
                { key: Views.DAY, label: 'Day' },
                { key: Views.AGENDA, label: 'Agenda' },
              ].map(v => (
                <button key={v.key} onClick={() => setCurrentView(v.key)}
                  className={`px-3 py-1.5 text-xs font-bold transition-colors border-r border-[#ddd8ce] last:border-r-0 ${currentView === v.key ? 'bg-violet-600 text-white' : 'bg-white text-gray-600 hover:bg-[#f0ebe0]'}`}>
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── Calendar Body ───────────────────────────────────────────────── */}
          {events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="w-16 h-16 bg-[#f0ebe0] flex items-center justify-center mb-4">
                <CalendarDays className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-semibold">No events to display</p>
              <p className="text-gray-400 text-sm mt-1 text-center max-w-xs">
                Select a {viewMode === 'batch' ? 'batch' : 'teacher'} and click Load Calendar.
                Make sure you've run <strong>Generate All Events</strong> in the Template Builder.
              </p>
            </div>
          ) : (
            <div style={{ height: '720px' }}>
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                view={currentView as any}
                onView={(v: any) => setCurrentView(v)}
                date={currentDate}
                onNavigate={setCurrentDate}
                onSelectEvent={handleSelectEvent}
                scrollToTime={new Date(1970, 1, 1, 8, 0)}
                min={new Date(1970, 1, 1, 7, 0)}
                max={new Date(1970, 1, 1, 20, 0)}
                step={30}
                timeslots={2}
                eventPropGetter={(event: CalendarEvent) => ({
                  style: {
                    backgroundColor: EVENT_TYPE_COLORS[event.resource.eventType] || event.resource.color,
                    border: 'none', borderRadius: '0px', padding: '0px',
                    boxShadow: '1px 2px 4px rgba(0,0,0,0.10)',
                  }
                })}
                dayPropGetter={(date: Date) => {
                  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                  const day = date.getDay()
                  if (isToday) return { style: { backgroundColor: '#f5f3ff' } }
                  if (day === 0 || day === 6) return { style: { backgroundColor: '#fdfcfa' } }
                  return {}
                }}
                components={{
                  toolbar: () => null,
                  event: (props: any) =>
                    currentView === Views.MONTH
                      ? <MonthEvent {...props} />
                      : <WeekDayEvent {...props} />,
                }}
                formats={{
                  timeGutterFormat: (date: Date) => format(date, 'h aa'),
                  dayFormat: (date: Date) => format(date, 'EEE d'),
                  weekdayFormat: (date: Date) => format(date, 'EEE'),
                  monthHeaderFormat: (date: Date) => format(date, 'MMMM yyyy'),
                  dayHeaderFormat: (date: Date) => format(date, 'EEEE, MMMM d'),
                  agendaDateFormat: (date: Date) => format(date, 'EEE MMM d'),
                  agendaTimeFormat: (date: Date) => format(date, 'h:mm a'),
                  agendaTimeRangeFormat: ({ start, end }: any) =>
                    `${format(start, 'h:mm a')} – ${format(end, 'h:mm a')}`,
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Event Detail Dialog ───────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="rounded-none max-w-sm p-0 overflow-hidden gap-0">
          {selectedEvent && (
            <>
              {/* Color header */}
              <div className="px-5 py-4 text-white" style={{ backgroundColor: EVENT_TYPE_COLORS[selectedEvent.resource.eventType] || '#5B5EF4' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-base leading-tight">{selectedEvent.resource.subject}</div>
                    {selectedEvent.resource.subjectCode && (
                      <div className="text-white/70 text-xs font-mono mt-0.5">{selectedEvent.resource.subjectCode}</div>
                    )}
                  </div>
                  <div className="flex-shrink-0 bg-white/20 px-2 py-0.5 text-xs font-bold capitalize">
                    {selectedEvent.resource.eventType}
                  </div>
                </div>
              </div>

              {/* Details grid */}
              <div className="px-5 py-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Clock, label: 'Time', val: `${format(selectedEvent.start, 'h:mm a')} – ${format(selectedEvent.end, 'h:mm a')}` },
                    { icon: CalendarDays, label: 'Date', val: format(selectedEvent.start, 'dd MMM yyyy') },
                    { icon: User, label: 'Teacher', val: selectedEvent.resource.teacher },
                    ...(selectedEvent.resource.room ? [{ icon: MapPin, label: 'Room', val: selectedEvent.resource.room }] : []),
                  ].map(({ icon: Icon, label, val }) => (
                    <div key={label} className="flex items-start gap-2">
                      <Icon className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase">{label}</div>
                        <div className="text-xs font-semibold text-gray-700">{val}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status bar */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Status</span>
                  <div className="h-px flex-1 bg-gray-100" />
                  <div className="text-[11px] px-2 py-0.5 font-bold text-white capitalize" style={{ backgroundColor: STATUS_COLORS[selectedEvent.resource.status] || '#6B7280' }}>
                    {selectedEvent.resource.status}
                  </div>
                </div>

                {/* Lesson topic */}
                {selectedEvent.resource.lessonTopic ? (
                  <div className="p-3 bg-violet-50 border border-violet-100">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <BookMarked className="h-3.5 w-3.5 text-violet-500" />
                      <span className="text-[10px] font-bold text-violet-600 uppercase">Lesson Topic</span>
                      <div className={`ml-auto text-[10px] px-1.5 py-0.5 border font-bold capitalize ${LESSON_STATUS_BADGE[selectedEvent.resource.lessonStatus || 'planned']}`}>
                        {selectedEvent.resource.lessonStatus?.replace('_', ' ')}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-violet-800">{selectedEvent.resource.lessonTopic}</div>
                  </div>
                ) : (
                  <div className="p-3 border border-dashed border-gray-200 bg-gray-50 text-center">
                    <p className="text-xs text-gray-400">No lesson topic planned yet</p>
                  </div>
                )}
              </div>

              <div className="px-5 pb-4 flex gap-2">
                <Button variant="outline" onClick={() => setDetailOpen(false)} className="flex-1 rounded-none text-sm h-9">Close</Button>
                <Button onClick={openLessonEdit} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-none font-bold text-sm h-9">
                  <BookOpen className="h-4 w-4 mr-1.5" />
                  {selectedEvent.resource.hasLesson ? 'Edit Topic' : 'Add Topic'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Lesson Topic Dialog ───────────────────────────────────────────────── */}
      <Dialog open={lessonOpen} onOpenChange={setLessonOpen}>
        <DialogContent className="rounded-none max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-800 text-base">
              <BookMarked className="h-4 w-4 text-violet-600" /> Lesson Topic
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            {lessonSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
                <CheckCircle className="h-4 w-4" /> {lessonSuccess}
              </div>
            )}

            <div>
              <Label className="text-xs font-bold text-gray-600 mb-1.5 block">Topic Title *</Label>
              <Input value={lessonForm.topic_title} onChange={e => setLessonForm(f => ({ ...f, topic_title: e.target.value }))}
                placeholder="e.g. Introduction to Binary Trees"
                className="rounded-none border-gray-200 focus-visible:ring-violet-400" />
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-600 mb-1.5 block">Learning Objective</Label>
              <Textarea value={lessonForm.objective} onChange={e => setLessonForm(f => ({ ...f, objective: e.target.value }))}
                placeholder="Students will be able to..." rows={2}
                className="rounded-none border-gray-200 focus-visible:ring-violet-400 resize-none" />
            </div>
            <div>
              <Label className="text-xs font-bold text-gray-600 mb-1.5 block">Notes</Label>
              <Textarea value={lessonForm.notes} onChange={e => setLessonForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional notes..." rows={2}
                className="rounded-none border-gray-200 focus-visible:ring-violet-400 resize-none" />
            </div>

            <div>
              <Label className="text-xs font-bold text-gray-600 mb-2 block">Status</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { v: 'planned', label: 'Planned', sel: 'bg-blue-600 text-white border-blue-600', unsel: 'border-gray-200 text-gray-500 hover:border-blue-300' },
                  { v: 'in_progress', label: 'In Progress', sel: 'bg-yellow-500 text-white border-yellow-500', unsel: 'border-gray-200 text-gray-500 hover:border-yellow-300' },
                  { v: 'completed', label: 'Completed', sel: 'bg-green-600 text-white border-green-600', unsel: 'border-gray-200 text-gray-500 hover:border-green-300' },
                  { v: 'skipped', label: 'Skipped', sel: 'bg-red-500 text-white border-red-500', unsel: 'border-gray-200 text-gray-500 hover:border-red-300' },
                ].map(s => (
                  <button key={s.v} type="button" onClick={() => setLessonForm(f => ({ ...f, status: s.v }))}
                    className={`py-2 text-xs font-bold border-2 transition-all ${lessonForm.status === s.v ? s.sel : `bg-white ${s.unsel}`}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setLessonOpen(false)} className="rounded-none">Cancel</Button>
            <Button onClick={saveLessonTopic} disabled={savingLesson || !lessonForm.topic_title.trim()}
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-none font-bold">
              {savingLesson ? 'Saving...' : 'Save Lesson Topic'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
