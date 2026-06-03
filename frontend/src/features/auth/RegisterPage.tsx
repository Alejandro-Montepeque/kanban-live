import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { register as registerApi, resendVerification } from '@/api/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { AuthShell } from './AuthShell'
import { registerSchema, type RegisterInput } from './schemas'

export default function RegisterPage() {
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sent'>('idle')

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) })

  const mutation = useMutation({
    mutationFn: registerApi,
    onSuccess: (_data, variables) => {
      // No tokens issued — the server now requires email verification.
      setRegisteredEmail(variables.email)
    },
    onError: (err: unknown) => {
      if (err instanceof AxiosError && err.response?.status === 409) {
        setServerError('That email is already registered')
      } else {
        setServerError('Something went wrong. Please try again.')
      }
    },
  })

  const resendMutation = useMutation({
    mutationFn: () => resendVerification(registeredEmail ?? ''),
    onSuccess: () => setResendStatus('sent'),
  })

  if (registeredEmail) {
    return (
      <AuthShell
        eyebrow="Verify your email"
        title="One last step"
        subtitle="We sent you a verification link. Click it to activate your account."
      >
        <div className="rounded-lg border border-bg-border bg-bg-surface/60 p-4 text-sm text-ink-muted space-y-2">
          <p>
            Email sent to <span className="text-ink">{registeredEmail}</span>.
          </p>
          <p>
            The link expires in 24 hours. After clicking it, you'll be able to sign in normally.
          </p>
        </div>

        <div className="mt-6 space-y-3 text-center">
          {resendStatus === 'sent' ? (
            <p className="text-sm text-emerald-300">A new verification email is on its way.</p>
          ) : (
            <Button
              type="button"
              variant="subtle"
              className="w-full"
              onClick={() => resendMutation.mutate()}
              disabled={resendMutation.isPending}
            >
              {resendMutation.isPending ? 'Sending...' : 'Resend verification email'}
            </Button>
          )}
          <p className="text-sm text-ink-muted">
            Already verified?{' '}
            <Link to="/login" className="text-accent-glow hover:text-ink transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Create account"
      title="Build a board in 30 seconds"
      subtitle="Free for personal projects. No credit card."
    >
      <form
        onSubmit={handleSubmit((data) => {
          setServerError(null)
          mutation.mutate(data)
        })}
        className="space-y-4"
        noValidate
      >
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Alex Tester"
            {...registerField('name')}
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p className="text-xs text-red-400" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

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
            autoComplete="new-password"
            placeholder="At least 8 characters, mixed case, with a number"
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
          {mutation.isPending ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-muted mt-6">
        Already have an account?{' '}
        <Link to="/login" className="text-accent-glow hover:text-ink transition-colors">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
