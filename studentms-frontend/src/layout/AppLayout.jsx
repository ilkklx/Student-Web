import { useMemo, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { useTheme } from '../context/ThemeContext'   // ✅ import theme hook

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const { theme } = useTheme()   // ✅ get current theme

  const shell = useMemo(() => {
    if (location.pathname.startsWith('/teacher')) return 'teacher'
    if (location.pathname.startsWith('/student')) return 'student'
    return 'admin'
  }, [location.pathname])

  return (
    // ✅ dynamic background and text based on theme
    <div className={`flex min-h-full ${theme === 'dark' ? 'bg-[#0b0e14] text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/60 md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}
      <Sidebar
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((c) => !c)}
        shell={shell}
        mobileOpen={mobileOpen}
        onNavigate={() => setMobileOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col transition-[margin] duration-200">
        <TopBar shell={shell} onOpenMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
        <footer className={`border-t px-4 py-4 text-xs sm:px-6 lg:px-8 ${theme === 'dark' ? 'border-white/5 text-slate-500' : 'border-slate-200 text-slate-500'}`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} Student Management System. All rights reserved.</span>
            <span className={theme === 'dark' ? 'text-slate-600' : 'text-slate-400'}>Version 1.0.0</span>
          </div>
        </footer>
      </div>
    </div>
  )
}