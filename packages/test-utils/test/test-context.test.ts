import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createTestContext,
  withTestContext,
  createFixture,
  useFixture,
  registerCleanup,
  runCleanup,
  assertRequest,
  assertResponse,
  assertDurableObjectState,
} from '../src/context/index.js'
import {
  createMockRequest,
  createMockResponse,
  createMockDurableObjectState,
  createMockEnv,
  createMockExecutionContext,
  createMockKVNamespace,
} from '../src/mocks/index.js'

/**
 * Tests defining the contract for test context setup/teardown utilities.
 *
 * These tests define what the context helpers should provide:
 * - Test context creation with env, request, and execution context
 * - Fixture management for reusable test data
 * - Cleanup registration and execution
 * - Assertion helpers for common verification patterns
 */
describe('Test Context Utilities', () => {
  describe('createTestContext', () => {
    it('should create a test context with default mocks', () => {
      const ctx = createTestContext()
      expect(ctx).toBeDefined()
      expect(ctx.env).toBeDefined()
      expect(ctx.executionContext).toBeDefined()
    })

    it('should allow overriding env bindings', () => {
      const ctx = createTestContext({
        env: {
          MY_KV: createMockKVNamespace(),
          API_KEY: 'test-api-key',
        },
      })
      expect(ctx.env.MY_KV).toBeDefined()
      expect(ctx.env.API_KEY).toBe('test-api-key')
    })

    it('should allow overriding execution context', () => {
      const mockExecCtx = createMockExecutionContext()
      const ctx = createTestContext({
        executionContext: mockExecCtx,
      })
      expect(ctx.executionContext).toBe(mockExecCtx)
    })

    it('should provide waitUntil tracking', () => {
      const ctx = createTestContext()
      ctx.executionContext.waitUntil(Promise.resolve('done'))
      expect(ctx.getWaitUntilPromises()).toHaveLength(1)
    })

    it('should provide passThroughOnException tracking', () => {
      const ctx = createTestContext()
      ctx.executionContext.passThroughOnException()
      expect(ctx.didPassThroughOnException()).toBe(true)
    })

    it('should flush all waitUntil promises', async () => {
      const ctx = createTestContext()
      let resolved = false
      ctx.executionContext.waitUntil(
        new Promise<void>((resolve) => {
          setTimeout(() => {
            resolved = true
            resolve()
          }, 10)
        })
      )
      await ctx.flushWaitUntil()
      expect(resolved).toBe(true)
    })
  })

  describe('withTestContext', () => {
    it('should wrap a test function with context setup/teardown', async () => {
      let contextReceived = false

      await withTestContext(async (ctx) => {
        contextReceived = true
        expect(ctx.env).toBeDefined()
        expect(ctx.executionContext).toBeDefined()
      })

      expect(contextReceived).toBe(true)
    })

    it('should cleanup after test completes', async () => {
      let cleanedUp = false

      await withTestContext(
        async (ctx) => {
          registerCleanup(ctx, () => {
            cleanedUp = true
          })
        }
      )

      expect(cleanedUp).toBe(true)
    })

    it('should cleanup even if test throws', async () => {
      let cleanedUp = false

      await expect(
        withTestContext(async (ctx) => {
          registerCleanup(ctx, () => {
            cleanedUp = true
          })
          throw new Error('Test error')
        })
      ).rejects.toThrow('Test error')

      expect(cleanedUp).toBe(true)
    })
  })

  describe('createFixture', () => {
    it('should create a reusable test fixture', () => {
      const userFixture = createFixture('user', () => ({
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
      }))

      expect(userFixture).toBeDefined()
      expect(userFixture.name).toBe('user')
    })

    it('should generate fresh data on each use', () => {
      let counter = 0
      const counterFixture = createFixture('counter', () => ({
        value: ++counter,
      }))

      const instance1 = counterFixture.create()
      const instance2 = counterFixture.create()

      expect(instance1.value).toBe(1)
      expect(instance2.value).toBe(2)
    })

    it('should support fixture factory with options', () => {
      const userFixture = createFixture('user', (options?: { admin?: boolean }) => ({
        id: 'user-123',
        name: 'Test User',
        isAdmin: options?.admin ?? false,
      }))

      const normalUser = userFixture.create()
      const adminUser = userFixture.create({ admin: true })

      expect(normalUser.isAdmin).toBe(false)
      expect(adminUser.isAdmin).toBe(true)
    })

    it('should support async fixture creation', async () => {
      const asyncFixture = createFixture('async', async () => {
        await new Promise((r) => setTimeout(r, 10))
        return { loaded: true }
      })

      const instance = await asyncFixture.createAsync()
      expect(instance.loaded).toBe(true)
    })
  })

  describe('useFixture', () => {
    it('should use a fixture within a test context', async () => {
      const requestFixture = createFixture('request', () =>
        createMockRequest({ url: 'https://example.com/api' })
      )

      await withTestContext(async (ctx) => {
        const request = useFixture(ctx, requestFixture)
        expect(request.url).toBe('https://example.com/api')
      })
    })

    it('should automatically cleanup fixture on context teardown', async () => {
      let disposed = false
      const disposableFixture = createFixture(
        'disposable',
        () => ({ value: 'test' }),
        () => { disposed = true }
      )

      await withTestContext(async (ctx) => {
        useFixture(ctx, disposableFixture)
        expect(disposed).toBe(false)
      })

      expect(disposed).toBe(true)
    })
  })

  describe('registerCleanup / runCleanup', () => {
    it('should register cleanup functions', () => {
      const ctx = createTestContext()
      const cleanupFn = () => {}
      registerCleanup(ctx, cleanupFn)
      expect(ctx.getCleanupCount()).toBe(1)
    })

    it('should run cleanup functions in reverse order', async () => {
      const ctx = createTestContext()
      const order: number[] = []

      registerCleanup(ctx, () => order.push(1))
      registerCleanup(ctx, () => order.push(2))
      registerCleanup(ctx, () => order.push(3))

      await runCleanup(ctx)

      expect(order).toEqual([3, 2, 1])
    })

    it('should handle async cleanup functions', async () => {
      const ctx = createTestContext()
      let asyncCleanedUp = false

      registerCleanup(ctx, async () => {
        await new Promise((r) => setTimeout(r, 10))
        asyncCleanedUp = true
      })

      await runCleanup(ctx)
      expect(asyncCleanedUp).toBe(true)
    })

    it('should continue cleanup even if one fails', async () => {
      const ctx = createTestContext()
      let secondCleanupRan = false

      registerCleanup(ctx, () => { secondCleanupRan = true })
      registerCleanup(ctx, () => { throw new Error('Cleanup error') })

      await expect(runCleanup(ctx)).rejects.toThrow()
      expect(secondCleanupRan).toBe(true)
    })
  })

  describe('Assertion Helpers', () => {
    describe('assertRequest', () => {
      it('should assert request method', () => {
        const request = createMockRequest({
          url: 'https://example.com/api',
          method: 'POST',
        })

        expect(() => assertRequest(request, { method: 'POST' })).not.toThrow()
        expect(() => assertRequest(request, { method: 'GET' })).toThrow()
      })

      it('should assert request URL', () => {
        const request = createMockRequest({
          url: 'https://example.com/api/users',
        })

        expect(() => assertRequest(request, { url: /\/users$/ })).not.toThrow()
        expect(() => assertRequest(request, { url: 'https://example.com/api/users' })).not.toThrow()
        expect(() => assertRequest(request, { url: /\/posts$/ })).toThrow()
      })

      it('should assert request headers', () => {
        const request = createMockRequest({
          url: 'https://example.com/api',
          headers: { 'Content-Type': 'application/json' },
        })

        expect(() =>
          assertRequest(request, {
            headers: { 'Content-Type': 'application/json' },
          })
        ).not.toThrow()

        expect(() =>
          assertRequest(request, {
            headers: { 'Content-Type': 'text/plain' },
          })
        ).toThrow()
      })

      it('should assert request body as JSON', async () => {
        const request = createMockRequest({
          url: 'https://example.com/api',
          method: 'POST',
          json: { name: 'test' },
        })

        await expect(
          assertRequest(request, { jsonBody: { name: 'test' } })
        ).resolves.not.toThrow()
      })
    })

    describe('assertResponse', () => {
      it('should assert response status', () => {
        const response = createMockResponse({ status: 201 })

        expect(() => assertResponse(response, { status: 201 })).not.toThrow()
        expect(() => assertResponse(response, { status: 200 })).toThrow()
      })

      it('should assert response is ok', () => {
        const okResponse = createMockResponse({ status: 200 })
        const errorResponse = createMockResponse({ status: 500 })

        expect(() => assertResponse(okResponse, { ok: true })).not.toThrow()
        expect(() => assertResponse(errorResponse, { ok: true })).toThrow()
      })

      it('should assert response headers', () => {
        const response = createMockResponse({
          status: 200,
          headers: { 'X-Custom': 'value' },
        })

        expect(() =>
          assertResponse(response, {
            headers: { 'X-Custom': 'value' },
          })
        ).not.toThrow()
      })

      it('should assert response body as JSON', async () => {
        const response = createMockResponse({
          status: 200,
          json: { success: true },
        })

        await expect(
          assertResponse(response, { jsonBody: { success: true } })
        ).resolves.not.toThrow()
      })
    })

    describe('assertDurableObjectState', () => {
      it('should assert storage contains key', async () => {
        const state = createMockDurableObjectState()
        await state.storage.put('myKey', 'myValue')

        await expect(
          assertDurableObjectState(state, { hasKey: 'myKey' })
        ).resolves.not.toThrow()

        await expect(
          assertDurableObjectState(state, { hasKey: 'nonexistent' })
        ).rejects.toThrow()
      })

      it('should assert storage value', async () => {
        const state = createMockDurableObjectState()
        await state.storage.put('count', 42)

        await expect(
          assertDurableObjectState(state, { keyValue: { count: 42 } })
        ).resolves.not.toThrow()

        await expect(
          assertDurableObjectState(state, { keyValue: { count: 0 } })
        ).rejects.toThrow()
      })

      it('should assert storage key count', async () => {
        const state = createMockDurableObjectState()
        await state.storage.put('a', 1)
        await state.storage.put('b', 2)

        await expect(
          assertDurableObjectState(state, { keyCount: 2 })
        ).resolves.not.toThrow()

        await expect(
          assertDurableObjectState(state, { keyCount: 3 })
        ).rejects.toThrow()
      })
    })
  })
})

