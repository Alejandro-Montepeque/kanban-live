import { randomBytes } from 'node:crypto'

import { Injectable } from '@nestjs/common'

import { MembershipChecker } from '../../common/membership-checker'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateWorkspaceDto } from './dto/create-workspace.dto'
import { UpdateWorkspaceDto } from './dto/update-workspace.dto'

export interface WorkspaceListItem {
  id: string
  name: string
  slug: string
  role: 'OWNER' | 'MEMBER'
  boardCount: number
  memberCount: number
  createdAt: Date
}

export interface WorkspaceDetail extends WorkspaceListItem {
  members: Array<{ userId: string; name: string; email: string; role: 'OWNER' | 'MEMBER' }>
}

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipChecker,
  ) {}

  async listForUser(userId: string): Promise<WorkspaceListItem[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            _count: { select: { boards: true, memberships: true } },
          },
        },
      },
      orderBy: { joinedAt: 'asc' },
    })

    return memberships.map((m) => ({
      id: m.workspace.id,
      name: m.workspace.name,
      slug: m.workspace.slug,
      role: m.role,
      boardCount: m.workspace._count.boards,
      memberCount: m.workspace._count.memberships,
      createdAt: m.workspace.createdAt,
    }))
  }

  async findById(workspaceId: string, userId: string): Promise<WorkspaceDetail> {
    const membership = await this.membership.requireMembership(workspaceId, userId)

    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      include: {
        memberships: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
        _count: { select: { boards: true, memberships: true } },
      },
    })

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      role: membership.role,
      boardCount: workspace._count.boards,
      memberCount: workspace._count.memberships,
      createdAt: workspace.createdAt,
      members: workspace.memberships.map((m) => ({
        userId: m.user.id,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
      })),
    }
  }

  async create(userId: string, dto: CreateWorkspaceDto): Promise<WorkspaceListItem> {
    const slug = this.generateSlug(dto.name)

    const workspace = await this.prisma.workspace.create({
      data: {
        name: dto.name,
        slug,
        memberships: {
          create: { userId, role: 'OWNER' },
        },
      },
      include: {
        _count: { select: { boards: true, memberships: true } },
      },
    })

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      role: 'OWNER',
      boardCount: workspace._count.boards,
      memberCount: workspace._count.memberships,
      createdAt: workspace.createdAt,
    }
  }

  async update(
    workspaceId: string,
    userId: string,
    dto: UpdateWorkspaceDto,
  ): Promise<WorkspaceListItem> {
    await this.membership.requireOwner(workspaceId, userId)

    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { name: dto.name },
      include: {
        _count: { select: { boards: true, memberships: true } },
      },
    })

    return {
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      role: 'OWNER',
      boardCount: workspace._count.boards,
      memberCount: workspace._count.memberships,
      createdAt: workspace.createdAt,
    }
  }

  async remove(workspaceId: string, userId: string): Promise<void> {
    await this.membership.requireOwner(workspaceId, userId)
    // Cascade deletes memberships, boards, columns, cards, activities.
    await this.prisma.workspace.delete({ where: { id: workspaceId } })
  }

  private generateSlug(name: string): string {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 32)
    const suffix = randomBytes(4).toString('hex')
    return `${base || 'workspace'}-${suffix}`
  }
}
