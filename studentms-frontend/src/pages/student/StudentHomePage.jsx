import { CalendarDaysIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'
import { getLinkedStudentId } from '../../lib/authStorage'
import { queryKeys } from '../../lib/queryKeys'
import { getStudent, getStudentCourses } from '../../lib/studentsApi'
import ProgressRing from './ProgressRing'
import { pctForCourse } from '../../lib/studentUi'

const colors = ['#7c3aed', '#10b981', '#f97316', '#38bdf8']

export default function StudentHomePage() {
  const { username } = useAuth()
  const id = getLinkedStudentId()

  const studentQ = useQuery({
    queryKey: queryKeys.student(id),
    queryFn: () => getStudent(id),
    enabled: Boolean(id),
  })

  const coursesQ = useQuery({
    queryKey: queryKeys.studentCourses(id),
    queryFn: () => getStudentCourses(id),
    enabled: Boolean(id),
  })

  if (!id) {
    return (
      <div className="space-y-6">
        <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-r from-violet-100 to-slate-100 p-8 dark:from-violet-950/60 dark:to-slate-950/40">
          <div className="text-sm text-violet-700 dark:text-violet-200/90">Welcome</div>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">Link your student record</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            The backend does not expose a self-service “me” student id yet. Choose your student profile on the
            profile page so this portal can load your courses and uploads.
          </p>
          <Link
            to="/student/profile"
            className="mt-6 inline-flex rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-500 dark:bg-violet-600 dark:hover:bg-violet-500"
          >
            Open profile
          </Link>
        </div>
      </div>
    )
  }

  if (studentQ.isError) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-800 dark:text-rose-100">
        Could not load your student profile.
      </div>
    )
  }

  if (studentQ.isPending || coursesQ.isPending) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-10 w-10" />
      </div>
    )
  }

  const student = studentQ.data
  const courses = coursesQ.data || []

  const deadlines = courses.slice(0, 4).map((c, idx) => ({
    title: `${c.title} checkpoint`,
    course: c.title,
    days: 2 + idx * 3,
    color: colors[idx % colors.length],
  }))

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-r from-violet-100 via-slate-100 to-slate-50 p-8 dark:border-white/10 dark:from-violet-950/60 dark:via-slate-950/30 dark:to-slate-950/20">
        <div className="text-sm text-violet-700 dark:text-violet-200/90">Welcome back,</div>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">
          {student?.name || username}{' '}
          <span aria-hidden>👋</span>
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Ready to learn something new today?</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* My courses card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">My courses</div>
            <Link to="/student/courses" className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-200">
              View all courses →
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {courses.slice(0, 4).map((c, idx) => {
              const pct = pctForCourse(c.id, c.title)
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-black/20"
                >
                  <div
                    className="grid h-10 w-10 place-items-center rounded-xl text-xs font-bold text-white"
                    style={{ backgroundColor: `${colors[idx % colors.length]}33`, border: `1px solid ${colors[idx % colors.length]}55` }}
                  >
                    {c.code?.slice(0, 2)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold text-slate-900 dark:text-white">{c.title}</div>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">{c.code}</div>
                  </div>
                  <ProgressRing value={pct} color={colors[idx % colors.length]} />
                </div>
              )
            })}
            {courses.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">No courses yet. Ask your admin to enroll you.</div>
            ) : null}
          </div>
        </div>

        {/* Upcoming deadlines card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Upcoming deadlines</div>
            <span className="text-xs font-semibold text-violet-600 dark:text-violet-300">View all</span>
          </div>
          <div className="mt-4 space-y-3">
            {deadlines.map((d, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-black/20">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{d.title}</div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">{d.course}</div>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold text-white"
                  style={{ backgroundColor: `${d.color}33`, border: `1px solid ${d.color}55` }}
                >
                  {d.days} days left
                </span>
              </div>
            ))}
            {deadlines.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">No deadlines to show yet.</div>
            ) : null}
          </div>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-200"
          >
            <CalendarDaysIcon className="h-4 w-4" />
            View academic calendar
          </button>
        </div>
      </div>
    </div>
  )
}