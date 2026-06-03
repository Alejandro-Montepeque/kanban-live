import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { deleteBoard, getBoard, type BoardDetail, type CardData, type ColumnData } from '@/api/boards'
import { deleteColumn, updateColumn } from '@/api/columns'
import { updateCard } from '@/api/cards'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { between } from '@/lib/fractional-index'
import { CardEditorModal } from './CardEditorModal'
import { CreateColumnModal } from './CreateColumnModal'
import { KanbanColumn } from './KanbanColumn'
import { RenameBoardModal } from './RenameBoardModal'

type DragKind = 'card' | 'column' | null

export default function BoardPage() {
  const { id: boardId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [activeCard, setActiveCard] = useState<CardData | null>(null)
  const [activeColumn, setActiveColumn] = useState<ColumnData | null>(null)
  const [editingCard, setEditingCard] = useState<CardData | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [addColumnOpen, setAddColumnOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteColumnTarget, setDeleteColumnTarget] = useState<ColumnData | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const { data, isLoading, isError } = useQuery({
    queryKey: ['board', boardId],
    queryFn: () => getBoard(boardId!),
    enabled: !!boardId,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const moveCardMutation = useMutation({
    mutationFn: ({
      cardId,
      columnId,
      position,
    }: {
      cardId: string
      columnId: string
      position: number
    }) => updateCard(cardId, { columnId, position }),
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
  })

  const moveColumnMutation = useMutation({
    mutationFn: ({ columnId, position }: { columnId: string; position: number }) =>
      updateColumn(columnId, { position }),
    onError: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
    },
  })

  const removeColumnMutation = useMutation({
    mutationFn: (columnId: string) => deleteColumn(columnId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', boardId] })
      setDeleteColumnTarget(null)
    },
  })

  const deleteBoardMutation = useMutation({
    mutationFn: () => deleteBoard(boardId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boards'] })
      if (data) navigate(`/workspaces/${data.workspaceId}`, { replace: true })
    },
  })

  // Close menu on outside click / Escape.
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  function dragKindFor(activeData: Record<string, unknown> | undefined): DragKind {
    if (!activeData) return null
    if (activeData.type === 'card') return 'card'
    if (activeData.type === 'column-item') return 'column'
    return null
  }

  function handleDragStart(event: DragStartEvent) {
    const kind = dragKindFor(event.active.data.current ?? undefined)
    if (kind === 'card') {
      const card = event.active.data.current?.card as CardData | undefined
      if (card) setActiveCard(card)
    } else if (kind === 'column' && data) {
      const col = data.columns.find((c) => c.id === event.active.id)
      if (col) setActiveColumn(col)
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null)
    setActiveColumn(null)
    if (!data) return

    const { active, over } = event
    if (!over) return
    const kind = dragKindFor(active.data.current ?? undefined)

    if (kind === 'column') {
      const overKind = dragKindFor(over.data.current ?? undefined)
      if (overKind !== 'column' || active.id === over.id) return

      const fromIndex = data.columns.findIndex((c) => c.id === active.id)
      const toIndex = data.columns.findIndex((c) => c.id === over.id)
      if (fromIndex === -1 || toIndex === -1) return

      const reordered = [...data.columns]
      const [moved] = reordered.splice(fromIndex, 1)
      reordered.splice(toIndex, 0, moved)

      const before = reordered[toIndex - 1]?.position
      const after = reordered[toIndex + 1]?.position
      const newPosition = between(before, after)
      moved.position = newPosition

      queryClient.setQueryData<BoardDetail>(['board', boardId], (prev) =>
        prev ? { ...prev, columns: reordered } : prev,
      )

      moveColumnMutation.mutate({ columnId: String(active.id), position: newPosition })
      return
    }

    if (kind === 'card') {
      const activeCardId = String(active.id)
      const sourceCard = findCard(data, activeCardId)
      if (!sourceCard) return

      let targetColumnId: string
      let targetIndex: number

      const overData = over.data.current
      if (overData?.type === 'column') {
        targetColumnId = overData.columnId as string
        const target = data.columns.find((c) => c.id === targetColumnId)
        targetIndex = target ? target.cards.length : 0
      } else if (overData?.type === 'card') {
        const overCard = overData.card as CardData
        targetColumnId = overCard.columnId
        const target = data.columns.find((c) => c.id === targetColumnId)
        if (!target) return
        targetIndex = target.cards.findIndex((c) => c.id === overCard.id)
      } else {
        return
      }

      const target = data.columns.find((c) => c.id === targetColumnId)!
      const cardsInTarget = target.cards.filter((c) => c.id !== activeCardId)
      const before = cardsInTarget[targetIndex - 1]?.position
      const after = cardsInTarget[targetIndex]?.position
      const newPosition = between(before, after)

      if (
        sourceCard.columnId === targetColumnId &&
        Math.abs(sourceCard.position - newPosition) < 1e-9
      ) {
        return
      }

      queryClient.setQueryData<BoardDetail>(['board', boardId], (prev) => {
        if (!prev) return prev
        const updatedColumns = prev.columns.map((col) => {
          let cards = col.cards.filter((c) => c.id !== activeCardId)
          if (col.id === targetColumnId) {
            const inserted = { ...sourceCard, columnId: targetColumnId, position: newPosition }
            cards = [...cards, inserted].sort((a, b) => a.position - b.position)
          }
          return { ...col, cards }
        })
        return { ...prev, columns: updatedColumns }
      })

      moveCardMutation.mutate({
        cardId: activeCardId,
        columnId: targetColumnId,
        position: newPosition,
      })
    }
  }

  if (isLoading) {
    return (
      <section className="max-w-7xl mx-auto px-5 py-10">
        <p className="text-ink-muted text-sm">Loading board...</p>
      </section>
    )
  }

  if (isError || !data) {
    return (
      <section className="max-w-7xl mx-auto px-5 py-10">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-300">
          <p>Board not found or you don't have access.</p>
          <Link to="/dashboard" className="text-accent-glow hover:text-ink mt-2 inline-block">
            ← Back to dashboard
          </Link>
        </div>
      </section>
    )
  }

  const isOwner = data.myRole === 'OWNER'

  return (
    <section className="max-w-[1600px] mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <Link
            to={`/workspaces/${data.workspaceId}`}
            className="text-sm text-ink-muted hover:text-ink transition-colors"
          >
            ← Back to workspace
          </Link>
          <div className="flex items-end gap-2 mt-1 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{data.name}</h1>
            <span
              className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md border ${
                isOwner
                  ? 'bg-accent/15 text-accent-glow border-accent/30'
                  : 'bg-bg-surface text-ink-muted border-bg-border'
              }`}
            >
              {data.myRole}
            </span>
          </div>
          <p className="text-xs text-ink-subtle mt-1">
            {data.columnCount} columns · {data.cardCount} cards
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => setAddColumnOpen(true)} variant="subtle">
            + Add column
          </Button>

          <div className="relative" ref={menuRef}>
            <Button
              variant="ghost"
              onClick={() => setMenuOpen((o) => !o)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              className="px-2"
              aria-label="Board actions"
            >
              ⋯
            </Button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 rounded-xl border border-bg-border bg-bg-card shadow-card z-30 overflow-hidden"
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    setRenameOpen(true)
                  }}
                  className="block w-full text-left px-3 py-2 text-sm text-ink hover:bg-bg-surface transition-colors"
                >
                  Rename board
                </button>
                {isOwner ? (
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false)
                      setDeleteOpen(true)
                    }}
                    className="block w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-bg-border"
                  >
                    Delete board
                  </button>
                ) : (
                  <p className="px-3 py-2 text-xs text-ink-subtle border-t border-bg-border">
                    Only the workspace owner can delete this board.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={data.columns.map((c) => c.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {data.columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                boardId={data.id}
                onCardCreated={() =>
                  queryClient.invalidateQueries({ queryKey: ['board', boardId] })
                }
                onCardClicked={(card) => setEditingCard(card)}
                onDeleteColumn={() => setDeleteColumnTarget(column)}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay>
          {activeCard && (
            <div className="rounded-lg border border-accent/40 bg-bg-surface px-3 py-2.5 text-sm shadow-glow w-72">
              <p className="text-ink leading-snug">{activeCard.title}</p>
            </div>
          )}
          {activeColumn && (
            <div className="rounded-xl border border-accent/40 bg-bg-card/95 p-3 w-72 shadow-glow">
              <p className="text-[11px] uppercase tracking-wider font-semibold text-ink-muted">
                {activeColumn.name}
              </p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <CardEditorModal
        card={editingCard}
        onClose={() => setEditingCard(null)}
        onUpdated={() => queryClient.invalidateQueries({ queryKey: ['board', boardId] })}
        onDeleted={() => queryClient.invalidateQueries({ queryKey: ['board', boardId] })}
      />

      <RenameBoardModal
        open={renameOpen}
        onClose={() => setRenameOpen(false)}
        boardId={data.id}
        currentName={data.name}
      />

      <CreateColumnModal
        open={addColumnOpen}
        onClose={() => setAddColumnOpen(false)}
        boardId={data.id}
      />

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteBoardMutation.mutate()}
        title={`Delete "${data.name}"?`}
        description="This removes all columns and cards inside this board. The action cannot be undone."
        confirmLabel="Delete board"
        variant="danger"
        isPending={deleteBoardMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteColumnTarget}
        onClose={() => setDeleteColumnTarget(null)}
        onConfirm={() =>
          deleteColumnTarget && removeColumnMutation.mutate(deleteColumnTarget.id)
        }
        title={`Delete column "${deleteColumnTarget?.name ?? ''}"?`}
        description="All cards in this column will be deleted with it. This cannot be undone."
        confirmLabel="Delete column"
        variant="danger"
        isPending={removeColumnMutation.isPending}
      />
    </section>
  )
}

function findCard(board: BoardDetail, cardId: string): CardData | undefined {
  for (const col of board.columns) {
    const found = col.cards.find((c) => c.id === cardId)
    if (found) return found
  }
  return undefined
}
