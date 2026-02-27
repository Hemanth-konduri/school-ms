'use client'

import { useState, useEffect } from 'react'
import { Calendar, Plus, Edit2, Trash2, AlertCircle, Clock, MapPin, User, BookOpen } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

interface TimetableEvent {
  id: string
  batch_id: string
  subject_id: string
  teacher_id: string
  subject_name: string
  teacher_name: string
  start_time: string
  end_time: string
  room: string
  event_type: string
  semester: number
  notes: string
}

interface Batch {
  id: string
  name: string
  academic_year: string
}

interface Subject {
  id: string
  name: string
}

interface Teacher {
  id: string
  name: string
}

export default function CalendarTimetablePage() {
  const [batches, setBatches] = useState<Batch[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [events, setEvents] = useState<TimetableEvent[]>([])
  const [selectedBatch, setSelectedBatch] = useState('')
  const [selectedWeekStart, setSelectedWeekStart] = useState(new Date())
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'teacher'>('week')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingEvent, setEditingEvent] = useState<TimetableEvent | null>(null)
  const [conflicts, setConflicts] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    subject_id: '',
    teacher_id: '',
    start_time: '',
    end_time: '',
    room: '',
    event_type: 'lecture' as const,
    semester: 1,
    notes: ''
  })

  useEffect(() => {
    loadBatches()
    loadTeachers()
  }, [])

  useEffect(() => {
    if (selectedBatch) {
      loadSubjects()
      loadEvents()
    }
  }, [selectedBatch, selectedWeekStart])

  const loadBatches = async () => {
    const { data } = await supabase.from('batches').select('id, name, academic_year')
    if (data) setBatches(data)
  }

  const loadTeachers = async () => {
    const { data } = await supabase
      .from('teachers')
      .select('id, name')
      .eq('is_active', true)
    if (data) setTeachers(data)
  }

  const loadSubjects = async () => {
    const { data } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('batch_id', selectedBatch)
    if (data) setSubjects(data)
  }

  const loadEvents = async () => {
    if (!selectedBatch) return
    setLoading(true)
    
    const weekEnd = new Date(selectedWeekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    const { data } = await supabase
      .from('timetable_events')
      .select(`
        id, batch_id, subject_id, teacher_id, start_time, end_time,
        room, event_type, semester, notes,
        subjects(name), teachers(name)
      `)
      .eq('batch_id', selectedBatch)
      .gte('start_time', selectedWeekStart.toISOString())
      .lt('start_time', weekEnd.toISOString())
      .eq('status', 'active')

    if (data) {
      const mapped = data.map((e: any) => ({
        ...e,
        subject_name: e.subjects?.name,
        teacher_name: e.teachers?.name
      }))
      setEvents(mapped)
    }
    setLoading(false)
  }

  const handleOpenModal = (event?: TimetableEvent, timeSlot?: { start: Date; end: Date }) => {
    if (event) {
      setEditingEvent(event)
      const start = new Date(event.start_time)
      const end = new Date(event.end_time)
      setFormData({
        subject_id: event.subject_id,
        teacher_id: event.teacher_id,
        start_time: start.toISOString().slice(0, 16),
        end_time: end.toISOString().slice(0, 16),
        room: event.room || '',
        event_type: event.event_type as any,
        semester: event.semester,
        notes: event.notes || ''
      })
    } else if (timeSlot) {
      setEditingEvent(null)
      setFormData({
        subject_id: '',
        teacher_id: '',
        start_time: timeSlot.start.toISOString().slice(0, 16),
        end_time: timeSlot.end.toISOString().slice(0, 16),
        room: '',
        event_type: 'lecture',
        semester: 1,
        notes: ''
      })
    }
    setIsModalOpen(true)
  }

  const handleSaveEvent = async () => {
    if (!selectedBatch || !formData.subject_id || !formData.teacher_id) {
      alert('Please fill all required fields')
      return
    }

    // Check for conflicts
    const conflictCheck = await fetch('/api/timetable/check-conflicts', {
      method: 'POST',
      body: JSON.stringify({
        batch_id: selectedBatch,
        teacher_id: formData.teacher_id,
        room: formData.room,
        start_time: formData.start_time,
        end_time: formData.end_time,
        exclude_event_id: editingEvent?.id
      })
    }).then(r => r.json())

    if (conflictCheck.conflicts.length > 0) {
      setConflicts(conflictCheck.conflicts)
      alert('⚠️ Scheduling conflicts detected. Please review and try again.')
      return
    }

    const eventData = {
      batch_id: selectedBatch,
      subject_id: formData.subject_id,
      teacher_id: formData.teacher_id,
      start_time: new Date(formData.start_time).toISOString(),
      end_time: new Date(formData.end_time).toISOString(),
      room: formData.room,
      event_type: formData.event_type,
      semester: formData.semester,
      notes: formData.notes,
      status: 'active',
      created_by: (await supabase.auth.getUser()).data.user?.id
    }

    if (editingEvent) {
      await supabase
        .from('timetable_events')
        .update(eventData)
        .eq('id', editingEvent.id)
    } else {
      await supabase
        .from('timetable_events')
        .insert([eventData])
    }

    setIsModalOpen(false)
    setEditingEvent(null)
    loadEvents()
  }

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm('Delete this event?')) return
    await supabase
      .from('timetable_events')
      .update({ status: 'cancelled' })
      .eq('id', eventId)
    loadEvents()
  }

  // Get events for the week view
  const getWeekEvents = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    const weekTimes: { [key: string]: TimetableEvent[] } = {}
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(selectedWeekStart)
      date.setDate(date.getDate() + i)
      const dateStr = date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' })
      weekTimes[`${days[date.getDay()]} ${dateStr}`] = events.filter(e => {
        const eDate = new Date(e.start_time)
        return eDate.toLocaleDateString() === date.toLocaleDateString()
      })
    }
    return weekTimes
  }

  const weekEvents = getWeekEvents()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Calendar Timetable</h1>
              <p className="text-gray-500 text-sm">Visual schedule management with conflict detection</p>
            </div>
          </div>
          <Button onClick={() => handleOpenModal()} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4 mr-2" />
            New Event
          </Button>
        </div>

        {/* Controls */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Batch</label>
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">View Mode</label>
              <Select value={viewMode} onValueChange={(val: any) => setViewMode(val)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Week View</SelectItem>
                  <SelectItem value="day">Day View</SelectItem>
                  <SelectItem value="teacher">Teacher View</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Week Starting</label>
              <Input
                type="date"
                value={selectedWeekStart.toISOString().split('T')[0]}
                onChange={e => setSelectedWeekStart(new Date(e.target.value))}
              />
            </div>

            <div className="flex items-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  const prev = new Date(selectedWeekStart)
                  prev.setDate(prev.getDate() - 7)
                  setSelectedWeekStart(prev)
                }}
              >
                ← Prev
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const next = new Date(selectedWeekStart)
                  next.setDate(next.getDate() + 7)
                  setSelectedWeekStart(next)
                }}
              >
                Next →
              </Button>
            </div>
          </div>
        </Card>

        {/* Conflicts Alert */}
        {conflicts.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Scheduling Conflicts Detected:</strong>
              {conflicts.map((c, i) => (
                <div key={i} className="text-sm mt-1">
                  • {c.conflict_type}: {c.conflicting_with}
                </div>
              ))}
            </AlertDescription>
          </Alert>
        )}

        {/* Week View Grid */}
        {viewMode === 'week' && (
          <div className="grid grid-cols-7 gap-2">
            {Object.entries(weekEvents).map(([day, dayEvents]) => (
              <Card key={day} className="p-4 min-h-[600px] bg-gradient-to-br from-white to-blue-50">
                <h3 className="font-bold text-gray-800 mb-4 text-center border-b pb-2">{day}</h3>
                <div className="space-y-2">
                  {dayEvents.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-8">No classes</p>
                  ) : (
                    dayEvents.map(event => (
                      <div
                        key={event.id}
                        className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-3 rounded-lg text-xs cursor-pointer hover:shadow-lg transition transform hover:scale-105 group"
                        onClick={() => handleOpenModal(event)}
                      >
                        <div className="font-semibold truncate">{event.subject_name}</div>
                        <div className="text-blue-100 text-xs mt-1">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -
                          {new Date(event.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        {event.room && (
                          <div className="text-blue-100 text-xs">
                            <MapPin className="h-3 w-3 inline mr-1" />
                            {event.room}
                          </div>
                        )}
                        <div className="text-blue-100 text-xs">
                          <User className="h-3 w-3 inline mr-1" />
                          {event.teacher_name}
                        </div>
                        <div className="mt-2 space-x-1">
                          <Badge variant="secondary" className="text-xs bg-white text-blue-600">{event.event_type}</Badge>
                        </div>
                        <div className="hidden group-hover:flex gap-1 mt-2 pt-2 border-t border-blue-400">
                          <button
                            className="flex-1 bg-white text-blue-600 px-2 py-1 rounded text-xs font-semibold hover:bg-blue-50"
                            onClick={e => {
                              e.stopPropagation()
                              handleOpenModal(event)
                            }}
                          >
                            <Edit2 className="h-3 w-3" />
                          </button>
                          <button
                            className="flex-1 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold hover:bg-red-600"
                            onClick={e => {
                              e.stopPropagation()
                              handleDeleteEvent(event.id)
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Event Modal */}
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Subject *</label>
                <Select value={formData.subject_id} onValueChange={val => setFormData({ ...formData, subject_id: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Teacher *</label>
                <Select value={formData.teacher_id} onValueChange={val => setFormData({ ...formData, teacher_id: val })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Start Time *</label>
                  <Input
                    type="datetime-local"
                    value={formData.start_time}
                    onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">End Time *</label>
                  <Input
                    type="datetime-local"
                    value={formData.end_time}
                    onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Room</label>
                  <Input
                    placeholder="e.g., A101"
                    value={formData.room}
                    onChange={e => setFormData({ ...formData, room: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Event Type</label>
                  <Select value={formData.event_type} onValueChange={val => setFormData({ ...formData, event_type: val as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lecture">Lecture</SelectItem>
                      <SelectItem value="practical">Practical</SelectItem>
                      <SelectItem value="lab">Lab</SelectItem>
                      <SelectItem value="seminar">Seminar</SelectItem>
                      <SelectItem value="exam">Exam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                <Input
                  placeholder="Additional notes..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={() => setIsModalOpen(false)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleSaveEvent} className="flex-1 bg-blue-600 hover:bg-blue-700">
                  {editingEvent ? 'Update' : 'Create'} Event
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
