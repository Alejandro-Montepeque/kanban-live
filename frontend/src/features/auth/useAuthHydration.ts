import { useEffect } from 'react'

import { me, refresh } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

/**
 * On app load, attempt to silently restore a session.
 *
 * The refresh cookie is HttpOnly so we cannot read it from JS, but we can
 * call /auth/refresh — if it succeeds, we have a valid session; then we
 * fetch the user. If anything fails, we stay logged out.
 */
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
