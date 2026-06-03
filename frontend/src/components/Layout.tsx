import { useMutation } from '@tanstack/react-query'
import type { PropsWithChildren } from 'react'
import { useNavigate } from 'react-router-dom'

import { logout } from '@/api/auth'
import { Logo } from '@/components/brand/Logo'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/auth'

export function Layout({ children }: PropsWithChildren) {
  const navigate = useNavigate()
  const { user, clear } = useAuthStore()

  const logoutMutation = useMutation({
    mutationFn: logout,
    onSettled: () => {
      clear()
      navigate('/login', { replace: true })
    },
  })

  const initials = user?.name
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')

  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden">
      {/* Background aurora — sizes capped at 50vw to fit small viewports. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 -left-40 w-[min(50vw,480px)] h-[min(50vw,480px)] bg-accent/15 blur-[120px] rounded-full" />
        <div className="absolute -bottom-40 -right-40 w-[min(50vw,420px)] h-[min(50vw,420px)] bg-cyan-glow/10 blur-[120px] rounded-full" />
      </div>

      <header className="sticky top-0 z-20 glass border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Logo />
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md bg-bg-surface border border-bg-border text-ink-muted whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-glow animate-pulse-glow" />
              Personal
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {user && (
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 shrink-0 rounded-full bg-gradient-to-br from-accent to-cyan-glow grid place-items-center text-[11px] font-bold text-bg">
                  {initials || '·'}
                </div>
                <span className="hidden md:inline text-sm text-ink-muted truncate max-w-[160px]">
                  {user.name}
                </span>
              </div>
            )}
            <Button
              variant="ghost"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              className="px-3 sm:px-4"
            >
              {logoutMutation.isPending ? 'Logging out...' : 'Log out'}
            </Button>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  )
}
