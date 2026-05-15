import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'

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
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    label: 'Settings',
    href: '/settings',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
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
  const [settingsOpen, setSettingsOpen] = useState(
    location.pathname.startsWith('/settings')
  )
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
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--color-bg)' }}>
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 240 : 64 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        className="flex-shrink-0 flex flex-col h-full z-20 overflow-hidden"
        style={{
          backgroundColor: 'var(--color-card)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        <div className="flex items-center h-16 px-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
            >
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  className="font-bold text-base tracking-tight truncate"
                  style={{ color: 'var(--color-text)' }}
                >
                  RBHU
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2">
          {navItems.map(item => (
            <div key={item.href} className="mb-1">
              {item.children ? (
                <>
                  <button
                    onClick={() => sidebarOpen && setSettingsOpen(o => !o)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                    style={{
                      color: isActive(item.href) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                      backgroundColor: isActive(item.href) ? 'rgba(99,102,241,0.08)' : 'transparent',
                    }}
                    title={!sidebarOpen ? item.label : undefined}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
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
                      <motion.svg
                        animate={{ rotate: settingsOpen ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="w-4 h-4 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </motion.svg>
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
                        {item.children.map(child => (
                          <Link
                            key={child.href}
                            to={child.href}
                            className="flex items-center gap-3 pl-10 pr-3 py-2 rounded-lg text-sm transition-all duration-150 mt-0.5"
                            style={{
                              color: location.pathname === child.href ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                              backgroundColor: location.pathname === child.href ? 'rgba(99,102,241,0.08)' : 'transparent',
                              fontWeight: location.pathname === child.href ? 500 : 400,
                            }}
                          >
                            {child.label}
                          </Link>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              ) : (
                <Link
                  to={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{
                    color: isActive(item.href) ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    backgroundColor: isActive(item.href) ? 'rgba(99,102,241,0.08)' : 'transparent',
                  }}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
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

        <div className="flex-shrink-0 p-2" style={{ borderTop: '1px solid var(--color-border)' }}>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg"
            title={!sidebarOpen ? 'v1.0.0' : undefined}
          >
            <div
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: '#10b981' }}
            />
            <AnimatePresence>
              {sidebarOpen && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  All systems operational
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header
          className="flex-shrink-0 h-16 flex items-center gap-4 px-4 sm:px-6"
          style={{
            backgroundColor: 'var(--color-card)',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="p-1.5 rounded-lg transition-all duration-150 flex-shrink-0"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-label="Toggle sidebar"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <nav className="flex items-center gap-1.5 text-sm min-w-0 flex-1" aria-label="Breadcrumb">
            {breadcrumbs.map((seg, i) => (
              <React.Fragment key={i}>
                {i > 0 && (
                  <svg className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                {seg.href ? (
                  <Link
                    to={seg.href}
                    className="truncate hover:underline"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {seg.label}
                  </Link>
                ) : (
                  <span className="truncate font-medium" style={{ color: 'var(--color-text)' }}>
                    {seg.label}
                  </span>
                )}
              </React.Fragment>
            ))}
          </nav>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-all duration-150"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <span className="text-xs">Search...</span>
              <span className="ml-1 text-xs px-1.5 py-0.5 rounded font-mono" style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>⌘K</span>
            </div>

            <button
              className="relative p-2 rounded-lg transition-all duration-150 flex-shrink-0"
              style={{ color: 'var(--color-text-secondary)' }}
              aria-label="Notifications"
              title="Notifications"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            <div
              className="w-px h-6 flex-shrink-0 hidden sm:block"
              style={{ backgroundColor: 'var(--color-border)' }}
            />

            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(o => !o)}
                className="flex items-center gap-2 p-1.5 rounded-lg transition-all duration-150"
                style={{ color: 'var(--color-text)' }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
                >
                  {initials}
                </div>
                <AnimatePresence>
                  {user?.name && (
                    <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">
                      {user.name}
                    </span>
                  )}
                </AnimatePresence>
                <svg className="w-4 h-4 hidden sm:block" style={{ color: 'var(--color-text-secondary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <AnimatePresence>
                {profileOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl shadow-lg overflow-hidden z-50"
                    style={{
                      backgroundColor: 'var(--color-card)',
                      border: '1px solid var(--color-border)',
                      boxShadow: '0 10px 40px var(--color-shadow)',
                    }}
                  >
                    <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>{user?.name}</p>
                      <p className="text-xs truncate mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{user?.email}</p>
                    </div>
                    <div className="p-1.5">
                      <Link
                        to="/settings/account"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 w-full"
                        style={{ color: 'var(--color-text)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-secondary)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Account settings
                      </Link>
                      <Link
                        to="/settings/integrations"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 w-full"
                        style={{ color: 'var(--color-text)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-secondary)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        Integrations
                      </Link>
                    </div>
                    <div className="p-1.5" style={{ borderTop: '1px solid var(--color-border)' }}>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-150 w-full"
                        style={{ color: '#dc2626' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(220,38,38,0.06)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto" style={{ backgroundColor: 'var(--color-bg)' }}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="min-h-full flex flex-col"
          >
            <div className="flex-1">
              {children}
            </div>
            <footer
              className="flex-shrink-0 px-4 sm:px-6 py-4 flex items-center justify-between"
              style={{
                borderTop: '1px solid var(--color-border)',
                backgroundColor: 'var(--color-card)',
              }}
            >
              <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                © 2026 RBHU. All rights reserved.
              </span>
              <div className="flex items-center gap-4">
                <a
                  href="#"
                  className="text-xs transition-colors duration-150 hover:underline"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Privacy
                </a>
                <a
                  href="#"
                  className="text-xs transition-colors duration-150 hover:underline"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Terms
                </a>
                <a
                  href="#"
                  className="text-xs transition-colors duration-150 hover:underline"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  Support
                </a>
              </div>
            </footer>
          </motion.div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
