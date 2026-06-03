// Contract between server and clients for realtime board events.

export interface CardPayload {
  id: string
  title: string
  description: string | null
  position: number
  columnId: string
  dueDate: string | null
  authorId: string
  assigneeId: string | null
  createdAt: string
  updatedAt: string
}

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
  'card:created': (payload: CardPayload) => void
  'card:updated': (payload: CardPayload) => void
  'card:deleted': (payload: { id: string; columnId: string }) => void

  'column:created': (payload: ColumnPayload) => void
  'column:updated': (payload: ColumnPayload) => void
  'column:deleted': (payload: { id: string; boardId: string }) => void

  'presence:list': (users: PresenceUser[]) => void
  'presence:joined': (user: PresenceUser) => void
  'presence:left': (user: PresenceUser) => void

  error: (msg: string) => void
}

export interface ClientToServerEvents {
  'board:join': (boardId: string, ack?: (ok: boolean) => void) => void
  'board:leave': (boardId: string) => void
}
