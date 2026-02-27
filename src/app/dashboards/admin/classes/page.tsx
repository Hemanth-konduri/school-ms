'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, CalendarDays, LayoutList, BookOpen, CalendarRange, AlertTriangle, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ClassesPage() {
  const router = useRouter()

  const sections = [
    {
      step: '01',
      title: 'Academic Year Setup',
      desc: 'Define the academic year — start/end dates, working days, working hours. This is the foundation.',
      icon: CalendarRange,
      color: 'bg-blue-50 hover:bg-blue-100',
      iconBg: 'bg-blue-600',
      link: '/dashboards/admin/classes/academic-year',
      tag: 'Foundation',
      tagColor: 'bg-blue-100 text-blue-700',
    },
    {
      step: '02',
      title: 'Semester Planning',
      desc: 'Define semester start/end dates per batch, total teaching weeks, and working hours.',
      icon: BookOpen,
      color: 'bg-teal-50 hover:bg-teal-100',
      iconBg: 'bg-teal-600',
      link: '/dashboards/admin/classes/semester-plan',
      tag: 'Step 2',
      tagColor: 'bg-teal-100 text-teal-700',
    },
    {
      step: '03',
      title: 'Weekly Template Builder',
      desc: 'Create the repeating weekly timetable. Define which subject is taught on which day and time.',
      icon: CalendarDays,
      color: 'bg-indigo-50 hover:bg-indigo-100',
      iconBg: 'bg-indigo-600',
      link: '/dashboards/admin/classes/timetable-builder',
      tag: 'Core',
      tagColor: 'bg-indigo-100 text-indigo-700',
    },
    {
      step: '04',
      title: 'View Calendar Timetable',
      desc: 'Full calendar view — batch-wise or teacher-wise. Navigate by week or day. Update lesson topics.',
      icon: LayoutList,
      color: 'bg-violet-50 hover:bg-violet-100',
      iconBg: 'bg-violet-600',
      link: '/dashboards/admin/classes/calendar',
      tag: 'Calendar',
      tagColor: 'bg-violet-100 text-violet-700',
    },
    {
      step: '05',
      title: 'Holidays & Exceptions',
      desc: 'Mark exam periods, holidays, semester breaks. These are automatically excluded from timetables.',
      icon: AlertTriangle,
      color: 'bg-orange-50 hover:bg-orange-100',
      iconBg: 'bg-orange-500',
      link: '/dashboards/admin/classes/exceptions',
      tag: 'Step 5',
      tagColor: 'bg-orange-100 text-orange-700',
    },
  ]

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      <div className="relative bg-gradient-to-br from-[#faf8f3] to-[#f0ebe0] shadow-md overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: `linear-gradient(#666 1px, transparent 1px), linear-gradient(90deg, #666 1px, transparent 1px)`, backgroundSize: '30px 30px' }} />
        <div className="relative max-w-5xl mx-auto px-8 py-10">
          <Button variant="ghost" onClick={() => router.push('/dashboards/admin')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 mb-6 px-0 hover:bg-transparent">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 flex items-center justify-center shadow-lg">
              <CalendarDays className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Classes & Scheduling</h1>
              <p className="text-gray-500 text-sm mt-1">Full academic calendar — year structure, semester planning, timetable builder</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((s) => {
            const Icon = s.icon
            return (
              <button key={s.title} onClick={() => router.push(s.link)}
                className={`${s.color} p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left relative group overflow-hidden`}>
                <div className="flex items-start justify-between mb-6">
                  <div className={`${s.iconBg} p-3 shadow-sm`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 font-semibold ${s.tagColor}`}>{s.tag}</span>
                    <span className="text-4xl font-black text-gray-100 select-none">{s.step}</span>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
                <div className="mt-6 flex items-center gap-1 text-sm font-semibold text-gray-700 group-hover:gap-2 transition-all">
                  Open <ChevronRight className="h-4 w-4" />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
