'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export default function AdminSignup() {
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [roleId, setRoleId] = useState('')
  const [roles, setRoles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchRoles()
  }, [])

  const fetchRoles = async () => {
    const { data } = await supabase
      .from('roles')
      .select('*')
      .in('name', ['admin', 'principal', 'teacher', 'accountant'])
    if (data) setRoles(data)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const res = await fetch('/api/admin/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName, roleId })
      })

      const data = await res.json()

      if (res.ok) {
        setMessage('Admin created successfully! User can now login with Google.')
        setEmail('')
        setFullName('')
        setRoleId('')
      } else {
        setMessage(data.error || 'Failed to create admin')
      }
    } catch (error) {
      setMessage('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Admin Signup</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={roleId} onValueChange={setRoleId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating...' : 'Create Admin'}
            </Button>
            {message && (
              <p className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-600'}`}>
                {message}
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
