import { randomBytes, createHash } from 'node:crypto'

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as argon2 from 'argon2'

import { MailerService } from '../mailer/mailer.service'
import { PrismaService } from '../../prisma/prisma.service'
import { ChangePasswordDto } from './dto/change-password.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { ResendVerificationDto } from './dto/resend-verification.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { VerifyEmailDto } from './dto/verify-email.dto'
import type { AuthUser, JwtPayload } from './types/jwt-payload'

const REFRESH_TOKEN_BYTES = 64
const REFRESH_TOKEN_DAYS = 30
const MAX_FAILED_LOGIN_ATTEMPTS = 5
const LOCKOUT_MINUTES = 15
const RESET_TOKEN_BYTES = 32
const RESET_TOKEN_MINUTES = 60
const VERIFICATION_TOKEN_BYTES = 32
const VERIFICATION_TOKEN_HOURS = 24

export interface AuthResult {
  user: AuthUser
  accessToken: string
  refreshToken: string
  refreshTokenExpiresAt: Date
}

export interface RegisterResult {
  user: AuthUser
  emailVerificationRequired: true
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mailer: MailerService,
  ) {}

  async register(dto: RegisterDto): Promise<RegisterResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (existing) {
      throw new ConflictException('Email already registered')
    }

    const passwordHash = await argon2.hash(dto.password)
    const slug = this.generateWorkspaceSlug(dto.name)

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        passwordHash,
        // emailVerifiedAt stays NULL until the user clicks the verification link.
        memberships: {
          create: {
            role: 'OWNER',
            workspace: {
              create: { name: 'Personal', slug },
            },
          },
        },
      },
      select: { id: true, email: true, name: true },
    })

    await this.issueVerificationEmail(user)
    return { user, emailVerificationRequired: true }
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user) {
      // Same response as wrong password to avoid user enumeration.
      throw new UnauthorizedException('Invalid credentials')
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60_000,
      )
      throw new ForbiddenException(
        `Account locked due to too many failed attempts. Try again in ${minutesLeft} minute(s).`,
      )
    }

    const valid = await argon2.verify(user.passwordHash, dto.password)
    if (!valid) {
      await this.handleFailedLogin(user.id, user.failedLoginAttempts)
      throw new UnauthorizedException('Invalid credentials')
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException(
        'Email not verified. Please check your inbox for the verification link, or request a new one.',
      )
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      })
    }

    return this.issueTokens({ id: user.id, email: user.email, name: user.name })
  }

  async refresh(rawToken: string): Promise<AuthResult> {
    const hash = this.hashToken(rawToken)
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: hash },
      include: { user: { select: { id: true, email: true, name: true } } },
    })

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token')
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    })

    return this.issueTokens(stored.user)
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return
    const hash = this.hashToken(rawToken)
    await this.prisma.refreshToken
      .updateMany({
        where: { token: hash, revoked: false },
        data: { revoked: true },
      })
      .catch(() => undefined)
  }

  async revokeAllSessions(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revoked: false },
      data: { revoked: true },
    })
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    })
    return user
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<AuthUser> {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { name: dto.name },
      select: { id: true, email: true, name: true },
    })
    return updated
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId } })
    const valid = await argon2.verify(user.passwordHash, dto.currentPassword)
    if (!valid) {
      throw new UnauthorizedException('Current password is incorrect')
    }
    const newHash = await argon2.hash(dto.newPassword)
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newHash,
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      // Revoke all existing sessions — user has to re-login on all devices.
      this.prisma.refreshToken.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true },
      }),
    ])
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user) return

    const rawToken = randomBytes(RESET_TOKEN_BYTES).toString('base64url')
    const tokenHash = this.hashToken(rawToken)
    const expiresAt = new Date(Date.now() + RESET_TOKEN_MINUTES * 60_000)

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    })

    await this.prisma.passwordResetToken.create({
      data: { token: tokenHash, userId: user.id, expiresAt },
    })

    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5174'
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`

    await this.mailer.send({
      to: user.email,
      subject: 'Reset your kanban-live password',
      text: this.buildResetEmail(user.name, resetLink),
    })
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = this.hashToken(dto.token)
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { token: tokenHash },
    })

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token')
    }

    const newHash = await argon2.hash(dto.password)

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: {
          passwordHash: newHash,
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revoked: false },
        data: { revoked: true },
      }),
    ])
  }

  async verifyEmail(dto: VerifyEmailDto): Promise<void> {
    // One-time use: returns 401 for unknown/expired/used tokens (no enumeration).
    const tokenHash = this.hashToken(dto.token)
    const stored = await this.prisma.emailVerificationToken.findUnique({
      where: { token: tokenHash },
    })

    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired verification token')
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
    ])
  }

  async resendVerification(dto: ResendVerificationDto): Promise<void> {
    // Silent success regardless of email existence — anti-enumeration.
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user || user.emailVerifiedAt) return
    await this.issueVerificationEmail(user)
  }

  private async issueVerificationEmail(user: {
    id: string
    email: string
    name: string
  }): Promise<void> {
    const rawToken = randomBytes(VERIFICATION_TOKEN_BYTES).toString('base64url')
    const tokenHash = this.hashToken(rawToken)
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_HOURS * 60 * 60 * 1000)

    await this.prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    })

    await this.prisma.emailVerificationToken.create({
      data: { token: tokenHash, userId: user.id, expiresAt },
    })

    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5174'
    const link = `${frontendUrl}/verify-email?token=${rawToken}`

    await this.mailer.send({
      to: user.email,
      subject: 'Verify your kanban-live email',
      text: this.buildVerificationEmail(user.name, link),
    })
  }

  private async handleFailedLogin(userId: string, currentAttempts: number): Promise<void> {
    const nextAttempts = currentAttempts + 1
    const shouldLock = nextAttempts >= MAX_FAILED_LOGIN_ATTEMPTS
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        failedLoginAttempts: nextAttempts,
        lockedUntil: shouldLock
          ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
          : null,
      },
    })
  }

  private async issueTokens(user: AuthUser): Promise<AuthResult> {
    const payload: JwtPayload = { sub: user.id, email: user.email }
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
    })

    const rawRefresh = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url')
    const hash = this.hashToken(rawRefresh)
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000)

    await this.prisma.refreshToken.create({
      data: { token: hash, userId: user.id, expiresAt },
    })

    return { user, accessToken, refreshToken: rawRefresh, refreshTokenExpiresAt: expiresAt }
  }

  private hashToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex')
  }

  private generateWorkspaceSlug(name: string): string {
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

  private buildResetEmail(name: string, link: string): string {
    return [
      `Hi ${name},`,
      '',
      'You (or someone using your email) requested a password reset for your kanban-live account.',
      '',
      'Click the link below to set a new password. This link expires in 60 minutes and can only be used once.',
      '',
      link,
      '',
      'If you did not request this, you can safely ignore this email — your password will not change.',
      '',
      '— kanban-live',
    ].join('\n')
  }

  private buildVerificationEmail(name: string, link: string): string {
    return [
      `Hi ${name},`,
      '',
      'Welcome to kanban-live! Please confirm your email address to activate your account.',
      '',
      'Click the link below to verify. This link expires in 24 hours.',
      '',
      link,
      '',
      'If you did not create this account, you can safely ignore this email.',
      '',
      '— kanban-live',
    ].join('\n')
  }
}
