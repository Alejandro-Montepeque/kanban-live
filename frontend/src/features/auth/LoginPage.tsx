import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'

import { login } from '@/api/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { useAuthStore } from '@/stores/auth'
import { AuthShell } from './AuthShell'
import { loginSchema, type LoginInput } from './schemas'

export default function LoginPage() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) })

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: ({ user, accessToken }) => {
      setAuth(user, accessToken)
      navigate('/dashboard', { replace: true })
    },
    onError: (err: unknown) => {
      if (err instanceof AxiosError && err.response?.status === 401) {
        setServerError('Invalid email or password')
      } else {
        setServerError('Something went wrong. Please try again.')
      }
    },
  })

  const onSubmit = (data: LoginInput) => {
    setServerError(null)
    mutation.mutate(data)
  }

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back"
      subtitle="Pick up where your team left off."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
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

        {serverError && (
          <div
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            role="alert"
          >
            {serverError}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
          {mutation.isPending ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-muted mt-6">
        No account?{' '}
        <Link to="/register" className="text-accent-glow hover:text-ink transition-colors">
          Create one
        </Link>
      </p>
    </AuthShell>
  )
}
