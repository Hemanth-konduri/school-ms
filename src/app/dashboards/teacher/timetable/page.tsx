'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, CalendarDays, Clock3, Filter, GraduationCap, MapPin,
  ShieldCheck, UserCheck, ChevronLeft, ChevronRight
} from 'lucide-react'

type Scope = 'all' | 'past' | 'present' | 'future'
type Preset = 'today' | 'week' | 'custom'

interface TeacherProfile {
  id: string
  name: string
  email: string
}

interface TimetableRow {
  id: string
  batchId: string
  batchName: string
  subjectName: string
  eventType: string
  room: string | null
  start: Date
  end: Date
  attendanceMarkedAt: Date | null
}

const PAGE_SIZE = 10
const t12 = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()
const dmy = (d: Date) => d.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })

function getRange(preset: Preset, fromDate: string, toDate: string) {
  const now = new Date()
  if (preset === 'today') {
    const s = new Date(now); s.setHours(0, 0, 0, 0)
    const e = new Date(now); e.setHours(23, 59, 59, 999)
    return { s, e }
  }
  if (preset === 'week') {
    const day = now.getDay()
    const diff = day === 0 ? -6 : 1 - day
    const s = new Date(now); s.setDate(now.getDate() + diff); s.setHours(0, 0, 0, 0)
    const e = new Date(s); e.setDate(s.getDate() + 6); e.setHours(23, 59, 59, 999)
    return { s, e }
  }
  const s = fromDate ? new Date(`${fromDate}T00:00:00`) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const e = toDate ? new Date(`${toDate}T23:59:59`) : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  return { s, e }
}

export default function TeacherTimetablePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [rows, setRows] = useState<TimetableRow[]>([])
  const [now, setNow] = useState(new Date())
  const [preset, setPreset] = useState<Preset>('today')
  const [scope, setScope] = useState<Scope>('all')
  const [batchFilter, setBatchFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const f = new Date(); f.setDate(f.getDate() - 14)
    const t = new Date(); t.setDate(t.getDate() + 14)
    setFromDate(f.toISOString().slice(0, 10))
    setToDate(t.toISOString().slice(0, 10))
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { router.replace('/login'); return }

      const { data: teacher } = await supabase
        .from('teachers')
        .select('id,name,email')
        .eq('email', user.email)
        .maybeSingle()

      if (!teacher) { setLoading(false); return }
      setProfile(teacher)
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => { setPage(1) }, [preset, scope, batchFilter, typeFilter, fromDate, toDate])

  useEffect(() => {
    async function fetchRows() {
      if (!profile) return
      setLoading(true)

      const { s, e } = getRange(preset, fromDate, toDate)
      let query = supabase
        .from('timetable_events')
        .select('id,batch_id,subject_id,start_time,end_time,room,event_type,status')
        .eq('teacher_id', profile.id)
        .neq('status', 'cancelled')
        .gte('start_time', s.toISOString())
        .lte('end_time', e.toISOString())
        .order('start_time', { ascending: true })

      const { data: events, error } = await query
      if (error || !events) { setRows([]); setLoading(false); return }

      const subjectIds = Array.from(new Set(events.map((e: any) => e.subject_id).filter(Boolean)))
      const batchIds = Array.from(new Set(events.map((e: any) => e.batch_id).filter(Boolean)))
      const eventIds = events.map((e: any) => e.id)

      const [subjectsRes, batchesRes, sessionsRes] = await Promise.all([
        subjectIds.length ? supabase.from('subjects').select('id,name').in('id', subjectIds) : Promise.resolve({ data: [] as any[] }),
        batchIds.length ? supabase.from('batches').select('id,name').in('id', batchIds) : Promise.resolve({ data: [] as any[] }),
        eventIds.length ? supabase.from('teacher_attendance_sessions').select('event_id,marked_at').eq('teacher_id', profile.id).in('event_id', eventIds) : Promise.resolve({ data: [] as any[] }),
      ])

      const subjectMap = new Map((subjectsRes.data || []).map((s: any) => [s.id, s.name]))
      const batchMap = new Map((batchesRes.data || []).map((b: any) => [b.id, b.name]))
      const sessionMap = new Map((sessionsRes.data || []).map((s: any) => [s.event_id, s]))

      const mapped: TimetableRow[] = events.map((e: any) => ({
        id: e.id,
        batchId: e.batch_id,
        batchName: batchMap.get(e.batch_id) || 'Batch',
        subjectName: subjectMap.get(e.subject_id) || 'Subject',
        eventType: e.event_type || 'lecture',
        room: e.room || null,
        start: new Date(e.start_time),
        end: new Date(e.end_time),
        attendanceMarkedAt: sessionMap.get(e.id)?.marked_at ? new Date(sessionMap.get(e.id).marked_at) : null
      }))

      setRows(mapped)
      setLoading(false)
    }

    fetchRows()
  }, [profile, preset, fromDate, toDate])

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (batchFilter !== 'all' && r.batchId !== batchFilter) return false
      if (typeFilter !== 'all' && r.eventType !== typeFilter) return false
      if (scope === 'past' && !(r.end < now)) return false
      if (scope === 'present' && !(r.start <= now && r.end >= now)) return false
      if (scope === 'future' && !(r.start > now)) return false
      return true
    })
  }, [rows, batchFilter, typeFilter, scope, now])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageSafe = Math.min(page, totalPages)
  const pagedRows = useMemo(
    () => filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE),
    [filtered, pageSafe]
  )

  const batches = useMemo(() => Array.from(new Map(rows.map(r => [r.batchId, r.batchName]))), [rows])
  const types = useMemo(() => Array.from(new Set(rows.map(r => r.eventType))), [rows])

  const summary = useMemo(() => {
    const total = filtered.length
    const marked = filtered.filter(r => !!r.attendanceMarkedAt).length
    const live = filtered.filter(r => r.start <= now && r.end >= now).length
    const missed = filtered.filter(r => r.end < now && !r.attendanceMarkedAt).length
    const totalAttendancePct = total ? (marked / total) * 100 : 0

    const byBatch = new Map<string, { total: number; marked: number }>()
    filtered.forEach(r => {
      const cur = byBatch.get(r.batchId) || { total: 0, marked: 0 }
      cur.total += 1
      if (r.attendanceMarkedAt) cur.marked += 1
      byBatch.set(r.batchId, cur)
    })
    const avgAttendancePct = byBatch.size
      ? Array.from(byBatch.values()).reduce((a, b) => a + (b.total ? (b.marked / b.total) * 100 : 0), 0) / byBatch.size
      : 0

    return { total, marked, live, missed, totalAttendancePct, avgAttendancePct }
  }, [filtered, now])

  const attendanceState = (r: TimetableRow) => {
    if (r.attendanceMarkedAt) return { label: `Marked ${t12(r.attendanceMarkedAt)}`, bg: '#ECFDF5', txt: '#047857', br: '#A7F3D0' }
    if (r.start <= now && r.end >= now) return { label: 'Live - Not Marked', bg: '#FEF3C7', txt: '#92400E', br: '#FDE68A' }
    if (r.end < now) return { label: 'Missed', bg: '#FEF2F2', txt: '#B91C1C', br: '#FECACA' }
    return { label: 'Pending', bg: '#EEF2FF', txt: '#3730A3', br: '#C7D2FE' }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F6F4EF]">Loading...</div>

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        *{font-family:'Plus Jakarta Sans',sans-serif;box-sizing:border-box}
        .serif{font-family:'Fraunces',Georgia,serif!important}
      `}</style>

      <div className="min-h-screen bg-[#F6F4EF]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2.5">
              <button onClick={() => router.push('/dashboards/teacher')} className="p-2 bg-white border border-gray-200 text-gray-600 hover:text-gray-800">
                <ArrowLeft className="h-4 w-4"/>
              </button>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="font-bold text-gray-800">My Timetable</div>
                <div className="text-[11px] text-gray-400">{profile?.name}</div>
              </div>
            </div>
            <div className="text-[11px] text-gray-500 flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5"/> {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div className="p-3 bg-white border border-gray-100"><div className="text-[10px] text-gray-400 font-bold uppercase">Periods</div><div className="text-lg font-black text-gray-800">{summary.total}</div></div>
            <div className="p-3 bg-white border border-gray-100"><div className="text-[10px] text-gray-400 font-bold uppercase">Marked</div><div className="text-lg font-black text-emerald-600">{summary.marked}</div></div>
            <div className="p-3 bg-white border border-gray-100"><div className="text-[10px] text-gray-400 font-bold uppercase">Live</div><div className="text-lg font-black text-amber-600">{summary.live}</div></div>
            <div className="p-3 bg-white border border-gray-100"><div className="text-[10px] text-gray-400 font-bold uppercase">Total %</div><div className="text-lg font-black text-indigo-600">{summary.totalAttendancePct.toFixed(1)}%</div></div>
            <div className="p-3 bg-white border border-gray-100"><div className="text-[10px] text-gray-400 font-bold uppercase">Average %</div><div className="text-lg font-black text-violet-600">{summary.avgAttendancePct.toFixed(1)}%</div></div>
          </div>

          <div className="p-4 bg-white border border-gray-100 mb-4">
            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase mb-2"><Filter className="h-3.5 w-3.5"/> Filters</div>
            <div className="grid grid-cols-2 md:grid-cols-7 gap-2">
              <select value={preset} onChange={e => setPreset(e.target.value as Preset)} className="border border-gray-200 px-2 py-2 text-sm">
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="custom">Custom Range</option>
              </select>
              <select value={scope} onChange={e => setScope(e.target.value as Scope)} className="border border-gray-200 px-2 py-2 text-sm">
                <option value="all">All Status</option>
                <option value="past">Past</option>
                <option value="present">Present</option>
                <option value="future">Future</option>
              </select>
              <select value={batchFilter} onChange={e => setBatchFilter(e.target.value)} className="border border-gray-200 px-2 py-2 text-sm">
                <option value="all">All Batches</option>
                {batches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border border-gray-200 px-2 py-2 text-sm">
                <option value="all">All Types</option>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <input type="date" value={fromDate} disabled={preset !== 'custom'} onChange={e => setFromDate(e.target.value)} className="border border-gray-200 px-2 py-2 text-sm disabled:bg-gray-100" />
              <input type="date" value={toDate} disabled={preset !== 'custom'} onChange={e => setToDate(e.target.value)} className="border border-gray-200 px-2 py-2 text-sm disabled:bg-gray-100" />
              <button onClick={() => { setPreset('today'); setScope('all'); setBatchFilter('all'); setTypeFilter('all') }} className="border border-gray-200 px-2 py-2 text-sm font-semibold text-gray-600 bg-gray-50">
                Reset
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {pagedRows.length === 0 && (
              <div className="p-8 bg-white border border-gray-100 text-center text-gray-400">No periods for the selected filters.</div>
            )}
            {pagedRows.map(r => {
              const st = attendanceState(r)
              return (
                <div key={r.id} className="p-4 bg-white border border-gray-100 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="md:w-48">
                    <div className="text-sm font-bold text-gray-800">{dmy(r.start)}</div>
                    <div className="text-[11px] text-gray-500">{t12(r.start)} - {t12(r.end)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800 text-sm truncate">{r.subjectName}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5"/>{r.batchName}</span>
                      <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5"/>{r.room || 'No room'}</span>
                      <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5"/>{r.eventType}</span>
                    </div>
                  </div>
                  <div className="md:w-52">
                    <div className="px-2.5 py-1.5 text-[11px] font-bold border" style={{ background: st.bg, color: st.txt, borderColor: st.br }}>
                      {st.label}
                    </div>
                    {r.attendanceMarkedAt ? (
                      <div className="text-[10px] text-gray-500 mt-1 inline-flex items-center gap-1"><UserCheck className="h-3.5 w-3.5"/> Teacher attendance recorded</div>
                    ) : (
                      <div className="text-[10px] text-gray-500 mt-1 inline-flex items-center gap-1"><ShieldCheck className="h-3.5 w-3.5"/> No attendance proof yet</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm">
            <div className="text-gray-500">
              Showing {(filtered.length === 0) ? 0 : ((pageSafe - 1) * PAGE_SIZE + 1)}-
              {Math.min(pageSafe * PAGE_SIZE, filtered.length)} of {filtered.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={pageSafe <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 border border-gray-200 bg-white disabled:opacity-40 inline-flex items-center gap-1">
                <ChevronLeft className="h-4 w-4"/> Prev
              </button>
              <span className="text-gray-600 font-semibold">Page {pageSafe} / {totalPages}</span>
              <button
                disabled={pageSafe >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 border border-gray-200 bg-white disabled:opacity-40 inline-flex items-center gap-1">
                Next <ChevronRight className="h-4 w-4"/>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

