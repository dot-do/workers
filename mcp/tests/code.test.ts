/**
 * Tests for MCP code execution tools
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { code_execute, code_generate, code_test, do_tool } from '../src/tools/code'
import type { Env, User } from '../src/types'

// Mock DO service
const createMockDOService = () => ({
  execute: vi.fn(async (request: any, context?: any) => {
    // Simulate code execution
    if (request.code.includes('throw')) {
      return {
        success: false,
        error: {
          message: 'Test error',
          stack: 'Error stack',
        },
        logs: [],
        executionTime: 50,
      }
    }

    // Simple eval for test purposes
    try {
      const result = await eval(`(async () => { ${request.code} })()`)
      return {
        success: true,
        result,
        logs: [],
        executionTime: 100,
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.message,
        },
        logs: [],
        executionTime: 50,
      }
    }
  }),
})

// Mock AI service
const createMockAIService = () => ({
  generate: vi.fn(async (request: any) => ({
    text: 'function factorial(n) { return n <= 1 ? 1 : n * factorial(n - 1); }\nreturn factorial(5)',
  })),
})

// Mock environment
const createMockEnv = (): Env => ({
  DO: createMockDOService() as any,
  AI: createMockAIService() as any,
  DB: {} as any,
  AUTH: {} as any,
  GATEWAY: {} as any,
  SCHEDULE: {} as any,
  WEBHOOKS: {} as any,
  EMAIL: {} as any,
  QUEUE: {} as any,
})

// Mock Hono context
const createMockContext = (env: Env) => ({
  env,
  req: {
    raw: new Request('http://localhost/'),
  },
  json: (data: any) => new Response(JSON.stringify(data)),
} as any)

// Mock user
const createMockUser = (role: 'admin' | 'tenant' | 'user' = 'admin'): User => ({
  id: `usr_${role}`,
  email: `${role}@example.com`,
  name: `${role} user`,
  role: role === 'admin' ? 'admin' : role === 'tenant' ? 'tenant' : 'user',
})

describe('MCP Code Tools - code_execute', () => {
  it('should execute simple code', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    const result = await code_execute(
      {
        code: 'return 2 + 2',
      },
      context,
      user
    )

    expect(result.success).toBe(true)
    expect(result.result).toBe(4)
    expect(env.DO.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'return 2 + 2',
        bindings: [],
        timeout: 30000,
        captureConsole: true,
        captureFetch: false,
      }),
      expect.objectContaining({
        auth: expect.objectContaining({
          authenticated: true,
          user: expect.objectContaining({
            id: 'usr_admin',
            role: 'admin',
          }),
        }),
      })
    )
  })

  it('should execute code with bindings', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    const result = await code_execute(
      {
        code: 'return 42',
        bindings: ['db', 'email'],
      },
      context,
      user
    )

    expect(result.success).toBe(true)
    expect(env.DO.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        bindings: ['db', 'email'],
      }),
      expect.any(Object)
    )
  })

  it('should execute code with custom timeout', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    const result = await code_execute(
      {
        code: 'return 42',
        timeout: 5000,
      },
      context,
      user
    )

    expect(result.success).toBe(true)
    expect(env.DO.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: 5000,
      }),
      expect.any(Object)
    )
  })

  it('should execute code with cache key', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    const result = await code_execute(
      {
        code: 'return 42',
        cacheKey: 'test-cache-key',
      },
      context,
      user
    )

    expect(result.success).toBe(true)
    expect(env.DO.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheKey: 'test-cache-key',
      }),
      expect.any(Object)
    )
  })

  it('should pass user context for authorization', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('tenant')

    await code_execute(
      {
        code: 'return 42',
      },
      context,
      user
    )

    expect(env.DO.execute).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        auth: expect.objectContaining({
          authenticated: true,
          user: expect.objectContaining({
            id: 'usr_tenant',
            role: 'tenant',
          }),
        }),
        requestId: expect.any(String),
        timestamp: expect.any(Number),
      })
    )
  })

  it('should work without user (unauthenticated)', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)

    const result = await code_execute(
      {
        code: 'return 42',
      },
      context,
      null
    )

    expect(result.success).toBe(true)
    expect(env.DO.execute).toHaveBeenCalledWith(expect.any(Object), undefined)
  })

  it('should handle execution errors', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    const result = await code_execute(
      {
        code: 'throw new Error("Test error")',
      },
      context,
      user
    )

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error.message).toBe('Test error')
  })

  it('should throw error when DO service not available', async () => {
    const env = createMockEnv()
    env.DO = undefined as any
    const context = createMockContext(env)
    const user = createMockUser('admin')

    await expect(
      code_execute(
        {
          code: 'return 42',
        },
        context,
        user
      )
    ).rejects.toThrow('Code execution service not available')
  })
})

describe('MCP Code Tools - code_generate', () => {
  it('should generate code from prompt', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    const result = await code_generate(
      {
        prompt: 'Calculate factorial of 5',
        execute: false,
      },
      context,
      user
    )

    expect(result.code).toBeDefined()
    expect(result.code).toContain('factorial')
    expect(env.AI.generate).toHaveBeenCalled()
  })

  it('should generate and execute code', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    const result = await code_generate(
      {
        prompt: 'Calculate factorial of 5',
        execute: true,
      },
      context,
      user
    )

    expect(result.code).toBeDefined()
    expect(result.execution).toBeDefined()
    expect(result.execution.success).toBe(true)
    expect(env.AI.generate).toHaveBeenCalled()
    expect(env.DO.execute).toHaveBeenCalled()
  })

  it('should pass bindings when executing', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    const result = await code_generate(
      {
        prompt: 'Query database',
        execute: true,
        bindings: ['db'],
      },
      context,
      user
    )

    expect(result.code).toBeDefined()
    expect(result.execution).toBeDefined()
    expect(env.DO.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        bindings: ['db'],
      }),
      undefined
    )
  })

  it('should handle AI service unavailable', async () => {
    const env = createMockEnv()
    env.AI = undefined as any
    const context = createMockContext(env)
    const user = createMockUser('admin')

    await expect(
      code_generate(
        {
          prompt: 'Generate code',
        },
        context,
        user
      )
    ).rejects.toThrow('AI service not available')
  })

  it('should handle execution errors gracefully', async () => {
    const env = createMockEnv()
    env.DO = undefined as any
    const context = createMockContext(env)
    const user = createMockUser('admin')

    const result = await code_generate(
      {
        prompt: 'Generate code',
        execute: true,
      },
      context,
      user
    )

    expect(result.code).toBeDefined()
    expect(result.error).toBe('Code execution service not available')
  })
})

describe('MCP Code Tools - code_test', () => {
  it('should test code and verify output', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    const result = await code_test(
      {
        code: 'return 2 + 2',
        expectedOutput: 4,
      },
      context,
      user
    )

    expect(result.passed).toBe(true)
    expect(result.actual).toBe(4)
    expect(result.expected).toBe(4)
  })

  it('should detect failing tests', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    const result = await code_test(
      {
        code: 'return 2 + 2',
        expectedOutput: 5,
      },
      context,
      user
    )

    expect(result.passed).toBe(false)
    expect(result.actual).toBe(4)
    expect(result.expected).toBe(5)
  })

  it('should test with complex objects', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    const expected = { name: 'Alice', age: 30 }

    const result = await code_test(
      {
        code: 'return { name: "Alice", age: 30 }',
        expectedOutput: expected,
      },
      context,
      user
    )

    expect(result.passed).toBe(true)
    expect(result.actual).toEqual(expected)
  })

  it('should test with bindings', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    const result = await code_test(
      {
        code: 'return 42',
        expectedOutput: 42,
        bindings: ['db'],
      },
      context,
      user
    )

    expect(result.passed).toBe(true)
    expect(env.DO.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        bindings: ['db'],
      }),
      expect.any(Object)
    )
  })

  it('should include execution metrics', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    const result = await code_test(
      {
        code: 'return 42',
        expectedOutput: 42,
      },
      context,
      user
    )

    expect(result.executionTime).toBeDefined()
    expect(result.logs).toBeDefined()
  })

  it('should pass user context for authorization', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('tenant')

    await code_test(
      {
        code: 'return 42',
        expectedOutput: 42,
      },
      context,
      user
    )

    expect(env.DO.execute).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        auth: expect.objectContaining({
          authenticated: true,
          user: expect.objectContaining({
            id: 'usr_tenant',
            role: 'tenant',
          }),
        }),
      })
    )
  })

  it('should throw error when DO service not available', async () => {
    const env = createMockEnv()
    env.DO = undefined as any
    const context = createMockContext(env)
    const user = createMockUser('admin')

    await expect(
      code_test(
        {
          code: 'return 42',
          expectedOutput: 42,
        },
        context,
        user
      )
    ).rejects.toThrow('Code execution service not available')
  })
})

describe('MCP Code Tools - Context Building', () => {
  it('should build proper service context for admin user', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    await code_execute(
      {
        code: 'return 42',
      },
      context,
      user
    )

    expect(env.DO.execute).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        auth: {
          authenticated: true,
          user: {
            id: 'usr_admin',
            email: 'admin@example.com',
            name: 'admin user',
            role: 'admin',
            permissions: [],
          },
        },
        requestId: expect.any(String),
        timestamp: expect.any(Number),
        metadata: {},
      })
    )
  })

  it('should build context with unique request ID', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    await code_execute({ code: 'return 1' }, context, user)
    await code_execute({ code: 'return 2' }, context, user)

    const calls = (env.DO.execute as any).mock.calls
    const requestId1 = calls[0][1].requestId
    const requestId2 = calls[1][1].requestId

    expect(requestId1).not.toBe(requestId2)
  })

  it('should not build context when user is null', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)

    await code_execute(
      {
        code: 'return 42',
      },
      context,
      null
    )

    expect(env.DO.execute).toHaveBeenCalledWith(expect.any(Object), undefined)
  })
})

describe('MCP Code Tools - do_tool (Universal Business-as-Code Tool)', () => {
  it('should execute simple code with $ runtime', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    const result = await do_tool(
      {
        code: 'return 2 + 2',
      },
      context,
      user
    )

    expect(result.success).toBe(true)
    expect(result.result).toBe(4)
    expect(env.DO.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'return 2 + 2',
        timeout: 30000,
        captureConsole: true,
        captureFetch: false,
      }),
      expect.objectContaining({
        auth: expect.objectContaining({
          authenticated: true,
          user: expect.objectContaining({
            id: 'usr_admin',
            role: 'admin',
          }),
        }),
      })
    )
  })

  it('should execute code with direct primitive access (ai, db, etc.)', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    const result = await do_tool(
      {
        code: 'return { message: "Hello from $ runtime" }',
      },
      context,
      user
    )

    expect(result.success).toBe(true)
    expect(result.result).toEqual({ message: 'Hello from $ runtime' })
  })

  it('should execute code with $ object', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    const result = await do_tool(
      {
        code: 'const { ai, db } = $; return { ai: typeof ai, db: typeof db }',
      },
      context,
      user
    )

    expect(result.success).toBe(true)
  })

  it('should support custom timeout', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    await do_tool(
      {
        code: 'return 42',
        timeout: 15000,
      },
      context,
      user
    )

    expect(env.DO.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: 15000,
      }),
      expect.any(Object)
    )
  })

  it('should support cache key', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    await do_tool(
      {
        code: 'return 42',
        cacheKey: 'my-cache-key',
      },
      context,
      user
    )

    expect(env.DO.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheKey: 'my-cache-key',
      }),
      expect.any(Object)
    )
  })

  it('should work for unauthenticated users', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)

    const result = await do_tool(
      {
        code: 'return "public access"',
      },
      context,
      null
    )

    expect(result.success).toBe(true)
    expect(env.DO.execute).toHaveBeenCalledWith(expect.any(Object), undefined)
  })

  it('should pass user context for authorization', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('tenant')

    await do_tool(
      {
        code: 'return user.id',
      },
      context,
      user
    )

    expect(env.DO.execute).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        auth: {
          authenticated: true,
          user: {
            id: 'usr_tenant',
            email: 'tenant@example.com',
            name: 'tenant user',
            role: 'tenant',
            permissions: [],
          },
        },
        requestId: expect.any(String),
        timestamp: expect.any(Number),
        metadata: {},
      })
    )
  })

  it('should handle execution errors', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    const result = await do_tool(
      {
        code: 'throw new Error("Runtime error")',
      },
      context,
      user
    )

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error.message).toContain('error')
  })

  it('should throw error when DO service not available', async () => {
    const env = createMockEnv()
    env.DO = undefined as any
    const context = createMockContext(env)
    const user = createMockUser('admin')

    await expect(
      do_tool(
        {
          code: 'return 42',
        },
        context,
        user
      )
    ).rejects.toThrow('Code execution service not available')
  })

  it('should capture console logs by default', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    await do_tool(
      {
        code: 'console.log("test"); return 42',
      },
      context,
      user
    )

    expect(env.DO.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        captureConsole: true,
      }),
      expect.any(Object)
    )
  })

  it('should not capture fetch requests by default', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    await do_tool(
      {
        code: 'return 42',
      },
      context,
      user
    )

    expect(env.DO.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        captureFetch: false,
      }),
      expect.any(Object)
    )
  })

  it('should use default timeout of 30000ms', async () => {
    const env = createMockEnv()
    const context = createMockContext(env)
    const user = createMockUser('admin')

    await do_tool(
      {
        code: 'return 42',
      },
      context,
      user
    )

    expect(env.DO.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        timeout: 30000,
      }),
      expect.any(Object)
    )
  })
})
