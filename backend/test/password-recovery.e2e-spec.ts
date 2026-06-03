import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import request from 'supertest'

import { AppModule } from '../src/app.module'
import { PrismaService } from '../src/prisma/prisma.service'
import { resetDatabase } from './setup-db'

describe('Password recovery (e2e)', () => {
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

  async function registerUser(): Promise<void> {
    await request(app.getHttpServer())
      .post('/api/auth/register')
      .send(validUser)
      .expect(201)
    // Mark as verified so subsequent logins work (we test verification separately).
    await prisma.user.update({
      where: { email: validUser.email },
      data: { emailVerifiedAt: new Date() },
    })
  }

  describe('POST /api/auth/forgot-password', () => {
    it('returns 204 for a registered email and creates a reset token in DB', async () => {
      await registerUser()

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: validUser.email })
        .expect(204)

      const tokens = await prisma.passwordResetToken.findMany()
      expect(tokens).toHaveLength(1)
      expect(tokens[0].usedAt).toBeNull()
      expect(tokens[0].expiresAt.getTime()).toBeGreaterThan(Date.now())
    })

    it('returns 204 for an unregistered email but does NOT create a token (no user enumeration)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'ghost@example.com' })
        .expect(204)

      const tokens = await prisma.passwordResetToken.findMany()
      expect(tokens).toHaveLength(0)
    })

    it('invalidates previous unused tokens when a new one is requested', async () => {
      await registerUser()

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: validUser.email })
        .expect(204)

      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: validUser.email })
        .expect(204)

      const tokens = await prisma.passwordResetToken.findMany({
        orderBy: { createdAt: 'asc' },
      })
      expect(tokens).toHaveLength(2)
      expect(tokens[0].usedAt).not.toBeNull() // first one invalidated
      expect(tokens[1].usedAt).toBeNull() // second one still valid
    })

    it('rejects invalid email format with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400)
    })
  })

  describe('POST /api/auth/reset-password', () => {
    async function generateResetToken(): Promise<string> {
      // For tests we go through the service to capture the raw token. Easiest
      // route: register, then read the hashed token from DB, but we can't
      // un-hash. Instead we create a token directly via Prisma (skipping the
      // mailer side-effect) and remember the raw value.
      await registerUser()
      const user = await prisma.user.findUnique({ where: { email: validUser.email } })

      // Use the same approach as the service so the hashes match.
      const { randomBytes, createHash } = await import('node:crypto')
      const raw = randomBytes(32).toString('base64url')
      const hash = createHash('sha256').update(raw).digest('hex')

      await prisma.passwordResetToken.create({
        data: {
          token: hash,
          userId: user!.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      })

      return raw
    }

    it('resets the password with a valid token and revokes all sessions', async () => {
      const raw = await generateResetToken()

      // First, login to create an active refresh token.
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password })
        .expect(200)
      const sessionCookie = loginRes.headers['set-cookie']?.[0]

      const newPassword = 'NewSecurePassword456'
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: raw, password: newPassword })
        .expect(204)

      // Old password no longer works.
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: validUser.email, password: validUser.password })
        .expect(401)

      // New password works.
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: validUser.email, password: newPassword })
        .expect(200)

      // The previous active session was revoked.
      await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', sessionCookie!)
        .expect(401)
    })

    it('marks the token as used so it cannot be reused', async () => {
      const raw = await generateResetToken()
      const newPassword = 'NewSecurePassword456'

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: raw, password: newPassword })
        .expect(204)

      // Reusing the same token must fail.
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: raw, password: 'AnotherPassword789' })
        .expect(401)
    })

    it('rejects expired tokens', async () => {
      await registerUser()
      const user = await prisma.user.findUnique({
        where: { email: validUser.email },
      })

      const { randomBytes, createHash } = await import('node:crypto')
      const raw = randomBytes(32).toString('base64url')
      const hash = createHash('sha256').update(raw).digest('hex')

      await prisma.passwordResetToken.create({
        data: {
          token: hash,
          userId: user!.id,
          expiresAt: new Date(Date.now() - 1000), // already expired
        },
      })

      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: raw, password: 'NewSecurePassword456' })
        .expect(401)
    })

    it('rejects unknown tokens', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: 'definitely-not-a-real-token-string-1234567890', password: 'NewSecurePassword456' })
        .expect(401)
    })

    it('rejects weak passwords on reset', async () => {
      const raw = await generateResetToken()
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: raw, password: 'weak' })
        .expect(400)
    })

    it('resets the lockout state along with the password', async () => {
      const raw = await generateResetToken()

      // Trigger 5 failed logins to lock the account.
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email: validUser.email, password: 'WrongPwd123' })
          .expect(401)
      }
      const lockedUser = await prisma.user.findUnique({
        where: { email: validUser.email },
      })
      expect(lockedUser?.lockedUntil).not.toBeNull()

      // Reset password.
      await request(app.getHttpServer())
        .post('/api/auth/reset-password')
        .send({ token: raw, password: 'NewSecurePassword456' })
        .expect(204)

      // Lockout cleared.
      const unlocked = await prisma.user.findUnique({
        where: { email: validUser.email },
      })
      expect(unlocked?.failedLoginAttempts).toBe(0)
      expect(unlocked?.lockedUntil).toBeNull()
    })
  })
})
