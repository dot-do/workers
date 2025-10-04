import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Tests for Dynamic Dispatch Worker
 *
 * Coverage:
 * - Subdomain-based routing (all 8 services)
 * - Path-based routing
 * - Default routing
 * - Error handling (unknown service, worker not found, dispatch errors)
 * - Namespace selection by environment
 */

// Response body types
interface ServiceResponse {
  service: string
  status?: string
  environment?: string
}

interface ErrorResponse {
  error: string
  message?: string
  hint?: string
  available_services?: string[]
}

// Type guards
function isServiceResponse(body: ServiceResponse | ErrorResponse): body is ServiceResponse {
  return 'service' in body
}

function isErrorResponse(body: ServiceResponse | ErrorResponse): body is ErrorResponse {
  return 'error' in body
}

// Mock dispatch namespace
class MockDispatchNamespace {
  private workers: Map<string, any> = new Map()

  // Add a worker to the namespace
  addWorker(name: string, response: Response) {
    this.workers.set(name, {
      fetch: vi.fn().mockResolvedValue(response),
    })
  }

  // Get worker from namespace
  get(name: string) {
    const worker = this.workers.get(name)
    if (!worker) {
      throw new Error(`Worker not found: ${name}`)
    }
    return worker
  }

  // Check if worker exists
  has(name: string): boolean {
    return this.workers.has(name)
  }
}

describe('Dynamic Dispatch Worker', () => {
  let env: any
  let productionNamespace: MockDispatchNamespace
  let stagingNamespace: MockDispatchNamespace
  let developmentNamespace: MockDispatchNamespace

  beforeEach(() => {
    // Create mock namespaces
    productionNamespace = new MockDispatchNamespace()
    stagingNamespace = new MockDispatchNamespace()
    developmentNamespace = new MockDispatchNamespace()

    // Setup environment
    env = {
      PRODUCTION: productionNamespace,
      STAGING: stagingNamespace,
      DEVELOPMENT: developmentNamespace,
      ENVIRONMENT: 'production',
    }

    // Add mock workers to production namespace
    const services = ['gateway', 'db', 'auth', 'schedule', 'webhooks', 'email', 'mcp', 'queue']
    services.forEach((service) => {
      productionNamespace.addWorker(
        service,
        new Response(
          JSON.stringify({
            service,
            status: 'healthy',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )
    })
  })

  describe('Subdomain-based routing', () => {
    it('should route gateway.do to gateway worker', async () => {
      const request = new Request('https://gateway.do/health')

      // Import worker (dynamic to avoid module caching issues in tests)
      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, env, {} as any)

      expect(response.status).toBe(200)
      const body = (await response.json()) as ServiceResponse | ErrorResponse
      expect(isServiceResponse(body)).toBe(true)
      if (isServiceResponse(body)) {
        expect(body.service).toBe('gateway')
      }
    })

    it('should route db.do to db worker', async () => {
      const request = new Request('https://db.do/query')

      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, env, {} as any)

      expect(response.status).toBe(200)
      const body = (await response.json()) as ServiceResponse | ErrorResponse
      if (isServiceResponse(body)) {
        expect(body.service).toBe('db')
      }
    })

    it('should route auth.do to auth worker', async () => {
      const request = new Request('https://auth.do/login')

      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, env, {} as any)

      expect(response.status).toBe(200)
      const body = (await response.json()) as ServiceResponse | ErrorResponse
      if (isServiceResponse(body)) {
        expect(body.service).toBe('auth')
      }
    })

    it('should route schedule.do to schedule worker', async () => {
      const request = new Request('https://schedule.do/jobs')

      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, env, {} as any)

      expect(response.status).toBe(200)
      const body = (await response.json()) as ServiceResponse | ErrorResponse
      if (isServiceResponse(body)) {
        expect(body.service).toBe('schedule')
      }
    })

    it('should route webhooks.do to webhooks worker', async () => {
      const request = new Request('https://webhooks.do/stripe')

      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, env, {} as any)

      expect(response.status).toBe(200)
      const body = (await response.json()) as ServiceResponse | ErrorResponse
      if (isServiceResponse(body)) {
        expect(body.service).toBe('webhooks')
      }
    })

    it('should route email.do to email worker', async () => {
      const request = new Request('https://email.do/send')

      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, env, {} as any)

      expect(response.status).toBe(200)
      const body = (await response.json()) as ServiceResponse | ErrorResponse
      if (isServiceResponse(body)) {
        expect(body.service).toBe('email')
      }
    })

    it('should route mcp.do to mcp worker', async () => {
      const request = new Request('https://mcp.do/tools')

      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, env, {} as any)

      expect(response.status).toBe(200)
      const body = (await response.json()) as ServiceResponse | ErrorResponse
      if (isServiceResponse(body)) {
        expect(body.service).toBe('mcp')
      }
    })

    it('should route queue.do to queue worker', async () => {
      const request = new Request('https://queue.do/messages')

      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, env, {} as any)

      expect(response.status).toBe(200)
      const body = (await response.json()) as ServiceResponse | ErrorResponse
      if (isServiceResponse(body)) {
        expect(body.service).toBe('queue')
      }
    })
  })

  describe('Path-based routing', () => {
    it('should route /api/db/* to db worker', async () => {
      const request = new Request('https://api.do/api/db/query')

      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, env, {} as any)

      expect(response.status).toBe(200)
      const body = (await response.json()) as ServiceResponse | ErrorResponse
      if (isServiceResponse(body)) {
        expect(body.service).toBe('db')
      }
    })

    it('should route /api/auth/* to auth worker', async () => {
      const request = new Request('https://api.do/api/auth/login')

      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, env, {} as any)

      expect(response.status).toBe(200)
      const body = (await response.json()) as ServiceResponse | ErrorResponse
      if (isServiceResponse(body)) {
        expect(body.service).toBe('auth')
      }
    })

    it('should route /api/schedule/* to schedule worker', async () => {
      const request = new Request('https://api.do/api/schedule/jobs')

      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, env, {} as any)

      expect(response.status).toBe(200)
      const body = (await response.json()) as ServiceResponse | ErrorResponse
      if (isServiceResponse(body)) {
        expect(body.service).toBe('schedule')
      }
    })

    it('should not match partial paths', async () => {
      const request = new Request('https://api.do/api/notdb/something')

      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, env, {} as any)

      // Should fall through to default gateway routing
      expect(response.status).toBe(200)
      const body = (await response.json()) as ServiceResponse | ErrorResponse
      if (isServiceResponse(body)) {
        expect(body.service).toBe('gateway')
      }
    })
  })

  describe('Default routing', () => {
    it('should route api.do to gateway worker', async () => {
      const request = new Request('https://api.do/health')

      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, env, {} as any)

      expect(response.status).toBe(200)
      const body = (await response.json()) as ServiceResponse | ErrorResponse
      if (isServiceResponse(body)) {
        expect(body.service).toBe('gateway')
      }
    })

    it('should route do (root domain) to gateway worker', async () => {
      const request = new Request('https://do/health')

      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, env, {} as any)

      expect(response.status).toBe(200)
      const body = (await response.json()) as ServiceResponse | ErrorResponse
      if (isServiceResponse(body)) {
        expect(body.service).toBe('gateway')
      }
    })
  })

  describe('Error handling', () => {
    it('should return 404 for unknown services', async () => {
      const request = new Request('https://unknown.do/test')

      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, env, {} as any)

      expect(response.status).toBe(404)
      const body = (await response.json()) as ServiceResponse | ErrorResponse
      expect(isErrorResponse(body)).toBe(true)
      if (isErrorResponse(body)) {
        expect(body.error).toBe('Service not found')
        expect(body.available_services).toContain('gateway')
        expect(body.available_services).toContain('db')
      }
    })

    it('should return 404 when worker not found in namespace', async () => {
      const request = new Request('https://newservice.do/test')

      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, env, {} as any)

      expect(response.status).toBe(404)
      const body = (await response.json()) as ServiceResponse | ErrorResponse
      if (isErrorResponse(body)) {
        expect(body.error).toBe('Service not found')
      }
    })

    it('should handle missing namespace configuration', async () => {
      const request = new Request('https://gateway.do/health')

      // Remove namespace from env
      const badEnv = { ...env, PRODUCTION: undefined }

      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, badEnv, {} as any)

      expect(response.status).toBe(500)
      const text = await response.text()
      expect(text).toBe('Configuration error')
    })

    it('should handle dispatch errors gracefully', async () => {
      // Create a namespace that throws on get()
      const errorNamespace = {
        get: vi.fn().mockImplementation(() => {
          throw new Error('Unexpected dispatch error')
        }),
      }

      const request = new Request('https://gateway.do/health')
      const errorEnv = { ...env, PRODUCTION: errorNamespace }

      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, errorEnv, {} as any)

      expect(response.status).toBe(500)
      const body = (await response.json()) as ServiceResponse | ErrorResponse
      if (isErrorResponse(body)) {
        expect(body.error).toBe('Internal server error')
      }
    })
  })

  describe('Environment selection', () => {
    it('should use PRODUCTION namespace when ENVIRONMENT=production', async () => {
      const request = new Request('https://gateway.do/health')
      env.ENVIRONMENT = 'production'

      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, env, {} as any)

      expect(response.status).toBe(200)
      // Verify it used production namespace by checking the response
    })

    it('should use STAGING namespace when ENVIRONMENT=staging', async () => {
      // Add worker to staging namespace
      stagingNamespace.addWorker(
        'gateway',
        new Response(
          JSON.stringify({
            service: 'gateway',
            environment: 'staging',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )

      const request = new Request('https://gateway.do/health')
      env.ENVIRONMENT = 'staging'

      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, env, {} as any)

      expect(response.status).toBe(200)
      const body = (await response.json()) as ServiceResponse | ErrorResponse
      if (isServiceResponse(body)) {
        expect(body.environment).toBe('staging')
      }
    })

    it('should use DEVELOPMENT namespace when ENVIRONMENT=development', async () => {
      // Add worker to development namespace
      developmentNamespace.addWorker(
        'gateway',
        new Response(
          JSON.stringify({
            service: 'gateway',
            environment: 'development',
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }
        )
      )

      const request = new Request('https://gateway.do/health')
      env.ENVIRONMENT = 'development'

      const worker = await import('../src/index')
      const response = await worker.default.fetch(request, env, {} as any)

      expect(response.status).toBe(200)
      const body = (await response.json()) as ServiceResponse | ErrorResponse
      if (isServiceResponse(body)) {
        expect(body.environment).toBe('development')
      }
    })
  })

  describe('Request forwarding', () => {
    it('should forward request headers to worker', async () => {
      const request = new Request('https://gateway.do/health', {
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'value',
        },
      })

      const worker = await import('../src/index')
      await worker.default.fetch(request, env, {} as any)

      // Worker should receive the original request with all headers
      const gatewayWorker = productionNamespace.get('gateway')
      expect(gatewayWorker.fetch).toHaveBeenCalledWith(request)
    })

    it('should forward POST request body to worker', async () => {
      const body = JSON.stringify({ test: 'data' })
      const request = new Request('https://gateway.do/api/test', {
        method: 'POST',
        body,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const worker = await import('../src/index')
      await worker.default.fetch(request, env, {} as any)

      // Worker should receive the original request with body
      const gatewayWorker = productionNamespace.get('gateway')
      expect(gatewayWorker.fetch).toHaveBeenCalledWith(request)
    })
  })
})
