'use client'

import { useRouter } from 'next/navigation'
import { Building2, Layers, Users, GitBranch, ArrowLeft, ChevronRight, BookMarked } from 'lucide-react'

export default function AcademicPage() {
  const router = useRouter()

  const sections = [
    {
      step: '01',
      title: 'Create School & Programs',
      desc: 'Set up schools and link multiple programs to each school in a single form.',
      icon: Building2,
      color: 'bg-blue-50 hover:bg-blue-100',
      iconBg: 'bg-blue-600',
      link: '/dashboards/admin/academics/schools',
      tag: 'Start Here',
      tagColor: 'bg-blue-100 text-blue-700',
    },
    {
      step: '02',
      title: 'Create Groups / Departments',
      desc: 'Add departments or groups under a school-program combination.',
      icon: GitBranch,
      color: 'bg-green-50 hover:bg-green-100',
      iconBg: 'bg-green-600',
      link: '/dashboards/admin/academics/groups',
      tag: 'Step 2',
      tagColor: 'bg-green-100 text-green-700',
    },
    {
      step: '03',
      title: 'Register Students',
      desc: 'Add students and assign them to a school, program, group, and academic year.',
      icon: Users,
      color: 'bg-orange-50 hover:bg-orange-100',
      iconBg: 'bg-orange-600',
      link: '/dashboards/admin/academics/register-student',
      tag: 'Step 3',
      tagColor: 'bg-orange-100 text-orange-700',
    },
    {
      step: '04',
      title: 'Create Batches & Assign Students',
      desc: 'Form batches and bulk-assign unassigned students to them.',
      icon: Layers,
      color: 'bg-violet-50 hover:bg-violet-100',
      iconBg: 'bg-violet-600',
      link: '/dashboards/admin/academics/batches',
      tag: 'Final Step',
      tagColor: 'bg-violet-100 text-violet-700',
    },
    {
      step: '05',
      title: 'View Academic Hierarchy',
      desc: 'View the complete academic hierarchy of schools, programs, groups, and batches.',
      icon: Layers,
      color: 'bg-cyan-50 hover:bg-cyan-100',
      iconBg: 'bg-cyan-600',
      link: '/dashboards/admin/academics/view-hierarchy',
      tag: 'View',
      tagColor: 'bg-cyan-100 text-cyan-700',
},
{
      step: '05',
      title: 'Manage Subjects',
      desc: 'Create semester-wise subjects linked to batches. Required before creating timetables.',
      icon: BookMarked,
      color: 'bg-teal-50 hover:bg-teal-100',
      iconBg: 'bg-teal-600',
      link: '/dashboards/admin/academics/subjects',
      tag: 'Step 5',
      tagColor: 'bg-teal-100 text-teal-700',

}
  ]

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      {/* Header */}
      <div className="relative bg-gradient-to-br from-[#faf8f3] to-[#f0ebe0] shadow-md overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(#666 1px, transparent 1px), linear-gradient(90deg, #666 1px, transparent 1px)`,
            backgroundSize: '30px 30px',
          }}
        />
        <div className="relative max-w-5xl mx-auto px-8 py-10">
          <button
            onClick={() => router.push('/dashboards/admin')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors mb-6 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-violet-600 flex items-center justify-center shadow-lg">
              <Layers className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Academic Hierarchy</h1>
              <p className="text-gray-500 text-sm mt-1">Build your college structure step by step</p>
            </div>
          </div>
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-5xl mx-auto px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sections.map((s) => {
            const Icon = s.icon
            return (
              <button
                key={s.title}
                onClick={() => router.push(s.link)}
                className={`${s.color} p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left relative group overflow-hidden`}
              >
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
