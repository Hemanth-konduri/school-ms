'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Bell, Send, Eye, Edit2, Trash2, Search, Calendar, Filter, X, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface School { id: string; name: string }
interface Program { id: string; name: string }
interface Group { id: string; name: string }
interface Batch { id: string; name: string }
interface Notification {
  id: string
  title: string
  message: string
  priority: string
  notification_type: string
  status: string
  created_by: string
  created_at: string
  scheduled_at: string | null
  sent_at: string | null
  expires_at: string | null
  attachment_url: string | null
}

export default function NotificationsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'create' | 'manage'>('create')
  const [profile, setProfile] = useState<any>(null)

  // Create Notification State
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set())
  const [schools, setSchools] = useState<School[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [batches, setBatches] = useState<Batch[]>([])

  const [schoolFilter, setSchoolFilter] = useState('')
  const [programFilter, setProgramFilter] = useState('')
  const [groupFilter, setGroupFilter] = useState('')
  const [batchFilter, setBatchFilter] = useState('')
  const [academicYear, setAcademicYear] = useState('')

  const [notifForm, setNotifForm] = useState({
    title: '',
    message: '',
    priority: 'normal',
    notif_type: 'in_app',
    attachment_url: '',
    link_url: '',
    expires_at: '',
    schedule_type: 'immediate',
    scheduled_at: ''
  })

  // Manage Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [viewingNotification, setViewingNotification] = useState<Notification | null>(null)

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('auth_user_id', user.id)
        .single()
      setProfile(data)
    }
    fetchProfile()
  }, [router])

  // Fetch hierarchy data
  useEffect(() => {
    const fetch = async () => {
      const [schRes, progRes, grpRes, batchRes] = await Promise.all([
        supabase.from('schools').select('id, name').order('name'),
        supabase.from('programs').select('id, name, school_id').order('name'),
        supabase.from('groups').select('id, name, school_id, program_id').order('name'),
        supabase.from('batches').select('id, name, school_id, program_id, group_id').order('name')
      ])
      setSchools(schRes.data || [])
      setPrograms(progRes.data || [])
      setGroups(grpRes.data || [])
      setBatches(batchRes.data || [])
    }
    fetch()
  }, [])

  // Fetch notifications for history
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
      setNotifications(data || [])
    }
    fetch()
  }, [activeTab])

  // Filter notifications
  useEffect(() => {
    let filtered = [...notifications]

    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(n => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q))
    }

    if (statusFilter) {
      filtered = filtered.filter(n => n.status === statusFilter)
    }

    if (priorityFilter) {
      filtered = filtered.filter(n => n.priority === priorityFilter)
    }

    if (dateFilter) {
      const filterDate = new Date(dateFilter).toDateString()
      filtered = filtered.filter(n => new Date(n.created_at).toDateString() === filterDate)
    }

    setFilteredNotifications(filtered)
  }, [searchQuery, statusFilter, priorityFilter, dateFilter, notifications])

  const toggleRole = (role: string) => {
    const updated = new Set(selectedRoles)
    if (updated.has(role)) {
      updated.delete(role)
    } else {
      updated.add(role)
    }
    setSelectedRoles(updated)
  }

  const selectAllRoles = () => {
    if (selectedRoles.size === 4) {
      setSelectedRoles(new Set())
    } else {
      setSelectedRoles(new Set(['students', 'teachers', 'admins', 'staff']))
    }
  }

  const getFilteredPrograms = () => schoolFilter
    ? (programs as any).filter((p: any) => p.school_id === schoolFilter)
    : programs

  const getFilteredGroups = () => (schoolFilter && programFilter)
    ? (groups as any).filter((g: any) => g.school_id === schoolFilter && g.program_id === programFilter)
    : groups

  const getFilteredBatches = () => (schoolFilter && programFilter && groupFilter)
    ? (batches as any).filter((b: any) => b.school_id === schoolFilter && b.program_id === programFilter && b.group_id === groupFilter)
    : batches

  const handleCreateNotification = async () => {
    setError('')
    setSuccess('')

    if (!notifForm.title.trim()) return setError('Title is required.')
    if (!notifForm.message.trim()) return setError('Message is required.')
    if (selectedRoles.size === 0) return setError('Select at least one user type.')

    setLoading(true)

    try {
      // Create notification
      const { data: notif, error: notifErr } = await supabase
        .from('notifications')
        .insert({
          title: notifForm.title.trim(),
          message: notifForm.message.trim(),
          priority: notifForm.priority,
          notification_type: notifForm.notif_type,
          attachment_url: notifForm.attachment_url || null,
          link_url: notifForm.link_url || null,
          expires_at: notifForm.expires_at || null,
          created_by: profile.id,
          status: notifForm.schedule_type === 'immediate' ? 'sent' : 'scheduled',
          scheduled_at: notifForm.schedule_type === 'scheduled' ? notifForm.scheduled_at : null,
          sent_at: notifForm.schedule_type === 'immediate' ? new Date().toISOString() : null
        })
        .select()
        .single()

      if (notifErr) throw notifErr

      // Create targets
      const targets: any[] = []
      selectedRoles.forEach(role => {
        targets.push({
          notification_id: notif.id,
          target_type: 'role',
          target_value: role
        })
      })

      // Add hierarchical filters if selected
      if (schoolFilter && selectedRoles.has('students')) {
        targets.push({
          notification_id: notif.id,
          target_type: 'school',
          target_value: schoolFilter
        })
      }

      if (programFilter && selectedRoles.has('students')) {
        targets.push({
          notification_id: notif.id,
          target_type: 'program',
          target_value: programFilter
        })
      }

      if (groupFilter && selectedRoles.has('students')) {
        targets.push({
          notification_id: notif.id,
          target_type: 'group',
          target_value: groupFilter
        })
      }

      if (batchFilter && selectedRoles.has('students')) {
        targets.push({
          notification_id: notif.id,
          target_type: 'batch',
          target_value: batchFilter
        })
      }

      if (targets.length > 0) {
        const { error: targetErr } = await supabase
          .from('notification_targets')
          .insert(targets)
        if (targetErr) throw targetErr
      }

      setSuccess(`Notification "${notifForm.title}" created and sent successfully!`)
      setNotifForm({
        title: '',
        message: '',
        priority: 'normal',
        notif_type: 'in_app',
        attachment_url: '',
        link_url: '',
        expires_at: '',
        schedule_type: 'immediate',
        scheduled_at: ''
      })
      setSelectedRoles(new Set())
      setSchoolFilter('')
      setProgramFilter('')
      setGroupFilter('')
      setBatchFilter('')
      setAcademicYear('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteNotification = async (id: string) => {
    if (!confirm('Delete this notification?')) return
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (error) {
      setError(error.message)
    } else {
      setSuccess('Notification deleted')
      setNotifications(notifications.filter(n => n.id !== id))
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive'
      case 'important': return 'secondary'
      default: return 'default'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'bg-green-100 text-green-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      case 'expired': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-[#faf8f3] to-[#f0ebe0] shadow-md overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(#666 1px, transparent 1px), linear-gradient(90deg, #666 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />
        <div className="relative max-w-6xl mx-auto px-8 py-10">
          <Button variant="ghost" size="sm" onClick={() => router.push('/dashboards/admin')} className="flex items-center gap-2 mb-6">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-yellow-600 flex items-center justify-center shadow-lg">
              <Bell className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Notification Management</h1>
              <p className="text-gray-500 text-sm mt-1">Create, send, and manage system notifications</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-10">
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

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <Button
            variant={activeTab === 'create' ? 'default' : 'outline'}
            onClick={() => setActiveTab('create')}
            className="flex items-center gap-2"
          >
            <Send className="h-4 w-4" /> Create Notification
          </Button>
          <Button
            variant={activeTab === 'manage' ? 'default' : 'outline'}
            onClick={() => setActiveTab('manage')}
            className="flex items-center gap-2"
          >
            <Bell className="h-4 w-4" /> Notification History
          </Button>
        </div>

        {/* CREATE TAB */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            {/* Step 1: Select User Types */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 1: Select Target User Types</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedRoles.size === 4}
                    onCheckedChange={selectAllRoles}
                    className="w-5 h-5"
                  />
                  <label className="text-lg font-semibold text-gray-700 cursor-pointer">Everyone</label>
                </div>
                <div className="border-t pt-3 space-y-3">
                  {['students', 'teachers', 'admins', 'staff'].map(role => (
                    <div key={role} className="flex items-center gap-3">
                      <Checkbox
                        checked={selectedRoles.has(role)}
                        onCheckedChange={() => toggleRole(role)}
                        className="w-5 h-5"
                      />
                      <label className="text-sm font-medium text-gray-700 cursor-pointer capitalize">{role}</label>
                    </div>
                  ))}
                </div>
              </div>
              {selectedRoles.size > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {Array.from(selectedRoles).map(role => (
                    <Badge key={role} className="capitalize">{role}</Badge>
                  ))}
                </div>
              )}
            </Card>

            {/* Step 2: Target Audience Filtering */}
            {selectedRoles.has('students') && (
              <Card className="p-8">
                <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 2: Target Student Audience (Optional)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">School</label>
                    <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All schools" />
                      </SelectTrigger>
                      <SelectContent>
                        {schools.length > 0 ? (
                          schools.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                        ) : (
                          <div className="p-2 text-sm text-gray-500">No schools available</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Program</label>
                    <Select value={programFilter} onValueChange={setProgramFilter} disabled={!schoolFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder={schoolFilter ? "Select program" : "Select school first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredPrograms().length > 0 ? (
                          getFilteredPrograms().map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)
                        ) : (
                          <div className="p-2 text-sm text-gray-500">No programs available</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Department / Group</label>
                    <Select value={groupFilter} onValueChange={setGroupFilter} disabled={!programFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder={programFilter ? "Select group" : "Select program first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredGroups().length > 0 ? (
                          getFilteredGroups().map((g: any) => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)
                        ) : (
                          <div className="p-2 text-sm text-gray-500">No groups available</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Batch</label>
                    <Select value={batchFilter} onValueChange={setBatchFilter} disabled={!groupFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder={groupFilter ? "Select batch" : "Select group first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {getFilteredBatches().length > 0 ? (
                          getFilteredBatches().map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)
                        ) : (
                          <div className="p-2 text-sm text-gray-500">No batches available</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Academic Year</label>
                    <Input value={academicYear} onChange={e => setAcademicYear(e.target.value)} placeholder="e.g. 2024-2025" />
                  </div>
                </div>
              </Card>
            )}

            {/* Step 3: Notification Content */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 3: Notification Content</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Title <span className="text-red-500">*</span></label>
                  <Input
                    value={notifForm.title}
                    onChange={e => setNotifForm({ ...notifForm, title: e.target.value })}
                    placeholder="e.g. Important Announcement"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Message / Description <span className="text-red-500">*</span></label>
                  <textarea
                    value={notifForm.message}
                    onChange={e => setNotifForm({ ...notifForm, message: e.target.value })}
                    placeholder="Enter notification message..."
                    className="w-full border border-gray-200 p-3 text-sm focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400 rounded"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Priority</label>
                    <Select value={notifForm.priority} onValueChange={v => setNotifForm({ ...notifForm, priority: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="important">Important</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Notification Type</label>
                    <Select value={notifForm.notif_type} onValueChange={v => setNotifForm({ ...notifForm, notif_type: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_app">In-App</SelectItem>
                        <SelectItem value="email">Email (Future)</SelectItem>
                        <SelectItem value="push">Push (Future)</SelectItem>
                        <SelectItem value="all">All Channels</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Expiry Date (Optional)</label>
                    <Input
                      type="datetime-local"
                      value={notifForm.expires_at}
                      onChange={e => setNotifForm({ ...notifForm, expires_at: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Link URL (Optional)</label>
                  <Input
                    value={notifForm.link_url}
                    onChange={e => setNotifForm({ ...notifForm, link_url: e.target.value })}
                    placeholder="e.g. /dashboards/admin/academics"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Attachment URL (Optional)</label>
                  <Input
                    value={notifForm.attachment_url}
                    onChange={e => setNotifForm({ ...notifForm, attachment_url: e.target.value })}
                    placeholder="e.g. https://example.com/file.pdf"
                  />
                </div>
              </div>
            </Card>

            {/* Step 4: Schedule */}
            <Card className="p-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Step 4: Send / Schedule</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">When to Send?</label>
                  <Select value={notifForm.schedule_type} onValueChange={v => setNotifForm({ ...notifForm, schedule_type: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Send Immediately</SelectItem>
                      <SelectItem value="scheduled">Schedule for Later</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {notifForm.schedule_type === 'scheduled' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Scheduled Date & Time</label>
                    <Input
                      type="datetime-local"
                      value={notifForm.scheduled_at}
                      onChange={e => setNotifForm({ ...notifForm, scheduled_at: e.target.value })}
                    />
                  </div>
                )}
              </div>
            </Card>

            {/* Send Button */}
            <Button
              onClick={handleCreateNotification}
              disabled={loading || selectedRoles.size === 0}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white py-6 text-lg font-semibold flex items-center justify-center gap-2"
            >
              <Send className="h-5 w-5" />
              {loading ? 'Sending...' : 'Send Notification'}
            </Button>
          </div>
        )}

        {/* MANAGE TAB */}
        {activeTab === 'manage' && (
          <div className="space-y-6">
            {/* Filters */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Filter className="h-5 w-5" /> Filters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Search</label>
                  <Input
                    placeholder="Search by title..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Status</label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Priority</label>
                  <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="important">Important</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1 uppercase">Date</label>
                  <Input
                    type="date"
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value)}
                  />
                </div>
              </div>
            </Card>

            {/* Notification Cards */}
            <div className="space-y-4">
              {filteredNotifications.length === 0 ? (
                <Card className="p-8 text-center">
                  <Bell className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">No notifications found</p>
                </Card>
              ) : (
                filteredNotifications.map(notif => (
                  <Card key={notif.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-gray-800">{notif.title}</h3>
                          <Badge variant={getPriorityColor(notif.priority)} className="capitalize">
                            {notif.priority}
                          </Badge>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${getStatusColor(notif.status)}`}>
                            {notif.status}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-3">{notif.message}</p>
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>📅 {new Date(notif.created_at).toLocaleString()}</span>
                          <span>📨 {notif.notification_type}</span>
                          {notif.scheduled_at && <span>⏰ Scheduled: {new Date(notif.scheduled_at).toLocaleString()}</span>}
                          {notif.sent_at && <span>✅ Sent: {new Date(notif.sent_at).toLocaleString()}</span>}
                        </div>
                      </div>

                      <div className="flex gap-2 ml-4 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setViewingNotification(notif)}
                          title="View details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {notif.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteNotification(notif.id)}
                          className="text-red-600 hover:text-red-700"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* View Details Modal */}
      {viewingNotification && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Notification Details</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewingNotification(null)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Title</label>
                  <p className="text-gray-800 font-semibold">{viewingNotification.title}</p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase">Message</label>
                  <p className="text-gray-800">{viewingNotification.message}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Priority</label>
                    <p className="text-gray-800 capitalize">{viewingNotification.priority}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Status</label>
                    <p className="text-gray-800 capitalize">{viewingNotification.status}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Type</label>
                    <p className="text-gray-800">{viewingNotification.notification_type}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Created</label>
                    <p className="text-gray-800">{new Date(viewingNotification.created_at).toLocaleString()}</p>
                  </div>
                </div>

                {viewingNotification.attachment_url && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Attachment</label>
                    <a href={viewingNotification.attachment_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      Download Attachment
                    </a>
                  </div>
                )}

                {viewingNotification.expires_at && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 uppercase">Expires At</label>
                    <p className="text-gray-800">{new Date(viewingNotification.expires_at).toLocaleString()}</p>
                  </div>
                )}
              </div>

              <Button onClick={() => setViewingNotification(null)} className="w-full mt-6">
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
