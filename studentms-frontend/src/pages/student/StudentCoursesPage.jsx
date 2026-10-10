import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import { dropCourse, getStudentCourses } from '../../lib/studentsApi'
import { getApiErrorMessage } from '../../lib/errors'
import { queryKeys } from '../../lib/queryKeys'
import Spinner from '../../components/ui/Spinner'

export default function StudentCoursesPage() {
  const { studentId, isHydrating, identityError } = useAuth()
  const qc = useQueryClient()
  const query = useQuery({ queryKey: ['enrollmentHistory', studentId], queryFn: () => getStudentCourses(studentId, true), enabled: Boolean(studentId) })
  const drop = useMutation({
    mutationFn: (id) => dropCourse(studentId, id),
    onSuccess: async () => {
      toast.success('已退课，历史记录已保留')
      await qc.invalidateQueries({ queryKey: ['enrollmentHistory', studentId] })
      await qc.invalidateQueries({ queryKey: queryKeys.studentCourses(studentId) })
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
  if (isHydrating || (studentId && query.isPending)) return <Spinner className="h-8 w-8" />
  if (identityError || query.isError) return <p role="alert">{getApiErrorMessage(identityError || query.error)}</p>
  if (!studentId) return <p>账号尚未绑定学生档案，请联系管理员。</p>
  const rows = query.data || []
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">我的课程与成绩</h1>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead><tr>{['课程', '学分', '状态', '成绩', '操作'].map(h => <th className="p-4" key={h}>{h}</th>)}</tr></thead>
          <tbody>{rows.map(c => <tr key={c.enrollmentId} className="border-t border-slate-200 dark:border-white/10">
            <td className="p-4">{c.code} · {c.title}</td><td className="p-4">{c.credits ?? '未提供'}</td>
            <td className="p-4">{c.withdrawn ? '已退课' : c.grade ? '已评分' : '待评分'}</td><td className="p-4">{c.grade || '—'}</td>
            <td className="p-4"><button className="text-rose-600 disabled:opacity-40" disabled={c.withdrawn || Boolean(c.grade) || drop.isPending}
              onClick={() => { if (window.confirm('确认退课？')) drop.mutate(c.id) }}>退课</button></td>
          </tr>)}</tbody>
        </table>
        {!rows.length && <p className="p-5 text-slate-500">暂无选课记录。</p>}
      </div>
    </div>
  )
}
