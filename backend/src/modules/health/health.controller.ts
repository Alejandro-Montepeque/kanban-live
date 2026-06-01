import { Controller, Get } from '@nestjs/common'

import { PrismaService } from '../../prisma/prisma.service'

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('/')
  root(): { service: string; status: string } {
    return { service: 'kanban-live', status: 'ok' }
  }

  @Get('/health')
  async health(): Promise<{ status: string; database: string }> {
    let database = 'down'
    try {
      await this.prisma.$queryRaw`SELECT 1`
      database = 'up'
    } catch {
      database = 'down'
    }
    return { status: 'healthy', database }
  }
}
