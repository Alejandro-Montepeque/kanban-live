import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Request, Response } from 'express'

import { AuthService } from './auth.service'
import type { AuthResult } from './auth.service'
import { CurrentUser } from './decorators/current-user.decorator'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import type { AuthUser } from './types/jwt-payload'

const REFRESH_COOKIE = 'refresh_token'

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: AuthUser; accessToken: string }> {
    const result = await this.auth.register(dto)
    this.setRefreshCookie(res, result)
    return { user: result.user, accessToken: result.accessToken }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: AuthUser; accessToken: string }> {
    const result = await this.auth.login(dto)
    this.setRefreshCookie(res, result)
    return { user: result.user, accessToken: result.accessToken }
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ accessToken: string }> {
    const token = this.readRefreshCookie(req)
    if (!token) {
      throw new UnauthorizedException('Missing refresh token')
    }
    const result = await this.auth.refresh(token)
    this.setRefreshCookie(res, result)
    return { accessToken: result.accessToken }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    const token = this.readRefreshCookie(req)
    await this.auth.logout(token)
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions())
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: AuthUser): AuthUser {
    return user
  }

  private setRefreshCookie(res: Response, result: AuthResult): void {
    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      ...this.cookieOptions(),
      expires: result.refreshTokenExpiresAt,
    })
  }

  private readRefreshCookie(req: Request): string | undefined {
    const cookies = (req as Request & { cookies?: Record<string, string> }).cookies
    return cookies?.[REFRESH_COOKIE]
  }

  private cookieOptions() {
    const isProd = this.config.get<string>('NODE_ENV') === 'production'
    return {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax' as const,
      path: '/api/auth',
    }
  }
}
