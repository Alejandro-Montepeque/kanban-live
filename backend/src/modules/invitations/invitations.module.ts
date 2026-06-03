import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { WorkspacesModule } from '../workspaces/workspaces.module'
import { InvitationsController } from './invitations.controller'
import { InvitationsService } from './invitations.service'

@Module({
  imports: [AuthModule, WorkspacesModule],
  controllers: [InvitationsController],
  providers: [InvitationsService],
})
export class InvitationsModule {}
