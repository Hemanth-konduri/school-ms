'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  GraduationCap, LogOut, Camera, Clock3, Users, UserCheck, UserMinus,
  Hourglass, ShieldCheck, AlertTriangle, CalendarDays, BookOpen, FileText,
  Bell, ClipboardCheck, ChevronRight, X
} from 'lucide-react'

interface TeacherProfile {
  id: string
  name: string
  email: string
  designation: string | null
  department: string | null
}

interface TeacherClass {
  id: string
  batch_id: string
  subject_id: string | null
  start: Date
  end: Date
  room: string | null
  eventType: string
  notes: string | null
  subjectName: string
}

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

const t12 = (d: Date) => d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }).toUpperCase()

function AppTile({ icon: Icon, title, desc, ac, bg, onClick }: {
  icon: any
  title: string
  desc: string
  ac: string
  bg: string
  onClick?: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col p-4 text-left overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-xl active:scale-[0.97]"
      style={{ background: bg, border: `1.5px solid ${ac}26` }}
    >
      <div className="w-10 h-10 flex items-center justify-center mb-3" style={{ background: `${ac}16` }}>
        <Icon className="h-[18px] w-[18px]" style={{ color: ac }} />
      </div>
      <div className="font-bold text-[12.5px] text-gray-800 leading-snug mb-0.5">{title}</div>
      <div className="text-gray-400 text-[10.5px] leading-snug">{desc}</div>
      <div className="mt-2.5 flex items-center gap-0.5 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: ac }}>
        Open <ChevronRight className="h-3 w-3" />
      </div>
    </button>
  )
}

export default function TeacherDashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')
  const [now, setNow] = useState<Date | null>(null)
  const [profile, setProfile] = useState<TeacherProfile | null>(null)
  const [todayClasses, setTodayClasses] = useState<TeacherClass[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string>('')
  const [teacherMarkedAt, setTeacherMarkedAt] = useState<Date | null>(null)
  const [studentWindowEndsAt, setStudentWindowEndsAt] = useState<Date | null>(null)
  const [proofPath, setProofPath] = useState<string | null>(null)
  const [analytics, setAnalytics] = useState({ total: 0, marked: 0, pending: 0, absent: 0, manual: 0 })
  const [manualMarkedStudents, setManualMarkedStudents] = useState<string[]>([])
  const [attendanceRows, setAttendanceRows] = useState<any[]>([])
  const [batchStudents, setBatchStudents] = useState<any[]>([])
  const [showCaptureModal, setShowCaptureModal] = useState(false)
  const [capturePreview, setCapturePreview] = useState<string | null>(null)
  const [captureBlob, setCaptureBlob] = useState<Blob | null>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    setNow(new Date())
    const tick = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(tick)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: teacher, error } = await supabase
        .from('teachers')
        .select('id,name,email,designation,department')
        .eq('email', user.email)
        .maybeSingle()

      if (error || !teacher) {
        console.error('Teacher fetch failed')
        setLoading(false)
        return
      }

      setProfile({
        id: teacher.id,
        name: teacher.name || 'Teacher',
        email: teacher.email || user.email || '',
        designation: teacher.designation || null,
        department: teacher.department || null
      })

      const dayStart = new Date()
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date()
      dayEnd.setHours(23, 59, 59, 999)

      const { data: events, error: evError } = await supabase
        .from('timetable_events')
        .select('id,batch_id,subject_id,start_time,end_time,room,event_type,notes,status')
        .eq('teacher_id', teacher.id)
        .neq('status', 'cancelled')
        .gte('start_time', dayStart.toISOString())
        .lte('end_time', dayEnd.toISOString())
        .order('start_time', { ascending: true })

      if (evError) {
        console.error('Teacher timetable fetch failed')
        setLoading(false)
        return
      }

      const subjectIds = Array.from(new Set((events || []).map((e: any) => e.subject_id).filter(Boolean)))
      const { data: subjects } = subjectIds.length
        ? await supabase.from('subjects').select('id,name').in('id', subjectIds)
        : { data: [] as any[] }

      const subjectById = new Map<string, string>((subjects || []).map((s: any) => [s.id, s.name]))
      const mapped = (events || []).map((e: any) => ({
        id: e.id,
        batch_id: e.batch_id,
        subject_id: e.subject_id || null,
        start: new Date(e.start_time),
        end: new Date(e.end_time),
        room: e.room || null,
        eventType: e.event_type || 'lecture',
        notes: e.notes || null,
        subjectName: subjectById.get(e.subject_id) || e.notes || 'Scheduled Class'
      }))

      setTodayClasses(mapped.filter((e: TeacherClass) => sameDay(e.start, new Date())))
      if (mapped.length > 0) setSelectedClassId(mapped[0].id)
      setLoading(false)
    }

    init()
  }, [router])

  const selectedClass = useMemo(
    () => todayClasses.find(c => c.id === selectedClassId) || todayClasses[0] || null,
    [todayClasses, selectedClassId]
  )
  const canMarkCurrentPeriod = !!(selectedClass && now && now >= selectedClass.start && now <= selectedClass.end)

  useEffect(() => {
    async function loadSessionAndAnalytics() {
      if (!selectedClass || !profile) {
        setTeacherMarkedAt(null)
        setStudentWindowEndsAt(null)
        setProofPath(null)
        setAnalytics({ total: 0, marked: 0, pending: 0, absent: 0, manual: 0 })
        setManualMarkedStudents([])
        setAttendanceRows([])
        setBatchStudents([])
        return
      }

      const { data: session } = await supabase
        .from('teacher_attendance_sessions')
        .select('marked_at,student_window_ends_at,photo_path')
        .eq('event_id', selectedClass.id)
        .eq('teacher_id', profile.id)
        .maybeSingle()

      setTeacherMarkedAt(session?.marked_at ? new Date(session.marked_at) : null)
      setStudentWindowEndsAt(session?.student_window_ends_at ? new Date(session.student_window_ends_at) : null)
      setProofPath(session?.photo_path || null)

      const { data: students, count: totalCount } = await supabase
        .from('students')
        .select('id,name,roll_number', { count: 'exact' })
        .eq('batch_id', selectedClass.batch_id)

      const { data: records } = await supabase
        .from('student_attendance_records')
        .select('student_id,status,marked_by_teacher_id,photo_path,photo_url,marked_at')
        .eq('event_id', selectedClass.id)

      const studentMap = new Map<string, any>((students || []).map((s: any) => [s.id, s]))
      const rows = records || []
      const withNames = rows.map((r: any) => ({
        ...r,
        studentName: studentMap.get(r.student_id)?.name || 'Student',
        rollNumber: studentMap.get(r.student_id)?.roll_number || ''
      }))
      const presentCount = rows.filter((r: any) => ['present', 'manual_present'].includes(r.status)).length
      const absentCount = rows.filter((r: any) => ['absent', 'manual_absent'].includes(r.status)).length
      const manualRows = rows.filter((r: any) => !!r.marked_by_teacher_id || String(r.status || '').startsWith('manual_'))
      const manualNames = Array.from(new Set(withNames
        .filter((r: any) => !!r.marked_by_teacher_id || String(r.status || '').startsWith('manual_'))
        .map((r: any) => r.studentName)
        .filter(Boolean)))

      const total = totalCount || 0
      const pending = Math.max(total - rows.length, 0)

      setAnalytics({
        total,
        marked: presentCount,
        pending,
        absent: absentCount,
        manual: manualRows.length
      })
      setManualMarkedStudents(manualNames)
      setAttendanceRows(withNames)
      setBatchStudents(students || [])
    }

    loadSessionAndAnalytics()
  }, [selectedClass, profile, refreshTick])

  const windowActive = !!(studentWindowEndsAt && now && now < studentWindowEndsAt)
  const windowSecondsLeft = studentWindowEndsAt && now
    ? Math.max(0, Math.floor((studentWindowEndsAt.getTime() - now.getTime()) / 1000))
    : 0
  const mm = String(Math.floor(windowSecondsLeft / 60)).padStart(2, '0')
  const ss = String(windowSecondsLeft % 60).padStart(2, '0')

  const openCaptureModal = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert('Camera API not available in this browser.')
        return
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      streamRef.current = stream
      setCaptureBlob(null)
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

  const captureSnapshotBlob = async (): Promise<Blob> => {
    if (!videoRef.current) throw new Error('Camera not ready')
    const video = videoRef.current
    try {
      await new Promise(resolve => setTimeout(resolve, 200))

      const width = video.videoWidth || 1280
      const height = video.videoHeight || 720
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Unable to capture image')
      ctx.drawImage(video, 0, 0, width, height)

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (!b) reject(new Error('Image encoding failed'))
          else resolve(b)
        }, 'image/jpeg', 0.9)
      })
      return blob
    } catch {
      throw new Error('Capture failed')
    }
  }

  const takeTeacherPhoto = async () => {
    try {
      const blob = await captureSnapshotBlob()
      if (capturePreview) URL.revokeObjectURL(capturePreview)
      setCaptureBlob(blob)
      setCapturePreview(URL.createObjectURL(blob))
    } catch {
      alert('Failed to capture photo.')
    }
  }

  const requestCameraAndMark = async () => {
    if (!selectedClass || !profile) return
    if (!canMarkCurrentPeriod) {
      alert('You can mark attendance only during that class period.')
      return
    }
    if (!captureBlob) {
      alert('Please capture a photo first.')
      return
    }

    try {
      setMarking(true)
      setStatusMsg('')
      const markedAt = new Date()
      const endAt = new Date(markedAt.getTime() + 5 * 60 * 1000)

      const ts = markedAt.toISOString().replace(/[:.]/g, '-')
      const path = `teacher/${profile.id}/${selectedClass.id}/${ts}.jpg`

      const { error: uploadError } = await supabase
        .storage
        .from('attendance-proofs')
        .upload(path, captureBlob, { contentType: 'image/jpeg', upsert: true })

      if (uploadError) throw uploadError

      const { data: signed } = await supabase
        .storage
        .from('attendance-proofs')
        .createSignedUrl(path, 60 * 60 * 24 * 7)

      const { error: sessionError } = await supabase
        .from('teacher_attendance_sessions')
        .upsert({
          event_id: selectedClass.id,
          teacher_id: profile.id,
          batch_id: selectedClass.batch_id,
          marked_at: markedAt.toISOString(),
          student_window_ends_at: endAt.toISOString(),
          photo_path: path,
          photo_url: signed?.signedUrl || null,
          status: 'active'
        }, { onConflict: 'event_id,teacher_id' })

      if (sessionError) throw sessionError

      setTeacherMarkedAt(markedAt)
      setStudentWindowEndsAt(endAt)
      setProofPath(path)
      setStatusMsg('Attendance marked and proof uploaded.')
      closeCaptureModal()
      setRefreshTick(v => v + 1)
    } catch {
      setStatusMsg('Failed to mark attendance. Check camera permission and RLS/storage policies.')
      alert('Failed to capture/upload attendance proof.')
    } finally {
      setMarking(false)
    }
  }

  const forceCloseWindow = async () => {
    if (!selectedClass || !profile || !now) return
    await supabase
      .from('teacher_attendance_sessions')
      .update({
        student_window_ends_at: now.toISOString(),
        status: 'closed'
      })
      .eq('event_id', selectedClass.id)
      .eq('teacher_id', profile.id)

    setStudentWindowEndsAt(now)
    setStatusMsg('Student attendance window closed.')
    setRefreshTick(v => v + 1)
  }

  const manualAllowed = !!(selectedClass && now && teacherMarkedAt &&
    now >= selectedClass.start &&
    now <= selectedClass.end &&
    now <= new Date(teacherMarkedAt.getTime() + 30 * 60 * 1000))

  const manualMark = async (studentId: string, mode: 'manual_present' | 'manual_absent') => {
    if (!selectedClass || !profile || !manualAllowed) return
    const { error } = await supabase
      .from('student_attendance_records')
      .upsert({
        event_id: selectedClass.id,
        student_id: studentId,
        batch_id: selectedClass.batch_id,
        status: mode,
        marked_at: new Date().toISOString(),
        marked_by_teacher_id: profile.id
      }, { onConflict: 'event_id,student_id' })
    if (!error) setRefreshTick(v => v + 1)
  }
  const signOut = async () => { await supabase.auth.signOut(); router.replace('/login') }

  const apps = [
    { icon: ClipboardCheck, title: 'My Timetable', desc: 'Class periods and substitutions', ac: '#4F46E5', bg: '#EEF2FF', onClick: () => router.push('/dashboards/teacher/timetable') },
    { icon: FileText, title: 'Lesson Plans', desc: 'Plan topics and objectives', ac: '#0891B2', bg: '#ECFEFF' },
    { icon: BookOpen, title: 'Assignments', desc: 'Create and review submissions', ac: '#059669', bg: '#ECFDF5' },
    { icon: Bell, title: 'Announcements', desc: 'Post class updates to students', ac: '#D97706', bg: '#FFFBEB' },
  ]

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#F6F4EF]">Loading...</div>

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;0,9..144,900;1,9..144,400&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');
        *{font-family:'Plus Jakarta Sans',sans-serif;box-sizing:border-box}
        .serif{font-family:'Fraunces',Georgia,serif!important}
        @keyframes up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        .s1{animation:up .45s cubic-bezier(.22,.68,0,1.2) .05s both}
        .s2{animation:up .45s cubic-bezier(.22,.68,0,1.2) .15s both}
        .s3{animation:up .45s cubic-bezier(.22,.68,0,1.2) .25s both}
      `}</style>

      <div className="min-h-screen bg-[#F6F4EF]">
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 pb-20">
          <div className="flex items-center justify-between mb-7 s1">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-sm" style={{ background: 'linear-gradient(135deg,#4F46E5,#7C3AED)' }}>
                <GraduationCap className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-sm text-gray-500 tracking-wide">Teacher Portal</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[11px] text-gray-400">{now && now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                <span className="font-bold text-sm text-gray-700 serif">{now && now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
              </div>
              <button onClick={signOut} className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-700 transition-colors px-3 py-1.5 rounded-full hover:bg-white/80">
                <LogOut className="h-3.5 w-3.5" /> Sign out
              </button>
            </div>
          </div>

          <section className="s2 mb-7">
            <div className="max-w-4xl mx-auto overflow-hidden relative" style={{ background: 'linear-gradient(135deg,#F8F9FA 0%,#E9ECEF 100%)', boxShadow: '0 8px 32px rgba(0,0,0,.08)', border: '1.5px solid #E5E7EB' }}>
              <div className="relative px-6 sm:px-8 py-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center text-xl font-black text-white" style={{ background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}>
                    {(profile?.name || 'T').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-500 mb-1">Classroom Attendance Control Center</p>
                    <h1 className="text-gray-800 mb-2 leading-tight font-bold" style={{ fontSize: 'clamp(1.3rem,2.5vw,1.8rem)' }}>{profile?.name}</h1>
                    <div className="flex flex-wrap gap-2">
                      {profile?.designation && <span className="px-2.5 py-1 text-xs font-semibold bg-white shadow-sm border border-gray-100 text-gray-700">{profile.designation}</span>}
                      {profile?.department && <span className="px-2.5 py-1 text-xs font-semibold bg-white shadow-sm border border-gray-100 text-gray-700">{profile.department}</span>}
                      <span className="px-2.5 py-1 text-xs font-semibold bg-white shadow-sm border border-gray-100 text-gray-700">{profile?.email}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="s3 mb-7">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-800 leading-none serif" style={{ fontSize: '1.45rem', fontWeight: 700 }}>Classroom Attendance System</h2>
              <span className="text-[12px] text-gray-400 font-medium">Teacher-controlled flow</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3 overflow-hidden" style={{ background: 'white', border: '1.5px solid #EEF2FF', boxShadow: '0 4px 20px rgba(0,0,0,.05)' }}>
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-800 text-sm">Class Control</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">1) Teacher check-in 2) Student attendance (5 min) 3) Manual override window (30 min)</div>
                  </div>
                  <ShieldCheck className="h-4 w-4 text-indigo-500" />
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">Select Class Period</label>
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="mt-1.5 w-full border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-indigo-300"
                    >
                      {todayClasses.length === 0 && <option value="">No class periods for today</option>}
                      {todayClasses.map(cls => (
                        <option key={cls.id} value={cls.id}>
                          {cls.subjectName} ({t12(cls.start)} - {t12(cls.end)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedClass && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 border border-gray-100 bg-[#F8FAFC]">
                        <div className="text-[10px] text-gray-400 font-bold uppercase">Subject</div>
                        <div className="text-sm font-bold text-gray-800 mt-0.5">{selectedClass.subjectName}</div>
                      </div>
                      <div className="p-3 border border-gray-100 bg-[#F8FAFC]">
                        <div className="text-[10px] text-gray-400 font-bold uppercase">Time</div>
                        <div className="text-sm font-bold text-gray-800 mt-0.5">{t12(selectedClass.start)} - {t12(selectedClass.end)}</div>
                      </div>
                      <div className="p-3 border border-gray-100 bg-[#F8FAFC]">
                        <div className="text-[10px] text-gray-400 font-bold uppercase">Room</div>
                        <div className="text-sm font-bold text-gray-800 mt-0.5">{selectedClass.room || 'Not assigned'}</div>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 border border-gray-100 bg-[#FCFCFF]">
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Teacher Attendance</div>
                      <div className="mt-1 text-sm font-semibold text-gray-700">
                        {teacherMarkedAt ? `Marked at ${t12(teacherMarkedAt)}` : 'Not marked yet'}
                      </div>
                    </div>
                    <div className="p-3 border border-gray-100 bg-[#FCFCFF]">
                      <div className="text-[10px] text-gray-400 font-bold uppercase">Student Attendance Window</div>
                      <div className="mt-1 text-sm font-semibold text-gray-700">
                        {windowActive ? `Open (${mm}:${ss} left)` : 'Closed'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={openCaptureModal}
                      disabled={!selectedClass || marking || !!teacherMarkedAt || !canMarkCurrentPeriod}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                      style={{ background: '#4F46E5' }}
                    >
                      <Camera className="h-3.5 w-3.5" />
                      {teacherMarkedAt ? 'Already Marked' : !canMarkCurrentPeriod ? 'Available In Period' : 'Mark My Attendance (Camera)'}
                    </button>
                    <button
                      onClick={forceCloseWindow}
                      disabled={!windowActive}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 disabled:opacity-50"
                    >
                      <Clock3 className="h-3.5 w-3.5" />
                      Close Student Window
                    </button>
                    <div className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Manual edit allowed only in-class and up to 30 minutes
                    </div>
                  </div>
                  {proofPath && (
                    <div className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-2">
                      Proof stored: <span className="font-mono">{proofPath}</span>
                    </div>
                  )}
                  {statusMsg && (
                    <div className="text-[11px] text-indigo-700 bg-indigo-50 border border-indigo-100 px-3 py-2">
                      {statusMsg}
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100">
                    <div className="text-[11px] font-bold text-gray-700 mb-2">Manual Attendance</div>
                    <div className="text-[10px] text-gray-500 mb-2">
                      {manualAllowed ? 'You can manually update now.' : 'Manual update is available only during class and within 30 minutes after teacher marking.'}
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1.5">
                      {batchStudents.map((s: any) => {
                        const row = attendanceRows.find((r: any) => r.student_id === s.id)
                        return (
                          <div key={s.id} className="flex items-center gap-2 bg-[#F8FAFC] border border-gray-100 px-2 py-1.5">
                            <div className="flex-1 min-w-0">
                              <div className="text-[11px] font-semibold text-gray-700 truncate">{s.name}</div>
                              <div className="text-[10px] text-gray-400">{s.roll_number || ''} {row?.status ? `• ${row.status}` : '• not marked'}</div>
                            </div>
                            <button disabled={!manualAllowed} onClick={() => manualMark(s.id, 'manual_present')}
                              className="text-[10px] px-2 py-1 bg-emerald-600 text-white font-bold disabled:opacity-40">Present</button>
                            <button disabled={!manualAllowed} onClick={() => manualMark(s.id, 'manual_absent')}
                              className="text-[10px] px-2 py-1 bg-rose-600 text-white font-bold disabled:opacity-40">Absent</button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 overflow-hidden flex flex-col" style={{ background: 'white', border: '1.5px solid #EEF2FF', boxShadow: '0 4px 20px rgba(0,0,0,.05)' }}>
                <div className="px-5 py-4 border-b border-gray-100">
                  <div className="font-bold text-gray-800 text-sm">Live Attendance Analytics</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">Per class period</div>
                </div>
                <div className="p-4 grid grid-cols-2 gap-2.5">
                  {[
                    { k: 'Total', v: analytics.total, icon: Users, c: '#4F46E5', bg: '#EEF2FF' },
                    { k: 'Marked', v: analytics.marked, icon: UserCheck, c: '#059669', bg: '#ECFDF5' },
                    { k: 'Pending', v: analytics.pending, icon: Hourglass, c: '#D97706', bg: '#FFFBEB' },
                    { k: 'Absent', v: analytics.absent, icon: UserMinus, c: '#DC2626', bg: '#FEF2F2' },
                  ].map(item => (
                    <div key={item.k} className="p-3 border border-gray-100" style={{ background: item.bg }}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{item.k}</span>
                        <item.icon className="h-3.5 w-3.5" style={{ color: item.c }} />
                      </div>
                      <div className="text-lg font-black text-gray-800 mt-1">{item.v}</div>
                    </div>
                  ))}
                </div>
                <div className="px-4 pb-4">
                  <div className="p-3 border border-gray-100 bg-[#F8FAFC]">
                    <div className="text-[11px] font-bold text-gray-700">Manually Marked Students ({analytics.manual})</div>
                    <div className="mt-2 space-y-1.5">
                      {manualMarkedStudents.map(name => (
                        <div key={name} className="text-[11px] text-gray-600 flex items-center justify-between">
                          <span>{name}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-indigo-50 text-indigo-600 border border-indigo-100">Manual</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 border border-gray-100 bg-white mt-3">
                    <div className="text-[11px] font-bold text-gray-700 mb-2">Student Proof Images</div>
                    <div className="max-h-44 overflow-y-auto space-y-2">
                      {attendanceRows.filter((r: any) => r.photo_url || r.photo_path).length === 0 && (
                        <div className="text-[11px] text-gray-400">No student proofs yet</div>
                      )}
                      {attendanceRows.filter((r: any) => r.photo_url || r.photo_path).map((r: any, i: number) => (
                        <div key={`${r.student_id}-${i}`} className="flex items-center gap-2">
                          <img src={r.photo_url || ''} alt={r.studentName} className="w-9 h-9 object-cover border border-gray-200" />
                          <div className="min-w-0">
                            <div className="text-[11px] font-semibold text-gray-700 truncate">{r.studentName}</div>
                            <div className="text-[10px] text-gray-400">{r.status}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {showCaptureModal && (
            <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
              <div className="w-full max-w-md bg-white border border-gray-200 shadow-2xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="font-bold text-gray-800 text-sm">Mark Your Attendance</div>
                  <button onClick={closeCaptureModal} className="p-1 text-gray-400 hover:text-gray-700"><X className="h-4 w-4"/></button>
                </div>
                <div className="p-4">
                  {!capturePreview ? (
                    <video ref={videoRef} className="w-full h-56 object-cover bg-black" autoPlay muted playsInline />
                  ) : (
                    <img src={capturePreview} alt="Teacher proof" className="w-full h-56 object-cover border border-gray-100" />
                  )}
                  <div className="mt-3 flex gap-2">
                    {!capturePreview && (
                      <button onClick={takeTeacherPhoto} className="px-3 py-2 bg-indigo-600 text-white text-xs font-bold">Capture Photo</button>
                    )}
                    {capturePreview && (
                      <button onClick={() => { if (capturePreview) URL.revokeObjectURL(capturePreview); setCapturePreview(null); setCaptureBlob(null) }}
                        className="px-3 py-2 bg-gray-100 text-gray-700 text-xs font-bold">Retake</button>
                    )}
                    <button onClick={requestCameraAndMark} disabled={!captureBlob || marking}
                      className="px-3 py-2 bg-emerald-600 text-white text-xs font-bold disabled:opacity-50">
                      {marking ? 'Saving...' : 'Mark Attendance'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-gray-800 leading-none serif" style={{ fontSize: '1.45rem', fontWeight: 700 }}>Quick Access</h2>
              <span className="text-[12px] text-gray-400 font-medium">Teacher tools</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {apps.map((a, i) => (
                <AppTile key={i} icon={a.icon} title={a.title} desc={a.desc} ac={a.ac} bg={a.bg} onClick={a.onClick} />
              ))}
            </div>
          </section>

          <div className="mt-12 flex items-center justify-between text-[11px] text-gray-300">
            <span>© {new Date().getFullYear()} Teacher Portal</span>
            <span className="flex items-center gap-1"><CalendarDays className="h-3 w-3" /> Attendance-first class workflow</span>
          </div>
        </div>
      </div>
    </>
  )
}
