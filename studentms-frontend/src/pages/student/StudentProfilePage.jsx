import { PhotoIcon } from '@heroicons/react/24/outline'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { toast } from 'react-toastify'
import Spinner from '../../components/ui/Spinner'
import StudentPhoto from '../../components/ui/StudentPhoto'
import { getLinkedStudentId, setLinkedStudentId } from '../../lib/authStorage'
import { getApiErrorMessage } from '../../lib/errors'
import { queryKeys } from '../../lib/queryKeys'
import { getStudent, getStudents, uploadStudentPhoto } from '../../lib/studentsApi'

export default function StudentProfilePage() {
  const qc = useQueryClient()
  const fileRef = useRef(null)
  const [q, setQ] = useState('')
  const linked = getLinkedStudentId()

  const search = useQuery({
    queryKey: queryKeys.students({ page: 0, size: 20, name: q || undefined }),
    queryFn: () => getStudents({ page: 0, size: 20, name: q || undefined, sortBy: 'id', sortDir: 'asc' }),
    enabled: q.trim().length >= 2,
  })

  const studentQ = useQuery({
    queryKey: queryKeys.student(linked),
    queryFn: () => getStudent(linked),
    enabled: Boolean(linked),
  })

  const uploadMut = useMutation({
    mutationFn: (file) => uploadStudentPhoto(linked, file),
    onSuccess: async () => {
      toast.success('Photo updated')
      await qc.invalidateQueries({ queryKey: queryKeys.student(linked) })
      await qc.invalidateQueries({ queryKey: ['students'] })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Upload failed')),
  })

  const onFile = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !linked) return
    uploadMut.mutate(file)
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">My profile</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Link your student record and keep your photo up to date.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left panel – search and link */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Find your student record</div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
            Search by name (min 2 chars). This links your login to a specific `studentId` locally.
          </p>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-violet-500/40 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500"
            placeholder="Search students…"
          />
          <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-slate-200 dark:border-white/10">
            {(search.data?.content || []).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setLinkedStudentId(s.id)
                  toast.success(`Linked to ${s.name}`)
                  qc.invalidateQueries({ queryKey: queryKeys.student(s.id) })
                  qc.invalidateQueries({ queryKey: queryKeys.studentCourses(s.id) })
                }}
                className="flex w-full items-center justify-between gap-3 border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:border-white/5 dark:hover:bg-white/[0.03]"
              >
                <span className="font-medium text-slate-900 dark:text-white">{s.name}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">{s.email}</span>
              </button>
            ))}
            {q.trim().length >= 2 && (search.data?.content || []).length === 0 && !search.isPending ? (
              <div className="px-3 py-4 text-sm text-slate-500 dark:text-slate-400">No matches.</div>
            ) : null}
            {search.isPending ? (
              <div className="flex justify-center py-6">
                <Spinner className="h-6 w-6" />
              </div>
            ) : null}
          </div>
          {linked ? (
            <button
              type="button"
              onClick={() => {
                const prev = getLinkedStudentId()
                setLinkedStudentId(null)
                toast.success('Cleared link')
                qc.removeQueries({ queryKey: queryKeys.student(prev) })
                qc.removeQueries({ queryKey: queryKeys.studentCourses(prev) })
              }}
              className="mt-4 text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200"
            >
              Clear linked student
            </button>
          ) : null}
        </div>

        {/* Right panel – profile card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="text-sm font-semibold text-slate-900 dark:text-white">Profile card</div>
          {!linked ? (
            <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">Link a student to see details.</div>
          ) : studentQ.isPending ? (
            <div className="mt-8 flex justify-center">
              <Spinner className="h-8 w-8" />
            </div>
          ) : studentQ.isError ? (
            <div className="mt-4 text-sm text-rose-600 dark:text-rose-200">{getApiErrorMessage(studentQ.error)}</div>
          ) : (
            <div className="mt-4 flex flex-col gap-5 sm:flex-row sm:items-start">
              <div className="relative">
                <div className="h-28 w-28 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-slate-900">
                  <StudentPhoto
                    photoUrl={studentQ.data?.photoUrl}
                    studentId={studentQ.data?.id}
                    className="h-full w-full object-cover"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="absolute -bottom-1 -right-1 grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-violet-600 text-white hover:bg-violet-500 dark:border-white/10 dark:bg-violet-600 dark:hover:bg-violet-500"
                  aria-label="Upload photo"
                >
                  <PhotoIcon className="h-5 w-5" />
                </button>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="text-xl font-semibold text-slate-900 dark:text-white">{studentQ.data.name}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{studentQ.data.department}</div>
                <div className="text-sm text-slate-700 dark:text-slate-300">{studentQ.data.email}</div>
                <div className="text-xs text-slate-500 dark:text-slate-500">Student ID: {studentQ.data.id}</div>
              </div>
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/50 p-6 text-center dark:border-white/15 dark:bg-black/20">
            <div className="text-sm font-semibold text-slate-900 dark:text-white">Photo upload</div>
            <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">JPG/PNG up to 5MB (server limits may vary).</div>
            <button
              type="button"
              disabled={!linked || uploadMut.isPending}
              onClick={() => fileRef.current?.click()}
              className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-40 dark:bg-violet-600 dark:hover:bg-violet-500"
            >
              {uploadMut.isPending ? 'Uploading…' : 'Choose file'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}