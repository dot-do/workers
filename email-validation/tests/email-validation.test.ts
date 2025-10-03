// Email Validation Service Tests

import { describe, it, expect, beforeEach } from 'vitest'
import { EmailValidationService } from '../src/index'

describe('EmailValidationService', () => {
  let service: EmailValidationService
  let env: any

  beforeEach(() => {
    env = {
      KV: {
        get: () => Promise.resolve(null),
        put: () => Promise.resolve(),
      },
      DB: {},
      QUEUE: {},
    }
    service = new EmailValidationService({} as any, env)
  })

  describe('validateEmail', () => {
    it('should validate correct Gmail address', async () => {
      const result = await service.validateEmail('user@gmail.com')
      expect(result.valid).toBe(true)
      expect(result.score).toBeGreaterThan(90)
      expect(result.details.provider).toBe('Gmail')
    })

    it('should reject invalid syntax', async () => {
      const result = await service.validateEmail('invalid.email')
      expect(result.valid).toBe(false)
      expect(result.score).toBe(0)
      expect(result.issues.some((i) => i.type === 'syntax')).toBe(true)
    })

    it('should detect disposable email', async () => {
      const result = await service.validateEmail('test@tempmail.com')
      expect(result.details.disposable.isDisposable).toBe(true)
      expect(result.issues.some((i) => i.type === 'disposable')).toBe(true)
    })

    it('should detect role-based address', async () => {
      const result = await service.validateEmail('admin@example.com')
      expect(result.details.role.isRole).toBe(true)
      expect(result.details.role.role).toBe('admin')
      expect(result.issues.some((i) => i.type === 'role')).toBe(true)
    })

    it('should handle missing MX records', async () => {
      const result = await service.validateEmail('user@nonexistentdomain12345.com')
      expect(result.details.mx.valid).toBe(false)
      expect(result.issues.some((i) => i.type === 'mx')).toBe(true)
    })
  })

  describe('bulkValidate', () => {
    it('should validate multiple emails', async () => {
      const emails = ['user1@gmail.com', 'admin@example.com', 'invalid.email', 'test@tempmail.com']
      const result = await service.bulkValidate(emails)

      expect(result.results).toHaveLength(4)
      expect(result.summary.total).toBe(4)
      expect(result.summary.processingTime).toBeGreaterThan(0)
    })

    it('should provide accurate summary stats', async () => {
      const emails = ['user@gmail.com', 'invalid.email']
      const result = await service.bulkValidate(emails)

      expect(result.summary.valid).toBeGreaterThan(0)
      expect(result.summary.invalid).toBeGreaterThan(0)
    })
  })

  describe('syntax validation', () => {
    const testCases = [
      { email: 'simple@example.com', valid: true },
      { email: 'very.common@example.com', valid: true },
      { email: 'disposable.style.email.with+symbol@example.com', valid: true },
      { email: 'other.email-with-hyphen@example.com', valid: true },
      { email: 'x@example.com', valid: true },
      { email: 'example@s.example', valid: true },
      { email: 'plainaddress', valid: false },
      { email: '@no-local.org', valid: false },
      { email: 'missing@domain', valid: false },
      { email: 'two@@example.com', valid: false },
    ]

    testCases.forEach(({ email, valid }) => {
      it(`should ${valid ? 'accept' : 'reject'} ${email}`, async () => {
        const result = await service.validateEmail(email, { checkMX: false })
        expect(result.details.syntax.valid).toBe(valid)
      })
    })
  })

  describe('provider detection', () => {
    const providers = [
      { email: 'user@gmail.com', provider: 'Gmail' },
      { email: 'user@googlemail.com', provider: 'Gmail' },
      { email: 'user@outlook.com', provider: 'Outlook' },
      { email: 'user@hotmail.com', provider: 'Outlook' },
      { email: 'user@yahoo.com', provider: 'Yahoo' },
      { email: 'user@protonmail.com', provider: 'ProtonMail' },
      { email: 'user@custom-domain.com', provider: undefined },
    ]

    providers.forEach(({ email, provider }) => {
      it(`should detect ${provider || 'custom domain'} for ${email}`, async () => {
        const result = await service.validateEmail(email, { checkMX: false })
        expect(result.details.provider).toBe(provider)
      })
    })
  })
})
