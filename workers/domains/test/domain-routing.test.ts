/**
 * Tests: Domain Routing for builder.domains
 *
 * Tests domain routing functionality to workers.
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
 * Interface definition for DomainsDO routing contract
 */
export interface DomainsDORoutingContract {
  claim(domain: string, orgId: string): Promise<DomainRecord>
  route(domain: string, config: RouteConfig, orgId: string): Promise<DomainRecord>
  unroute(domain: string, orgId: string): Promise<DomainRecord>
  getRoute(domain: string): Promise<RouteConfig | null>
  get(domain: string): Promise<DomainRecord | null>
}

/**
 * Attempt to load DomainsDO
 */
async function loadDomainsDO(): Promise<new (ctx: MockDOState, env: MockDomainsEnv) => DomainsDORoutingContract> {
  const module = await import('../src/domains.js')
  return module.DomainsDO
}

describe('DomainsDO Domain Routing', () => {
  let ctx: MockDOState
  let env: MockDomainsEnv
  let DomainsDO: new (ctx: MockDOState, env: MockDomainsEnv) => DomainsDORoutingContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    DomainsDO = await loadDomainsDO()
  })

  describe('route()', () => {
    it('should route domain to a worker', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('my-app.hq.com.ai', 'org-123')
      const result = await instance.route('my-app.hq.com.ai', { worker: 'my-worker' }, 'org-123')

      expect(result.workerId).toBe('my-worker')
    })

    it('should update domain record with route info', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('my-app.hq.com.ai', 'org-123')
      await instance.route('my-app.hq.com.ai', { worker: 'my-worker' }, 'org-123')

      const domain = await instance.get('my-app.hq.com.ai')
      expect(domain?.workerId).toBe('my-worker')
    })

    it('should update existing route', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('my-app.hq.com.ai', 'org-123')
      await instance.route('my-app.hq.com.ai', { worker: 'worker-1' }, 'org-123')
      const result = await instance.route('my-app.hq.com.ai', { worker: 'worker-2' }, 'org-123')

      expect(result.workerId).toBe('worker-2')
    })

    it('should reject routing for non-existent domain', async () => {
      const instance = new DomainsDO(ctx, env)

      await expect(instance.route('nonexistent.hq.com.ai', { worker: 'my-worker' }, 'org-123'))
        .rejects.toThrow(/not found|does not exist/i)
    })

    it('should reject routing for domain owned by another org', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('my-app.hq.com.ai', 'org-123')

      await expect(instance.route('my-app.hq.com.ai', { worker: 'my-worker' }, 'org-456'))
        .rejects.toThrow(/not authorized|permission|forbidden/i)
    })

    it('should validate worker name format', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('my-app.hq.com.ai', 'org-123')

      // Valid worker names
      await instance.route('my-app.hq.com.ai', { worker: 'my-worker' }, 'org-123')
      await instance.route('my-app.hq.com.ai', { worker: 'my-worker-123' }, 'org-123')

      // Invalid worker names
      await expect(instance.route('my-app.hq.com.ai', { worker: '' }, 'org-123'))
        .rejects.toThrow(/invalid.*worker/i)
    })

    it('should support routing with worker script', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('my-app.hq.com.ai', 'org-123')
      const result = await instance.route('my-app.hq.com.ai', {
        worker: 'my-worker',
        workerScript: 'my-script',
      }, 'org-123')

      expect(result.workerId).toBe('my-worker')
    })

    it('should update updatedAt timestamp on route change', async () => {
      const instance = new DomainsDO(ctx, env)

      const claimed = await instance.claim('my-app.hq.com.ai', 'org-123')
      const initialUpdatedAt = claimed.updatedAt

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 10))

      const routed = await instance.route('my-app.hq.com.ai', { worker: 'my-worker' }, 'org-123')

      expect(routed.updatedAt).toBeGreaterThan(initialUpdatedAt)
    })
  })

  describe('unroute()', () => {
    it('should remove route from domain', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('my-app.hq.com.ai', 'org-123')
      await instance.route('my-app.hq.com.ai', { worker: 'my-worker' }, 'org-123')
      const result = await instance.unroute('my-app.hq.com.ai', 'org-123')

      expect(result.workerId).toBeUndefined()
    })

    it('should keep domain after unrouting', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('my-app.hq.com.ai', 'org-123')
      await instance.route('my-app.hq.com.ai', { worker: 'my-worker' }, 'org-123')
      await instance.unroute('my-app.hq.com.ai', 'org-123')

      const domain = await instance.get('my-app.hq.com.ai')
      expect(domain).not.toBeNull()
      expect(domain?.name).toBe('my-app.hq.com.ai')
    })

    it('should reject unrouting for non-existent domain', async () => {
      const instance = new DomainsDO(ctx, env)

      await expect(instance.unroute('nonexistent.hq.com.ai', 'org-123'))
        .rejects.toThrow(/not found|does not exist/i)
    })

    it('should reject unrouting for domain owned by another org', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('my-app.hq.com.ai', 'org-123')
      await instance.route('my-app.hq.com.ai', { worker: 'my-worker' }, 'org-123')

      await expect(instance.unroute('my-app.hq.com.ai', 'org-456'))
        .rejects.toThrow(/not authorized|permission|forbidden/i)
    })

    it('should handle unrouting already unrouted domain', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('my-app.hq.com.ai', 'org-123')
      // Domain is not routed, unroute should still succeed
      const result = await instance.unroute('my-app.hq.com.ai', 'org-123')

      expect(result.workerId).toBeUndefined()
    })
  })

  describe('getRoute()', () => {
    it('should return route config for routed domain', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('my-app.hq.com.ai', 'org-123')
      await instance.route('my-app.hq.com.ai', { worker: 'my-worker' }, 'org-123')

      const route = await instance.getRoute('my-app.hq.com.ai')
      expect(route).not.toBeNull()
      expect(route?.worker).toBe('my-worker')
    })

    it('should return null for unrouted domain', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('my-app.hq.com.ai', 'org-123')

      const route = await instance.getRoute('my-app.hq.com.ai')
      expect(route).toBeNull()
    })

    it('should return null for non-existent domain', async () => {
      const instance = new DomainsDO(ctx, env)

      const route = await instance.getRoute('nonexistent.hq.com.ai')
      expect(route).toBeNull()
    })
  })

  describe('Multiple domains routing', () => {
    it('should support multiple domains pointing to same worker', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('app1.hq.com.ai', 'org-123')
      await instance.claim('app2.hq.com.ai', 'org-123')

      await instance.route('app1.hq.com.ai', { worker: 'shared-worker' }, 'org-123')
      await instance.route('app2.hq.com.ai', { worker: 'shared-worker' }, 'org-123')

      const route1 = await instance.getRoute('app1.hq.com.ai')
      const route2 = await instance.getRoute('app2.hq.com.ai')

      expect(route1?.worker).toBe('shared-worker')
      expect(route2?.worker).toBe('shared-worker')
    })

    it('should support routing domains to different workers', async () => {
      const instance = new DomainsDO(ctx, env)

      await instance.claim('app1.hq.com.ai', 'org-123')
      await instance.claim('app2.hq.com.ai', 'org-123')

      await instance.route('app1.hq.com.ai', { worker: 'worker-1' }, 'org-123')
      await instance.route('app2.hq.com.ai', { worker: 'worker-2' }, 'org-123')

      const route1 = await instance.getRoute('app1.hq.com.ai')
      const route2 = await instance.getRoute('app2.hq.com.ai')

      expect(route1?.worker).toBe('worker-1')
      expect(route2?.worker).toBe('worker-2')
    })
  })
})
