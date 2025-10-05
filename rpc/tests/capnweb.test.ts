import { describe, it, expect, beforeEach } from 'vitest'
import { z } from 'zod'
import { CapnWebRegistry, createRpcError, createRpcSuccess, validateRpcRequest } from '../src/capnweb'
import type { RpcContext } from '../src/types'

describe('CapnWeb Module', () => {
  let registry: CapnWebRegistry
  let context: RpcContext

  beforeEach(() => {
    registry = new CapnWebRegistry()
    context = {
      env: {} as any,
      request: new Request('https://rpc.do/rpc'),
    }
  })

  describe('CapnWebRegistry', () => {
    it('should register methods', () => {
      registry.register({
        name: 'test.method',
        description: 'Test method',
        requiresAuth: false,
        handler: async () => ({ result: 'success' }),
      })

      const method = registry.getMethod('test.method')
      expect(method).toBeDefined()
      expect(method?.name).toBe('test.method')
    })

    it('should list all methods', () => {
      registry.register({
        name: 'test.method1',
        description: 'Test method 1',
        requiresAuth: false,
        handler: async () => ({}),
      })

      registry.register({
        name: 'test.method2',
        description: 'Test method 2',
        requiresAuth: true,
        handler: async () => ({}),
      })

      const methods = registry.getMethods()
      expect(methods).toHaveLength(2)
    })

    it('should execute method successfully', async () => {
      registry.register({
        name: 'test.add',
        description: 'Add two numbers',
        requiresAuth: false,
        handler: async (params) => params.a + params.b,
      })

      const response = await registry.execute(
        { method: 'test.add', params: { a: 2, b: 3 }, id: '1' },
        context
      )

      expect(response.result).toBe(5)
      expect(response.id).toBe('1')
      expect(response.error).toBeUndefined()
    })

    it('should return error for non-existent method', async () => {
      const response = await registry.execute({ method: 'invalid.method', params: {}, id: '1' }, context)

      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe(-32601)
      expect(response.error?.message).toContain('Method not found')
    })

    it('should require authentication for protected methods', async () => {
      registry.register({
        name: 'test.protected',
        description: 'Protected method',
        requiresAuth: true,
        handler: async () => ({ data: 'secret' }),
      })

      const response = await registry.execute({ method: 'test.protected', params: {}, id: '1' }, context)

      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe(-32000)
      expect(response.error?.message).toBe('Authentication required')
    })

    it('should validate params with schema', async () => {
      registry.register({
        name: 'test.schema',
        description: 'Method with schema',
        requiresAuth: false,
        schema: z.object({
          name: z.string(),
          age: z.number(),
        }),
        handler: async (params) => params,
      })

      const response = await registry.execute(
        { method: 'test.schema', params: { name: 'John', age: 'invalid' }, id: '1' },
        context
      )

      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe(-32602)
      expect(response.error?.message).toBe('Invalid params')
    })

    it('should handle method execution errors', async () => {
      registry.register({
        name: 'test.error',
        description: 'Error method',
        requiresAuth: false,
        handler: async () => {
          throw new Error('Test error')
        },
      })

      const response = await registry.execute({ method: 'test.error', params: {}, id: '1' }, context)

      expect(response.error).toBeDefined()
      expect(response.error?.code).toBe(-32603)
      expect(response.error?.message).toBe('Test error')
    })

    it('should execute batch requests', async () => {
      registry.register({
        name: 'test.add',
        description: 'Add',
        requiresAuth: false,
        handler: async (params) => params.a + params.b,
      })

      const responses = await registry.executeBatch(
        [
          { method: 'test.add', params: { a: 1, b: 2 }, id: '1' },
          { method: 'test.add', params: { a: 3, b: 4 }, id: '2' },
        ],
        context
      )

      expect(responses).toHaveLength(2)
      expect(responses[0].result).toBe(3)
      expect(responses[1].result).toBe(7)
    })
  })

  describe('createRpcError', () => {
    it('should create error response', () => {
      const error = createRpcError(-32600, 'Invalid Request', { detail: 'test' }, '1')

      expect(error).toEqual({
        error: {
          code: -32600,
          message: 'Invalid Request',
          data: { detail: 'test' },
        },
        id: '1',
      })
    })
  })

  describe('createRpcSuccess', () => {
    it('should create success response', () => {
      const response = createRpcSuccess({ data: 'test' }, '1')

      expect(response).toEqual({
        result: { data: 'test' },
        id: '1',
      })
    })
  })

  describe('validateRpcRequest', () => {
    it('should validate correct request', () => {
      const request = { method: 'test.method', params: { a: 1 } }

      expect(validateRpcRequest(request)).toBe(true)
    })

    it('should reject invalid request', () => {
      expect(validateRpcRequest(null)).toBe(false)
      expect(validateRpcRequest({})).toBe(false)
      expect(validateRpcRequest({ method: 123 })).toBe(false)
    })
  })
})
