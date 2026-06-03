import { useEffect } from 'react'

import { me, refresh } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

// Tries POST /auth/refresh on app load to restore a session from the HttpOnly
// cookie. On success the user is logged in without typing credentials.
export function useAuthHydration(): { isHydrated: boolean } {
  const { isHydrated, setAuth, setHydrated, clear } = useAuthStore()

  useEffect(() => {
    if (isHydrated) return
    let cancelled = false
    ;(async () => {
      try {
        const { accessToken } = await refresh()
        if (cancelled) return
        useAuthStore.setState({ accessToken })
        const user = await me()
        if (cancelled) return
        setAuth(user, accessToken)
      } catch {
        if (!cancelled) clear()
      } finally {
        if (!cancelled) setHydrated(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isHydrated, setAuth, setHydrated, clear])

  return { isHydrated }
}
