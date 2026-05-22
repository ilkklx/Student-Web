import { ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { useState } from 'react'
import { toast } from 'react-toastify'
import { useRole } from '../../hooks/useRole'
import { getApiErrorMessage } from '../../lib/errors'
import { exportStudentsCsv } from '../../lib/studentsApi'

export default function ExportPage() {
  const { canAdminActions } = useRole()
  const [busy, setBusy] = useState(false)

  const download = async () => {
    setBusy(true)
    try {
      const blob = await exportStudentsCsv()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'students-export.csv'
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Download started')
    } catch (e) {
      toast.error(getApiErrorMessage(e, 'Export failed'))
    } finally {
      setBusy(false)
    }
  }

  if (!canAdminActions) {
    return (
      <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-sm text-amber-800 dark:text-amber-100">
        Admin only.
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Export</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Download the official CSV export from the backend.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="text-sm text-slate-700 dark:text-slate-300">
          Endpoint: <span className="font-mono text-slate-800 dark:text-slate-200">GET /api/students/export/csv</span>
        </div>
        <div className="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Headers include: ID, Name, Email, Department, Photo URL (per backend contract).
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={download}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 dark:bg-indigo-600 dark:hover:bg-indigo-500"
        >
          <ArrowDownTrayIcon className="h-5 w-5" />
          {busy ? 'Preparing…' : 'Download CSV'}
        </button>
      </div>
    </div>
  )
}