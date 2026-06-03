import type { CardData } from './boards'

export interface ColumnPayload {
  id: string
  name: string
  position: number
  boardId: string
}

export interface PresenceUser {
  userId: string
  name: string
}

export interface ServerToClientEvents {
  'card:created': (card: CardData) => void
  'card:updated': (card: CardData) => void
  'card:deleted': (payload: { id: string; columnId: string }) => void

  'column:created': (column: ColumnPayload) => void
  'column:updated': (column: ColumnPayload) => void
  'column:deleted': (payload: { id: string; boardId: string }) => void

  'presence:list': (users: PresenceUser[]) => void
  'presence:joined': (user: PresenceUser) => void
  'presence:left': (user: PresenceUser) => void

  error: (msg: string) => void
}

export interface ClientToServerEvents {
  'board:join': (boardId: string, ack?: (result: { ok: boolean }) => void) => void
  'board:leave': (boardId: string) => void
}
