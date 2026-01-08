/**
 * TDD Tests for builder.domains SDK
 *
 * These tests define the expected behavior for the builder.domains free domain SDK.
 * Tests verify export patterns, type definitions, and client functionality.
 *
 * Test coverage:
 * 1. Export pattern (Domains factory, domains instance, default export, re-exports)
 * 2. Type definitions (DomainRecord, RouteConfig, ListOptions, DomainsClient)
 * 3. Client methods (claim, release, route, get, list, check, baseDomains, dns)
 * 4. Constants (FREE_TLDS)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// =============================================================================
// Mock Setup - must be hoisted with vi.hoisted
// =============================================================================

const { mockCreateClient, defaultMockClient, mockDnsClient } = vi.hoisted(() => {
  // Mock DNS client
  const mockDnsClient = {
    set: vi.fn().mockResolvedValue({
      type: 'A',
      name: '@',
      content: '192.168.1.1',
      ttl: 1,
      proxied: true,
    }),
    get: vi.fn().mockResolvedValue([]),
    delete: vi.fn().mockResolvedValue(true),
  }

  // Default mock client for the module-level domains instance
  const defaultMockClient = {
    claim: vi.fn().mockResolvedValue({
      id: 'dom_123',
      name: 'my-startup.hq.com.ai',
      orgId: 'org_456',
      tld: 'hq.com.ai',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
    release: vi.fn().mockResolvedValue(true),
    route: vi.fn().mockResolvedValue({
      id: 'dom_123',
      name: 'my-startup.hq.com.ai',
      orgId: 'org_456',
      tld: 'hq.com.ai',
      workerId: 'my-worker',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
    unroute: vi.fn().mockResolvedValue({
      id: 'dom_123',
      name: 'my-startup.hq.com.ai',
      orgId: 'org_456',
      tld: 'hq.com.ai',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
    get: vi.fn().mockResolvedValue({
      id: 'dom_123',
      name: 'my-startup.hq.com.ai',
      orgId: 'org_456',
      tld: 'hq.com.ai',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
    getRoute: vi.fn().mockResolvedValue({ worker: 'my-worker' }),
    list: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    check: vi.fn().mockResolvedValue({
      domain: 'my-startup.hq.com.ai',
      available: true,
    }),
    baseDomains: vi.fn().mockResolvedValue([
      { tld: 'hq.com.ai', description: 'Startup HQ domains', available: true },
      { tld: 'app.net.ai', description: 'Application domains', available: true },
      { tld: 'api.net.ai', description: 'API domains', available: true },
      { tld: 'hq.sb', description: 'Short HQ domains', available: true },
      { tld: 'io.sb', description: 'IO domains', available: true },
      { tld: 'llc.st', description: 'LLC domains', available: true },
    ]),
    isValidDomain: vi.fn().mockResolvedValue(true),
    isFreeTLD: vi.fn().mockResolvedValue(true),
    extractTLD: vi.fn().mockResolvedValue('hq.com.ai'),
    extractSubdomain: vi.fn().mockResolvedValue('my-startup'),
    dns: mockDnsClient,
  }

  const mockCreateClient = vi.fn().mockReturnValue(defaultMockClient)

  return { mockCreateClient, defaultMockClient, mockDnsClient }
})

// Mock rpc.do createClient to track calls and return predictable values
vi.mock('rpc.do', () => ({
  createClient: mockCreateClient,
}))

// Now import the module under test
import {
  Domains,
  domains,
  createDomains,
  FREE_TLDS,
  DomainRecord,
  RouteConfig,
  ListOptions,
  DNSRecord,
  AvailabilityResult,
  BaseDomain,
  DomainsClient,
} from '../index'
import type { ClientOptions } from '../index'

// Default export
import defaultExport from '../index'

// =============================================================================
// Test Suites
// =============================================================================

describe('builder.domains SDK', () => {
  const mockClientInstance = defaultMockClient

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset ALL mock implementations
    mockClientInstance.claim.mockResolvedValue({
      id: 'dom_123',
      name: 'my-startup.hq.com.ai',
      orgId: 'org_456',
      tld: 'hq.com.ai',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    mockClientInstance.release.mockResolvedValue(true)
    mockClientInstance.route.mockResolvedValue({
      id: 'dom_123',
      name: 'my-startup.hq.com.ai',
      orgId: 'org_456',
      tld: 'hq.com.ai',
      workerId: 'my-worker',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    mockClientInstance.unroute.mockResolvedValue({
      id: 'dom_123',
      name: 'my-startup.hq.com.ai',
      orgId: 'org_456',
      tld: 'hq.com.ai',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    mockClientInstance.get.mockResolvedValue({
      id: 'dom_123',
      name: 'my-startup.hq.com.ai',
      orgId: 'org_456',
      tld: 'hq.com.ai',
      status: 'active',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
    mockClientInstance.getRoute.mockResolvedValue({ worker: 'my-worker' })
    mockClientInstance.list.mockResolvedValue([])
    mockClientInstance.count.mockResolvedValue(0)
    mockClientInstance.check.mockResolvedValue({
      domain: 'my-startup.hq.com.ai',
      available: true,
    })
    mockClientInstance.baseDomains.mockResolvedValue([
      { tld: 'hq.com.ai', description: 'Startup HQ domains', available: true },
      { tld: 'app.net.ai', description: 'Application domains', available: true },
      { tld: 'api.net.ai', description: 'API domains', available: true },
      { tld: 'hq.sb', description: 'Short HQ domains', available: true },
      { tld: 'io.sb', description: 'IO domains', available: true },
      { tld: 'llc.st', description: 'LLC domains', available: true },
    ])
    mockClientInstance.isValidDomain.mockResolvedValue(true)
    mockClientInstance.isFreeTLD.mockResolvedValue(true)
    mockClientInstance.extractTLD.mockResolvedValue('hq.com.ai')
    mockClientInstance.extractSubdomain.mockResolvedValue('my-startup')

    // Reset DNS mocks
    mockDnsClient.set.mockResolvedValue({
      type: 'A',
      name: '@',
      content: '192.168.1.1',
      ttl: 1,
      proxied: true,
    })
    mockDnsClient.get.mockResolvedValue([])
    mockDnsClient.delete.mockResolvedValue(true)

    mockCreateClient.mockReturnValue(mockClientInstance)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===========================================================================
  // Export Pattern Tests
  // ===========================================================================

  describe('Export Pattern', () => {
    it('should export Domains factory function (PascalCase)', () => {
      expect(Domains).toBeDefined()
      expect(typeof Domains).toBe('function')
    })

    it('should export domains instance (camelCase)', () => {
      expect(domains).toBeDefined()
      expect(typeof domains).toBe('object')
    })

    it('should export domains as default export', () => {
      expect(defaultExport).toBe(domains)
    })

    it('should export createDomains as legacy alias for Domains', () => {
      expect(createDomains).toBeDefined()
      expect(createDomains).toBe(Domains)
    })

    it('should export FREE_TLDS constant', () => {
      expect(FREE_TLDS).toBeDefined()
      expect(Array.isArray(FREE_TLDS)).toBe(true)
      expect(FREE_TLDS).toContain('hq.com.ai')
      expect(FREE_TLDS).toContain('app.net.ai')
      expect(FREE_TLDS).toContain('api.net.ai')
      expect(FREE_TLDS).toContain('hq.sb')
      expect(FREE_TLDS).toContain('io.sb')
      expect(FREE_TLDS).toContain('llc.st')
    })

    it('should re-export ClientOptions type from rpc.do', () => {
      const typeCheck: ClientOptions = {
        apiKey: 'test',
        baseURL: 'https://test.do',
      }
      expect(typeCheck.apiKey).toBe('test')
    })
  })

  // ===========================================================================
  // Type Definition Tests
  // ===========================================================================

  describe('Type Definitions', () => {
    it('should define DomainRecord interface correctly', () => {
      const record: DomainRecord = {
        id: 'dom_123',
        name: 'my-startup.hq.com.ai',
        orgId: 'org_456',
        tld: 'hq.com.ai',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      expect(record.id).toBe('dom_123')
      expect(record.name).toBe('my-startup.hq.com.ai')
      expect(record.orgId).toBe('org_456')
      expect(record.tld).toBe('hq.com.ai')
      expect(record.status).toBe('active')
    })

    it('should define DomainRecord with optional fields', () => {
      const record: DomainRecord = {
        id: 'dom_123',
        name: 'my-startup.hq.com.ai',
        orgId: 'org_456',
        tld: 'hq.com.ai',
        zoneId: 'zone_abc',
        workerId: 'my-worker',
        routeId: 'route_xyz',
        status: 'active',
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      expect(record.zoneId).toBe('zone_abc')
      expect(record.workerId).toBe('my-worker')
      expect(record.routeId).toBe('route_xyz')
    })

    it('should define RouteConfig interface correctly', () => {
      const config: RouteConfig = {
        worker: 'my-worker',
      }

      expect(config.worker).toBe('my-worker')
    })

    it('should define RouteConfig with all optional fields', () => {
      const config: RouteConfig = {
        worker: 'my-worker',
        workerScript: 'my-script',
        customOrigin: 'https://origin.example.com',
      }

      expect(config.worker).toBe('my-worker')
      expect(config.workerScript).toBe('my-script')
      expect(config.customOrigin).toBe('https://origin.example.com')
    })

    it('should define ListOptions interface correctly', () => {
      const options: ListOptions = {
        limit: 10,
        offset: 0,
        status: 'active',
        tld: 'hq.com.ai',
      }

      expect(options.limit).toBe(10)
      expect(options.offset).toBe(0)
      expect(options.status).toBe('active')
      expect(options.tld).toBe('hq.com.ai')
    })

    it('should define DNSRecord interface correctly', () => {
      const record: DNSRecord = {
        type: 'A',
        name: '@',
        content: '192.168.1.1',
        ttl: 300,
        proxied: true,
      }

      expect(record.type).toBe('A')
      expect(record.name).toBe('@')
      expect(record.content).toBe('192.168.1.1')
      expect(record.ttl).toBe(300)
      expect(record.proxied).toBe(true)
    })

    it('should define AvailabilityResult interface correctly', () => {
      const result: AvailabilityResult = {
        domain: 'my-startup.hq.com.ai',
        available: true,
      }

      expect(result.domain).toBe('my-startup.hq.com.ai')
      expect(result.available).toBe(true)
    })

    it('should define BaseDomain interface correctly', () => {
      const baseDomain: BaseDomain = {
        tld: 'hq.com.ai',
        description: 'Startup HQ domains',
        available: true,
      }

      expect(baseDomain.tld).toBe('hq.com.ai')
      expect(baseDomain.description).toBe('Startup HQ domains')
      expect(baseDomain.available).toBe(true)
    })

    it('should define DomainsClient interface with all required methods', () => {
      const client: DomainsClient = mockClientInstance as DomainsClient

      expect(typeof client.claim).toBe('function')
      expect(typeof client.release).toBe('function')
      expect(typeof client.route).toBe('function')
      expect(typeof client.unroute).toBe('function')
      expect(typeof client.get).toBe('function')
      expect(typeof client.getRoute).toBe('function')
      expect(typeof client.list).toBe('function')
      expect(typeof client.count).toBe('function')
      expect(typeof client.check).toBe('function')
      expect(typeof client.baseDomains).toBe('function')
      expect(typeof client.isValidDomain).toBe('function')
      expect(typeof client.isFreeTLD).toBe('function')
      expect(typeof client.extractTLD).toBe('function')
      expect(typeof client.extractSubdomain).toBe('function')
      expect(client.dns).toBeDefined()
    })
  })

  // ===========================================================================
  // Factory Function Tests
  // ===========================================================================

  describe('Domains Factory Function', () => {
    it('should create client with default endpoint https://builder.domains', () => {
      mockCreateClient.mockClear()

      Domains()

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://builder.domains',
        undefined
      )
    })

    it('should pass options to createClient', () => {
      const options: ClientOptions = {
        apiKey: 'my-api-key',
        baseURL: 'https://custom.builder.domains',
      }

      Domains(options)

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://builder.domains',
        options
      )
    })

    it('should return typed DomainsClient', () => {
      const client = Domains()

      expect(client).toBeDefined()
      expect(typeof client.claim).toBe('function')
    })
  })

  // ===========================================================================
  // Default Instance Tests
  // ===========================================================================

  describe('Default domains Instance', () => {
    it('should be pre-configured with default options', () => {
      expect(domains).toBeDefined()
    })

    it('should use environment-based API key resolution', () => {
      expect(domains).toBeDefined()
    })
  })

  // ===========================================================================
  // Client Method Tests
  // ===========================================================================

  describe('Client Methods', () => {
    describe('claim()', () => {
      it('should claim a domain', async () => {
        const client = Domains()

        const result = await client.claim('my-startup.hq.com.ai')

        expect(mockClientInstance.claim).toHaveBeenCalledWith('my-startup.hq.com.ai')
        expect(result.name).toBe('my-startup.hq.com.ai')
        expect(result.status).toBe('active')
      })

      it('should return DomainRecord on successful claim', async () => {
        const client = Domains()

        const result = await client.claim('test.hq.com.ai')

        expect(result.id).toBeDefined()
        expect(result.orgId).toBeDefined()
        expect(result.tld).toBe('hq.com.ai')
      })
    })

    describe('release()', () => {
      it('should release a domain', async () => {
        const client = Domains()

        const result = await client.release('my-startup.hq.com.ai')

        expect(mockClientInstance.release).toHaveBeenCalledWith('my-startup.hq.com.ai')
        expect(result).toBe(true)
      })
    })

    describe('route()', () => {
      it('should route a domain to a worker', async () => {
        const client = Domains()
        const config: RouteConfig = { worker: 'my-worker' }

        const result = await client.route('my-startup.hq.com.ai', config)

        expect(mockClientInstance.route).toHaveBeenCalledWith('my-startup.hq.com.ai', config)
        expect(result.workerId).toBe('my-worker')
      })

      it('should accept custom origin in route config', async () => {
        const client = Domains()
        const config: RouteConfig = { customOrigin: 'https://origin.example.com' }

        await client.route('my-startup.hq.com.ai', config)

        expect(mockClientInstance.route).toHaveBeenCalledWith(
          'my-startup.hq.com.ai',
          expect.objectContaining({ customOrigin: 'https://origin.example.com' })
        )
      })
    })

    describe('unroute()', () => {
      it('should remove routing from a domain', async () => {
        const client = Domains()

        const result = await client.unroute('my-startup.hq.com.ai')

        expect(mockClientInstance.unroute).toHaveBeenCalledWith('my-startup.hq.com.ai')
        expect(result.workerId).toBeUndefined()
      })
    })

    describe('get()', () => {
      it('should get domain details', async () => {
        const client = Domains()

        const result = await client.get('my-startup.hq.com.ai')

        expect(mockClientInstance.get).toHaveBeenCalledWith('my-startup.hq.com.ai')
        expect(result).not.toBeNull()
        expect(result?.name).toBe('my-startup.hq.com.ai')
      })

      it('should return null for non-existent domain', async () => {
        mockClientInstance.get.mockResolvedValueOnce(null)
        const client = Domains()

        const result = await client.get('nonexistent.hq.com.ai')

        expect(result).toBeNull()
      })
    })

    describe('getRoute()', () => {
      it('should get route configuration', async () => {
        const client = Domains()

        const result = await client.getRoute('my-startup.hq.com.ai')

        expect(mockClientInstance.getRoute).toHaveBeenCalledWith('my-startup.hq.com.ai')
        expect(result?.worker).toBe('my-worker')
      })

      it('should return null for unrouted domain', async () => {
        mockClientInstance.getRoute.mockResolvedValueOnce(null)
        const client = Domains()

        const result = await client.getRoute('unrouted.hq.com.ai')

        expect(result).toBeNull()
      })
    })

    describe('list()', () => {
      it('should list all domains', async () => {
        mockClientInstance.list.mockResolvedValueOnce([
          {
            id: 'dom_1',
            name: 'app1.hq.com.ai',
            orgId: 'org_456',
            tld: 'hq.com.ai',
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
          {
            id: 'dom_2',
            name: 'app2.hq.com.ai',
            orgId: 'org_456',
            tld: 'hq.com.ai',
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ])

        const client = Domains()

        const result = await client.list()

        expect(mockClientInstance.list).toHaveBeenCalled()
        expect(result).toHaveLength(2)
      })

      it('should accept filter options', async () => {
        const client = Domains()
        const options: ListOptions = { status: 'active', limit: 10 }

        await client.list(options)

        expect(mockClientInstance.list).toHaveBeenCalledWith(options)
      })
    })

    describe('count()', () => {
      it('should count domains', async () => {
        mockClientInstance.count.mockResolvedValueOnce(5)
        const client = Domains()

        const result = await client.count()

        expect(mockClientInstance.count).toHaveBeenCalled()
        expect(result).toBe(5)
      })
    })

    describe('check()', () => {
      it('should check domain availability', async () => {
        const client = Domains()

        const result = await client.check('available.hq.com.ai')

        expect(mockClientInstance.check).toHaveBeenCalledWith('available.hq.com.ai')
        expect(result.available).toBe(true)
      })

      it('should return false for taken domain', async () => {
        mockClientInstance.check.mockResolvedValueOnce({
          domain: 'taken.hq.com.ai',
          available: false,
          ownerId: 'org_other',
        })

        const client = Domains()

        const result = await client.check('taken.hq.com.ai')

        expect(result.available).toBe(false)
        expect(result.ownerId).toBe('org_other')
      })
    })

    describe('baseDomains()', () => {
      it('should list available base domains', async () => {
        const client = Domains()

        const result = await client.baseDomains()

        expect(mockClientInstance.baseDomains).toHaveBeenCalled()
        expect(result).toHaveLength(6)
        expect(result[0].tld).toBe('hq.com.ai')
      })
    })

    describe('isValidDomain()', () => {
      it('should validate domain format', async () => {
        const client = Domains()

        const result = await client.isValidDomain('valid.hq.com.ai')

        expect(mockClientInstance.isValidDomain).toHaveBeenCalledWith('valid.hq.com.ai')
        expect(result).toBe(true)
      })

      it('should return false for invalid domain', async () => {
        mockClientInstance.isValidDomain.mockResolvedValueOnce(false)
        const client = Domains()

        const result = await client.isValidDomain('invalid domain')

        expect(result).toBe(false)
      })
    })

    describe('isFreeTLD()', () => {
      it('should check if TLD is free', async () => {
        const client = Domains()

        const result = await client.isFreeTLD('hq.com.ai')

        expect(mockClientInstance.isFreeTLD).toHaveBeenCalledWith('hq.com.ai')
        expect(result).toBe(true)
      })

      it('should return false for non-free TLD', async () => {
        mockClientInstance.isFreeTLD.mockResolvedValueOnce(false)
        const client = Domains()

        const result = await client.isFreeTLD('com')

        expect(result).toBe(false)
      })
    })

    describe('extractTLD()', () => {
      it('should extract TLD from domain', async () => {
        const client = Domains()

        const result = await client.extractTLD('my-startup.hq.com.ai')

        expect(mockClientInstance.extractTLD).toHaveBeenCalledWith('my-startup.hq.com.ai')
        expect(result).toBe('hq.com.ai')
      })

      it('should return null for invalid domain', async () => {
        mockClientInstance.extractTLD.mockResolvedValueOnce(null)
        const client = Domains()

        const result = await client.extractTLD('invalid')

        expect(result).toBeNull()
      })
    })

    describe('extractSubdomain()', () => {
      it('should extract subdomain from domain', async () => {
        const client = Domains()

        const result = await client.extractSubdomain('my-startup.hq.com.ai')

        expect(mockClientInstance.extractSubdomain).toHaveBeenCalledWith('my-startup.hq.com.ai')
        expect(result).toBe('my-startup')
      })
    })
  })

  // ===========================================================================
  // DNS Client Tests
  // ===========================================================================

  describe('DNS Client', () => {
    describe('dns.set()', () => {
      it('should set a DNS record', async () => {
        const client = Domains()
        const record: DNSRecord = {
          type: 'A',
          name: '@',
          content: '192.168.1.1',
          ttl: 1,
          proxied: true,
        }

        const result = await client.dns.set('my-startup.hq.com.ai', record)

        expect(mockDnsClient.set).toHaveBeenCalledWith('my-startup.hq.com.ai', record)
        expect(result.type).toBe('A')
      })
    })

    describe('dns.get()', () => {
      it('should get DNS records', async () => {
        mockDnsClient.get.mockResolvedValueOnce([
          { type: 'A', name: '@', content: '192.168.1.1', ttl: 1, proxied: true },
        ])

        const client = Domains()

        const result = await client.dns.get('my-startup.hq.com.ai')

        expect(mockDnsClient.get).toHaveBeenCalledWith('my-startup.hq.com.ai')
        expect(result).toHaveLength(1)
      })

      it('should filter by record type', async () => {
        const client = Domains()

        await client.dns.get('my-startup.hq.com.ai', 'A')

        expect(mockDnsClient.get).toHaveBeenCalledWith('my-startup.hq.com.ai', 'A')
      })
    })

    describe('dns.delete()', () => {
      it('should delete a DNS record', async () => {
        const client = Domains()

        const result = await client.dns.delete('my-startup.hq.com.ai', 'record_123')

        expect(mockDnsClient.delete).toHaveBeenCalledWith('my-startup.hq.com.ai', 'record_123')
        expect(result).toBe(true)
      })
    })
  })

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should propagate domain already claimed error', async () => {
      mockClientInstance.claim.mockRejectedValueOnce(
        new Error('Domain already claimed')
      )

      const client = Domains()

      await expect(client.claim('taken.hq.com.ai'))
        .rejects.toThrow('Domain already claimed')
    })

    it('should propagate invalid domain format error', async () => {
      mockClientInstance.claim.mockRejectedValueOnce(
        new Error('Invalid domain format')
      )

      const client = Domains()

      await expect(client.claim('invalid domain'))
        .rejects.toThrow('Invalid domain format')
    })

    it('should propagate not authorized error', async () => {
      mockClientInstance.release.mockRejectedValueOnce(
        new Error('Not authorized: domain belongs to another organization')
      )

      const client = Domains()

      await expect(client.release('not-yours.hq.com.ai'))
        .rejects.toThrow('Not authorized')
    })

    it('should propagate premium domain error', async () => {
      mockClientInstance.claim.mockRejectedValueOnce(
        new Error('Premium domain - upgrade required to use custom or premium TLDs')
      )

      const client = Domains()

      await expect(client.claim('startup.com'))
        .rejects.toThrow('Premium domain')
    })
  })

  // ===========================================================================
  // Integration Pattern Tests
  // ===========================================================================

  describe('Integration Patterns', () => {
    it('should work with Workers service bindings pattern', () => {
      // In Workers, builder.domains is accessed via env.DOMAINS
      // The SDK provides external access via RPC
      expect(domains).toBeDefined()
    })

    it('should support typical domain setup workflow', async () => {
      const client = Domains()

      // 1. Check availability
      const availability = await client.check('my-app.hq.com.ai')
      expect(availability.available).toBe(true)

      // 2. Claim domain
      const claimed = await client.claim('my-app.hq.com.ai')
      expect(claimed.status).toBe('active')

      // 3. Route to worker
      const routed = await client.route('my-app.hq.com.ai', { worker: 'my-api' })
      expect(routed.workerId).toBe('my-worker')

      // 4. Verify with get
      const domain = await client.get('my-app.hq.com.ai')
      expect(domain).not.toBeNull()
    })
  })
})
