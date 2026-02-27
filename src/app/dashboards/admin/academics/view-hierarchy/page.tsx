'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Layers, Filter, ChevronRight, Users,
  BookOpen, Building2, Search, X,
  BarChart3, CheckCircle2, Hash, Mail, Phone, User
} from 'lucide-react'
import { Input } from '@/components/ui/input'

interface School { id: string; name: string }
interface Program { id: string; name: string }
interface Group { id: string; name: string }
interface Student {
  id: string; name: string; admission_number: string
  email: string; phone: string | null
}
interface Batch {
  id: string; name: string; academic_year: string
  created_at: string
  schools: { name: string } | null
  programs: { name: string } | null
  groups: { name: string } | null
  students: Student[]
}

export default function ViewHierarchyPage() {
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  const [filters, setFilters] = useState({
    school_id: '', program_id: '', group_id: '', academic_year: '', search: ''
  })

  const [expandedBatch, setExpandedBatch] = useState<string | null>(null)
  const [studentSearch, setStudentSearch] = useState<Record<string, string>>({})

  useEffect(() => {
    supabase.from('schools').select('id, name').order('name').then(({ data }) => setSchools(data || []))
    fetchBatches()
  }, [])

  useEffect(() => {
    if (filters.school_id) {
      setFilters(f => ({ ...f, program_id: '', group_id: '' }))
      setPrograms([]); setGroups([])
      supabase.from('programs').select('id, name').eq('school_id', filters.school_id).order('name').then(({ data }) => setPrograms(data || []))
    } else {
      setPrograms([]); setGroups([])
      setFilters(f => ({ ...f, program_id: '', group_id: '' }))
    }
  }, [filters.school_id])

  useEffect(() => {
    if (filters.program_id && filters.school_id) {
      setFilters(f => ({ ...f, group_id: '' }))
      setGroups([])
      supabase.from('groups').select('id, name').eq('school_id', filters.school_id).eq('program_id', filters.program_id).order('name').then(({ data }) => setGroups(data || []))
    } else {
      setGroups([])
      setFilters(f => ({ ...f, group_id: '' }))
    }
  }, [filters.program_id])

  const setFilter = (key: string, val: string) => setFilters(f => ({ ...f, [key]: val }))

  const fetchBatches = async () => {
    setLoading(true)
    let query = supabase
      .from('batches')
      .select(`
        id, name, academic_year, created_at,
        schools(name),
        programs(name),
        groups(name),
        students(id, name, admission_number, email, phone)
      `)
      .order('created_at', { ascending: false })

    if (filters.school_id) query = query.eq('school_id', filters.school_id)
    if (filters.program_id) query = query.eq('program_id', filters.program_id)
    if (filters.group_id) query = query.eq('group_id', filters.group_id)
    if (filters.academic_year.trim()) query = query.eq('academic_year', filters.academic_year.trim())

    const { data, error } = await query
    if (!error) setBatches((data as any) || [])
    setFetched(true)
    setLoading(false)
  }

  const clearFilters = () => {
    setFilters({ school_id: '', program_id: '', group_id: '', academic_year: '', search: '' })
    setPrograms([]); setGroups([])
  }

  const filteredBatches = batches.filter(b => {
    if (!filters.search.trim()) return true
    const q = filters.search.toLowerCase()
    return (
      b.name.toLowerCase().includes(q) ||
      (b.schools as any)?.name?.toLowerCase().includes(q) ||
      (b.programs as any)?.name?.toLowerCase().includes(q) ||
      (b.groups as any)?.name?.toLowerCase().includes(q)
    )
  })

  const totalStudents = filteredBatches.reduce((sum, b) => sum + b.students.length, 0)
  const maxStudents = Math.max(...filteredBatches.map(b => b.students.length), 1)

  const getStudentsFiltered = (batch: Batch) => {
    const q = (studentSearch[batch.id] || '').toLowerCase()
    if (!q) return batch.students
    return batch.students.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.admission_number.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    )
  }

  const selectClass = "border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 bg-white disabled:opacity-40 disabled:cursor-not-allowed"

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-[#faf8f3] to-[#f0ebe0] shadow-md overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(#666 1px, transparent 1px), linear-gradient(90deg, #666 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />
        <div className="relative max-w-6xl mx-auto px-8 py-10">
          <button
            onClick={() => router.push('/dashboards/admin/academics')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors mb-6 text-sm"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Academic
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-cyan-600 flex items-center justify-center shadow-lg">
                <BarChart3 className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">View Academic Hierarchy</h1>
                <p className="text-gray-500 text-sm mt-1">Browse batches, students, and academic structure</p>
              </div>
            </div>
            {fetched && (
              <div className="flex gap-4">
                <div className="bg-white/70 backdrop-blur px-5 py-3 shadow-sm text-center">
                  <div className="text-2xl font-black text-cyan-600">{filteredBatches.length}</div>
                  <div className="text-xs text-gray-500 font-medium">Batches</div>
                </div>
                <div className="bg-white/70 backdrop-blur px-5 py-3 shadow-sm text-center">
                  <div className="text-2xl font-black text-violet-600">{totalStudents}</div>
                  <div className="text-xs text-gray-500 font-medium">Students</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Filters */}
        <div className="bg-white shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
              <Filter className="h-4 w-4 text-cyan-600" /> Filters
            </div>
            {(filters.school_id || filters.program_id || filters.group_id || filters.academic_year) && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
              >
                <X className="h-3 w-3" /> Clear All
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <select
              value={filters.school_id}
              onChange={e => setFilter('school_id', e.target.value)}
              className={selectClass}
            >
              <option value="">All Schools</option>
              {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>

            <select
              value={filters.program_id}
              onChange={e => setFilter('program_id', e.target.value)}
              disabled={!filters.school_id}
              className={selectClass}
            >
              <option value="">All Programs</option>
              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            <select
              value={filters.group_id}
              onChange={e => setFilter('group_id', e.target.value)}
              disabled={!filters.program_id}
              className={selectClass}
            >
              <option value="">All Groups</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>

            <Input
              type="text"
              value={filters.academic_year}
              onChange={e => setFilter('academic_year', e.target.value)}
              placeholder="Academic Year"
              className="rounded-none border-gray-200 focus-visible:ring-cyan-400 text-sm"
            />

            <button
              type="button"
              onClick={fetchBatches}
              className="bg-cyan-600 text-white px-4 py-2.5 text-sm font-semibold hover:bg-cyan-700 transition-colors flex items-center justify-center gap-2"
            >
              {loading
                ? <span className="inline-block animate-spin">↻</span>
                : <Filter className="h-4 w-4" />
              }
              Apply
            </button>
          </div>

          {/* Search within results */}
          {fetched && (
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
              <Input
                type="text"
                value={filters.search}
                onChange={e => setFilter('search', e.target.value)}
                placeholder="Search batches by name, school, program, group..."
                className="pl-9 rounded-none border-gray-200 focus-visible:ring-cyan-400 bg-gray-50 text-sm"
              />
            </div>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div className="bg-white shadow-sm p-16 text-center">
            <div className="text-4xl mb-3 animate-spin inline-block text-cyan-500">↻</div>
            <p className="text-gray-400 text-sm">Loading batches...</p>
          </div>
        ) : !fetched ? null : filteredBatches.length === 0 ? (
          <div className="bg-white shadow-sm p-16 text-center">
            <Layers className="h-12 w-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No batches found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or create a batch first.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBatches.map(batch => {
              const isExpanded = expandedBatch === batch.id
              const filteredStudents = getStudentsFiltered(batch)
              const studentCount = batch.students.length

              return (
                <div key={batch.id} className="bg-white shadow-sm overflow-hidden">
                  {/* Batch Header — plain <button> for correct layout */}
                  <button
                    type="button"
                    onClick={() => {
                      setExpandedBatch(isExpanded ? null : batch.id)
                      setStudentSearch(prev => ({ ...prev, [batch.id]: '' }))
                    }}
                    className="w-full text-left p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-1.5 h-14 bg-cyan-500 flex-shrink-0" />
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-lg font-bold text-gray-800">{batch.name}</h3>
                            <span className="text-xs bg-cyan-50 text-cyan-700 border border-cyan-100 px-2 py-0.5 font-semibold">
                              {batch.academic_year}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {(batch.schools as any)?.name || '—'}
                            </span>
                            <span className="text-gray-300">›</span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="h-3 w-3" />
                              {(batch.programs as any)?.name || '—'}
                            </span>
                            <span className="text-gray-300">›</span>
                            <span className="flex items-center gap-1">
                              <GitBranchIcon />
                              {(batch.groups as any)?.name || '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-4 text-center">
                          <div>
                            <div className="text-xl font-black text-gray-800">{studentCount}</div>
                            <div className="text-xs text-gray-400">Students</div>
                          </div>
                          <div className="text-xs bg-green-50 text-green-700 px-2 py-1 font-semibold border border-green-100 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Active
                          </div>
                        </div>
                        <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>

                    {/* Relative progress bar */}
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex-1 bg-gray-100 h-1.5">
                        <div
                          className="h-1.5 bg-cyan-400 transition-all duration-500"
                          style={{ width: `${Math.min(100, (studentCount / maxStudents) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{studentCount} enrolled</span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {/* Info row */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-b border-gray-100">
                        <div className="p-4 border-r border-gray-100">
                          <div className="text-xs text-gray-400 mb-0.5">School</div>
                          <div className="text-sm font-semibold text-gray-700">{(batch.schools as any)?.name || '—'}</div>
                        </div>
                        <div className="p-4 border-r border-gray-100">
                          <div className="text-xs text-gray-400 mb-0.5">Program</div>
                          <div className="text-sm font-semibold text-gray-700">{(batch.programs as any)?.name || '—'}</div>
                        </div>
                        <div className="p-4 border-r border-gray-100">
                          <div className="text-xs text-gray-400 mb-0.5">Group / Dept</div>
                          <div className="text-sm font-semibold text-gray-700">{(batch.groups as any)?.name || '—'}</div>
                        </div>
                        <div className="p-4">
                          <div className="text-xs text-gray-400 mb-0.5">Created On</div>
                          <div className="text-sm font-semibold text-gray-700">
                            {new Date(batch.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      {/* Per-batch student search */}
                      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-700">
                          <Users className="h-4 w-4 text-cyan-600" />
                          Students in this batch
                          <span className="bg-cyan-50 text-cyan-700 text-xs px-2 py-0.5 font-semibold border border-cyan-100">
                            {studentCount}
                          </span>
                        </div>
                        {studentCount > 0 && (
                          <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none z-10" />
                            <Input
                              type="text"
                              value={studentSearch[batch.id] || ''}
                              onChange={e => setStudentSearch(prev => ({ ...prev, [batch.id]: e.target.value }))}
                              placeholder="Search students..."
                              className="pl-8 rounded-none border-gray-200 focus-visible:ring-cyan-400 bg-gray-50 text-xs"
                            />
                          </div>
                        )}
                      </div>

                      {studentCount === 0 ? (
                        <div className="p-10 text-center text-gray-400 text-sm">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          No students assigned to this batch yet.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">#</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                  <span className="flex items-center gap-1"><User className="h-3 w-3" /> Name</span>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                  <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> Admission No.</span>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                                  <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</span>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredStudents.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-xs">
                                    No students match your search.
                                  </td>
                                </tr>
                              ) : (
                                filteredStudents.map((student, idx) => (
                                  <tr key={student.id} className="border-b border-gray-50 hover:bg-cyan-50/30 transition-colors">
                                    <td className="px-6 py-3.5 text-gray-400 text-xs font-medium">{idx + 1}</td>
                                    <td className="px-6 py-3.5">
                                      <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 bg-cyan-100 flex items-center justify-center text-xs font-bold text-cyan-700 flex-shrink-0">
                                          {student.name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-semibold text-gray-800">{student.name}</span>
                                      </div>
                                    </td>
                                    <td className="px-6 py-3.5">
                                      <span className="bg-gray-100 text-gray-600 px-2 py-0.5 text-xs font-mono">
                                        {student.admission_number}
                                      </span>
                                    </td>
                                    <td className="px-6 py-3.5 text-gray-500 text-xs">{student.email}</td>
                                    <td className="px-6 py-3.5 text-gray-500 text-xs">
                                      {student.phone || <span className="text-gray-300">—</span>}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>

                          {filteredStudents.length > 0 && (
                            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
                              <span>Showing {filteredStudents.length} of {studentCount} student(s)</span>
                              <span className="text-cyan-600 font-semibold">{batch.name} · {batch.academic_year}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function GitBranchIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  )
}
