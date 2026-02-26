'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Layers, CheckCircle, Search, Users } from 'lucide-react'

interface School { id: string; name: string }
interface Program { id: string; name: string }
interface Group { id: string; name: string }
interface Student { id: string; name: string; admission_number: string; email: string }

export default function BatchesPage() {
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [form, setForm] = useState({ academic_year: '', batch_name: '', school_id: '', program_id: '', group_id: '' })
  const [studentsLoaded, setStudentsLoaded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    supabase.from('schools').select('id, name').order('name').then(({ data }) => setSchools(data || []))
  }, [])

  useEffect(() => {
    if (form.school_id) {
      setForm(f => ({ ...f, program_id: '', group_id: '' }))
      setPrograms([]); setGroups([]); resetStudents()
      supabase.from('programs').select('id, name').eq('school_id', form.school_id).order('name').then(({ data }) => setPrograms(data || []))
    }
  }, [form.school_id])

  useEffect(() => {
    if (form.program_id && form.school_id) {
      setForm(f => ({ ...f, group_id: '' }))
      setGroups([]); resetStudents()
      supabase.from('groups').select('id, name').eq('school_id', form.school_id).eq('program_id', form.program_id).order('name').then(({ data }) => setGroups(data || []))
    }
  }, [form.program_id])

  useEffect(() => {
    if (form.group_id) resetStudents()
  }, [form.group_id])

  const resetStudents = () => {
    setStudents([]); setSelected(new Set()); setStudentsLoaded(false)
  }

  const set = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }))

  const fetchStudents = async () => {
    setError('')
    const { academic_year, school_id, program_id, group_id } = form
    if (!academic_year || !school_id || !program_id || !group_id)
      return setError('Please fill academic year and all dropdowns first.')

    const { data, error: err } = await supabase
      .from('students')
      .select('id, name, admission_number, email')
      .eq('school_id', school_id)
      .eq('program_id', program_id)
      .eq('group_id', group_id)
      .eq('academic_year', academic_year)
      .is('batch_id', null)
      .order('name')

    if (err) return setError(err.message)
    setStudents(data || [])
    setStudentsLoaded(true)
    setSelected(new Set())
  }

  const toggleStudent = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    const filtered = filteredStudents()
    if (selected.size === filtered.length) setSelected(new Set())
    else setSelected(new Set(filtered.map(s => s.id)))
  }

  const filteredStudents = () => {
    if (!searchQuery.trim()) return students
    const q = searchQuery.toLowerCase()
    return students.filter(s => s.name.toLowerCase().includes(q) || s.admission_number.toLowerCase().includes(q))
  }

  const handleCreate = async () => {
    setError(''); setSuccess('')
    const { batch_name, academic_year, school_id, program_id, group_id } = form
    if (!batch_name.trim()) return setError('Batch name is required.')
    if (selected.size === 0) return setError('Select at least one student.')

    setLoading(true)
    // Create batch
    const { data: batch, error: batchErr } = await supabase
      .from('batches')
      .insert({ name: batch_name.trim(), academic_year, school_id, program_id, group_id })
      .select()
      .single()

    if (batchErr) {
      setLoading(false)
      return setError(batchErr.message.includes('unique') ? `Batch "${batch_name}" already exists for this group/year.` : batchErr.message)
    }

    // Assign students
    const { error: updateErr } = await supabase
      .from('students')
      .update({ batch_id: batch.id })
      .in('id', Array.from(selected))

    setLoading(false)
    if (updateErr) return setError('Batch created but failed to assign students: ' + updateErr.message)

    setSuccess(`Batch "${batch_name}" created and ${selected.size} student(s) assigned!`)
    setForm(f => ({ ...f, batch_name: '' }))
    resetStudents()
  }

  const filtered = filteredStudents()
  const allSelected = filtered.length > 0 && filtered.every(s => selected.has(s.id))

  const inputClass = "border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 bg-gray-50"
  const selectClass = "border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400 bg-gray-50 disabled:opacity-50"
  const labelClass = "block text-sm font-semibold text-gray-700 mb-2"

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      <div className="relative bg-gradient-to-br from-[#faf8f3] to-[#f0ebe0] shadow-md overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(#666 1px, transparent 1px), linear-gradient(90deg, #666 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />
        <div className="relative max-w-5xl mx-auto px-8 py-10">
          <button onClick={() => router.push('/dashboard/academic')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors mb-6 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to Academic
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-violet-600 flex items-center justify-center shadow-lg">
              <Layers className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Create Batch & Assign Students</h1>
              <p className="text-gray-500 text-sm mt-1">Form batches and bulk-assign unassigned students</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10">
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4" /> {success}
          </div>
        )}

        {/* Batch Config */}
        <div className="bg-white shadow-sm p-8 mb-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Batch Configuration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-5">
            <div>
              <label className={labelClass}>Academic Year <span className="text-red-500">*</span></label>
              <input type="text" value={form.academic_year} onChange={e => set('academic_year', e.target.value)} placeholder="e.g. 2024-2025" className={`w-full ${inputClass}`} />
            </div>
            <div>
              <label className={labelClass}>Batch Name <span className="text-red-500">*</span></label>
              <input type="text" value={form.batch_name} onChange={e => set('batch_name', e.target.value)} placeholder="e.g. CSE-1" className={`w-full ${inputClass}`} />
            </div>
            <div>
              <label className={labelClass}>School <span className="text-red-500">*</span></label>
              <select value={form.school_id} onChange={e => set('school_id', e.target.value)} className={`w-full ${selectClass}`}>
                <option value="">-- Select School --</option>
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Program <span className="text-red-500">*</span></label>
              <select value={form.program_id} onChange={e => set('program_id', e.target.value)} disabled={!form.school_id} className={`w-full ${selectClass}`}>
                <option value="">-- Select Program --</option>
                {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Group <span className="text-red-500">*</span></label>
              <select value={form.group_id} onChange={e => set('group_id', e.target.value)} disabled={!form.program_id} className={`w-full ${selectClass}`}>
                <option value="">-- Select Group --</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
          </div>
          <button
            onClick={fetchStudents}
            className="bg-gray-800 text-white px-6 py-3 text-sm font-semibold hover:bg-gray-900 transition-colors flex items-center gap-2"
          >
            <Users className="h-4 w-4" />
            Fetch Unassigned Students
          </button>
        </div>

        {/* Students Table */}
        {studentsLoaded && (
          <div className="bg-white shadow-sm p-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-800">
                  Unassigned Students
                  {students.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-500">({students.length} found)</span>
                  )}
                </h2>
                {selected.size > 0 && (
                  <div className="text-sm text-violet-600 font-semibold mt-0.5">Selected: {selected.size} student(s)</div>
                )}
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name or roll no..."
                  className="border border-gray-200 pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-violet-400 bg-gray-50 w-64"
                />
              </div>
            </div>

            {students.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No unassigned students found for this combination.</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            className="accent-violet-600 w-4 h-4"
                          />
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">#</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Name</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Admission No.</th>
                        <th className="px-4 py-3 text-left font-semibold text-gray-600">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((s, i) => (
                        <tr
                          key={s.id}
                          onClick={() => toggleStudent(s.id)}
                          className={`border-b border-gray-50 cursor-pointer transition-colors ${selected.has(s.id) ? 'bg-violet-50' : 'hover:bg-gray-50'}`}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected.has(s.id)}
                              onChange={() => toggleStudent(s.id)}
                              onClick={e => e.stopPropagation()}
                              className="accent-violet-600 w-4 h-4"
                            />
                          </td>
                          <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                          <td className="px-4 py-3 font-medium text-gray-800">{s.name}</td>
                          <td className="px-4 py-3 text-gray-600">{s.admission_number}</td>
                          <td className="px-4 py-3 text-gray-500">{s.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {selected.size > 0 ? (
                      <span className="text-violet-700 font-semibold">{selected.size} student(s) selected</span>
                    ) : (
                      'No students selected'
                    )}
                  </div>
                  <button
                    onClick={handleCreate}
                    disabled={loading || selected.size === 0}
                    className="bg-violet-600 text-white px-8 py-3 font-semibold hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <Layers className="h-4 w-4" />
                    {loading ? 'Creating...' : `Create Batch & Assign ${selected.size > 0 ? `(${selected.size})` : ''}`}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
