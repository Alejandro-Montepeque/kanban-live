import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'
import { AuthService } from '../src/modules/auth/auth.service'
import { resetDatabase } from './setup-db'

describe('Auth (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaService
  let auth: AuthService

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
    auth = app.get(AuthService)
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
    password: 'CorrectHorse123',
  }

  // Register + flip emailVerifiedAt directly to skip the email step.
  async function registerAndVerify(user = validUser): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(user)
      .expect(201)
    await prisma.user.update({
      where: { email: user.email },
      data: { emailVerifiedAt: new Date() },
    })
  }

  describe('POST /api/auth/register', () => {
    it('creates a user and indicates email verification is required (no tokens)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validUser)
        .expect(201)

      expect(res.body.user).toMatchObject({
        email: validUser.email,
        name: validUser.name,
      })
      expect(res.body.emailVerificationRequired).toBe(true)
      expect(res.body.accessToken).toBeUndefined()
      // No refresh cookie either — user must verify before getting any session.
      expect(res.headers['set-cookie']).toBeUndefined()
    })

    it('creates an email verification token in DB', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validUser)
        .expect(201)

      const tokens = await prisma.emailVerificationToken.findMany()
      expect(tokens).toHaveLength(1)
      expect(tokens[0].usedAt).toBeNull()
    })

    it('auto-creates a Personal workspace even before verification', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validUser)
        .expect(201)

      const memberships = await prisma.membership.findMany({
        include: { workspace: true },
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

    it('rejects passwords without uppercase letter', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...validUser, password: 'lowercase123' })
        .expect(400)
    })

    it('rejects passwords without a number', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...validUser, password: 'NoNumberHere' })
        .expect(400)
    })
  })

  describe('POST /api/auth/login', () => {
    it('refuses login if the email is not verified yet (403)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validUser)
        .expect(201)
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password })
        .expect(403)
      expect(res.body.message).toMatch(/email not verified/i)
    })

    it('allows login after email is verified', async () => {
      await registerAndVerify()
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password })
        .expect(200)
      expect(res.body.accessToken).toEqual(expect.any(String))
    })

    it('rejects wrong password with 401', async () => {
      await registerAndVerify()
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: validUser.email, password: 'WrongPwd123' })
        .expect(401)
    })

    it('rejects unknown email with 401 (no enumeration)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'ghost@example.com', password: 'whatever' })
        .expect(401)
    })

    it('locks the account after 5 failed attempts and returns 403 on the 6th', async () => {
      await registerAndVerify()
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email: validUser.email, password: 'WrongPwd123' })
          .expect(401)
      }
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password })
        .expect(403)
      expect(res.body.message).toMatch(/locked/i)
    })

    it('resets the failure counter on successful login', async () => {
      await registerAndVerify()
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email: validUser.email, password: 'WrongPwd123' })
          .expect(401)
      }
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password })
        .expect(200)
      const user = await prisma.user.findUnique({ where: { email: validUser.email } })
      expect(user?.failedLoginAttempts).toBe(0)
      expect(user?.lockedUntil).toBeNull()
    })
  })

  describe('POST /api/auth/refresh', () => {
    it('rotates refresh token and returns new access token', async () => {
      await registerAndVerify()
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password })
        .expect(200)
      const cookie = loginRes.headers['set-cookie']?.[0]

      const refreshRes = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookie!)
        .expect(200)
      expect(refreshRes.body.accessToken).toEqual(expect.any(String))
    })

    it('rejects requests without refresh cookie', async () => {
      await request(app.getHttpServer()).post('/api/auth/refresh').expect(401)
    })

    it('rejects already-rotated (revoked) refresh tokens', async () => {
      await registerAndVerify()
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password })
        .expect(200)
      const original = loginRes.headers['set-cookie']?.[0]

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', original!)
        .expect(200)
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', original!)
        .expect(401)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('revokes refresh token and clears the cookie', async () => {
      await registerAndVerify()
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password })
        .expect(200)
      const cookie = loginRes.headers['set-cookie']?.[0]

      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Cookie', cookie!)
        .expect(204)
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookie!)
        .expect(401)
    })
  })

  describe('Session revocation', () => {
    it('revokes ALL active refresh tokens when revokeAllSessions is called', async () => {
      await registerAndVerify()
      const loginA = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password })
        .expect(200)
      const cookieA = loginA.headers['set-cookie']?.[0]
      const loginB = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password })
        .expect(200)
      const cookieB = loginB.headers['set-cookie']?.[0]

      const user = await prisma.user.findUnique({ where: { email: validUser.email } })
      await auth.revokeAllSessions(user!.id)

      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookieA!)
        .expect(401)
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', cookieB!)
        .expect(401)
    })
  })

  describe('GET /api/auth/me (protected)', () => {
    it('returns 401 without a Bearer token', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401)
    })

    it('returns the current user when a valid Bearer is provided', async () => {
      await registerAndVerify()
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password })
        .expect(200)
      const meRes = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginRes.body.accessToken}`)
        .expect(200)
      expect(meRes.body).toMatchObject({
        email: validUser.email,
        name: validUser.name,
      })
    })
  })
})
