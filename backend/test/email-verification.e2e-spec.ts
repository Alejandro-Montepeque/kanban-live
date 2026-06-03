import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'
import { resetDatabase } from './setup-db'

describe('Email verification (e2e)', () => {
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
    password: 'CorrectHorse123',
  }

  // Inserts a token directly so tests have the raw value (the service hashes it).
  async function createVerificationToken(): Promise<string> {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(validUser)
      .expect(201)
    const user = await prisma.user.findUnique({ where: { email: validUser.email } })

    // Invalidate the auto-generated token so our test token is the only valid one.
    await prisma.emailVerificationToken.updateMany({
      where: { userId: user!.id },
      data: { usedAt: new Date() },
    })

    const { randomBytes, createHash } = await import('node:crypto')
    const raw = randomBytes(32).toString('base64url')
    const hash = createHash('sha256').update(raw).digest('hex')

    await prisma.emailVerificationToken.create({
      data: {
        token: hash,
        userId: user!.id,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    return raw
  }

  describe('POST /api/auth/verify-email', () => {
    it('marks the user as verified with a valid token', async () => {
      const raw = await createVerificationToken()

      await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ token: raw })
        .expect(204)

      const user = await prisma.user.findUnique({ where: { email: validUser.email } })
      expect(user?.emailVerifiedAt).not.toBeNull()
    })

    it('lets the user log in after verification', async () => {
      const raw = await createVerificationToken()
      await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ token: raw })
        .expect(204)

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password })
        .expect(200)
    })

    it('marks the token as used (one-time use)', async () => {
      const raw = await createVerificationToken()
      await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ token: raw })
        .expect(204)

      // Second use of the same token must fail.
      await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ token: raw })
        .expect(401)
    })

    it('rejects expired tokens', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validUser)
        .expect(201)
      const user = await prisma.user.findUnique({ where: { email: validUser.email } })
      await prisma.emailVerificationToken.updateMany({
        where: { userId: user!.id },
        data: { usedAt: new Date() },
      })

      const { randomBytes, createHash } = await import('node:crypto')
      const raw = randomBytes(32).toString('base64url')
      const hash = createHash('sha256').update(raw).digest('hex')

      await prisma.emailVerificationToken.create({
        data: {
          token: hash,
          userId: user!.id,
          expiresAt: new Date(Date.now() - 1000), // expired
        },
      })

      await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ token: raw })
        .expect(401)
    })

    it('rejects unknown tokens', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/verify-email')
        .send({ token: 'definitely-not-a-real-verification-token-1234567890' })
        .expect(401)
    })
  })

  describe('POST /api/auth/resend-verification', () => {
    it('returns 204 for an unverified registered email and creates a new token', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validUser)
        .expect(201)
      const before = await prisma.emailVerificationToken.findMany()

      await request(app.getHttpServer())
        .post('/api/auth/resend-verification')
        .send({ email: validUser.email })
        .expect(204)

      const after = await prisma.emailVerificationToken.findMany()
      expect(after.length).toBeGreaterThan(before.length)
      // Newly created token still valid.
      const fresh = after.find((t) => t.usedAt === null)
      expect(fresh).toBeDefined()
    })

    it('returns 204 for an unknown email (no enumeration)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/resend-verification')
        .send({ email: 'ghost@example.com' })
        .expect(204)
      const tokens = await prisma.emailVerificationToken.findMany()
      expect(tokens).toHaveLength(0)
    })

    it('returns 204 but does NOT create a new token for already-verified users', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validUser)
        .expect(201)
      await prisma.user.update({
        where: { email: validUser.email },
        data: { emailVerifiedAt: new Date() },
      })

      const before = await prisma.emailVerificationToken.findMany()
      await request(app.getHttpServer())
        .post('/api/auth/resend-verification')
        .send({ email: validUser.email })
        .expect(204)
      const after = await prisma.emailVerificationToken.findMany()
      expect(after.length).toBe(before.length)
    })

    it('invalidates previous unused verification tokens when a new one is requested', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(validUser)
        .expect(201)
      await request(app.getHttpServer())
        .post('/api/auth/resend-verification')
        .send({ email: validUser.email })
        .expect(204)

      const tokens = await prisma.emailVerificationToken.findMany({
        orderBy: { createdAt: 'asc' },
      })
      expect(tokens).toHaveLength(2)
      expect(tokens[0].usedAt).not.toBeNull() // first one invalidated
      expect(tokens[1].usedAt).toBeNull() // second one still valid
    })
  })
})
