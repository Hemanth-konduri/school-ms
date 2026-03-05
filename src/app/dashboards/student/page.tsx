'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  BookOpen, Bell, TrendingUp, FileText, Award, Clock,
  ChevronRight, LogOut, BookMarked, ClipboardList, Star, Zap,
  GraduationCap, BarChart2, CalendarDays, Users, Hash,
  Building2, Layers, MapPin, User, Mail, Phone, Droplet,
  Coffee, Sun, Sunset, Moon, CheckCircle2, Library,
  Megaphone, PenSquare, FlaskConical, Trophy, Wallet,
  CalendarCheck, MessageSquare, Sunrise, Camera, AlertCircle, X
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────
interface StudentProfile {
  id: string; name: string; email: string
  phone: string | null; roll_number: string | null
  semester: number | null; batch_id: string | null
  batches: {
    name: string; academic_year: string
    programs: { name: string; schools: { name: string } }
    groups: { name: string }
  } | null
}

interface ClassEvent {
  id: string; subject: string; subjectCode: string | null
  teacher: string; room: string | null; eventType: string
  start: Date; end: Date; lessonTopic: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const weekMon = (d: Date) => {
  const day = d.getDay(), diff = day === 0 ? -6 : 1 - day
  const s = new Date(d); s.setDate(d.getDate() + diff); s.setHours(0,0,0,0); return s
}

const t12 = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()

function greeting(name: string) {
  const h = new Date().getHours()
  const first = name.split(' ')[0]
  if (h < 5)  return { msg: `Good night, ${first}`,      Icon: Moon,    c: '#818CF8' }
  if (h < 12) return { msg: `Good morning, ${first}`,    Icon: Sunrise,  c: '#F59E0B' }
  if (h < 17) return { msg: `Good afternoon, ${first}`,  Icon: Sun,      c: '#F97316' }
  if (h < 20) return { msg: `Good evening, ${first}`,    Icon: Sunset,   c: '#EF4444' }
  return       { msg: `Good night, ${first}`,             Icon: Moon,    c: '#818CF8' }
}

const EV: Record<string, { dot: string; bg: string; txt: string; chip: string }> = {
  lecture:   { dot:'#4F46E5', bg:'#EEF2FF', txt:'#3730A3', chip:'#C7D2FE' },
  practical: { dot:'#0891B2', bg:'#ECFEFF', txt:'#0E7490', chip:'#A5F3FC' },
  lab:       { dot:'#7C3AED', bg:'#F5F3FF', txt:'#6D28D9', chip:'#DDD6FE' },
  seminar:   { dot:'#B45309', bg:'#FFFBEB', txt:'#92400E', chip:'#FDE68A' },
  tutorial:  { dot:'#059669', bg:'#ECFDF5', txt:'#047857', chip:'#A7F3D0' },
  exam:      { dot:'#DC2626', bg:'#FEF2F2', txt:'#B91C1C', chip:'#FECACA' },
  other:     { dot:'#6B7280', bg:'#F9FAFB', txt:'#374151', chip:'#E5E7EB' },
}

const WLABELS = ['MON','TUE','WED','THU','FRI','SAT','SUN']

// ─── Live pulse dot ───────────────────────────────────────────────────────
function Pulse() {
  return (
    <span className="relative flex h-2 w-2 flex-shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
    </span>
  )
}

// ─── App card ─────────────────────────────────────────────────────────────
function AppTile({ icon: Icon, label, desc, badge, ac, bg, ic, onClick }: {
  icon: any; label: string; desc: string; badge?: number | string
  ac: string; bg: string; ic: string; onClick?: () => void
}) {
  return (
    <button onClick={onClick}
      className="group relative flex flex-col p-4 text-left overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:scale-[0.97]"
      style={{ background: bg, border: `1.5px solid ${ac}20` }}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
        style={{ background: `linear-gradient(135deg, ${ac}0a, transparent)` }} />
      {badge !== undefined && (
        <div className="absolute top-3 right-3 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[9px] font-black text-white z-10"
          style={{ background: ac }}>{badge}</div>
      )}
      <div className="w-10 h-10 flex items-center justify-center mb-3 transition-transform duration-200 group-hover:scale-110"
        style={{ background: `${ac}18` }}>
        <Icon className="h-[18px] w-[18px]" style={{ color: ic }} />
      </div>
      <div className="font-bold text-[12.5px] text-gray-800 leading-snug mb-0.5">{label}</div>
      <div className="text-gray-400 text-[10.5px] leading-snug">{desc}</div>
      <div className="mt-2.5 flex items-center gap-0.5 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: ac }}>Open <ChevronRight className="h-3 w-3" /></div>
    </button>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const router = useRouter()
  const [profile, setProfile] = useState<StudentProfile | null>(null)
  const [todayEvs, setTodayEvs] = useState<ClassEvent[]>([])
  const [weekEvs, setWeekEvs] = useState<ClassEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState<Date | null>(null)
  const [activeSession, setActiveSession] = useState<any>(null)
  const [marking, setMarking] = useState(false)
  const [attendanceMarked, setAttendanceMarked] = useState(false)
  const [showCaptureModal, setShowCaptureModal] = useState(false)
  const [capturePreview, setCapturePreview] = useState<string | null>(null)
  const [captureBlob, setCaptureBlob] = useState<Blob | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    setNow(new Date())
    const t = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (!profile?.id || !profile?.batch_id || todayEvs.length === 0 || !now) return

    async function checkActiveSession() {
      const studentId = profile?.id
      if (!studentId) return
      const nowIso = new Date().toISOString()
      const { data: sessions } = await supabase
        .from('teacher_attendance_sessions')
        .select('*')
        .eq('batch_id', profile!.batch_id!)
        .gt('student_window_ends_at', nowIso)
        .order('marked_at', { ascending: false })
        .limit(1)

      const session = sessions?.[0]
      if (!session) {
        setActiveSession(null)
        setAttendanceMarked(false)
        return
      }

      const sessionClass = todayEvs.find(e => e.id === session.event_id)
      if (!sessionClass) {
        setActiveSession(null)
        setAttendanceMarked(false)
        return
      }

      const { data: record } = await supabase
        .from('student_attendance_records')
        .select('id')
        .eq('event_id', session.event_id)
        .eq('student_id', studentId)
        .maybeSingle()

      setActiveSession(session)
      setAttendanceMarked(!!record)
    }

    checkActiveSession()
    const interval = setInterval(checkActiveSession, 10000)
    return () => clearInterval(interval)
  }, [profile, todayEvs, now])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: student, error } = await supabase
        .from('students')
        .select(`id,name,email,phone,roll_number,semester,batch_id,
          batches!students_batch_id_fkey(name,academic_year,
            programs!batches_program_id_fkey(name,schools!programs_school_id_fkey(name)),
            groups!batches_group_id_fkey(name))`)
        .eq('email', user.email)
        .single()

      if (error) { console.error('Student fetch failed:', error); setLoading(false); return }
      if (!student) { setLoading(false); return }
      setProfile({
        id: student.id, name: student.name || user.email?.split('@')[0] || 'Student',
        email: student.email || user.email || '', phone: student.phone,
        roll_number: student.roll_number || null, semester: student.semester || null,
        batch_id: student.batch_id || null, batches: (student.batches as any) || null,
      })
      if (student.batch_id) await loadTT(student.batch_id)
      setLoading(false)
    }
    init()
  }, [])

  async function loadTT(bid: string) {
    const ws = weekMon(new Date())
    const we = new Date(ws); we.setDate(ws.getDate() + 6); we.setHours(23,59,59)
    const { data, error } = await supabase
      .from('timetable_events')
      .select(`id,subject_id,teacher_id,start_time,end_time,room,event_type,status,notes`)
      .eq('batch_id', bid).neq('status','cancelled')
      .gte('start_time', ws.toISOString()).lte('end_time', we.toISOString())
      .order('start_time')
    if (error) {
      console.error('Timetable fetch failed')
      setTodayEvs([])
      setWeekEvs([])
      return
    }
    if (!data) return

    const subjectIds = Array.from(new Set(data.map((e: any) => e.subject_id).filter(Boolean)))
    const teacherIds = Array.from(new Set(data.map((e: any) => e.teacher_id).filter(Boolean)))
    const eventIds = data.map((e: any) => e.id).filter(Boolean)

    const [subjectsRes, teachersRes, lessonsRes] = await Promise.all([
      subjectIds.length
        ? supabase.from('subjects').select('id,name,code').in('id', subjectIds)
        : Promise.resolve({ data: [], error: null } as any),
      teacherIds.length
        ? supabase.from('teachers').select('id,name').in('id', teacherIds)
        : Promise.resolve({ data: [], error: null } as any),
      eventIds.length
        ? supabase.from('lesson_topics').select('event_id,topic_title').in('event_id', eventIds)
        : Promise.resolve({ data: [], error: null } as any),
    ])

    if (subjectsRes.error || teachersRes.error || lessonsRes.error) {
      console.error('Timetable metadata lookup failed')
    }

    const subjectById = new Map<string, { name?: string; code?: string }>(
      (subjectsRes.data || []).map((s: any) => [s.id, s])
    )
    const teacherById = new Map<string, { name?: string }>(
      (teachersRes.data || []).map((t: any) => [t.id, t])
    )
    const lessonByEventId = new Map<string, { topic_title?: string }>(
      (lessonsRes.data || []).map((l: any) => [l.event_id, l])
    )

    const mapped: ClassEvent[] = data.map((e: any) => {
      const subjectFromId = e.subject_id ? subjectById.get(e.subject_id) : null
      const teacherFromId = e.teacher_id ? teacherById.get(e.teacher_id) : null
      const lesson = lessonByEventId.get(e.id) || null
      const lessonTopic = lesson?.topic_title?.trim() || null
      const fallbackTopic = typeof e.notes === 'string' && e.notes.trim() ? e.notes.trim() : null

      return {
        id: e.id,
        subject: subjectFromId?.name?.trim() || e.subject_name || lessonTopic || fallbackTopic || 'Scheduled Class',
        subjectCode: subjectFromId?.code || null,
        teacher: teacherFromId?.name?.trim() || e.teacher_name || 'Lecturer TBD',
        room: e.room || null,
        eventType: e.event_type || 'lecture',
        start: new Date(e.start_time),
        end: new Date(e.end_time),
        lessonTopic: lessonTopic || fallbackTopic
      }
    })
    setTodayEvs(mapped.filter(e => sameDay(e.start, new Date())))
    setWeekEvs(mapped)
  }

  const openCaptureModal = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert('Camera API not available in this browser.')
        return
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      setCaptureBlob(null)
      if (capturePreview) URL.revokeObjectURL(capturePreview)
      setCapturePreview(null)
      setShowCaptureModal(true)
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play().catch(() => null)
        }
      }, 30)
    } catch {
      alert('Camera permission denied.')
    }
  }

  const closeCaptureModal = () => {
    if (capturePreview) URL.revokeObjectURL(capturePreview)
    setShowCaptureModal(false)
    setCaptureBlob(null)
    setCapturePreview(null)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }

  const captureStudentPhoto = async () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => b ? resolve(b) : reject(new Error('Encoding failed')), 'image/jpeg', 0.9)
    })
    if (capturePreview) URL.revokeObjectURL(capturePreview)
    setCaptureBlob(blob)
    setCapturePreview(URL.createObjectURL(blob))
  }

  const markAttendance = async () => {
    if (!profile?.id || !activeSession || !captureBlob) return

    try {
      setMarking(true)
      const ts = new Date().toISOString().replace(/[:.]/g, '-')
      const path = `student/${profile.id}/${activeSession.event_id}/${ts}.jpg`

      const { error: uploadError } = await supabase.storage
        .from('attendance-proofs')
        .upload(path, captureBlob, { contentType: 'image/jpeg', upsert: true })

      if (uploadError) throw uploadError

      const { data: signed } = await supabase.storage
        .from('attendance-proofs')
        .createSignedUrl(path, 60 * 60 * 24 * 7)

      const { error: recordError } = await supabase
        .from('student_attendance_records')
        .upsert({
          event_id: activeSession.event_id,
          student_id: profile.id,
          batch_id: profile.batch_id,
          status: 'present',
          photo_path: path,
          photo_url: signed?.signedUrl || null
        }, { onConflict: 'event_id,student_id' })

      if (recordError) throw recordError

      setAttendanceMarked(true)
      closeCaptureModal()
      alert('Attendance marked successfully!')
    } catch (err) {
      alert('Failed to mark attendance. Please try again.')
      console.error(err)
    } finally {
      setMarking(false)
    }
  }

  const signOut = async () => { await supabase.auth.signOut(); router.replace('/login') }

  const live = now ? todayEvs.find(e => e.start <= now && e.end >= now) : undefined
  const bannerClass = live || (activeSession ? todayEvs.find(e => e.id === activeSession.event_id) : undefined)
  const next = now ? todayEvs.find(e => e.start > now) : undefined
  const ws = weekMon(now || new Date())
  const days7 = Array.from({ length: 7 }, (_, i) => { const d = new Date(ws); d.setDate(ws.getDate() + i); return d })
  const initials = profile?.name?.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() || 'ST'
  const g = profile ? greeting(profile.name) : { msg: 'Welcome back', Icon: Sun, c: '#F59E0B' }

  const apps = [
    { icon: User,          label: 'My Profile',     desc: 'Edit personal details',        ac:'#6366F1', bg:'#F0F4FF', ic:'#6366F1', onClick: () => router.push('/dashboards/student/profile') },
    { icon: CheckCircle2,  label: 'Attendance',     desc: 'View attendance records',      ac:'#16A34A', bg:'#F0FDF4', ic:'#16A34A', onClick: () => router.push('/dashboards/student/attendance') },
    { icon: BarChart2,     label: 'My Results',     desc: 'View marks & grades',          ac:'#2563EB', bg:'#EFF6FF', ic:'#2563EB', onClick: () => router.push('/dashboards/student/results') },
    { icon: FileText,      label: 'Assignments',    desc: 'View pending tasks',           ac:'#9333EA', bg:'#FDF4FF', ic:'#9333EA', onClick: () => router.push('/dashboards/student/assignments') },
    { icon: Bell,          label: 'Notifications',  desc: 'Announcements & alerts',       ac:'#F97316', bg:'#FFF7ED', ic:'#EA580C', onClick: () => router.push('/dashboards/student/notifications') },
    { icon: CalendarCheck, label: 'Leave Request',  desc: 'Apply for leave',              ac:'#DC2626', bg:'#FEF2F2', ic:'#DC2626', onClick: () => router.push('/dashboards/student/leave') },
    { icon: Library,       label: 'Resources',      desc: 'Study materials & notes',      ac:'#CA8A04', bg:'#FEFCE8', ic:'#CA8A04', onClick: () => router.push('/dashboards/student/resources') },
    { icon: BookOpen,      label: 'Exam Schedule',  desc: 'Dates, halls & syllabus',      ac:'#7C3AED', bg:'#F5F3FF', ic:'#7C3AED', onClick: () => router.push('/dashboards/student/exams') },
    { icon: MessageSquare, label: 'Contact Faculty',desc: 'Message your teachers',        ac:'#0891B2', bg:'#ECFEFF', ic:'#0891B2', onClick: () => router.push('/dashboards/student/contact') },
    { icon: Trophy,        label: 'Achievements',   desc: 'Awards & certificates',       ac:'#D97706', bg:'#FFFBEB', ic:'#D97706', onClick: () => router.push('/dashboards/student/achievements') },
    { icon: FlaskConical,  label: 'Lab Reports',    desc: 'Practical submissions',        ac:'#E11D48', bg:'#FFF0F3', ic:'#E11D48', onClick: () => router.push('/dashboards/student/lab-reports') },
    { icon: Wallet,        label: 'Fee Portal',     desc: 'Payments & receipts',          ac:'#059669', bg:'#F0FDF4', ic:'#059669', onClick: () => router.push('/dashboards/student/fees') },
    { icon: Star,          label: 'Awards',         desc: 'Recognitions & badges',        ac:'#B45309', bg:'#FFFBEB', ic:'#B45309', onClick: () => router.push('/dashboards/student/awards') },
    { icon: Megaphone,     label: 'Events & Clubs', desc: 'Campus activities',            ac:'#F43F5E', bg:'#FFF1F2', ic:'#F43F5E', onClick: () => router.push('/dashboards/student/events') },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;0,9..144,900;1,9..144,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        *{font-family:'Plus Jakarta Sans',sans-serif;box-sizing:border-box}
        .serif{font-family:'Fraunces',Georgia,serif!important}
        @keyframes up{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        .s1{animation:up .5s cubic-bezier(.22,.68,0,1.2) .05s both}
        .s2{animation:up .5s cubic-bezier(.22,.68,0,1.2) .15s both}
        .s3{animation:up .5s cubic-bezier(.22,.68,0,1.2) .25s both}
        .s4{animation:up .5s cubic-bezier(.22,.68,0,1.2) .35s both}
        .rise{transition:transform .2s ease,box-shadow .2s ease}
        .rise:hover{transform:translateY(-2px);box-shadow:0 10px 36px rgba(0,0,0,.09)}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:#CBD5E1;border-radius:4px}
      `}</style>

      <div className="min-h-screen bg-[#F6F4EF]">
        {/* Ambient blobs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full"
            style={{background:'radial-gradient(circle,rgba(99,102,241,.07) 0%,transparent 70%)'}}/>
          <div className="absolute top-1/2 -left-20 w-[350px] h-[350px] rounded-full"
            style={{background:'radial-gradient(circle,rgba(245,158,11,.05) 0%,transparent 70%)'}}/>
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-20">

          {/* ── Top bar ─────────────────────────────── */}
          <div className="flex items-center justify-between mb-7 s1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm"
                style={{background:'linear-gradient(135deg,#4F46E5,#7C3AED)'}}>
                <GraduationCap className="h-4 w-4 text-white"/>
              </div>
              <span className="font-bold text-sm text-gray-500 tracking-wide">
                {loading ? '···' : (profile?.batches?.programs?.schools?.name || 'Student Portal')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[11px] text-gray-400">
                  {now && now.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
                </span>
                <span className="font-bold text-sm text-gray-700 serif">
                  {now && now.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit',hour12:true})}
                </span>
              </div>
              <button onClick={signOut}
                className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-full hover:bg-white/80">
                <LogOut className="h-3.5 w-3.5"/> Sign out
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════
              PROFILE HERO
          ══════════════════════════════════════════ */}
          <section className="s2 mb-7">
            <div className="max-w-4xl mx-auto overflow-hidden relative"
              style={{
                background:'linear-gradient(135deg,#F8F9FA 0%,#E9ECEF 100%)',
                boxShadow:'0 8px 32px rgba(0,0,0,.08)',
                border:'1.5px solid #E5E7EB'
              }}>
              {/* BG effects */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
                style={{backgroundImage:'linear-gradient(rgba(100,100,100,1) 1px,transparent 1px),linear-gradient(90deg,rgba(100,100,100,1) 1px,transparent 1px)',backgroundSize:'30px 30px'}}/>

              <div className="relative px-6 sm:px-8 py-6">
                <div className="flex items-center gap-5">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 overflow-hidden shadow-lg"
                      style={{border:'2px solid white'}}>
                      <div className="w-full h-full flex items-center justify-center text-xl font-black text-white"
                        style={{background:'linear-gradient(135deg,#6366F1,#8B5CF6)'}}>
                        {loading ? '' : initials}
                      </div>
                    </div>
                    <div className="absolute -bottom-1 -right-1 flex items-center gap-1 bg-emerald-400 px-1.5 py-0.5 shadow-sm">
                      <div className="w-1.5 h-1.5 bg-white animate-pulse"/>
                      <span className="text-[9px] font-black text-emerald-900">ONLINE</span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <g.Icon className="h-4 w-4" style={{color:g.c}}/>
                      <span className="text-xs font-medium text-gray-500">
                        {loading ? '' : g.msg}
                      </span>
                    </div>
                    <h1 className="text-gray-800 mb-2 leading-tight font-bold"
                      style={{fontSize:'clamp(1.3rem,2.5vw,1.8rem)'}}>
                      {loading ? <span className="opacity-20">···············</span> : profile?.name}
                    </h1>
                    <div className="flex flex-wrap gap-2">
                      {[
                        {I:Building2, v:profile?.batches?.programs?.schools?.name, c:'#6366F1'},
                        {I:BookOpen,  v:profile?.batches?.programs?.name, c:'#8B5CF6'},
                        {I:Layers,    v:profile?.batches?.name, c:'#EC4899'},
                      ].filter(t=>t.v).map(({I,v,c},i)=>(
                        <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold bg-white shadow-sm border border-gray-100">
                          <I className="h-3 w-3" style={{color:c}}/>
                          <span className="text-gray-700">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quick stats */}
                  <div className="hidden lg:flex gap-3">
                    {[
                      {I:Hash,        label:'Roll',    v:profile?.roll_number, c:'#6366F1'},
                      {I:BookMarked,  label:'Sem',     v:profile?.semester, c:'#8B5CF6'},
                      {I:CalendarDays,label:'Year',    v:profile?.batches?.academic_year, c:'#EC4899'},
                    ].map(({I,label,v,c},i)=> v?(
                      <div key={i} className="px-4 py-3 bg-white shadow-sm border border-gray-100 text-center min-w-[80px]">
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <I className="h-3 w-3" style={{color:c}}/>
                          <span className="text-[10px] font-bold uppercase text-gray-400">{label}</span>
                        </div>
                        <div className="font-bold text-gray-800 text-sm">{loading?'···':v}</div>
                      </div>
                    ):null)}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Live class banner */}
          {bannerClass && (
            <div className="mb-5 s2">
              <div className="overflow-hidden"
                style={{background:`linear-gradient(135deg,${EV[bannerClass.eventType]?.bg},white)`,border:`1.5px solid ${EV[bannerClass.eventType]?.dot}30`,boxShadow:`0 4px 20px ${EV[bannerClass.eventType]?.dot}18`}}>
                <div className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-1 self-stretch" style={{background:EV[bannerClass.eventType]?.dot}}/>
                  <div className="flex items-center gap-2">
                    <Pulse/>
                    <span className="text-[11px] font-black uppercase tracking-wider" style={{color:EV[bannerClass.eventType]?.dot}}>Live Now</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-gray-800 text-sm">{bannerClass.subject}</span>
                    <span className="text-gray-400 text-sm mx-2">·</span>
                    <span className="text-gray-500 text-sm">{t12(bannerClass.start)} – {t12(bannerClass.end)}</span>
                    <span className="text-gray-400 text-sm"> · {bannerClass.teacher}</span>
                    {bannerClass.room && <span className="text-gray-400 text-sm"> · {bannerClass.room}</span>}
                  </div>
                  <div className="text-[10px] font-black capitalize px-2.5 py-1"
                    style={{background:EV[bannerClass.eventType]?.chip,color:EV[bannerClass.eventType]?.txt}}>
                    {bannerClass.eventType}
                  </div>
                </div>

                {activeSession && !attendanceMarked && (
                  <div className="flex items-center gap-3 px-5 py-3 border-t"
                    style={{background:'linear-gradient(135deg,#FEF3C7,#FDE68A)',borderColor:'#F59E0B'}}>
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-800 text-xs">Mark Your Attendance</div>
                      <div className="text-[10px] text-gray-600 mt-0.5">Teacher opened window - verify with camera</div>
                    </div>
                    <button onClick={openCaptureModal} disabled={marking}
                      className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors disabled:opacity-50 flex-shrink-0">
                      <Camera className="h-3.5 w-3.5"/>
                      {marking ? 'Capturing...' : 'Mark Now'}
                    </button>
                  </div>
                )}

                {activeSession && attendanceMarked && (
                  <div className="flex items-center gap-3 px-5 py-2.5 border-t"
                    style={{background:'linear-gradient(135deg,#D1FAE5,#A7F3D0)',borderColor:'#10B981'}}>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0"/>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-gray-800 text-xs">Attendance Marked</div>
                      <div className="text-[10px] text-gray-600 mt-0.5">Your presence recorded</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* ══════════════════════════════════════════
              TIMETABLE
          ══════════════════════════════════════════ */}
          <section className="s3 mb-7">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-800 leading-none serif" style={{fontSize:'1.45rem',fontWeight:700}}>
                Timetable
              </h2>
              <span className="text-[12px] text-gray-400 font-medium">{profile?.batches?.name||''}</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

              {/* Today (3/5 cols) */}
              <div className="lg:col-span-3 overflow-hidden rise"
                style={{background:'white',border:'1.5px solid #EEF2FF',boxShadow:'0 4px 20px rgba(0,0,0,.05)'}}>
                {/* Card header */}
                <div className="flex items-center justify-between px-5 pt-4 pb-3.5"
                  style={{borderBottom:'1px solid #F1F5F9'}}>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className={`w-2 h-2 ${todayEvs.length>0?'bg-emerald-400':'bg-gray-200'}`}/>
                      <span className="font-bold text-gray-800 text-sm">Today's Classes</span>
                      {next && (
                        <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 border border-amber-100 ml-1">
                          Next: {t12(next.start)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400">
                      {now && now.toLocaleDateString('en-IN',{weekday:'long',day:'numeric',month:'long'})}
                    </p>
                  </div>
                  <div className="w-9 h-9 flex items-center justify-center font-black text-sm"
                    style={{background:todayEvs.length>0?'#EEF2FF':'#F8FAFC',color:todayEvs.length>0?'#4F46E5':'#94A3B8'}}>
                    {todayEvs.length}
                  </div>
                </div>

                {/* Class rows - simplified timeline view */}
                <div className="max-h-[360px] overflow-y-auto">
                  {loading ? (
                    <div className="p-5 space-y-3">
                      {[1,2,3].map(i=>(
                        <div key={i} className="flex gap-3 animate-pulse">
                          <div className="w-16 h-12 bg-gray-100"/>
                          <div className="flex-1 space-y-2 pt-1">
                            <div className="h-3 bg-gray-100 w-3/4"/>
                            <div className="h-2 bg-gray-100 w-1/2"/>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : todayEvs.length===0 ? (
                    <div className="flex flex-col items-center justify-center py-14">
                      <div className="w-14 h-14 bg-gray-50 flex items-center justify-center mb-3">
                        <Coffee className="h-7 w-7 text-gray-200"/>
                      </div>
                      <p className="font-bold text-gray-300 text-sm">No classes today</p>
                      <p className="text-gray-200 text-xs mt-1">Enjoy your free day!</p>
                    </div>
                  ) : todayEvs.map((ev, idx) => {
                    const c = EV[ev.eventType]||EV.other
                    const isNow = now ? (ev.start<=now && ev.end>=now) : false
                    const done = now ? ev.end<now : false
                    return (
                      <div key={ev.id}
                        className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-slate-50/80 border-b border-gray-50 last:border-0"
                        style={{opacity:done?.7:1}}>
                        {/* Time block */}
                        <div className="flex-shrink-0 text-center px-3 py-2"
                          style={{background:isNow?`${c.dot}10`:'#F8FAFC',border:`1px solid ${isNow?c.dot+'30':'#E5E7EB'}`}}>
                          <div className={`text-xs font-black ${isNow?'':'text-gray-700'}`} style={{color:isNow?c.dot:undefined}}>
                            {t12(ev.start)}
                          </div>
                          <div className="text-[10px] text-gray-400 mt-0.5">to</div>
                          <div className={`text-xs font-black ${isNow?'':'text-gray-700'}`} style={{color:isNow?c.dot:undefined}}>
                            {t12(ev.end)}
                          </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`font-bold text-sm truncate ${isNow?'':'text-gray-800'}`} style={{color:isNow?c.dot:undefined}}>
                              {ev.subject}
                            </span>
                            {ev.subjectCode && (
                              <span className="text-[10px] font-mono text-gray-400 px-1.5 py-0.5 bg-gray-50">
                                {ev.subjectCode}
                              </span>
                            )}
                            {isNow && <Pulse/>}
                            {done && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0"/>}
                          </div>
                          <div className="text-[11px] text-gray-500 mb-1">
                            <span className="font-medium">{ev.teacher}</span>
                            {ev.room&&<span className="text-gray-400"> • {ev.room}</span>}
                          </div>
                          <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1" style={{background:c.bg}}>
                            <BookMarked className="h-3 w-3 flex-shrink-0" style={{color:c.dot}}/>
                            <span className="text-[10px] font-medium truncate" style={{color:c.txt}}>
                              {ev.lessonTopic || 'Topic will be updated'}
                            </span>
                          </div>
                        </div>

                        {/* Type badge */}
                        <div className="text-[9.5px] font-black px-2.5 py-1 flex-shrink-0 capitalize"
                          style={{background:c.chip,color:c.txt}}>
                          {ev.eventType}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Weekly (2/5 cols) */}
              <div className="lg:col-span-2 overflow-hidden rise flex flex-col"
                style={{background:'white',border:'1.5px solid #EEF2FF',boxShadow:'0 4px 20px rgba(0,0,0,.05)'}}>
                <div className="flex items-center justify-between px-5 pt-4 pb-3.5 flex-shrink-0"
                  style={{borderBottom:'1px solid #F1F5F9'}}>
                  <div>
                    <div className="font-bold text-gray-800 text-sm mb-0.5">This Week</div>
                    <div className="text-[11px] text-gray-400">
                      {ws.toLocaleDateString('en-IN',{day:'numeric',month:'short'})} – {new Date(ws.getTime()+6*86400000).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}
                    </div>
                  </div>
                  <div className="text-[11px] font-bold text-violet-500 bg-violet-50 px-2.5 py-1 border border-violet-100">
                    {weekEvs.length} total
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3">
                  <div className="space-y-1.5">
                    {days7.map((day, di) => {
                      const devs = weekEvs.filter(e=>sameDay(e.start,day)).sort((a,b)=>a.start.getTime()-b.start.getTime())
                      const today = now ? sameDay(day,now) : false
                      return (
                        <div key={di}
                          className={`overflow-hidden ${today?'ring-2 ring-indigo-300 ring-offset-1':''}`}
                          style={{background:today?'#F5F3FF':'#F8FAFC'}}>
                          <div className="flex items-stretch" style={{minHeight:56}}>
                            {/* Day label */}
                            <div className={`w-[52px] flex-shrink-0 flex flex-col items-center justify-center py-2 ${today?'bg-indigo-600':'bg-white/70 border-r border-gray-100'}`}>
                              <span className={`text-[9px] font-black uppercase tracking-wider ${today?'text-indigo-200':'text-gray-400'}`}>
                                {WLABELS[di]}
                              </span>
                              <span className={`text-[15px] font-black leading-none mt-0.5 ${today?'text-white':'text-gray-700'}`}>
                                {day.getDate()}
                              </span>
                            </div>
                            {/* Events */}
                            <div className="flex-1 flex items-center px-2.5 py-2 gap-1.5 overflow-x-auto">
                              {devs.length===0 ? (
                                <span className="text-[11px] text-gray-300 font-medium">No classes</span>
                              ) : devs.map(ev=>{
                                const c = EV[ev.eventType]||EV.other
                                return (
                                  <div key={ev.id}
                                    className="flex-shrink-0 px-2.5 py-1.5 hover:brightness-95 transition-all cursor-default"
                                    style={{background:c.chip,border:`1px solid ${c.dot}18`,minWidth:76}}>
                                    <div className="font-bold text-[10px] truncate max-w-[80px]" style={{color:c.txt}}>{ev.subject}</div>
                                    <div className="text-[9px] mt-0.5" style={{color:`${c.txt}90`}}>{t12(ev.start)}</div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ══════════════════════════════════════════
              APP CARDS
          ══════════════════════════════════════════ */}
          <section className="s4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-800 leading-none serif" style={{fontSize:'1.45rem',fontWeight:700}}>
                Quick Access
              </h2>
              <span className="text-[12px] text-gray-400 font-medium">{apps.length} features</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {apps.map((a, i) => (
                <AppTile key={i} icon={a.icon} label={a.label} desc={a.desc}
                  badge={undefined} ac={a.ac} bg={a.bg} ic={a.ic} onClick={a.onClick} />
              ))}
            </div>
          </section>

          {showCaptureModal && (
            <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white border border-gray-200 shadow-2xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="font-bold text-gray-800 text-sm">Mark Your Attendance</div>
                  <button onClick={closeCaptureModal} className="p-1 text-gray-400 hover:text-gray-700">
                    <X className="h-4 w-4"/>
                  </button>
                </div>
                <div className="p-4">
                  {!capturePreview ? (
                    <video ref={videoRef} className="w-full h-56 object-cover bg-black" autoPlay muted playsInline />
                  ) : (
                    <img src={capturePreview} alt="Attendance proof" className="w-full h-56 object-cover border border-gray-100" />
                  )}
                  <div className="mt-3 flex gap-2">
                    {!capturePreview && (
                      <button onClick={captureStudentPhoto} className="px-3 py-2 bg-indigo-600 text-white text-xs font-bold">
                        Capture Photo
                      </button>
                    )}
                    {capturePreview && (
                      <button
                        onClick={() => { if (capturePreview) URL.revokeObjectURL(capturePreview); setCapturePreview(null); setCaptureBlob(null) }}
                        className="px-3 py-2 bg-gray-100 text-gray-700 text-xs font-bold">
                        Retake
                      </button>
                    )}
                    <button onClick={markAttendance} disabled={!captureBlob || marking}
                      className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold disabled:opacity-50">
                      {marking ? 'Saving...' : 'Mark Attendance'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Footer */}
          <div className="mt-12 flex items-center justify-between text-[11px] text-gray-300">
            <span>© {new Date().getFullYear()} {profile?.batches?.programs?.schools?.name||'Student Portal'}</span>
            <span>Sem {profile?.semester||'—'} · {profile?.batches?.academic_year||''}</span>
          </div>
        </div>
      </div>
    </>
  )
}




