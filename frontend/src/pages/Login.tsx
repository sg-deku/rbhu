import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const { login, loading } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err.message || 'Failed to login')
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center overflow-hidden" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)' }}>
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-16 left-16 w-64 h-64 rounded-full border-2 border-white" />
          <div className="absolute bottom-16 right-16 w-48 h-48 rounded-full border-2 border-white" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-white" />
        </div>
        <div className="relative z-10 text-white text-center px-12">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl bg-white bg-opacity-20 flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <span className="text-2xl font-bold tracking-tight">RBHU</span>
          </div>
          <h2 className="text-3xl font-bold mb-4 leading-snug">Your knowledge,<br />instantly searchable.</h2>
          <p className="text-base text-white text-opacity-80 leading-relaxed">Connect your tools, sync your data, and get intelligent answers from all your documents in one place.</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}>
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <span className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>RBHU</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>Welcome back</h1>
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Sign in to your account to continue</p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 p-3 rounded-lg mb-5 text-sm"
              style={{ backgroundColor: 'rgba(220,38,38,0.08)', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
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
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium" style={{ color: 'var(--color-text)' }}>Password</label>
                <Link to="/forgot-password" className="text-xs font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-lg text-sm outline-none transition-all duration-150"
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
              disabled={loading}
              className="w-full py-2.5 rounded-lg text-sm font-semibold text-white transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))' }}
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Don't have an account?{' '}
            <Link to="/register" className="font-medium hover:underline" style={{ color: 'var(--color-primary)' }}>
              Create one
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

export default Login
