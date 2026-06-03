import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'
import { resetDatabase } from './setup-db'

describe('Boards + Columns + Cards (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let token: string
  let workspaceId: string

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile()
    app = moduleRef.createNestApplication()
    app.use(cookieParser())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    app.setGlobalPrefix('api', { exclude: ['/', 'health'] })
    await app.init()
    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await resetDatabase(prisma)

    // Register + verify + login + grab the Personal workspace.
    const email = 'owner@e2e.test'
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({ email, name: 'Owner', password: 'CorrectHorse123' })
      .expect(201)
    await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    })
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: 'CorrectHorse123' })
      .expect(200)
    token = loginRes.body.accessToken

    const wsRes = await request(app.getHttpServer())
      .get('/api/workspaces')
      .set('Authorization', `Bearer ${token}`)
    workspaceId = wsRes.body[0].id
  })

  afterAll(async () => {
    await app.close()
  })

  describe('Boards', () => {
    it('creates a board with 3 default columns', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/workspaces/${workspaceId}/boards`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Sprint 1' })
        .expect(201)

      expect(res.body).toMatchObject({ name: 'Sprint 1', columnCount: 3 })

      const board = await prisma.board.findUnique({
        where: { id: res.body.id },
        include: { columns: { orderBy: { position: 'asc' } } },
      })
      expect(board?.columns.map((c) => c.name)).toEqual(['Backlog', 'In progress', 'Done'])
    })

    it('lists boards for a workspace I belong to', async () => {
      await request(app.getHttpServer())
        .post(`/api/workspaces/${workspaceId}/boards`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'A' })
        .expect(201)
      await request(app.getHttpServer())
        .post(`/api/workspaces/${workspaceId}/boards`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'B' })
        .expect(201)

      const res = await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceId}/boards`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)

      expect(res.body).toHaveLength(2)
    })

    it('returns 404 when listing boards of a workspace I do not belong to', async () => {
      await request(app.getHttpServer()).post('/api/auth/register').send({
        email: 'outsider@e2e.test',
        name: 'Outsider',
        password: 'CorrectHorse123',
      })
      await prisma.user.update({
        where: { email: 'outsider@e2e.test' },
        data: { emailVerifiedAt: new Date() },
      })
      const outsider = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'outsider@e2e.test', password: 'CorrectHorse123' })

      await request(app.getHttpServer())
        .get(`/api/workspaces/${workspaceId}/boards`)
        .set('Authorization', `Bearer ${outsider.body.accessToken}`)
        .expect(404)
    })
  })

  describe('Columns + Cards', () => {
    let boardId: string
    let firstColumnId: string

    beforeEach(async () => {
      const board = await request(app.getHttpServer())
        .post(`/api/workspaces/${workspaceId}/boards`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Test board' })
      boardId = board.body.id

      const detail = await request(app.getHttpServer())
        .get(`/api/boards/${boardId}`)
        .set('Authorization', `Bearer ${token}`)
      firstColumnId = detail.body.columns[0].id
    })

    it('creates a card in a column and appends it at the end', async () => {
      const c1 = await request(app.getHttpServer())
        .post(`/api/columns/${firstColumnId}/cards`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'First card' })
        .expect(201)
      const c2 = await request(app.getHttpServer())
        .post(`/api/columns/${firstColumnId}/cards`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Second card' })
        .expect(201)

      expect(c2.body.position).toBeGreaterThan(c1.body.position)
    })

    it('moves a card to another column', async () => {
      const board = await request(app.getHttpServer())
        .get(`/api/boards/${boardId}`)
        .set('Authorization', `Bearer ${token}`)
      const secondColumnId = board.body.columns[1].id

      const card = await request(app.getHttpServer())
        .post(`/api/columns/${firstColumnId}/cards`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Moves' })
        .expect(201)

      await request(app.getHttpServer())
        .patch(`/api/cards/${card.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ columnId: secondColumnId, position: 1 })
        .expect(200)

      const after = await prisma.card.findUnique({ where: { id: card.body.id } })
      expect(after?.columnId).toBe(secondColumnId)
      expect(after?.position).toBe(1)
    })

    it('creates a new column at the end of the board', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/boards/${boardId}/columns`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Review' })
        .expect(201)

      const board = await request(app.getHttpServer())
        .get(`/api/boards/${boardId}`)
        .set('Authorization', `Bearer ${token}`)

      expect(board.body.columns).toHaveLength(4)
      expect(board.body.columns[3]).toMatchObject({ id: res.body.id, name: 'Review' })
    })

    it('deletes a card', async () => {
      const card = await request(app.getHttpServer())
        .post(`/api/columns/${firstColumnId}/cards`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Disposable' })

      await request(app.getHttpServer())
        .delete(`/api/cards/${card.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204)

      const found = await prisma.card.findUnique({ where: { id: card.body.id } })
      expect(found).toBeNull()
    })
  })
})
