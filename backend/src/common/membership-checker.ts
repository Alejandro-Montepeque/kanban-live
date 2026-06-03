import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Role } from '@prisma/client'

import { PrismaService } from '../prisma/prisma.service'

// Non-members get 404 (not 403) to avoid leaking workspace existence to outsiders.
// Once membership is confirmed, role-restricted actions return 403.
@Injectable()
export class MembershipChecker {
  constructor(private readonly prisma: PrismaService) {}

  async requireMembership(workspaceId: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
    })
    if (!membership) {
      throw new NotFoundException('Workspace not found')
    }
    return membership
  }

  async requireOwner(workspaceId: string, userId: string) {
    const membership = await this.requireMembership(workspaceId, userId)
    if (membership.role !== Role.OWNER) {
      throw new ForbiddenException('Only owners can perform this action')
    }
    return membership
  }
}
