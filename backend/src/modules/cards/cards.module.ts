import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { WorkspacesModule } from '../workspaces/workspaces.module'
import { CardsController } from './cards.controller'
import { CardsService } from './cards.service'

@Module({
  imports: [AuthModule, WorkspacesModule, RealtimeModule],
  controllers: [CardsController],
  providers: [CardsService],
})
export class CardsModule {}
