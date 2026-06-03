import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'

import { forgotPassword } from '@/api/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { AuthShell } from './AuthShell'
import { forgotPasswordSchema, type ForgotPasswordInput } from './schemas'

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false)

  const {
    register: registerField,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) })

  const mutation = useMutation({
    mutationFn: (input: ForgotPasswordInput) => forgotPassword(input.email),
    onSuccess: () => setSubmitted(true),
    // We always show the same UI regardless of whether the email exists,
    // to mirror the backend's "no user enumeration" behavior.
    onError: () => setSubmitted(true),
  })

  if (submitted) {
    return (
      <AuthShell
        eyebrow="Password reset"
        title="Check your inbox"
        subtitle="If an account exists for the email you provided, we just sent reset instructions."
      >
        <div className="rounded-lg border border-bg-border bg-bg-surface/60 p-4 text-sm text-ink-muted">
          <p className="mb-2">
            We sent an email to <span className="text-ink">{getValues('email')}</span>.
          </p>
          <p>
            The link inside expires in 60 minutes and can only be used once. If you don't see it, check your spam folder.
          </p>
        </div>
        <p className="text-center text-sm text-ink-muted mt-6">
          <Link to="/login" className="text-accent-glow hover:text-ink transition-colors">
            Back to sign in
          </Link>
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Password reset"
      title="Forgot your password?"
      subtitle="Enter your email and we'll send you a link to set a new one."
    >
      <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4" noValidate>
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

        <Button type="submit" className="w-full" disabled={isSubmitting || mutation.isPending}>
          {mutation.isPending ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>

      <p className="text-center text-sm text-ink-muted mt-6">
        Remembered it?{' '}
        <Link to="/login" className="text-accent-glow hover:text-ink transition-colors">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  )
}
