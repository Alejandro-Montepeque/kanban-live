import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { createColumn } from '@/api/columns'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'

const schema = z.object({
  name: z.string().min(1, 'Column name is required').max(60, 'Too long'),
})
type FormInput = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  boardId: string
}

export function CreateColumnModal({ open, onClose, boardId }: Props) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormInput>({ resolver: zodResolver(schema) })

  useEffect(() => {
    if (open) reset({ name: '' })
  }, [open, reset])

  const mutation = useMutation({
    mutationFn: ({ name }: FormInput) => createColumn(boardId, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      onClose()
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add column"
      description="Columns hold cards. Common ones are To do, In progress, Review, Done."
    >
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="column-name">Column name</Label>
          <Input
            id="column-name"
            autoFocus
            placeholder="Review, Blocked, Ideas..."
            {...register('name')}
            aria-invalid={!!errors.name}
          />
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
            {mutation.isPending ? 'Adding...' : 'Add column'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
