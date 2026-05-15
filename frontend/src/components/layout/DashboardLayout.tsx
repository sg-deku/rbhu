import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { 
  Home, 
  Settings, 
  User as UserIcon, 
  Plug, 
  Menu, 
  Search, 
  Bell, 
  LogOut, 
  ChevronRight, 
  ChevronDown, 
  CheckCircle2
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  children?: { label: string; href: string }[]
}

const navItems: NavItem[] = [
  {
    label: 'Home',
    href: '/',
    icon: <Home className="w-5 h-5" />,
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: <Settings className="w-5 h-5" />,
    children: [
      { label: 'Account', href: '/settings/account' },
      { label: 'Integrations', href: '/settings/integrations' },
    ],
  },
]

interface BreadcrumbSegment {
  label: string
  href?: string
}

function getBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  const map: Record<string, BreadcrumbSegment[]> = {
    '/': [{ label: 'Home' }],
    '/settings/account': [{ label: 'Settings' }, { label: 'Account' }],
    '/settings/integrations': [{ label: 'Settings' }, { label: 'Integrations' }],
  }
  return map[pathname] ?? [{ label: 'Page' }]
}

interface DashboardLayoutProps {
  children: React.ReactNode
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(location.pathname.startsWith('/settings'))
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const breadcrumbs = getBreadcrumbs(location.pathname)

  const isActive = (href: string) =>
    href === '/' ? location.pathname === '/' : location.pathname.startsWith(href)

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 text-gray-900">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 260 : 72 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="flex-shrink-0 flex flex-col h-full bg-white border-r border-gray-200 z-20 overflow-visible"
      >
        <div className="h-16 flex items-center px-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shrink-0 shadow-sm">
              <span className="text-white font-bold text-lg leading-none tracking-tighter">R</span>
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.2 }}
                  className="font-bold text-lg tracking-tight text-gray-900 whitespace-nowrap"
                >
                  RBHU
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map(item => (
            <div key={item.href}>
              {item.children ? (
                <>
                  <button
                    onClick={() => sidebarOpen ? setSettingsOpen(o => !o) : setSidebarOpen(true)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.href) ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    <AnimatePresence>
                      {sidebarOpen && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex-1 text-left truncate"
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>
                    {sidebarOpen && (
                      <motion.div
                        animate={{ rotate: settingsOpen ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="shrink-0 opacity-50"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </motion.div>
                    )}
                  </button>
                  <AnimatePresence>
                    {sidebarOpen && settingsOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-1 pb-2 space-y-1">
                          {item.children.map(child => {
                            const isChildActive = location.pathname === child.href;
                            return (
                              <Link
                                key={child.href}
                                to={child.href}
                                className={`flex items-center gap-3 pl-11 pr-3 py-2 rounded-lg text-sm transition-colors ${
                                  isChildActive 
                                    ? 'bg-indigo-50 text-indigo-700 font-medium' 
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                              >
                                {child.label}
                              </Link>
                            )
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <Link
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href) ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="truncate"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-200 shrink-0">
          <div className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-100" title={!sidebarOpen ? 'All systems operational' : undefined}>
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-medium text-green-700 truncate"
                >
                  Systems normal
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>

            <nav className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
              {breadcrumbs.map((seg, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
                  {seg.href ? (
                    <Link to={seg.href} className="hover:text-gray-900 transition-colors">
                      {seg.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-gray-900">{seg.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 hover:border-gray-300 transition-colors cursor-text">
              <Search className="w-4 h-4" />
              <span className="text-sm">Search...</span>
              <kbd className="ml-2 font-sans text-xs bg-white border border-gray-200 rounded px-1.5 py-0.5 text-gray-400">⌘K</kbd>
            </div>

            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
            </button>

            <div className="w-px h-6 bg-gray-200 hidden sm:block"></div>

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(o => !o)}
                className="flex items-center gap-2 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200">
                  {initials}
                </div>
                <div className="hidden sm:block text-left text-sm max-w-[120px]">
                  <p className="font-medium text-gray-900 truncate">{user?.name}</p>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-500 hidden sm:block" />
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50"
                  >
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <p className="text-sm font-semibold text-gray-900 truncate">{user?.name}</p>
                      <p className="text-xs text-gray-500 truncate mt-0.5">{user?.email}</p>
                    </div>
                    <div className="p-2 space-y-1">
                      <Link
                        to="/settings/account"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                      >
                        <UserIcon className="w-4 h-4 text-gray-500" />
                        Account settings
                      </Link>
                      <Link
                        to="/settings/integrations"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                      >
                        <Plug className="w-4 h-4 text-gray-500" />
                        Integrations
                      </Link>
                    </div>
                    <div className="p-2 border-t border-gray-200">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 lg:p-8 relative">
          <div className="max-w-7xl mx-auto w-full min-h-[calc(100vh-140px)] flex flex-col">
            <div className="flex-1">
              {children}
            </div>
            
            <footer className="mt-auto pt-8 pb-4 shrink-0 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between text-gray-500 text-sm">
              <p>© 2026 RBHU. All rights reserved.</p>
              <div className="flex items-center gap-4 mt-2 sm:mt-0">
                <a href="#" className="hover:text-gray-900 transition-colors">Privacy</a>
                <a href="#" className="hover:text-gray-900 transition-colors">Terms</a>
                <a href="#" className="hover:text-gray-900 transition-colors">Support</a>
              </div>
            </footer>
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout