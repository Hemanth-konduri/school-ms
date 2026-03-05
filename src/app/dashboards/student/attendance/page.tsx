'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  ArrowLeft, CalendarDays, CheckCircle2, ChevronDown, ChevronUp, CircleAlert,
  GraduationCap, Search, ShieldCheck, TrendingUp, UserCheck, Users
} from 'lucide-react'

const RULE_1 = 75
const RULE_2 = 80

interface StudentProfile {
  id: string
  name: string
  email: string
  batch_id: string | null
  semester: number | null
  roll_number: string | null
}

interface SubjectAttendance {
  subjectId: string
  subjectName: string
  conducted: number
  present: number
  absent: number
  pct: number
  pastConducted: number
  pastPresent: number
  pastPct: number
  currentConducted: number
  currentPresent: number
  currentPct: number
}

const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0)

const needToReach = (present: number, conducted: number, target: number) => {
  const current = pct(present, conducted)
  if (current >= target) return 0
  const n = Math.ceil((target * conducted - 100 * present) / (100 - target))
  return Math.max(0, n)
}

export default function StudentAttendancePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [subjects, setSubjects] = useState<SubjectAttendance[]>([])
  const [openSubject, setOpenSubject] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'below75' | 'below80' | 'good'>('all')

  useEffect(() => {
    async function init() {
      setLoading(true)
      setError('')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user?.email) { router.replace('/login'); return }

      const { data: student, error: stErr } = await supabase
        .from('students')
        .select('id,name,email,batch_id,semester,roll_number')
        .eq('email', user.email)
        .maybeSingle()

      if (stErr || !student) {
        setError('Unable to load student profile')
        setLoading(false)
        return
      }
      setProfile(student)

      if (!student.batch_id) {
        setSubjects([])
        setLoading(false)
        return
      }

      const now = new Date()
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

      const { data: events, error: evErr } = await supabase
        .from('timetable_events')
        .select('id,subject_id,start_time,end_time,status')
        .eq('batch_id', student.batch_id)
        .neq('status', 'cancelled')
        .lte('end_time', now.toISOString())
        .order('start_time', { ascending: true })

      if (evErr || !events) {
        setError('Unable to load attendance events')
        setLoading(false)
        return
      }

      const eventIds = events.map((e: any) => e.id)
      const subjectIds = Array.from(new Set(events.map((e: any) => e.subject_id).filter(Boolean)))

      const [{ data: records }, { data: subjectRows }] = await Promise.all([
        eventIds.length
          ? supabase
              .from('student_attendance_records')
              .select('event_id,status')
              .eq('student_id', student.id)
              .in('event_id', eventIds)
          : Promise.resolve({ data: [] as any[] }),
        subjectIds.length
          ? supabase.from('subjects').select('id,name').in('id', subjectIds)
          : Promise.resolve({ data: [] as any[] }),
      ])

      const subjectNameById = new Map<string, string>((subjectRows || []).map((s: any) => [s.id, s.name]))
      const recordByEvent = new Map<string, any>((records || []).map((r: any) => [r.event_id, r]))
      const grouped = new Map<string, SubjectAttendance>()

      for (const ev of events as any[]) {
        const sid = ev.subject_id || 'unknown'
        const start = new Date(ev.start_time)
        const rec = recordByEvent.get(ev.id)
        const isPresent = rec && ['present', 'manual_present'].includes(rec.status)

        const cur = grouped.get(sid) || {
          subjectId: sid,
          subjectName: subjectNameById.get(sid) || 'Subject',
          conducted: 0,
          present: 0,
          absent: 0,
          pct: 0,
          pastConducted: 0,
          pastPresent: 0,
          pastPct: 0,
          currentConducted: 0,
          currentPresent: 0,
          currentPct: 0
        }

        cur.conducted += 1
        if (isPresent) cur.present += 1

        if (start < monthStart) {
          cur.pastConducted += 1
          if (isPresent) cur.pastPresent += 1
        } else {
          cur.currentConducted += 1
          if (isPresent) cur.currentPresent += 1
        }

        grouped.set(sid, cur)
      }

      const list = Array.from(grouped.values()).map(s => {
        const absent = Math.max(0, s.conducted - s.present)
        return {
          ...s,
          absent,
          pct: pct(s.present, s.conducted),
          pastPct: pct(s.pastPresent, s.pastConducted),
          currentPct: pct(s.currentPresent, s.currentConducted),
        }
      }).sort((a, b) => a.pct - b.pct)

      setSubjects(list)
      if (list.length > 0) setOpenSubject(list[0].subjectId)
      setLoading(false)
    }

    init()
  }, [router])

  const totals = useMemo(() => {
    const conducted = subjects.reduce((a, s) => a + s.conducted, 0)
    const present = subjects.reduce((a, s) => a + s.present, 0)
    const averagePct = subjects.length ? subjects.reduce((a, s) => a + s.pct, 0) / subjects.length : 0
    return {
      conducted,
      present,
      pct: pct(present, conducted),
      averagePct,
      need75: needToReach(present, conducted, RULE_1),
      need80: needToReach(present, conducted, RULE_2),
    }
  }, [subjects])

  const visible = useMemo(() => {
    return subjects.filter(s => {
      const q = search.trim().toLowerCase()
      if (q && !s.subjectName.toLowerCase().includes(q)) return false
      if (filter === 'below75' && s.pct >= RULE_1) return false
      if (filter === 'below80' && s.pct >= RULE_2) return false
      if (filter === 'good' && s.pct < RULE_1) return false
      return true
    })
  }, [subjects, search, filter])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F6F4EF]">Loading...</div>
  if (error) return <div className="min-h-screen flex items-center justify-center bg-[#F6F4EF] text-red-600">{error}</div>

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
              <button onClick={() => router.push('/dashboards/student')} className="p-2 bg-white border border-gray-200 text-gray-600 hover:text-gray-800">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="font-bold text-gray-800">Attendance Overview</div>
                <div className="text-[11px] text-gray-400">{profile?.name} {profile?.roll_number ? `• ${profile.roll_number}` : ''}</div>
              </div>
            </div>
            <div className="text-[11px] text-gray-500 flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <div className="p-3 bg-white border border-gray-100"><div className="text-[10px] text-gray-400 font-bold uppercase">Overall %</div><div className="text-lg font-black text-indigo-600">{totals.pct.toFixed(1)}%</div></div>
            <div className="p-3 bg-white border border-gray-100"><div className="text-[10px] text-gray-400 font-bold uppercase">Average %</div><div className="text-lg font-black text-violet-600">{totals.averagePct.toFixed(1)}%</div></div>
            <div className="p-3 bg-white border border-gray-100"><div className="text-[10px] text-gray-400 font-bold uppercase">Conducted</div><div className="text-lg font-black text-gray-800">{totals.conducted}</div></div>
            <div className="p-3 bg-white border border-gray-100"><div className="text-[10px] text-gray-400 font-bold uppercase">Present</div><div className="text-lg font-black text-emerald-600">{totals.present}</div></div>
            <div className="p-3 bg-white border border-gray-100"><div className="text-[10px] text-gray-400 font-bold uppercase">Subjects</div><div className="text-lg font-black text-gray-800">{subjects.length}</div></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="p-3 bg-white border border-gray-100">
              <div className="text-[10px] text-gray-400 font-bold uppercase">College Rule 75%</div>
              <div className="mt-1 flex items-center gap-2">
                {totals.pct >= RULE_1 ? <CheckCircle2 className="h-4 w-4 text-emerald-600"/> : <CircleAlert className="h-4 w-4 text-amber-600"/>}
                <span className={`text-sm font-bold ${totals.pct >= RULE_1 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {totals.pct >= RULE_1 ? 'Compliant' : `${totals.need75} consecutive classes needed`}
                </span>
              </div>
            </div>
            <div className="p-3 bg-white border border-gray-100">
              <div className="text-[10px] text-gray-400 font-bold uppercase">Strict Rule 80%</div>
              <div className="mt-1 flex items-center gap-2">
                {totals.pct >= RULE_2 ? <ShieldCheck className="h-4 w-4 text-emerald-600"/> : <CircleAlert className="h-4 w-4 text-rose-600"/>}
                <span className={`text-sm font-bold ${totals.pct >= RULE_2 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {totals.pct >= RULE_2 ? 'Safe Zone' : `${totals.need80} consecutive classes needed`}
                </span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white border border-gray-100 mb-4">
            <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 uppercase mb-2">
              <TrendingUp className="h-3.5 w-3.5" /> Subject Filters
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <div className="relative">
                <Search className="h-4 w-4 text-gray-400 absolute left-2.5 top-2.5" />
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subject..."
                  className="w-full border border-gray-200 pl-8 pr-2 py-2 text-sm" />
              </div>
              <select value={filter} onChange={e => setFilter(e.target.value as any)} className="border border-gray-200 px-2 py-2 text-sm">
                <option value="all">All Subjects</option>
                <option value="below75">Below 75%</option>
                <option value="below80">Below 80%</option>
                <option value="good">75% and Above</option>
              </select>
              <button onClick={() => { setSearch(''); setFilter('all') }} className="border border-gray-200 px-2 py-2 text-sm font-semibold text-gray-600 bg-gray-50">
                Reset
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {visible.length === 0 && (
              <div className="p-8 bg-white border border-gray-100 text-center text-gray-400">No subjects match current filters.</div>
            )}
            {visible.map(s => {
              const expanded = openSubject === s.subjectId
              const statusColor = s.pct >= RULE_1 ? 'text-emerald-700' : s.pct >= 65 ? 'text-amber-700' : 'text-rose-700'
              return (
                <div key={s.subjectId} className="bg-white border border-gray-100 overflow-hidden">
                  <button onClick={() => setOpenSubject(expanded ? '' : s.subjectId)} className="w-full text-left px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-800 text-sm truncate">{s.subjectName}</div>
                      <div className="text-[11px] text-gray-500 mt-0.5 inline-flex items-center gap-3">
                        <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5"/> {s.conducted} classes</span>
                        <span className="inline-flex items-center gap-1"><UserCheck className="h-3.5 w-3.5"/> {s.present} present</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-black ${statusColor}`}>{s.pct.toFixed(1)}%</div>
                      <div className="text-[10px] text-gray-400">{s.pct >= RULE_1 ? 'OK' : 'Below Rule'}</div>
                    </div>
                    {expanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </button>

                  {expanded && (
                    <div className="border-t border-gray-100 px-4 py-3 bg-[#FAFBFF]">
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                        <div className="p-2 border border-gray-100 bg-white"><div className="text-[10px] text-gray-400 font-bold uppercase">Overall %</div><div className="text-sm font-black text-indigo-600">{s.pct.toFixed(1)}%</div></div>
                        <div className="p-2 border border-gray-100 bg-white"><div className="text-[10px] text-gray-400 font-bold uppercase">Past %</div><div className="text-sm font-black text-violet-600">{s.pastPct.toFixed(1)}%</div></div>
                        <div className="p-2 border border-gray-100 bg-white"><div className="text-[10px] text-gray-400 font-bold uppercase">Present %</div><div className="text-sm font-black text-sky-600">{s.currentPct.toFixed(1)}%</div></div>
                        <div className="p-2 border border-gray-100 bg-white"><div className="text-[10px] text-gray-400 font-bold uppercase">Conducted</div><div className="text-sm font-black text-gray-800">{s.conducted}</div></div>
                        <div className="p-2 border border-gray-100 bg-white"><div className="text-[10px] text-gray-400 font-bold uppercase">Present</div><div className="text-sm font-black text-emerald-600">{s.present}</div></div>
                        <div className="p-2 border border-gray-100 bg-white"><div className="text-[10px] text-gray-400 font-bold uppercase">Absent</div><div className="text-sm font-black text-rose-600">{s.absent}</div></div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

