import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { WorkspacesModule } from '../workspaces/workspaces.module'
import { ColumnsController } from './columns.controller'
import { ColumnsService } from './columns.service'

@Module({
  imports: [AuthModule, WorkspacesModule, RealtimeModule],
  controllers: [ColumnsController],
  providers: [ColumnsService],
})
export class ColumnsModule {}
