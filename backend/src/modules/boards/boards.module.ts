import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { WorkspacesModule } from '../workspaces/workspaces.module'
import { BoardsController } from './boards.controller'
import { BoardsService } from './boards.service'

@Module({
  // WorkspacesModule exports MembershipChecker.
  imports: [AuthModule, WorkspacesModule],
  controllers: [BoardsController],
  providers: [BoardsService],
  exports: [BoardsService],
})
export class BoardsModule {}
