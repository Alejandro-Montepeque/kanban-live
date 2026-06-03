import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { changePassword } from '@/api/auth'
import { disconnectSocket } from '@/api/socket'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/stores/auth'

const schema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'At least 8 characters')
    .max(128, 'Too long')
    .regex(/[A-Z]/, 'Must include an uppercase letter')
    .regex(/[a-z]/, 'Must include a lowercase letter')
    .regex(/\d/, 'Must include a number'),
})
type FormInput = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
}

export function ChangePasswordModal({ open, onClose }: Props) {
  const navigate = useNavigate()
  const clear = useAuthStore((s) => s.clear)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormInput>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) reset({ currentPassword: '', newPassword: '' })
  }, [open, reset])

  const mutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      // The backend revoked all sessions; force a fresh login.
      disconnectSocket()
      clear()
      onClose()
      navigate('/login', { replace: true })
    },
    onError: (err: unknown) => {
      if (err instanceof AxiosError && err.response?.status === 401) {
        setError('currentPassword', { message: 'Current password is incorrect' })
      }
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Change password"
      description="All sessions will be signed out after change. You'll need to log in again."
    >
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="current-password">Current password</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            {...register('currentPassword')}
            aria-invalid={!!errors.currentPassword}
          />
          {errors.currentPassword && (
            <p className="text-xs text-red-400" role="alert">
              {errors.currentPassword.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-password">New password</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 chars, mixed case, with a number"
            {...register('newPassword')}
            aria-invalid={!!errors.newPassword}
          />
          {errors.newPassword && (
            <p className="text-xs text-red-400" role="alert">
              {errors.newPassword.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || mutation.isPending}>
            {mutation.isPending ? 'Changing...' : 'Change password'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
