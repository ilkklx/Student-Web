import { ArrowPathIcon, TrashIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import Spinner from '../../components/ui/Spinner'
import { getApiErrorMessage } from '../../lib/errors'
import { queryKeys } from '../../lib/queryKeys'
import { getCourses } from '../../lib/coursesApi'
import { dropCourse, enrollStudent, getStudentCourses, getStudents } from '../../lib/studentsApi'

export default function EnrollmentsPage() {
  const qc = useQueryClient()
  const [studentId, setStudentId] = useState('')
  const [studentQ, setStudentQ] = useState('')
  const [courseId, setCourseId] = useState('')
  const [grade, setGrade] = useState('A')

  const studentsQ = useQuery({
    queryKey: queryKeys.students({ page: 0, size: 30, name: studentQ || undefined }),
    queryFn: () => getStudents({ page: 0, size: 30, name: studentQ || undefined, sortBy: 'id', sortDir: 'asc' }),
  })

  const coursesQ = useQuery({ queryKey: queryKeys.courses, queryFn: getCourses })

  const sid = Number(studentId)
  const coursesForStudent = useQuery({
    queryKey: queryKeys.studentCourses(sid),
    queryFn: () => getStudentCourses(sid),
    enabled: Number.isFinite(sid) && sid > 0,
  })

  const enrollMut = useMutation({
    mutationFn: () => enrollStudent(sid, Number(courseId), grade),
    onSuccess: async () => {
      toast.success('Enrolled')
      setCourseId('')
      await qc.invalidateQueries({ queryKey: queryKeys.studentCourses(sid) })
      await qc.invalidateQueries({ queryKey: queryKeys.dashboardStats })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Enroll failed')),
  })

  const dropMut = useMutation({
    mutationFn: (cid) => dropCourse(sid, cid),
    onSuccess: async () => {
      toast.success('Dropped course')
      await qc.invalidateQueries({ queryKey: queryKeys.studentCourses(sid) })
      await qc.invalidateQueries({ queryKey: queryKeys.dashboardStats })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Drop failed')),
  })

  const rows = coursesForStudent.data || []

  const courseOptions = useMemo(() => coursesQ.data || [], [coursesQ.data])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Enrollments</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Pick a student, review enrolled courses, enroll, or drop.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Student selection card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Student</div>
          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Search</label>
              <input
                value={studentQ}
                onChange={(e) => setStudentQ(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:ring-indigo-500/40"
                placeholder="Search students by name…"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Select</label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:ring-indigo-500/40"
              >
                <option value="">Choose a student</option>
                {(studentsQ.data?.content || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.email}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => studentsQ.refetch()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <ArrowPathIcon className={`h-4 w-4 ${studentsQ.isFetching ? 'animate-spin' : ''}`} />
              Refresh list
            </button>
          </div>
        </div>

        {/* Enrollment form card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Enroll into a course</div>
          <div className="mt-3 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Course</label>
              <select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:ring-indigo-500/40"
              >
                <option value="" disabled>
                  Select course
                </option>
                {courseOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Grade</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:ring-indigo-500/40"
              >
                {['A', 'B', 'C', 'D', 'F'].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              disabled={!sid || !courseId || enrollMut.isPending}
              onClick={() => enrollMut.mutate()}
              className="w-full rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 dark:bg-indigo-600 dark:hover:bg-indigo-500"
            >
              Enroll
            </button>
          </div>
        </div>
      </div>

      {/* Enrolled courses table */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Enrolled courses</div>
          <button
            type="button"
            disabled={!sid}
            onClick={() => coursesForStudent.refetch()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-30 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <ArrowPathIcon className={`h-4 w-4 ${coursesForStudent.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {!sid ? (
          <div className="mt-6 text-sm text-slate-500 dark:text-slate-400">Select a student to load enrollments.</div>
        ) : coursesForStudent.isPending ? (
          <div className="mt-10 flex justify-center">
            <Spinner className="h-8 w-8" />
          </div>
        ) : coursesForStudent.isError ? (
          <div className="mt-6 text-sm text-rose-500 dark:text-rose-200">{getApiErrorMessage(coursesForStudent.error)}</div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
              <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:bg-black/20 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Credits</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                {rows.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-200">{c.code}</td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white">{c.title}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{c.credits}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          if (!window.confirm(`Drop ${c.code}?`)) return
                          dropMut.mutate(c.id)
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-500/15 dark:text-rose-100 dark:hover:bg-rose-500/15"
                      >
                        <TrashIcon className="h-4 w-4" />
                        Drop
                      </button>
                    </td>
                  </tr>
                ))}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                      No enrollments for this student.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}