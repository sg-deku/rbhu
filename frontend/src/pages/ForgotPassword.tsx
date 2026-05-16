import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { api } from '../services/api'

const ForgotPassword = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    
    try {
      const res = await api.post('/auth/forgot-password', { email }, false)
      if (res.success) {
        setMessage({ type: 'success', text: res.message || 'Check your email for password reset instructions.' })
      } else {
        setMessage({ type: 'error', text: res.message || 'Failed to request password reset' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An unexpected error occurred' })
    } finally {
      setLoading(false)
    }
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
          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Forgot password?</h1>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Enter your email and we'll send you a link to reset your password.
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
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>Email address</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
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
            disabled={loading || !email}
            className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : 'Send reset link'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Remember your password?{' '}
          <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}

export default ForgotPassword
