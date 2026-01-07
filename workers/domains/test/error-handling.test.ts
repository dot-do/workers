/**
 * Tests: Error Handling for builder.domains
 *
 * Tests error handling and edge cases.
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
  type RouteConfig,
} from './helpers.js'

/**
 * Interface definition for DomainsDO error handling contract
 */
export interface DomainsDOErrorContract {
  claim(domain: string, orgId: string): Promise<DomainRecord>
  release(domain: string, orgId: string): Promise<boolean>
  route(domain: string, config: RouteConfig, orgId: string): Promise<DomainRecord>
  get(domain: string): Promise<DomainRecord | null>
  list(orgId: string): Promise<DomainRecord[]>
  invoke(method: string, params: unknown[]): Promise<unknown>
  fetch(request: Request): Promise<Response>
}

/**
 * Attempt to load DomainsDO
 */
async function loadDomainsDO(): Promise<new (ctx: MockDOState, env: MockDomainsEnv) => DomainsDOErrorContract> {
  const module = await import('../src/domains.js')
  return module.DomainsDO
}

describe('DomainsDO Error Handling', () => {
  let ctx: MockDOState
  let env: MockDomainsEnv
  let DomainsDO: new (ctx: MockDOState, env: MockDomainsEnv) => DomainsDOErrorContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    DomainsDO = await loadDomainsDO()
  })

  describe('Non-supported domain rejection', () => {
    // Non-free TLDs are rejected because they don't match our supported TLDs
    // The error is "Invalid domain format" because we only support specific free TLDs
    it('should reject .com domains as invalid format', async () => {
      const instance = new DomainsDO(ctx, env)
      await expect(instance.claim('example.com', 'org-123'))
        .rejects.toThrow(/invalid.*domain|format/i)
    })

    it('should reject .org domains as invalid format', async () => {
      const instance = new DomainsDO(ctx, env)
      await expect(instance.claim('example.org', 'org-123'))
        .rejects.toThrow(/invalid.*domain|format/i)
    })

    it('should reject .io domains as invalid format', async () => {
      const instance = new DomainsDO(ctx, env)
      await expect(instance.claim('myapp.io', 'org-123'))
        .rejects.toThrow(/invalid.*domain|format/i)
    })

    it('should reject .ai domains (non-free TLD) as invalid format', async () => {
      const instance = new DomainsDO(ctx, env)
      await expect(instance.claim('myapp.ai', 'org-123'))
        .rejects.toThrow(/invalid.*domain|format/i)
    })

    it('should reject custom domains as invalid format', async () => {
      const instance = new DomainsDO(ctx, env)
      await expect(instance.claim('mycustom.domain.com', 'org-123'))
        .rejects.toThrow(/invalid.*domain|format/i)
    })

    it('should provide error message for unsupported domains', async () => {
      const instance = new DomainsDO(ctx, env)

      try {
        await instance.claim('example.com', 'org-123')
        expect.fail('Should have thrown')
      } catch (error) {
        const message = (error as Error).message
        expect(message.length).toBeGreaterThan(10)
        // Should indicate the domain format is invalid (because TLD is not supported)
        expect(message.toLowerCase()).toMatch(/invalid.*domain|format/i)
      }
    })
  })

  describe('Domain already taken', () => {
    it('should reject claiming already taken domain', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('taken.hq.com.ai', 'org-123')

      await expect(instance.claim('taken.hq.com.ai', 'org-456'))
        .rejects.toThrow(/already claimed|taken|unavailable/i)
    })

    it('should reject same org claiming same domain twice', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('taken.hq.com.ai', 'org-123')

      await expect(instance.claim('taken.hq.com.ai', 'org-123'))
        .rejects.toThrow(/already claimed|taken|unavailable/i)
    })
  })

  describe('Input validation errors', () => {
    it('should reject invalid domain format', async () => {
      const instance = new DomainsDO(ctx, env)

      await expect(instance.claim('invalid domain.hq.com.ai', 'org-123'))
        .rejects.toThrow(/invalid.*domain/i)
    })

    it('should reject empty org ID', async () => {
      const instance = new DomainsDO(ctx, env)

      await expect(instance.claim('valid.hq.com.ai', ''))
        .rejects.toThrow(/invalid.*org/i)
    })

    it('should reject null domain', async () => {
      const instance = new DomainsDO(ctx, env)

      await expect(instance.claim(null as unknown as string, 'org-123'))
        .rejects.toThrow(/invalid.*domain/i)
    })

    it('should reject undefined domain', async () => {
      const instance = new DomainsDO(ctx, env)

      await expect(instance.claim(undefined as unknown as string, 'org-123'))
        .rejects.toThrow(/invalid.*domain/i)
    })
  })

  describe('Authorization errors', () => {
    it('should reject release by non-owner', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('owned.hq.com.ai', 'org-123')

      await expect(instance.release('owned.hq.com.ai', 'org-456'))
        .rejects.toThrow(/not authorized|permission|forbidden/i)
    })

    it('should reject routing by non-owner', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('owned.hq.com.ai', 'org-123')

      await expect(instance.route('owned.hq.com.ai', { worker: 'test' }, 'org-456'))
        .rejects.toThrow(/not authorized|permission|forbidden/i)
    })
  })

  describe('HTTP error responses', () => {
    it('should return 400 for malformed JSON', async () => {
      const instance = new DomainsDO(ctx, env)
      const request = new Request('http://builder.domains/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json {',
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(400)

      const data = await response.json() as { error: string }
      expect(data.error).toMatch(/json|parse/i)
    })

    it('should return 404 for non-existent routes', async () => {
      const instance = new DomainsDO(ctx, env)
      const request = new Request('http://builder.domains/nonexistent', { method: 'GET' })

      const response = await instance.fetch(request)
      expect(response.status).toBe(404)
    })

    it('should return 405 for unsupported methods', async () => {
      const instance = new DomainsDO(ctx, env)
      const request = new Request('http://builder.domains/api/domains', { method: 'PATCH' })

      const response = await instance.fetch(request)
      expect(response.status).toBe(405)
    })

    it('should return 403 for unauthorized access', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('protected.hq.com.ai', 'org-123')

      const request = new Request('http://builder.domains/rpc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Org-ID': 'org-456', // Different org
        },
        body: JSON.stringify({
          method: 'release',
          params: ['protected.hq.com.ai'],
        }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(403)
    })
  })

  describe('RPC error handling', () => {
    it('should reject unknown methods', async () => {
      const instance = new DomainsDO(ctx, env)

      await expect(instance.invoke('unknownMethod', []))
        .rejects.toThrow(/not allowed|not found|unknown/i)
    })

    it('should reject methods with missing parameters', async () => {
      const instance = new DomainsDO(ctx, env)

      // claim requires domain and orgId
      await expect(instance.invoke('claim', []))
        .rejects.toThrow(/invalid|required|parameter/i)

      await expect(instance.invoke('claim', ['domain.hq.com.ai']))
        .rejects.toThrow(/invalid|required|parameter/i)
    })

    it('should reject methods with wrong parameter types', async () => {
      const instance = new DomainsDO(ctx, env)

      // domain should be string, not number
      await expect(instance.invoke('claim', [123, 'org-123']))
        .rejects.toThrow(/invalid|type/i)
    })
  })

  describe('Storage error recovery', () => {
    it('should handle storage read errors', async () => {
      const instance = new DomainsDO(ctx, env)
      await instance.claim('test.hq.com.ai', 'org-123')

      // Simulate storage failure
      const originalGet = ctx.storage.get
      ctx.storage.get = async () => { throw new Error('Storage read failed') }

      await expect(instance.get('test.hq.com.ai'))
        .rejects.toThrow(/storage|read|failed/i)

      // Restore
      ctx.storage.get = originalGet
    })

    it('should handle storage write errors', async () => {
      const instance = new DomainsDO(ctx, env)

      // Simulate storage failure
      ctx.storage.put = async () => { throw new Error('Storage write failed') }

      await expect(instance.claim('test.hq.com.ai', 'org-123'))
        .rejects.toThrow(/storage|write|failed/i)
    })
  })

  describe('Error message sanitization', () => {
    it('should not expose internal details in HTTP responses', async () => {
      const instance = new DomainsDO(ctx, env)
      ctx.storage.get = async () => { throw new Error('Internal: SECRET_KEY=abc123 PATH=/etc/secrets') }

      const request = new Request('http://builder.domains/api/domains/test.hq.com.ai', { method: 'GET' })
      const response = await instance.fetch(request)
      const data = await response.json() as { error: string }

      expect(data.error).not.toContain('SECRET_KEY')
      expect(data.error).not.toContain('abc123')
      expect(data.error).not.toContain('/etc/secrets')
    })

    it('should return user-friendly error messages', async () => {
      const instance = new DomainsDO(ctx, env)

      const request = new Request('http://builder.domains/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method: 'claim', params: [] }),
      })

      const response = await instance.fetch(request)
      const data = await response.json() as { error: string }

      expect(data.error.length).toBeGreaterThan(0)
      expect(data.error.length).toBeLessThan(500)
    })
  })

  describe('Concurrent operation handling', () => {
    it('should handle sequential claims for same domain', async () => {
      const instance = new DomainsDO(ctx, env)

      // First claim succeeds
      await instance.claim('contested.hq.com.ai', 'org-1')

      // Second claim fails because domain is taken
      await expect(instance.claim('contested.hq.com.ai', 'org-2'))
        .rejects.toThrow(/already claimed/i)
    })

    it('should handle sequential releases gracefully', async () => {
      const instance = new DomainsDO(ctx, env)
      await instance.claim('concurrent.hq.com.ai', 'org-123')

      // First release succeeds
      const result1 = await instance.release('concurrent.hq.com.ai', 'org-123')
      expect(result1).toBe(true)

      // Second release returns false (domain no longer exists)
      const result2 = await instance.release('concurrent.hq.com.ai', 'org-123')
      expect(result2).toBe(false)
    })

    it('should use blockConcurrencyWhile for claim operations', async () => {
      const instance = new DomainsDO(ctx, env)
      await instance.claim('test.hq.com.ai', 'org-123')

      // Verify blockConcurrencyWhile was called
      expect(ctx.blockConcurrencyWhile).toHaveBeenCalled()
    })
  })

  describe('Rate limiting', () => {
    it('should return 429 when rate limit exceeded', async () => {
      const instance = new DomainsDO(ctx, env)

      // Simulate many rapid requests
      const requests: Promise<Response>[] = []
      for (let i = 0; i < 1000; i++) {
        requests.push(instance.fetch(new Request('http://builder.domains/api/domains', { method: 'GET' })))
      }

      const responses = await Promise.all(requests)
      const rateLimited = responses.filter(r => r.status === 429)

      // At least some should be rate limited
      expect(rateLimited.length).toBeGreaterThan(0)
    })
  })
})
