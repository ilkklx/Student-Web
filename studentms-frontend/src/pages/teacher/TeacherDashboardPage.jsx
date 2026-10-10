import {
  BookOpenIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import Spinner from '../../components/ui/Spinner'
import { getApiErrorMessage } from '../../lib/errors'
import api from '../../lib/api'

export default function TeacherDashboardPage() {
  const q = useQuery({ queryKey: ['teacherStats'], queryFn: async () => (await api.get('/dashboard/teacher')).data })

  if (q.isPending) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-10 w-10" />
      </div>
    )
  }

  if (q.isError) return <p role="alert">{getApiErrorMessage(q.error)}</p>

  const d = q.data

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Teacher dashboard</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">仅统计本人任教课程及其有效选课学生。</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          to="/teacher/roster"
          className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Class roster</div>
            <UserGroupIcon className="h-5 w-5 text-teal-600 dark:text-teal-300" />
          </div>
          <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">Search students and track engagement.</div>
        </Link>
        <Link
          to="/courses"
          className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Courses</div>
            <BookOpenIcon className="h-5 w-5 text-teal-600 dark:text-teal-300" />
          </div>
          <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">Browse catalog and manage enrollments.</div>
        </Link>
        <Link
          to="/enrollments"
          className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/[0.03] dark:hover:bg-white/[0.05]"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Enrollments</div>
            <ClipboardDocumentListIcon className="h-5 w-5 text-teal-600 dark:text-teal-300" />
          </div>
          <div className="mt-3 text-xs text-slate-600 dark:text-slate-400">Enroll, drop, and audit schedules.</div>
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">Students</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            {Intl.NumberFormat().format(d.totalStudents ?? 0)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">Courses</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            {Intl.NumberFormat().format(d.totalCourses ?? 0)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">Enrollments</div>
          <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
            {Intl.NumberFormat().format(d.totalEnrollments ?? 0)}
          </div>
        </div>
      </div>
    </div>
  )
}
