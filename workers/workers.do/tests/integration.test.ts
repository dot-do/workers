/**
 * Integration Tests for workers.do
 *
 * These tests use real miniflare Workers with Durable Objects.
 * Tests focus on the Hono worker layer which is more stable to test
 * without complex DO migration dependencies.
 *
 * Run with: npx vitest run
 *
 * @module tests/integration.test
 */

import { env, SELF } from 'cloudflare:test'
import { describe, it, expect } from 'vitest'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Environment type with DO binding
 */
interface TestEnv {
  WORKERS_REGISTRY: DurableObjectNamespace
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Helper to create a fetch request
 */
function createRequest(path: string, options?: RequestInit): Request {
  return new Request(`https://workers.do${path}`, options)
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('workers.do Worker', () => {
  describe('health check', () => {
    /**
     * Test: Health endpoint returns OK
     */
    it('returns OK on /health', async () => {
      const response = await SELF.fetch(createRequest('/health'))

      expect(response.ok).toBe(true)
      const data = await response.json() as { status: string; service: string }
      expect(data.status).toBe('ok')
      expect(data.service).toBe('workers.do')
    })
  })

  describe('root endpoint', () => {
    /**
     * Test: Root returns service info
     */
    it('returns service info on /', async () => {
      const response = await SELF.fetch(createRequest('/'))

      expect(response.ok).toBe(true)
      const data = await response.json() as { service: string; status: string; version: string }
      expect(data.service).toBe('workers.do')
      expect(data.status).toBe('healthy')
      expect(data.version).toBeDefined()
    })
  })

  describe('CORS', () => {
    /**
     * Test: CORS headers are set
     */
    it('sets CORS headers', async () => {
      const response = await SELF.fetch(createRequest('/health', {
        headers: { 'Origin': 'https://example.com' }
      }))

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*')
    })

    /**
     * Test: OPTIONS returns CORS headers
     */
    it('handles OPTIONS preflight', async () => {
      const response = await SELF.fetch(createRequest('/api', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
        }
      }))

      expect(response.status).toBeLessThan(400)
    })
  })

  describe('DO stub access', () => {
    /**
     * Test: Can get DO stub from env
     */
    it('can get DO stub', () => {
      const testEnv = env as TestEnv
      expect(testEnv.WORKERS_REGISTRY).toBeDefined()

      const id = testEnv.WORKERS_REGISTRY.idFromName('test-user')
      expect(id).toBeDefined()

      const stub = testEnv.WORKERS_REGISTRY.get(id)
      expect(stub).toBeDefined()
    })

    /**
     * Test: Different users get different stubs
     */
    it('different users get different stubs', () => {
      const testEnv = env as TestEnv

      const id1 = testEnv.WORKERS_REGISTRY.idFromName('user-1')
      const id2 = testEnv.WORKERS_REGISTRY.idFromName('user-2')

      expect(id1.toString()).not.toBe(id2.toString())
    })
  })

  describe('authentication routing', () => {
    /**
     * Test: Anonymous users get default user ID
     */
    it('routes anonymous users correctly', async () => {
      // Without auth header, should still get a response
      const response = await SELF.fetch(createRequest('/'))

      expect(response.ok).toBe(true)
    })

    /**
     * Test: Authenticated users are routed
     */
    it('routes authenticated users', async () => {
      const response = await SELF.fetch(createRequest('/', {
        headers: { 'Authorization': 'Bearer test-token-12345' }
      }))

      expect(response.ok).toBe(true)
    })
  })
})

describe('WorkersRegistryDO direct access', () => {
  /**
   * Test: DO can be instantiated
   *
   * Note: Full DO testing requires the dotdo package to properly
   * bundle its SQL migrations. These tests verify the DO binding works.
   */
  it('can instantiate DO', () => {
    const testEnv = env as TestEnv
    const id = testEnv.WORKERS_REGISTRY.idFromName('instantiate-test')
    const stub = testEnv.WORKERS_REGISTRY.get(id)

    expect(stub).toBeDefined()
    expect(typeof stub.fetch).toBe('function')
  })

  /**
   * Test: Each namespace gets unique ID
   */
  it('generates unique IDs per namespace', () => {
    const testEnv = env as TestEnv
    const ids = new Set<string>()

    for (let i = 0; i < 10; i++) {
      const id = testEnv.WORKERS_REGISTRY.idFromName(`user-${i}`)
      ids.add(id.toString())
    }

    expect(ids.size).toBe(10)
  })

  /**
   * Test: Same namespace returns same ID
   */
  it('returns same ID for same namespace', () => {
    const testEnv = env as TestEnv

    const id1 = testEnv.WORKERS_REGISTRY.idFromName('consistent-user')
    const id2 = testEnv.WORKERS_REGISTRY.idFromName('consistent-user')

    expect(id1.toString()).toBe(id2.toString())
  })
})
