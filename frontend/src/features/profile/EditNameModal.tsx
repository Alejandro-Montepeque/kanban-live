import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { updateProfile } from '@/api/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { useAuthStore } from '@/stores/auth'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80, 'Too long'),
})
type FormInput = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  currentName: string
}

export function EditNameModal({ open, onClose, currentName }: Props) {
  const queryClient = useQueryClient()
  const setAuth = useAuthStore((s) => s.setAuth)
  const accessToken = useAuthStore((s) => s.accessToken)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) reset({ name: currentName })
  }, [open, currentName, reset])

  const mutation = useMutation({
    mutationFn: ({ name }: FormInput) => updateProfile(name),
    onSuccess: (user) => {
      if (accessToken) setAuth(user, accessToken)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
      onClose()
    },
  })

  return (
    <Modal open={open} onClose={onClose} title="Edit name">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="edit-name">Display name</Label>
          <Input id="edit-name" autoFocus {...register('name')} aria-invalid={!!errors.name} />
          {errors.name && (
            <p className="text-xs text-red-400" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting || mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
