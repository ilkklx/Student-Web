import { yupResolver } from '@hookform/resolvers/yup'
import { useForm } from 'react-hook-form'
import * as yup from 'yup'
import Modal from '../../components/ui/Modal'

const schema = yup.object({
  code: yup.string().trim().required('Code is required'),
  title: yup.string().trim().required('Title is required'),
  credits: yup
    .number()
    .typeError('Credits must be a number')
    .integer()
    .min(1)
    .max(30)
    .required('Credits is required'),
})

export default function CourseFormModal({ open, onClose, onSubmit }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: { code: '', title: '', credits: 3 },
  })

  const submit = handleSubmit(async (values) => {
    await onSubmit(values)
    reset({ code: '', title: '', credits: 3 })
  })

  return (
    <Modal
      open={open}
      title="Add course"
      onClose={onClose}
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
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
          >
            {isSubmitting ? 'Saving…' : 'Create'}
          </button>
        </div>
      }
    >
      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Code</label>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-500/40 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:ring-sky-500/40"
            {...register('code')}
          />
          {errors.code && <p className="mt-1 text-xs text-rose-500 dark:text-rose-300">{errors.code.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Title</label>
          <input
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-500/40 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:ring-sky-500/40"
            {...register('title')}
          />
          {errors.title && <p className="mt-1 text-xs text-rose-500 dark:text-rose-300">{errors.title.message}</p>}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Credits</label>
          <input
            type="number"
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-sky-500/40 dark:border-white/10 dark:bg-slate-950/40 dark:text-white dark:focus:ring-sky-500/40"
            {...register('credits')}
          />
          {errors.credits && <p className="mt-1 text-xs text-rose-500 dark:text-rose-300">{errors.credits.message}</p>}
        </div>
      </form>
    </Modal>
  )
}