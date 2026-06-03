import { createHash, randomBytes } from 'node:crypto'

import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { MembershipChecker } from '../../common/membership-checker'
import { PrismaService } from '../../prisma/prisma.service'
import { MailerService } from '../mailer/mailer.service'
import { CreateInvitationDto } from './dto/create-invitation.dto'

const INVITATION_TOKEN_BYTES = 32
const INVITATION_TTL_DAYS = 7

export interface InvitationCreated {
  token: string
  link: string
  expiresAt: Date
  email: string | null
}

export interface InvitationPreview {
  token: string
  workspaceName: string
  expiresAt: Date
  email: string | null
}

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly membership: MembershipChecker,
    private readonly mailer: MailerService,
    private readonly config: ConfigService,
  ) {}

  async create(
    workspaceId: string,
    userId: string,
    dto: CreateInvitationDto,
  ): Promise<InvitationCreated> {
    await this.membership.requireOwner(workspaceId, userId)

    const workspace = await this.prisma.workspace.findUniqueOrThrow({
      where: { id: workspaceId },
      select: { name: true },
    })

    const inviter = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { name: true },
    })

    const rawToken = randomBytes(INVITATION_TOKEN_BYTES).toString('base64url')
    const tokenHash = this.hash(rawToken)
    const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000)

    await this.prisma.invitation.create({
      data: {
        token: tokenHash,
        workspaceId,
        email: dto.email ?? null,
        expiresAt,
      },
    })

    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5174'
    const link = `${frontendUrl}/join/${rawToken}`

    if (dto.sendEmail && dto.email) {
      await this.mailer.send({
        to: dto.email,
        subject: `${inviter.name} invited you to ${workspace.name} on kanban-live`,
        text: this.buildEmail(inviter.name, workspace.name, link),
      })
    }

    return { token: rawToken, link, expiresAt, email: dto.email ?? null }
  }

  async preview(rawToken: string): Promise<InvitationPreview> {
    const hash = this.hash(rawToken)
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: hash },
      include: { workspace: { select: { name: true } } },
    })
    if (!invitation || invitation.usedAt || invitation.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired invitation')
    }
    return {
      token: rawToken,
      workspaceName: invitation.workspace.name,
      expiresAt: invitation.expiresAt,
      email: invitation.email,
    }
  }

  async accept(rawToken: string, userId: string): Promise<{ workspaceId: string }> {
    const hash = this.hash(rawToken)
    const invitation = await this.prisma.invitation.findUnique({
      where: { token: hash },
    })
    if (!invitation || invitation.usedAt || invitation.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired invitation')
    }

    const existing = await this.prisma.membership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId: invitation.workspaceId } },
    })
    if (existing) {
      throw new ConflictException('Already a member of this workspace')
    }

    await this.prisma.$transaction([
      this.prisma.membership.create({
        data: {
          userId,
          workspaceId: invitation.workspaceId,
          role: invitation.role,
        },
      }),
      this.prisma.invitation.update({
        where: { id: invitation.id },
        data: { usedAt: new Date() },
      }),
    ])

    return { workspaceId: invitation.workspaceId }
  }

  async listForWorkspace(workspaceId: string, userId: string) {
    await this.membership.requireOwner(workspaceId, userId)
    const invitations = await this.prisma.invitation.findMany({
      where: { workspaceId, usedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
      select: { id: true, email: true, expiresAt: true, createdAt: true },
    })
    return invitations
  }

  async revoke(invitationId: string, userId: string): Promise<void> {
    const invitation = await this.prisma.invitation.findUnique({
      where: { id: invitationId },
      select: { workspaceId: true },
    })
    if (!invitation) throw new NotFoundException('Invitation not found')
    await this.membership.requireOwner(invitation.workspaceId, userId)
    await this.prisma.invitation.update({
      where: { id: invitationId },
      data: { usedAt: new Date() },
    })
  }

  private hash(raw: string): string {
    return createHash('sha256').update(raw).digest('hex')
  }

  private buildEmail(inviterName: string, workspaceName: string, link: string): string {
    return [
      `Hi,`,
      '',
      `${inviterName} invited you to join the workspace "${workspaceName}" on kanban-live.`,
      '',
      'Click the link below to accept. The invitation expires in 7 days.',
      '',
      link,
      '',
      'If you don\'t have a kanban-live account yet, you can create one through the same link.',
      '',
      '— kanban-live',
    ].join('\n')
  }
}
