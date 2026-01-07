/**
 * Tests: Domain Claiming for builder.domains
 *
 * Tests domain claiming functionality for free TLDs:
 * - hq.com.ai, app.net.ai, api.net.ai, hq.sb, io.sb, llc.st
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
  type DomainRecord,
} from './helpers.js'

/**
 * Interface definition for DomainsDO - this defines the contract
 */
export interface DomainsDOContract {
  // Domain claiming
  claim(domain: string, orgId: string): Promise<DomainRecord>
  release(domain: string, orgId: string): Promise<boolean>

  // Domain lookup
  get(domain: string): Promise<DomainRecord | null>
  list(orgId: string): Promise<DomainRecord[]>

  // Validation
  isValidDomain(domain: string): boolean
  isFreeTLD(tld: string): boolean
  extractTLD(domain: string): string | null

  // RPC interface
  hasMethod(name: string): boolean
  invoke(method: string, params: unknown[]): Promise<unknown>

  // HTTP handlers
  fetch(request: Request): Promise<Response>
}

/**
 * Attempt to load DomainsDO
 */
async function loadDomainsDO(): Promise<new (ctx: MockDOState, env: MockDomainsEnv) => DomainsDOContract> {
  const module = await import('../src/domains.js')
  return module.DomainsDO
}

describe('DomainsDO Domain Claiming', () => {
  let ctx: MockDOState
  let env: MockDomainsEnv
  let DomainsDO: new (ctx: MockDOState, env: MockDomainsEnv) => DomainsDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    DomainsDO = await loadDomainsDO()
  })

  describe('claim()', () => {
    describe('free TLD domains', () => {
      it('should claim a valid hq.com.ai domain', async () => {
        const instance = new DomainsDO(ctx, env)
        const result = await instance.claim('my-startup.hq.com.ai', 'org-123')

        expect(result.name).toBe('my-startup.hq.com.ai')
        expect(result.orgId).toBe('org-123')
        expect(result.tld).toBe('hq.com.ai')
        expect(result.status).toBe('active')
        expect(result.id).toBeDefined()
      })

      it('should claim a valid app.net.ai domain', async () => {
        const instance = new DomainsDO(ctx, env)
        const result = await instance.claim('cool-app.app.net.ai', 'org-123')

        expect(result.name).toBe('cool-app.app.net.ai')
        expect(result.tld).toBe('app.net.ai')
        expect(result.status).toBe('active')
      })

      it('should claim a valid api.net.ai domain', async () => {
        const instance = new DomainsDO(ctx, env)
        const result = await instance.claim('my-api.api.net.ai', 'org-123')

        expect(result.name).toBe('my-api.api.net.ai')
        expect(result.tld).toBe('api.net.ai')
      })

      it('should claim a valid hq.sb domain', async () => {
        const instance = new DomainsDO(ctx, env)
        const result = await instance.claim('startup.hq.sb', 'org-123')

        expect(result.name).toBe('startup.hq.sb')
        expect(result.tld).toBe('hq.sb')
      })

      it('should claim a valid io.sb domain', async () => {
        const instance = new DomainsDO(ctx, env)
        const result = await instance.claim('project.io.sb', 'org-123')

        expect(result.name).toBe('project.io.sb')
        expect(result.tld).toBe('io.sb')
      })

      it('should claim a valid llc.st domain', async () => {
        const instance = new DomainsDO(ctx, env)
        const result = await instance.claim('company.llc.st', 'org-123')

        expect(result.name).toBe('company.llc.st')
        expect(result.tld).toBe('llc.st')
      })

      it('should support all free TLDs', async () => {
        const instance = new DomainsDO(ctx, env)

        for (const tld of FREE_TLDS) {
          const domain = `test-${tld.replace(/\./g, '-')}.${tld}`
          const result = await instance.claim(domain, 'org-123')
          expect(result.tld).toBe(tld)
        }
      })
    })

    describe('domain name validation', () => {
      it('should accept valid subdomain names', async () => {
        const instance = new DomainsDO(ctx, env)

        // Valid names
        const validNames = [
          'my-startup',
          'cool-app',
          'test123',
          'a',
          'abc-def-ghi',
          '123',
          'my-cool-app-2024',
        ]

        for (const name of validNames) {
          const result = await instance.claim(`${name}.hq.com.ai`, 'org-123')
          expect(result.name).toBe(`${name}.hq.com.ai`)
        }
      })

      it('should reject empty domain names', async () => {
        const instance = new DomainsDO(ctx, env)
        await expect(instance.claim('', 'org-123')).rejects.toThrow(/invalid.*domain/i)
      })

      it('should reject domain names with spaces', async () => {
        const instance = new DomainsDO(ctx, env)
        await expect(instance.claim('my startup.hq.com.ai', 'org-123')).rejects.toThrow(/invalid.*domain/i)
      })

      it('should reject domain names with special characters', async () => {
        const instance = new DomainsDO(ctx, env)
        await expect(instance.claim('my_startup.hq.com.ai', 'org-123')).rejects.toThrow(/invalid.*domain/i)
        await expect(instance.claim('my@startup.hq.com.ai', 'org-123')).rejects.toThrow(/invalid.*domain/i)
        await expect(instance.claim('my!startup.hq.com.ai', 'org-123')).rejects.toThrow(/invalid.*domain/i)
      })

      it('should reject domain names starting or ending with hyphen', async () => {
        const instance = new DomainsDO(ctx, env)
        await expect(instance.claim('-mystartup.hq.com.ai', 'org-123')).rejects.toThrow(/invalid.*domain/i)
        await expect(instance.claim('mystartup-.hq.com.ai', 'org-123')).rejects.toThrow(/invalid.*domain/i)
      })

      it('should reject domain names that are too long', async () => {
        const instance = new DomainsDO(ctx, env)
        const longName = 'a'.repeat(64) // DNS label max is 63
        await expect(instance.claim(`${longName}.hq.com.ai`, 'org-123')).rejects.toThrow(/invalid.*domain|too long/i)
      })

      it('should convert domain names to lowercase', async () => {
        const instance = new DomainsDO(ctx, env)
        const result = await instance.claim('My-STARTUP.hq.com.ai', 'org-123')
        expect(result.name).toBe('my-startup.hq.com.ai')
      })
    })

    describe('organization validation', () => {
      it('should reject empty org ID', async () => {
        const instance = new DomainsDO(ctx, env)
        await expect(instance.claim('my-startup.hq.com.ai', '')).rejects.toThrow(/invalid.*org/i)
      })

      it('should associate domain with correct org', async () => {
        const instance = new DomainsDO(ctx, env)
        const result = await instance.claim('my-startup.hq.com.ai', 'org-456')
        expect(result.orgId).toBe('org-456')
      })
    })
  })

  describe('Domain availability', () => {
    it('should reject already claimed domains', async () => {
      const instance = new DomainsDO(ctx, env)

      // First claim should succeed
      await instance.claim('my-startup.hq.com.ai', 'org-123')

      // Second claim should fail
      await expect(instance.claim('my-startup.hq.com.ai', 'org-456')).rejects.toThrow(/already claimed|taken|unavailable/i)
    })

    it('should allow same org to reclaim their domain after release', async () => {
      const instance = new DomainsDO(ctx, env)

      // Claim
      await instance.claim('my-startup.hq.com.ai', 'org-123')

      // Release
      await instance.release('my-startup.hq.com.ai', 'org-123')

      // Reclaim should succeed
      const result = await instance.claim('my-startup.hq.com.ai', 'org-123')
      expect(result.name).toBe('my-startup.hq.com.ai')
    })

    it('should allow different org to claim released domain', async () => {
      const instance = new DomainsDO(ctx, env)

      // Claim by org-123
      await instance.claim('my-startup.hq.com.ai', 'org-123')

      // Release by org-123
      await instance.release('my-startup.hq.com.ai', 'org-123')

      // Claim by org-456 should succeed
      const result = await instance.claim('my-startup.hq.com.ai', 'org-456')
      expect(result.orgId).toBe('org-456')
    })
  })

  describe('release()', () => {
    it('should release owned domain', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('my-startup.hq.com.ai', 'org-123')
      const released = await instance.release('my-startup.hq.com.ai', 'org-123')

      expect(released).toBe(true)
    })

    it('should return false for non-existent domain', async () => {
      const instance = new DomainsDO(ctx, env)
      const released = await instance.release('nonexistent.hq.com.ai', 'org-123')
      expect(released).toBe(false)
    })

    it('should not allow releasing domain owned by another org', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('my-startup.hq.com.ai', 'org-123')

      // org-456 should not be able to release
      await expect(instance.release('my-startup.hq.com.ai', 'org-456')).rejects.toThrow(/not authorized|permission|forbidden/i)
    })

    it('should remove domain from storage after release', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('my-startup.hq.com.ai', 'org-123')
      await instance.release('my-startup.hq.com.ai', 'org-123')

      const domain = await instance.get('my-startup.hq.com.ai')
      expect(domain).toBeNull()
    })
  })

  describe('Domain record metadata', () => {
    it('should include createdAt timestamp', async () => {
      const instance = new DomainsDO(ctx, env)
      const before = Date.now()
      const result = await instance.claim('my-startup.hq.com.ai', 'org-123')
      const after = Date.now()

      expect(result.createdAt).toBeGreaterThanOrEqual(before)
      expect(result.createdAt).toBeLessThanOrEqual(after)
    })

    it('should include updatedAt timestamp', async () => {
      const instance = new DomainsDO(ctx, env)
      const result = await instance.claim('my-startup.hq.com.ai', 'org-123')

      expect(result.updatedAt).toBeDefined()
      expect(result.updatedAt).toBeGreaterThanOrEqual(result.createdAt)
    })

    it('should generate unique domain ID', async () => {
      const instance = new DomainsDO(ctx, env)

      const result1 = await instance.claim('startup1.hq.com.ai', 'org-123')
      const result2 = await instance.claim('startup2.hq.com.ai', 'org-123')

      expect(result1.id).toBeDefined()
      expect(result2.id).toBeDefined()
      expect(result1.id).not.toBe(result2.id)
    })
  })
})
