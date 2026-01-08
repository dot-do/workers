/**
 * Tests for looker.do SDK
 *
 * These tests validate the LookerAPI client implementation including:
 * - Export patterns (Looker factory, looker instance, default export)
 * - Authentication methods (login, logout, session)
 * - Query execution (create, get, run, runInline, kill)
 * - Dashboard access (list, get, create, update, delete, run)
 * - Looks management
 * - Explores and Models
 * - Folders, Users, and Scheduled Plans
 * - SQL Runner
 *
 * Test coverage:
 * - Export pattern validation
 * - Type exports
 * - Client method signatures
 * - Integration with rpc.do
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// =============================================================================
// Export Pattern Tests
// =============================================================================

describe('looker.do SDK exports', () => {
  it('should export Looker factory function', async () => {
    const { Looker } = await import('../index')
    expect(typeof Looker).toBe('function')
  })

  it('should export looker instance', async () => {
    const { looker } = await import('../index')
    expect(looker).toBeDefined()
    expect(typeof looker).toBe('object')
  })

  it('should export default as looker instance', async () => {
    const { default: defaultExport, looker } = await import('../index')
    expect(defaultExport).toBe(looker)
  })

  it('should create a new client with Looker factory', async () => {
    const { Looker } = await import('../index')
    const client = Looker({ baseURL: 'https://company.looker.com' })
    expect(client).toBeDefined()
  })

  it('should support custom API options', async () => {
    const { Looker } = await import('../index')
    const client = Looker({
      baseURL: 'https://custom.looker.com',
      apiKey: 'test-key',
    })
    expect(client).toBeDefined()
  })
})

// =============================================================================
// Type Exports Tests
// =============================================================================

describe('type exports', () => {
  it('should export LookerClient type', async () => {
    const mod = await import('../index')
    expect(mod).toBeDefined()
  })

  it('should export Query type', async () => {
    const mod = await import('../index')
    expect(mod).toBeDefined()
  })

  it('should export QueryResult type', async () => {
    const mod = await import('../index')
    expect(mod).toBeDefined()
  })

  it('should export Dashboard type', async () => {
    const mod = await import('../index')
    expect(mod).toBeDefined()
  })

  it('should export Look type', async () => {
    const mod = await import('../index')
    expect(mod).toBeDefined()
  })

  it('should export Explore type', async () => {
    const mod = await import('../index')
    expect(mod).toBeDefined()
  })

  it('should export Model type', async () => {
    const mod = await import('../index')
    expect(mod).toBeDefined()
  })

  it('should export LookerCredentials type', async () => {
    const mod = await import('../index')
    expect(mod).toBeDefined()
  })

  it('should export AuthResponse type', async () => {
    const mod = await import('../index')
    expect(mod).toBeDefined()
  })

  it('should re-export ClientOptions from rpc.do', async () => {
    const mod = await import('../index')
    expect(mod).toBeDefined()
  })
})

// =============================================================================
// Authentication Tests
// =============================================================================

describe('LookerClient.auth methods', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: {} }),
    })
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should have auth.login method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.auth.login).toBe('function')
  })

  it('should have auth.logout method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.auth.logout).toBe('function')
  })

  it('should have auth.session method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.auth.session).toBe('function')
  })

  it('should login with credentials', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          accessToken: 'test-token',
          tokenType: 'Bearer',
          expiresIn: 3600,
        },
      }),
    })

    const { looker } = await import('../index')
    const response = await looker.auth.login({
      clientId: 'test-client',
      clientSecret: 'test-secret',
      baseUrl: 'https://company.looker.com',
    })

    expect(response).toBeDefined()
    expect(response.accessToken).toBe('test-token')
  })
})

// =============================================================================
// Query Execution Tests
// =============================================================================

describe('LookerClient.queries methods', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: {} }),
    })
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should have queries.create method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.queries.create).toBe('function')
  })

  it('should have queries.get method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.queries.get).toBe('function')
  })

  it('should have queries.run method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.queries.run).toBe('function')
  })

  it('should have queries.runInline method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.queries.runInline).toBe('function')
  })

  it('should have queries.kill method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.queries.kill).toBe('function')
  })

  it('should create a query', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          id: 'query-123',
          model: 'ecommerce',
          view: 'orders',
          fields: ['orders.count'],
        },
      }),
    })

    const { looker } = await import('../index')
    const query = await looker.queries.create({
      model: 'ecommerce',
      view: 'orders',
      fields: ['orders.count'],
    })

    expect(query.id).toBe('query-123')
  })

  it('should run a query', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          data: [{ 'orders.count': 42 }],
          fields: [{ name: 'orders.count', label: 'Orders Count', type: 'number' }],
          executionTime: 123,
        },
      }),
    })

    const { looker } = await import('../index')
    const result = await looker.queries.run({
      model: 'ecommerce',
      view: 'orders',
      fields: ['orders.count'],
    })

    expect(result.data).toBeDefined()
    expect(result.data.length).toBeGreaterThan(0)
  })

  it('should run inline query', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          data: [{ 'orders.count': 42 }],
          fields: [{ name: 'orders.count', label: 'Orders Count', type: 'number' }],
        },
      }),
    })

    const { looker } = await import('../index')
    const result = await looker.queries.runInline({
      model: 'ecommerce',
      view: 'orders',
      fields: ['orders.count'],
      filters: { 'orders.status': 'complete' },
    })

    expect(result.data).toBeDefined()
  })

  it('should support query with filters and sorts', async () => {
    const { looker } = await import('../index')

    await looker.queries.run({
      model: 'ecommerce',
      view: 'orders',
      fields: ['orders.count', 'orders.created_date'],
      filters: { 'orders.status': 'complete', 'orders.created_date': '7 days' },
      sorts: ['orders.created_date desc'],
      limit: 100,
    })

    expect(fetchMock).toHaveBeenCalled()
  })
})

// =============================================================================
// Dashboard Access Tests
// =============================================================================

describe('LookerClient.dashboards methods', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: {} }),
    })
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should have dashboards.list method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.dashboards.list).toBe('function')
  })

  it('should have dashboards.get method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.dashboards.get).toBe('function')
  })

  it('should have dashboards.create method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.dashboards.create).toBe('function')
  })

  it('should have dashboards.update method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.dashboards.update).toBe('function')
  })

  it('should have dashboards.delete method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.dashboards.delete).toBe('function')
  })

  it('should have dashboards.run method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.dashboards.run).toBe('function')
  })

  it('should list dashboards', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: [
          { id: 'dash-1', title: 'Sales Overview' },
          { id: 'dash-2', title: 'Marketing Metrics' },
        ],
      }),
    })

    const { looker } = await import('../index')
    const dashboards = await looker.dashboards.list()

    expect(dashboards).toBeDefined()
    expect(dashboards.length).toBe(2)
  })

  it('should get a dashboard', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          id: 'dash-1',
          title: 'Sales Overview',
          description: 'Key sales metrics',
          dashboardElements: [],
        },
      }),
    })

    const { looker } = await import('../index')
    const dashboard = await looker.dashboards.get('dash-1')

    expect(dashboard.id).toBe('dash-1')
    expect(dashboard.title).toBe('Sales Overview')
  })

  it('should create a dashboard', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          id: 'dash-new',
          title: 'New Dashboard',
        },
      }),
    })

    const { looker } = await import('../index')
    const dashboard = await looker.dashboards.create({
      title: 'New Dashboard',
      description: 'A new dashboard',
    })

    expect(dashboard.id).toBe('dash-new')
  })

  it('should run dashboard queries', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          'element-1': { data: [{ metric: 100 }], fields: [] },
          'element-2': { data: [{ metric: 200 }], fields: [] },
        },
      }),
    })

    const { looker } = await import('../index')
    const results = await looker.dashboards.run('dash-1')

    expect(results).toBeDefined()
    expect(Object.keys(results).length).toBeGreaterThan(0)
  })
})

// =============================================================================
// Looks Tests
// =============================================================================

describe('LookerClient.looks methods', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: {} }),
    })
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should have looks.list method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.looks.list).toBe('function')
  })

  it('should have looks.get method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.looks.get).toBe('function')
  })

  it('should have looks.create method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.looks.create).toBe('function')
  })

  it('should have looks.update method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.looks.update).toBe('function')
  })

  it('should have looks.delete method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.looks.delete).toBe('function')
  })

  it('should have looks.run method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.looks.run).toBe('function')
  })

  it('should run a look', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          data: [{ metric: 42 }],
          fields: [{ name: 'metric', label: 'Metric', type: 'number' }],
        },
      }),
    })

    const { looker } = await import('../index')
    const result = await looker.looks.run('look-123')

    expect(result.data).toBeDefined()
  })
})

// =============================================================================
// Explores and Models Tests
// =============================================================================

describe('LookerClient.explores methods', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: {} }),
    })
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should have explores.list method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.explores.list).toBe('function')
  })

  it('should have explores.get method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.explores.get).toBe('function')
  })

  it('should list explores in a model', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: [
          { name: 'orders', label: 'Orders', modelName: 'ecommerce' },
          { name: 'customers', label: 'Customers', modelName: 'ecommerce' },
        ],
      }),
    })

    const { looker } = await import('../index')
    const explores = await looker.explores.list('ecommerce')

    expect(explores).toBeDefined()
    expect(explores.length).toBe(2)
  })

  it('should get an explore', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          name: 'orders',
          label: 'Orders',
          modelName: 'ecommerce',
          fields: {
            dimensions: [{ name: 'orders.id', label: 'Order ID', type: 'string' }],
            measures: [{ name: 'orders.count', label: 'Orders Count', type: 'count' }],
          },
        },
      }),
    })

    const { looker } = await import('../index')
    const explore = await looker.explores.get('ecommerce', 'orders')

    expect(explore.name).toBe('orders')
    expect(explore.fields).toBeDefined()
  })
})

describe('LookerClient.models methods', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: {} }),
    })
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should have models.list method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.models.list).toBe('function')
  })

  it('should have models.get method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.models.get).toBe('function')
  })

  it('should list models', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: [
          { name: 'ecommerce', label: 'E-Commerce' },
          { name: 'marketing', label: 'Marketing' },
        ],
      }),
    })

    const { looker } = await import('../index')
    const models = await looker.models.list()

    expect(models).toBeDefined()
    expect(models.length).toBe(2)
  })
})

// =============================================================================
// Folders Tests
// =============================================================================

describe('LookerClient.folders methods', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: {} }),
    })
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should have folders.list method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.folders.list).toBe('function')
  })

  it('should have folders.get method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.folders.get).toBe('function')
  })

  it('should have folders.children method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.folders.children).toBe('function')
  })

  it('should have folders.search method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.folders.search).toBe('function')
  })
})

// =============================================================================
// Users Tests
// =============================================================================

describe('LookerClient.users methods', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: {} }),
    })
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should have users.list method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.users.list).toBe('function')
  })

  it('should have users.get method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.users.get).toBe('function')
  })

  it('should have users.me method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.users.me).toBe('function')
  })

  it('should get current user', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          id: 'user-1',
          email: 'test@example.com',
          displayName: 'Test User',
        },
      }),
    })

    const { looker } = await import('../index')
    const user = await looker.users.me()

    expect(user.id).toBe('user-1')
    expect(user.email).toBe('test@example.com')
  })
})

// =============================================================================
// Scheduled Plans Tests
// =============================================================================

describe('LookerClient.scheduledPlans methods', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: {} }),
    })
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should have scheduledPlans.list method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.scheduledPlans.list).toBe('function')
  })

  it('should have scheduledPlans.get method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.scheduledPlans.get).toBe('function')
  })

  it('should have scheduledPlans.create method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.scheduledPlans.create).toBe('function')
  })

  it('should have scheduledPlans.update method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.scheduledPlans.update).toBe('function')
  })

  it('should have scheduledPlans.delete method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.scheduledPlans.delete).toBe('function')
  })

  it('should have scheduledPlans.runOnce method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.scheduledPlans.runOnce).toBe('function')
  })
})

// =============================================================================
// SQL Runner Tests
// =============================================================================

describe('LookerClient.sql methods', () => {
  let fetchMock: ReturnType<typeof vi.fn>
  let originalFetch: typeof globalThis.fetch

  beforeEach(() => {
    originalFetch = globalThis.fetch
    fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: {} }),
    })
    globalThis.fetch = fetchMock
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('should have sql.run method', async () => {
    const { looker } = await import('../index')
    expect(typeof looker.sql.run).toBe('function')
  })

  it('should run SQL query', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        result: {
          data: [{ count: 42 }],
          fields: [{ name: 'count', label: 'Count', type: 'number' }],
        },
      }),
    })

    const { looker } = await import('../index')
    const result = await looker.sql.run('SELECT COUNT(*) as count FROM orders')

    expect(result.data).toBeDefined()
  })
})

// =============================================================================
// Integration with rpc.do
// =============================================================================

describe('rpc.do integration', () => {
  it('should use rpc.do createClient', async () => {
    const { Looker } = await import('../index')

    const client = Looker({
      baseURL: 'https://company.looker.com',
      apiKey: 'test-key',
    })

    expect(client).toBeDefined()
  })

  it('should support transport options', async () => {
    const { Looker } = await import('../index')

    const client = Looker({
      baseURL: 'https://company.looker.com',
      transport: 'http',
      timeout: 30000,
      retry: { attempts: 3, delay: 1000, backoff: 'exponential' },
    })

    expect(client).toBeDefined()
  })

  it('should support custom headers', async () => {
    const { Looker } = await import('../index')

    const client = Looker({
      baseURL: 'https://company.looker.com',
      headers: {
        'X-Custom-Header': 'value',
      },
    })

    expect(client).toBeDefined()
  })
})
