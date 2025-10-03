/**
 * Gateway Service Tests
 *
 * Tests cover:
 * - Routing (path-based, domain-based)
 * - Authentication (bearer, API key, WorkOS session)
 * - Rate limiting (per-user, per-IP)
 * - Error handling
 * - RPC interface
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GatewayService } from '../src/index'
import type { GatewayEnv } from '../src/types'

// Mock environment
const createMockEnv = (): GatewayEnv => ({
  DB: {
    fetch: vi.fn(async (request: Request) =>
      Response.json({ service: 'db', path: new URL(request.url).pathname })
    ),
  } as any,
  AI: {
    fetch: vi.fn(async (request: Request) =>
      Response.json({ service: 'ai', path: new URL(request.url).pathname })
    ),
  } as any,
  AUTH: {
    fetch: vi.fn(async () => Response.json({ service: 'auth' })),
    validateApiKey: vi.fn(async (token: string) => {
      if (token === 'sk_live_valid') {
        return {
          valid: true,
          userId: 'user123',
          email: 'test@example.com',
          role: 'admin',
        }
      }
      return { valid: false }
    }),
    validateSession: vi.fn(async (token: string) => {
      if (token === 'valid_session') {
        return {
          valid: true,
          userId: 'user123',
          email: 'test@example.com',
          role: 'user',
          organizationId: 'org123',
        }
      }
      return { valid: false }
    }),
  } as any,
  QUEUE: { fetch: vi.fn(async () => Response.json({ service: 'queue' })) } as any,
  RELATIONSHIPS: { fetch: vi.fn(async () => Response.json({ service: 'relationships' })) } as any,
  EVENTS: { fetch: vi.fn(async () => Response.json({ service: 'events' })) } as any,
  WORKFLOWS: { fetch: vi.fn(async () => Response.json({ service: 'workflows' })) } as any,
  EMBEDDINGS: { fetch: vi.fn(async () => Response.json({ service: 'embeddings' })) } as any,
  BATCH: { fetch: vi.fn(async () => Response.json({ service: 'batch' })) } as any,
  SCHEDULE: { fetch: vi.fn(async () => Response.json({ service: 'schedule' })) } as any,
  CODE_EXEC: { fetch: vi.fn(async () => Response.json({ service: 'code-exec' })) } as any,
  CLAUDE_CODE: { fetch: vi.fn(async () => Response.json({ service: 'claude-code' })) } as any,
  GATEWAY_KV: undefined,
  GATEWAY_DB: undefined,
  ENVIRONMENT: 'test',
})

describe('Gateway Service - RPC Interface', () => {
  let service: GatewayService
  let env: GatewayEnv
  let ctx: ExecutionContext

  beforeEach(() => {
    env = createMockEnv()
    ctx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as any
    service = new GatewayService(ctx, env)
  })

  it('should provide health check via RPC', async () => {
    const health = await service.health()

    expect(health.status).toBe('healthy')
    expect(health.services).toContain('db')
    expect(health.services).toContain('ai')
    expect(health.timestamp).toBeDefined()
  })

  it('should route requests via RPC', async () => {
    const result = await service.route('http://example.com/db/test')

    expect(result.status).toBe(200)
    expect(result.body).toMatchObject({
      service: 'db',
      path: '/db/test',
    })
  })
})

describe('Gateway Service - HTTP Interface', () => {
  let env: GatewayEnv
  let ctx: ExecutionContext

  beforeEach(() => {
    env = createMockEnv()
    ctx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as any
  })

  const fetch = async (url: string, init?: RequestInit) => {
    const request = new Request(url, init)
    const service = new GatewayService(ctx, env)
    return await service.fetch(request)
  }

  it('should return health check', async () => {
    const response = await fetch('http://example.com/health')
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('healthy')
  })

  it('should route /db/* to DB service', async () => {
    const response = await fetch('http://example.com/db/things')
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.service).toBe('db')
    expect(env.DB.fetch).toHaveBeenCalled()
  })

  it('should route /ai/* to AI service', async () => {
    const response = await fetch('http://example.com/ai/generate')
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.service).toBe('ai')
    expect(env.AI.fetch).toHaveBeenCalled()
  })

  it('should route /auth/* to AUTH service', async () => {
    const response = await fetch('http://example.com/auth/login')
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.service).toBe('auth')
    expect(env.AUTH.fetch).toHaveBeenCalled()
  })

  it('should return 404 for unknown routes', async () => {
    const response = await fetch('http://example.com/unknown/path')
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Not found')
  })
})

describe('Gateway Service - Authentication', () => {
  let env: GatewayEnv
  let ctx: ExecutionContext

  beforeEach(() => {
    env = createMockEnv()
    ctx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as any
  })

  const fetch = async (url: string, init?: RequestInit) => {
    const request = new Request(url, init)
    const service = new GatewayService(ctx, env)
    return await service.fetch(request)
  }

  it('should authenticate with valid API key', async () => {
    const response = await fetch('http://example.com/db/things', {
      headers: {
        Authorization: 'Bearer sk_live_valid',
      },
    })

    expect(response.status).toBe(200)
    expect(env.AUTH.validateApiKey).toHaveBeenCalledWith('sk_live_valid')
  })

  it('should authenticate with valid session', async () => {
    const response = await fetch('http://example.com/db/things', {
      headers: {
        Cookie: 'session=valid_session',
      },
    })

    expect(response.status).toBe(200)
    expect(env.AUTH.validateSession).toHaveBeenCalledWith('valid_session')
  })

  it('should reject invalid API key', async () => {
    env.AUTH.validateApiKey = vi.fn(async () => ({ valid: false }))

    const response = await fetch('http://example.com/db/things', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer sk_live_invalid',
      },
    })

    expect(response.status).toBe(401)
  })

  it('should allow public routes without auth', async () => {
    const response = await fetch('http://example.com/health')

    expect(response.status).toBe(200)
  })

  it('should require auth for mutations', async () => {
    const response = await fetch('http://example.com/db/things', {
      method: 'POST',
      body: JSON.stringify({ test: 'data' }),
    })

    expect(response.status).toBe(401)
  })

  it('should require admin for admin routes', async () => {
    // User role
    env.AUTH.validateApiKey = vi.fn(async () => ({
      valid: true,
      userId: 'user123',
      role: 'user',
    }))

    const response = await fetch('http://example.com/batch/create', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer sk_live_valid',
      },
    })

    expect(response.status).toBe(403)
  })
})

describe('Gateway Service - Rate Limiting', () => {
  let env: GatewayEnv
  let ctx: ExecutionContext

  beforeEach(() => {
    env = createMockEnv()
    ctx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as any
  })

  const fetch = async (url: string, init?: RequestInit) => {
    const request = new Request(url, init)
    const service = new GatewayService(ctx, env)
    return await service.fetch(request)
  }

  it('should allow requests within rate limit', async () => {
    const response = await fetch('http://example.com/db/things')

    expect(response.status).toBe(200)
  })

  it('should rate limit excessive requests', async () => {
    // Make 61 requests (1 over limit)
    for (let i = 0; i < 61; i++) {
      await fetch('http://example.com/db/things', {
        headers: {
          'CF-Connecting-IP': '1.2.3.4',
        },
      })
    }

    const response = await fetch('http://example.com/db/things', {
      headers: {
        'CF-Connecting-IP': '1.2.3.4',
      },
    })

    expect(response.status).toBe(429)
    const data = await response.json()
    expect(data.error).toBe('Too many requests')
  })

  it('should have separate rate limits per IP', async () => {
    // Max out one IP
    for (let i = 0; i < 61; i++) {
      await fetch('http://example.com/db/things', {
        headers: {
          'CF-Connecting-IP': '1.2.3.4',
        },
      })
    }

    // Different IP should still work
    const response = await fetch('http://example.com/db/things', {
      headers: {
        'CF-Connecting-IP': '5.6.7.8',
      },
    })

    expect(response.status).toBe(200)
  })
})

describe('Gateway Service - Logging', () => {
  let env: GatewayEnv
  let ctx: ExecutionContext
  let consoleSpy: any

  beforeEach(() => {
    env = createMockEnv()
    ctx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as any
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  const fetch = async (url: string, init?: RequestInit) => {
    const request = new Request(url, init)
    const service = new GatewayService(ctx, env)
    return await service.fetch(request)
  }

  it('should log requests', async () => {
    await fetch('http://example.com/health')

    expect(consoleSpy).toHaveBeenCalled()
    const logCalls = consoleSpy.mock.calls.map((call: any) => JSON.parse(call[0]))
    const requestLog = logCalls.find((log: any) => log.type === 'request')

    expect(requestLog).toBeDefined()
    expect(requestLog.method).toBe('GET')
    expect(requestLog.path).toBe('/health')
  })

  it('should log responses', async () => {
    await fetch('http://example.com/health')

    const logCalls = consoleSpy.mock.calls.map((call: any) => JSON.parse(call[0]))
    const responseLog = logCalls.find((log: any) => log.type === 'response')

    expect(responseLog).toBeDefined()
    expect(responseLog.status).toBe(200)
    expect(responseLog.duration).toBeDefined()
  })

  it('should include request ID in logs', async () => {
    const response = await fetch('http://example.com/health')

    const requestId = response.headers.get('X-Request-ID')
    expect(requestId).toBeDefined()

    const logCalls = consoleSpy.mock.calls.map((call: any) => JSON.parse(call[0]))
    expect(logCalls.every((log: any) => log.requestId === requestId)).toBe(true)
  })
})

describe('Gateway Service - Error Handling', () => {
  let env: GatewayEnv
  let ctx: ExecutionContext

  beforeEach(() => {
    env = createMockEnv()
    ctx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as any
  })

  const fetch = async (url: string, init?: RequestInit) => {
    const request = new Request(url, init)
    const service = new GatewayService(ctx, env)
    return await service.fetch(request)
  }

  it('should handle service errors gracefully', async () => {
    env.DB.fetch = vi.fn(async () => {
      throw new Error('Database unavailable')
    })

    const response = await fetch('http://example.com/db/things')
    const data = await response.json()

    expect(response.status).toBe(502)
    expect(data.error).toBe('Service error')
    expect(data.service).toBe('db')
  })

  it('should return 404 for non-existent services', async () => {
    const response = await fetch('http://example.com/nonexistent/path')
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Not found')
  })
})
