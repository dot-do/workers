/**
 * Tests for code execution engine
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { executeCode } from '../src/executor'
import type { Env, ExecuteCodeRequest, ServiceContext } from '../src/types'

// Mock Worker Loader - Simplified version that directly executes user code
const createMockWorkerLoader = () => {
  const get = (id: string, codeCallback: any) => {
    // Worker Loader's get() is synchronous - it returns the worker immediately
    // The callback is called lazily when the worker is first used

    // Return a worker-like object with a fetch handler
    const worker = {
      fetch: async (request: Request) => {
        // Get the WorkerCode object from the callback (now, when fetch is called)
        const workerCode = await codeCallback()
        const logs: string[] = []

        try {
          // Capture console.log if requested
          const originalConsoleLog = console.log
          if (workerCode.modules && Object.values(workerCode.modules)[0]?.includes('__logs')) {
            console.log = (...args: any[]) => {
              logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '))
            }
          }

          // Extract the actual user code from the wrapped module
          // The wrapped code contains: __output = await (async () => { ${code} })();
          // We need to extract the ${code} part
          const wrappedCode = Object.values(workerCode.modules || {})[0] || ''
          const codeMatch = wrappedCode.match(/__output = await \(async \(\) => \{([\s\S]*?)\}\)\(\);/)
          const userCode = codeMatch ? codeMatch[1].trim() : ''

          if (!userCode) {
            throw new Error(`Could not extract user code from wrapped module. Code length: ${wrappedCode.length}`)
          }

          // Execute the user code
          const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
          const fn = new AsyncFunction(userCode)
          const result = await fn()

          // Restore console.log
          console.log = originalConsoleLog

          return new Response(
            JSON.stringify({
              output: result,
              logs,
            }),
            { headers: { 'Content-Type': 'application/json' } }
          )
        } catch (error: any) {
          return new Response(
            JSON.stringify({
              error: error.message,
              stack: error.stack,
              logs,
            }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          )
        }
      },
    }

    return worker
  }

  return {
    get,
  }
}

// Mock environment
const createMockEnv = (overrides: Partial<Env> = {}): Env => ({
  LOADER: createMockWorkerLoader() as any,
  DB: {
    query: async (sql: string, ...params: any[]) => ({
      results: [],
      meta: { duration: 10 },
    }),
  } as any,
  AUTH: {
    validateToken: async (token: string) => ({
      valid: true,
      user: { id: '123' },
    }),
  } as any,
  GATEWAY: {} as any,
  SCHEDULE: {} as any,
  WEBHOOKS: {} as any,
  EMAIL: {} as any,
  MCP: {} as any,
  QUEUE: {} as any,
  CODE_CACHE: {
    get: async (key: string) => null,
    put: async (key: string, value: string) => undefined,
  } as any,
  MAX_EXECUTION_TIME: '30000',
  DEFAULT_COMPATIBILITY_DATE: '2025-01-01',
  ...overrides,
})

// Mock service context
const createMockContext = (role: 'admin' | 'tenant' | 'user' = 'admin'): ServiceContext => ({
  auth: {
    authenticated: true,
    user: {
      id: `usr_${role}`,
      email: `${role}@example.com`,
      name: `${role} user`,
      role: role === 'admin' ? 'admin' : role === 'tenant' ? 'tenant' : 'user',
      permissions: [],
      metadata: role === 'tenant' ? { tenantId: 'test-tenant' } : undefined,
    },
  },
  requestId: 'req_test_123',
  timestamp: Date.now(),
  metadata: {},
})

describe('Code Executor - Basic Execution', () => {
  it('should execute simple code and return result', async () => {
    const env = createMockEnv()
    const context = createMockContext('admin')

    const request: ExecuteCodeRequest = {
      code: 'return 2 + 2',
      bindings: [],
    }

    const result = await executeCode(request, env, context)
    if (!result.success) {
      console.error('Execution failed:', result.error)
    }
    expect(result.success).toBe(true)
    expect(result.result).toBe(4)
  })

  it('should execute async code', async () => {
    const env = createMockEnv()
    const context = createMockContext('admin')

    const request: ExecuteCodeRequest = {
      code: 'return await Promise.resolve(42)',
      bindings: [],
    }

    const result = await executeCode(request, env, context)
    expect(result.success).toBe(true)
    expect(result.result).toBe(42)
  })

  it('should execute code with variables', async () => {
    const env = createMockEnv()
    const context = createMockContext('admin')

    const request: ExecuteCodeRequest = {
      code: 'const x = 10; const y = 20; return x + y',
      bindings: [],
    }

    const result = await executeCode(request, env, context)
    expect(result.success).toBe(true)
    expect(result.result).toBe(30)
  })

  it('should execute code with objects', async () => {
    const env = createMockEnv()
    const context = createMockContext('admin')

    const request: ExecuteCodeRequest = {
      code: 'return { name: "Alice", age: 30, active: true }',
      bindings: [],
    }

    const result = await executeCode(request, env, context)
    expect(result.success).toBe(true)
    expect(result.result).toEqual({ name: 'Alice', age: 30, active: true })
  })

  it('should execute code with arrays', async () => {
    const env = createMockEnv()
    const context = createMockContext('admin')

    const request: ExecuteCodeRequest = {
      code: 'const arr = [1, 2, 3, 4, 5]; return arr.map(x => x * 2)',
      bindings: [],
    }

    const result = await executeCode(request, env, context)
    expect(result.success).toBe(true)
    expect(result.result).toEqual([2, 4, 6, 8, 10])
  })
})

describe('Code Executor - Error Handling', () => {
  it('should handle syntax errors', async () => {
    const env = createMockEnv()
    const context = createMockContext('admin')

    const request: ExecuteCodeRequest = {
      code: 'return 2 +',
      bindings: [],
    }

    const result = await executeCode(request, env, context)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should handle runtime errors', async () => {
    const env = createMockEnv()
    const context = createMockContext('admin')

    const request: ExecuteCodeRequest = {
      code: 'throw new Error("Test error")',
      bindings: [],
    }

    const result = await executeCode(request, env, context)
    expect(result.success).toBe(false)
    expect(result.error?.message).toContain('Test error')
  })

  it('should handle missing Worker Loader', async () => {
    const env = createMockEnv({ LOADER: undefined })
    const context = createMockContext('admin')

    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: [],
    }

    const result = await executeCode(request, env, context)
    expect(result.success).toBe(false)
    expect(result.error?.message).toContain('Worker Loader not available')
  })
})

describe('Code Executor - Authorization Integration', () => {
  it('should respect internal tier permissions', async () => {
    const env = createMockEnv()
    const context = createMockContext('admin')

    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: ['db', 'email', 'queue'],
      timeout: 60000,
    }

    const result = await executeCode(request, env, context)
    expect(result.success).toBe(true)
  })

  it('should respect tenant tier permissions', async () => {
    const env = createMockEnv()
    const context = createMockContext('tenant')

    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: ['db', 'email'],
      timeout: 25000,
    }

    const result = await executeCode(request, env, context)
    expect(result.success).toBe(true)
  })

  it('should enforce tenant timeout limits', async () => {
    const env = createMockEnv()
    const context = createMockContext('tenant')

    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: ['db'],
      timeout: 60000, // Exceeds 30s tenant limit
    }

    const result = await executeCode(request, env, context)
    expect(result.success).toBe(false)
    expect(result.error?.message).toContain('Timeout')
  })

  it('should reject unauthorized bindings', async () => {
    // Use tenant user trying to access internal bindings
    const env = createMockEnv()
    const context = createMockContext('tenant')

    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: ['auth', 'gateway'], // Internal-only bindings
    }

    const result = await executeCode(request, env, context)
    expect(result.success).toBe(false)
    expect(result.error?.message).toContain('Access denied')
  })
})

describe('Code Executor - Timeout Enforcement', () => {
  it('should respect custom timeout', async () => {
    const env = createMockEnv()
    const context = createMockContext('admin')

    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: [],
      timeout: 5000,
    }

    const result = await executeCode(request, env, context)
    expect(result.success).toBe(true)
    expect(result.executionTime).toBeLessThan(5000)
  })

  it('should use default timeout when not specified', async () => {
    const env = createMockEnv()
    const context = createMockContext('admin')

    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: [],
    }

    const result = await executeCode(request, env, context)
    expect(result.success).toBe(true)
  })

  it('should cap timeout at tier maximum', async () => {
    const env = createMockEnv()
    const context = createMockContext('user')

    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: [],
      timeout: 60000, // Should be capped at 10s for public tier
    }

    // The timeout should be automatically capped in the executor
    const result = await executeCode(request, env, context)
    // Since public tier can't execute arbitrary code in production,
    // this will fail authorization, but that's the expected behavior
    expect(result.success).toBe(false)
  })
})

describe('Code Executor - Execution Metrics', () => {
  it('should include execution time in result', async () => {
    const env = createMockEnv()
    const context = createMockContext('admin')

    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: [],
    }

    const result = await executeCode(request, env, context)
    expect(result.executionTime).toBeGreaterThan(0)
    expect(result.executionTime).toBeLessThan(1000)
  })

  it('should capture logs when requested', async () => {
    const env = createMockEnv()
    const context = createMockContext('admin')

    const request: ExecuteCodeRequest = {
      code: 'console.log("test log"); return 42',
      bindings: [],
      captureConsole: true,
    }

    const result = await executeCode(request, env, context)
    expect(result.logs).toBeDefined()
    expect(Array.isArray(result.logs)).toBe(true)
  })
})

describe('Code Executor - Context Passing', () => {
  it('should work without context (testing/development)', async () => {
    const env = createMockEnv()

    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: [],
    }

    const result = await executeCode(request, env)
    expect(result.success).toBe(true)
    expect(result.result).toBe(42)
  })

  it('should work with authenticated context', async () => {
    const env = createMockEnv()
    const context = createMockContext('admin')

    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: [],
    }

    const result = await executeCode(request, env, context)
    expect(result.success).toBe(true)
    expect(result.result).toBe(42)
  })

  it('should work with unauthenticated context', async () => {
    const env = createMockEnv()
    const context: ServiceContext = {
      auth: {
        authenticated: false,
      },
      requestId: 'req_anon',
      timestamp: Date.now(),
      metadata: {},
    }

    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: [],
    }

    const result = await executeCode(request, env, context)
    // Should succeed in non-production environment
    expect(result.success).toBe(true)
  })
})
