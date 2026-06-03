import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import { login, resendVerification } from '@/api/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useAuthStore } from '@/stores/auth'
import { AuthShell } from './AuthShell'
import { loginSchema, type LoginInput } from './schemas'

type LoginErrorKind = 'invalid' | 'locked' | 'unverified' | 'other'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [errorKind, setErrorKind] = useState<LoginErrorKind | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [resendSent, setResendSent] = useState(false)

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: ({ user, accessToken }) => {
      setAuth(user, accessToken)
      navigate('/dashboard', { replace: true })
    },
    onError: (err: unknown) => {
      if (err instanceof AxiosError) {
        if (err.response?.status === 401) {
          setErrorKind('invalid')
          setErrorMessage('Invalid email or password')
          return
        }
        if (err.response?.status === 403) {
          const message: string = err.response.data?.message ?? ''
          if (/email not verified/i.test(message)) {
            setErrorKind('unverified')
            setErrorMessage('Please verify your email before signing in.')
            return
          }
          if (/locked/i.test(message)) {
            setErrorKind('locked')
            setErrorMessage(message)
            return
          }
        }
      }
      setErrorKind('other')
      setErrorMessage('Something went wrong. Please try again.')
    },
  })

  const resendMutation = useMutation({
    mutationFn: () => resendVerification(getValues('email')),
    onSuccess: () => setResendSent(true),
  })

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back"
      subtitle="Pick up where your team left off."
    >
      <form
        onSubmit={handleSubmit((data) => {
          setErrorKind(null)
          setErrorMessage(null)
          setResendSent(false)
          mutation.mutate(data)
        })}
        className="space-y-4"
        noValidate
      >
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...registerField('email')}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-xs text-red-400" role="alert">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...registerField('password')}
            aria-invalid={!!errors.password}
          />
          {errors.password && (
            <p className="text-xs text-red-400" role="alert">
              {errors.password.message}
            </p>
          )}
        </div>

        {errorMessage && (
          <div
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 space-y-2"
            role="alert"
          >
            <p>{errorMessage}</p>
            {errorKind === 'unverified' && (
              <div>
                {resendSent ? (
                  <p className="text-emerald-300 text-xs">
                    Verification email re-sent. Check your inbox.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => resendMutation.mutate()}
                    disabled={resendMutation.isPending}
                    className="text-xs underline text-accent-glow hover:text-ink"
                  >
                    {resendMutation.isPending ? 'Sending...' : 'Resend verification email'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
          {mutation.isPending ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <div className="text-center text-sm text-ink-muted mt-6 space-y-2">
        <p>
          <Link to="/forgot-password" className="text-accent-glow hover:text-ink transition-colors">
            Forgot your password?
          </Link>
        </p>
        <p>
          No account?{' '}
          <Link to="/register" className="text-accent-glow hover:text-ink transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </AuthShell>
  )
}
