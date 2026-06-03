import { useDroppable } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'

import type { CardData, ColumnData } from '@/api/boards'
import { updateColumn } from '@/api/columns'
import { Button } from '@/components/ui/Button'
import { KanbanCard } from './KanbanCard'
import { QuickCardForm } from './QuickCardForm'

interface Props {
  column: ColumnData
  boardId: string
  onCardCreated: (card: CardData) => void
  onCardClicked: (card: CardData) => void
  onDeleteColumn: (columnId: string) => void
}

export function KanbanColumn({
  column,
  boardId,
  onCardCreated,
  onCardClicked,
  onDeleteColumn,
}: Props) {
  const queryClient = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState(column.name)
  const inputRef = useRef<HTMLInputElement>(null)

  // Column is sortable (drag the whole column to reorder).
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: { type: 'column-item', columnId: column.id },
  })

  // Separate droppable for receiving card drops — different id to avoid collisions.
  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `column-drop-${column.id}`,
    data: { type: 'column', columnId: column.id },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  useEffect(() => {
    if (renaming) {
      setNameDraft(column.name)
      requestAnimationFrame(() => inputRef.current?.select())
    }
  }, [renaming, column.name])

  const renameMutation = useMutation({
    mutationFn: (name: string) => updateColumn(column.id, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      setRenaming(false)
    },
  })

  function commitRename() {
    const trimmed = nameDraft.trim()
    if (!trimmed || trimmed === column.name) {
      setRenaming(false)
      return
    }
    renameMutation.mutate(trimmed)
  }

  return (
    <div
      ref={setSortableRef}
      style={style}
      className={`flex flex-col rounded-xl border bg-bg-card/60 w-72 shrink-0 max-h-[calc(100vh-220px)] ${
        isOver ? 'border-accent/60 bg-accent/5' : 'border-bg-border'
      }`}
    >
      {/* Header acts as drag handle. */}
      <header
        className="flex items-center justify-between p-3 cursor-grab active:cursor-grabbing select-none"
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {renaming ? (
            <input
              ref={inputRef}
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  commitRename()
                }
                if (e.key === 'Escape') {
                  e.preventDefault()
                  setRenaming(false)
                }
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="w-full bg-bg-surface border border-bg-border rounded px-1.5 py-0.5 text-[11px] uppercase tracking-wider font-semibold text-ink focus:outline-none focus:border-accent/60"
              aria-label={`Rename column ${column.name}`}
            />
          ) : (
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onDoubleClick={() => setRenaming(true)}
              className="text-[11px] uppercase tracking-wider font-semibold text-ink-muted hover:text-ink transition-colors truncate text-left"
              title="Double-click to rename"
            >
              {column.name}
            </button>
          )}
          <span className="text-[10px] font-mono text-ink-subtle shrink-0">
            {column.cards.length}
          </span>
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onDeleteColumn(column.id)}
          className="text-[11px] text-ink-subtle hover:text-red-400 transition-colors px-1"
          aria-label={`Delete column ${column.name}`}
        >
          ✕
        </button>
      </header>

      <div ref={setDroppableRef} className="flex-1 overflow-y-auto -mx-1 px-1 pb-1">
        <SortableContext
          items={column.cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 px-2">
            {column.cards.map((card) => (
              <KanbanCard key={card.id} card={card} onOpen={() => onCardClicked(card)} />
            ))}
            {column.cards.length === 0 && !adding && (
              <p className="text-xs text-ink-subtle text-center py-4">
                Drop a card here or use + below
              </p>
            )}
          </div>
        </SortableContext>
      </div>

      <div className="p-2">
        {adding ? (
          <QuickCardForm
            columnId={column.id}
            onCancel={() => setAdding(false)}
            onCreated={(card) => {
              onCardCreated(card)
              setAdding(false)
            }}
          />
        ) : (
          <Button
            variant="ghost"
            onClick={() => setAdding(true)}
            className="w-full justify-start text-ink-muted hover:text-ink"
          >
            + Add card
          </Button>
        )}
      </div>
    </div>
  )
}
