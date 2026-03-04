import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Get student role
  const { data: studentRole, error: roleError } = await supabase
    .from('roles')
    .select('id, name')
    .ilike('name', 'student')
    .single()

  console.log('Student role:', studentRole, roleError)

  if (!studentRole) {
    return NextResponse.json({ error: 'Student role not found' }, { status: 500 })
  }

  // Get all students
  const { data: students } = await supabase
    .from('students')
    .select('email')

  if (!students) {
    return NextResponse.json({ error: 'No students found' }, { status: 404 })
  }

  // Get existing profiles
  const { data: existingProfiles } = await supabase
    .from('profiles')
    .select('email')

  const existingEmails = new Set(existingProfiles?.map(p => p.email) || [])

  // Create profiles for students who don't have one
  const newProfiles = students
    .filter(s => !existingEmails.has(s.email))
    .map(s => ({
      email: s.email,
      role_id: studentRole.id,
      is_active: true
    }))

  console.log('Creating profiles:', newProfiles)

  if (newProfiles.length > 0) {
    const { error } = await supabase.from('profiles').insert(newProfiles)
    if (error) {
      console.error('Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ 
    message: `Synced ${newProfiles.length} students to profiles`,
    synced: newProfiles.length,
    roleId: studentRole.id,
    roleName: studentRole.name
  })
}
