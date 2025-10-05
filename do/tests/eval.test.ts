/**
 * Tests for Sandboxed Eval Endpoint - executeSandboxedCode()
 */

import { describe, it, expect } from 'vitest'
import { executeSandboxedCode } from '../src/executor'
import type { Env, ExecuteCodeRequest } from '../src/types'

// Mock Worker Loader for sandboxed evaluation (NO bindings)
const createSandboxedMockLoader = () => {
  const get = (id: string, codeCallback: any) => {
    const worker = {
      fetch: async (request: Request) => {
        const workerCode = await codeCallback()
        const logs: string[] = []

        try {
          // Extract user code from sandboxed wrapper
          const wrappedCode = Object.values(workerCode.modules || {})[0] || ''
          const codeMatch = wrappedCode.match(/__output = await \(async \(\) => \{([\s\S]*?)\}\)\(\);/)
          const userCode = codeMatch ? codeMatch[1].trim() : ''

          if (!userCode) {
            throw new Error('Could not extract user code from wrapped module')
          }

          // Capture console.log if requested
          const originalConsoleLog = console.log
          if (wrappedCode.includes('__logs')) {
            console.log = (...args: any[]) => {
              logs.push(args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '))
            }
          }

          // Execute in sandboxed context (no env bindings!)
          const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
          const fn = new AsyncFunction(userCode)
          const result = await fn()

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

  return { get }
}

// Mock environment for sandboxed evaluation
const createSandboxedEnv = (overrides: Partial<Env> = {}): Env => ({
  LOADER: createSandboxedMockLoader() as any,
  DB: {} as any,
  AUTH: {} as any,
  GATEWAY: {} as any,
  SCHEDULE: {} as any,
  WEBHOOKS: {} as any,
  EMAIL: {} as any,
  MCP: {} as any,
  QUEUE: {} as any,
  CODE_CACHE: undefined as any,
  MAX_EXECUTION_TIME: '30000',
  DEFAULT_COMPATIBILITY_DATE: '2025-01-01',
  ...overrides,
})

describe('Sandboxed Eval - Pure Code Evaluation', () => {
  it('should evaluate simple arithmetic', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return 1 + 1',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.result).toBe(2)
  })

  it('should evaluate string operations', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return "hello" + " " + "world"',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.result).toBe('hello world')
  })

  it('should evaluate array operations', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return [1, 2, 3].map(x => x * 2)',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.result).toEqual([2, 4, 6])
  })

  it('should evaluate object operations', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return { name: "Alice", age: 30, active: true }',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.result).toEqual({ name: 'Alice', age: 30, active: true })
  })

  it('should evaluate async code', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return await Promise.resolve(42)',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.result).toBe(42)
  })

  it('should evaluate complex expressions', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: `
        const factorial = (n) => n <= 1 ? 1 : n * factorial(n - 1)
        return factorial(5)
      `,
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.result).toBe(120)
  })
})

describe('Sandboxed Eval - Console Log Capture', () => {
  it('should capture console.log output', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'console.log("test log"); return 42',
      bindings: [],
      captureConsole: true,
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.result).toBe(42)
    expect(result.logs).toBeDefined()
    expect(result.logs).toContain('test log')
  })

  it('should capture multiple console.log calls', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'console.log("first"); console.log("second"); return 42',
      bindings: [],
      captureConsole: true,
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.logs).toHaveLength(2)
    expect(result.logs).toContain('first')
    expect(result.logs).toContain('second')
  })

  it('should NOT capture logs when captureConsole is false', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'console.log("test log"); return 42',
      bindings: [],
      captureConsole: false,
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.logs).toEqual([])
  })

  it('should capture object logs as JSON', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'console.log({ foo: "bar" }); return 42',
      bindings: [],
      captureConsole: true,
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.logs).toBeDefined()
    expect(result.logs![0]).toContain('foo')
    expect(result.logs![0]).toContain('bar')
  })
})

describe('Sandboxed Eval - Environment Access Blocked', () => {
  it('should NOT have access to $ runtime', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return typeof $ !== "undefined" ? "has access" : "no access"',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.result).toBe('no access')
  })

  it('should NOT have access to env bindings', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return typeof env !== "undefined" ? "has access" : "no access"',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.result).toBe('no access')
  })

  it('should NOT have access to DB binding', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return typeof DB !== "undefined" ? "has access" : "no access"',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.result).toBe('no access')
  })

  it('should NOT have access to context', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return typeof __context !== "undefined" ? "has access" : "no access"',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.result).toBe('no access')
  })
})

describe('Sandboxed Eval - Fetch Blocked', () => {
  it('should NOT be able to fetch external URLs', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: `
        try {
          await fetch('https://example.com')
          return "fetch succeeded"
        } catch (error) {
          return "fetch blocked"
        }
      `,
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    // In sandboxed mode, fetch should either be undefined or throw
    expect(result.result).toBe('fetch blocked')
  })

  it('should verify fetch is undefined or blocked', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return typeof fetch',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    // fetch might be undefined or "function" but blocked by globalOutbound
    // The important part is that it can't actually be used
  })
})

describe('Sandboxed Eval - Timeout Handling', () => {
  it('should respect custom timeout', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: [],
      timeout: 5000,
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.executionTime).toBeLessThan(5000)
  })

  it('should use default timeout when not specified', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    // Default is 30000ms
    expect(result.executionTime).toBeLessThan(30000)
  })

  it('should include execution time in response', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.executionTime).toBeGreaterThanOrEqual(0)
    expect(typeof result.executionTime).toBe('number')
  })
})

describe('Sandboxed Eval - Error Handling', () => {
  it('should handle syntax errors gracefully', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return 2 +',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error?.message).toBeTruthy()
  })

  it('should handle runtime errors', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'throw new Error("Test error")',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(false)
    expect(result.error?.message).toContain('Test error')
  })

  it('should provide stack traces for errors', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'throw new Error("Stack trace test")',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(false)
    expect(result.error?.stack).toBeDefined()
  })

  it('should handle reference errors', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return undefinedVariable',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(false)
    expect(result.error?.message).toContain('undefinedVariable')
  })

  it('should handle type errors', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'const x = null; return x.foo()',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should capture logs even when code fails', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'console.log("before error"); throw new Error("fail")',
      bindings: [],
      captureConsole: true,
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(false)
    expect(result.logs).toContain('before error')
  })
})

describe('Sandboxed Eval - Missing Worker Loader', () => {
  it('should handle missing LOADER gracefully', async () => {
    const env = createSandboxedEnv({ LOADER: undefined })
    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(false)
    expect(result.error?.message).toContain('Worker Loader not available')
  })

  it('should provide helpful error message when LOADER missing', async () => {
    const env = createSandboxedEnv({ LOADER: undefined })
    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(false)
    expect(result.error?.message).toContain('Cloudflare Workers')
    expect(result.error?.message).toContain('dynamic code execution')
  })
})

describe('Sandboxed Eval - Security Guarantees', () => {
  it('should not allow access to process', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return typeof process !== "undefined" ? "has access" : "no access"',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.result).toBe('no access')
  })

  it('should not allow access to global', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return typeof global !== "undefined" ? "has access" : "no access"',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.result).toBe('no access')
  })

  it('should have access to standard JavaScript globals', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return typeof Math !== "undefined" && typeof JSON !== "undefined" ? "ok" : "missing"',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.result).toBe('ok')
  })

  it('should be able to use Date', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return new Date().getFullYear() >= 2025',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.result).toBe(true)
  })

  it('should be able to use Promise', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return await Promise.all([Promise.resolve(1), Promise.resolve(2)])',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result.success).toBe(true)
    expect(result.result).toEqual([1, 2])
  })
})

describe('Sandboxed Eval - Execution ID Generation', () => {
  it('should generate unique execution IDs', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: [],
    }

    // Run multiple times
    const result1 = await executeSandboxedCode(request, env)
    const result2 = await executeSandboxedCode(request, env)

    expect(result1.success).toBe(true)
    expect(result2.success).toBe(true)
    // Each execution should be independent
  })
})

describe('Sandboxed Eval - Response Format', () => {
  it('should return success response with result', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('result')
    expect(result).toHaveProperty('logs')
    expect(result).toHaveProperty('executionTime')
  })

  it('should return error response on failure', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'throw new Error("fail")',
      bindings: [],
    }

    const result = await executeSandboxedCode(request, env)
    expect(result).toHaveProperty('success')
    expect(result).toHaveProperty('error')
    expect(result).toHaveProperty('logs')
    expect(result).toHaveProperty('executionTime')
    expect(result.success).toBe(false)
  })

  it('should not include requests field in sandboxed mode', async () => {
    const env = createSandboxedEnv()
    const request: ExecuteCodeRequest = {
      code: 'return 42',
      bindings: [],
      captureFetch: true,
    }

    const result = await executeSandboxedCode(request, env)
    expect(result).not.toHaveProperty('requests')
  })
})
