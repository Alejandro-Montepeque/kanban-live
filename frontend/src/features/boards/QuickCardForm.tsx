import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'

import type { CardData } from '@/api/boards'
import { createCard } from '@/api/cards'
import { Button } from '@/components/ui/Button'

interface Props {
  columnId: string
  onCancel: () => void
  onCreated: (card: CardData) => void
}

export function QuickCardForm({ columnId, onCancel, onCreated }: Props) {
  const [title, setTitle] = useState('')

  const mutation = useMutation({
    mutationFn: () => createCard(columnId, { title: title.trim() }),
    onSuccess: (card) => {
      onCreated(card)
      setTitle('')
    },
  })

  const submit = () => {
    const t = title.trim()
    if (!t) return
    mutation.mutate()
  }

  return (
    <div className="mt-2 space-y-2">
      <textarea
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            submit()
          }
          if (e.key === 'Escape') onCancel()
        }}
        autoFocus
        placeholder="Card title (Enter to save, Escape to cancel)"
        className="w-full rounded-lg border border-bg-border bg-bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-subtle focus-visible:outline-none focus-visible:border-accent/60 focus-visible:ring-2 focus-visible:ring-accent/30 resize-none"
        rows={2}
      />
      <div className="flex items-center gap-2">
        <Button onClick={submit} disabled={mutation.isPending || title.trim().length === 0}>
          {mutation.isPending ? 'Adding...' : 'Add card'}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
