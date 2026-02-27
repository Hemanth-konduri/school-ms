'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Users, UserPlus, Search, Filter, X,
  Building2, BookOpen, Hash, Mail, Phone, User,
  Layers, ChevronRight, UserCheck, UserX
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface School { id: string; name: string }
interface Program { id: string; name: string }
interface Group { id: string; name: string }
interface Student {
  id: string
  name: string
  admission_number: string
  email: string
  phone: string | null
  academic_year: string
  batch_id: string | null
  schools: { name: string } | null
  programs: { name: string } | null
  groups: { name: string } | null
  batches: { name: string } | null
}

interface BatchGroup {
  batch_id: string | null
  batch_name: string
  students: Student[]
}

export default function ManageStudentsPage() {
  const router = useRouter()

  const [schools, setSchools] = useState<School[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [filters, setFilters] = useState({
    school_id: '', program_id: '', group_id: '', academic_year: '', search: ''
  })
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedBatch, setExpandedBatch] = useState<string | null>('unassigned')

  useEffect(() => {
    supabase.from('schools').select('id, name').order('name').then(({ data }) => setSchools(data || []))
    fetchStudents()
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

  const fetchStudents = async () => {
    setLoading(true)
    let query = supabase
      .from('students')
      .select(`
        id, name, admission_number, email, phone, academic_year, batch_id,
        schools(name),
        programs(name),
        groups(name),
        batches(name)
      `)
      .order('name')

    if (filters.school_id) query = query.eq('school_id', filters.school_id)
    if (filters.program_id) query = query.eq('program_id', filters.program_id)
    if (filters.group_id) query = query.eq('group_id', filters.group_id)
    if (filters.academic_year.trim()) query = query.eq('academic_year', filters.academic_year.trim())

    const { data, error } = await query
    if (!error) setStudents((data as any) || [])
    setLoading(false)
  }

  const clearFilters = () => {
    setFilters({ school_id: '', program_id: '', group_id: '', academic_year: '', search: '' })
    setPrograms([]); setGroups([])
  }

  const searchedStudents = students.filter(s => {
    if (!filters.search.trim()) return true
    const q = filters.search.toLowerCase()
    return (
      s.name.toLowerCase().includes(q) ||
      s.admission_number.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.batches as any)?.name?.toLowerCase().includes(q)
    )
  })

  const totalStudents = searchedStudents.length
  const assignedStudents = searchedStudents.filter(s => s.batch_id).length
  const unassignedStudents = searchedStudents.filter(s => !s.batch_id).length

  const batchGroups: BatchGroup[] = (() => {
    const map = new Map<string, BatchGroup>()
    map.set('unassigned', { batch_id: null, batch_name: 'Unassigned Students', students: [] })
    searchedStudents.forEach(s => {
      if (!s.batch_id) {
        map.get('unassigned')!.students.push(s)
      } else {
        const key = s.batch_id
        if (!map.has(key)) {
          map.set(key, {
            batch_id: s.batch_id,
            batch_name: (s.batches as any)?.name || 'Unknown Batch',
            students: []
          })
        }
        map.get(key)!.students.push(s)
      }
    })
    return Array.from(map.values()).filter(g => g.students.length > 0)
  })()

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-[#faf8f3] to-[#f0ebe0] shadow-md overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(#666 1px, transparent 1px), linear-gradient(90deg, #666 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />
        <div className="relative max-w-6xl mx-auto px-8 py-10">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboards/admin')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 px-0 hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-600 flex items-center justify-center shadow-lg">
                <Users className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Manage Students</h1>
                <p className="text-gray-500 text-sm mt-1">View and manage all registered students</p>
              </div>
            </div>
            <Button
              onClick={() => router.push('/dashboards/admin/academics/register-student')}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-none font-semibold flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Register New Student
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { icon: Users, label: 'Total Students', value: totalStudents, iconColor: 'text-blue-600', bg: 'bg-blue-50' },
            { icon: UserCheck, label: 'Batch Assigned', value: assignedStudents, iconColor: 'text-green-600', bg: 'bg-green-50' },
            { icon: UserX, label: 'Unassigned', value: unassignedStudents, iconColor: 'text-orange-500', bg: 'bg-orange-50' },
          ].map(({ icon: Icon, label, value, iconColor, bg }) => (
            <div key={label} className={`${bg} p-6 shadow-sm flex items-center gap-4`}>
              <div className={`${iconColor} p-3 bg-white/60 shadow-sm`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-black text-gray-800">{value}</div>
                <div className="text-xs text-gray-500 font-medium">{label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <Card className="mb-6 rounded-none shadow-sm border-gray-100">
          <CardHeader className="pb-3 px-6 pt-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-600" /> Filters
              </CardTitle>
              {(filters.school_id || filters.program_id || filters.group_id || filters.academic_year) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 h-auto py-1 px-2"
                >
                  <X className="h-3 w-3 mr-1" /> Clear All
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">

              {/* School */}
              <Select
                value={filters.school_id || 'all'}
                onValueChange={v => setFilter('school_id', v === 'all' ? '' : v)}
              >
                <SelectTrigger className="rounded-none border-gray-200 focus:ring-blue-400 bg-white">
                  <SelectValue placeholder="All Schools" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* Program */}
              <Select
                value={filters.program_id || 'all'}
                onValueChange={v => setFilter('program_id', v === 'all' ? '' : v)}
                disabled={!filters.school_id}
              >
                <SelectTrigger className="rounded-none border-gray-200 focus:ring-blue-400 bg-white">
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* Group */}
              <Select
                value={filters.group_id || 'all'}
                onValueChange={v => setFilter('group_id', v === 'all' ? '' : v)}
                disabled={!filters.program_id}
              >
                <SelectTrigger className="rounded-none border-gray-200 focus:ring-blue-400 bg-white">
                  <SelectValue placeholder="All Groups" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Groups</SelectItem>
                  {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* Academic Year */}
              <Input
                type="text"
                value={filters.academic_year}
                onChange={e => setFilter('academic_year', e.target.value)}
                placeholder="Academic Year"
                className="rounded-none border-gray-200 focus-visible:ring-blue-400 bg-white"
              />

              {/* Apply */}
              <Button
                type="button"
                onClick={fetchStudents}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-none font-semibold"
              >
                {loading
                  ? <span className="inline-block animate-spin mr-2">↻</span>
                  : <Filter className="h-4 w-4 mr-2" />
                }
                Apply
              </Button>
            </div>

            {/* Search */}
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
              <Input
                type="text"
                value={filters.search}
                onChange={e => setFilter('search', e.target.value)}
                placeholder="Search by name, admission number, email, batch..."
                className="pl-9 rounded-none border-gray-200 focus-visible:ring-blue-400 bg-gray-50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <Card className="rounded-none shadow-sm border-gray-100">
            <CardContent className="p-16 text-center">
              <div className="text-4xl mb-3 animate-spin inline-block text-blue-500">↻</div>
              <p className="text-gray-400 text-sm">Loading students...</p>
            </CardContent>
          </Card>
        ) : batchGroups.length === 0 ? (
          <Card className="rounded-none shadow-sm border-gray-100">
            <CardContent className="p-16 text-center">
              <Users className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No students found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or register a student.</p>
              <Button
                onClick={() => router.push('/dashboards/admin/academics/register-student')}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-none font-semibold"
              >
                <UserPlus className="h-4 w-4 mr-2" /> Register First Student
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {batchGroups.map(group => {
              const isUnassigned = group.batch_id === null
              const key = group.batch_id ?? 'unassigned'
              const isExpanded = expandedBatch === key
              const count = group.students.length

              return (
                <Card key={key} className="rounded-none shadow-sm border-gray-100 overflow-hidden p-0">
                  {/* Batch Header */}
                  <button
                    type="button"
                    onClick={() => setExpandedBatch(isExpanded ? null : key)}
                    className="w-full text-left p-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-1.5 h-12 flex-shrink-0 ${isUnassigned ? 'bg-orange-400' : 'bg-blue-500'}`} />
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-base font-bold text-gray-800">{group.batch_name}</h3>
                            {isUnassigned ? (
                              <Badge variant="outline" className="text-xs text-orange-600 border-orange-200 bg-orange-50 font-semibold">
                                No Batch
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-xs text-blue-700 border-blue-200 bg-blue-50 font-semibold flex items-center gap-1">
                                <Layers className="h-3 w-3" /> Batch
                              </Badge>
                            )}
                          </div>
                          {!isUnassigned && group.students[0] && (
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {(group.students[0].schools as any)?.name || '—'}
                              </span>
                              <span>›</span>
                              <span className="flex items-center gap-1">
                                <BookOpen className="h-3 w-3" />
                                {(group.students[0].programs as any)?.name || '—'}
                              </span>
                              <span>›</span>
                              <span>{(group.students[0].groups as any)?.name || '—'}</span>
                              <span>›</span>
                              <span>{group.students[0].academic_year}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-lg font-black text-gray-800">{count}</div>
                          <div className="text-xs text-gray-400">Students</div>
                        </div>
                        <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Student Table */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50 hover:bg-gray-50">
                            <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider w-10">#</TableHead>
                            <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                              <span className="flex items-center gap-1"><User className="h-3 w-3" /> Name</span>
                            </TableHead>
                            <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                              <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> Admission No.</span>
                            </TableHead>
                            <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>
                            </TableHead>
                            <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</span>
                            </TableHead>
                            <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Year</TableHead>
                            <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">School / Program</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.students.map((student, idx) => (
                            <TableRow key={student.id} className="hover:bg-blue-50/20 transition-colors">
                              <TableCell className="text-gray-400 text-xs font-medium">{idx + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className={`w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0 ${isUnassigned ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-700'}`}>
                                    {student.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-semibold text-gray-800 whitespace-nowrap text-sm">{student.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="font-mono text-xs font-normal">
                                  {student.admission_number}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-500 text-xs">{student.email}</TableCell>
                              <TableCell className="text-gray-500 text-xs">
                                {student.phone || <span className="text-gray-300">—</span>}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs font-normal text-gray-600 border-gray-200">
                                  {student.academic_year}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-xs">
                                  <div className="font-medium text-gray-700">{(student.schools as any)?.name || '—'}</div>
                                  <div className="text-gray-400">{(student.programs as any)?.name} · {(student.groups as any)?.name}</div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
                        <span>{count} student(s) in this {isUnassigned ? 'group' : 'batch'}</span>
                        {isUnassigned ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push('/dashboards/admin/academics/batches')}
                            className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-auto py-1 px-2 font-semibold"
                          >
                            Assign to Batch <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        ) : (
                          <span className="text-blue-600 font-semibold">{group.batch_name}</span>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
