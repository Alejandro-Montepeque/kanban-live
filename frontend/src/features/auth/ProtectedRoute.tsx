import type { PropsWithChildren } from 'react'
import { Navigate, useLocation } from 'react-router-dom'

import { useAuthStore } from '@/stores/auth'

export function ProtectedRoute({ children }: PropsWithChildren) {
  const { user, isHydrated } = useAuthStore()
  const location = useLocation()

  if (!isHydrated) {
    return (
      <main className="min-h-screen grid place-items-center">
        <p className="text-ink-muted text-sm">Loading...</p>
      </main>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
