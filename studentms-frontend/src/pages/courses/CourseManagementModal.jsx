import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import Modal from '../../components/ui/Modal'
import api from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'
import { getApiErrorMessage } from '../../lib/errors'

export default function CourseManagementModal({ course, catalog, onClose }) {
  const qc = useQueryClient()
  const [teacher, setTeacher] = useState(course.teacherUsername || '')
  const [schoolClass, setSchoolClass] = useState('')
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: async () => (await api.get('/auth/accounts')).data })
  const classes = catalog.flatMap(m => m.classes.map(c => ({ ...c, major: m.name })))
  const save = useMutation({
    mutationFn: async () => {
      await api.put('/courses/' + course.id + '/assignment', { teacherUsername: teacher, className: schoolClass || null })
    },
    onSuccess: async () => {
      toast.success('课程安排已保存')
      await qc.invalidateQueries({ queryKey: queryKeys.courses })
      await qc.invalidateQueries({ queryKey: ['school-course-catalog'] })
      await qc.invalidateQueries({ queryKey: ['students'] })
      onClose()
    },
    onError: error => toast.error(getApiErrorMessage(error)),
  })
  const input = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-white/15 dark:bg-slate-950 dark:text-white'
  return <Modal open title={'课程安排 · ' + course.title} onClose={onClose}>
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); save.mutate() }}>
      <div><label className="block text-sm" htmlFor="course-teacher">任课教师</label><select id="course-teacher" className={input} value={teacher} onChange={e => setTeacher(e.target.value)}>
        <option value="">暂未安排</option>{(accounts.data || []).filter(a => a.roles.includes('ROLE_TEACHER')).map(a => <option key={a.username}>{a.username}</option>)}
      </select></div>
      <div><label className="block text-sm" htmlFor="course-class">加入班级课表（可选）</label><select id="course-class" className={input} value={schoolClass} onChange={e => setSchoolClass(e.target.value)}>
        <option value="">保持班级安排</option>{classes.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
      </select></div>
      <p className="text-xs text-slate-500">课表安排与个人选课分别登记。教师只能管理本人课程的选课和成绩。</p>
      <button disabled={save.isPending || accounts.isPending} className="rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:opacity-40">保存安排</button>
    </form>
  </Modal>
}
