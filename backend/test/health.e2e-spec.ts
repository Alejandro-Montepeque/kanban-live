import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from '../src/app.module'

describe('Health (e2e)', () => {
  let app: INestApplication

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    await app.init()
  })

  afterAll(async () => {
    await app.close()
  })

  it('GET /  returns service banner', async () => {
    const res = await request(app.getHttpServer()).get('/').expect(200)
    expect(res.body.service).toBe('kanban-live')
    expect(res.body.status).toBe('ok')
  })

  it('GET /health  returns healthy status', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200)
    expect(res.body.status).toBe('healthy')
  })
})
