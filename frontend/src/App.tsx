import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import { Layout } from '@/components/Layout'
import LoginPage from '@/features/auth/LoginPage'
import { ProtectedRoute } from '@/features/auth/ProtectedRoute'
import RegisterPage from '@/features/auth/RegisterPage'
import { useAuthHydration } from '@/features/auth/useAuthHydration'
import DashboardPage from '@/features/dashboard/DashboardPage'

export default function App() {
  useAuthHydration()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <DashboardPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
