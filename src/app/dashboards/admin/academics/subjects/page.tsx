'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, BookMarked, Plus, Trash2, Pencil, Filter,
  X, ChevronRight, Search, BookOpen, Layers, CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select'
import {
  Card, CardContent, CardHeader, CardTitle
} from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface School { id: string; name: string }
interface Program { id: string; name: string }
interface Batch { id: string; name: string; academic_year: string }
interface Subject {
  id: string; name: string; code: string | null
  semester: number; credits: number; description: string | null
  batch_id: string
  batches: { name: string; academic_year: string } | null
  schools: { name: string } | null
  programs: { name: string } | null
}

const SEMESTERS = Array.from({ length: 12 }, (_, i) => i + 1)

export default function SubjectsPage() {
  const router = useRouter()

  // Filter state
  const [schools, setSchools] = useState<School[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [filters, setFilters] = useState({ school_id: '', program_id: '', batch_id: '', semester: '' })

  // Data
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  // Create / Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [formSchoolId, setFormSchoolId] = useState('')
  const [formProgramId, setFormProgramId] = useState('')
  const [formBatches, setFormBatches] = useState<Batch[]>([])
  const [formPrograms, setFormPrograms] = useState<Program[]>([])
  const [form, setForm] = useState({
    name: '', code: '', batch_id: '', semester: '',
    credits: '3', description: ''
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Search
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase.from('schools').select('id, name').order('name').then(({ data }) => setSchools(data || []))
    fetchSubjects()
  }, [])

  // Filter cascades
  useEffect(() => {
    if (filters.school_id) {
      setFilters(f => ({ ...f, program_id: '', batch_id: '' }))
      setPrograms([])
      setBatches([])
      supabase.from('programs').select('id, name').eq('school_id', filters.school_id).order('name').then(({ data }) => setPrograms(data || []))
    } else {
      setPrograms([]); setBatches([])
      setFilters(f => ({ ...f, program_id: '', batch_id: '' }))
    }
  }, [filters.school_id])

  useEffect(() => {
    if (filters.program_id) {
      setFilters(f => ({ ...f, batch_id: '' }))
      setBatches([])
      supabase.from('batches').select('id, name, academic_year').eq('program_id', filters.program_id).order('name').then(({ data }) => setBatches(data || []))
    } else {
      setBatches([]); setFilters(f => ({ ...f, batch_id: '' }))
    }
  }, [filters.program_id])

  // Form cascades
  useEffect(() => {
    if (formSchoolId) {
      setFormProgramId('')
      setForm(f => ({ ...f, batch_id: '' }))
      setFormPrograms([]); setFormBatches([])
      supabase.from('programs').select('id, name').eq('school_id', formSchoolId).order('name').then(({ data }) => setFormPrograms(data || []))
    } else {
      setFormPrograms([]); setFormBatches([])
    }
  }, [formSchoolId])

  useEffect(() => {
    if (formProgramId) {
      setForm(f => ({ ...f, batch_id: '' }))
      setFormBatches([])
      supabase.from('batches').select('id, name, academic_year').eq('program_id', formProgramId).order('name').then(({ data }) => setFormBatches(data || []))
    } else {
      setFormBatches([])
    }
  }, [formProgramId])

  const setFilter = (key: string, val: string) => setFilters(f => ({ ...f, [key]: val }))

  const fetchSubjects = async () => {
    setLoading(true)
    let query = supabase
      .from('subjects')
      .select(`id, name, code, semester, credits, description, batch_id,
        batches(name, academic_year),
        schools(name),
        programs(name)`)
      .order('semester').order('name')

    if (filters.school_id) query = query.eq('school_id', filters.school_id)
    if (filters.program_id) query = query.eq('program_id', filters.program_id)
    if (filters.batch_id) query = query.eq('batch_id', filters.batch_id)
    if (filters.semester) query = query.eq('semester', parseInt(filters.semester))

    const { data, error } = await query
    if (!error) setSubjects((data as any) || [])
    setFetched(true)
    setLoading(false)
  }

  const clearFilters = () => setFilters({ school_id: '', program_id: '', batch_id: '', semester: '' })

  const openCreate = () => {
    setEditingSubject(null)
    setFormSchoolId(''); setFormProgramId('')
    setFormPrograms([]); setFormBatches([])
    setForm({ name: '', code: '', batch_id: '', semester: '', credits: '3', description: '' })
    setFormError('')
    setDialogOpen(true)
  }

  const openEdit = (s: Subject) => {
    setEditingSubject(s)
    // Pre-populate school/program from subject
    const schoolId = (s.schools as any)?.id || ''
    setFormSchoolId(schoolId)
    setFormProgramId((s as any).program_id || '')
    setForm({
      name: s.name,
      code: s.code || '',
      batch_id: s.batch_id,
      semester: String(s.semester),
      credits: String(s.credits),
      description: s.description || ''
    })
    setFormError('')
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setFormError('')
    if (!form.name.trim()) return setFormError('Subject name is required.')
    if (!form.batch_id) return setFormError('Please select a batch.')
    if (!form.semester) return setFormError('Please select a semester.')

    // Get school_id and program_id from formSchoolId/formProgramId
    const schoolId = formSchoolId
    const programId = formProgramId
    if (!schoolId || !programId) return setFormError('Please select school and program.')

    setSaving(true)
    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || null,
      batch_id: form.batch_id,
      school_id: schoolId,
      program_id: programId,
      semester: parseInt(form.semester),
      credits: parseInt(form.credits) || 3,
      description: form.description.trim() || null
    }

    let error
    if (editingSubject) {
      ({ error } = await supabase.from('subjects').update(payload).eq('id', editingSubject.id))
    } else {
      ({ error } = await supabase.from('subjects').insert(payload))
    }

    setSaving(false)
    if (error) {
      return setFormError(error.message.includes('unique')
        ? 'This subject already exists for this batch and semester.'
        : error.message)
    }

    setSuccessMsg(editingSubject ? 'Subject updated!' : 'Subject created!')
    setTimeout(() => setSuccessMsg(''), 3000)
    setDialogOpen(false)
    fetchSubjects()
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete subject "${name}"? This will also remove any teacher assignments.`)) return
    await supabase.from('subjects').delete().eq('id', id)
    fetchSubjects()
  }

  // Group subjects by semester
  const filteredSubjects = subjects.filter(s => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return s.name.toLowerCase().includes(q) || s.code?.toLowerCase().includes(q) || false
  })

  const bySemester = filteredSubjects.reduce((acc, s) => {
    const key = s.semester
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {} as Record<number, Subject[]>)

  const semesterKeys = Object.keys(bySemester).map(Number).sort((a, b) => a - b)

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-[#faf8f3] to-[#f0ebe0] shadow-md overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(#666 1px, transparent 1px), linear-gradient(90deg, #666 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />
        <div className="relative max-w-6xl mx-auto px-8 py-10">
          <Button variant="ghost" onClick={() => router.push('/dashboards/admin/academics')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 px-0 hover:bg-transparent">
            <ArrowLeft className="h-4 w-4" /> Back to Academic
          </Button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-teal-600 flex items-center justify-center shadow-lg">
                <BookMarked className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Manage Subjects</h1>
                <p className="text-gray-500 text-sm mt-1">Create and manage semester-wise subjects per batch</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {successMsg && (
                <div className="flex items-center gap-1 text-green-700 text-sm font-medium bg-green-50 px-3 py-2 border border-green-200">
                  <CheckCircle className="h-4 w-4" /> {successMsg}
                </div>
              )}
              <Button onClick={openCreate} className="bg-teal-600 hover:bg-teal-700 text-white rounded-none font-semibold">
                <Plus className="h-4 w-4 mr-2" /> Add Subject
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* Filters */}
        <Card className="mb-6 rounded-none shadow-sm border-gray-100">
          <CardHeader className="pb-3 px-6 pt-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <Filter className="h-4 w-4 text-teal-600" /> Filter Subjects
              </CardTitle>
              {(filters.school_id || filters.program_id || filters.batch_id || filters.semester) && (
                <Button variant="ghost" size="sm" onClick={clearFilters}
                  className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 h-auto py-1 px-2">
                  <X className="h-3 w-3 mr-1" /> Clear
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-5">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              <Select value={filters.school_id || 'all'} onValueChange={v => setFilter('school_id', v === 'all' ? '' : v)}>
                <SelectTrigger className="rounded-none border-gray-200 bg-white"><SelectValue placeholder="All Schools" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filters.program_id || 'all'} onValueChange={v => setFilter('program_id', v === 'all' ? '' : v)} disabled={!filters.school_id}>
                <SelectTrigger className="rounded-none border-gray-200 bg-white"><SelectValue placeholder="All Programs" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Programs</SelectItem>
                  {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filters.batch_id || 'all'} onValueChange={v => setFilter('batch_id', v === 'all' ? '' : v)} disabled={!filters.program_id}>
                <SelectTrigger className="rounded-none border-gray-200 bg-white"><SelectValue placeholder="All Batches" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Batches</SelectItem>
                  {batches.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({b.academic_year})</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filters.semester || 'all'} onValueChange={v => setFilter('semester', v === 'all' ? '' : v)}>
                <SelectTrigger className="rounded-none border-gray-200 bg-white"><SelectValue placeholder="All Semesters" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Semesters</SelectItem>
                  {SEMESTERS.map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
                </SelectContent>
              </Select>

              <Button type="button" onClick={fetchSubjects} className="bg-teal-600 hover:bg-teal-700 text-white rounded-none font-semibold">
                {loading ? <span className="animate-spin mr-2">↻</span> : <Filter className="h-4 w-4 mr-2" />}
                Apply
              </Button>
            </div>
            <div className="mt-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none z-10" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subjects by name or code..."
                className="pl-9 rounded-none border-gray-200 focus-visible:ring-teal-400 bg-gray-50" />
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {loading ? (
          <Card className="rounded-none shadow-sm border-gray-100">
            <CardContent className="p-16 text-center">
              <div className="text-4xl animate-spin inline-block text-teal-500 mb-3">↻</div>
              <p className="text-gray-400 text-sm">Loading subjects...</p>
            </CardContent>
          </Card>
        ) : !fetched ? null : filteredSubjects.length === 0 ? (
          <Card className="rounded-none shadow-sm border-gray-100">
            <CardContent className="p-16 text-center">
              <BookMarked className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">No subjects found</p>
              <p className="text-gray-400 text-sm mt-1">Add subjects using the button above.</p>
              <Button onClick={openCreate} className="mt-4 bg-teal-600 hover:bg-teal-700 text-white rounded-none font-semibold">
                <Plus className="h-4 w-4 mr-2" /> Add First Subject
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {semesterKeys.map(sem => (
              <Card key={sem} className="rounded-none shadow-sm border-gray-100 overflow-hidden p-0">
                {/* Semester Header */}
                <div className="px-6 py-4 bg-teal-600 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <BookOpen className="h-5 w-5 text-white" />
                    <h3 className="text-white font-bold text-base">Semester {sem}</h3>
                    <Badge className="bg-white/20 text-white border-0 text-xs">
                      {bySemester[sem].length} Subject{bySemester[sem].length !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider w-10">#</TableHead>
                      <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Subject Name</TableHead>
                      <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Code</TableHead>
                      <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Batch</TableHead>
                      <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">School / Program</TableHead>
                      <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider">Credits</TableHead>
                      <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-wider w-20">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bySemester[sem].map((subject, idx) => (
                      <TableRow key={subject.id} className="hover:bg-teal-50/20 transition-colors">
                        <TableCell className="text-gray-400 text-xs">{idx + 1}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-gray-800 text-sm">{subject.name}</div>
                          {subject.description && (
                            <div className="text-xs text-gray-400 mt-0.5 line-clamp-1">{subject.description}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {subject.code
                            ? <Badge variant="secondary" className="font-mono text-xs">{subject.code}</Badge>
                            : <span className="text-gray-300 text-xs">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium text-gray-700">{(subject.batches as any)?.name}</div>
                          <div className="text-xs text-gray-400">{(subject.batches as any)?.academic_year}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium text-gray-700">{(subject.schools as any)?.name}</div>
                          <div className="text-xs text-gray-400">{(subject.programs as any)?.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs border-teal-200 text-teal-700 bg-teal-50">
                            {subject.credits} cr
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEdit(subject)}
                              className="h-7 w-7 p-0 hover:bg-teal-50 hover:text-teal-600">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(subject.id, subject.name)}
                              className="h-7 w-7 p-0 hover:bg-red-50 hover:text-red-500">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-none max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gray-800">
              {editingSubject ? 'Edit Subject' : 'Add New Subject'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm">{formError}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Subject Name *</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Data Structures" className="rounded-none border-gray-200 focus-visible:ring-teal-400" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Subject Code</Label>
                <Input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. CS301" className="rounded-none border-gray-200 focus-visible:ring-teal-400" />
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Credits</Label>
                <Input type="number" min={1} max={6} value={form.credits} onChange={e => setForm(f => ({ ...f, credits: e.target.value }))}
                  className="rounded-none border-gray-200 focus-visible:ring-teal-400" />
              </div>
            </div>

            {/* School → Program → Batch cascade */}
            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">School *</Label>
              <Select value={formSchoolId || 'none'} onValueChange={v => setFormSchoolId(v === 'none' ? '' : v)}>
                <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Select School" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select School</SelectItem>
                  {schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Program *</Label>
              <Select value={formProgramId || 'none'} onValueChange={v => setFormProgramId(v === 'none' ? '' : v)} disabled={!formSchoolId}>
                <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Select Program" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select Program</SelectItem>
                  {formPrograms.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Batch *</Label>
                <Select value={form.batch_id || 'none'} onValueChange={v => setForm(f => ({ ...f, batch_id: v === 'none' ? '' : v }))} disabled={!formProgramId}>
                  <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Select Batch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select Batch</SelectItem>
                    {formBatches.map(b => <SelectItem key={b.id} value={b.id}>{b.name} ({b.academic_year})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Semester *</Label>
                <Select value={form.semester || 'none'} onValueChange={v => setForm(f => ({ ...f, semester: v === 'none' ? '' : v }))}>
                  <SelectTrigger className="rounded-none border-gray-200"><SelectValue placeholder="Select Semester" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select Semester</SelectItem>
                    {SEMESTERS.map(s => <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-gray-600 mb-1.5 block">Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Optional subject description..." rows={2}
                className="rounded-none border-gray-200 focus-visible:ring-teal-400 resize-none" />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="rounded-none">Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 text-white rounded-none font-semibold">
              {saving ? 'Saving...' : editingSubject ? 'Update Subject' : 'Create Subject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
