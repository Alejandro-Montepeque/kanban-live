import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common'

import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import type { AuthUser } from '../auth/types/jwt-payload'
import { CreateInvitationDto } from './dto/create-invitation.dto'
import { InvitationsService } from './invitations.service'

@Controller()
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post('workspaces/:workspaceId/invitations')
  @UseGuards(JwtAuthGuard)
  create(
    @CurrentUser() user: AuthUser,
    @Param('workspaceId') workspaceId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitations.create(workspaceId, user.id, dto)
  }

  @Get('workspaces/:workspaceId/invitations')
  @UseGuards(JwtAuthGuard)
  list(@CurrentUser() user: AuthUser, @Param('workspaceId') workspaceId: string) {
    return this.invitations.listForWorkspace(workspaceId, user.id)
  }

  @Delete('invitations/:id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(@CurrentUser() user: AuthUser, @Param('id') id: string): Promise<void> {
    await this.invitations.revoke(id, user.id)
  }

  // PUBLIC — anyone with a valid token can preview the invitation.
  @Get('invitations/:token')
  preview(@Param('token') token: string) {
    return this.invitations.preview(token)
  }

  @Post('invitations/:token/accept')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  accept(@CurrentUser() user: AuthUser, @Param('token') token: string) {
    return this.invitations.accept(token, user.id)
  }
}
