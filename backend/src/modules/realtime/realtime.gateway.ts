import { Logger, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets'
import { Server, Socket } from 'socket.io'

import { MembershipChecker } from '../../common/membership-checker'
import { PrismaService } from '../../prisma/prisma.service'
import type { JwtPayload } from '../auth/types/jwt-payload'
import { RealtimeService } from './realtime.service'
import type {
  ClientToServerEvents,
  PresenceUser,
  ServerToClientEvents,
} from './types/socket-events'

interface SocketData {
  userId: string
  email: string
  name: string
  currentBoardId?: string
}

@WebSocketGateway({
  cors: { origin: true, credentials: true },
  // Path stays at the default /socket.io so the client can connect with default settings.
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(RealtimeGateway.name)

  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents, object, SocketData>

  constructor(
    private readonly realtime: RealtimeService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly membership: MembershipChecker,
  ) {}

  onModuleInit(): void {
    this.realtime.setServer(this.server)
  }

  async handleConnection(client: Socket): Promise<void> {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      this.tokenFromHeader(client.handshake.headers.authorization)

    if (!token) {
      client.emit('error', 'Missing auth token')
      client.disconnect(true)
      return
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      })
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true },
      })
      if (!user) throw new Error('User not found')

      client.data.userId = user.id
      client.data.email = user.email
      client.data.name = user.name
      this.logger.log(`Socket connected: ${user.email} (${client.id})`)
    } catch {
      client.emit('error', 'Invalid token')
      client.disconnect(true)
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    if (client.data.currentBoardId) {
      await this.leaveBoardRoom(client, client.data.currentBoardId)
    }
  }

  @SubscribeMessage('board:join')
  async onBoardJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() boardId: string,
  ): Promise<{ ok: boolean }> {
    if (!boardId || !client.data.userId) return { ok: false }

    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { workspaceId: true },
    })
    if (!board) {
      client.emit('error', 'Board not found')
      return { ok: false }
    }

    try {
      await this.membership.requireMembership(board.workspaceId, client.data.userId)
    } catch {
      client.emit('error', 'Not a member of this workspace')
      return { ok: false }
    }

    // Leave previous board (if any) before joining the new one.
    if (client.data.currentBoardId && client.data.currentBoardId !== boardId) {
      await this.leaveBoardRoom(client, client.data.currentBoardId)
    }

    const room = RealtimeService.roomFor(boardId)
    await client.join(room)
    client.data.currentBoardId = boardId

    // Send the current presence list to the joining client.
    const presentSockets = await this.server.in(room).fetchSockets()
    const users: PresenceUser[] = uniqueByUserId(
      presentSockets.map((s) => ({
        userId: (s.data as SocketData).userId,
        name: (s.data as SocketData).name,
      })),
    )
    client.emit('presence:list', users)

    // Notify everyone else that this user just joined.
    const me: PresenceUser = { userId: client.data.userId, name: client.data.name }
    client.to(room).emit('presence:joined', me)

    return { ok: true }
  }

  @SubscribeMessage('board:leave')
  async onBoardLeave(
    @ConnectedSocket() client: Socket,
    @MessageBody() boardId: string,
  ): Promise<void> {
    if (boardId) await this.leaveBoardRoom(client, boardId)
  }

  private async leaveBoardRoom(client: Socket, boardId: string): Promise<void> {
    const room = RealtimeService.roomFor(boardId)
    await client.leave(room)
    if (client.data.currentBoardId === boardId) {
      client.data.currentBoardId = undefined
    }
    if (client.data.userId) {
      const me: PresenceUser = {
        userId: client.data.userId,
        name: client.data.name ?? '',
      }
      // Only emit "left" if no OTHER socket of this user is still in the room.
      const remaining = await this.server.in(room).fetchSockets()
      const stillThere = remaining.some(
        (s) => (s.data as SocketData).userId === client.data.userId,
      )
      if (!stillThere) {
        this.server.to(room).emit('presence:left', me)
      }
    }
  }

  private tokenFromHeader(header?: string): string | undefined {
    if (!header?.startsWith('Bearer ')) return undefined
    return header.slice(7)
  }
}

function uniqueByUserId(users: PresenceUser[]): PresenceUser[] {
  const seen = new Set<string>()
  const out: PresenceUser[] = []
  for (const u of users) {
    if (!seen.has(u.userId)) {
      seen.add(u.userId)
      out.push(u)
    }
  }
  return out
}
