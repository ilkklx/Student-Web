import { ArrowPathIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'react-toastify'
import Spinner from '../../components/ui/Spinner'
import StudentPhoto from '../../components/ui/StudentPhoto'
import { useRole } from '../../hooks/useRole'
import { getApiErrorMessage } from '../../lib/errors'
import { queryKeys } from '../../lib/queryKeys'
import { getDeletedStudents, restoreStudent } from '../../lib/studentsApi'

export default function RecycleBinPage() {
  const qc = useQueryClient()
  const { canAdminActions } = useRole()
  const [selected, setSelected] = useState(() => new Set())
  const [banner, setBanner] = useState(true)

  const q = useQuery({
    queryKey: queryKeys.deletedStudents,
    queryFn: getDeletedStudents,
    enabled: canAdminActions,
  })

  const restoreMut = useMutation({
    mutationFn: restoreStudent,
    onSuccess: async () => {
      toast.success('Restored')
      await qc.invalidateQueries({ queryKey: queryKeys.deletedStudents })
      await qc.invalidateQueries({ queryKey: ['students'] })
      await qc.invalidateQueries({ queryKey: queryKeys.dashboardStats })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Restore failed')),
  })

  const rows = q.data || []

  const toggle = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    const ids = rows.map((r) => r.id)
    const all = ids.length && ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (all) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  const bulkRestore = async () => {
    if (!selected.size) return
    await Promise.all(Array.from(selected).map((id) => restoreMut.mutateAsync(id)))
    setSelected(new Set())
  }

  const initials = (name) =>
    String(name || '')
      .split(' ')
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '—'

  const avatarColors = ['bg-violet-600', 'bg-emerald-600', 'bg-amber-600', 'bg-rose-600', 'bg-sky-600', 'bg-fuchsia-600']

  if (!canAdminActions) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-800 dark:text-amber-100">
        Admin only.
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

  return (
    <div className="space-y-6">
      <div className="text-xs text-slate-500">
        <span className="text-slate-600 dark:text-slate-400">Home</span>{' '}
        <span className="text-slate-400 dark:text-slate-500">/</span>{' '}
        <span className="text-slate-600 dark:text-slate-400">Students</span>{' '}
        <span className="text-slate-400 dark:text-slate-500">/</span>{' '}
        <span className="text-indigo-600 dark:text-indigo-300">Recycle bin</span>
      </div>

      {banner ? (
        <div className="flex items-start justify-between gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4">
          <div className="flex gap-3">
            <ExclamationTriangleIcon className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-200" />
            <div className="text-sm text-amber-800 dark:text-amber-50">
              <div className="font-semibold">Admin only</div>
              <div className="mt-1 text-amber-700 dark:text-amber-100/80">
                You are viewing soft-deleted students. Restored students return to the active list.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-1 text-amber-600 hover:bg-black/5 dark:text-amber-200 dark:hover:bg-black/20"
            onClick={() => setBanner(false)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Recycle bin</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Restore students or review deleted records.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/50 px-4 py-2 text-sm font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-500"
            title="Not supported by backend"
          >
            Bulk delete permanently
          </button>
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="flex flex-wrap items-center gap-3">
          <input type="checkbox" onChange={toggleAll} checked={rows.length > 0 && rows.every((r) => selected.has(r.id))} />
          <div className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">{selected.size}</span> selected
          </div>
          <button
            type="button"
            disabled={selected.size === 0 || restoreMut.isPending}
            onClick={bulkRestore}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 dark:bg-indigo-600 dark:hover:bg-indigo-500"
          >
            Bulk restore
          </button>
          <button
            type="button"
            onClick={() => q.refetch()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <ArrowPathIcon className={`h-4 w-4 ${q.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-400">
          Total deleted students: <span className="font-semibold text-slate-900 dark:text-white">{rows.length}</span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
            <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:bg-black/20 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3"> </th>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Deleted on</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {rows.map((s, idx) => {
                return (
                  <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 overflow-hidden rounded-full ring-1 ring-slate-200 dark:ring-white/10">
                          {s.photoUrl ? (
                            <StudentPhoto photoUrl={s.photoUrl} studentId={s.id} className="h-full w-full object-cover" />
                          ) : (
                            <div
                              className={`grid h-full w-full place-items-center text-xs font-bold text-white ${
                                avatarColors[idx % avatarColors.length]
                              }`}
                            >
                              {initials(s.name)}
                            </div>
                          )}
                        </div>
                        <div className="font-medium text-slate-900 dark:text-white">{s.name}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{s.id}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{s.email}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-500">—</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => restoreMut.mutate(s.id)}
                        className="rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-500/15 dark:text-indigo-100 dark:hover:bg-indigo-500/15"
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    Recycle bin is empty.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
