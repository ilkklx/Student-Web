import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/ui/Spinner'
import StudentPhoto from '../../components/ui/StudentPhoto'
import { getStudent, uploadStudentPhoto } from '../../lib/studentsApi'
import { getApiErrorMessage } from '../../lib/errors'
import { queryKeys } from '../../lib/queryKeys'

export default function StudentProfilePage() {
  const { studentId, isHydrating, identityError } = useAuth()
  const qc = useQueryClient()
  const student = useQuery({ queryKey: queryKeys.student(studentId), queryFn: () => getStudent(studentId), enabled: Boolean(studentId) })
  const upload = useMutation({
    mutationFn: (file) => uploadStudentPhoto(studentId, file),
    onSuccess: async () => { toast.success('照片已更新'); await qc.invalidateQueries({ queryKey: queryKeys.student(studentId) }) },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  })
  if (isHydrating || (studentId && student.isPending)) return <Spinner className="h-8 w-8" />
  if (identityError || student.isError) return <p role="alert">{getApiErrorMessage(identityError || student.error)}</p>
  if (!studentId) return <p className="rounded-2xl border border-slate-200 p-6 dark:border-white/10">账号尚未绑定学生档案，请联系管理员。绑定后重新登录即可。</p>
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">我的档案</h1>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/5">
        <StudentPhoto photoUrl={student.data.photoUrl} studentId={studentId} className="h-24 w-24 rounded-full object-cover" />
        <dl className="mt-5 space-y-3 text-slate-700 dark:text-slate-200">
          <div>姓名：{student.data.name}</div><div>学号：{student.data.studentNumber || '未登记'}</div>
          <div>班级／院系：{student.data.department || '未登记'}</div><div>邮箱：{student.data.email}</div>
        </dl>
        <label className="mt-6 block text-sm text-slate-600 dark:text-slate-300">
          更新本人照片（JPG／PNG，最多 5MB）
          <input type="file" accept="image/jpeg,image/png" disabled={upload.isPending} className="mt-2 block"
            onChange={(event) => {
              const file = event.target.files?.[0]; event.target.value = ''
              if (file) upload.mutate(file)
            }} />
        </label>
      </div>
    </div>
  )
}
