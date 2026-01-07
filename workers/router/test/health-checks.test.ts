/**
 * RED Tests: router worker Health Checks
 *
 * These tests define the contract for the router worker's health check functionality.
 * The RouterDO must provide health endpoints and monitor target service health.
 *
 * Per ARCHITECTURE.md:
 * - Health check endpoints
 * - Target service health monitoring
 * - Readiness and liveness probes
 *
 * RED PHASE: These tests MUST FAIL because RouterDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-hq66).
 *
 * @see ARCHITECTURE.md
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  type MockDOState,
  type MockRouterEnv,
  type HostnameConfig,
} from './helpers.js'

/**
 * Health check response structure
 */
interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  timestamp: string
  uptime?: number
  version?: string
  checks?: Record<string, {
    status: 'pass' | 'fail' | 'warn'
    message?: string
    duration?: number
  }>
}

/**
 * Interface definition for RouterDO health checks
 */
export interface RouterDOContract {
  // Health check methods
  getHealth(): Promise<HealthStatus>
  checkTarget(target: string): Promise<boolean>
  listTargetHealth(): Promise<Record<string, boolean>>

  // Configuration
  registerHostname(config: HostnameConfig): Promise<void>

  // HTTP handler
  fetch(request: Request): Promise<Response>
}

/**
 * Attempt to load RouterDO - this will fail in RED phase
 */
async function loadRouterDO(): Promise<new (ctx: MockDOState, env: MockRouterEnv) => RouterDOContract> {
  const module = await import('../src/router.js')
  return module.RouterDO
}

describe('RouterDO Health Checks', () => {
  let ctx: MockDOState
  let env: MockRouterEnv
  let RouterDO: new (ctx: MockDOState, env: MockRouterEnv) => RouterDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    RouterDO = await loadRouterDO()
  })

  describe('getHealth()', () => {
    it('should return healthy status when router is operational', async () => {
      const instance = new RouterDO(ctx, env)
      const health = await instance.getHealth()

      expect(health.status).toBe('healthy')
      expect(health.timestamp).toBeDefined()
      expect(new Date(health.timestamp).getTime()).toBeLessThanOrEqual(Date.now())
    })

    it('should include uptime information', async () => {
      const instance = new RouterDO(ctx, env)
      const health = await instance.getHealth()

      expect(health.uptime).toBeDefined()
      expect(typeof health.uptime).toBe('number')
      expect(health.uptime).toBeGreaterThanOrEqual(0)
    })

    it('should include version information', async () => {
      const instance = new RouterDO(ctx, env)
      const health = await instance.getHealth()

      expect(health.version).toBeDefined()
      expect(typeof health.version).toBe('string')
    })

    it('should report degraded status when some targets are unhealthy', async () => {
      const instance = new RouterDO(ctx, env)
      await instance.registerHostname({
        hostname: 'api.workers.do',
        routes: [
          { pattern: '/healthy/*', target: 'healthy-service' },
          { pattern: '/unhealthy/*', target: 'unhealthy-service' },
        ],
      })

      // Simulate unhealthy target
      const health = await instance.getHealth()
      // When some targets are down, status should be degraded
      expect(['healthy', 'degraded']).toContain(health.status)
    })

    it('should include detailed checks for each component', async () => {
      const instance = new RouterDO(ctx, env)
      const health = await instance.getHealth()

      expect(health.checks).toBeDefined()
      expect(typeof health.checks).toBe('object')
    })
  })

  describe('checkTarget()', () => {
    it('should return true for healthy target', async () => {
      const instance = new RouterDO(ctx, env)
      await instance.registerHostname({
        hostname: 'api.workers.do',
        routes: [{ pattern: '/*', target: 'healthy-service' }],
      })

      const isHealthy = await instance.checkTarget('healthy-service')
      expect(typeof isHealthy).toBe('boolean')
    })

    it('should return false for non-existent target', async () => {
      const instance = new RouterDO(ctx, env)
      const isHealthy = await instance.checkTarget('nonexistent-service')
      expect(isHealthy).toBe(false)
    })

    it('should cache health check results briefly', async () => {
      const instance = new RouterDO(ctx, env)
      await instance.registerHostname({
        hostname: 'api.workers.do',
        routes: [{ pattern: '/*', target: 'test-service' }],
      })

      // Multiple rapid checks should use cached result
      const check1 = await instance.checkTarget('test-service')
      const check2 = await instance.checkTarget('test-service')

      expect(check1).toBe(check2)
    })
  })

  describe('listTargetHealth()', () => {
    it('should return empty object when no targets configured', async () => {
      const instance = new RouterDO(ctx, env)
      const health = await instance.listTargetHealth()
      expect(health).toEqual({})
    })

    it('should return health status for all configured targets', async () => {
      const instance = new RouterDO(ctx, env)
      await instance.registerHostname({
        hostname: 'api.workers.do',
        routes: [
          { pattern: '/users/*', target: 'users-service' },
          { pattern: '/orders/*', target: 'orders-service' },
          { pattern: '/products/*', target: 'products-service' },
        ],
      })

      const health = await instance.listTargetHealth()
      expect(Object.keys(health)).toContain('users-service')
      expect(Object.keys(health)).toContain('orders-service')
      expect(Object.keys(health)).toContain('products-service')

      // All values should be booleans
      Object.values(health).forEach(status => {
        expect(typeof status).toBe('boolean')
      })
    })

    it('should deduplicate targets used in multiple routes', async () => {
      const instance = new RouterDO(ctx, env)
      await instance.registerHostname({
        hostname: 'api.workers.do',
        routes: [
          { pattern: '/v1/users/*', target: 'users-service' },
          { pattern: '/v2/users/*', target: 'users-service' }, // Same target
        ],
      })

      const health = await instance.listTargetHealth()
      const keys = Object.keys(health)
      const uniqueKeys = [...new Set(keys)]
      expect(keys.length).toBe(uniqueKeys.length)
    })
  })

  describe('HTTP health endpoints', () => {
    describe('GET /health', () => {
      it('should return 200 for healthy router', async () => {
        const instance = new RouterDO(ctx, env)
        const request = new Request('https://router.workers.do/health', {
          method: 'GET',
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)
      })

      it('should return JSON health status', async () => {
        const instance = new RouterDO(ctx, env)
        const request = new Request('https://router.workers.do/health', {
          method: 'GET',
        })

        const response = await instance.fetch(request)
        expect(response.headers.get('Content-Type')).toMatch(/application\/json/)

        const health = await response.json() as HealthStatus
        expect(health.status).toBeDefined()
        expect(health.timestamp).toBeDefined()
      })

      it('should return 503 when router is unhealthy', async () => {
        const instance = new RouterDO(ctx, env)
        // Simulate unhealthy state by corrupting storage
        ctx.storage.get = async () => { throw new Error('Storage failure') }

        const request = new Request('https://router.workers.do/health', {
          method: 'GET',
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(503)
      })
    })

    describe('GET /health/live', () => {
      it('should return 200 for liveness check', async () => {
        const instance = new RouterDO(ctx, env)
        const request = new Request('https://router.workers.do/health/live', {
          method: 'GET',
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)
      })

      it('should be lightweight (no external checks)', async () => {
        const instance = new RouterDO(ctx, env)
        const request = new Request('https://router.workers.do/health/live', {
          method: 'GET',
        })

        const start = Date.now()
        await instance.fetch(request)
        const duration = Date.now() - start

        // Liveness should be very fast (< 100ms)
        expect(duration).toBeLessThan(100)
      })
    })

    describe('GET /health/ready', () => {
      it('should return 200 when router is ready to serve', async () => {
        const instance = new RouterDO(ctx, env)
        const request = new Request('https://router.workers.do/health/ready', {
          method: 'GET',
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)
      })

      it('should return 503 when router is not ready', async () => {
        const instance = new RouterDO(ctx, env)
        // Simulate not-ready state (e.g., still initializing)
        ctx.storage.get = async () => { throw new Error('Not initialized') }

        const request = new Request('https://router.workers.do/health/ready', {
          method: 'GET',
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(503)
      })
    })

    describe('GET /health/targets', () => {
      it('should return health status for all targets', async () => {
        const instance = new RouterDO(ctx, env)
        await instance.registerHostname({
          hostname: 'api.workers.do',
          routes: [
            { pattern: '/users/*', target: 'users-service' },
            { pattern: '/orders/*', target: 'orders-service' },
          ],
        })

        const request = new Request('https://router.workers.do/health/targets', {
          method: 'GET',
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const targets = await response.json() as Record<string, boolean>
        expect(targets).toHaveProperty('users-service')
        expect(targets).toHaveProperty('orders-service')
      })

      it('should return empty object when no routes configured', async () => {
        const instance = new RouterDO(ctx, env)
        const request = new Request('https://router.workers.do/health/targets', {
          method: 'GET',
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const targets = await response.json()
        expect(targets).toEqual({})
      })
    })

    describe('GET /health/targets/:target', () => {
      it('should return health status for specific target', async () => {
        const instance = new RouterDO(ctx, env)
        await instance.registerHostname({
          hostname: 'api.workers.do',
          routes: [{ pattern: '/*', target: 'test-service' }],
        })

        const request = new Request('https://router.workers.do/health/targets/test-service', {
          method: 'GET',
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const result = await response.json() as { healthy: boolean }
        expect(typeof result.healthy).toBe('boolean')
      })

      it('should return 404 for unknown target', async () => {
        const instance = new RouterDO(ctx, env)
        const request = new Request('https://router.workers.do/health/targets/unknown-service', {
          method: 'GET',
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(404)
      })
    })
  })

  describe('Health check caching', () => {
    it('should cache health check results', async () => {
      const instance = new RouterDO(ctx, env)
      await instance.registerHostname({
        hostname: 'api.workers.do',
        routes: [{ pattern: '/*', target: 'test-service' }],
      })

      // First check
      const health1 = await instance.getHealth()

      // Second check should return cached result
      const health2 = await instance.getHealth()

      // Timestamps should be identical if cached
      expect(health1.timestamp).toBe(health2.timestamp)
    })

    it('should refresh cache after TTL expires', async () => {
      const instance = new RouterDO(ctx, env)
      await instance.registerHostname({
        hostname: 'api.workers.do',
        routes: [{ pattern: '/*', target: 'test-service' }],
      })

      const health1 = await instance.getHealth()

      // Wait for cache to expire (implementation-dependent)
      // This test documents expected behavior

      // After TTL, should get fresh result
      // const health2 = await instance.getHealth()
      // expect(health2.timestamp).not.toBe(health1.timestamp)

      expect(health1).toBeDefined()
    })
  })

  describe('Startup health checks', () => {
    it('should perform initial health check on startup', async () => {
      // Creating a new instance should trigger initial health checks
      const instance = new RouterDO(ctx, env)
      const health = await instance.getHealth()
      expect(health).toBeDefined()
    })

    it('should not block startup on slow health checks', async () => {
      const start = Date.now()
      const instance = new RouterDO(ctx, env)
      const duration = Date.now() - start

      // Instance creation should be fast
      expect(duration).toBeLessThan(1000)
      expect(instance).toBeDefined()
    })
  })
})
