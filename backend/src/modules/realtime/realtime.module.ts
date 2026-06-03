import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'

import { MembershipChecker } from '../../common/membership-checker'
import { RealtimeGateway } from './realtime.gateway'
import { RealtimeService } from './realtime.service'

@Module({
  imports: [JwtModule.register({})],
  providers: [RealtimeGateway, RealtimeService, MembershipChecker],
  exports: [RealtimeService],
})
export class RealtimeModule {}
