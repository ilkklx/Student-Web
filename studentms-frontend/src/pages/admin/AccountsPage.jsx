import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-toastify'
import api from '../../lib/api'
import { getApiErrorMessage } from '../../lib/errors'

export default function AccountsPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ username: '', password: '', roleName: 'ROLE_TEACHER' })
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: async () => (await api.get('/auth/accounts')).data })
  const create = useMutation({
    mutationFn: async () => api.post('/auth/register', { username: form.username, password: form.password }, { params: { roleName: form.roleName } }),
    onSuccess: async () => { toast.success('账号已创建'); setForm({ username: '', password: '', roleName: 'ROLE_TEACHER' }); await qc.invalidateQueries({ queryKey: ['accounts'] }) },
    onError: error => toast.error(getApiErrorMessage(error)),
  })
  const input = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-white/15 dark:bg-slate-950 dark:text-white'
  return <div className="space-y-6">
    <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">账号管理</h1>
    <p className="text-sm text-slate-600 dark:text-slate-300">学生档案的账号开通与绑定在 Students 页面办理；这里可开通教师和管理员账号。</p>
    <form className="flex flex-wrap gap-3" onSubmit={e => { e.preventDefault(); create.mutate() }}>
      <input className={input} aria-label="用户名" placeholder="用户名" autoComplete="off" value={form.username} required minLength={3} maxLength={100} onChange={e => setForm({ ...form, username: e.target.value })} />
      <input className={input} aria-label="密码" placeholder="密码（至少 8 位）" autoComplete="new-password" type="password" value={form.password} required minLength={8} maxLength={72} onChange={e => setForm({ ...form, password: e.target.value })} />
      <select className={input} aria-label="角色" value={form.roleName} onChange={e => setForm({ ...form, roleName: e.target.value })}><option value="ROLE_TEACHER">教师</option><option value="ROLE_ADMIN">管理员</option></select>
      <button className="rounded-xl bg-indigo-600 px-4 py-2 text-white disabled:opacity-40" disabled={create.isPending}>创建账号</button>
    </form>
    {accounts.isError && <p role="alert">{getApiErrorMessage(accounts.error)}</p>}
    <ul className="space-y-3">{(accounts.data || []).map(a => <li className="rounded-xl border border-slate-200 p-4 dark:border-white/10" key={a.username}>{a.username} · {a.roles.join('、')}</li>)}</ul>
  </div>
}
