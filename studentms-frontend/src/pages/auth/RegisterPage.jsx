import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import api from '../../lib/api'
import { getApiErrorMessage } from '../../lib/errors'

const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 dark:border-white/15 dark:bg-slate-950 dark:text-white'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', name: '', email: '', department: '' })
  const update = (key) => (event) => setForm({ ...form, [key]: event.target.value })
  const submit = async (event) => {
    event.preventDefault()
    setPending(true)
    try {
      await api.post('/auth/register/student', form)
      toast.success('学生账号创建成功，请登录')
      navigate('/login', { replace: true })
    } catch (error) {
      toast.error(getApiErrorMessage(error, '注册失败'))
    } finally { setPending(false) }
  }
  return (
    <div className="auth-bg flex min-h-full items-center justify-center px-4 py-10">
      <div className="glass-panel w-full max-w-md rounded-3xl p-8">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">学生注册</h1>
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">已有学生档案请联系管理员开通或绑定账号，避免重复登记。</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          {[['username', '用户名', 'text'], ['password', '密码', 'password'], ['name', '姓名', 'text'], ['email', '邮箱', 'email'], ['department', '班级／院系', 'text']].map(([key, label, type]) => (
            <label key={key} className="block text-sm text-slate-700 dark:text-slate-200">
              {label}
              <input className={inputClass + ' mt-1'} type={type} value={form[key]} onChange={update(key)} required
                minLength={key === 'password' ? 8 : key === 'username' ? 3 : key === 'name' ? 2 : undefined}
                maxLength={key === 'password' ? 72 : key === 'name' || key === 'username' ? 100 : 255}
                autoComplete={key === 'password' ? 'new-password' : key === 'username' ? 'username' : undefined} />
            </label>
          ))}
          <p className="text-xs text-slate-500 dark:text-slate-400">密码至少 8 个字符。教师和管理员账号由管理员开通。</p>
          <button className="btn-auth-primary w-full rounded-xl px-4 py-3 text-white disabled:opacity-50" disabled={pending}>{pending ? '正在注册…' : '创建学生账号'}</button>
        </form>
        <Link to="/login" className="mt-5 inline-block text-sm text-sky-600 dark:text-sky-400">返回登录</Link>
      </div>
    </div>
  )
}
