import {
  ArrowPathIcon,
  FunnelIcon,
  PencilSquareIcon,
  PhotoIcon,
  PlusIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { toast } from 'react-toastify'
import Spinner from '../../components/ui/Spinner'
import StudentPhoto from '../../components/ui/StudentPhoto'
import { useRole } from '../../hooks/useRole'
import { getApiErrorMessage } from '../../lib/errors'
import { queryKeys } from '../../lib/queryKeys'
import {
  bulkDeleteStudents,
  createStudent,
  deleteStudent,
  exportStudentsCsv,
  getStudents,
  updateStudent,
  uploadStudentPhoto,
} from '../../lib/studentsApi'
import StudentFormModal from './StudentFormModal'

const deptColors = [
  'bg-indigo-300 text-black ring-indigo-400 dark:bg-indigo-300 dark:text-black dark:ring-indigo-400',
  'bg-sky-300 text-black ring-sky-400 dark:bg-sky-300 dark:text-black dark:ring-sky-400',
  'bg-emerald-300 text-black ring-emerald-400 dark:bg-emerald-300 dark:text-black dark:ring-emerald-400',
  'bg-amber-300 text-black ring-amber-400 dark:bg-amber-300 dark:text-black dark:ring-amber-400',
  'bg-fuchsia-300 text-black ring-fuchsia-400 dark:bg-fuchsia-300 dark:text-black dark:ring-fuchsia-400',
]

function deptClass(name) {
  let h = 0
  for (let i = 0; i < name.length; i += 1) h = (h + name.charCodeAt(i) * 13) % 997
  return deptColors[h % deptColors.length]
}

export default function StudentsPage() {
  const qc = useQueryClient()
  const { canAdminActions } = useRole()
  const [searchParams, setSearchParams] = useSearchParams()

  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [sortBy, setSortBy] = useState('id')
  const [sortDir, setSortDir] = useState('asc')
  const [name, setName] = useState('')
  const [department, setDepartment] = useState('')

  const [selected, setSelected] = useState(() => new Set())
  const [modal, setModal] = useState({ open: false, mode: 'create', student: null })
  const fileRef = useRef(null)
  const [uploadForId, setUploadForId] = useState(null)

  useEffect(() => {
    const n = searchParams.get('name')
    if (n != null) setName(n)
  }, [searchParams])

  const params = useMemo(
    () => ({ page, size, sortBy, sortDir, name: name || undefined, department: department || undefined }),
    [page, size, sortBy, sortDir, name, department],
  )

  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    queryKey: queryKeys.students(params),
    queryFn: () => getStudents(params),
  })

  const rows = data?.content || []
  const totalPages = data?.totalPages ?? 0
  const pageNumber = data?.number ?? page
  const totalElements = data?.totalElements ?? 0

  const createMut = useMutation({
    mutationFn: createStudent,
    onSuccess: async () => {
      toast.success('Student created')
      setModal({ open: false, mode: 'create', student: null })
      await qc.invalidateQueries({ queryKey: ['students'] })
      await qc.invalidateQueries({ queryKey: queryKeys.dashboardStats })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Create failed')),
  })

  const updateMut = useMutation({
    mutationFn: ({ id, body }) => updateStudent(id, body),
    onSuccess: async () => {
      toast.success('Student updated')
      setModal({ open: false, mode: 'create', student: null })
      await qc.invalidateQueries({ queryKey: ['students'] })
      await qc.invalidateQueries({ queryKey: queryKeys.dashboardStats })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Update failed')),
  })

  const deleteMut = useMutation({
    mutationFn: deleteStudent,
    onSuccess: async () => {
      toast.success('Student moved to recycle bin')
      await qc.invalidateQueries({ queryKey: ['students'] })
      await qc.invalidateQueries({ queryKey: queryKeys.deletedStudents })
      await qc.invalidateQueries({ queryKey: queryKeys.dashboardStats })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Delete failed')),
  })

  const bulkMut = useMutation({
    mutationFn: bulkDeleteStudents,
    onSuccess: async () => {
      toast.success('Bulk delete completed')
      setSelected(new Set())
      await qc.invalidateQueries({ queryKey: ['students'] })
      await qc.invalidateQueries({ queryKey: queryKeys.deletedStudents })
      await qc.invalidateQueries({ queryKey: queryKeys.dashboardStats })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Bulk delete failed')),
  })

  const uploadMut = useMutation({
    mutationFn: ({ id, file }) => uploadStudentPhoto(id, file),
    onSuccess: async () => {
      toast.success('Photo updated')
      setUploadForId(null)
      await qc.invalidateQueries({ queryKey: ['students'] })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Upload failed')),
  })

  const toggleRow = (id) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAllPage = () => {
    const ids = rows.map((r) => r.id)
    const allSelected = ids.length && ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  const applySearchToUrl = () => {
    const next = new URLSearchParams(searchParams)
    if (name) next.set('name', name)
    else next.delete('name')
    setSearchParams(next, { replace: true })
  }

  const exportCsv = async () => {
    try {
      const blob = await exportStudentsCsv()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'students.csv'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('CSV downloaded')
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Export failed'))
    }
  }

  const onPickPhoto = (id) => {
    setUploadForId(id)
    fileRef.current?.click()
  }

  const onFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || uploadForId == null) return
    uploadMut.mutate({ id: uploadForId, file })
  }

  if (isPending) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-10 w-10" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
        <div className="font-semibold">Could not load students</div>
        <div className="mt-2 text-rose-200/80">{getApiErrorMessage(error)}</div>
        <button
          type="button"
          className="mt-4 rounded-xl bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/15 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
          onClick={() => refetch()}
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Students</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Manage and view all students.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canAdminActions ? (
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              Export CSV
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setModal({ open: true, mode: 'create', student: null })}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 dark:bg-indigo-600 dark:hover:bg-indigo-500"
          >
            <PlusIcon className="h-5 w-5" />
            Add student
          </button>
        </div>
      </div>

      {/* Filters panel */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.02]">
        <div className="grid gap-3 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-5">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Search</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={applySearchToUrl}
              onKeyDown={(e) => {
                if (e.key === 'Enter') applySearchToUrl()
              }}
              placeholder="Search by name or email…"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:ring-indigo-500/40"
            />
          </div>
          <div className="lg:col-span-3">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Department</label>
            <input
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value)
                setPage(0)
              }}
              placeholder="All departments"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:ring-indigo-500/40"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value)
                setPage(0)
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:ring-indigo-500/40"
            >
              <option value="id">ID</option>
              <option value="name">Name</option>
              <option value="email">Email</option>
              <option value="department">Department</option>
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">Direction</label>
            <select
              value={sortDir}
              onChange={(e) => {
                setSortDir(e.target.value)
                setPage(0)
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:ring-indigo-500/40"
            >
              <option value="asc">Ascending</option>
              <option value="desc">Descending</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <ArrowPathIcon className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <span className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white/50 px-3 py-2 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            <FunnelIcon className="h-4 w-4" />
            Filters apply to the API query
          </span>
        </div>
      </div>

      {/* Bulk actions */}
      {canAdminActions ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="text-sm text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-white">{selected.size}</span> selected
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={selected.size === 0 || bulkMut.isPending}
              onClick={() => {
                if (!selected.size) return
                if (!window.confirm(`Soft-delete ${selected.size} student(s)?`)) return
                bulkMut.mutate(Array.from(selected))
              }}
              className="rounded-xl bg-rose-600/90 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-rose-600/90 dark:hover:bg-rose-600"
            >
              Bulk delete
            </button>
          </div>
        </div>
      ) : null}

      {/* Students table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-white/[0.02]">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-white/10">
            <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-700 dark:bg-black/20 dark:text-slate-400">
              <tr>
                {canAdminActions ? (
                  <th className="px-4 py-3">
                    <input type="checkbox" onChange={toggleAllPage} checked={rows.length > 0 && rows.every((r) => selected.has(r.id))} />
                  </th>
                ) : null}
                <th className="px-4 py-3">Photo</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/10">
              {rows.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03]">
                  {canAdminActions ? (
                    <td className="px-4 py-3 align-middle">
                      <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleRow(s.id)} />
                    </td>
                  ) : null}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-10 w-10 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-900">
                        <StudentPhoto
                          photoUrl={s.photoUrl}
                          studentId={s.id}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => onPickPhoto(s.id)}
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        title="Upload photo"
                      >
                        <PhotoIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-900 dark:text-white">{s.name}</span>
                      <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[11px] font-semibold text-sky-800 ring-1 ring-sky-200 dark:bg-sky-500/15 dark:text-sky-200 dark:ring-sky-500/20">
                        Active
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{s.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${deptClass(s.department || '')}`}>
                      {s.department}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setModal({ open: true, mode: 'edit', student: s })}
                        className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                        title="Edit"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                      </button>
                      {canAdminActions ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm(`Soft-delete ${s.name}?`)) return
                            deleteMut.mutate(s.id)
                          }}
                          className="rounded-full border border-rose-500/30 bg-rose-500/10 p-2 text-rose-600 hover:bg-rose-500/15 dark:text-rose-200 dark:hover:bg-rose-500/15"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={canAdminActions ? 6 : 5} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    No students found.
                  </td>
                </tr>
              ) : null}
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
            of <span className="font-medium text-slate-900 dark:text-slate-200">{totalElements}</span> students
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={pageNumber <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              >
                Prev
              </button>
              <div className="px-2 text-xs text-slate-600 dark:text-slate-300">
                Page {pageNumber + 1} of {Math.max(1, totalPages)}
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

      <StudentFormModal
        open={modal.open}
        mode={modal.mode}
        initial={modal.student}
        onClose={() => setModal({ open: false, mode: 'create', student: null })}
        onSubmit={async (values) => {
          if (modal.mode === 'create') await createMut.mutateAsync(values)
          else await updateMut.mutateAsync({ id: modal.student.id, body: values })
        }}
      />
    </div>
  )
}
