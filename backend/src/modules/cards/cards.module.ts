import { Module } from '@nestjs/common'

import { AuthModule } from '../auth/auth.module'
import { WorkspacesModule } from '../workspaces/workspaces.module'
import { CardsController } from './cards.controller'
import { CardsService } from './cards.service'

@Module({
  imports: [AuthModule, WorkspacesModule],
  controllers: [CardsController],
  providers: [CardsService],
})
export class CardsModule {}
