import { describe, it, expect } from 'vitest'
import {
  createMockDurableObjectStub,
  createMockDurableObjectState,
  createMockDurableObjectStorage,
  createMockDurableObjectId,
} from '../src/mocks/index.js'

/**
 * Tests defining the contract for Durable Object mock helpers.
 *
 * These tests define what the mock factories should provide:
 * - DurableObjectStub creation for testing DO interactions
 * - DurableObjectState with storage and ID
 * - In-memory DurableObjectStorage implementation
 * - DurableObjectId creation utilities
 */
describe('Durable Object Mock Helpers', () => {
  describe('createMockDurableObjectId', () => {
    it('should create a DurableObjectId with toString()', () => {
      const id = createMockDurableObjectId()
      expect(id).toBeDefined()
      expect(typeof id.toString()).toBe('string')
    })

    it('should create an ID with a specific name', () => {
      const id = createMockDurableObjectId({ name: 'my-object' })
      expect(id.name).toBe('my-object')
    })

    it('should create an ID from a hex string', () => {
      const hexId = 'deadbeef1234567890abcdef12345678deadbeef1234567890abcdef12345678'
      const id = createMockDurableObjectId({ id: hexId })
      expect(id.toString()).toBe(hexId)
    })

    it('should generate a unique ID when no options provided', () => {
      const id1 = createMockDurableObjectId()
      const id2 = createMockDurableObjectId()
      expect(id1.toString()).not.toBe(id2.toString())
    })

    it('should support equals() comparison', () => {
      const id1 = createMockDurableObjectId({ id: 'abc123' })
      const id2 = createMockDurableObjectId({ id: 'abc123' })
      const id3 = createMockDurableObjectId({ id: 'def456' })
      expect(id1.equals(id2)).toBe(true)
      expect(id1.equals(id3)).toBe(false)
    })
  })

  describe('createMockDurableObjectStorage', () => {
    it('should create an in-memory storage implementation', () => {
      const storage = createMockDurableObjectStorage()
      expect(storage).toBeDefined()
      expect(typeof storage.get).toBe('function')
      expect(typeof storage.put).toBe('function')
      expect(typeof storage.delete).toBe('function')
    })

    it('should support get/put operations', async () => {
      const storage = createMockDurableObjectStorage()
      await storage.put('key1', 'value1')
      const value = await storage.get('key1')
      expect(value).toBe('value1')
    })

    it('should return undefined for missing keys', async () => {
      const storage = createMockDurableObjectStorage()
      const value = await storage.get('nonexistent')
      expect(value).toBeUndefined()
    })

    it('should support delete operations', async () => {
      const storage = createMockDurableObjectStorage()
      await storage.put('key1', 'value1')
      const deleted = await storage.delete('key1')
      expect(deleted).toBe(true)
      const value = await storage.get('key1')
      expect(value).toBeUndefined()
    })

    it('should support batch get with multiple keys', async () => {
      const storage = createMockDurableObjectStorage()
      await storage.put('a', 1)
      await storage.put('b', 2)
      await storage.put('c', 3)
      const result = await storage.get(['a', 'b', 'c'])
      expect(result).toBeInstanceOf(Map)
      expect(result.get('a')).toBe(1)
      expect(result.get('b')).toBe(2)
      expect(result.get('c')).toBe(3)
    })

    it('should support batch put with object', async () => {
      const storage = createMockDurableObjectStorage()
      await storage.put({ x: 10, y: 20, z: 30 })
      expect(await storage.get('x')).toBe(10)
      expect(await storage.get('y')).toBe(20)
      expect(await storage.get('z')).toBe(30)
    })

    it('should support list() with prefix', async () => {
      const storage = createMockDurableObjectStorage()
      await storage.put('user:1', { name: 'Alice' })
      await storage.put('user:2', { name: 'Bob' })
      await storage.put('session:1', { token: 'abc' })

      const users = await storage.list({ prefix: 'user:' })
      expect(users.size).toBe(2)
      expect(users.has('user:1')).toBe(true)
      expect(users.has('user:2')).toBe(true)
      expect(users.has('session:1')).toBe(false)
    })

    it('should support list() with limit', async () => {
      const storage = createMockDurableObjectStorage()
      for (let i = 0; i < 10; i++) {
        await storage.put(`key${i}`, i)
      }
      const result = await storage.list({ limit: 3 })
      expect(result.size).toBe(3)
    })

    it('should support deleteAll()', async () => {
      const storage = createMockDurableObjectStorage()
      await storage.put('a', 1)
      await storage.put('b', 2)
      await storage.deleteAll()
      expect(await storage.get('a')).toBeUndefined()
      expect(await storage.get('b')).toBeUndefined()
    })

    it('should support transaction()', async () => {
      const storage = createMockDurableObjectStorage()
      await storage.put('balance', 100)

      await storage.transaction(async (txn) => {
        const balance = await txn.get('balance') as number
        await txn.put('balance', balance - 50)
      })

      expect(await storage.get('balance')).toBe(50)
    })

    it('should support getAlarm() and setAlarm()', async () => {
      const storage = createMockDurableObjectStorage()
      const alarmTime = Date.now() + 60000

      await storage.setAlarm(alarmTime)
      const currentAlarm = await storage.getAlarm()
      expect(currentAlarm).toBe(alarmTime)

      await storage.deleteAlarm()
      expect(await storage.getAlarm()).toBeNull()
    })

    it('should support initial data seeding', () => {
      const storage = createMockDurableObjectStorage({
        initialData: {
          existingKey: 'existingValue',
          count: 42,
        },
      })
      // Async check happens in the test
      expect(storage.get('existingKey')).resolves.toBe('existingValue')
      expect(storage.get('count')).resolves.toBe(42)
    })
  })

  describe('createMockDurableObjectState', () => {
    it('should create a state object with id and storage', () => {
      const state = createMockDurableObjectState()
      expect(state).toBeDefined()
      expect(state.id).toBeDefined()
      expect(state.storage).toBeDefined()
    })

    it('should use provided ID', () => {
      const id = createMockDurableObjectId({ name: 'test-object' })
      const state = createMockDurableObjectState({ id })
      expect(state.id.name).toBe('test-object')
    })

    it('should use provided storage', () => {
      const storage = createMockDurableObjectStorage({
        initialData: { foo: 'bar' },
      })
      const state = createMockDurableObjectState({ storage })
      expect(state.storage.get('foo')).resolves.toBe('bar')
    })

    it('should support waitUntil()', () => {
      const state = createMockDurableObjectState()
      expect(typeof state.waitUntil).toBe('function')
      // Should not throw
      state.waitUntil(Promise.resolve())
    })

    it('should support blockConcurrencyWhile()', async () => {
      const state = createMockDurableObjectState()
      expect(typeof state.blockConcurrencyWhile).toBe('function')

      let executed = false
      await state.blockConcurrencyWhile(async () => {
        executed = true
      })
      expect(executed).toBe(true)
    })

    it('should track acceptWebSocket() calls', () => {
      const state = createMockDurableObjectState()
      expect(typeof state.acceptWebSocket).toBe('function')
    })

    it('should provide getWebSockets() accessor', () => {
      const state = createMockDurableObjectState()
      expect(typeof state.getWebSockets).toBe('function')
      const sockets = state.getWebSockets()
      expect(Array.isArray(sockets)).toBe(true)
    })
  })

  describe('createMockDurableObjectStub', () => {
    it('should create a stub that can send fetch requests', async () => {
      const stub = createMockDurableObjectStub({
        handler: async (_request: Request) => {
          return new Response('OK from DO')
        },
      })

      const response = await stub.fetch('https://do.internal/test')
      expect(response.status).toBe(200)
      expect(await response.text()).toBe('OK from DO')
    })

    it('should provide access to the stub ID', () => {
      const stub = createMockDurableObjectStub()
      expect(stub.id).toBeDefined()
      expect(typeof stub.id.toString()).toBe('string')
    })

    it('should support custom ID', () => {
      const customId = createMockDurableObjectId({ name: 'my-stub' })
      const stub = createMockDurableObjectStub({ id: customId })
      expect(stub.id.name).toBe('my-stub')
    })

    it('should support Request object in fetch', async () => {
      const receivedRequests: Request[] = []
      const stub = createMockDurableObjectStub({
        handler: async (request: Request) => {
          receivedRequests.push(request)
          return new Response('OK')
        },
      })

      const request = new Request('https://do.internal/api', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      })
      await stub.fetch(request)

      expect(receivedRequests).toHaveLength(1)
      expect(receivedRequests[0]?.method).toBe('POST')
    })

    it('should support name property for named stubs', () => {
      const stub = createMockDurableObjectStub({ name: 'test-object' })
      expect(stub.name).toBe('test-object')
    })

    it('should throw if fetch handler is not defined and not mocked', async () => {
      const stub = createMockDurableObjectStub()
      // Should have some default behavior or throw meaningful error
      await expect(stub.fetch('https://do.internal/test')).rejects.toThrow()
    })
  })
})
