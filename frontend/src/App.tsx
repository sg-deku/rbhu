import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import IntegrationsPage from './pages/settings/IntegrationsPage'
import AccountPage from './pages/settings/AccountPage'
import DashboardLayout from './components/layout/DashboardLayout'
import './styles/index.css'

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { token, loading } = useAuth()
  if (loading) return null
  if (!token) return <Navigate to="/login" replace />
  return <>{children}</>
}

const ProtectedLayout = ({ children }: { children: React.ReactNode }) => {
  const { token, loading } = useAuth()
  if (loading) return null
  if (!token) return <Navigate to="/login" replace />
  return <DashboardLayout>{children}</DashboardLayout>
}

function App() {
  return (
    <div className="min-h-screen bg-white">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<ProtectedLayout><Home /></ProtectedLayout>} />
          <Route path="/settings/integrations" element={<ProtectedLayout><IntegrationsPage /></ProtectedLayout>} />
          <Route path="/settings/account" element={<ProtectedLayout><AccountPage /></ProtectedLayout>} />
        </Routes>
      </BrowserRouter>
    </div>
  )
}

export default App
