'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Users, UserPlus, Search, Filter, X,
  Building2, BookOpen, Hash, Mail, Phone, User,
  ChevronRight, Edit, Trash2, Ban, GraduationCap
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface School { id: string; name: string }
interface Teacher {
  id: string
  name: string
  employee_id: string
  email: string
  phone: string | null
  designation: string | null
  department: string | null
  school_id: string
  is_disabled: boolean
  disabled_at: string | null
  schools: { name: string } | null
}

interface DepartmentGroup {
  department: string | null
  teachers: Teacher[]
}

export default function ManageTeachersPage() {
  const router = useRouter()

  const [schools, setSchools] = useState<School[]>([])
  const [filters, setFilters] = useState({ school_id: '', search: '' })
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedDept, setExpandedDept] = useState<string | null>('all')
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null)
  const [deleteTeacher, setDeleteTeacher] = useState<Teacher | null>(null)
  const [disableTeacher, setDisableTeacher] = useState<Teacher | null>(null)
  const [editForm, setEditForm] = useState({ designation: '', department: '', phone: '' })
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    supabase.from('schools').select('id, name').order('name').then(({ data }) => setSchools(data || []))
    fetchTeachers()
  }, [])

  const setFilter = (key: string, val: string) => setFilters(f => ({ ...f, [key]: val }))

  const fetchTeachers = async () => {
    setLoading(true)
    let query = supabase
      .from('teachers')
      .select(`
        id, name, employee_id, email, phone, designation, department, school_id,
        schools(name)
      `)
      .order('name')

    if (filters.school_id) query = query.eq('school_id', filters.school_id)

    const { data, error } = await query
    if (error) {
      console.error('Error fetching teachers:', error)
      setTeachers([])
    } else if (data) {
      const teachersWithDefaults = data.map((t: any) => ({
        ...t,
        is_disabled: t.is_disabled ?? false,
        disabled_at: t.disabled_at ?? null
      }))
      setTeachers(teachersWithDefaults)
    }
    setLoading(false)
  }

  const clearFilters = () => {
    setFilters({ school_id: '', search: '' })
  }

  const openEdit = (teacher: Teacher) => {
    setEditTeacher(teacher)
    setEditForm({ 
      designation: teacher.designation || '', 
      department: teacher.department || '', 
      phone: teacher.phone || '' 
    })
  }

  const handleEdit = async () => {
    if (!editTeacher) return
    setActionLoading(true)
    const { error } = await supabase.from('teachers').update({
      designation: editForm.designation || null,
      department: editForm.department || null,
      phone: editForm.phone || null
    }).eq('id', editTeacher.id)
    setActionLoading(false)
    if (!error) {
      setEditTeacher(null)
      fetchTeachers()
    }
  }

  const handleDelete = async () => {
    if (!deleteTeacher) return
    setActionLoading(true)
    const { error } = await supabase.from('teachers').delete().eq('id', deleteTeacher.id)
    setActionLoading(false)
    if (!error) {
      setDeleteTeacher(null)
      fetchTeachers()
    }
  }

  const handleDisable = async () => {
    if (!disableTeacher) return
    setActionLoading(true)
    const { error } = await supabase.from('teachers').update({
      is_disabled: !disableTeacher.is_disabled,
      disabled_at: !disableTeacher.is_disabled ? new Date().toISOString() : null
    }).eq('id', disableTeacher.id)
    setActionLoading(false)
    if (!error) {
      setDisableTeacher(null)
      fetchTeachers()
    }
  }

  const searchedTeachers = teachers.filter(t => {
    if (!filters.search.trim()) return true
    const q = filters.search.toLowerCase()
    return (
      t.name.toLowerCase().includes(q) ||
      t.employee_id.toLowerCase().includes(q) ||
      t.email.toLowerCase().includes(q) ||
      (t.designation || '').toLowerCase().includes(q) ||
      (t.department || '').toLowerCase().includes(q)
    )
  })

  const totalTeachers = searchedTeachers.length

  const deptGroups: DepartmentGroup[] = (() => {
    const map = new Map<string, DepartmentGroup>()
    searchedTeachers.forEach(t => {
      const key = t.department || 'No Department'
      if (!map.has(key)) {
        map.set(key, { department: t.department, teachers: [] })
      }
      map.get(key)!.teachers.push(t)
    })
    return Array.from(map.values()).filter(g => g.teachers.length > 0)
  })()

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-[#faf8f3] to-[#f0ebe0] shadow-md overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(#666 1px, transparent 1px), linear-gradient(90deg, #666 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />
        <div className="relative max-w-6xl mx-auto px-8 py-10">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboards/admin/teachers')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 px-0 hover:bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Teachers
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-green-600 flex items-center justify-center shadow-lg">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Manage Teachers</h1>
                <p className="text-gray-500 text-sm mt-1">View and manage all registered teachers</p>
              </div>
            </div>
            <Button
              onClick={() => router.push('/dashboards/admin/teachers/register')}
              className="bg-green-600 hover:bg-green-700 text-white rounded-none font-semibold flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Register New Teacher
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-50 p-6 shadow-sm flex items-center gap-4">
            <div className="text-green-600 p-3 bg-white/60 shadow-sm">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-gray-800">{totalTeachers}</div>
              <div className="text-xs text-gray-500 font-medium">Total Teachers</div>
            </div>
          </div>
          <div className="bg-blue-50 p-6 shadow-sm flex items-center gap-4">
            <div className="text-blue-600 p-3 bg-white/60 shadow-sm">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-gray-800">{deptGroups.length}</div>
              <div className="text-xs text-gray-500 font-medium">Departments</div>
            </div>
          </div>
          <div className="bg-violet-50 p-6 shadow-sm flex items-center gap-4">
            <div className="text-violet-600 p-3 bg-white/60 shadow-sm">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <div className="text-2xl font-black text-gray-800">{schools.length}</div>
              <div className="text-xs text-gray-500 font-medium">Schools</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 rounded-none shadow-sm border-gray-100">
          <CardHeader className="pb-3 px-6 pt-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Filter className="h-4 w-4 text-green-600" /> Filters
              </CardTitle>
              {filters.school_id && (
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {/* School */}
              <Select
                value={filters.school_id || 'all'}
                onValueChange={v => setFilter('school_id', v === 'all' ? '' : v)}
              >
                <SelectTrigger className="rounded-none border-gray-200 focus:ring-green-400 bg-white">
                  <SelectValue placeholder="All Schools" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>

              {/* Apply */}
              <Button
                type="button"
                onClick={fetchTeachers}
                className="bg-green-600 hover:bg-green-700 text-white rounded-none font-semibold"
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
                placeholder="Search by name, employee ID, email, designation, department..."
                className="pl-9 rounded-none border-gray-200 focus-visible:ring-green-400 bg-gray-50"
              />
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <Card className="rounded-none shadow-sm border-gray-100">
            <CardContent className="p-16 text-center">
              <div className="text-4xl mb-3 animate-spin inline-block text-green-500">↻</div>
              <p className="text-gray-400 text-sm">Loading teachers...</p>
            </CardContent>
          </Card>
        ) : deptGroups.length === 0 ? (
          <Card className="rounded-none shadow-sm border-gray-100">
            <CardContent className="p-16 text-center">
              <GraduationCap className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No teachers found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your filters or register a teacher.</p>
              <Button
                onClick={() => router.push('/dashboards/admin/teachers/register')}
                className="mt-4 bg-green-600 hover:bg-green-700 text-white rounded-none font-semibold"
              >
                <UserPlus className="h-4 w-4 mr-2" /> Register First Teacher
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {deptGroups.map(group => {
              const key = group.department ?? 'no-dept'
              const isExpanded = expandedDept === key
              const count = group.teachers.length

              return (
                <Card key={key} className="rounded-none shadow-sm border-gray-100 overflow-hidden p-0">
                  {/* Department Header */}
                  <button
                    type="button"
                    onClick={() => setExpandedDept(isExpanded ? null : key)}
                    className="w-full text-left p-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-1.5 h-12 flex-shrink-0 bg-green-500" />
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className="text-base font-bold text-gray-800">{group.department || 'No Department'}</h3>
                            <Badge variant="outline" className="text-xs text-green-700 border-green-200 bg-green-50 font-semibold flex items-center gap-1">
                              <Building2 className="h-3 w-3" /> Department
                            </Badge>
                          </div>
                          {group.teachers[0] && (
                            <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {(group.teachers[0].schools as any)?.name || '—'}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="text-lg font-black text-gray-800">{count}</div>
                          <div className="text-xs text-gray-400">Teachers</div>
                        </div>
                        <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Teacher Table */}
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
                              <span className="flex items-center gap-1"><Hash className="h-3 w-3" /> Employee ID</span>
                            </TableHead>
                            <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                              <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>
                            </TableHead>
                            <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                              <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> Phone</span>
                            </TableHead>
                            <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Designation</TableHead>
                            <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">School</TableHead>
                            <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.teachers.map((teacher, idx) => (
                            <TableRow key={teacher.id} className="hover:bg-green-50/20 transition-colors">
                              <TableCell className="text-gray-400 text-xs font-medium">{idx + 1}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0 bg-green-100 text-green-700">
                                    {teacher.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="font-semibold text-gray-800 whitespace-nowrap text-sm">{teacher.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="font-mono text-xs font-normal">
                                  {teacher.employee_id}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-gray-500 text-xs">{teacher.email}</TableCell>
                              <TableCell className="text-gray-500 text-xs">
                                {teacher.phone || <span className="text-gray-300">—</span>}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs font-normal text-gray-600 border-gray-200">
                                  {teacher.designation || '—'}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="text-xs font-medium text-gray-700">
                                  {(teacher.schools as any)?.name || '—'}
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => openEdit(teacher)}
                                    className="h-7 w-7 p-0 hover:bg-blue-50 hover:text-blue-600">
                                    <Edit className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => setDisableTeacher(teacher)}
                                    className={`h-7 w-7 p-0 ${teacher.is_disabled ? 'hover:bg-green-50 hover:text-green-600' : 'hover:bg-orange-50 hover:text-orange-600'}`}>
                                    <Ban className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => setDeleteTeacher(teacher)}
                                    className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-600">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
                        <span>{count} teacher(s) in this department</span>
                        <span className="text-green-600 font-semibold">{group.department || 'No Department'}</span>
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        {/* Edit Dialog */}
        <Dialog open={!!editTeacher} onOpenChange={() => setEditTeacher(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Teacher</DialogTitle>
              <DialogDescription>Update teacher information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Designation</label>
                <Input value={editForm.designation} onChange={(e) => setEditForm(f => ({ ...f, designation: e.target.value }))} placeholder="Designation" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Department</label>
                <Input value={editForm.department} onChange={(e) => setEditForm(f => ({ ...f, department: e.target.value }))} placeholder="Department" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Phone</label>
                <Input value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditTeacher(null)}>Cancel</Button>
              <Button onClick={handleEdit} disabled={actionLoading} className="bg-green-600 hover:bg-green-700 text-white">
                {actionLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={!!deleteTeacher} onOpenChange={() => setDeleteTeacher(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Teacher?</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to permanently delete <strong>{deleteTeacher?.name}</strong>? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={actionLoading} className="bg-red-600 hover:bg-red-700">
                {actionLoading ? 'Deleting...' : 'Yes, Delete'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Disable Confirmation */}
        <AlertDialog open={!!disableTeacher} onOpenChange={() => setDisableTeacher(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{disableTeacher?.is_disabled ? 'Enable' : 'Disable'} Account?</AlertDialogTitle>
              <AlertDialogDescription>
                {disableTeacher?.is_disabled
                  ? `Enable account for ${disableTeacher?.name}? They will be able to login again.`
                  : `Disable account for ${disableTeacher?.name}? They will not be able to login.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>No, Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDisable} disabled={actionLoading} className={disableTeacher?.is_disabled ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}>
                {actionLoading ? 'Processing...' : `Yes, ${disableTeacher?.is_disabled ? 'Enable' : 'Disable'}`}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
