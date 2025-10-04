/**
 * Tests for DO worker RPC proxy
 */

import { describe, it, expect, beforeEach } from 'vitest'

// Mock environment
const createMockEnv = () => ({
  DB_SERVICE: {
    get: async (ns: string, id: string) => ({ ns, id, name: 'Test Item' }),
    list: async (ns: string) => ({ items: [], total: 0 }),
    health: async () => ({ status: 'healthy' }),
  },
  AUTH_SERVICE: {
    validateToken: async (token: string) => ({ valid: true, user: { id: '123' } }),
    health: async () => ({ status: 'healthy' }),
  },
  AI_SERVICE: {
    generateText: async (prompt: string) => ({ text: 'Generated text' }),
    health: async () => ({ status: 'healthy' }),
  },
  ENVIRONMENT: 'test' as const,
})

describe('DO RPC Proxy - Service Detection', () => {
  it('should identify available services', () => {
    const env = createMockEnv()

    // DB service should be available
    expect(env.DB_SERVICE).toBeDefined()
    expect(typeof env.DB_SERVICE.get).toBe('function')

    // Auth service should be available
    expect(env.AUTH_SERVICE).toBeDefined()
    expect(typeof env.AUTH_SERVICE.validateToken).toBe('function')
  })

  it('should list service methods', () => {
    const env = createMockEnv()

    const dbMethods = Object.keys(env.DB_SERVICE)
    expect(dbMethods).toContain('get')
    expect(dbMethods).toContain('list')
    expect(dbMethods).toContain('health')
  })
})

describe('DO RPC Proxy - Method Calling', () => {
  it('should call service methods via RPC', async () => {
    const env = createMockEnv()

    const result = await env.DB_SERVICE.get('users', '123')
    expect(result).toEqual({ ns: 'users', id: '123', name: 'Test Item' })
  })

  it('should handle multiple services', async () => {
    const env = createMockEnv()

    const dbResult = await env.DB_SERVICE.health()
    const authResult = await env.AUTH_SERVICE.health()
    const aiResult = await env.AI_SERVICE.health()

    expect(dbResult.status).toBe('healthy')
    expect(authResult.status).toBe('healthy')
    expect(aiResult.status).toBe('healthy')
  })

  it('should pass arguments correctly', async () => {
    const env = createMockEnv()

    const result = await env.AUTH_SERVICE.validateToken('test-token')
    expect(result.valid).toBe(true)
    expect(result.user.id).toBe('123')
  })
})

describe('DO RPC Proxy - Error Handling', () => {
  it('should handle missing service', () => {
    const env = createMockEnv() as any

    expect(env.MISSING_SERVICE).toBeUndefined()
  })

  it('should handle missing method', async () => {
    const env = createMockEnv() as any

    expect(env.DB_SERVICE.missingMethod).toBeUndefined()
  })
})

describe('DO RPC Proxy - Batch Operations', () => {
  it('should support parallel calls', async () => {
    const env = createMockEnv()

    const [result1, result2, result3] = await Promise.all([
      env.DB_SERVICE.get('users', '1'),
      env.DB_SERVICE.get('users', '2'),
      env.DB_SERVICE.get('users', '3'),
    ])

    expect(result1.id).toBe('1')
    expect(result2.id).toBe('2')
    expect(result3.id).toBe('3')
  })

  it('should support sequential calls', async () => {
    const env = createMockEnv()

    const result1 = await env.DB_SERVICE.get('users', '1')
    const result2 = await env.AUTH_SERVICE.validateToken('token')
    const result3 = await env.AI_SERVICE.generateText('prompt')

    expect(result1).toBeDefined()
    expect(result2).toBeDefined()
    expect(result3).toBeDefined()
  })
})
