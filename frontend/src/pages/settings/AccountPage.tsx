import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'

interface FormSection {
  id: string
  label: string
}

const sections: FormSection[] = [
  { id: 'profile', label: 'Profile' },
  { id: 'security', label: 'Security' },
  { id: 'notifications', label: 'Notifications' },
  { id: 'danger', label: 'Danger Zone' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
}

const sectionVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
}

const AccountPage = () => {
  const { user } = useAuth()
  const [activeSection, setActiveSection] = useState('profile')
  const [profileForm, setProfileForm] = useState({ name: user?.name ?? '', email: user?.email ?? '' })
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [profileSaved, setProfileSaved] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [notifSettings, setNotifSettings] = useState({ syncAlerts: true, weeklyDigest: false, productUpdates: true })

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 3000)
  }

  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordForm({ current: '', next: '', confirm: '' })
    setPasswordSaved(true)
    setTimeout(() => setPasswordSaved(false), 3000)
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
  }

  return (
    <div className="min-h-full" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight mb-1" style={{ color: 'var(--color-text)' }}>
            Account
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Manage your personal information, security, and preferences.
          </p>
        </div>

        <div className="flex gap-8">
          <aside className="w-48 flex-shrink-0 hidden md:block">
            <nav className="space-y-0.5 sticky top-6">
              {sections.map(section => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-150 font-medium"
                  style={{
                    color: activeSection === section.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                    backgroundColor: activeSection === section.id ? 'rgba(99,102,241,0.08)' : 'transparent',
                  }}
                >
                  {section.label}
                </button>
              ))}
            </nav>
          </aside>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex-1 min-w-0 space-y-6"
          >
            <motion.div
              variants={sectionVariants}
              id="profile"
              className="rounded-xl p-6"
              style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
            >
              <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--color-text)' }}>Profile</h2>

              <div className="flex items-center gap-5 mb-6">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
                >
                  {initials}
                </div>
                <div>
                  <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--color-text)' }}>{user?.name}</p>
                  <p className="text-xs mb-2" style={{ color: 'var(--color-text-secondary)' }}>{user?.email}</p>
                  <button
                    className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all duration-150"
                    style={{ backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}
                  >
                    Change avatar
                  </button>
                </div>
              </div>

              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Full name</label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all duration-150"
                      style={inputStyle}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Email address</label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all duration-150"
                      style={inputStyle}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-150"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
                  >
                    Save changes
                  </button>
                  {profileSaved && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-sm font-medium"
                      style={{ color: '#10b981' }}
                    >
                      Saved!
                    </motion.span>
                  )}
                </div>
              </form>
            </motion.div>

            <motion.div
              variants={sectionVariants}
              id="security"
              className="rounded-xl p-6"
              style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
            >
              <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Security</h2>
              <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>Update your password to keep your account secure.</p>

              <form onSubmit={handlePasswordSave} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Current password</label>
                  <input
                    type="password"
                    value={passwordForm.current}
                    onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all duration-150"
                    style={inputStyle}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>New password</label>
                    <input
                      type="password"
                      value={passwordForm.next}
                      onChange={e => setPasswordForm(f => ({ ...f, next: e.target.value }))}
                      placeholder="Min. 8 characters"
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all duration-150"
                      style={inputStyle}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Confirm new password</label>
                    <input
                      type="password"
                      value={passwordForm.confirm}
                      onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
                      placeholder="Repeat password"
                      className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all duration-150"
                      style={inputStyle}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all duration-150"
                    style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
                  >
                    Update password
                  </button>
                  {passwordSaved && (
                    <motion.span
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-sm font-medium"
                      style={{ color: '#10b981' }}
                    >
                      Password updated!
                    </motion.span>
                  )}
                </div>
              </form>
            </motion.div>

            <motion.div
              variants={sectionVariants}
              id="notifications"
              className="rounded-xl p-6"
              style={{ backgroundColor: 'var(--color-card)', border: '1px solid var(--color-border)' }}
            >
              <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Notifications</h2>
              <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>Choose what you want to be notified about.</p>

              <div className="space-y-4">
                {[
                  { key: 'syncAlerts' as const, label: 'Sync alerts', description: 'Get notified when a sync fails or completes.' },
                  { key: 'weeklyDigest' as const, label: 'Weekly digest', description: 'Receive a weekly summary of your integrations\' activity.' },
                  { key: 'productUpdates' as const, label: 'Product updates', description: 'Stay informed about new features and improvements.' },
                ].map(item => (
                  <div key={item.key} className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{item.label}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{item.description}</p>
                    </div>
                    <button
                      role="switch"
                      aria-checked={notifSettings[item.key]}
                      onClick={() => setNotifSettings(s => ({ ...s, [item.key]: !s[item.key] }))}
                      className="relative flex-shrink-0 w-10 h-6 rounded-full transition-all duration-200"
                      style={{
                        backgroundColor: notifSettings[item.key] ? 'var(--color-primary)' : 'var(--color-border)',
                      }}
                    >
                      <span
                        className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                        style={{ transform: notifSettings[item.key] ? 'translateX(16px)' : 'translateX(0)' }}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              variants={sectionVariants}
              id="danger"
              className="rounded-xl p-6"
              style={{ backgroundColor: 'var(--color-card)', border: '1px solid rgba(220,38,38,0.3)' }}
            >
              <h2 className="text-base font-semibold mb-1" style={{ color: '#dc2626' }}>Danger Zone</h2>
              <p className="text-sm mb-5" style={{ color: 'var(--color-text-secondary)' }}>Irreversible actions that affect your account.</p>

              <div className="flex items-start justify-between gap-4 p-4 rounded-lg" style={{ backgroundColor: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.15)' }}>
                <div>
                  <p className="text-sm font-medium mb-0.5" style={{ color: 'var(--color-text)' }}>Delete account</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>Permanently delete your account and all associated data. This cannot be undone.</p>
                </div>
                <button
                  className="flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                  style={{ color: '#dc2626', backgroundColor: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)' }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}

export default AccountPage
