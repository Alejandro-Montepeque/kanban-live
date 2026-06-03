import { useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { verifyEmail } from '@/api/auth'
import { AuthShell } from './AuthShell'

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const mutation = useMutation({
    mutationFn: (t: string) => verifyEmail(t),
  })

  useEffect(() => {
    if (token && mutation.status === 'idle') {
      mutation.mutate(token)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    if (mutation.isSuccess) {
      const t = setTimeout(() => navigate('/login', { replace: true }), 2500)
      return () => clearTimeout(t)
    }
  }, [mutation.isSuccess, navigate])

  if (!token) {
    return (
      <AuthShell
        eyebrow="Email verification"
        title="Missing verification token"
        subtitle="Open this page from the link sent to your email."
      >
        <p className="text-center text-sm text-ink-muted">
          <Link to="/login" className="text-accent-glow hover:text-ink transition-colors">
            Back to sign in
          </Link>
        </p>
      </AuthShell>
    )
  }

  if (mutation.isPending) {
    return (
      <AuthShell eyebrow="Email verification" title="Verifying your email...">
        <p className="text-center text-sm text-ink-muted">This will only take a moment.</p>
      </AuthShell>
    )
  }

  if (mutation.isSuccess) {
    return (
      <AuthShell
        eyebrow="Email verification"
        title="Your email is verified"
        subtitle="Redirecting to sign in..."
      >
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 text-center">
          Welcome aboard. You can sign in now.
        </div>
      </AuthShell>
    )
  }

  const isExpired =
    mutation.error instanceof AxiosError && mutation.error.response?.status === 401

  return (
    <AuthShell
      eyebrow="Email verification"
      title={isExpired ? 'Link expired or invalid' : 'Verification failed'}
      subtitle={
        isExpired
          ? 'This verification link is no longer valid. Request a new one and try again.'
          : 'Something went wrong while verifying your email.'
      }
    >
      <p className="text-center text-sm text-ink-muted">
        <Link to="/login" className="text-accent-glow hover:text-ink transition-colors">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  )
}
