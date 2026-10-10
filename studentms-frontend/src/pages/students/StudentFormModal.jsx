import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import Modal from '../../components/ui/Modal'

const schema = yup.object({
  name: yup.string().trim().min(2, 'Min 2 characters').max(100).required('Name is required'),
  email: yup.string().trim().email('Valid email required').required('Email is required'),
  department: yup.string().trim().required('Department is required'),
  studentNumber: yup.string().trim().matches(/^[0-9]{6,32}$/, { message: '学号须为 6–32 位数字', excludeEmptyString: true }),
})

export default function StudentFormModal({ open, mode, initial, onClose, onSubmit }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { name: '', email: '', department: '', studentNumber: '' },
  })

  useEffect(() => {
    if (!open) return
    reset({
      name: initial?.name || '',
      email: initial?.email || '',
      department: initial?.department || '',
      studentNumber: initial?.studentNumber || '',
    })
  }, [open, initial, reset])

  const submit = handleSubmit(async (values) => {
    await onSubmit({ ...values, studentNumber: values.studentNumber || null })
  })

  return (
    <Modal
      open={open}
      title={mode === 'create' ? 'Add student' : 'Edit student'}
      onClose={onClose}
      size="lg"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={submit}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-500"
          >
            {isSubmitting ? 'Saving…' : mode === 'create' ? 'Create' : 'Save changes'}
          </button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={submit}>
        <label className="block text-sm text-slate-700 dark:text-slate-300">学号（可选）<input className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 dark:border-white/15 dark:bg-slate-950" {...register('studentNumber')} /></label>
        {errors.studentNumber && <p className="text-xs text-rose-500">{errors.studentNumber.message}</p>}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor="sf-name">
            Name
          </label>
          <input
            id="sf-name"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:ring-indigo-500/40"
            {...register('name')}
          />
          {errors.name && <p className="mt-1 text-xs text-rose-500 dark:text-rose-300">{errors.name.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor="sf-email">
            Email
          </label>
          <input
            id="sf-email"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:ring-indigo-500/40"
            {...register('email')}
          />
          {errors.email && <p className="mt-1 text-xs text-rose-500 dark:text-rose-300">{errors.email.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor="sf-dept">
            Department
          </label>
          <input
            id="sf-dept"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/40 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:ring-indigo-500/40"
            {...register('department')}
          />
          {errors.department && (
            <p className="mt-1 text-xs text-rose-500 dark:text-rose-300">{errors.department.message}</p>
          )}
        </div>
      </form>
    </Modal>
  )
}
