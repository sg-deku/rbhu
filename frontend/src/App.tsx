import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Home from './pages/Home'
import IntegrationsPage from './pages/settings/IntegrationsPage'
import AccountPage from './pages/settings/AccountPage'
import UsersPage from './pages/settings/UsersPage'
import DashboardLayout from './components/layout/DashboardLayout'
import './styles/index.css'

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  const { token, loading } = useAuth()
  if (loading) return null
  if (!token) return <Navigate to="/login" replace />
  return <DashboardLayout>{children}</DashboardLayout>
}

const ProtectedAdminLayout = ({ children }: { children: React.ReactNode }) => {
  const { token, loading, user } = useAuth()
  if (loading) return null
  if (!token) return <Navigate to="/login" replace />
  if (user?.role !== 'ADMIN' && user?.role !== 'SUPERADMIN') return <Navigate to="/" replace />
  return <DashboardLayout>{children}</DashboardLayout>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<ProtectedLayout><Home /></ProtectedLayout>} />
        <Route path="/settings/integrations" element={<ProtectedLayout><IntegrationsPage /></ProtectedLayout>} />
        <Route path="/settings/account" element={<ProtectedLayout><AccountPage /></ProtectedLayout>} />
        <Route path="/settings/users" element={<ProtectedAdminLayout><UsersPage /></ProtectedAdminLayout>} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
