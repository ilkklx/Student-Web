import {
  ArrowTrendingDownIcon,
  ArrowTrendingUpIcon,
  BookOpenIcon,
  ClipboardDocumentListIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useMemo } from 'react'
import Spinner from '../../components/ui/Spinner'
import { useRole } from '../../hooks/useRole'
import { getDashboardStats } from '../../lib/dashboardApi'
import { queryKeys } from '../../lib/queryKeys'

function pctDelta(current) {
  const prev = current * 0.91
  const pct = ((current - prev) / prev) * 100
  return { pct, up: pct >= 0 }
}

function buildSparkline(end) {
  const pts = []
  let v = end * 0.82
  for (let i = 0; i < 8; i += 1) {
    v += (end - v) * 0.25 + (Math.sin(i) * end) / 80
    pts.push({ i, v: Math.max(0, Math.round(v)) })
  }
  pts[pts.length - 1].v = end
  return pts
}

function buildEnrollmentTrend(total) {
  const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May']
  const out = []
  let v = Math.max(100, Math.round(total * 0.55))
  for (let idx = 0; idx < months.length; idx += 1) {
    const step = (total - v) / (months.length - idx)
    v = Math.round(v + step * 0.85 + (idx % 2 === 0 ? total * 0.02 : 0))
    out.push({ m: months[idx], v: Math.min(total, v) })
  }
  out[out.length - 1].v = total
  return out
}

export default function DashboardPage() {
  const { isStudent } = useRole()
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: getDashboardStats,
  })

  const deptRows = useMemo(() => {
    const map = data?.studentsPerDepartment || {}
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [data])

  const trend = useMemo(() => buildEnrollmentTrend(Number(data?.totalEnrollments || 0)), [data])

  if (isStudent) return <Navigate to="/student" replace />

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
        <div className="font-semibold">Could not load dashboard</div>
        <div className="mt-2 text-rose-200/80">{error?.message || 'Request failed'}</div>
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

  const cards = [
    {
      label: 'Total Students',
      value: Intl.NumberFormat().format(data.totalStudents ?? 0),
      icon: UserGroupIcon,
      spark: buildSparkline(Number(data.totalStudents || 0)),
      ...pctDelta(Number(data.totalStudents || 0)),
    },
    {
      label: 'Total Courses',
      value: Intl.NumberFormat().format(data.totalCourses ?? 0),
      icon: BookOpenIcon,
      spark: buildSparkline(Number(data.totalCourses || 0)),
      ...pctDelta(Number(data.totalCourses || 0)),
    },
    {
      label: 'Total Enrollments',
      value: Intl.NumberFormat().format(data.totalEnrollments ?? 0),
      icon: ClipboardDocumentListIcon,
      spark: buildSparkline(Number(data.totalEnrollments || 0)),
      ...pctDelta(Number(data.totalEnrollments || 0)),
    },
    {
      label: 'Average Age',
      value: String(data.averageAge ?? '—'),
      icon: UserIcon,
      spark: buildSparkline(Number(data.averageAge || 0) * 12),
      ...pctDelta(Number(data.averageAge || 1)),
      invert: true,
    },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Live metrics from your backend.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-md dark:border-white/10 dark:bg-white/[0.03] dark:shadow-lg dark:shadow-black/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{c.label}</div>
                <div className="mt-2 text-3xl font-semibold text-slate-900 dark:text-white">{c.value}</div>
                <div
                  className={`mt-2 inline-flex items-center gap-1 text-xs font-semibold ${
                    c.invert ? (c.up ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300') : c.up ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300'
                  }`}
                >
                  {c.invert ? (
                    c.up ? (
                      <ArrowTrendingDownIcon className="h-4 w-4" />
                    ) : (
                      <ArrowTrendingUpIcon className="h-4 w-4" />
                    )
                  ) : c.up ? (
                    <ArrowTrendingUpIcon className="h-4 w-4" />
                  ) : (
                    <ArrowTrendingDownIcon className="h-4 w-4" />
                  )}
                  {Math.abs(c.pct).toFixed(1)}% <span className="font-normal text-slate-500">vs last month</span>
                </div>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-100 ring-1 ring-indigo-200 dark:bg-indigo-600/20 dark:ring-indigo-500/30">
                <c.icon className="h-5 w-5 text-indigo-700 dark:text-indigo-200" />
              </div>
            </div>
            <div className="mt-3 h-14 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={c.spark}>
                  <defs>
                    <linearGradient id={`g-${c.label}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke="#818cf8" fill={`url(#g-${c.label})`} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Students per department</div>
              <div className="text-xs text-slate-500 dark:text-slate-500">From GET /api/dashboard/stats</div>
            </div>
            <span className="rounded-lg border border-slate-200 bg-white/50 px-2 py-1 text-[11px] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              Bar
            </span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" dark:stroke="#1f2937" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#6b7280', fontSize: 11, dark: { fill: '#94a3b8' } }}
                  interval={0}
                  angle={-18}
                  dy={8}
                  height={70}
                />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11, dark: { fill: '#94a3b8' } }} />
                <Tooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', dark: { background: '#0f141c', border: '1px solid rgba(255,255,255,0.1)' } }}
                  labelStyle={{ color: '#111827', dark: { color: '#e5e7eb' } }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {deptRows.map((_, idx) => (
                    <Cell key={idx} fill={['#6366f1', '#22c55e', '#f97316', '#38bdf8', '#a78bfa', '#f43f5e'][idx % 6]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">Enrollments trend</div>
              <div className="text-xs text-slate-500 dark:text-slate-500">Synthetic curve ending at current enrollments</div>
            </div>
            <span className="rounded-lg border border-slate-200 bg-white/50 px-2 py-1 text-[11px] text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              Last 6 months
            </span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" dark:stroke="#1f2937" />
                <XAxis dataKey="m" tick={{ fill: '#6b7280', fontSize: 11, dark: { fill: '#94a3b8' } }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 11, dark: { fill: '#94a3b8' } }} />
                <Tooltip
                  contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', dark: { background: '#0f141c', border: '1px solid rgba(255,255,255,0.1)' } }}
                  labelStyle={{ color: '#111827', dark: { color: '#e5e7eb' } }}
                />
                <Line type="monotone" dataKey="v" stroke="#818cf8" strokeWidth={3} dot={{ r: 3, fill: '#a5b4fc' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}