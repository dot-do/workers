/**
 * Dispatch Router Tests - O(1) Routing
 *
 * Tests for O(1) dispatch routing using secondary indexes.
 * These tests verify that dispatchByName uses DeploymentsStore.getByName()
 * instead of O(n) KV scan.
 *
 * RED PHASE: Tests written to fail - implementation pending.
 *
 * @module tests/dispatch-router.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { dispatchById, dispatchByName } from '../src/dispatch'
import { extractAppId, routeRequest } from '../src/router'

// ============================================================================
// Mock Types for Testing
// ============================================================================

/**
 * Mock DispatchNamespace for testing
 */
interface MockDispatchNamespace {
  get: (workerId: string) => { fetch: (req: Request) => Promise<Response> }
}

/**
 * DeploymentsStore interface for O(1) lookup
 * This is what the new implementation should use
 */
interface DeploymentsStore {
  getById(workerId: string): Promise<DeploymentRecord | null>
  getByName(name: string): Promise<DeploymentRecord | null>
  getRateLimitStatus(workerId: string): Promise<RateLimitStatus>
}

interface DeploymentRecord {
  workerId: string
  name: string
  url: string
  createdAt: string
  context?: { ns: string; type: string; id: string }
}

interface RateLimitStatus {
  allowed: boolean
  remaining: number
  resetAt: number
}

/**
 * Extended Env with DeploymentsStore for O(1) lookup
 */
interface EnvWithStore {
  apps: MockDispatchNamespace
  deployments: KVNamespace
  deploymentsStore: DeploymentsStore  // New: O(1) lookup store
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock worker response
 */
function createMockWorkerResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

/**
 * Create a mock request
 */
function createRequest(url: string, options?: RequestInit): Request {
  return new Request(url, options)
}

// ============================================================================
// dispatchById Tests
// ============================================================================

describe('dispatchById', () => {
  /**
   * Test: dispatchById dispatches to worker by ID
   *
   * Given a valid worker ID, the dispatcher should:
   * 1. Look up the deployment by ID
   * 2. Forward the request to the worker
   * 3. Return the worker's response
   */
  it('dispatches to worker by ID', async () => {
    const workerId = 'worker-123'
    const expectedData = { message: 'Hello from worker!' }

    // Mock environment
    const mockEnv = {
      apps: {
        get: vi.fn().mockReturnValue({
          fetch: vi.fn().mockResolvedValue(createMockWorkerResponse(expectedData))
        })
      },
      deployments: {
        get: vi.fn().mockResolvedValue(JSON.stringify({
          workerId,
          name: 'test-worker',
          url: 'https://test-worker.workers.do'
        }))
      }
    } as unknown as EnvWithStore

    const request = createRequest('https://worker.internal/api/test')
    const response = await dispatchById(workerId, request, mockEnv as any)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toEqual(expectedData)

    // Verify the worker was fetched by ID
    expect(mockEnv.apps.get).toHaveBeenCalledWith(workerId)
  })

  /**
   * Test: dispatchById returns 404 for unknown worker
   */
  it('returns 404 for unknown worker', async () => {
    const workerId = 'nonexistent-worker'

    const mockEnv = {
      apps: {
        get: vi.fn()
      },
      deployments: {
        get: vi.fn().mockResolvedValue(null)
      }
    } as unknown as EnvWithStore

    const request = createRequest('https://worker.internal/api/test')
    const response = await dispatchById(workerId, request, mockEnv as any)

    expect(response.status).toBe(404)
    const data = await response.json() as { error: string }
    expect(data.error).toBe('Worker not found')
  })
})

// ============================================================================
// dispatchByName Tests - O(1) Lookup
// ============================================================================

describe('dispatchByName - O(1) lookup', () => {
  /**
   * Test: dispatchByName uses DeploymentsStore.getByName() for O(1) lookup
   *
   * CRITICAL: This test verifies that the implementation uses O(1) secondary
   * index lookup instead of O(n) KV scan.
   *
   * Current implementation (FAILS): Scans all KV keys
   * Required implementation: Uses deploymentsStore.getByName()
   */
  it('dispatches by name using secondary index (O(1))', async () => {
    const workerName = 'my-awesome-app'
    const workerId = 'worker-456'
    const expectedData = { message: 'Hello from named worker!' }

    // Mock DeploymentsStore for O(1) lookup
    const mockDeploymentsStore: DeploymentsStore = {
      getById: vi.fn(),
      getByName: vi.fn().mockResolvedValue({
        workerId,
        name: workerName,
        url: `https://${workerName}.workers.do`
      }),
      getRateLimitStatus: vi.fn().mockResolvedValue({
        allowed: true,
        remaining: 100,
        resetAt: Date.now() + 60000
      })
    }

    const mockEnv = {
      apps: {
        get: vi.fn().mockReturnValue({
          fetch: vi.fn().mockResolvedValue(createMockWorkerResponse(expectedData))
        })
      },
      deployments: {
        // KV namespace should NOT be scanned
        list: vi.fn().mockRejectedValue(new Error('KV scan should not be called for O(1) lookup')),
        get: vi.fn()
      },
      deploymentsStore: mockDeploymentsStore
    } as unknown as EnvWithStore

    const request = createRequest('https://worker.internal/api/test')

    // This should use deploymentsStore.getByName() for O(1) lookup
    // Currently FAILS because dispatchByName uses KV scan
    const response = await dispatchByName(workerName, request, mockEnv as any)

    expect(response.status).toBe(200)
    const data = await response.json()
    expect(data).toEqual(expectedData)

    // Verify O(1) lookup was used
    expect(mockDeploymentsStore.getByName).toHaveBeenCalledWith(workerName)

    // Verify KV list was NOT called (no O(n) scan)
    expect(mockEnv.deployments.list).not.toHaveBeenCalled()

    // Verify correct worker was dispatched to
    expect(mockEnv.apps.get).toHaveBeenCalledWith(workerId)
  })

  /**
   * Test: dispatchByName returns 404 for unknown worker name
   */
  it('returns 404 for unknown worker name', async () => {
    const workerName = 'nonexistent-app'

    const mockDeploymentsStore: DeploymentsStore = {
      getById: vi.fn(),
      getByName: vi.fn().mockResolvedValue(null),
      getRateLimitStatus: vi.fn()
    }

    const mockEnv = {
      apps: {
        get: vi.fn()
      },
      deployments: {
        list: vi.fn(),
        get: vi.fn()
      },
      deploymentsStore: mockDeploymentsStore
    } as unknown as EnvWithStore

    const request = createRequest('https://worker.internal/api/test')
    const response = await dispatchByName(workerName, request, mockEnv as any)

    expect(response.status).toBe(404)
    const data = await response.json() as { error: string; name: string }
    expect(data.error).toBe('Worker not found')
    expect(data.name).toBe(workerName)
  })
})

// ============================================================================
// extractAppId Tests
// ============================================================================

describe('extractAppId', () => {
  /**
   * Test: Extract app ID from subdomain pattern
   * Pattern: {app}.workers.do
   */
  it('extracts app ID from subdomain pattern', () => {
    const url = new URL('https://my-app.apps.workers.do/api/users')
    const result = extractAppId(url)

    expect(result).not.toBeNull()
    expect(result?.appId).toBe('my-app')
    expect(result?.path).toBe('/api/users')
  })

  /**
   * Test: Extract app ID from path-based pattern
   * Pattern: apps.workers.do/{app}/*
   */
  it('extracts app ID from path pattern', () => {
    const url = new URL('https://apps.workers.do/my-app/api/users')
    const result = extractAppId(url)

    expect(result).not.toBeNull()
    expect(result?.appId).toBe('my-app')
    expect(result?.path).toBe('/api/users')
  })

  /**
   * Test: Extract app ID with root path
   */
  it('handles root path correctly', () => {
    const url = new URL('https://my-app.apps.workers.do/')
    const result = extractAppId(url)

    expect(result).not.toBeNull()
    expect(result?.appId).toBe('my-app')
    expect(result?.path).toBe('/')
  })

  /**
   * Test: Path-based with only app ID returns root path
   */
  it('handles path-based with only app ID', () => {
    const url = new URL('https://apps.workers.do/my-app')
    const result = extractAppId(url)

    expect(result).not.toBeNull()
    expect(result?.appId).toBe('my-app')
    expect(result?.path).toBe('/')
  })

  /**
   * Test: Returns null for unmatched URLs
   */
  it('returns null for unmatched URLs', () => {
    const url = new URL('https://example.com/api/users')
    const result = extractAppId(url)

    expect(result).toBeNull()
  })

  /**
   * Test: Thing context pattern (id.type.ns.do)
   */
  it('extracts Thing context from hostname', () => {
    const url = new URL('https://platform-docs.documentation.docs.do/page')
    const result = extractAppId(url)

    expect(result).not.toBeNull()
    expect(result?.appId).toBe('platform-docs-documentation-docs')
    expect(result?.path).toBe('/page')
    expect(result?.context).toEqual({
      ns: 'docs',
      type: 'documentation',
      id: 'platform-docs'
    })
  })
})

// ============================================================================
// routeRequest Tests - Full Routing with Headers
// ============================================================================

describe('routeRequest', () => {
  /**
   * Test: Full routing with headers
   *
   * The router should:
   * 1. Extract app ID from URL
   * 2. Look up worker ID (O(1))
   * 3. Add routing metadata headers
   * 4. Forward to worker
   * 5. Return response with routing headers
   */
  it('routes request with proper headers', async () => {
    const appId = 'test-app'
    const workerId = 'worker-789'
    const expectedBody = { result: 'success' }

    // Mock DeploymentsStore for O(1) lookup
    const mockDeploymentsStore: DeploymentsStore = {
      getById: vi.fn(),
      getByName: vi.fn().mockResolvedValue({
        workerId,
        name: appId,
        url: `https://${appId}.workers.do`
      }),
      getRateLimitStatus: vi.fn().mockResolvedValue({
        allowed: true,
        remaining: 100,
        resetAt: Date.now() + 60000
      })
    }

    let capturedRequest: Request | null = null
    const mockEnv = {
      apps: {
        get: vi.fn().mockReturnValue({
          fetch: vi.fn().mockImplementation((req: Request) => {
            capturedRequest = req
            return Promise.resolve(createMockWorkerResponse(expectedBody))
          })
        })
      },
      deployments: {
        list: vi.fn(),
        get: vi.fn().mockResolvedValue(JSON.stringify({ workerId, name: appId }))
      },
      deploymentsStore: mockDeploymentsStore
    } as unknown as EnvWithStore

    const request = createRequest(`https://${appId}.apps.workers.do/api/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Custom-Header': 'custom-value'
      },
      body: JSON.stringify({ input: 'test' })
    })

    const response = await routeRequest(request, mockEnv as any)

    expect(response.status).toBe(200)

    // Check response headers
    expect(response.headers.get('X-Routed-To')).toBe(workerId)
    expect(response.headers.get('X-App-Id')).toBe(appId)

    // Verify request was forwarded with metadata headers
    expect(capturedRequest).not.toBeNull()
    expect(capturedRequest!.headers.get('X-App-Id')).toBe(appId)
    expect(capturedRequest!.headers.get('X-Worker-Id')).toBe(workerId)
    expect(capturedRequest!.headers.get('X-Original-Host')).toBe(`${appId}.apps.workers.do`)
  })

  /**
   * Test: Router returns 404 for unknown app
   */
  it('returns 404 for unknown app', async () => {
    const appId = 'unknown-app'

    const mockDeploymentsStore: DeploymentsStore = {
      getById: vi.fn(),
      getByName: vi.fn().mockResolvedValue(null),
      getRateLimitStatus: vi.fn()
    }

    const mockEnv = {
      apps: {
        get: vi.fn()
      },
      deployments: {
        list: vi.fn().mockResolvedValue({ keys: [] }),
        get: vi.fn().mockResolvedValue(null)
      },
      deploymentsStore: mockDeploymentsStore
    } as unknown as EnvWithStore

    const request = createRequest(`https://${appId}.apps.workers.do/api/data`)
    const response = await routeRequest(request, mockEnv as any)

    expect(response.status).toBe(404)
    const data = await response.json() as { error: string; appId: string }
    expect(data.error).toBe('App not found')
    expect(data.appId).toBe(appId)
  })

  /**
   * Test: Router returns 400 for invalid URL format
   */
  it('returns 400 for invalid URL format', async () => {
    const mockEnv = {
      apps: { get: vi.fn() },
      deployments: { list: vi.fn(), get: vi.fn() }
    } as unknown as EnvWithStore

    const request = createRequest('https://example.com/api/data')
    const response = await routeRequest(request, mockEnv as any)

    expect(response.status).toBe(400)
    const data = await response.json() as { error: string }
    expect(data.error).toBe('Invalid URL format')
  })
})

// ============================================================================
// Rate Limiting Tests
// ============================================================================

describe('Rate limiting per worker', () => {
  /**
   * Test: Rate limiting blocks requests when limit exceeded
   *
   * Each worker should have its own rate limit. When exceeded:
   * 1. Return 429 Too Many Requests
   * 2. Include Retry-After header
   * 3. Include rate limit info in response
   */
  it('blocks requests when rate limit exceeded', async () => {
    const workerName = 'rate-limited-app'
    const workerId = 'worker-rate-limited'

    const mockDeploymentsStore: DeploymentsStore = {
      getById: vi.fn(),
      getByName: vi.fn().mockResolvedValue({
        workerId,
        name: workerName,
        url: `https://${workerName}.workers.do`
      }),
      getRateLimitStatus: vi.fn().mockResolvedValue({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 30000 // 30 seconds from now
      })
    }

    const mockEnv = {
      apps: {
        get: vi.fn().mockReturnValue({
          fetch: vi.fn()
        })
      },
      deployments: {
        list: vi.fn(),
        get: vi.fn()
      },
      deploymentsStore: mockDeploymentsStore
    } as unknown as EnvWithStore

    const request = createRequest('https://worker.internal/api/test')

    // This should check rate limit BEFORE dispatching
    // Currently FAILS because rate limiting is not implemented
    const response = await dispatchByName(workerName, request, mockEnv as any)

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBeDefined()

    const data = await response.json() as { error: string; retryAfter: number }
    expect(data.error).toBe('Rate limit exceeded')
    expect(data.retryAfter).toBeGreaterThan(0)

    // Worker should NOT have been called
    expect(mockEnv.apps.get).not.toHaveBeenCalled()
  })

  /**
   * Test: Rate limiting allows requests within limit
   */
  it('allows requests within rate limit', async () => {
    const workerName = 'allowed-app'
    const workerId = 'worker-allowed'
    const expectedData = { message: 'Request allowed' }

    const mockDeploymentsStore: DeploymentsStore = {
      getById: vi.fn(),
      getByName: vi.fn().mockResolvedValue({
        workerId,
        name: workerName,
        url: `https://${workerName}.workers.do`
      }),
      getRateLimitStatus: vi.fn().mockResolvedValue({
        allowed: true,
        remaining: 50,
        resetAt: Date.now() + 60000
      })
    }

    const mockEnv = {
      apps: {
        get: vi.fn().mockReturnValue({
          fetch: vi.fn().mockResolvedValue(createMockWorkerResponse(expectedData))
        })
      },
      deployments: {
        list: vi.fn(),
        get: vi.fn()
      },
      deploymentsStore: mockDeploymentsStore
    } as unknown as EnvWithStore

    const request = createRequest('https://worker.internal/api/test')
    const response = await dispatchByName(workerName, request, mockEnv as any)

    expect(response.status).toBe(200)

    // Rate limit headers should be present
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('50')
    expect(response.headers.get('X-RateLimit-Reset')).toBeDefined()
  })

  /**
   * Test: Rate limits are per-worker, not global
   */
  it('rate limits are per-worker', async () => {
    const worker1Name = 'worker-1'
    const worker2Name = 'worker-2'
    const worker1Id = 'id-1'
    const worker2Id = 'id-2'

    // Worker 1 is rate limited, worker 2 is not
    const mockDeploymentsStore: DeploymentsStore = {
      getById: vi.fn(),
      getByName: vi.fn().mockImplementation((name: string) => {
        if (name === worker1Name) {
          return Promise.resolve({ workerId: worker1Id, name: worker1Name })
        }
        return Promise.resolve({ workerId: worker2Id, name: worker2Name })
      }),
      getRateLimitStatus: vi.fn().mockImplementation((workerId: string) => {
        if (workerId === worker1Id) {
          return Promise.resolve({ allowed: false, remaining: 0, resetAt: Date.now() + 30000 })
        }
        return Promise.resolve({ allowed: true, remaining: 100, resetAt: Date.now() + 60000 })
      })
    }

    const mockEnv = {
      apps: {
        get: vi.fn().mockReturnValue({
          fetch: vi.fn().mockResolvedValue(createMockWorkerResponse({ ok: true }))
        })
      },
      deployments: { list: vi.fn(), get: vi.fn() },
      deploymentsStore: mockDeploymentsStore
    } as unknown as EnvWithStore

    const request = createRequest('https://worker.internal/api/test')

    // Worker 1 should be blocked
    const response1 = await dispatchByName(worker1Name, request, mockEnv as any)
    expect(response1.status).toBe(429)

    // Worker 2 should be allowed
    const response2 = await dispatchByName(worker2Name, request, mockEnv as any)
    expect(response2.status).toBe(200)
  })
})

// ============================================================================
// 404 for Unknown Workers Tests
// ============================================================================

describe('404 for unknown workers', () => {
  /**
   * Test: dispatchById returns 404 with proper error structure
   */
  it('dispatchById returns structured 404', async () => {
    const workerId = 'does-not-exist'

    const mockEnv = {
      apps: { get: vi.fn() },
      deployments: {
        get: vi.fn().mockResolvedValue(null)
      }
    } as unknown as EnvWithStore

    const request = createRequest('https://worker.internal/')
    const response = await dispatchById(workerId, request, mockEnv as any)

    expect(response.status).toBe(404)
    expect(response.headers.get('Content-Type')).toBe('application/json')

    const data = await response.json() as { error: string; workerId: string }
    expect(data.error).toBe('Worker not found')
    expect(data.workerId).toBe(workerId)
  })

  /**
   * Test: dispatchByName returns 404 with proper error structure
   */
  it('dispatchByName returns structured 404', async () => {
    const workerName = 'ghost-worker'

    const mockDeploymentsStore: DeploymentsStore = {
      getById: vi.fn(),
      getByName: vi.fn().mockResolvedValue(null),
      getRateLimitStatus: vi.fn()
    }

    const mockEnv = {
      apps: { get: vi.fn() },
      deployments: {
        list: vi.fn().mockResolvedValue({ keys: [] }),
        get: vi.fn().mockResolvedValue(null)
      },
      deploymentsStore: mockDeploymentsStore
    } as unknown as EnvWithStore

    const request = createRequest('https://worker.internal/')
    const response = await dispatchByName(workerName, request, mockEnv as any)

    expect(response.status).toBe(404)
    expect(response.headers.get('Content-Type')).toBe('application/json')

    const data = await response.json() as { error: string; name: string }
    expect(data.error).toBe('Worker not found')
    expect(data.name).toBe(workerName)
  })

  /**
   * Test: routeRequest returns 404 for unknown app via subdomain
   */
  it('routeRequest returns 404 for unknown subdomain app', async () => {
    const appId = 'mystery-app'

    const mockDeploymentsStore: DeploymentsStore = {
      getById: vi.fn(),
      getByName: vi.fn().mockResolvedValue(null),
      getRateLimitStatus: vi.fn()
    }

    const mockEnv = {
      apps: { get: vi.fn() },
      deployments: {
        list: vi.fn().mockResolvedValue({ keys: [] }),
        get: vi.fn().mockResolvedValue(null)
      },
      deploymentsStore: mockDeploymentsStore
    } as unknown as EnvWithStore

    const request = createRequest(`https://${appId}.apps.workers.do/`)
    const response = await routeRequest(request, mockEnv as any)

    expect(response.status).toBe(404)
    const data = await response.json() as { error: string; appId: string }
    expect(data.error).toBe('App not found')
    expect(data.appId).toBe(appId)
  })

  /**
   * Test: routeRequest returns 404 for unknown app via path
   */
  it('routeRequest returns 404 for unknown path-based app', async () => {
    const appId = 'invisible-app'

    const mockDeploymentsStore: DeploymentsStore = {
      getById: vi.fn(),
      getByName: vi.fn().mockResolvedValue(null),
      getRateLimitStatus: vi.fn()
    }

    const mockEnv = {
      apps: { get: vi.fn() },
      deployments: {
        list: vi.fn().mockResolvedValue({ keys: [] }),
        get: vi.fn().mockResolvedValue(null)
      },
      deploymentsStore: mockDeploymentsStore
    } as unknown as EnvWithStore

    const request = createRequest(`https://apps.workers.do/${appId}/api`)
    const response = await routeRequest(request, mockEnv as any)

    expect(response.status).toBe(404)
    const data = await response.json() as { error: string; appId: string }
    expect(data.error).toBe('App not found')
    expect(data.appId).toBe(appId)
  })
})
