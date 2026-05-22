import { TrashIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'
import Spinner from '../../components/ui/Spinner'
import { getLinkedStudentId } from '../../lib/authStorage'
import { getApiErrorMessage } from '../../lib/errors'
import { queryKeys } from '../../lib/queryKeys'
import { dropCourse, getStudentCourses } from '../../lib/studentsApi'

export default function StudentCoursesPage() {
  const qc = useQueryClient()
  const id = getLinkedStudentId()

  const q = useQuery({
    queryKey: queryKeys.studentCourses(id),
    queryFn: () => getStudentCourses(id),
    enabled: Boolean(id),
  })

  const dropMut = useMutation({
    mutationFn: (courseId) => dropCourse(id, courseId),
    onSuccess: async () => {
      toast.success('Dropped course')
      await qc.invalidateQueries({ queryKey: queryKeys.studentCourses(id) })
      await qc.invalidateQueries({ queryKey: queryKeys.dashboardStats })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Drop failed (permissions?)')),
  })

  if (!id) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-300">
        Link your student profile first on{' '}
        <Link className="text-violet-600 hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-200" to="/student/profile">
          Profile
        </Link>
        .
      </div>
    )
  }

  if (q.isPending) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-10 w-10" />
      </div>
    )
  }

  if (q.isError) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-800 dark:text-rose-100">
        {getApiErrorMessage(q.error)}
      </div>
    )
  }

  const rows = q.data || []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">My courses</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Courses you are enrolled in.</p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.02]">
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
                  No enrollments yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}