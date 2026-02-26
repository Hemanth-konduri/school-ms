'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, X, Building2, CheckCircle, Trash2 } from 'lucide-react'

interface School {
  id: string
  name: string
  programs: { id: string; name: string }[]
}

export default function SchoolsPage() {
  const router = useRouter()
  const [schoolName, setSchoolName] = useState('')
  const [programs, setPrograms] = useState<string[]>([''])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [existingSchools, setExistingSchools] = useState<School[]>([])
  const [fetchingSchools, setFetchingSchools] = useState(true)

  useEffect(() => { fetchSchools() }, [])

  const fetchSchools = async () => {
    setFetchingSchools(true)
    const { data: schools } = await supabase.from('schools').select('id, name').order('created_at', { ascending: false })
    if (schools) {
      const schoolsWithPrograms = await Promise.all(
        schools.map(async (s) => {
          const { data: progs } = await supabase.from('programs').select('id, name').eq('school_id', s.id)
          return { ...s, programs: progs || [] }
        })
      )
      setExistingSchools(schoolsWithPrograms)
    }
    setFetchingSchools(false)
  }

  const addProgramField = () => setPrograms([...programs, ''])
  const removeProgramField = (i: number) => setPrograms(programs.filter((_, idx) => idx !== i))
  const updateProgram = (i: number, val: string) => {
    const updated = [...programs]
    updated[i] = val
    setPrograms(updated)
  }

  const handleSubmit = async () => {
    setError(''); setSuccess('')
    const trimmedSchool = schoolName.trim()
    const validPrograms = programs.map(p => p.trim()).filter(Boolean)
    if (!trimmedSchool) return setError('School name is required.')
    if (validPrograms.length === 0) return setError('Add at least one program.')

    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data: profileData } = await supabase.from('profiles').select('id').eq('auth_user_id', user?.id).single()

    const { data: school, error: schoolErr } = await supabase
      .from('schools')
      .insert({ name: trimmedSchool, created_by: profileData?.id })
      .select()
      .single()

    if (schoolErr) {
      setLoading(false)
      return setError(schoolErr.message.includes('unique') ? `School "${trimmedSchool}" already exists.` : schoolErr.message)
    }

    const programRows = validPrograms.map(name => ({ name, school_id: school.id }))
    const { error: progErr } = await supabase.from('programs').insert(programRows)
    if (progErr) {
      setLoading(false)
      return setError('School created but failed to add programs: ' + progErr.message)
    }

    setSuccess(`School "${trimmedSchool}" created with ${validPrograms.length} program(s)!`)
    setSchoolName('')
    setPrograms([''])
    fetchSchools()
    setLoading(false)
  }

  const deleteSchool = async (schoolId: string, schoolName: string) => {
    if (!confirm(`Delete "${schoolName}" and all its programs/groups? This cannot be undone.`)) return
    await supabase.from('schools').delete().eq('id', schoolId)
    fetchSchools()
  }

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-[#faf8f3] to-[#f0ebe0] shadow-md overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(#666 1px, transparent 1px), linear-gradient(90deg, #666 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />
        <div className="relative max-w-5xl mx-auto px-8 py-10">
          <button onClick={() => router.push('/dashboard/academic')} className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors mb-6 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to Academic
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 flex items-center justify-center shadow-lg">
              <Building2 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Create School & Programs</h1>
              <p className="text-gray-500 text-sm mt-1">Add a school and its programs in one go</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Form */}
        <div className="bg-white shadow-sm p-8">
          <h2 className="text-lg font-bold text-gray-800 mb-6">New School</h2>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 text-sm flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> {success}
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">School Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={schoolName}
              onChange={e => setSchoolName(e.target.value)}
              placeholder="e.g. School of Computing"
              className="w-full border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-gray-50"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Programs <span className="text-red-500">*</span></label>
            <div className="space-y-2">
              {programs.map((prog, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={prog}
                    onChange={e => updateProgram(i, e.target.value)}
                    placeholder={`e.g. B.Tech, M.Tech, PhD`}
                    className="flex-1 border border-gray-200 px-4 py-3 text-sm focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-gray-50"
                  />
                  {programs.length > 1 && (
                    <button onClick={() => removeProgramField(i)} className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addProgramField}
              className="mt-3 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              <Plus className="h-4 w-4" /> Add Program
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create School & Programs'}
          </button>
        </div>

        {/* Existing Schools */}
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">Existing Schools</h2>
          {fetchingSchools ? (
            <div className="bg-white shadow-sm p-8 text-center text-gray-400 text-sm">Loading...</div>
          ) : existingSchools.length === 0 ? (
            <div className="bg-white shadow-sm p-8 text-center text-gray-400 text-sm">No schools yet. Create one!</div>
          ) : (
            <div className="space-y-3">
              {existingSchools.map(school => (
                <div key={school.id} className="bg-white shadow-sm p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        <span className="font-semibold text-gray-800">{school.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {school.programs.map(p => (
                          <span key={p.id} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 border border-blue-100">{p.name}</span>
                        ))}
                        {school.programs.length === 0 && <span className="text-xs text-gray-400">No programs</span>}
                      </div>
                    </div>
                    <button onClick={() => deleteSchool(school.id, school.name)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
