import { ExecutionContext, createParamDecorator } from '@nestjs/common'

import type { AuthUser } from '../types/jwt-payload'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AuthUser }>()
    return request.user
  },
)
