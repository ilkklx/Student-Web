import { yupResolver } from '@hookform/resolvers/yup'
import {
  AcademicCapIcon,
  ArrowRightEndOnRectangleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { toast } from 'react-toastify'
import * as yup from 'yup'
import { useAuth } from '../../context/AuthContext'
import { getStoredRole } from '../../lib/authStorage'
import { getApiErrorMessage } from '../../lib/errors'
import { R } from '../../lib/roles'

const schema = yup.object({
  username: yup.string().trim().required('Username is required'),
  password: yup.string().required('Password is required'),
})

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [showPw, setShowPw] = useState(false)

  const from = location.state?.from?.pathname

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { username: '', password: '' },
  })

  const onSubmit = handleSubmit(async (values) => {
    try {
      await login(values)
      toast.success('Signed in successfully.')
      const role = getStoredRole()
      const fallback =
        role === R.STUDENT ? '/student' : role === R.TEACHER ? '/teacher' : '/dashboard'
      const dest = from && from !== '/login' && from !== '/register' ? from : fallback
      navigate(dest, { replace: true })
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Login failed.'))
    }
  })

  return (
    <div className="auth-bg flex min-h-full items-center justify-center px-4 py-10">
      <div className="glass-panel w-full max-w-md rounded-3xl p-8 sm:p-10">
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 ring-1 ring-indigo-200 dark:bg-indigo-500/20 dark:ring-indigo-400/40">
            <AcademicCapIcon className="h-8 w-8 text-indigo-700 dark:text-white" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            Student Management System
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Sign in to access your account</p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-white" htmlFor="username">
              Username
            </label>
            <div className="relative">
              <UserIcon
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                id="username"
                autoComplete="username"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-3 text-sm text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-500/30 dark:border-white/10 dark:bg-slate-950/50 dark:text-white dark:placeholder:text-slate-500"
                placeholder="Enter your username"
                {...register('username')}
              />
            </div>
            {errors.username && (
              <p className="mt-1.5 text-xs text-rose-500 dark:text-rose-300">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-white" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <LockClosedIcon
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-11 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-500/30 dark:border-white/10 dark:bg-slate-950/50 dark:text-white dark:placeholder:text-slate-500"
                placeholder="Enter your password"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-white/5 dark:hover:text-white"
                onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1.5 text-xs text-rose-500 dark:text-rose-300">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-auth-primary flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ArrowRightEndOnRectangleIcon className="h-5 w-5" aria-hidden />
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          <span className="text-xs text-slate-500">or</span>
          <div className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
        </div>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Don&apos;t have an account?{' '}
          <Link className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300" to="/register">
            Create an account
          </Link>
        </p>

        <div className="mt-8 flex gap-3 rounded-xl border border-slate-200 bg-white/50 p-4 text-left dark:border-white/5 dark:bg-slate-950/30">
          <ShieldCheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400" aria-hidden />
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
            This system uses JSON Web Tokens (JWT) for secure authentication and session
            management.
          </p>
        </div>
      </div>
    </div>
  )
}