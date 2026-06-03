import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { APP_GUARD } from '@nestjs/core'

import { AuthModule } from './modules/auth/auth.module'
import { BoardsModule } from './modules/boards/boards.module'
import { CardsModule } from './modules/cards/cards.module'
import { ColumnsModule } from './modules/columns/columns.module'
import { HealthModule } from './modules/health/health.module'
import { MailerModule } from './modules/mailer/mailer.module'
import { WorkspacesModule } from './modules/workspaces/workspaces.module'
import { PrismaModule } from './prisma/prisma.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    PrismaModule,
    MailerModule,
    AuthModule,
    WorkspacesModule,
    BoardsModule,
    ColumnsModule,
    CardsModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
