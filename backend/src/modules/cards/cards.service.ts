import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { Card } from '@prisma/client'

import { FractionalIndex } from '../../common/fractional-index'
import { MembershipChecker } from '../../common/membership-checker'
import { PrismaService } from '../../prisma/prisma.service'
import { RealtimeService } from '../realtime/realtime.service'
import type { CardPayload } from '../realtime/types/socket-events'
import { CreateCardDto } from './dto/create-card.dto'
import { UpdateCardDto } from './dto/update-card.dto'

function toPayload(card: Card): CardPayload {
  return {
    id: card.id,
    title: card.title,
    description: card.description,
    position: card.position,
    columnId: card.columnId,
    dueDate: card.dueDate?.toISOString() ?? null,
    authorId: card.authorId,
    assigneeId: card.assigneeId,
    createdAt: card.createdAt.toISOString(),
    updatedAt: card.updatedAt.toISOString(),
  }
}

@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipChecker,
    private readonly realtime: RealtimeService,
  ) {}

  async create(columnId: string, userId: string, dto: CreateCardDto) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: { board: { select: { id: true, workspaceId: true } } },
    })
    if (!column) throw new NotFoundException('Column not found')
    await this.membership.requireMembership(column.board.workspaceId, userId)

    const lastCard = await this.prisma.card.findFirst({
      where: { columnId },
      orderBy: { position: 'desc' },
      select: { position: true },
    })
    const position = FractionalIndex.between(lastCard?.position, undefined)

    const card = await this.prisma.card.create({
      data: {
        title: dto.title,
        description: dto.description,
        position,
        columnId,
        authorId: userId,
      },
    })

    this.realtime.emitCardCreated(column.board.id, toPayload(card))
    return card
  }

  async update(cardId: string, userId: string, dto: UpdateCardDto) {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: {
        column: { include: { board: { select: { id: true, workspaceId: true } } } },
      },
    })
    if (!card) throw new NotFoundException('Card not found')
    await this.membership.requireMembership(card.column.board.workspaceId, userId)

    if (dto.columnId && dto.columnId !== card.columnId) {
      const targetColumn = await this.prisma.column.findUnique({
        where: { id: dto.columnId },
        select: { boardId: true },
      })
      if (!targetColumn || targetColumn.boardId !== card.column.boardId) {
        throw new ForbiddenException('Cannot move card across boards')
      }
    }

    if (dto.assigneeId) {
      const assigneeMembership = await this.prisma.membership.findUnique({
        where: {
          userId_workspaceId: {
            userId: dto.assigneeId,
            workspaceId: card.column.board.workspaceId,
          },
        },
      })
      if (!assigneeMembership) {
        throw new ForbiddenException('Assignee is not a member of this workspace')
      }
    }

    const updated = await this.prisma.card.update({
      where: { id: cardId },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.columnId !== undefined && { columnId: dto.columnId }),
        ...(dto.position !== undefined && { position: dto.position }),
        ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId }),
        ...(dto.dueDate !== undefined && {
          dueDate: dto.dueDate === null ? null : new Date(dto.dueDate),
        }),
      },
    })

    this.realtime.emitCardUpdated(card.column.board.id, toPayload(updated))
    return updated
  }

  async remove(cardId: string, userId: string): Promise<void> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: {
        column: { include: { board: { select: { id: true, workspaceId: true } } } },
      },
    })
    if (!card) throw new NotFoundException('Card not found')
    await this.membership.requireMembership(card.column.board.workspaceId, userId)

    await this.prisma.card.delete({ where: { id: cardId } })
    this.realtime.emitCardDeleted(card.column.board.id, {
      id: card.id,
      columnId: card.columnId,
    })
  }
}
