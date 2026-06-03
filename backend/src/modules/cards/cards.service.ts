import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'

import { FractionalIndex } from '../../common/fractional-index'
import { MembershipChecker } from '../../common/membership-checker'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateCardDto } from './dto/create-card.dto'
import { UpdateCardDto } from './dto/update-card.dto'

@Injectable()
export class CardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipChecker,
  ) {}

  async create(columnId: string, userId: string, dto: CreateCardDto) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: { board: { select: { workspaceId: true } } },
    })
    if (!column) throw new NotFoundException('Column not found')
    await this.membership.requireMembership(column.board.workspaceId, userId)

    // Append at the end of the column.
    const lastCard = await this.prisma.card.findFirst({
      where: { columnId },
      orderBy: { position: 'desc' },
      select: { position: true },
    })
    const position = FractionalIndex.between(lastCard?.position, undefined)

    return this.prisma.card.create({
      data: {
        title: dto.title,
        description: dto.description,
        position,
        columnId,
        authorId: userId,
      },
    })
  }

  async update(cardId: string, userId: string, dto: UpdateCardDto) {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: {
        column: { include: { board: { select: { workspaceId: true } } } },
      },
    })
    if (!card) throw new NotFoundException('Card not found')
    await this.membership.requireMembership(card.column.board.workspaceId, userId)

    // If moving to a different column, verify that column belongs to the same board.
    if (dto.columnId && dto.columnId !== card.columnId) {
      const targetColumn = await this.prisma.column.findUnique({
        where: { id: dto.columnId },
        select: { boardId: true },
      })
      if (!targetColumn || targetColumn.boardId !== card.column.boardId) {
        throw new ForbiddenException('Cannot move card across boards')
      }
    }

    // If the new assignee is being set, verify they're a member of the workspace.
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

    return this.prisma.card.update({
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
  }

  async remove(cardId: string, userId: string): Promise<void> {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: {
        column: { include: { board: { select: { workspaceId: true } } } },
      },
    })
    if (!card) throw new NotFoundException('Card not found')
    await this.membership.requireMembership(card.column.board.workspaceId, userId)

    await this.prisma.card.delete({ where: { id: cardId } })
  }
}
