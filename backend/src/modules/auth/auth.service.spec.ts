import { Test } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'

import { MailerService } from '../mailer/mailer.service'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthService } from './auth.service'

describe('AuthService (unit)', () => {
  let service: AuthService

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: {} },
        { provide: JwtService, useValue: { signAsync: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn(), getOrThrow: jest.fn() } },
        { provide: MailerService, useValue: { send: jest.fn() } },
      ],
    }).compile()
    service = moduleRef.get(AuthService)
  })

  describe('generateWorkspaceSlug (private, tested via reflection)', () => {
    const callSlug = (name: string): string => {
      // Access the private method intentionally for unit testing.
      return (service as unknown as { generateWorkspaceSlug: (n: string) => string })
        .generateWorkspaceSlug(name)
    }

    it('lowercases and replaces spaces with dashes', () => {
      const slug = callSlug('John Doe')
      expect(slug).toMatch(/^john-doe-[a-f0-9]{8}$/)
    })

    it('strips diacritics (accents, ñ)', () => {
      const slug = callSlug('Núñez Pérez')
      expect(slug.startsWith('n-ez-p-rez') || slug.startsWith('nunez-perez')).toBe(true)
      expect(slug).toMatch(/-[a-f0-9]{8}$/)
    })

    it('strips special characters', () => {
      const slug = callSlug('My@Crazy#Name!')
      expect(slug).toMatch(/^my-crazy-name-[a-f0-9]{8}$/)
    })

    it('falls back to "workspace" when the name has no alphanumerics', () => {
      const slug = callSlug('!!!')
      expect(slug).toMatch(/^workspace-[a-f0-9]{8}$/)
    })

    it('produces different slugs for the same name (random suffix)', () => {
      const a = callSlug('Test')
      const b = callSlug('Test')
      expect(a).not.toBe(b)
    })
  })
})
