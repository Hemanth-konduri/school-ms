'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X, GitBranch, CheckCircle, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'

interface School { id: string; name: string }
interface Program { id: string; name: string }
interface Group { id: string; name: string; programs: { name: string } | null; schools: { name: string } | null }

export default function GroupsPage() {
  const router = useRouter()
  const [schools, setSchools] = useState<School[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedSchool, setSelectedSchool] = useState('')
  const [selectedProgram, setSelectedProgram] = useState('')
  const [groups, setGroups] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [existingGroups, setExistingGroups] = useState<Group[]>([])

  useEffect(() => {
    supabase.from('schools').select('id, name').order('name').then(({ data }) => setSchools(data || []))
    fetchGroups()
  }, [])

  useEffect(() => {
    if (selectedSchool) {
      setSelectedProgram('')
      setPrograms([])
      supabase.from('programs').select('id, name').eq('school_id', selectedSchool).order('name').then(({ data }) => setPrograms(data || []))
    }
  }, [selectedSchool])

  const fetchGroups = async () => {
    const { data } = await supabase
      .from('groups')
      .select('id, name, programs(name), schools(name)')
      .order('created_at', { ascending: false })
      .limit(30)
    setExistingGroups((data as any) || [])
  }

  const addGroupField = () => setGroups([...groups, ''])
  const removeGroupField = (i: number) => setGroups(groups.filter((_, idx) => idx !== i))
  const updateGroup = (i: number, val: string) => {
    const updated = [...groups]; updated[i] = val; setGroups(updated)
  }

  const handleSubmit = async () => {
    setError(''); setSuccess('')
    if (!selectedSchool) return setError('Please select a school.')
    if (!selectedProgram) return setError('Please select a program.')
    const validGroups = groups.map(g => g.trim()).filter(Boolean)
    if (validGroups.length === 0) return setError('Add at least one group.')

    setLoading(true)
    const rows = validGroups.map(name => ({ name, school_id: selectedSchool, program_id: selectedProgram }))
    const { error: err } = await supabase.from('groups').insert(rows)
    if (err) {
      setLoading(false)
      return setError(err.message.includes('unique') ? 'One or more groups already exist for this school/program.' : err.message)
    }
    setSuccess(`${validGroups.length} group(s) created successfully!`)
    setGroups([''])
    fetchGroups()
    setLoading(false)
  }

  const deleteGroup = async (id: string) => {
    if (!confirm('Delete this group?')) return
    await supabase.from('groups').delete().eq('id', id)
    fetchGroups()
  }

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      <div className="relative bg-gradient-to-br from-[#faf8f3] to-[#f0ebe0] shadow-md overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(#666 1px, transparent 1px), linear-gradient(90deg, #666 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />
        <div className="relative max-w-5xl mx-auto px-8 py-10">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboards/admin/academics')} className="flex items-center gap-2 mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Academic
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-green-600 flex items-center justify-center shadow-lg">
              <GitBranch className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Create Groups / Departments</h1>
              <p className="text-gray-500 text-sm mt-1">Add departments linked to a school and program</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="bg-white shadow-sm p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-6">New Groups</h2>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> {success}
            </Alert>
          )}

          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select School <span className="text-red-500">*</span></label>
            <Select value={selectedSchool} onValueChange={(v) => setSelectedSchool(v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="-- Select School --" />
              </SelectTrigger>
              <SelectContent>
                {schools.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Program <span className="text-red-500">*</span></label>
            <Select value={selectedProgram} onValueChange={(v) => setSelectedProgram(v)} disabled={!selectedSchool}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="-- Select Program --" />
              </SelectTrigger>
              <SelectContent>
                {programs.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {selectedSchool && programs.length === 0 && (
              <p className="text-xs text-orange-500 mt-1">No programs found. Add programs to this school first.</p>
            )}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Groups / Departments <span className="text-red-500">*</span></label>
            <div className="space-y-2">
              {groups.map((g, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    className="flex-1"
                    value={g}
                    onChange={e => updateGroup(i, e.target.value)}
                    placeholder="e.g. CSE, ECE, Mechanical"
                  />
                  {groups.length > 1 && (
                    <Button variant="ghost" size="icon" onClick={() => removeGroupField(i)} className="text-gray-400 hover:text-red-500 hover:bg-red-50">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="link" size="sm" onClick={addGroupField} className="mt-3 flex items-center gap-1">
              <Plus className="h-4 w-4" /> Add Group
            </Button>
          </div>

          <Button className="w-full" disabled={loading} onClick={handleSubmit}>
            {loading ? 'Creating...' : 'Create Groups'}
          </Button>
        </div>

        {/* Existing Groups */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Existing Groups</h2>
          {existingGroups.length === 0 ? (
            <div className="bg-white shadow-sm p-8 text-center text-gray-400 text-sm">No groups yet.</div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {existingGroups.map(g => (
                <div key={g.id} className="bg-white shadow-sm p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">{g.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {(g.schools as any)?.name} → {(g.programs as any)?.name}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteGroup(g.id)} className="text-gray-300 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
