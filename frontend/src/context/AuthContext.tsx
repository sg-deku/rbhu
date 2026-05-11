import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authService } from '../services/auth.service'

interface User { id: string; name: string; email: string; role: string }
interface AuthContextType { user: User | null; token: string | null; loading: boolean; login: (email: string, password: string) => Promise<void>; register: (name: string, email: string, password: string) => Promise<void>; logout: () => void; }

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (token) authService.getProfile(token).then(setUser).catch(() => { setToken(null); localStorage.removeItem('token') })
  }, [token])

  const login = async (email: string, password: string) => {
    setLoading(true)
    try { const data = await authService.login(email, password); setToken(data.token); setUser(data.user); localStorage.setItem('token', data.token) } finally { setLoading(false) }
  }

  const register = async (name: string, email: string, password: string) => {
    setLoading(true)
    try { const data = await authService.register(name, email, password); setToken(data.token); setUser(data.user); localStorage.setItem('token', data.token) } finally { setLoading(false) }
  }

  const logout = () => { setToken(null); setUser(null); localStorage.removeItem('token') }

  return <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => { const ctx = useContext(AuthContext); if (!ctx) throw new Error('useAuth must be used within AuthProvider'); return ctx }
