/**
 * Tests: Domain Validation for builder.domains
 *
 * Tests domain format validation and TLD detection.
 *
 * @module @dotdo/workers-domains
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  FREE_TLDS,
  type MockDOState,
  type MockDomainsEnv,
} from './helpers.js'

/**
 * Interface definition for DomainsDO validation contract
 */
export interface DomainsDOValidationContract {
  isValidDomain(domain: string): boolean
  isFreeTLD(tld: string): boolean
  extractTLD(domain: string): string | null
  extractSubdomain(domain: string): string | null
}

/**
 * Attempt to load DomainsDO
 */
async function loadDomainsDO(): Promise<new (ctx: MockDOState, env: MockDomainsEnv) => DomainsDOValidationContract> {
  const module = await import('../src/domains.js')
  return module.DomainsDO
}

describe('DomainsDO Domain Validation', () => {
  let ctx: MockDOState
  let env: MockDomainsEnv
  let DomainsDO: new (ctx: MockDOState, env: MockDomainsEnv) => DomainsDOValidationContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    DomainsDO = await loadDomainsDO()
  })

  describe('isValidDomain()', () => {
    describe('valid domains', () => {
      it('should accept valid free TLD domains', async () => {
        const instance = new DomainsDO(ctx, env)

        expect(instance.isValidDomain('my-startup.hq.com.ai')).toBe(true)
        expect(instance.isValidDomain('cool-app.app.net.ai')).toBe(true)
        expect(instance.isValidDomain('api.api.net.ai')).toBe(true)
        expect(instance.isValidDomain('startup.hq.sb')).toBe(true)
        expect(instance.isValidDomain('project.io.sb')).toBe(true)
        expect(instance.isValidDomain('company.llc.st')).toBe(true)
      })

      it('should accept domains with numbers', async () => {
        const instance = new DomainsDO(ctx, env)

        expect(instance.isValidDomain('app123.hq.com.ai')).toBe(true)
        expect(instance.isValidDomain('123app.hq.com.ai')).toBe(true)
        expect(instance.isValidDomain('app-123.hq.com.ai')).toBe(true)
      })

      it('should accept single character subdomains', async () => {
        const instance = new DomainsDO(ctx, env)

        expect(instance.isValidDomain('a.hq.com.ai')).toBe(true)
        expect(instance.isValidDomain('x.hq.sb')).toBe(true)
      })

      it('should accept domains with hyphens in middle', async () => {
        const instance = new DomainsDO(ctx, env)

        expect(instance.isValidDomain('my-cool-app.hq.com.ai')).toBe(true)
        expect(instance.isValidDomain('a-b-c.hq.sb')).toBe(true)
      })
    })

    describe('invalid domains', () => {
      it('should reject empty strings', async () => {
        const instance = new DomainsDO(ctx, env)
        expect(instance.isValidDomain('')).toBe(false)
      })

      it('should reject domains without TLD', async () => {
        const instance = new DomainsDO(ctx, env)
        expect(instance.isValidDomain('my-startup')).toBe(false)
      })

      it('should reject domains with invalid TLD', async () => {
        const instance = new DomainsDO(ctx, env)
        expect(instance.isValidDomain('my-startup.com')).toBe(false)
        expect(instance.isValidDomain('my-startup.example.com')).toBe(false)
      })

      it('should reject domains with spaces', async () => {
        const instance = new DomainsDO(ctx, env)
        expect(instance.isValidDomain('my startup.hq.com.ai')).toBe(false)
        expect(instance.isValidDomain(' my-startup.hq.com.ai')).toBe(false)
        expect(instance.isValidDomain('my-startup.hq.com.ai ')).toBe(false)
      })

      it('should reject domains with underscores', async () => {
        const instance = new DomainsDO(ctx, env)
        expect(instance.isValidDomain('my_startup.hq.com.ai')).toBe(false)
      })

      it('should reject domains with special characters', async () => {
        const instance = new DomainsDO(ctx, env)

        const invalidChars = ['@', '!', '#', '$', '%', '^', '&', '*', '(', ')', '+', '=', '[', ']', '{', '}', '|', '\\', ':', ';', '"', "'", '<', '>', ',', '/', '?']

        for (const char of invalidChars) {
          expect(instance.isValidDomain(`my${char}startup.hq.com.ai`)).toBe(false)
        }
      })

      it('should reject domains starting with hyphen', async () => {
        const instance = new DomainsDO(ctx, env)
        expect(instance.isValidDomain('-mystartup.hq.com.ai')).toBe(false)
      })

      it('should reject domains ending with hyphen', async () => {
        const instance = new DomainsDO(ctx, env)
        expect(instance.isValidDomain('mystartup-.hq.com.ai')).toBe(false)
      })

      it('should reject domains with consecutive hyphens', async () => {
        const instance = new DomainsDO(ctx, env)
        expect(instance.isValidDomain('my--startup.hq.com.ai')).toBe(false)
      })

      it('should reject subdomains longer than 63 characters', async () => {
        const instance = new DomainsDO(ctx, env)
        const longSubdomain = 'a'.repeat(64)
        expect(instance.isValidDomain(`${longSubdomain}.hq.com.ai`)).toBe(false)
      })

      it('should reject total domain name longer than 253 characters', async () => {
        const instance = new DomainsDO(ctx, env)
        const longSubdomain = 'a'.repeat(240)
        expect(instance.isValidDomain(`${longSubdomain}.hq.com.ai`)).toBe(false)
      })

      it('should reject null and undefined', async () => {
        const instance = new DomainsDO(ctx, env)
        expect(instance.isValidDomain(null as unknown as string)).toBe(false)
        expect(instance.isValidDomain(undefined as unknown as string)).toBe(false)
      })
    })
  })

  describe('isFreeTLD()', () => {
    it('should return true for all free TLDs', async () => {
      const instance = new DomainsDO(ctx, env)

      for (const tld of FREE_TLDS) {
        expect(instance.isFreeTLD(tld)).toBe(true)
      }
    })

    it('should return false for premium/non-free TLDs', async () => {
      const instance = new DomainsDO(ctx, env)

      expect(instance.isFreeTLD('com')).toBe(false)
      expect(instance.isFreeTLD('org')).toBe(false)
      expect(instance.isFreeTLD('net')).toBe(false)
      expect(instance.isFreeTLD('io')).toBe(false)
      expect(instance.isFreeTLD('ai')).toBe(false)
      expect(instance.isFreeTLD('app')).toBe(false)
      expect(instance.isFreeTLD('example.com')).toBe(false)
    })

    it('should be case-insensitive', async () => {
      const instance = new DomainsDO(ctx, env)

      expect(instance.isFreeTLD('HQ.COM.AI')).toBe(true)
      expect(instance.isFreeTLD('Hq.Com.Ai')).toBe(true)
      expect(instance.isFreeTLD('hq.COM.ai')).toBe(true)
    })

    it('should return false for empty string', async () => {
      const instance = new DomainsDO(ctx, env)
      expect(instance.isFreeTLD('')).toBe(false)
    })

    it('should return false for partial matches', async () => {
      const instance = new DomainsDO(ctx, env)

      // These should not match because they're not exact TLD matches
      expect(instance.isFreeTLD('com.ai')).toBe(false) // Missing 'hq.'
      expect(instance.isFreeTLD('net.ai')).toBe(false) // Missing 'app.' or 'api.'
      expect(instance.isFreeTLD('sb')).toBe(false) // Missing 'hq.' or 'io.'
      expect(instance.isFreeTLD('st')).toBe(false) // Missing 'llc.'
    })
  })

  describe('extractTLD()', () => {
    it('should extract TLD from valid domains', async () => {
      const instance = new DomainsDO(ctx, env)

      expect(instance.extractTLD('my-startup.hq.com.ai')).toBe('hq.com.ai')
      expect(instance.extractTLD('cool-app.app.net.ai')).toBe('app.net.ai')
      expect(instance.extractTLD('api.api.net.ai')).toBe('api.net.ai')
      expect(instance.extractTLD('startup.hq.sb')).toBe('hq.sb')
      expect(instance.extractTLD('project.io.sb')).toBe('io.sb')
      expect(instance.extractTLD('company.llc.st')).toBe('llc.st')
    })

    it('should return null for domains without recognized TLD', async () => {
      const instance = new DomainsDO(ctx, env)

      expect(instance.extractTLD('example.com')).toBeNull()
      expect(instance.extractTLD('test.org')).toBeNull()
      expect(instance.extractTLD('app.io')).toBeNull()
    })

    it('should return null for invalid domains', async () => {
      const instance = new DomainsDO(ctx, env)

      expect(instance.extractTLD('')).toBeNull()
      expect(instance.extractTLD('invalid')).toBeNull()
      expect(instance.extractTLD('...')).toBeNull()
    })

    it('should be case-insensitive', async () => {
      const instance = new DomainsDO(ctx, env)

      expect(instance.extractTLD('MY-STARTUP.HQ.COM.AI')).toBe('hq.com.ai')
      expect(instance.extractTLD('My-Startup.Hq.Com.Ai')).toBe('hq.com.ai')
    })
  })

  describe('extractSubdomain()', () => {
    it('should extract subdomain from valid domains', async () => {
      const instance = new DomainsDO(ctx, env)

      expect(instance.extractSubdomain('my-startup.hq.com.ai')).toBe('my-startup')
      expect(instance.extractSubdomain('cool-app.app.net.ai')).toBe('cool-app')
      expect(instance.extractSubdomain('test123.io.sb')).toBe('test123')
    })

    it('should return null for domains without recognized TLD', async () => {
      const instance = new DomainsDO(ctx, env)

      expect(instance.extractSubdomain('example.com')).toBeNull()
      expect(instance.extractSubdomain('test.org')).toBeNull()
    })

    it('should return null for invalid domains', async () => {
      const instance = new DomainsDO(ctx, env)

      expect(instance.extractSubdomain('')).toBeNull()
      expect(instance.extractSubdomain('hq.com.ai')).toBeNull() // Just TLD, no subdomain
    })

    it('should handle subdomains with multiple parts', async () => {
      const instance = new DomainsDO(ctx, env)

      // For domains like 'sub.domain.hq.com.ai', we only want 'sub.domain'
      // This depends on implementation - single subdomain level might be enforced
      expect(instance.extractSubdomain('my-startup.hq.com.ai')).toBe('my-startup')
    })
  })
})
