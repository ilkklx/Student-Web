import { BookOpenIcon, ClipboardDocumentListIcon, UserGroupIcon, UserIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { Navigate } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useMemo } from 'react'
import Spinner from '../../components/ui/Spinner'
import { useRole } from '../../hooks/useRole'
import { getDashboardStats } from '../../lib/dashboardApi'
import { queryKeys } from '../../lib/queryKeys'

export default function DashboardPage() {
  const { isStudent } = useRole()
  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: getDashboardStats,
  })
  // 直接使用真实班级人数，不根据当前总数编造历史增长率。
  const deptRows = useMemo(() => Object.entries(data?.studentsPerDepartment || {})
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')), [data])

  if (isStudent) return <Navigate to="/student" replace />
  if (isPending) return <div className="flex min-h-[40vh] items-center justify-center"><Spinner className="h-10 w-10" /></div>
  if (isError) return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
      <div className="font-semibold">概况加载失败</div>
      <div className="mt-2">{error?.message || '请求失败'}</div>
      <button type="button" className="mt-4 rounded-xl border px-4 py-2" onClick={() => refetch()}>重试</button>
    </div>
  )

  const cards = [
    { label: '学生总数', value: Intl.NumberFormat().format(data.totalStudents ?? 0), icon: UserGroupIcon, note: '当前有效学生记录' },
    { label: '课程总数', value: Intl.NumberFormat().format(data.totalCourses ?? 0), icon: BookOpenIcon, note: '已登记的课程' },
    { label: '选课记录', value: Intl.NumberFormat().format(data.totalEnrollments ?? 0), icon: ClipboardDocumentListIcon, note: '已登记的个人选课' },
    { label: '平均年龄', value: data.averageAge == null ? '未提供' : String(data.averageAge), icon: UserIcon, note: data.averageAge == null ? '尚无出生日期数据' : '依据已登记的出生日期' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">学生、课程与选课的实时概况。</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(c => (
          <div key={c.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{c.label}</div>
                <div className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{c.value}</div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-100 ring-1 ring-indigo-200 dark:bg-indigo-600/20 dark:ring-indigo-500/30">
                <c.icon className="h-5 w-5 text-indigo-700 dark:text-indigo-200" />
              </div>
            </div>
            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">{c.note}</div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">班级／院系学生分布</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">按学生记录中的班级／院系统计人数。</p>
          </div>
          <span className="shrink-0 rounded-lg bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">{deptRows.length} 个分组</span>
        </div>
        {deptRows.length ? (
          <div className="overflow-x-auto">
            <div className="min-w-[540px]" style={{ height: Math.max(280, deptRows.length * 32 + 40) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptRows} layout="vertical" margin={{ top: 0, right: 35, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" width={190} interval={0} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                  <Bar dataKey="value" name="人数" radius={[0, 5, 5, 0]} barSize={18}>
                    {deptRows.map((row, idx) => <Cell key={row.name} fill={['#6366f1', '#818cf8', '#38bdf8'][idx % 3]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : <p className="py-12 text-center text-sm text-slate-500">暂无学生数据，请先添加或导入学生。</p>}
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-600 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
        学生名册与课程目录分别管理。个人选课和成绩需要单独登记，缺少的信息保持空白。
      </div>
    </div>
  )
}
