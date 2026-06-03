import { Injectable, NotFoundException } from '@nestjs/common'
import type { Column } from '@prisma/client'

import { FractionalIndex } from '../../common/fractional-index'
import { MembershipChecker } from '../../common/membership-checker'
import { PrismaService } from '../../prisma/prisma.service'
import { RealtimeService } from '../realtime/realtime.service'
import type { ColumnPayload } from '../realtime/types/socket-events'
import { CreateColumnDto } from './dto/create-column.dto'
import { UpdateColumnDto } from './dto/update-column.dto'

function toPayload(column: Column): ColumnPayload {
  return {
    id: column.id,
    name: column.name,
    position: column.position,
    boardId: column.boardId,
  }
}

@Injectable()
export class ColumnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipChecker,
    private readonly realtime: RealtimeService,
  ) {}

  async create(boardId: string, userId: string, dto: CreateColumnDto) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { workspaceId: true },
    })
    if (!board) throw new NotFoundException('Board not found')
    await this.membership.requireMembership(board.workspaceId, userId)

    const lastColumn = await this.prisma.column.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
      select: { position: true },
    })
    const position = FractionalIndex.between(lastColumn?.position, undefined)

    const column = await this.prisma.column.create({
      data: { name: dto.name, position, boardId },
    })

    this.realtime.emitColumnCreated(boardId, toPayload(column))
    return column
  }

  async update(columnId: string, userId: string, dto: UpdateColumnDto) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: { board: { select: { id: true, workspaceId: true } } },
    })
    if (!column) throw new NotFoundException('Column not found')
    await this.membership.requireMembership(column.board.workspaceId, userId)

    const updated = await this.prisma.column.update({
      where: { id: columnId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.position !== undefined && { position: dto.position }),
      },
    })

    this.realtime.emitColumnUpdated(column.board.id, toPayload(updated))
    return updated
  }

  async remove(columnId: string, userId: string): Promise<void> {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: { board: { select: { id: true, workspaceId: true } } },
    })
    if (!column) throw new NotFoundException('Column not found')
    await this.membership.requireMembership(column.board.workspaceId, userId)

    await this.prisma.column.delete({ where: { id: columnId } })
    this.realtime.emitColumnDeleted(column.board.id, {
      id: column.id,
      boardId: column.board.id,
    })
  }
}
