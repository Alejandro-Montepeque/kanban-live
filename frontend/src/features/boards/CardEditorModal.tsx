import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import type { CardData } from '@/api/boards'
import { deleteCard, updateCard } from '@/api/cards'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Modal } from '@/components/ui/Modal'

interface Props {
  card: CardData | null
  onClose: () => void
  onUpdated: (card: CardData) => void
  onDeleted: (cardId: string) => void
}

export function CardEditorModal({ card, onClose, onUpdated, onDeleted }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  useEffect(() => {
    if (card) {
      setTitle(card.title)
      setDescription(card.description ?? '')
    }
  }, [card])

  const update = useMutation({
    mutationFn: () =>
      updateCard(card!.id, {
        title: title.trim(),
        description: description.trim() || undefined,
      }),
    onSuccess: (updated) => {
      onUpdated(updated)
      onClose()
    },
  })

  const remove = useMutation({
    mutationFn: () => deleteCard(card!.id),
    onSuccess: () => {
      onDeleted(card!.id)
      setDeleteOpen(false)
      onClose()
    },
  })

  return (
    <>
      <Modal
        open={!!card}
        onClose={onClose}
        title="Edit card"
        description="Update title and description. Changes save when you click 'Save'."
      >
        {card && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (title.trim()) update.mutate()
            }}
            className="space-y-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="card-title">Title</Label>
              <Input
                id="card-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="card-description">Description (optional)</Label>
              <textarea
                id="card-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more context, links, acceptance criteria..."
                rows={5}
                className="w-full rounded-lg border border-bg-border bg-bg-surface/60 backdrop-blur-sm px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-subtle focus-visible:outline-none focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/30 resize-none"
              />
            </div>

            {(update.isError || remove.isError) && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                Something went wrong. Please try again.
              </div>
            )}

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeleteOpen(true)}
                disabled={remove.isPending}
                className="text-red-400 hover:text-red-300"
              >
                Delete
              </Button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={update.isPending || !title.trim()}>
                  {update.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => remove.mutate()}
        title={card ? `Delete card "${card.title}"?` : 'Delete card?'}
        description="This card and its content will be removed permanently."
        confirmLabel="Delete card"
        variant="danger"
        isPending={remove.isPending}
      />
    </>
  )
}
