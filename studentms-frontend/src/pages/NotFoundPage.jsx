import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
      <div className="text-sm font-semibold text-indigo-300">404</div>
      <h1 className="mt-2 text-2xl font-semibold text-white">Page not found</h1>
      <p className="mt-2 text-sm text-slate-400">That route doesn’t exist in this app shell.</p>
      <Link className="mt-6 inline-flex rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500" to="/">
        Go home
      </Link>
    </div>
  )
}
