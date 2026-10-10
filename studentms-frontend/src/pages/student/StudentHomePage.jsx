import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'
import { getStudent, getStudentCourses } from '../../lib/studentsApi'
import { getApiErrorMessage } from '../../lib/errors'
import { queryKeys } from '../../lib/queryKeys'

export default function StudentHomePage() {
  const { studentId, isHydrating, identityError } = useAuth()
  const student = useQuery({ queryKey: queryKeys.student(studentId), queryFn: () => getStudent(studentId), enabled: Boolean(studentId) })
  const courses = useQuery({ queryKey: queryKeys.studentCourses(studentId), queryFn: () => getStudentCourses(studentId), enabled: Boolean(studentId) })
  if (isHydrating || (studentId && (student.isPending || courses.isPending))) return <Spinner className="h-8 w-8" />
  if (identityError || student.isError || courses.isError) return <p role="alert">{getApiErrorMessage(identityError || student.error || courses.error)}</p>
  if (!studentId) return <p className="rounded-2xl border border-slate-200 p-6 dark:border-white/10">账号尚未绑定学生档案，请联系管理员。</p>
  const rows = courses.data || []
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">你好，{student.data.name}</h1>
      <p className="text-slate-600 dark:text-slate-300">当前选课 {rows.length} 门，已录成绩 {rows.filter(c => c.grade).length} 门。</p>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-white/5">
        <div className="flex justify-between"><h2 className="font-semibold">我的课程</h2><Link to="/student/courses" className="text-sky-600 dark:text-sky-400">查看全部</Link></div>
        {rows.slice(0, 4).map(c => <div key={c.id} className="mt-4 flex justify-between border-t border-slate-200 pt-3 dark:border-white/10"><span>{c.title}</span><span>{c.grade || '待评分'}</span></div>)}
        {!rows.length && <p className="mt-4 text-slate-500">暂无选课，请联系管理员登记。</p>}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">尚未登记作业和学习记录，暂无学习进度或截止日期。</p>
    </div>
  )
}
