/**
 * Tests: Domain Listing for builder.domains
 *
 * Tests domain listing functionality per organization.
 *
 * @module @dotdo/workers-domains
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  type MockDOState,
  type MockDomainsEnv,
  type DomainRecord,
} from './helpers.js'

/**
 * Interface definition for DomainsDO listing contract
 */
export interface DomainsDOListingContract {
  claim(domain: string, orgId: string): Promise<DomainRecord>
  release(domain: string, orgId: string): Promise<boolean>
  get(domain: string): Promise<DomainRecord | null>
  list(orgId: string, options?: ListOptions): Promise<DomainRecord[]>
  listAll(options?: ListAllOptions): Promise<DomainRecord[]>
  count(orgId: string): Promise<number>
  countAll(): Promise<number>
}

export interface ListOptions {
  limit?: number
  offset?: number
  status?: 'pending' | 'active' | 'error'
  tld?: string
}

export interface ListAllOptions {
  limit?: number
  offset?: number
}

/**
 * Attempt to load DomainsDO
 */
async function loadDomainsDO(): Promise<new (ctx: MockDOState, env: MockDomainsEnv) => DomainsDOListingContract> {
  const module = await import('../src/domains.js')
  return module.DomainsDO
}

describe('DomainsDO Domain Listing', () => {
  let ctx: MockDOState
  let env: MockDomainsEnv
  let DomainsDO: new (ctx: MockDOState, env: MockDomainsEnv) => DomainsDOListingContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    DomainsDO = await loadDomainsDO()
  })

  describe('get()', () => {
    it('should return null for non-existent domain', async () => {
      const instance = new DomainsDO(ctx, env)
      const result = await instance.get('nonexistent.hq.com.ai')
      expect(result).toBeNull()
    })

    it('should return domain record for existing domain', async () => {
      const instance = new DomainsDO(ctx, env)
      await instance.claim('my-startup.hq.com.ai', 'org-123')

      const result = await instance.get('my-startup.hq.com.ai')

      expect(result).not.toBeNull()
      expect(result?.name).toBe('my-startup.hq.com.ai')
      expect(result?.orgId).toBe('org-123')
    })

    it('should be case-insensitive', async () => {
      const instance = new DomainsDO(ctx, env)
      await instance.claim('my-startup.hq.com.ai', 'org-123')

      const result = await instance.get('MY-STARTUP.hq.com.ai')

      expect(result).not.toBeNull()
      expect(result?.name).toBe('my-startup.hq.com.ai')
    })
  })

  describe('list()', () => {
    it('should return empty array for org with no domains', async () => {
      const instance = new DomainsDO(ctx, env)
      const result = await instance.list('org-empty')
      expect(result).toEqual([])
    })

    it('should return all domains for an organization', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('app1.hq.com.ai', 'org-123')
      await instance.claim('app2.hq.com.ai', 'org-123')
      await instance.claim('app3.hq.com.ai', 'org-123')

      const result = await instance.list('org-123')

      expect(result).toHaveLength(3)
      expect(result.map(d => d.name).sort()).toEqual([
        'app1.hq.com.ai',
        'app2.hq.com.ai',
        'app3.hq.com.ai',
      ])
    })

    it('should only return domains for the specified org', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('org1-app.hq.com.ai', 'org-1')
      await instance.claim('org2-app.hq.com.ai', 'org-2')
      await instance.claim('org1-app2.hq.com.ai', 'org-1')

      const result = await instance.list('org-1')

      expect(result).toHaveLength(2)
      expect(result.every(d => d.orgId === 'org-1')).toBe(true)
    })

    it('should respect limit option', async () => {
      const instance = new DomainsDO(ctx, env)

      for (let i = 0; i < 10; i++) {
        await instance.claim(`app${i}.hq.com.ai`, 'org-123')
      }

      const result = await instance.list('org-123', { limit: 5 })

      expect(result).toHaveLength(5)
    })

    it('should respect offset option', async () => {
      const instance = new DomainsDO(ctx, env)

      for (let i = 0; i < 10; i++) {
        await instance.claim(`app${i}.hq.com.ai`, 'org-123')
      }

      const allDomains = await instance.list('org-123')
      const offsetDomains = await instance.list('org-123', { offset: 3 })

      expect(offsetDomains).toHaveLength(7)
    })

    it('should respect limit and offset together', async () => {
      const instance = new DomainsDO(ctx, env)

      for (let i = 0; i < 10; i++) {
        await instance.claim(`app${i}.hq.com.ai`, 'org-123')
      }

      const result = await instance.list('org-123', { limit: 3, offset: 2 })

      expect(result).toHaveLength(3)
    })

    it('should filter by status', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('active1.hq.com.ai', 'org-123')
      await instance.claim('active2.hq.com.ai', 'org-123')

      const result = await instance.list('org-123', { status: 'active' })

      expect(result.every(d => d.status === 'active')).toBe(true)
    })

    it('should filter by TLD', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('app1.hq.com.ai', 'org-123')
      await instance.claim('app2.app.net.ai', 'org-123')
      await instance.claim('app3.hq.com.ai', 'org-123')

      const result = await instance.list('org-123', { tld: 'hq.com.ai' })

      expect(result).toHaveLength(2)
      expect(result.every(d => d.tld === 'hq.com.ai')).toBe(true)
    })
  })

  describe('listAll()', () => {
    it('should return all domains across all orgs', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('org1-app.hq.com.ai', 'org-1')
      await instance.claim('org2-app.hq.com.ai', 'org-2')
      await instance.claim('org3-app.hq.com.ai', 'org-3')

      const result = await instance.listAll()

      expect(result).toHaveLength(3)
    })

    it('should respect limit option', async () => {
      const instance = new DomainsDO(ctx, env)

      for (let i = 0; i < 20; i++) {
        await instance.claim(`app${i}.hq.com.ai`, `org-${i % 5}`)
      }

      const result = await instance.listAll({ limit: 10 })

      expect(result).toHaveLength(10)
    })

    it('should respect offset option', async () => {
      const instance = new DomainsDO(ctx, env)

      for (let i = 0; i < 20; i++) {
        await instance.claim(`app${i}.hq.com.ai`, `org-${i % 5}`)
      }

      const result = await instance.listAll({ offset: 15 })

      expect(result).toHaveLength(5)
    })
  })

  describe('count()', () => {
    it('should return 0 for org with no domains', async () => {
      const instance = new DomainsDO(ctx, env)
      const result = await instance.count('org-empty')
      expect(result).toBe(0)
    })

    it('should return correct count for org', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('app1.hq.com.ai', 'org-123')
      await instance.claim('app2.hq.com.ai', 'org-123')
      await instance.claim('app3.hq.com.ai', 'org-456')

      const result = await instance.count('org-123')

      expect(result).toBe(2)
    })
  })

  describe('countAll()', () => {
    it('should return 0 when no domains exist', async () => {
      const instance = new DomainsDO(ctx, env)
      const result = await instance.countAll()
      expect(result).toBe(0)
    })

    it('should return total count across all orgs', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('app1.hq.com.ai', 'org-1')
      await instance.claim('app2.hq.com.ai', 'org-2')
      await instance.claim('app3.hq.com.ai', 'org-3')

      const result = await instance.countAll()

      expect(result).toBe(3)
    })
  })

  describe('Domain record updates in list', () => {
    it('should reflect released domains', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('app1.hq.com.ai', 'org-123')
      await instance.claim('app2.hq.com.ai', 'org-123')

      let result = await instance.list('org-123')
      expect(result).toHaveLength(2)

      await instance.release('app1.hq.com.ai', 'org-123')

      result = await instance.list('org-123')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('app2.hq.com.ai')
    })

    it('should reflect newly claimed domains', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('app1.hq.com.ai', 'org-123')

      let result = await instance.list('org-123')
      expect(result).toHaveLength(1)

      await instance.claim('app2.hq.com.ai', 'org-123')

      result = await instance.list('org-123')
      expect(result).toHaveLength(2)
    })
  })
})
