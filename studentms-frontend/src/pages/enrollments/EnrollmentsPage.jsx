import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { queryKeys } from '../../lib/queryKeys'
import { getCourses } from '../../lib/coursesApi'
import { getStudents, getStudentCourses, enrollStudent, dropCourse, recordGrade } from '../../lib/studentsApi'
import { getApiErrorMessage } from '../../lib/errors'
import Spinner from '../../components/ui/Spinner'
import { useRole } from '../../hooks/useRole'

const inputClass = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-white/15 dark:bg-slate-950 dark:text-white'
const grades = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F']

export default function EnrollmentsPage() {
  const qc = useQueryClient()
  const { isTeacher } = useRole()
  const [studentId, setStudentId] = useState('')
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [search, setSearch] = useState('')
  const [courseId, setCourseId] = useState('')
  const students = useQuery({ queryKey: queryKeys.students({ page: 0, size: 100, name: search }), queryFn: () => getStudents({ page: 0, size: 100, name: search }) })
  const courses = useQuery({ queryKey: queryKeys.courses, queryFn: getCourses })
  const selected = useQuery({ queryKey: ['enrollmentHistory', Number(studentId)], queryFn: () => getStudentCourses(Number(studentId), true), enabled: Boolean(studentId) })
  const mutation = useMutation({
    mutationFn: async ({ action, id, grade, studentId: targetStudentId }) => {
      if (action === 'enroll') {
        if (!canEnroll) throw new Error('请从当前搜索结果选择学生和课程，等待数据加载完成。')
        return enrollStudent(targetStudentId, Number(courseId))
      }
      if (action === 'drop') return dropCourse(targetStudentId, id)
      return recordGrade(targetStudentId, id, grade)
    },
    onSuccess: async (_data, variables) => {
      toast.success('已保存')
      setCourseId('')
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['enrollmentHistory', variables.studentId] }),
        qc.invalidateQueries({ queryKey: queryKeys.studentCourses(variables.studentId) }),
        qc.invalidateQueries({ queryKey: queryKeys.dashboardStats }),
        qc.invalidateQueries({ queryKey: ['students'] }),
        qc.invalidateQueries({ queryKey: ['teacherStats'] }),
      ])
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
  const rows = selected.data || []
  const studentOptions = students.data?.content || []
  const inCurrentRoster = studentOptions.some(s => s.id === Number(studentId))
  const historicalSelection = selectedStudent?.id === Number(studentId) && !inCurrentRoster
  const available = (courses.data || []).filter(c => !rows.some(e => e.id === c.id && !e.withdrawn))
  const canEnroll = !students.isFetching && !students.isError && !courses.isFetching && !courses.isError
    && !selected.isFetching && !selected.isError
    && inCurrentRoster
    && available.some(c => c.id === Number(courseId))
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">选课与成绩</h1>
      <p className="text-sm text-slate-600 dark:text-slate-300">先登记选课，再录入成绩。退课保留历史，已录成绩的课程不能退课。</p>
      {(students.isError || courses.isError || selected.isError) && <p role="alert">{getApiErrorMessage(students.error || courses.error || selected.error)}</p>}
      <div className="flex flex-wrap gap-3">
        <input className={inputClass} aria-label="搜索学生" placeholder="姓名、邮箱或学号" value={search} disabled={mutation.isPending}
          onChange={e => { setSearch(e.target.value); setStudentId(''); setSelectedStudent(null); setCourseId('') }} />
        <select className={inputClass} aria-label="选择学生" value={studentId} disabled={students.isFetching || mutation.isPending}
          onChange={e => {
            setStudentId(e.target.value)
            setSelectedStudent(studentOptions.find(s => s.id === Number(e.target.value)) || null)
            setCourseId('')
          }}>
          <option value="">选择学生</option>{studentOptions.map(s => <option key={s.id} value={s.id}>{s.name} · {s.studentNumber || s.email}</option>)}
          {historicalSelection && <option value={studentId}>历史选课 · {selectedStudent.name} · {selectedStudent.studentNumber || selectedStudent.email}</option>}
        </select>
        <select className={inputClass} aria-label="选择课程" value={courseId} disabled={courses.isFetching || selected.isFetching || mutation.isPending} onChange={e => setCourseId(e.target.value)}>
          <option value="">选择课程</option>{available.map(c => <option key={c.id} value={c.id}>{c.code} · {c.title}</option>)}
        </select>
        <button className="rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:opacity-40" disabled={!canEnroll || mutation.isPending} onClick={() => mutation.mutate({ action: 'enroll', studentId: Number(studentId) })}>登记选课</button>
      </div>
      {isTeacher && !studentId && !search && !students.isFetching && !students.isError && !studentOptions.length
        && <p className="text-sm text-slate-500">暂无本人课程的有效选课学生，请联系管理员登记首次选课。</p>}
      {isTeacher && historicalSelection && !students.isFetching && !students.isError
        && <p className="text-sm text-slate-500">该学生已无本人课程的有效选课，当前显示历史记录；重新登记选课请联系管理员。</p>}
      {studentId && selected.isPending ? <Spinner className="h-8 w-8" /> : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
          <table className="min-w-full text-left text-sm">
            <thead><tr>{['课程', '学分', '状态', '成绩', '操作'].map(h => <th key={h} className="p-4">{h}</th>)}</tr></thead>
            <tbody>{rows.map(c => <tr key={c.enrollmentId} className="border-t border-slate-200 dark:border-white/10">
              <td className="p-4">{c.code} · {c.title}</td><td className="p-4">{c.credits ?? '未提供'}</td>
              <td className="p-4">{c.withdrawn ? '已退课' : c.grade ? '已评分' : '待评分'}</td>
              <td className="p-4"><select className={inputClass} aria-label={c.title + '成绩'} value={c.grade || ''} disabled={c.withdrawn || mutation.isPending}
                onChange={e => { if (e.target.value) mutation.mutate({ action: 'grade', id: c.id, grade: e.target.value, studentId: Number(studentId) }) }}>
                <option value="">待评分</option>{grades.map(g => <option key={g}>{g}</option>)}
              </select></td>
              <td className="p-4"><button disabled={c.withdrawn || Boolean(c.grade) || mutation.isPending} className="text-rose-600 disabled:opacity-40"
                onClick={() => { if (window.confirm('确认退课？历史记录将保留。')) mutation.mutate({ action: 'drop', id: c.id, studentId: Number(studentId) }) }}>退课</button></td>
            </tr>)}</tbody>
          </table>
          {!rows.length && <p className="p-5 text-slate-500">{studentId ? '暂无选课记录' : '请先选择学生'}</p>}
        </div>
      )}
    </div>
  )
}
