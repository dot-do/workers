/**
 * RED Tests: router worker Hostname Routing
 *
 * These tests define the contract for the router worker's hostname-based routing.
 * The RouterDO must route requests based on hostname patterns.
 *
 * Per ARCHITECTURE.md:
 * - Hostname maps to routing configuration
 * - Supports multi-tenancy (100k+ sites from single deployment)
 * - Dynamic routing based on hostname
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
 * Interface definition for RouterDO hostname routing
 */
export interface RouterDOContract {
  // Hostname configuration management
  registerHostname(config: HostnameConfig): Promise<void>
  getHostnameConfig(hostname: string): Promise<HostnameConfig | null>
  listHostnames(): Promise<string[]>
  removeHostname(hostname: string): Promise<boolean>

  // Hostname resolution
  resolveHostname(hostname: string): Promise<string | null>
  matchHostnamePattern(hostname: string): Promise<HostnameConfig | null>

  // HTTP handler
  fetch(request: Request): Promise<Response>
}

/**
 * Attempt to load RouterDO - this will fail in RED phase
 */
async function loadRouterDO(): Promise<new (ctx: MockDOState, env: MockRouterEnv) => RouterDOContract> {
  // This dynamic import will fail because src/router.js doesn't exist yet
  const module = await import('../src/router.js')
  return module.RouterDO
}

describe('RouterDO Hostname Routing', () => {
  let ctx: MockDOState
  let env: MockRouterEnv
  let RouterDO: new (ctx: MockDOState, env: MockRouterEnv) => RouterDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    // This will throw in RED phase because the module doesn't exist
    RouterDO = await loadRouterDO()
  })

  describe('registerHostname()', () => {
    it('should register a hostname with routing configuration', async () => {
      const instance = new RouterDO(ctx, env)
      const config: HostnameConfig = {
        hostname: 'api.example.com',
        routes: [
          { pattern: '/users/*', target: 'users-service' },
          { pattern: '/orders/*', target: 'orders-service' },
        ],
        defaultTarget: 'main-service',
      }

      await expect(instance.registerHostname(config)).resolves.not.toThrow()
      const retrieved = await instance.getHostnameConfig('api.example.com')
      expect(retrieved).not.toBeNull()
      expect(retrieved?.hostname).toBe('api.example.com')
    })

    it('should register wildcard subdomain patterns', async () => {
      const instance = new RouterDO(ctx, env)
      const config: HostnameConfig = {
        hostname: '*.workers.do',
        routes: [{ pattern: '/*', target: 'sites-service' }],
      }

      await expect(instance.registerHostname(config)).resolves.not.toThrow()
      const retrieved = await instance.getHostnameConfig('*.workers.do')
      expect(retrieved).not.toBeNull()
    })

    it('should update existing hostname configuration', async () => {
      const instance = new RouterDO(ctx, env)
      const originalConfig: HostnameConfig = {
        hostname: 'api.example.com',
        routes: [{ pattern: '/v1/*', target: 'v1-service' }],
      }

      const updatedConfig: HostnameConfig = {
        hostname: 'api.example.com',
        routes: [
          { pattern: '/v1/*', target: 'v1-service' },
          { pattern: '/v2/*', target: 'v2-service' },
        ],
      }

      await instance.registerHostname(originalConfig)
      await instance.registerHostname(updatedConfig)

      const config = await instance.getHostnameConfig('api.example.com')
      expect(config?.routes).toHaveLength(2)
    })

    it('should validate hostname format', async () => {
      const instance = new RouterDO(ctx, env)
      const invalidConfig: HostnameConfig = {
        hostname: 'invalid..hostname',
        routes: [],
      }

      await expect(instance.registerHostname(invalidConfig)).rejects.toThrow(/invalid.*hostname/i)
    })
  })

  describe('getHostnameConfig()', () => {
    it('should return null for unregistered hostname', async () => {
      const instance = new RouterDO(ctx, env)
      const config = await instance.getHostnameConfig('unknown.example.com')
      expect(config).toBeNull()
    })

    it('should return complete configuration for registered hostname', async () => {
      const instance = new RouterDO(ctx, env)
      await instance.registerHostname({
        hostname: 'test.example.com',
        routes: [{ pattern: '/api/*', target: 'api-service' }],
        defaultTarget: 'default-service',
        enabled: true,
      })

      const config = await instance.getHostnameConfig('test.example.com')
      expect(config).not.toBeNull()
      expect(config?.hostname).toBe('test.example.com')
      expect(config?.routes).toHaveLength(1)
      expect(config?.defaultTarget).toBe('default-service')
      expect(config?.enabled).toBe(true)
    })
  })

  describe('listHostnames()', () => {
    it('should return empty array when no hostnames registered', async () => {
      const instance = new RouterDO(ctx, env)
      const hostnames = await instance.listHostnames()
      expect(hostnames).toEqual([])
    })

    it('should return all registered hostnames', async () => {
      const instance = new RouterDO(ctx, env)
      await instance.registerHostname({
        hostname: 'api.example.com',
        routes: [],
      })
      await instance.registerHostname({
        hostname: 'docs.example.com',
        routes: [],
      })

      const hostnames = await instance.listHostnames()
      expect(hostnames).toContain('api.example.com')
      expect(hostnames).toContain('docs.example.com')
      expect(hostnames).toHaveLength(2)
    })
  })

  describe('removeHostname()', () => {
    it('should return false for non-existent hostname', async () => {
      const instance = new RouterDO(ctx, env)
      const result = await instance.removeHostname('unknown.example.com')
      expect(result).toBe(false)
    })

    it('should remove registered hostname and return true', async () => {
      const instance = new RouterDO(ctx, env)
      await instance.registerHostname({
        hostname: 'temp.example.com',
        routes: [],
      })

      const result = await instance.removeHostname('temp.example.com')
      expect(result).toBe(true)

      const config = await instance.getHostnameConfig('temp.example.com')
      expect(config).toBeNull()
    })
  })

  describe('resolveHostname()', () => {
    it('should resolve exact hostname match', async () => {
      const instance = new RouterDO(ctx, env)
      await instance.registerHostname({
        hostname: 'api.workers.do',
        routes: [],
        defaultTarget: 'api-service',
      })

      const target = await instance.resolveHostname('api.workers.do')
      expect(target).toBe('api-service')
    })

    it('should resolve wildcard subdomain match', async () => {
      const instance = new RouterDO(ctx, env)
      await instance.registerHostname({
        hostname: '*.workers.do',
        routes: [],
        defaultTarget: 'sites-service',
      })

      const target = await instance.resolveHostname('my-site.workers.do')
      expect(target).toBe('sites-service')
    })

    it('should prefer exact match over wildcard', async () => {
      const instance = new RouterDO(ctx, env)
      await instance.registerHostname({
        hostname: '*.workers.do',
        routes: [],
        defaultTarget: 'generic-service',
      })
      await instance.registerHostname({
        hostname: 'api.workers.do',
        routes: [],
        defaultTarget: 'api-service',
      })

      const target = await instance.resolveHostname('api.workers.do')
      expect(target).toBe('api-service')

      const wildcardTarget = await instance.resolveHostname('other.workers.do')
      expect(wildcardTarget).toBe('generic-service')
    })

    it('should return null for unmatched hostname', async () => {
      const instance = new RouterDO(ctx, env)
      const target = await instance.resolveHostname('unknown.example.com')
      expect(target).toBeNull()
    })
  })

  describe('matchHostnamePattern()', () => {
    it('should match multi-level wildcard patterns', async () => {
      const instance = new RouterDO(ctx, env)
      await instance.registerHostname({
        hostname: '*.*.workers.do',
        routes: [],
        defaultTarget: 'nested-service',
      })

      const config = await instance.matchHostnamePattern('project.user.workers.do')
      expect(config).not.toBeNull()
      expect(config?.defaultTarget).toBe('nested-service')
    })

    it('should not match partial wildcard patterns incorrectly', async () => {
      const instance = new RouterDO(ctx, env)
      await instance.registerHostname({
        hostname: '*.workers.do',
        routes: [],
      })

      // Should not match because it has extra subdomain levels
      const config = await instance.matchHostnamePattern('a.b.workers.do')
      expect(config).toBeNull()
    })

    it('should support port numbers in hostname matching', async () => {
      const instance = new RouterDO(ctx, env)
      await instance.registerHostname({
        hostname: 'localhost:8787',
        routes: [],
        defaultTarget: 'dev-service',
      })

      const config = await instance.matchHostnamePattern('localhost:8787')
      expect(config).not.toBeNull()
    })
  })

  describe('HTTP fetch() hostname routing', () => {
    it('should route request based on Host header', async () => {
      const instance = new RouterDO(ctx, env)
      await instance.registerHostname({
        hostname: 'api.workers.do',
        routes: [{ pattern: '/*', target: 'api-service' }],
      })

      const request = new Request('https://api.workers.do/users', {
        method: 'GET',
        headers: { Host: 'api.workers.do' },
      })

      const response = await instance.fetch(request)
      // Should either route successfully or return routing info
      expect([200, 307, 308]).toContain(response.status)
    })

    it('should return 404 for unregistered hostname', async () => {
      const instance = new RouterDO(ctx, env)
      const request = new Request('https://unknown.workers.do/path', {
        method: 'GET',
        headers: { Host: 'unknown.workers.do' },
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(404)
    })

    it('should handle hostname with disabled configuration', async () => {
      const instance = new RouterDO(ctx, env)
      await instance.registerHostname({
        hostname: 'disabled.workers.do',
        routes: [],
        enabled: false,
      })

      const request = new Request('https://disabled.workers.do/path', {
        method: 'GET',
        headers: { Host: 'disabled.workers.do' },
      })

      const response = await instance.fetch(request)
      // Should return service unavailable or not found
      expect([404, 503]).toContain(response.status)
    })

    it('should extract hostname from URL when Host header is missing', async () => {
      const instance = new RouterDO(ctx, env)
      await instance.registerHostname({
        hostname: 'api.workers.do',
        routes: [{ pattern: '/*', target: 'api-service' }],
      })

      const request = new Request('https://api.workers.do/users')
      const response = await instance.fetch(request)
      // Should process based on URL hostname
      expect([200, 307, 308]).toContain(response.status)
    })
  })
})
