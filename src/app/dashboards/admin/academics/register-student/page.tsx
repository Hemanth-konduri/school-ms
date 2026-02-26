'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, CheckCircle } from 'lucide-react'

interface School { id: string; name: string }
interface Program { id: string; name: string }
interface Group { id: string; name: string }

export default function RegisterStudentPage() {
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [form, setForm] = useState({
    name: '', admission_number: '', email: '', phone: '',
    school_id: '', program_id: '', group_id: '', academic_year: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    supabase.from('schools').select('id, name').order('name').then(({ data }) => setSchools(data || []))
  }, [])

  useEffect(() => {
    if (form.school_id) {
      setForm(f => ({ ...f, program_id: '', group_id: '' }))
      setPrograms([]); setGroups([])
      supabase.from('programs').select('id, name').eq('school_id', form.school_id).order('name').then(({ data }) => setPrograms(data || []))
    }
  }, [form.school_id])

  useEffect(() => {
    if (form.program_id && form.school_id) {
      setForm(f => ({ ...f, group_id: '' }))
      setGroups([])
      supabase.from('groups').select('id, name').eq('school_id', form.school_id).eq('program_id', form.program_id).order('name').then(({ data }) => setGroups(data || []))
    }
  }, [form.program_id])

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const handleSubmit = async () => {
    setError(''); setSuccess('')
    const { name, admission_number, email, school_id, program_id, group_id, academic_year } = form
    if (!name || !admission_number || !email || !school_id || !program_id || !group_id || !academic_year)
      return setError('Please fill all required fields.')

    setLoading(true)
    const { error: err } = await supabase.from('students').insert({
      name: name.trim(),
      admission_number: admission_number.trim(),
      email: email.trim(),
      phone: form.phone.trim() || null,
      school_id, program_id, group_id,
      academic_year: academic_year.trim(),
      batch_id: null
    })
    setLoading(false)
    if (err) {
      if (err.message.includes('admission_number')) return setError('Admission number already exists.')
      if (err.message.includes('email')) return setError('Email already registered.')
      return setError(err.message)
    }
    setSuccess(`Student "${name}" registered successfully!`)
    setForm({ name: '', admission_number: '', email: '', phone: '', school_id: '', program_id: '', group_id: '', academic_year: '' })
  }

  const inputClass = "w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 bg-gray-50"
  const selectClass = "w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 bg-gray-50 disabled:opacity-50"
  const labelClass = "block text-sm font-semibold text-gray-700 mb-2"

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      <div className="relative bg-gradient-to-br from-[#faf8f3] to-[#f0ebe0] shadow-md overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(#666 1px, transparent 1px), linear-gradient(90deg, #666 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />
        <div className="relative max-w-3xl mx-auto px-8 py-10">
          <button onClick={() => router.push('/dashboard/academic')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors mb-6 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to Academic
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-600 flex items-center justify-center shadow-lg">
              <UserPlus className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Register Student</h1>
              <p className="text-gray-500 text-sm mt-1">Add a student — batch will be assigned separately</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-10">
        <div className="bg-white shadow-sm p-8">
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> {success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
            <div>
              <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. John Doe" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Admission Number <span className="text-red-500">*</span></label>
              <input type="text" value={form.admission_number} onChange={e => set('admission_number', e.target.value)} placeholder="e.g. ADM2024001" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Email <span className="text-red-500">*</span></label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="student@example.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Phone</label>
              <input type="text" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="e.g. +91 9876543210" className={inputClass} />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-6 mb-6">
            <h3 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4">Academic Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>School <span className="text-red-500">*</span></label>
                <select value={form.school_id} onChange={e => set('school_id', e.target.value)} className={selectClass}>
                  <option value="">-- Select School --</option>
                  {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Program <span className="text-red-500">*</span></label>
                <select value={form.program_id} onChange={e => set('program_id', e.target.value)} disabled={!form.school_id} className={selectClass}>
                  <option value="">-- Select Program --</option>
                  {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Group / Department <span className="text-red-500">*</span></label>
                <select value={form.group_id} onChange={e => set('group_id', e.target.value)} disabled={!form.program_id} className={selectClass}>
                  <option value="">-- Select Group --</option>
                  {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Academic Year <span className="text-red-500">*</span></label>
                <input type="text" value={form.academic_year} onChange={e => set('academic_year', e.target.value)} placeholder="e.g. 2024-2025" className={inputClass} />
              </div>
            </div>
          </div>

          <div className="bg-orange-50 border border-orange-100 p-3 text-xs text-orange-700 mb-6">
            ⚠ Batch will not be assigned during registration. Use "Create Batches & Assign Students" to assign batches later.
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-orange-600 text-white py-3 font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register Student'}
          </button>
        </div>
      </div>
    </div>
  )
}
