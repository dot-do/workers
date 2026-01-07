/**
 * Tests: RPC Interface for builder.domains
 *
 * Tests RPC methods and HTTP endpoints.
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
 * Interface definition for DomainsDO RPC contract
 */
export interface DomainsDORPCContract {
  // Domain operations
  claim(domain: string, orgId: string): Promise<DomainRecord>
  release(domain: string, orgId: string): Promise<boolean>
  route(domain: string, config: RouteConfig, orgId: string): Promise<DomainRecord>
  unroute(domain: string, orgId: string): Promise<DomainRecord>
  get(domain: string): Promise<DomainRecord | null>
  list(orgId: string): Promise<DomainRecord[]>

  // RPC interface
  hasMethod(name: string): boolean
  invoke(method: string, params: unknown[]): Promise<unknown>

  // HTTP handlers
  fetch(request: Request): Promise<Response>
}

/**
 * Attempt to load DomainsDO
 */
async function loadDomainsDO(): Promise<new (ctx: MockDOState, env: MockDomainsEnv) => DomainsDORPCContract> {
  const module = await import('../src/domains.js')
  return module.DomainsDO
}

describe('DomainsDO RPC Interface', () => {
  let ctx: MockDOState
  let env: MockDomainsEnv
  let DomainsDO: new (ctx: MockDOState, env: MockDomainsEnv) => DomainsDORPCContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    DomainsDO = await loadDomainsDO()
  })

  describe('hasMethod()', () => {
    it('should return true for allowed domain methods', async () => {
      const instance = new DomainsDO(ctx, env)

      expect(instance.hasMethod('claim')).toBe(true)
      expect(instance.hasMethod('release')).toBe(true)
      expect(instance.hasMethod('route')).toBe(true)
      expect(instance.hasMethod('unroute')).toBe(true)
      expect(instance.hasMethod('get')).toBe(true)
      expect(instance.hasMethod('list')).toBe(true)
      expect(instance.hasMethod('getRoute')).toBe(true)
    })

    it('should return true for validation methods', async () => {
      const instance = new DomainsDO(ctx, env)

      expect(instance.hasMethod('isValidDomain')).toBe(true)
      expect(instance.hasMethod('isFreeTLD')).toBe(true)
      expect(instance.hasMethod('extractTLD')).toBe(true)
    })

    it('should return true for count methods', async () => {
      const instance = new DomainsDO(ctx, env)

      expect(instance.hasMethod('count')).toBe(true)
      expect(instance.hasMethod('countAll')).toBe(true)
    })

    it('should return false for non-existent methods', async () => {
      const instance = new DomainsDO(ctx, env)

      expect(instance.hasMethod('nonexistent')).toBe(false)
      expect(instance.hasMethod('eval')).toBe(false)
      expect(instance.hasMethod('__proto__')).toBe(false)
    })
  })

  describe('invoke()', () => {
    it('should invoke claim method', async () => {
      const instance = new DomainsDO(ctx, env)

      const result = await instance.invoke('claim', ['test.hq.com.ai', 'org-123']) as DomainRecord

      expect(result.name).toBe('test.hq.com.ai')
      expect(result.orgId).toBe('org-123')
    })

    it('should invoke get method', async () => {
      const instance = new DomainsDO(ctx, env)
      await instance.claim('test.hq.com.ai', 'org-123')

      const result = await instance.invoke('get', ['test.hq.com.ai']) as DomainRecord

      expect(result.name).toBe('test.hq.com.ai')
    })

    it('should invoke list method', async () => {
      const instance = new DomainsDO(ctx, env)
      await instance.claim('app1.hq.com.ai', 'org-123')
      await instance.claim('app2.hq.com.ai', 'org-123')

      const result = await instance.invoke('list', ['org-123']) as DomainRecord[]

      expect(result).toHaveLength(2)
    })

    it('should invoke route method', async () => {
      const instance = new DomainsDO(ctx, env)
      await instance.claim('test.hq.com.ai', 'org-123')

      const result = await instance.invoke('route', ['test.hq.com.ai', { worker: 'my-worker' }, 'org-123']) as DomainRecord

      expect(result.workerId).toBe('my-worker')
    })

    it('should invoke release method', async () => {
      const instance = new DomainsDO(ctx, env)
      await instance.claim('test.hq.com.ai', 'org-123')

      const result = await instance.invoke('release', ['test.hq.com.ai', 'org-123'])

      expect(result).toBe(true)
    })

    it('should reject disallowed methods', async () => {
      const instance = new DomainsDO(ctx, env)

      await expect(instance.invoke('dangerous', []))
        .rejects.toThrow(/not allowed/i)
    })

    it('should support batch invocation', async () => {
      const instance = new DomainsDO(ctx, env)

      const batch = [
        { method: 'claim', params: ['app1.hq.com.ai', 'org-123'] },
        { method: 'claim', params: ['app2.hq.com.ai', 'org-123'] },
      ]

      const results = await Promise.all(batch.map(b => instance.invoke(b.method, b.params)))

      expect(results).toHaveLength(2)
    })
  })

  describe('HTTP fetch() handler', () => {
    describe('RPC endpoint', () => {
      it('should handle POST /rpc with claim method', async () => {
        const instance = new DomainsDO(ctx, env)

        const request = new Request('http://builder.domains/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'claim',
            params: ['test.hq.com.ai', 'org-123'],
          }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = await response.json() as { result: DomainRecord }
        expect(data.result.name).toBe('test.hq.com.ai')
      })

      it('should handle POST /rpc with get method', async () => {
        const instance = new DomainsDO(ctx, env)
        await instance.claim('test.hq.com.ai', 'org-123')

        const request = new Request('http://builder.domains/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'get',
            params: ['test.hq.com.ai'],
          }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = await response.json() as { result: DomainRecord }
        expect(data.result.name).toBe('test.hq.com.ai')
      })

      it('should return error for invalid method', async () => {
        const instance = new DomainsDO(ctx, env)

        const request = new Request('http://builder.domains/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'invalid',
            params: [],
          }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(400)

        const data = await response.json() as { error: string }
        expect(data.error).toBeDefined()
      })

      it('should handle POST /rpc/batch for batch operations', async () => {
        const instance = new DomainsDO(ctx, env)

        const request = new Request('http://builder.domains/rpc/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([
            { method: 'claim', params: ['app1.hq.com.ai', 'org-123'] },
            { method: 'claim', params: ['app2.hq.com.ai', 'org-123'] },
          ]),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const results = await response.json() as Array<{ result: DomainRecord }>
        expect(results).toHaveLength(2)
      })
    })

    describe('REST API endpoint', () => {
      it('should handle GET /api/domains', async () => {
        const instance = new DomainsDO(ctx, env)
        await instance.claim('test.hq.com.ai', 'org-123')

        const request = new Request('http://builder.domains/api/domains?orgId=org-123', { method: 'GET' })
        const response = await instance.fetch(request)

        expect(response.status).toBe(200)
        const data = await response.json() as DomainRecord[]
        expect(Array.isArray(data)).toBe(true)
      })

      it('should handle GET /api/domains/:domain', async () => {
        const instance = new DomainsDO(ctx, env)
        await instance.claim('test.hq.com.ai', 'org-123')

        const request = new Request('http://builder.domains/api/domains/test.hq.com.ai', { method: 'GET' })
        const response = await instance.fetch(request)

        expect(response.status).toBe(200)
        const data = await response.json() as DomainRecord
        expect(data.name).toBe('test.hq.com.ai')
      })

      it('should handle POST /api/domains (claim)', async () => {
        const instance = new DomainsDO(ctx, env)

        const request = new Request('http://builder.domains/api/domains', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            domain: 'newdomain.hq.com.ai',
            orgId: 'org-123',
          }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(201)

        const data = await response.json() as DomainRecord
        expect(data.name).toBe('newdomain.hq.com.ai')
      })

      it('should handle PUT /api/domains/:domain/route', async () => {
        const instance = new DomainsDO(ctx, env)
        await instance.claim('test.hq.com.ai', 'org-123')

        const request = new Request('http://builder.domains/api/domains/test.hq.com.ai/route', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-Org-ID': 'org-123',
          },
          body: JSON.stringify({ worker: 'my-worker' }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = await response.json() as DomainRecord
        expect(data.workerId).toBe('my-worker')
      })

      it('should handle DELETE /api/domains/:domain', async () => {
        const instance = new DomainsDO(ctx, env)
        await instance.claim('test.hq.com.ai', 'org-123')

        const request = new Request('http://builder.domains/api/domains/test.hq.com.ai', {
          method: 'DELETE',
          headers: { 'X-Org-ID': 'org-123' },
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        // Verify domain is released
        const domain = await instance.get('test.hq.com.ai')
        expect(domain).toBeNull()
      })

      it('should return 404 for non-existent domain', async () => {
        const instance = new DomainsDO(ctx, env)

        const request = new Request('http://builder.domains/api/domains/nonexistent.hq.com.ai', { method: 'GET' })
        const response = await instance.fetch(request)

        expect(response.status).toBe(404)
      })
    })

    describe('HATEOAS discovery', () => {
      it('should return discovery info at GET /', async () => {
        const instance = new DomainsDO(ctx, env)

        const request = new Request('http://builder.domains/', { method: 'GET' })
        const response = await instance.fetch(request)

        expect(response.status).toBe(200)
        const data = await response.json() as Record<string, unknown>

        expect(data.api).toBeDefined()
        expect(data.links).toBeDefined()
        expect(data.discover).toBeDefined()
      })

      it('should include available methods in discovery', async () => {
        const instance = new DomainsDO(ctx, env)

        const request = new Request('http://builder.domains/', { method: 'GET' })
        const response = await instance.fetch(request)
        const data = await response.json() as { discover: { methods: Array<{ name: string }> } }

        const methodNames = data.discover.methods.map(m => m.name)
        expect(methodNames).toContain('claim')
        expect(methodNames).toContain('release')
        expect(methodNames).toContain('route')
        expect(methodNames).toContain('get')
        expect(methodNames).toContain('list')
      })

      it('should include supported TLDs in discovery', async () => {
        const instance = new DomainsDO(ctx, env)

        const request = new Request('http://builder.domains/', { method: 'GET' })
        const response = await instance.fetch(request)
        const data = await response.json() as { discover: { tlds: string[] } }

        expect(data.discover.tlds).toContain('hq.com.ai')
        expect(data.discover.tlds).toContain('app.net.ai')
        expect(data.discover.tlds).toContain('api.net.ai')
        expect(data.discover.tlds).toContain('hq.sb')
        expect(data.discover.tlds).toContain('io.sb')
        expect(data.discover.tlds).toContain('llc.st')
      })
    })
  })
})
