import {
  AcademicCapIcon,
  ArrowDownTrayIcon,
  BookOpenIcon,
  ChartBarSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  HomeIcon,
  TrashIcon,
  UserGroupIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import { NavLink, useLocation } from 'react-router-dom'
import { useRole } from '../hooks/useRole'
import { R } from '../lib/roles'

function linkClass(active, shell) {
  const base =
    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors'
  if (active) {
    if (shell === 'teacher')
      return `${base} bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-200 dark:ring-1 dark:ring-teal-500/25`
    if (shell === 'student')
      return `${base} bg-violet-100 text-violet-800 dark:bg-violet-600/20 dark:text-violet-100 dark:ring-1 dark:ring-violet-500/30`
    return `${base} bg-indigo-600 text-white shadow-lg shadow-indigo-900/30 dark:shadow-indigo-900/30`
  }
  return `${base} text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white`
}

export default function Sidebar({ collapsed, onToggleCollapse, shell, mobileOpen, onNavigate }) {
  const { pathname } = useLocation()
  const { roleName, canAdminActions } = useRole()

  const isAdmin = roleName === R.ADMIN
  const isTeacher = roleName === R.TEACHER
  const isStudent = roleName === R.STUDENT

  const mainLinks = []
  if (isAdmin) {
    mainLinks.push({ to: '/dashboard', label: 'Dashboard', icon: HomeIcon })
    mainLinks.push({ to: '/students', label: 'Students', icon: UserGroupIcon })
    mainLinks.push({ to: '/courses', label: 'Courses', icon: BookOpenIcon })
    mainLinks.push({ to: '/enrollments', label: 'Enrollments', icon: ChartBarSquareIcon })
  } else if (isTeacher) {
    mainLinks.push({ to: '/teacher', label: 'Dashboard', icon: HomeIcon })
    mainLinks.push({ to: '/teacher/roster', label: 'Class roster', icon: UserGroupIcon })
    mainLinks.push({ to: '/courses', label: 'Courses', icon: BookOpenIcon })
    mainLinks.push({ to: '/enrollments', label: 'Enrollments', icon: ChartBarSquareIcon })
  } else if (isStudent) {
    mainLinks.push({ to: '/student', label: 'Dashboard', icon: HomeIcon })
    mainLinks.push({ to: '/student/courses', label: 'My courses', icon: BookOpenIcon })
    mainLinks.push({ to: '/student/profile', label: 'Profile', icon: UserIcon })
  }

  const adminLinks = []
  if (canAdminActions) {
    adminLinks.push({ to: '/admin/accounts', label: '账号管理', icon: UserIcon })
    adminLinks.push({ to: '/admin/recycle', label: 'Recycle bin', icon: TrashIcon })
    adminLinks.push({ to: '/export', label: 'Export', icon: ArrowDownTrayIcon })
  }

  const logoTitle = shell === 'teacher' ? 'Teaching' : shell === 'student' ? 'Student portal' : 'SMS'
  const logoSubtitle =
    shell === 'teacher'
      ? 'Student Management System'
      : shell === 'student'
        ? 'Student Management System'
        : 'Student Management System'

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex h-screen shrink-0 flex-col border-r bg-white transition-transform duration-200 dark:border-white/5 dark:bg-[#0a0d12] md:static md:z-0 md:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } ${collapsed ? 'md:w-20' : 'md:w-64'} w-64`}
    >
      <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-4 dark:border-white/5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 ring-1 ring-indigo-200 dark:bg-indigo-600/20 dark:ring-indigo-500/30">
          <AcademicCapIcon className="h-6 w-6 text-indigo-700 dark:text-indigo-200" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{logoTitle}</div>
            <div className="truncate text-[11px] text-slate-500 dark:text-slate-500">{logoSubtitle}</div>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        <div>
          {!collapsed && (
            <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
              Main
            </div>
          )}
          <div className="space-y-1">
            {mainLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/teacher' || to === '/student'}
                title={collapsed ? label : undefined}
                onClick={() => onNavigate?.()}
                className={({ isActive }) => linkClass(isActive || pathname === to, shell)}
              >
                <Icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </div>
        </div>

        {adminLinks.length > 0 ? (
          <div>
            {!collapsed && (
              <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
                Admin
              </div>
            )}
            <div className="space-y-1">
              {adminLinks.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  title={collapsed ? label : undefined}
                  onClick={() => onNavigate?.()}
                  className={({ isActive }) => linkClass(isActive, shell)}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>{label}</span>}
                </NavLink>
              ))}
            </div>
          </div>
        ) : null}
      </nav>

      <div className="border-t border-slate-200 p-3 dark:border-white/5">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRightIcon className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeftIcon className="h-5 w-5" />
              <span className="text-xs">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
