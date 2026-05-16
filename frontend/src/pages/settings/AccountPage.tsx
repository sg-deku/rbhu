import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import { User, Shield, Bell, AlertTriangle } from 'lucide-react'

interface FormSection {
  id: string
  label: string
  icon: React.ReactNode
}

const sections: FormSection[] = [
  { id: 'profile', label: 'Profile', icon: <User className="w-4 h-4" /> },
  { id: 'security', label: 'Security', icon: <Shield className="w-4 h-4" /> },
  { id: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" /> },
  { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle className="w-4 h-4" /> },
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
  const [profileForm, setProfileForm] = useState({ name: user?.name ?? '', email: user?.email ?? '', role: user?.role ?? 'USER' })
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' })
  const [profileSaved, setProfileSaved] = useState(false)
  const [passwordSaved, setPasswordSaved] = useState(false)
  const [notifSettings, setNotifSettings] = useState({ syncAlerts: true, weeklyDigest: false, productUpdates: true })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isAdminOrSuperAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERADMIN'

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    try {
      setIsSubmitting(true)
      const res = await api.put(`/users/${user.id}`, { name: profileForm.name, role: profileForm.role }, true)
      if (res.success) {
        setProfileSaved(true)
        setTimeout(() => setProfileSaved(false), 3000)
      } else {
        alert(res.message || 'Failed to update profile')
      }
    } catch (error: any) {
      alert(error.message || 'Failed to update profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordSave = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordForm({ current: '', next: '', confirm: '' })
    setPasswordSaved(true)
    setTimeout(() => setPasswordSaved(false), 3000)
  }

  const handleSendResetLink = async () => {
    if (!user?.email) return;
    try {
      const res = await api.post('/auth/forgot-password', { email: user.email }, false)
      if (res.success) {
        alert('Password reset link has been sent to your email.')
      } else {
        alert(res.message || 'Failed to send password reset link')
      }
    } catch (err: any) {
      alert(err.message || 'Failed to send password reset link')
    }
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-1">
          Account Settings
        </h1>
        <p className="text-sm text-gray-500">
          Manage your personal information, security, and preferences.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
        <aside className="md:w-56 shrink-0">
          <nav className="space-y-1 sticky top-6">
            {sections.map(section => {
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors font-medium ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-700' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className={isActive ? 'text-indigo-600' : 'text-gray-400'}>
                    {section.icon}
                  </span>
                  {section.label}
                </button>
              )
            })}
          </nav>
        </aside>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex-1 min-w-0 space-y-8"
        >
          <motion.div
            variants={sectionVariants}
            id="profile"
            className={`rounded-2xl p-6 md:p-8 bg-white border border-gray-200 shadow-sm ${activeSection !== 'profile' ? 'hidden md:block' : ''}`}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-6">Profile</h2>

            <div className="flex items-center gap-6 mb-8">
              <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white bg-indigo-600 shrink-0 shadow-sm">
                {initials}
              </div>
              <div>
                <p className="text-base font-semibold text-gray-900 mb-1">{user?.name}</p>
                <p className="text-sm text-gray-500 mb-3">{user?.email}</p>
                <button className="text-sm font-medium px-4 py-2 rounded-lg bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors shadow-sm">
                  Change avatar
                </button>
              </div>
            </div>

            <form onSubmit={handleProfileSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Full name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg text-sm bg-gray-50 border border-gray-200 text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                  <input
                    type="email"
                    disabled
                    value={profileForm.email}
                    onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-lg text-sm bg-gray-100 border border-gray-200 text-gray-500 cursor-not-allowed outline-none transition-all"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Role</label>
                  {isAdminOrSuperAdmin ? (
                    <select
                      value={profileForm.role}
                      onChange={e => setProfileForm(f => ({ ...f, role: e.target.value }))}
                      className="w-full sm:w-1/2 px-4 py-2.5 rounded-lg text-sm bg-gray-50 border border-gray-200 text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                    >
                      <option value="USER">User</option>
                      <option value="MODERATOR">Moderator</option>
                      <option value="ADMIN">Admin</option>
                      <option value="SUPERADMIN">Super Admin</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={profileForm.role}
                      className="w-full sm:w-1/2 px-4 py-2.5 rounded-lg text-sm bg-gray-100 border border-gray-200 text-gray-500 cursor-not-allowed outline-none transition-all"
                    />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
                >
                  Save changes
                </button>
                {profileSaved && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-sm font-medium text-green-600 flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Saved!
                  </motion.span>
                )}
              </div>
            </form>
          </motion.div>

          <motion.div
            variants={sectionVariants}
            id="security"
            className={`rounded-2xl p-6 md:p-8 bg-white border border-gray-200 shadow-sm ${activeSection !== 'security' ? 'hidden md:block' : ''}`}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-2">Security</h2>
            <p className="text-sm text-gray-500 mb-6">Update your password to keep your account secure.</p>

            <form onSubmit={handlePasswordSave} className="space-y-5">
              <div className="max-w-md">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Current password</label>
                <input
                  type="password"
                  value={passwordForm.current}
                  onChange={e => setPasswordForm(f => ({ ...f, current: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-lg text-sm bg-gray-50 border border-gray-200 text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New password</label>
                  <input
                    type="password"
                    value={passwordForm.next}
                    onChange={e => setPasswordForm(f => ({ ...f, next: e.target.value }))}
                    placeholder="Min. 8 characters"
                    className="w-full px-4 py-2.5 rounded-lg text-sm bg-gray-50 border border-gray-200 text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm new password</label>
                  <input
                    type="password"
                    value={passwordForm.confirm}
                    onChange={e => setPasswordForm(f => ({ ...f, confirm: e.target.value }))}
                    placeholder="Repeat password"
                    className="w-full px-4 py-2.5 rounded-lg text-sm bg-gray-50 border border-gray-200 text-gray-900 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all"
                  />
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors"
                >
                  Update password
                </button>
                <button
                  type="button"
                  onClick={handleSendResetLink}
                  className="px-5 py-2.5 rounded-lg text-sm font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 shadow-sm transition-colors"
                >
                  Send Reset Link
                </button>
                {passwordSaved && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-sm font-medium text-green-600 flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Password updated!
                  </motion.span>
                )}
              </div>
            </form>
          </motion.div>

          <motion.div
            variants={sectionVariants}
            id="notifications"
            className={`rounded-2xl p-6 md:p-8 bg-white border border-gray-200 shadow-sm ${activeSection !== 'notifications' ? 'hidden md:block' : ''}`}
          >
            <h2 className="text-lg font-bold text-gray-900 mb-2">Notifications</h2>
            <p className="text-sm text-gray-500 mb-6">Choose what you want to be notified about.</p>

            <div className="space-y-6">
              {[
                { key: 'syncAlerts' as const, label: 'Sync alerts', description: 'Get notified when a sync fails or completes.' },
                { key: 'weeklyDigest' as const, label: 'Weekly digest', description: 'Receive a weekly summary of your integrations\' activity.' },
                { key: 'productUpdates' as const, label: 'Product updates', description: 'Stay informed about new features and improvements.' },
              ].map(item => (
                <div key={item.key} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={notifSettings[item.key]}
                    onClick={() => setNotifSettings(s => ({ ...s, [item.key]: !s[item.key] }))}
                    className={`relative shrink-0 w-11 h-6 rounded-full transition-colors ${
                      notifSettings[item.key] ? 'bg-indigo-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        notifSettings[item.key] ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            variants={sectionVariants}
            id="danger"
            className={`rounded-2xl p-6 md:p-8 bg-white border border-red-200 shadow-sm ${activeSection !== 'danger' ? 'hidden md:block' : ''}`}
          >
            <h2 className="text-lg font-bold text-red-600 mb-2">Danger Zone</h2>
            <p className="text-sm text-gray-500 mb-6">Irreversible actions that affect your account.</p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-xl bg-red-50 border border-red-100">
              <div>
                <p className="text-sm font-semibold text-red-900 mb-1">Delete account</p>
                <p className="text-sm text-red-700">Permanently delete your account and all associated data. This cannot be undone.</p>
              </div>
              <button
                className="shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-red-700 bg-white border border-red-200 hover:bg-red-50 hover:border-red-300 transition-colors shadow-sm"
              >
                Delete account
              </button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  )
}

export default AccountPage