import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { resetPassword } from '@/api/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { AuthShell } from './AuthShell'
import { resetPasswordSchema, type ResetPasswordInput } from './schemas'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')
  const [serverError, setServerError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) })

  const mutation = useMutation({
    mutationFn: ({ password }: ResetPasswordInput) =>
      resetPassword({ token: token ?? '', password }),
    onSuccess: () => {
      setSuccess(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    },
    onError: (err: unknown) => {
      if (err instanceof AxiosError && err.response?.status === 401) {
        setServerError(
          'This reset link is invalid or has expired. Request a new one from the login page.',
        )
      } else {
        setServerError('Something went wrong. Please try again.')
      }
    },
  })

  if (!token) {
    return (
      <AuthShell
        eyebrow="Password reset"
        title="Missing reset token"
        subtitle="This page should be opened from the link sent to your email."
      >
        <p className="text-center text-sm text-ink-muted">
          <Link to="/forgot-password" className="text-accent-glow hover:text-ink transition-colors">
            Request a new reset link
          </Link>
        </p>
      </AuthShell>
    )
  }

  if (success) {
    return (
      <AuthShell
        eyebrow="Password reset"
        title="Password updated"
        subtitle="Your new password is active. Redirecting to sign in..."
      >
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 text-center">
          All sessions have been revoked. Please sign in with your new password.
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Password reset"
      title="Set a new password"
      subtitle="Choose a strong password. All your existing sessions will be revoked."
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
          <Label htmlFor="password">New password</Label>
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
          {mutation.isPending ? 'Updating...' : 'Update password'}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-muted mt-6">
        <Link to="/login" className="text-accent-glow hover:text-ink transition-colors">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  )
}
