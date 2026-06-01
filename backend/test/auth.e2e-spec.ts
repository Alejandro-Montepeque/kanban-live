import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'
import { resetDatabase } from './setup-db'

describe('Auth (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleRef.createNestApplication()
    app.use(cookieParser())
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
    app.setGlobalPrefix('api', { exclude: ['/', 'health'] })
    await app.init()

    prisma = app.get(PrismaService)
  })

  beforeEach(async () => {
    await resetDatabase(prisma)
  })

  afterAll(async () => {
    await app.close()
  })

  const validUser = {
    email: 'alice@example.com',
    name: 'Alice',
    password: 'correctHorseBatteryStaple',
  }

  describe('POST /api/auth/register', () => {
    it('creates a user, returns access token and sets refresh cookie', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validUser)
        .expect(201)

      expect(res.body.user).toMatchObject({
        email: validUser.email,
        name: validUser.name,
      })
      expect(res.body.user.id).toEqual(expect.any(String))
      expect(res.body.accessToken).toEqual(expect.any(String))
      expect(res.headers['set-cookie']?.[0]).toMatch(/refresh_token=/)
      expect(res.headers['set-cookie']?.[0]).toMatch(/HttpOnly/)
    })

    it('auto-creates a Personal workspace and makes the user OWNER', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validUser)
        .expect(201)

      const memberships = await prisma.membership.findMany({
        include: { workspace: true, user: true },
      })
      expect(memberships).toHaveLength(1)
      expect(memberships[0].role).toBe('OWNER')
      expect(memberships[0].workspace.name).toBe('Personal')
    })

    it('rejects duplicate emails with 409', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validUser)
        .expect(201)

      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validUser)
        .expect(409)
    })

    it('rejects invalid email format', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...validUser, email: 'not-an-email' })
        .expect(400)
    })

    it('rejects weak passwords', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...validUser, password: 'short' })
        .expect(400)
    })
  })

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app.getHttpServer()).post('/api/auth/register').send(validUser).expect(201)
    })

    it('returns access token for valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password })
        .expect(200)

      expect(res.body.accessToken).toEqual(expect.any(String))
      expect(res.headers['set-cookie']?.[0]).toMatch(/refresh_token=/)
    })

    it('rejects wrong password with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: validUser.email, password: 'wrong' })
        .expect(401)
    })

    it('rejects unknown email with 401 (no user enumeration)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'ghost@example.com', password: 'whatever' })
        .expect(401)
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('rotates refresh token and returns new access token', async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validUser)
        .expect(201)

      const cookie = registerRes.headers['set-cookie']?.[0]
      expect(cookie).toBeDefined()

      const refreshRes = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookie!)
        .expect(200)

      expect(refreshRes.body.accessToken).toEqual(expect.any(String))
      // New refresh cookie was set
      expect(refreshRes.headers['set-cookie']?.[0]).toMatch(/refresh_token=/)
    })

    it('rejects requests without refresh cookie', async () => {
      await request(app.getHttpServer()).post('/api/auth/refresh').expect(401)
    })

    it('rejects already-rotated (revoked) refresh tokens', async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validUser)
        .expect(201)

      const originalCookie = registerRes.headers['set-cookie']?.[0]

      // First refresh succeeds and rotates.
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', originalCookie!)
        .expect(200)

      // Second refresh with the same (now-revoked) token must fail.
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', originalCookie!)
        .expect(401)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('revokes refresh token and clears the cookie', async () => {
      const registerRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validUser)
        .expect(201)

      const cookie = registerRes.headers['set-cookie']?.[0]

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', cookie!)
        .expect(204)

      // The original refresh should now be unusable.
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookie!)
        .expect(401)
    })
  })

  describe('GET /api/auth/me (protected)', () => {
    it('returns 401 without a Bearer token', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401)
    })

    it('returns the current user when a valid Bearer is provided', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validUser)
        .expect(201)

      const meRes = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${res.body.accessToken}`)
        .expect(200)

      expect(meRes.body).toMatchObject({
        email: validUser.email,
        name: validUser.name,
      })
    })
  })
})
