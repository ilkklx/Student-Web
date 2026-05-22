import { ArrowPathIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import Spinner from '../../components/ui/Spinner'
import { absolutePhotoUrl } from '../../lib/assets'
import { getApiErrorMessage } from '../../lib/errors'
import { queryKeys } from '../../lib/queryKeys'
import { getStudents } from '../../lib/studentsApi'

export default function TeacherRosterPage() {
  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  const params = useMemo(
    () => ({ page, size, sortBy, sortDir, name: name || undefined, department: department || undefined }),
    [page, size, sortBy, sortDir, name, department],
  )

  const q = useQuery({ queryKey: queryKeys.students(params), queryFn: () => getStudents(params) })

  const rows = q.data?.content || []
  const totalPages = q.data?.totalPages ?? 0
  const pageNumber = q.data?.number ?? page
  const totalElements = q.data?.totalElements ?? 0

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

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs text-slate-500">
          <span className="text-teal-600 dark:text-teal-300">My classes</span>{' '}
          <span className="text-slate-400 dark:text-slate-500">/</span>{' '}
          <span className="text-slate-700 dark:text-slate-200">Class roster</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Class roster</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Read-only roster view backed by GET /api/students.</p>
      </div>

      {/* Filters panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="grid gap-3 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-6">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Search</label>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-950/40">
              <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setPage(0)
                }}
                placeholder="Search students…"
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>
          </div>
          <div className="lg:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Department</label>
            <input
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value)
                setPage(0)
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-slate-950/40 dark:text-white"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Sort</label>
            <select
              value={`${sortBy}:${sortDir}`}
              onChange={(e) => {
                const [sb, sd] = e.target.value.split(':')
                setSortBy(sb)
                setSortDir(sd)
                setPage(0)
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none dark:border-white/10 dark:bg-slate-950/40 dark:text-white"
            >
              <option value="name:asc">Name (A-Z)</option>
              <option value="name:desc">Name (Z-A)</option>
              <option value="id:asc">ID (asc)</option>
              <option value="id:desc">ID (desc)</option>
            </select>
          </div>
          <div className="lg:col-span-1 flex items-end">
            <button
              type="button"
              onClick={() => q.refetch()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            >
              <ArrowPathIcon className={`h-4 w-4 ${q.isFetching ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Roster table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
            <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:bg-black/20 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">#</th>
                <th className="px-4 py-3">Photo</th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Department</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {rows.map((s, idx) => {
                const photo = absolutePhotoUrl(s.photoUrl)
                return (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-500">{pageNumber * size + idx + 1}</td>
                    <td className="px-4 py-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-900">
                        {photo ? (
                          <img src={photo} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-xs text-slate-500 dark:text-slate-500">—</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{s.name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{s.email}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{s.department}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:text-slate-400">
          <div>
            Showing{' '}
            <span className="font-medium text-slate-900 dark:text-slate-200">
              {totalElements === 0 ? 0 : pageNumber * size + 1} to {Math.min((pageNumber + 1) * size, totalElements)}
            </span>{' '}
            of <span className="font-medium text-slate-900 dark:text-slate-200">{totalElements}</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={size}
              onChange={(e) => {
                setSize(Number(e.target.value))
                setPage(0)
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 dark:border-white/10 dark:bg-slate-950/40 dark:text-white"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n} / page
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={pageNumber <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              Prev
            </button>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              Page {pageNumber + 1} / {Math.max(1, totalPages)}
            </div>
            <button
              type="button"
              disabled={pageNumber + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}