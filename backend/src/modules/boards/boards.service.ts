import { Injectable, NotFoundException } from '@nestjs/common'

import { MembershipChecker } from '../../common/membership-checker'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateBoardDto } from './dto/create-board.dto'
import { UpdateBoardDto } from './dto/update-board.dto'

export interface BoardListItem {
  id: string
  name: string
  workspaceId: string
  cardCount: number
  columnCount: number
  createdAt: Date
  updatedAt: Date
}

export interface BoardDetail extends BoardListItem {
  // The current user's role in the workspace this board belongs to.
  // Used by the UI to decide which destructive actions to show.
  myRole: 'OWNER' | 'MEMBER'
  columns: Array<{
    id: string
    name: string
    position: number
    cards: Array<{
      id: string
      title: string
      description: string | null
      position: number
      columnId: string
      dueDate: Date | null
      authorId: string
      assigneeId: string | null
      createdAt: Date
      updatedAt: Date
    }>
  }>
}

const DEFAULT_COLUMNS = [
  { name: 'Backlog', position: 1 },
  { name: 'In progress', position: 2 },
  { name: 'Done', position: 3 },
]

@Injectable()
export class BoardsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipChecker,
  ) {}

  async listForWorkspace(workspaceId: string, userId: string): Promise<BoardListItem[]> {
    await this.membership.requireMembership(workspaceId, userId)

    const boards = await this.prisma.board.findMany({
      where: { workspaceId },
      include: {
        _count: { select: { columns: true } },
        columns: { include: { _count: { select: { cards: true } } } },
      },
      orderBy: { createdAt: 'asc' },
    })

    return boards.map((b) => ({
      id: b.id,
      name: b.name,
      workspaceId: b.workspaceId,
      cardCount: b.columns.reduce((sum, c) => sum + c._count.cards, 0),
      columnCount: b._count.columns,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
    }))
  }

  async create(
    workspaceId: string,
    userId: string,
    dto: CreateBoardDto,
  ): Promise<BoardListItem> {
    await this.membership.requireMembership(workspaceId, userId)

    const board = await this.prisma.board.create({
      data: {
        name: dto.name,
        workspaceId,
        columns: {
          create: DEFAULT_COLUMNS,
        },
      },
      include: {
        _count: { select: { columns: true } },
      },
    })

    return {
      id: board.id,
      name: board.name,
      workspaceId: board.workspaceId,
      cardCount: 0,
      columnCount: board._count.columns,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
    }
  }

  async findById(boardId: string, userId: string): Promise<BoardDetail> {
    const board = await this.prisma.board.findUnique({
      where: { id: boardId },
      include: {
        columns: {
          orderBy: { position: 'asc' },
          include: {
            cards: { orderBy: { position: 'asc' } },
          },
        },
      },
    })

    if (!board) {
      throw new NotFoundException('Board not found')
    }

    // Authorization: user must be a member of the board's workspace.
    const membership = await this.membership.requireMembership(board.workspaceId, userId)

    return {
      id: board.id,
      name: board.name,
      workspaceId: board.workspaceId,
      myRole: membership.role,
      cardCount: board.columns.reduce((sum, c) => sum + c.cards.length, 0),
      columnCount: board.columns.length,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
      columns: board.columns.map((c) => ({
        id: c.id,
        name: c.name,
        position: c.position,
        cards: c.cards.map((card) => ({
          id: card.id,
          title: card.title,
          description: card.description,
          position: card.position,
          columnId: card.columnId,
          dueDate: card.dueDate,
          authorId: card.authorId,
          assigneeId: card.assigneeId,
          createdAt: card.createdAt,
          updatedAt: card.updatedAt,
        })),
      })),
    }
  }

  async update(
    boardId: string,
    userId: string,
    dto: UpdateBoardDto,
  ): Promise<BoardListItem> {
    const existing = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { workspaceId: true },
    })
    if (!existing) throw new NotFoundException('Board not found')

    await this.membership.requireMembership(existing.workspaceId, userId)

    const board = await this.prisma.board.update({
      where: { id: boardId },
      data: { name: dto.name },
      include: {
        _count: { select: { columns: true } },
        columns: { include: { _count: { select: { cards: true } } } },
      },
    })

    return {
      id: board.id,
      name: board.name,
      workspaceId: board.workspaceId,
      cardCount: board.columns.reduce((sum, c) => sum + c._count.cards, 0),
      columnCount: board._count.columns,
      createdAt: board.createdAt,
      updatedAt: board.updatedAt,
    }
  }

  async remove(boardId: string, userId: string): Promise<void> {
    const existing = await this.prisma.board.findUnique({
      where: { id: boardId },
      select: { workspaceId: true },
    })
    if (!existing) throw new NotFoundException('Board not found')

    // Only the workspace OWNER can delete boards (destructive).
    await this.membership.requireOwner(existing.workspaceId, userId)
    await this.prisma.board.delete({ where: { id: boardId } })
  }
}
