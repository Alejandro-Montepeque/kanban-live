import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import type { CardData } from '@/api/boards'
import { cn } from '@/lib/cn'

interface Props {
  card: CardData
  onOpen: () => void
}

export function KanbanCard({ card, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', card },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onDoubleClick={onOpen}
      className={cn(
        'group rounded-lg border border-bg-border bg-bg-surface/90 px-3 py-2.5 text-sm cursor-grab active:cursor-grabbing shadow-card',
        'hover:border-accent/40 transition-colors',
        isDragging && 'opacity-50',
      )}
      {...attributes}
      {...listeners}
    >
      <p className="text-ink leading-snug">{card.title}</p>
      {card.description && (
        <p className="text-[11px] text-ink-muted mt-1 line-clamp-2">{card.description}</p>
      )}
    </div>
  )
}
