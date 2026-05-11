import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const Register = () => {
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const { register, loading } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await register(form.name, form.email, form.password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6">Register</h2>
        <form onSubmit={handleSubmit}>
          <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Full Name" className="w-full border p-2 rounded mb-4" required />
          <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email" className="w-full border p-2 rounded mb-4" required />
          <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Password" className="w-full border p-2 rounded mb-4" required />
          <button type="submit" disabled={loading} className="w-full bg-green-600 text-white py-2 rounded">{loading ? 'Registering...' : 'Register'}</button>
        </form>
      </div>
    </div>
  )
}

export default Register
