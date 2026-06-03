import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import type { BoardDetail, CardData, ColumnData } from '@/api/boards'
import { getSocket } from '@/api/socket'
import type { ColumnPayload, PresenceUser } from '@/api/socket-events'

interface UseBoardSocketResult {
  connected: boolean
  presence: PresenceUser[]
}

export function useBoardSocket(boardId: string | undefined): UseBoardSocketResult {
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)
  const [presence, setPresence] = useState<PresenceUser[]>([])

  useEffect(() => {
    if (!boardId) return

    const socket = getSocket()
    const queryKey = ['board', boardId]

    const onConnect = () => {
      setConnected(true)
      socket.emit('board:join', boardId)
    }
    const onDisconnect = () => setConnected(false)

    const onCardCreated = (card: CardData) => {
      queryClient.setQueryData<BoardDetail>(queryKey, (prev) => {
        if (!prev) return prev
        return {
          ...prev,
          columns: prev.columns.map((c) =>
            c.id === card.columnId
              ? { ...c, cards: insertSorted(c.cards, card) }
              : c,
          ),
        }
      })
    }

    const onCardUpdated = (card: CardData) => {
      queryClient.setQueryData<BoardDetail>(queryKey, (prev) => {
        if (!prev) return prev
        let removed: CardData | undefined
        const withRemoved = prev.columns.map((col) => {
          const found = col.cards.find((c) => c.id === card.id)
          if (found && !removed) removed = found
          return { ...col, cards: col.cards.filter((c) => c.id !== card.id) }
        })
        return {
          ...prev,
          columns: withRemoved.map((col) =>
            col.id === card.columnId
              ? { ...col, cards: insertSorted(col.cards, card) }
              : col,
          ),
        }
      })
    }

    const onCardDeleted = (payload: { id: string; columnId: string }) => {
      queryClient.setQueryData<BoardDetail>(queryKey, (prev) => {
        if (!prev) return prev
        return {
          ...prev,
          columns: prev.columns.map((col) =>
            col.id === payload.columnId
              ? { ...col, cards: col.cards.filter((c) => c.id !== payload.id) }
              : col,
          ),
        }
      })
    }

    const onColumnCreated = (column: ColumnPayload) => {
      queryClient.setQueryData<BoardDetail>(queryKey, (prev) => {
        if (!prev) return prev
        if (prev.columns.some((c) => c.id === column.id)) return prev
        const newCol: ColumnData = { ...column, cards: [] }
        const columns = [...prev.columns, newCol].sort((a, b) => a.position - b.position)
        return { ...prev, columns, columnCount: columns.length }
      })
    }

    const onColumnUpdated = (column: ColumnPayload) => {
      queryClient.setQueryData<BoardDetail>(queryKey, (prev) => {
        if (!prev) return prev
        const columns = prev.columns
          .map((c) =>
            c.id === column.id ? { ...c, name: column.name, position: column.position } : c,
          )
          .sort((a, b) => a.position - b.position)
        return { ...prev, columns }
      })
    }

    const onColumnDeleted = (payload: { id: string }) => {
      queryClient.setQueryData<BoardDetail>(queryKey, (prev) => {
        if (!prev) return prev
        const columns = prev.columns.filter((c) => c.id !== payload.id)
        return { ...prev, columns, columnCount: columns.length }
      })
    }

    const onPresenceList = (users: PresenceUser[]) => setPresence(users)
    const onPresenceJoined = (user: PresenceUser) =>
      setPresence((prev) => (prev.some((p) => p.userId === user.userId) ? prev : [...prev, user]))
    const onPresenceLeft = (user: PresenceUser) =>
      setPresence((prev) => prev.filter((p) => p.userId !== user.userId))

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('card:created', onCardCreated)
    socket.on('card:updated', onCardUpdated)
    socket.on('card:deleted', onCardDeleted)
    socket.on('column:created', onColumnCreated)
    socket.on('column:updated', onColumnUpdated)
    socket.on('column:deleted', onColumnDeleted)
    socket.on('presence:list', onPresenceList)
    socket.on('presence:joined', onPresenceJoined)
    socket.on('presence:left', onPresenceLeft)

    if (socket.connected) onConnect()

    return () => {
      socket.emit('board:leave', boardId)
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('card:created', onCardCreated)
      socket.off('card:updated', onCardUpdated)
      socket.off('card:deleted', onCardDeleted)
      socket.off('column:created', onColumnCreated)
      socket.off('column:updated', onColumnUpdated)
      socket.off('column:deleted', onColumnDeleted)
      socket.off('presence:list', onPresenceList)
      socket.off('presence:joined', onPresenceJoined)
      socket.off('presence:left', onPresenceLeft)
      setPresence([])
    }
  }, [boardId, queryClient])

  return { connected, presence }
}

function insertSorted(cards: CardData[], card: CardData): CardData[] {
  const withoutDuplicate = cards.filter((c) => c.id !== card.id)
  return [...withoutDuplicate, card].sort((a, b) => a.position - b.position)
}
