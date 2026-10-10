import {
  Bars3Icon,
  BellIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline'
import { ChevronDownIcon } from '@heroicons/react/24/solid'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../components/ui/ThemeToggle'   // ✅ new toggle component
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'       // ✅ theme hook
import { useRole } from '../hooks/useRole'

export default function TopBar({ shell, onOpenMenu }) {
  const { username, roleName, logout } = useAuth()
  const { canAdminActions, isStudent } = useRole()
  const { theme } = useTheme()   // ✅ get current theme (not used directly in classes, but can be used for conditional)
  const [q, setQ] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const inputRef = useRef(null)

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const roleLabel =
    roleName === 'ROLE_ADMIN' || canAdminActions
      ? 'ROLE_ADMIN'
      : roleName === 'ROLE_TEACHER'
        ? 'ROLE_TEACHER'
        : roleName === 'ROLE_STUDENT'
          ? 'ROLE_STUDENT'
          : 'User'

  const submitSearch = (e) => {
    e.preventDefault()
    if (isStudent) return
    const term = q.trim()
    if (!term) return
    navigate(`/students?name=${encodeURIComponent(term)}`)
  }

  return (
    <header className={`sticky top-0 z-20 border-b backdrop-blur-md ${
      theme === 'dark' 
        ? 'border-white/5 bg-[#0b0e14]/85' 
        : 'border-slate-200 bg-white/85'
    }`}>
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          className={`inline-flex rounded-lg border p-2 ${
            theme === 'dark'
              ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
              : 'border-slate-200 bg-white/50 text-slate-700 hover:bg-slate-100'
          } md:hidden`}
          onClick={onOpenMenu}
          aria-label="Open menu"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>

        {!isStudent && <form
          className={`mx-auto hidden max-w-2xl flex-1 items-center gap-2 rounded-xl border px-3 py-2 md:flex ${
            theme === 'dark'
              ? 'border-white/10 bg-white/5'
              : 'border-slate-200 bg-white'
          }`}
          onSubmit={submitSearch}
        >
          <MagnifyingGlassIcon className={`h-5 w-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search students, courses, enrollments..."
            className={`min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}
          />
          <span className={`hidden rounded-md border px-2 py-0.5 text-[10px] sm:inline ${
            theme === 'dark'
              ? 'border-white/10 bg-black/30 text-slate-400'
              : 'border-slate-200 bg-slate-100 text-slate-500'
          }`}>
            Ctrl + K
          </span>
        </form>}

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          {/* ✅ Replace old theme toggle with the new ThemeToggle component */}
          <ThemeToggle />

          <button
            type="button"
            disabled
            title="暂无通知"
            className={`relative rounded-lg border p-2 ${
              theme === 'dark'
                ? 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
            }`}
            aria-label="暂无通知"
          >
            <BellIcon className="h-5 w-5" />
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className={`flex items-center gap-2 rounded-xl border px-2 py-1.5 ${
                theme === 'dark'
                  ? 'border-white/10 bg-white/5 hover:bg-white/10'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div
                className={`grid h-9 w-9 place-items-center rounded-full text-xs font-bold text-white ${
                  shell === 'teacher'
                    ? 'bg-teal-600'
                    : shell === 'student'
                      ? 'bg-violet-600'
                      : 'bg-indigo-600'
                }`}
              >
                {(username || '?')
                  .split(' ')
                  .map((s) => s[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="hidden text-left sm:block">
                <div className={`text-sm font-semibold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {username || 'User'}
                </div>
                <div className="text-[11px] text-slate-400">{roleLabel}</div>
              </div>
              <ChevronDownIcon className={`hidden h-4 w-4 sm:block ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
            </button>
            {menuOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  aria-label="Close menu"
                  onClick={() => setMenuOpen(false)}
                />
                <div className={`absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border py-1 shadow-xl ${
                  theme === 'dark'
                    ? 'border-white/10 bg-[#0f141c]'
                    : 'border-slate-200 bg-white'
                }`}>
                  <button
                    type="button"
                    className={`block w-full px-3 py-2 text-left text-sm ${
                      theme === 'dark'
                        ? 'text-slate-200 hover:bg-white/5'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                    onClick={() => {
                      setMenuOpen(false)
                      logout()
                      navigate('/login', { replace: true })
                    }}
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {!isStudent && <form className={`border-t px-4 py-2 md:hidden ${
        theme === 'dark' ? 'border-white/5' : 'border-slate-200'
      }`} onSubmit={submitSearch}>
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${
          theme === 'dark'
            ? 'border-white/10 bg-white/5'
            : 'border-slate-200 bg-white'
        }`}>
          <MagnifyingGlassIcon className={`h-5 w-5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className={`min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-500 ${
              theme === 'dark' ? 'text-white' : 'text-slate-900'
            }`}
          />
        </div>
      </form>}
    </header>
  )
}
