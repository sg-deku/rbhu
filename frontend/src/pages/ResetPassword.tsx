import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../services/api'

const ResetPassword = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!token) {
      setMessage({ type: 'error', text: 'Invalid or missing reset token' })
      return
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters long' })
      return
    }

    setLoading(true)
    setMessage(null)
    
    try {
      const res = await api.post('/auth/reset-password', { token, password }, false)
      if (res.success) {
        setMessage({ type: 'success', text: 'Password reset successful. Redirecting to login...' })
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      } else {
        setMessage({ type: 'error', text: res.message || 'Failed to reset password' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ backgroundColor: 'var(--color-bg)' }}>
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Invalid Reset Link</h2>
          <p className="text-sm mb-4">The password reset link is invalid or has expired.</p>
          <Link to="/forgot-password" style={{ color: 'var(--color-primary)' }}>Request a new link</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ backgroundColor: 'var(--color-bg)' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-center mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 120" className="h-10 w-auto shrink-0">
            <defs>
              <style>
                {`@import url('https://fonts.googleapis.com/css2?family=Fredoka+One&display=swap');`}
              </style>
            </defs>
            <text x="0" y="92" fontFamily="'Fredoka One', 'Quicksand', 'Nunito', sans-serif" fontWeight="400" fontSize="96" fill="var(--color-text)" letterSpacing="-3">rbhu</text>
          </svg>
        </div>

        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Reset password</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Please enter your new password below.
          </p>
        </div>

        {message && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-2 p-3 rounded-lg mb-5 text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'}`}
          >
            {message.text}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>New Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all duration-150 focus:ring-2"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all duration-150 focus:ring-2"
              style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--color-primary)' }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !password || !confirmPassword}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Resetting...
              </>
            ) : 'Reset password'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}

export default ResetPassword
