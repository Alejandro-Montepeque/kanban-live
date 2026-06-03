import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { createBoard } from '@/api/boards'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'

const schema = z.object({
  name: z.string().min(1, 'Board name is required').max(80, 'Too long'),
})
type FormInput = z.infer<typeof schema>

interface Props {
  open: boolean
  onClose: () => void
  workspaceId: string
}

export function CreateBoardModal({ open, onClose, workspaceId }: Props) {
  const navigate = useNavigate()
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
    mutationFn: ({ name }: FormInput) => createBoard(workspaceId, name),
    onSuccess: (board) => {
      queryClient.invalidateQueries({ queryKey: ['boards', workspaceId] })
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] })
      onClose()
      navigate(`/boards/${board.id}`)
    },
  })

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create board"
      description="A new board starts with three default columns: Backlog, In progress, Done."
    >
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="board-name">Board name</Label>
          <Input
            id="board-name"
            autoFocus
            placeholder="Sprint 4, Roadmap Q2, Personal..."
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
            {mutation.isPending ? 'Creating...' : 'Create board'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
