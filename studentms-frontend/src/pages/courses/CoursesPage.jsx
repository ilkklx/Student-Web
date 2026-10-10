import {
  ClockIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline'
import { DocumentPlusIcon } from '@heroicons/react/24/solid'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import Spinner from '../../components/ui/Spinner'
import { getApiErrorMessage } from '../../lib/errors'
import { createCourse, getCourses } from '../../lib/coursesApi'
import { queryKeys } from '../../lib/queryKeys'
import { enrollStudent, getStudents } from '../../lib/studentsApi'
import CourseFormModal from './CourseFormModal'
import { useSearchParams } from 'react-router-dom'

const swatches = [
  'bg-sky-500/20 text-sky-200',
  'bg-emerald-500/20 text-emerald-200',
  'bg-amber-500/20 text-amber-200',
  'bg-fuchsia-500/20 text-fuchsia-200',
]

export default function CoursesPage() {
  const qc = useQueryClient()
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 6
  const [addOpen, setAddOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const catalogQuery = useQuery({
    queryKey: ['school-course-catalog'],
    queryFn: async () => {
      const response = await fetch('/school-catalog.json')
      if (!response.ok) throw new Error('课程分类目录加载失败')
      return response.json()
    },
  })
  const catalog = catalogQuery.data || []
  const selectedMajor = catalog.find(m => m.name === searchParams.get('major'))
  const selectedClass = selectedMajor?.classes.find(c => c.name === searchParams.get('class'))
  const showAll = searchParams.get('all') === '1'
  const courseLevel = Boolean(selectedClass || showAll)
  const itemLabel = courseLevel ? '课程' : selectedMajor ? '班级' : '专业'
  const go = (major, className, all = false) => {
    setSearchParams(all ? { all: '1' } : major ? { major, ...(className ? { class: className } : {}) } : {})
    setQ('')
    setPage(1)
    setPanelOpen(false)
  }

  const [panelOpen, setPanelOpen] = useState(false)
  const [panelCourseId, setPanelCourseId] = useState(null)
  const [studentQ, setStudentQ] = useState('')
  const [studentId, setStudentId] = useState('')
  const [grade, setGrade] = useState('A')

  const coursesQuery = useQuery({ queryKey: queryKeys.courses, queryFn: getCourses })

  const studentsQuery = useQuery({
    queryKey: queryKeys.students({ page: 0, size: 20, name: studentQ || undefined }),
    queryFn: () => getStudents({ page: 0, size: 20, name: studentQ || undefined, sortBy: 'id', sortDir: 'asc' }),
    enabled: panelOpen,
  })

  const createMut = useMutation({
    mutationFn: createCourse,
    onSuccess: async () => {
      toast.success('Course created')
      setAddOpen(false)
      go(null, null, true)
      await qc.invalidateQueries({ queryKey: queryKeys.courses })
      await qc.invalidateQueries({ queryKey: queryKeys.dashboardStats })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Create failed')),
  })

  const enrollMut = useMutation({
    mutationFn: () => enrollStudent(Number(studentId), Number(panelCourseId), grade),
    onSuccess: async () => {
      toast.success('Enrolled')
      await qc.invalidateQueries({ queryKey: queryKeys.studentCourses(Number(studentId)) })
      await qc.invalidateQueries({ queryKey: ['students'] })
      await qc.invalidateQueries({ queryKey: queryKeys.courses })
      await qc.invalidateQueries({ queryKey: queryKeys.dashboardStats })
    },
    onError: (e) => toast.error(getApiErrorMessage(e, 'Enroll failed')),
  })

  const filtered = useMemo(() => {
    const allCourses = coursesQuery.data || []
    const list = courseLevel
      ? selectedClass ? allCourses.filter(c => selectedClass.courseCodes.includes(c.code)) : allCourses
      : selectedMajor
        ? selectedMajor.classes.map(c => ({ ...c, id: c.name, kind: 'class', title: c.name }))
        : catalog.map(m => ({ ...m, id: m.name, kind: 'major', title: m.name }))
    const term = q.trim().toLowerCase()
    if (!term) return list
    return list.filter(
      (c) =>
        c.title?.toLowerCase().includes(term) ||
        c.code?.toLowerCase().includes(term) ||
        String(c.id).includes(term),
    )
  }, [coursesQuery.data, q, catalog, selectedMajor, selectedClass, courseLevel])

  const total = filtered.length
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const pageSafe = Math.min(page, pages)
  const slice = filtered.slice((pageSafe - 1) * pageSize, pageSafe * pageSize)

  const panelCourse = (coursesQuery.data || []).find((c) => String(c.id) === String(panelCourseId))

  if (coursesQuery.isPending || catalogQuery.isPending) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="h-10 w-10" />
      </div>
    )
  }

  if (coursesQuery.isError || catalogQuery.isError) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
        {getApiErrorMessage(coursesQuery.error || catalogQuery.error)}
      </div>
    )
  }

  return (
    <div className={`grid gap-6 ${panelOpen ? 'lg:grid-cols-[minmax(0,1fr)_340px]' : ''}`}>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Courses</h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">按专业、班级浏览课表中的课程。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
              onClick={() => setPanelOpen(true)}
            >
              <FunnelIcon className="h-5 w-5" />
              Enroll panel
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 dark:bg-sky-600 dark:hover:bg-sky-500"
            >
              <PlusIcon className="h-5 w-5" />
              Add course
            </button>
          </div>
        </div>

        <nav aria-label="课程分类导航" className="flex flex-wrap items-center gap-2 text-sm">
          <button type="button" onClick={() => go()} className="rounded-lg bg-indigo-100 px-3 py-2 font-semibold text-indigo-900 hover:bg-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-100">全部专业</button>
          {selectedMajor && <><span className="text-slate-400">/</span><button type="button" onClick={() => go(selectedMajor.name)} className="rounded-lg px-3 py-2 font-semibold text-slate-900 hover:bg-slate-100 dark:text-white dark:hover:bg-white/10">{selectedMajor.name}</button></>}
          {selectedClass && <><span className="text-slate-400">/</span><span className="px-3 py-2 font-semibold text-slate-900 dark:text-white">{selectedClass.name}</span></>}
          {showAll && <><span className="text-slate-400">/</span><span className="px-3 py-2 font-semibold text-slate-900 dark:text-white">全部课程</span></>}
          {!showAll && <button type="button" onClick={() => go(null, null, true)} className="ml-auto rounded-lg border border-slate-300 px-3 py-2 font-medium text-slate-700 hover:bg-slate-100 dark:border-white/20 dark:text-slate-200">全部课程</button>}
        </nav>

        {/* Search bar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.02]">
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-slate-950/40">
            <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
            <input
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setPage(1)
              }}
              placeholder={`搜索${itemLabel}…`}
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
        </div>

        {/* Course grid */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {slice.map((c, idx) => c.kind ? (
            <button
              type="button"
              key={c.id}
              data-testid={c.kind + '-card'}
              onClick={() => c.kind === 'major' ? go(c.name) : go(selectedMajor.name, c.name)}
              className="group rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-indigo-400 hover:shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-indigo-400"
            >
              <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-200 font-bold text-indigo-950">{c.kind === 'major' ? '专业' : '班级'}</div>
              <div className="text-lg font-semibold text-slate-950 dark:text-white">{c.title}</div>
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{c.kind === 'major' ? `${c.classes.length} 个班级 · ${c.classes.reduce((n, x) => n + x.studentCount, 0)} 名学生` : `${c.studentCount} 名学生 · ${c.courseCodes.length} 门课程`}</div>
              <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-3 text-sm font-semibold text-indigo-700 dark:border-white/10 dark:text-indigo-300"><span>{c.kind === 'major' ? '查看班级' : '查看课程'}</span><span aria-hidden="true">→</span></div>
            </button>
          ) : (
            <div
              key={c.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:shadow-lg dark:shadow-black/15"
            >
              <div className="flex items-start justify-between gap-3">
                <div className={`grid h-10 w-10 place-items-center rounded-xl ring-1 ring-slate-200 dark:ring-white/10 ${swatches[idx % swatches.length]}`}>
                  <span className="text-xs font-bold text-slate-800 dark:text-white">{c.code?.slice(0, 2) || 'C'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPanelCourseId(c.id)
                    setPanelOpen(true)
                  }}
                  className="rounded-lg border border-slate-200 bg-white/50 px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                >
                  Enroll
                </button>
              </div>
              <div className="mt-3 text-sm font-semibold text-sky-600 dark:text-sky-300">{c.code}</div>
              <div className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{c.title}</div>
              <div className="mt-3 inline-flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <ClockIcon className="h-4 w-4" />
                <span>{c.credits == null ? '学分未提供' : `${c.credits} Credits`}</span>
              </div>
            </div>
          ))}
        </div>

        {total === 0 && <p role="status" className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">没有匹配的{itemLabel}，请调整搜索内容。</p>}

        {/* Pagination */}
        <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between dark:text-slate-400">
          <div>
            共 {total} 项{itemLabel}，当前显示 {total ? (pageSafe - 1) * pageSize + 1 : 0}–{Math.min(pageSafe * pageSize, total)}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pageSafe <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              上一页
            </button>
            <div className="text-xs text-slate-600 dark:text-slate-300">
              第 {pageSafe} / {pages} 页
            </div>
            <button
              type="button"
              disabled={pageSafe >= pages}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
            >
              下一页
            </button>
          </div>
        </div>
      </div>

      {/* Enroll Panel (aside) */}
      <aside
        className={`${
          panelOpen ? 'fixed inset-0 z-40 lg:static lg:inset-auto' : 'hidden'
        } lg:sticky lg:top-24 lg:self-start`}
      >
        {panelOpen ? (
          <button
            type="button"
            className="absolute inset-0 bg-black/60 lg:hidden"
            aria-label="Close"
            onClick={() => setPanelOpen(false)}
          />
        ) : null}

        <div
          className={`relative rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-white/10 dark:bg-[#0f141c] lg:shadow-none ${
            panelOpen ? 'mx-auto mt-10 w-[min(92vw,420px)] lg:mx-0 lg:mt-0' : ''
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Enroll student</div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">Select course, student, and grade.</div>
            </div>
            <button
              type="button"
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
              onClick={() => setPanelOpen(false)}
              aria-label="关闭选课面板"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Course</label>
              <select
                value={panelCourseId ?? ''}
                onChange={(e) => setPanelCourseId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-500/40 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:ring-sky-500/40"
              >
                <option value="" disabled>
                  Select a course
                </option>
                {(coursesQuery.data || []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.title}
                  </option>
                ))}
              </select>
              {panelCourse ? (
                <div className="mt-2 rounded-xl border border-slate-200 bg-white/50 p-3 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  <div className="font-semibold text-slate-900 dark:text-white">{panelCourse.title}</div>
                  <div className="mt-1 text-slate-500 dark:text-slate-400">{panelCourse.code}</div>
                </div>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Find student</label>
              <input
                value={studentQ}
                onChange={(e) => setStudentQ(e.target.value)}
                placeholder="Search by name…"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-sky-500/40 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-sky-500/40"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Student</label>
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-500/40 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:ring-sky-500/40"
              >
                <option value="" disabled>
                  Select a student
                </option>
                {(studentsQuery.data?.content || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700 dark:text-slate-300">Grade</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-500/40 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:ring-sky-500/40"
              >
                {['A', 'B', 'C', 'D', 'F'].map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-500">Grade is required by the enroll API.</p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!studentId || !panelCourseId || enrollMut.isPending}
                onClick={() => enrollMut.mutate()}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-40 dark:bg-sky-600 dark:hover:bg-sky-500"
              >
                <DocumentPlusIcon className="h-5 w-5" />
                Enroll
              </button>
            </div>
          </div>
        </div>
      </aside>

      <CourseFormModal open={addOpen} onClose={() => setAddOpen(false)} onSubmit={(v) => createMut.mutateAsync(v)} />
    </div>
  )
}
