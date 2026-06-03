import { Injectable, NotFoundException } from '@nestjs/common'

import { FractionalIndex } from '../../common/fractional-index'
import { MembershipChecker } from '../../common/membership-checker'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateColumnDto } from './dto/create-column.dto'
import { UpdateColumnDto } from './dto/update-column.dto'

@Injectable()
export class ColumnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipChecker,
  ) {}

  async create(boardId: string, userId: string, dto: CreateColumnDto) {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { workspaceId: true },
    })
    if (!board) throw new NotFoundException('Board not found')
    await this.membership.requireMembership(board.workspaceId, userId)

    // Compute position: append at the end.
    const lastColumn = await this.prisma.column.findFirst({
      where: { boardId },
      orderBy: { position: 'desc' },
      select: { position: true },
    })
    const position = FractionalIndex.between(lastColumn?.position, undefined)

    return this.prisma.column.create({
      data: {
        name: dto.name,
        position,
        boardId,
      },
    })
  }

  async update(columnId: string, userId: string, dto: UpdateColumnDto) {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: { board: { select: { workspaceId: true } } },
    })
    if (!column) throw new NotFoundException('Column not found')
    await this.membership.requireMembership(column.board.workspaceId, userId)

    return this.prisma.column.update({
      where: { id: columnId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.position !== undefined && { position: dto.position }),
      },
    })
  }

  async remove(columnId: string, userId: string): Promise<void> {
    const column = await this.prisma.column.findUnique({
      where: { id: columnId },
      include: { board: { select: { workspaceId: true } } },
    })
    if (!column) throw new NotFoundException('Column not found')
    await this.membership.requireMembership(column.board.workspaceId, userId)

    await this.prisma.column.delete({ where: { id: columnId } })
  }
}
