import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { createWorkspace } from '@/api/workspaces'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'
import { createWorkspaceSchema, type CreateWorkspaceInput } from './schemas'

interface Props {
  open: boolean
  onClose: () => void
}

export function CreateWorkspaceModal({ open, onClose }: Props) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateWorkspaceInput>({ resolver: zodResolver(createWorkspaceSchema) })

  // Reset the form whenever the modal opens fresh.
  useEffect(() => {
    if (open) reset({ name: '' })
  }, [open, reset])

  const mutation = useMutation({
    mutationFn: (input: CreateWorkspaceInput) => createWorkspace(input.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      onClose()
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create workspace"
      description="A workspace groups your boards and members."
    >
      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="space-y-4"
        noValidate
      >
        <div className="space-y-1.5">
          <Label htmlFor="workspace-name">Name</Label>
          <Input
            id="workspace-name"
            autoFocus
            placeholder="Engineering, Personal, Side Project..."
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
            {mutation.isPending ? 'Creating...' : 'Create workspace'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
