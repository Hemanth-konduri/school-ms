'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, LayoutList, GraduationCap, Layers, BookOpen,
  CheckCircle, ChevronLeft, ChevronRight, CalendarDays,
  Clock, MapPin, User, BookMarked, X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays,
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameDay, isSameMonth, isToday,
  parseISO, getHours, getMinutes
} from 'date-fns'

// ─── Types ─────────────────────────────────────────────────────────────────
interface Batch { id: string; name: string; academic_year: string }
interface Teacher { id: string; name: string }
interface TEvent {
  id: string; start: Date; end: Date
  subject: string; subjectCode: string | null
  teacher: string; room: string | null
  eventType: string; status: string; color: string
  semester: number; hasLesson: boolean
  lessonTopic: string | null; lessonStatus: string | null
}

// ─── Constants ──────────────────────────────────────────────────────────────
const TYPE_COLORS: Record<string, string> = {
  lecture: '#5B5EF4', practical: '#0EA5E9', lab: '#8B5CF6',
  seminar: '#F59E0B', tutorial: '#10B981', exam: '#EF4444', other: '#6B7280',
}
const STATUS_COLORS: Record<string, string> = {
  scheduled: '#5B5EF4', completed: '#10B981', cancelled: '#EF4444', rescheduled: '#F59E0B',
}
const LESSON_BADGE: Record<string, string> = {
  planned: 'bg-blue-50 text-blue-600 border-blue-200',
  in_progress: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  skipped: 'bg-red-50 text-red-600 border-red-200',
}
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOURS = Array.from({ length: 14 }, (_, i) => i + 7) // 7 AM → 8 PM
const SLOT_HEIGHT = 64 // px per hour

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt = (d: Date, f: string) => format(d, f)
const timeToMinutes = (d: Date) => getHours(d) * 60 + getMinutes(d)
const startOfWeekMon = (d: Date) => startOfWeek(d, { weekStartsOn: 1 })
const endOfWeekMon = (d: Date) => endOfWeek(d, { weekStartsOn: 1 })

function eventTop(start: Date) {
  const mins = timeToMinutes(start) - 7 * 60
  return (mins / 60) * SLOT_HEIGHT
}
function eventHeight(start: Date, end: Date) {
  const mins = timeToMinutes(end) - timeToMinutes(start)
  return Math.max((mins / 60) * SLOT_HEIGHT, 28)
}

// ─── Event Card (compact) ───────────────────────────────────────────────────
function EventCard({ ev, onClick, compact = false }: { ev: TEvent; onClick: () => void; compact?: boolean }) {
  const bg = TYPE_COLORS[ev.eventType] || ev.color
  return (
    <div
      onClick={(e) => { e.stopPropagation(); onClick() }}
      className="cursor-pointer overflow-hidden select-none transition-all hover:brightness-110 active:scale-[0.98]"
      style={{
        backgroundColor: bg,
        borderLeft: `3px solid ${bg}bb`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }}
    >
      {compact ? (
        // Month compact pill
        <div className="px-1.5 py-0.5 flex items-center gap-1 min-w-0">
          <span className="text-white font-bold text-[11px] truncate leading-tight">{ev.subject}</span>
          {ev.hasLesson && <span className="text-white/60 text-[8px] flex-shrink-0">●</span>}
        </div>
      ) : (
        // Week / Day full card
        <div className="px-2 py-1.5 flex flex-col gap-0.5 min-w-0 h-full">
          <div className="flex items-start gap-1 min-w-0">
            {ev.hasLesson && <div className="w-1.5 h-1.5 rounded-full bg-white/80 flex-shrink-0 mt-0.5" />}
            <span className="text-white font-bold text-[12px] leading-tight truncate">{ev.subject}</span>
          </div>
          {ev.subjectCode && (
            <span className="text-white/65 text-[10px] font-mono leading-none">{ev.subjectCode}</span>
          )}
          <span className="text-white/80 text-[11px] leading-tight truncate">
            {fmt(ev.start, 'h:mm')}–{fmt(ev.end, 'h:mm a')}
          </span>
          <span className="text-white/70 text-[10px] truncate">👤 {ev.teacher}</span>
          {ev.room && <span className="text-white/60 text-[10px]">📍 {ev.room}</span>}
          {ev.lessonTopic && (
            <span className="text-white/80 text-[10px] truncate border-t border-white/20 pt-0.5 mt-0.5">
              📖 {ev.lessonTopic}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Month View ─────────────────────────────────────────────────────────────
function MonthView({ date, events, onEventClick }: { date: Date; events: TEvent[]; onEventClick: (e: TEvent) => void }) {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const calStart = startOfWeekMon(monthStart)
  const calEnd = endOfWeekMon(monthEnd)
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const eventsForDay = (d: Date) => events.filter(e => isSameDay(e.start, d))

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b-2 border-[#e8e2d8]">
        {DAYS_SHORT.map(d => (
          <div key={d} className="py-2.5 text-center text-[11px] font-black text-gray-500 uppercase tracking-wider bg-[#faf8f3] border-r border-[#ede8df] last:border-r-0">
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 flex-1" style={{ gridAutoRows: '1fr' }}>
        {days.map((day, idx) => {
          const dayEvents = eventsForDay(day)
          const today = isToday(day)
          const inMonth = isSameMonth(day, date)
          return (
            <div
              key={idx}
              className={`border-r border-b border-[#ede8df] last:border-r-0 flex flex-col min-h-[110px] ${
                !inMonth ? 'bg-[#faf9f7]' : today ? 'bg-[#f3f0ff]' : 'bg-white hover:bg-[#faf8f3]'
              } transition-colors`}
            >
              {/* Date number */}
              <div className="flex items-center justify-between px-2 pt-1.5 pb-1 flex-shrink-0">
                <div className={`text-[12px] font-bold w-6 h-6 flex items-center justify-center leading-none ${
                  today
                    ? 'bg-violet-600 text-white'
                    : inMonth ? 'text-gray-700' : 'text-gray-300'
                }`}>
                  {fmt(day, 'd')}
                </div>
                {dayEvents.length > 0 && (
                  <span className="text-[9px] text-gray-400 font-semibold">{dayEvents.length} class{dayEvents.length > 1 ? 'es' : ''}</span>
                )}
              </div>

              {/* Events */}
              <div className="flex flex-col gap-0.5 px-1 pb-1 flex-1 overflow-hidden">
                {dayEvents.slice(0, 3).map(ev => (
                  <EventCard key={ev.id} ev={ev} onClick={() => onEventClick(ev)} compact />
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-[10px] font-bold text-violet-600 px-1 cursor-pointer hover:underline">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Week View ───────────────────────────────────────────────────────────────
function WeekView({ date, events, onEventClick }: { date: Date; events: TEvent[]; onEventClick: (e: TEvent) => void }) {
  const weekStart = startOfWeekMon(date)
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const eventsForDay = (d: Date) => events.filter(e => isSameDay(e.start, d))

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Day header row */}
      <div className="flex border-b-2 border-[#e8e2d8] flex-shrink-0">
        {/* gutter */}
        <div className="w-14 flex-shrink-0 bg-[#faf8f3] border-r border-[#ede8df]" />
        {days.map((day, i) => {
          const today = isToday(day)
          return (
            <div
              key={i}
              className={`flex-1 py-2.5 text-center border-r border-[#ede8df] last:border-r-0 ${today ? 'bg-[#ede9ff]' : 'bg-[#faf8f3]'}`}
            >
              <div className={`text-[10px] font-black uppercase tracking-wider mb-0.5 ${today ? 'text-violet-600' : 'text-gray-400'}`}>
                {fmt(day, 'EEE')}
              </div>
              <div className={`text-[15px] font-black mx-auto w-8 h-8 flex items-center justify-center leading-none ${
                today ? 'bg-violet-600 text-white' : 'text-gray-700'
              }`}>
                {fmt(day, 'd')}
              </div>
            </div>
          )
        })}
      </div>

      {/* Scrollable time grid */}
      <div className="flex-1 overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
        <div className="flex" style={{ minHeight: `${SLOT_HEIGHT * HOURS.length}px` }}>
          {/* Time gutter */}
          <div className="w-14 flex-shrink-0 relative border-r border-[#ede8df] bg-[#faf8f3]">
            {HOURS.map(h => (
              <div key={h} style={{ height: SLOT_HEIGHT, top: (h - 7) * SLOT_HEIGHT }}
                className="absolute w-full flex items-start justify-end pr-2 pt-1">
                <span className="text-[9px] font-black text-gray-400 uppercase tracking-tight">
                  {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day, di) => {
            const dayEvs = eventsForDay(day)
            const today = isToday(day)
            return (
              <div
                key={di}
                className={`flex-1 relative border-r border-[#ede8df] last:border-r-0 ${today ? 'bg-[#f8f6ff]' : 'bg-white'}`}
                style={{ minHeight: `${SLOT_HEIGHT * HOURS.length}px` }}
              >
                {/* Hour lines */}
                {HOURS.map(h => (
                  <div key={h} style={{ top: (h - 7) * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                    className="absolute w-full border-t border-[#f0ebe0]">
                    <div className="w-full h-1/2 border-b border-dashed border-[#f5f1ea]" />
                  </div>
                ))}

                {/* Current time indicator */}
                {today && (() => {
                  const now = new Date()
                  const mins = timeToMinutes(now) - 7 * 60
                  if (mins < 0 || mins > HOURS.length * 60) return null
                  return (
                    <div className="absolute w-full z-20 flex items-center" style={{ top: (mins / 60) * SLOT_HEIGHT }}>
                      <div className="w-2 h-2 rounded-full bg-violet-600 -ml-1 flex-shrink-0" />
                      <div className="flex-1 h-0.5 bg-violet-600 opacity-60" />
                    </div>
                  )
                })()}

                {/* Events */}
                {dayEvs.map(ev => {
                  const top = eventTop(ev.start)
                  const height = eventHeight(ev.start, ev.end)
                  if (top < 0 || top > SLOT_HEIGHT * HOURS.length) return null
                  return (
                    <div
                      key={ev.id}
                      className="absolute w-[95%] left-[2.5%] z-10"
                      style={{ top, height }}
                    >
                      <EventCard ev={ev} onClick={() => onEventClick(ev)} />
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Day View ────────────────────────────────────────────────────────────────
function DayView({ date, events, onEventClick }: { date: Date; events: TEvent[]; onEventClick: (e: TEvent) => void }) {
  const dayEvs = events.filter(e => isSameDay(e.start, date))

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Day header */}
      <div className="flex border-b-2 border-[#e8e2d8] flex-shrink-0">
        <div className="w-16 flex-shrink-0 bg-[#faf8f3] border-r border-[#ede8df]" />
        <div className={`flex-1 py-3 text-center ${isToday(date) ? 'bg-[#ede9ff]' : 'bg-[#faf8f3]'}`}>
          <div className={`text-[11px] font-black uppercase tracking-wider mb-0.5 ${isToday(date) ? 'text-violet-600' : 'text-gray-400'}`}>
            {fmt(date, 'EEEE')}
          </div>
          <div className={`text-2xl font-black inline-flex items-center justify-center w-10 h-10 mx-auto ${
            isToday(date) ? 'bg-violet-600 text-white' : 'text-gray-700'
          }`}>
            {fmt(date, 'd')}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">{fmt(date, 'MMMM yyyy')}</div>
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex" style={{ minHeight: `${SLOT_HEIGHT * HOURS.length}px` }}>
          {/* Gutter */}
          <div className="w-16 flex-shrink-0 relative border-r border-[#ede8df] bg-[#faf8f3]">
            {HOURS.map(h => (
              <div key={h} style={{ height: SLOT_HEIGHT, top: (h - 7) * SLOT_HEIGHT }}
                className="absolute w-full flex items-start justify-end pr-3 pt-1">
                <span className="text-[10px] font-black text-gray-400 uppercase">
                  {h === 12 ? '12 PM' : h > 12 ? `${h - 12} PM` : `${h} AM`}
                </span>
              </div>
            ))}
          </div>

          {/* Events column */}
          <div className={`flex-1 relative ${isToday(date) ? 'bg-[#f8f6ff]' : 'bg-white'}`}
            style={{ minHeight: `${SLOT_HEIGHT * HOURS.length}px` }}>

            {/* Hour lines */}
            {HOURS.map(h => (
              <div key={h} style={{ top: (h - 7) * SLOT_HEIGHT, height: SLOT_HEIGHT }}
                className="absolute w-full border-t border-[#f0ebe0]">
                <div className="w-full h-1/2 border-b border-dashed border-[#f5f1ea]" />
              </div>
            ))}

            {/* Current time */}
            {isToday(date) && (() => {
              const now = new Date()
              const mins = timeToMinutes(now) - 7 * 60
              if (mins < 0 || mins > HOURS.length * 60) return null
              return (
                <div className="absolute w-full z-20 flex items-center" style={{ top: (mins / 60) * SLOT_HEIGHT }}>
                  <div className="w-2.5 h-2.5 rounded-full bg-violet-600 -ml-1.5 flex-shrink-0" />
                  <div className="flex-1 h-0.5 bg-violet-600" />
                </div>
              )
            })()}

            {/* Events */}
            {dayEvs.map(ev => {
              const top = eventTop(ev.start)
              const height = eventHeight(ev.start, ev.end)
              if (top < 0) return null
              return (
                <div key={ev.id} className="absolute z-10" style={{ top, height, left: 8, right: 8 }}>
                  <EventCard ev={ev} onClick={() => onEventClick(ev)} />
                </div>
              )
            })}

            {dayEvs.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-gray-300 font-semibold text-sm">No classes today</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Agenda View ─────────────────────────────────────────────────────────────
function AgendaView({ date, events, onEventClick }: { date: Date; events: TEvent[]; onEventClick: (e: TEvent) => void }) {
  // Group events by date, for next 30 days
  const days = Array.from({ length: 30 }, (_, i) => addDays(date, i))
  const groups = days.map(d => ({ day: d, evs: events.filter(e => isSameDay(e.start, d)).sort((a,b) => a.start.getTime() - b.start.getTime()) })).filter(g => g.evs.length > 0)

  return (
    <div className="flex-1 overflow-y-auto">
      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <CalendarDays className="h-10 w-10 text-gray-200 mb-3" />
          <p className="text-gray-400 font-semibold">No upcoming classes in the next 30 days</p>
        </div>
      ) : (
        <div className="divide-y divide-[#ede8df]">
          {groups.map(({ day, evs }) => (
            <div key={day.toISOString()} className="flex">
              {/* Date sidebar */}
              <div className={`w-24 flex-shrink-0 py-4 px-4 flex flex-col items-center justify-start border-r border-[#ede8df] sticky top-0 ${isToday(day) ? 'bg-[#ede9ff]' : 'bg-[#faf8f3]'}`}>
                <div className={`text-[10px] font-black uppercase tracking-wider ${isToday(day) ? 'text-violet-600' : 'text-gray-400'}`}>{fmt(day, 'EEE')}</div>
                <div className={`text-xl font-black mt-0.5 w-9 h-9 flex items-center justify-center ${isToday(day) ? 'bg-violet-600 text-white' : 'text-gray-700'}`}>
                  {fmt(day, 'd')}
                </div>
                <div className="text-[9px] text-gray-400 mt-0.5 text-center">{fmt(day, 'MMM yyyy')}</div>
              </div>

              {/* Events list */}
              <div className="flex-1 py-3 px-4 space-y-2">
                {evs.map(ev => (
                  <div
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className="flex items-stretch gap-3 cursor-pointer group hover:bg-[#faf6ff] rounded-none p-2 -m-2 transition-colors"
                  >
                    {/* Color bar */}
                    <div className="w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: TYPE_COLORS[ev.eventType] || ev.color }} />
                    {/* Time */}
                    <div className="w-24 flex-shrink-0 pt-0.5">
                      <div className="text-xs font-bold text-gray-600">{fmt(ev.start, 'h:mm a')}</div>
                      <div className="text-[10px] text-gray-400">{fmt(ev.end, 'h:mm a')}</div>
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2">
                        <div>
                          <span className="font-bold text-sm text-gray-800 group-hover:text-violet-700 transition-colors">{ev.subject}</span>
                          {ev.subjectCode && <span className="ml-1.5 text-[10px] text-gray-400 font-mono">{ev.subjectCode}</span>}
                        </div>
                        <div className="ml-auto flex-shrink-0">
                          <span className="text-[10px] px-1.5 py-0.5 font-bold text-white capitalize" style={{ backgroundColor: TYPE_COLORS[ev.eventType] || '#6B7280' }}>
                            {ev.eventType}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-4 mt-0.5 text-xs text-gray-400">
                        <span>👤 {ev.teacher}</span>
                        {ev.room && <span>📍 {ev.room}</span>}
                      </div>
                      {ev.lessonTopic && (
                        <div className="mt-1 text-[11px] text-violet-600 font-semibold">📖 {ev.lessonTopic}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
type ViewType = 'month' | 'week' | 'day' | 'agenda'

export default function CalendarPage() {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<'batch' | 'teacher'>('batch')
  const [batches, setBatches] = useState<Batch[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [selectedBatch, setSelectedBatch] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [events, setEvents] = useState<TEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<ViewType>('week')

  const [selectedEvent, setSelectedEvent] = useState<TEvent | null>(null)
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
        start: new Date(e.start_time),
        end: new Date(e.end_time),
        subject: e.subjects?.name || 'Class',
        subjectCode: e.subjects?.code || null,
        teacher: e.teachers?.name || '',
        room: e.room || null,
        eventType: e.event_type || 'lecture',
        status: e.status,
        color: e.timetable_templates?.color || TYPE_COLORS[e.event_type] || '#5B5EF4',
        semester: e.semester,
        hasLesson: !!lesson,
        lessonTopic: lesson?.topic_title || null,
        lessonStatus: lesson?.status || null,
      }
    }))
    setLoading(false)
  }, [viewMode, selectedBatch, selectedTeacher])

  // Navigation
  const navigate = (dir: 'prev' | 'next' | 'today') => {
    if (dir === 'today') { setCurrentDate(new Date()); return }
    const fwd = dir === 'next'
    setCurrentDate(d =>
      view === 'month' ? (fwd ? addMonths(d, 1) : subMonths(d, 1)) :
      view === 'week' ? (fwd ? addWeeks(d, 1) : subWeeks(d, 1)) :
      (fwd ? addDays(d, 1) : subDays(d, 1))
    )
  }

  const headerLabel = () => {
    if (view === 'month') return fmt(currentDate, 'MMMM yyyy')
    if (view === 'week') {
      const ws = startOfWeekMon(currentDate)
      const we = endOfWeekMon(currentDate)
      return `${fmt(ws, 'MMM d')} – ${fmt(we, 'MMM d, yyyy')}`
    }
    if (view === 'day') return fmt(currentDate, 'EEEE, MMMM d, yyyy')
    return `Next 30 days from ${fmt(currentDate, 'MMM d')}`
  }

  const handleEventClick = (ev: TEvent) => { setSelectedEvent(ev); setDetailOpen(true) }

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
    const payload = { topic_title: lessonForm.topic_title.trim(), objective: lessonForm.objective.trim() || null, notes: lessonForm.notes.trim() || null, status: lessonForm.status, updated_at: new Date().toISOString() }
    if (ex) await supabase.from('lesson_topics').update(payload).eq('id', ex.id)
    else await supabase.from('lesson_topics').insert({ ...payload, event_id: selectedEvent.id })
    if (['completed', 'cancelled'].includes(lessonForm.status))
      await supabase.from('timetable_events').update({ status: lessonForm.status === 'completed' ? 'completed' : 'cancelled' }).eq('id', selectedEvent.id)
    setSavingLesson(false)
    setLessonSuccess('Saved!')
    setTimeout(() => { setLessonSuccess(''); setLessonOpen(false); fetchEvents() }, 1000)
  }

  const canLoad = (viewMode === 'batch' && selectedBatch) || (viewMode === 'teacher' && selectedTeacher)
  const eventCount = view === 'month'
    ? events.filter(e => isSameMonth(e.start, currentDate)).length
    : view === 'week'
    ? events.filter(e => {
        const ws = startOfWeekMon(currentDate); const we = endOfWeekMon(currentDate)
        return e.start >= ws && e.start <= we
      }).length
    : view === 'day'
    ? events.filter(e => isSameDay(e.start, currentDate)).length
    : events.length

  return (
    <div className="h-screen flex flex-col bg-[#f5f1ea] overflow-hidden">

      {/* ── Top Header ────────────────────────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[#faf8f3] to-[#f0ebe0] border-b-2 border-[#e0dbd0] flex-shrink-0">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: `linear-gradient(#666 1px, transparent 1px), linear-gradient(90deg, #666 1px, transparent 1px)`, backgroundSize: '24px 24px' }} />
        <div className="relative px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">

            {/* Left: back + title */}
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboards/admin/classes')}
                className="text-gray-500 hover:text-gray-800 px-0 hover:bg-transparent">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <div className="w-px h-5 bg-gray-300" />
              <div className="w-9 h-9 bg-violet-600 flex items-center justify-center flex-shrink-0">
                <LayoutList className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-black text-gray-800 leading-tight">Calendar Timetable</h1>
                <p className="text-gray-400 text-[11px]">Click any class card to view details or add lesson topics</p>
              </div>
            </div>

            {/* Right: controls */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Batch/Teacher toggle */}
              <div className="flex border border-[#d5cfc5] overflow-hidden">
                {(['batch', 'teacher'] as const).map(m => (
                  <button key={m} onClick={() => { setViewMode(m); setEvents([]) }}
                    className={`px-3 py-2 text-xs font-black flex items-center gap-1.5 transition-colors capitalize ${viewMode === m ? 'bg-violet-600 text-white' : 'bg-white text-gray-600 hover:bg-[#f0ebe0]'}`}>
                    {m === 'batch' ? <Layers className="h-3.5 w-3.5" /> : <GraduationCap className="h-3.5 w-3.5" />}
                    {m}
                  </button>
                ))}
              </div>

              {/* Selector */}
              {viewMode === 'batch' ? (
                <Select value={selectedBatch || 'none'} onValueChange={v => setSelectedBatch(v === 'none' ? '' : v)}>
                  <SelectTrigger className="rounded-none border-[#d5cfc5] bg-white w-52 text-sm h-9 font-semibold"><SelectValue placeholder="Select Batch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select Batch</SelectItem>
                    {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({b.academic_year})</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <Select value={selectedTeacher || 'none'} onValueChange={v => setSelectedTeacher(v === 'none' ? '' : v)}>
                  <SelectTrigger className="rounded-none border-[#d5cfc5] bg-white w-52 text-sm h-9 font-semibold"><SelectValue placeholder="Select Teacher" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select Teacher</SelectItem>
                    {teachers.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}

              <Button onClick={fetchEvents} disabled={loading || !canLoad}
                className="bg-violet-600 hover:bg-violet-700 text-white rounded-none font-black h-9 px-4 text-sm">
                {loading ? <><span className="animate-spin mr-1.5 text-base">↻</span>Loading</> : <><LayoutList className="h-4 w-4 mr-1.5" />Load</>}
              </Button>
            </div>
          </div>

          {/* Legend row */}
          {events.length > 0 && (
            <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-[#ddd8ce]">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Types</span>
              {Object.entries(TYPE_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-1">
                  <div className="w-2 h-2 flex-shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[11px] text-gray-500 font-semibold capitalize">{type}</span>
                </div>
              ))}
              <div className="ml-auto text-[11px] text-gray-400 flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                = has lesson topic
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Calendar Shell ─────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 px-5 py-4">
        <div className="flex-1 flex flex-col min-h-0 bg-white border border-[#e5e0d8] shadow-sm overflow-hidden">

          {/* Calendar Toolbar */}
          <div className="flex items-center justify-between px-5 py-3 border-b-2 border-[#e8e2d8] bg-[#faf8f3] flex-shrink-0">
            {/* Nav */}
            <div className="flex items-center gap-1">
              <button onClick={() => navigate('today')}
                className="px-3 py-1.5 text-xs font-black text-gray-600 bg-white border border-[#ddd8ce] hover:bg-[#f0ebe0] transition-colors">
                Today
              </button>
              <button onClick={() => navigate('prev')} className="p-1.5 bg-white border border-[#ddd8ce] text-gray-500 hover:bg-[#f0ebe0] transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => navigate('next')} className="p-1.5 bg-white border border-[#ddd8ce] text-gray-500 hover:bg-[#f0ebe0] transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* Label */}
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-violet-500" />
              <span className="text-sm font-black text-gray-800">{headerLabel()}</span>
              {events.length > 0 && eventCount > 0 && (
                <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 font-semibold">
                  {eventCount} class{eventCount !== 1 ? 'es' : ''}
                </span>
              )}
            </div>

            {/* View switcher */}
            <div className="flex border border-[#ddd8ce] overflow-hidden">
              {(['month', 'week', 'day', 'agenda'] as ViewType[]).map(v => (
                <button key={v} onClick={() => setView(v)}
                  className={`px-3.5 py-1.5 text-xs font-black capitalize border-r border-[#ddd8ce] last:border-r-0 transition-colors ${view === v ? 'bg-violet-600 text-white' : 'bg-white text-gray-600 hover:bg-[#f0ebe0]'}`}>
                  {v}
                </button>
              ))}
            </div>
          </div>

          {/* ── No events empty state ── */}
          {events.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-[#f0ebe0] flex items-center justify-center mb-4">
                <CalendarDays className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-gray-500 font-bold">No events to display</p>
              <p className="text-gray-400 text-sm mt-1 text-center max-w-xs">
                Select a {viewMode === 'batch' ? 'batch' : 'teacher'} above and click Load.<br />
                Make sure you've run <strong>Generate All Events</strong> in the Template Builder.
              </p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {view === 'month' && <MonthView date={currentDate} events={events} onEventClick={handleEventClick} />}
              {view === 'week' && <WeekView date={currentDate} events={events} onEventClick={handleEventClick} />}
              {view === 'day' && <DayView date={currentDate} events={events} onEventClick={handleEventClick} />}
              {view === 'agenda' && <AgendaView date={currentDate} events={events} onEventClick={handleEventClick} />}
            </div>
          )}
        </div>
      </div>

      {/* ── Event Detail Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="rounded-none max-w-sm p-0 overflow-hidden gap-0">
          {selectedEvent && (
            <>
              <div className="px-5 py-4 text-white relative" style={{ backgroundColor: TYPE_COLORS[selectedEvent.eventType] || '#5B5EF4' }}>
                <button onClick={() => setDetailOpen(false)} className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors">
                  <X className="h-4 w-4" />
                </button>
                <div className="pr-6">
                  <div className="font-black text-base leading-tight">{selectedEvent.subject}</div>
                  {selectedEvent.subjectCode && <div className="text-white/70 text-xs font-mono mt-0.5">{selectedEvent.subjectCode}</div>}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="bg-white/20 px-2 py-0.5 text-xs font-black capitalize">{selectedEvent.eventType}</div>
                    <div className="text-white/70 text-xs font-semibold">Sem {selectedEvent.semester}</div>
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Clock, label: 'Time', val: `${fmt(selectedEvent.start, 'h:mm a')} – ${fmt(selectedEvent.end, 'h:mm a')}` },
                    { icon: CalendarDays, label: 'Date', val: fmt(selectedEvent.start, 'EEE, dd MMM yyyy') },
                    { icon: User, label: 'Teacher', val: selectedEvent.teacher },
                    ...(selectedEvent.room ? [{ icon: MapPin, label: 'Room', val: selectedEvent.room }] : []),
                  ].map(({ icon: Icon, label, val }) => (
                    <div key={label} className="flex items-start gap-2">
                      <Icon className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="text-[10px] text-gray-400 font-black uppercase tracking-wide">{label}</div>
                        <div className="text-xs font-bold text-gray-700">{val}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Status */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Status</span>
                  <div className="h-px flex-1 bg-gray-100" />
                  <div className="text-[11px] px-2 py-0.5 font-black text-white capitalize" style={{ backgroundColor: STATUS_COLORS[selectedEvent.status] || '#6B7280' }}>
                    {selectedEvent.status}
                  </div>
                </div>

                {/* Lesson */}
                {selectedEvent.lessonTopic ? (
                  <div className="p-3 bg-violet-50 border border-violet-100">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <BookMarked className="h-3.5 w-3.5 text-violet-500" />
                      <span className="text-[10px] font-black text-violet-600 uppercase tracking-wider">Lesson Topic</span>
                      <div className={`ml-auto text-[10px] px-1.5 py-0.5 border font-black capitalize ${LESSON_BADGE[selectedEvent.lessonStatus || 'planned']}`}>
                        {selectedEvent.lessonStatus?.replace('_', ' ')}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-violet-800">{selectedEvent.lessonTopic}</div>
                  </div>
                ) : (
                  <div className="p-3 border border-dashed border-gray-200 text-center">
                    <p className="text-xs text-gray-400">No lesson topic planned yet</p>
                  </div>
                )}
              </div>

              <div className="px-5 pb-5 flex gap-2">
                <Button variant="outline" onClick={() => setDetailOpen(false)} className="flex-1 rounded-none h-9 text-sm">Close</Button>
                <Button onClick={openLessonEdit} className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-none font-black h-9 text-sm">
                  <BookOpen className="h-4 w-4 mr-1.5" />
                  {selectedEvent.hasLesson ? 'Edit Topic' : 'Add Topic'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Lesson Topic Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={lessonOpen} onOpenChange={setLessonOpen}>
        <DialogContent className="rounded-none max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-800">
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
              <Label className="text-xs font-black text-gray-600 mb-1.5 block">Topic Title *</Label>
              <Input value={lessonForm.topic_title} onChange={e => setLessonForm(f => ({ ...f, topic_title: e.target.value }))}
                placeholder="e.g. Introduction to Binary Trees"
                className="rounded-none border-gray-200 focus-visible:ring-violet-400" />
            </div>
            <div>
              <Label className="text-xs font-black text-gray-600 mb-1.5 block">Learning Objective</Label>
              <Textarea value={lessonForm.objective} onChange={e => setLessonForm(f => ({ ...f, objective: e.target.value }))}
                placeholder="Students will be able to..." rows={2}
                className="rounded-none border-gray-200 focus-visible:ring-violet-400 resize-none" />
            </div>
            <div>
              <Label className="text-xs font-black text-gray-600 mb-1.5 block">Notes</Label>
              <Textarea value={lessonForm.notes} onChange={e => setLessonForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Additional notes..." rows={2}
                className="rounded-none border-gray-200 focus-visible:ring-violet-400 resize-none" />
            </div>
            <div>
              <Label className="text-xs font-black text-gray-600 mb-2 block">Status</Label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { v: 'planned', l: 'Planned', a: 'bg-blue-600 text-white border-blue-600', b: 'bg-white border-gray-200 text-gray-500' },
                  { v: 'in_progress', l: 'In Progress', a: 'bg-yellow-500 text-white border-yellow-500', b: 'bg-white border-gray-200 text-gray-500' },
                  { v: 'completed', l: 'Completed', a: 'bg-green-600 text-white border-green-600', b: 'bg-white border-gray-200 text-gray-500' },
                  { v: 'skipped', l: 'Skipped', a: 'bg-red-500 text-white border-red-500', b: 'bg-white border-gray-200 text-gray-500' },
                ].map(s => (
                  <button key={s.v} type="button" onClick={() => setLessonForm(f => ({ ...f, status: s.v }))}
                    className={`py-2 text-xs font-black border-2 transition-all ${lessonForm.status === s.v ? s.a : s.b}`}>
                    {s.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" onClick={() => setLessonOpen(false)} className="rounded-none">Cancel</Button>
            <Button onClick={saveLessonTopic} disabled={savingLesson || !lessonForm.topic_title.trim()}
              className="bg-violet-600 hover:bg-violet-700 text-white rounded-none font-black">
              {savingLesson ? 'Saving...' : 'Save Lesson Topic'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
