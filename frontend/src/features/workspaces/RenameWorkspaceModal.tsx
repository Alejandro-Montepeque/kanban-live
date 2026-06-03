import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { updateWorkspace } from '@/api/workspaces'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'

const schema = z.object({
  name: z.string().min(1, 'Name is required').max(80, 'Too long'),
})
type FormInput = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  workspaceId: string
  currentName: string
}

export function RenameWorkspaceModal({ open, onClose, workspaceId, currentName }: Props) {
  const queryClient = useQueryClient()

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
    mutationFn: ({ name }: FormInput) => updateWorkspace(workspaceId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] })
      onClose()
    },
  })

  return (
    <Modal open={open} onClose={onClose} title="Rename workspace">
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="rename-workspace">Workspace name</Label>
          <Input
            id="rename-workspace"
            autoFocus
            {...register('name')}
            aria-invalid={!!errors.name}
          />
          {errors.name && (
            <p className="text-xs text-red-400" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

        {mutation.isError && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            Something went wrong. Please try again.
          </div>
        )}

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
