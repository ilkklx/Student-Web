import { yupResolver } from '@hookform/resolvers/yup'
import {
  AcademicCapIcon,
  ArrowLeftIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import * as yup from 'yup'
import { useAuth } from '../../context/AuthContext'
import { getApiErrorMessage } from '../../lib/errors'
import api from '../../lib/api'

const ROLES = ['ROLE_ADMIN', 'ROLE_TEACHER', 'ROLE_STUDENT']

// Base schema without student fields
const baseSchema = yup.object({
  username: yup.string().trim().required('Username is required'),
  password: yup.string().required('Password is required').min(6, 'Use at least 6 characters'),
  roleName: yup.string().oneOf(ROLES, 'Pick a valid role').required('Role is required'),
})

// Extended schema for student (conditional)
const studentSchema = baseSchema.shape({
  name: yup.string().when('roleName', {
    is: (val) => val === 'ROLE_STUDENT',
    then: (schema) => schema.required('Full name is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  email: yup.string().when('roleName', {
    is: (val) => val === 'ROLE_STUDENT',
    then: (schema) => schema.email('Invalid email').required('Email is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  department: yup.string().when('roleName', {
    is: (val) => val === 'ROLE_STUDENT',
    then: (schema) => schema.required('Department is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
})

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register: registerUser } = useAuth()
  const [showPw, setShowPw] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(studentSchema),
    defaultValues: {
      username: '',
      password: '',
      roleName: 'ROLE_STUDENT',
      name: '',
      email: '',
      department: '',
    },
  })

  const selectedRole = watch('roleName')
  const isStudent = selectedRole === 'ROLE_STUDENT'

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isStudent) {
        const response = await api.post('/auth/register/student', {
          username: values.username,
          password: values.password,
          roleName: 'ROLE_STUDENT',
          name: values.name,
          email: values.email,
          department: values.department,
        });
        if (response.data.studentId) {
          localStorage.setItem('linkedStudentId', response.data.studentId);
        }
        toast.success('Student account created! You can now sign in.');
      } else {
        await registerUser({
          username: values.username,
          password: values.password,
          roleName: values.roleName,
        });
        toast.success('Account created! Please sign in.');
      }
      navigate('/login', { replace: true })
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Registration failed.'))
    }
  })

  return (
    <div className="auth-bg flex min-h-full items-center justify-center px-4 py-10">
      <div className="glass-panel w-full max-w-md rounded-3xl p-8 sm:p-10">
        <Link
          to="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          <ArrowLeftIcon className="h-4 w-4" aria-hidden />
          Back to sign in
        </Link>

        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 ring-1 ring-indigo-200 dark:bg-indigo-500/20 dark:ring-indigo-400/40">
            <AcademicCapIcon className="h-8 w-8 text-indigo-700 dark:text-white" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Create an account</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Register and pick your access role</p>
        </div>

        <form className="mt-8 space-y-5" onSubmit={onSubmit} noValidate>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-white" htmlFor="reg-username">
              Username
            </label>
            <div className="relative">
              <UserIcon
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                id="reg-username"
                autoComplete="username"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-500/30 dark:border-white/10 dark:bg-slate-950/50 dark:text-white dark:placeholder:text-slate-500"
                placeholder="Choose a username"
                {...register('username')}
              />
            </div>
            {errors.username && (
              <p className="mt-1.5 text-xs text-rose-500 dark:text-rose-300">{errors.username.message}</p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-white" htmlFor="reg-password">
              Password
            </label>
            <div className="relative">
              <LockClosedIcon
                className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                id="reg-password"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-11 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-500/30 dark:border-white/10 dark:bg-slate-950/50 dark:text-white dark:placeholder:text-slate-500"
                placeholder="Create a password"
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

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-white" htmlFor="roleName">
              Role
            </label>
            <select
              id="roleName"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none focus:border-sky-400/50 focus:ring-2 focus:ring-sky-500/30 dark:border-white/10 dark:bg-slate-950/50 dark:text-white"
              {...register('roleName')}
            >
              <option value="ROLE_STUDENT">Student</option>
              <option value="ROLE_TEACHER">Teacher</option>
              <option value="ROLE_ADMIN">Administrator</option>
            </select>
            {errors.roleName && (
              <p className="mt-1.5 text-xs text-rose-500 dark:text-rose-300">{errors.roleName.message}</p>
            )}
          </div>

          {/* Student-specific fields */}
          {isStudent && (
            <div className="space-y-4 border-l-2 border-sky-500/30 pl-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-white" htmlFor="name">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon
                    className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <input
                    id="name"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-500/30 dark:border-white/10 dark:bg-slate-950/50 dark:text-white dark:placeholder:text-slate-500"
                    placeholder="John Doe"
                    {...register('name')}
                  />
                </div>
                {errors.name && (
                  <p className="mt-1.5 text-xs text-rose-500 dark:text-rose-300">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-white" htmlFor="email">
                  Email Address
                </label>
                <div className="relative">
                  <EnvelopeIcon
                    className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
                    aria-hidden
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-500/30 dark:border-white/10 dark:bg-slate-950/50 dark:text-white dark:placeholder:text-slate-500"
                    placeholder="student@example.com"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-rose-500 dark:text-rose-300">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-white" htmlFor="department">
                  Department
                </label>
                <input
                  id="department"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-sky-400/50 focus:ring-2 focus:ring-sky-500/30 dark:border-white/10 dark:bg-slate-950/50 dark:text-white dark:placeholder:text-slate-500"
                  placeholder="Computer Science, Electrical Engineering, etc."
                  {...register('department')}
                />
                {errors.department && (
                  <p className="mt-1.5 text-xs text-rose-500 dark:text-rose-300">{errors.department.message}</p>
                )}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-auth-primary w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link className="font-medium text-sky-600 hover:text-sky-700 dark:text-sky-400 dark:hover:text-sky-300" to="/login">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}