import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import Modal from '../../components/ui/Modal'
import { bindStudentAccount } from '../../lib/studentsApi'
import { getApiErrorMessage } from '../../lib/errors'

export default function StudentAccountModal({ student, onClose }) {
  const qc = useQueryClient()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const bind = useMutation({
    mutationFn: () => bindStudentAccount(student.id, { username, password }),
    onSuccess: async () => {
      toast.success('账号已绑定')
      await qc.invalidateQueries({ queryKey: ['students'] })
      await qc.invalidateQueries({ queryKey: ['accounts'] })
      onClose()
    },
    onError: error => toast.error(getApiErrorMessage(error)),
  })
  const input = 'mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-white/15 dark:bg-slate-950 dark:text-white'
  return <Modal open={Boolean(student)} title={'绑定账号 · ' + student.name} onClose={onClose}>
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); bind.mutate() }}>
      <p className="text-sm text-slate-600 dark:text-slate-300">新账号填写用户名和密码；已有学生账号只填写用户名。绑定保留已有学生档案。</p>
      <label className="block text-sm">用户名<input className={input} value={username} onChange={e => setUsername(e.target.value)} required minLength={3} maxLength={100} autoComplete="off" /></label>
      <label className="block text-sm">新账号密码<input className={input} type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} maxLength={72} autoComplete="new-password" /></label>
      <button disabled={bind.isPending} className="rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:opacity-40">确认绑定</button>
    </form>
  </Modal>
}
