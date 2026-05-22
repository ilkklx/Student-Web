export default function Spinner({ className = 'h-8 w-8' }) {
  return (
    <div
      className={`${className} animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600 dark:border-white/20 dark:border-t-indigo-400`}
      role="status"
      aria-label="Loading"
    />
  )
}