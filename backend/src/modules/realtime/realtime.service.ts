import { Injectable, Logger } from '@nestjs/common'
import type { Server } from 'socket.io'

import type {
  CardPayload,
  ColumnPayload,
  ServerToClientEvents,
} from './types/socket-events'

// Decoupled emitter: other services call this instead of importing socket.io.
@Injectable()
export class RealtimeService {
  private readonly logger = new Logger(RealtimeService.name)
  private server: Server | null = null

  setServer(server: Server): void {
    this.server = server
  }

  static roomFor(boardId: string): string {
    return `board:${boardId}`
  }

  emitCardCreated(boardId: string, card: CardPayload, exceptSocketId?: string): void {
    this.emit(boardId, 'card:created', card, exceptSocketId)
  }

  emitCardUpdated(boardId: string, card: CardPayload, exceptSocketId?: string): void {
    this.emit(boardId, 'card:updated', card, exceptSocketId)
  }

  emitCardDeleted(boardId: string, payload: { id: string; columnId: string }, exceptSocketId?: string): void {
    this.emit(boardId, 'card:deleted', payload, exceptSocketId)
  }

  emitColumnCreated(boardId: string, column: ColumnPayload, exceptSocketId?: string): void {
    this.emit(boardId, 'column:created', column, exceptSocketId)
  }

  emitColumnUpdated(boardId: string, column: ColumnPayload, exceptSocketId?: string): void {
    this.emit(boardId, 'column:updated', column, exceptSocketId)
  }

  emitColumnDeleted(boardId: string, payload: { id: string; boardId: string }, exceptSocketId?: string): void {
    this.emit(boardId, 'column:deleted', payload, exceptSocketId)
  }

  private emit<E extends keyof ServerToClientEvents>(
    boardId: string,
    event: E,
    payload: Parameters<ServerToClientEvents[E]>[0],
    exceptSocketId?: string,
  ): void {
    if (!this.server) {
      this.logger.warn(`Server not initialised yet; dropping ${event} for board ${boardId}`)
      return
    }
    const room = RealtimeService.roomFor(boardId)
    if (exceptSocketId) {
      this.server.to(room).except(exceptSocketId).emit(event as string, payload)
    } else {
      this.server.to(room).emit(event as string, payload)
    }
  }
}
