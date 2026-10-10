import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { queryKeys } from '../../lib/queryKeys'
import { getCourses } from '../../lib/coursesApi'
import { getStudents, getStudentCourses, enrollStudent, dropCourse, recordGrade } from '../../lib/studentsApi'
import { getApiErrorMessage } from '../../lib/errors'
import Spinner from '../../components/ui/Spinner'

const inputClass = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-white/15 dark:bg-slate-950 dark:text-white'
const grades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F']

export default function EnrollmentsPage() {
  const qc = useQueryClient()
  const [studentId, setStudentId] = useState('')
  const [search, setSearch] = useState('')
  const [courseId, setCourseId] = useState('')
  const students = useQuery({ queryKey: queryKeys.students({ page: 0, size: 100, name: search }), queryFn: () => getStudents({ page: 0, size: 100, name: search }) })
  const courses = useQuery({ queryKey: queryKeys.courses, queryFn: getCourses })
  const selected = useQuery({ queryKey: ['enrollmentHistory', Number(studentId)], queryFn: () => getStudentCourses(Number(studentId), true), enabled: Boolean(studentId) })
  const mutation = useMutation({
    mutationFn: async ({ action, id, grade }) => {
      if (action === 'enroll') return enrollStudent(Number(studentId), Number(courseId))
      if (action === 'drop') return dropCourse(Number(studentId), id)
      return recordGrade(Number(studentId), id, grade)
    },
    onSuccess: async () => {
      toast.success('已保存')
      setCourseId('')
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['enrollmentHistory', Number(studentId)] }),
        qc.invalidateQueries({ queryKey: queryKeys.studentCourses(Number(studentId)) }),
        qc.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
        qc.invalidateQueries({ queryKey: ['students'] }),
        qc.invalidateQueries({ queryKey: ['teacherStats'] }),
      ])
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
  const rows = selected.data || []
  const available = (courses.data || []).filter(c => !rows.some(e => e.id === c.id && !e.withdrawn))
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">选课与成绩</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">先登记选课，再录入成绩。退课保留历史，已录成绩的课程不能退课。</p>
      {(students.isError || courses.isError || selected.isError) && <p role="alert">{getApiErrorMessage(students.error || courses.error || selected.error)}</p>}
      <div className="flex flex-wrap gap-3">
        <input className={inputClass} aria-label="搜索学生" placeholder="姓名、邮箱或学号" value={search} onChange={e => setSearch(e.target.value)} />
        <select className={inputClass} aria-label="选择学生" value={studentId} onChange={e => setStudentId(e.target.value)}>
          <option value="">选择学生</option>{(students.data?.content || []).map(s => <option key={s.id} value={s.id}>{s.name} · {s.studentNumber || s.email}</option>)}
        </select>
        <select className={inputClass} aria-label="选择课程" value={courseId} onChange={e => setCourseId(e.target.value)}>
          <option value="">选择课程</option>{available.map(c => <option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}
        </select>
        <button className="rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:opacity-40" disabled={!studentId || !courseId || mutation.isPending} onClick={() => mutation.mutate({ action: 'enroll' })}>登记选课</button>
      </div>
      {studentId && selected.isPending ? <Spinner className="h-8 w-8" /> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead><tr>{['课程', '学分', '状态', '成绩', '操作'].map(h => <th key={h} className="p-4">{h}</th>)}</tr></thead>
            <tbody>{rows.map(c => <tr key={c.enrollmentId} className="border-t border-slate-200 dark:border-white/10">
              <td className="p-4">{c.code} · {c.title}</td><td className="p-4">{c.credits ?? '未提供'}</td>
              <td className="p-4">{c.withdrawn ? '已退课' : c.grade ? '已评分' : '待评分'}</td>
              <td className="p-4"><select className={inputClass} aria-label={c.title + '成绩'} value={c.grade || ''} disabled={c.withdrawn || mutation.isPending}
                onChange={e => { if (e.target.value) mutation.mutate({ action: 'grade', id: c.id, grade: e.target.value }) }}>
                <option value="">待评分</option>{grades.map(g => <option key={g}>{g}</option>)}
              </select></td>
              <td className="p-4"><button disabled={c.withdrawn || Boolean(c.grade) || mutation.isPending} className="text-rose-600 disabled:opacity-40"
                onClick={() => { if (window.confirm('确认退课？历史记录将保留。')) mutation.mutate({ action: 'drop', id: c.id }) }}>退课</button></td>
            </tr>)}</tbody>
          </table>
          {!rows.length && <p className="p-5 text-slate-500">{studentId ? '暂无选课记录' : '请先选择学生'}</p>}
        </div>
      )}
    </div>
  )
}
