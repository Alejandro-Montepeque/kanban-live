import { randomBytes, createHash } from 'node:crypto'

import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as argon2 from 'argon2'

import { PrismaService } from '../../prisma/prisma.service'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import type { AuthUser, JwtPayload } from './types/jwt-payload'

const REFRESH_TOKEN_BYTES = 64
const REFRESH_TOKEN_DAYS = 30

export interface AuthResult {
  user: AuthUser
  accessToken: string
  refreshToken: string
  refreshTokenExpiresAt: Date
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResult> {
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

    return this.issueTokens(user)
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (!user) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const valid = await argon2.verify(user.passwordHash, dto.password)
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials')
    }

    return this.issueTokens({ id: user.id, email: user.email, name: user.name })
  }

  async refresh(rawToken: string): Promise<AuthResult> {
    const hash = this.hashRefreshToken(rawToken)
    const stored = await this.prisma.refreshToken.findUnique({
      where: { token: hash },
      include: { user: { select: { id: true, email: true, name: true } } },
    })

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token')
    }

    // Rotate: revoke the old token, issue a new one.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revoked: true },
    })

    return this.issueTokens(stored.user)
  }

  async logout(rawToken: string | undefined): Promise<void> {
    if (!rawToken) return
    const hash = this.hashRefreshToken(rawToken)
    await this.prisma.refreshToken
      .updateMany({
        where: { token: hash, revoked: false },
        data: { revoked: true },
      })
      .catch(() => undefined)
  }

  private async issueTokens(user: AuthUser): Promise<AuthResult> {
    const payload: JwtPayload = { sub: user.id, email: user.email }
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m',
    })

    const rawRefresh = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url')
    const hash = this.hashRefreshToken(rawRefresh)
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000)

    await this.prisma.refreshToken.create({
      data: { token: hash, userId: user.id, expiresAt },
    })

    return { user, accessToken, refreshToken: rawRefresh, refreshTokenExpiresAt: expiresAt }
  }

  private hashRefreshToken(raw: string): string {
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
}
