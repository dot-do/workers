import { describe, it, expect } from 'vitest'
import {
  createMockEnv,
  createMockExecutionContext,
} from '../src/mocks/index.js'

/**
 * Tests defining the contract for Environment and ExecutionContext mocks.
 *
 * These tests define what the mock factories should provide:
 * - Environment object with bindings (KV, DO, R2, etc.)
 * - ExecutionContext with waitUntil and passThroughOnException
 * - Tracking and introspection capabilities for testing
 */
describe('Environment and ExecutionContext Mocks', () => {
  describe('createMockEnv', () => {
    it('should create an empty env by default', () => {
      const env = createMockEnv()
      expect(env).toBeDefined()
      expect(typeof env).toBe('object')
    })

    it('should support adding KV namespace bindings', () => {
      const env = createMockEnv({
        bindings: {
          MY_KV: { type: 'kv' },
        },
      })
      expect(env.MY_KV).toBeDefined()
      expect(typeof env.MY_KV.get).toBe('function')
      expect(typeof env.MY_KV.put).toBe('function')
    })

    it('should support adding Durable Object namespace bindings', () => {
      const env = createMockEnv({
        bindings: {
          MY_DO: { type: 'durable_object' },
        },
      })
      expect(env.MY_DO).toBeDefined()
      expect(typeof env.MY_DO.get).toBe('function')
      expect(typeof env.MY_DO.idFromName).toBe('function')
      expect(typeof env.MY_DO.idFromString).toBe('function')
    })

    it('should support adding R2 bucket bindings', () => {
      const env = createMockEnv({
        bindings: {
          MY_BUCKET: { type: 'r2' },
        },
      })
      expect(env.MY_BUCKET).toBeDefined()
      expect(typeof env.MY_BUCKET.get).toBe('function')
      expect(typeof env.MY_BUCKET.put).toBe('function')
      expect(typeof env.MY_BUCKET.delete).toBe('function')
      expect(typeof env.MY_BUCKET.list).toBe('function')
    })

    it('should support adding D1 database bindings', () => {
      const env = createMockEnv({
        bindings: {
          MY_DB: { type: 'd1' },
        },
      })
      expect(env.MY_DB).toBeDefined()
      expect(typeof env.MY_DB.prepare).toBe('function')
      expect(typeof env.MY_DB.batch).toBe('function')
      expect(typeof env.MY_DB.exec).toBe('function')
    })

    it('should support adding Queue bindings', () => {
      const env = createMockEnv({
        bindings: {
          MY_QUEUE: { type: 'queue' },
        },
      })
      expect(env.MY_QUEUE).toBeDefined()
      expect(typeof env.MY_QUEUE.send).toBe('function')
      expect(typeof env.MY_QUEUE.sendBatch).toBe('function')
    })

    it('should support plain value bindings (secrets/vars)', () => {
      const env = createMockEnv({
        bindings: {
          API_KEY: 'secret-key-123',
          DEBUG_MODE: 'true',
          MAX_RETRIES: 3,
        },
      })
      expect(env.API_KEY).toBe('secret-key-123')
      expect(env.DEBUG_MODE).toBe('true')
      expect(env.MAX_RETRIES).toBe(3)
    })

    it('should support mixing binding types', () => {
      const env = createMockEnv({
        bindings: {
          CACHE: { type: 'kv' },
          OBJECTS: { type: 'durable_object' },
          API_KEY: 'secret',
        },
      })
      expect(typeof env.CACHE.get).toBe('function')
      expect(typeof env.OBJECTS.get).toBe('function')
      expect(env.API_KEY).toBe('secret')
    })

    it('should support pre-created mock bindings', () => {
      const customKV = {
        get: async () => 'custom-value',
        put: async () => {},
        delete: async () => {},
        list: async () => ({ keys: [], list_complete: true }),
      }

      const env = createMockEnv({
        bindings: {
          CUSTOM_KV: customKV,
        },
      })

      expect(env.CUSTOM_KV).toBe(customKV)
    })
  })

  describe('createMockExecutionContext', () => {
    it('should create an execution context with waitUntil', () => {
      const ctx = createMockExecutionContext()
      expect(ctx).toBeDefined()
      expect(typeof ctx.waitUntil).toBe('function')
    })

    it('should create an execution context with passThroughOnException', () => {
      const ctx = createMockExecutionContext()
      expect(typeof ctx.passThroughOnException).toBe('function')
    })

    it('should track waitUntil calls', () => {
      const ctx = createMockExecutionContext()
      const promise1 = Promise.resolve('a')
      const promise2 = Promise.resolve('b')

      ctx.waitUntil(promise1)
      ctx.waitUntil(promise2)

      expect(ctx.getWaitUntilPromises()).toHaveLength(2)
      expect(ctx.getWaitUntilPromises()).toContain(promise1)
      expect(ctx.getWaitUntilPromises()).toContain(promise2)
    })

    it('should track passThroughOnException calls', () => {
      const ctx = createMockExecutionContext()
      expect(ctx.didPassThroughOnException()).toBe(false)

      ctx.passThroughOnException()
      expect(ctx.didPassThroughOnException()).toBe(true)
    })

    it('should flush all waitUntil promises', async () => {
      const ctx = createMockExecutionContext()
      const results: string[] = []

      ctx.waitUntil(
        (async () => {
          await new Promise((r) => setTimeout(r, 10))
          results.push('first')
        })()
      )

      ctx.waitUntil(
        (async () => {
          await new Promise((r) => setTimeout(r, 5))
          results.push('second')
        })()
      )

      await ctx.flushWaitUntil()

      expect(results).toContain('first')
      expect(results).toContain('second')
    })

    it('should throw if waitUntil promises reject (optional behavior)', async () => {
      const ctx = createMockExecutionContext({ throwOnWaitUntilReject: true })

      ctx.waitUntil(Promise.reject(new Error('Background task failed')))

      await expect(ctx.flushWaitUntil()).rejects.toThrow('Background task failed')
    })

    it('should allow non-throwing flush by default', async () => {
      const ctx = createMockExecutionContext()

      ctx.waitUntil(Promise.reject(new Error('Ignored error')))

      // Should not throw by default
      await expect(ctx.flushWaitUntil()).resolves.not.toThrow()
    })

    it('should provide abort controller for cleanup', () => {
      const ctx = createMockExecutionContext()
      expect(ctx.abortController).toBeInstanceOf(AbortController)
      expect(ctx.abortController.signal.aborted).toBe(false)
    })

    it('should abort signal on context disposal', () => {
      const ctx = createMockExecutionContext()
      ctx.dispose()
      expect(ctx.abortController.signal.aborted).toBe(true)
    })
  })

  describe('Durable Object Namespace Mock (via env)', () => {
    it('should create DurableObjectId from name', () => {
      const env = createMockEnv({
        bindings: {
          MY_DO: { type: 'durable_object' },
        },
      })

      const id = env.MY_DO.idFromName('test-object')
      expect(id).toBeDefined()
      expect(id.name).toBe('test-object')
    })

    it('should create DurableObjectId from string', () => {
      const env = createMockEnv({
        bindings: {
          MY_DO: { type: 'durable_object' },
        },
      })

      const hexId = 'abcd1234567890abcdef1234567890abcdef1234567890abcdef1234567890ab'
      const id = env.MY_DO.idFromString(hexId)
      expect(id).toBeDefined()
      expect(id.toString()).toBe(hexId)
    })

    it('should generate new unique DurableObjectId', () => {
      const env = createMockEnv({
        bindings: {
          MY_DO: { type: 'durable_object' },
        },
      })

      const id1 = env.MY_DO.newUniqueId()
      const id2 = env.MY_DO.newUniqueId()

      expect(id1.toString()).not.toBe(id2.toString())
    })

    it('should get DurableObjectStub from id', () => {
      const env = createMockEnv({
        bindings: {
          MY_DO: { type: 'durable_object' },
        },
      })

      const id = env.MY_DO.idFromName('test')
      const stub = env.MY_DO.get(id)

      expect(stub).toBeDefined()
      expect(typeof stub.fetch).toBe('function')
      expect(stub.id).toBe(id)
    })

    it('should allow registering DO handler for testing', async () => {
      const env = createMockEnv({
        bindings: {
          MY_DO: {
            type: 'durable_object',
            handler: async (request: Request) => {
              return new Response(`Handled: ${request.url}`)
            },
          },
        },
      })

      const id = env.MY_DO.idFromName('test')
      const stub = env.MY_DO.get(id)
      const response = await stub.fetch('https://do.internal/action')

      expect(await response.text()).toBe('Handled: https://do.internal/action')
    })
  })
})
