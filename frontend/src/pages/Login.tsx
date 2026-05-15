import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6">Login</h2>
        {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit}>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full border p-2 rounded mb-4" required />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full border p-2 rounded mb-4" required />
          <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white py-2 rounded">
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  )
}


export default Login
