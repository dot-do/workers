import { describe, it, expect, beforeEach } from 'vitest'
import { createMockKVNamespace } from '../src/mocks/index.js'

/**
 * Tests defining the contract for KV Namespace mock helpers.
 *
 * These tests define what the mock factory should provide:
 * - In-memory KV implementation with full API support
 * - get/put/delete/list operations
 * - Metadata and expiration support
 * - Cachable and streaming responses
 */
describe('KV Namespace Mock Helpers', () => {
  describe('createMockKVNamespace', () => {
    it('should create a KV namespace mock', () => {
      const kv = createMockKVNamespace()
      expect(kv).toBeDefined()
      expect(typeof kv.get).toBe('function')
      expect(typeof kv.put).toBe('function')
      expect(typeof kv.delete).toBe('function')
      expect(typeof kv.list).toBe('function')
    })

    it('should support basic get/put operations', async () => {
      const kv = createMockKVNamespace()
      await kv.put('key1', 'value1')
      const value = await kv.get('key1')
      expect(value).toBe('value1')
    })

    it('should return null for missing keys', async () => {
      const kv = createMockKVNamespace()
      const value = await kv.get('nonexistent')
      expect(value).toBeNull()
    })

    it('should support get with type option: text', async () => {
      const kv = createMockKVNamespace()
      await kv.put('textKey', 'hello world')
      const value = await kv.get('textKey', { type: 'text' })
      expect(value).toBe('hello world')
    })

    it('should support get with type option: json', async () => {
      const kv = createMockKVNamespace()
      await kv.put('jsonKey', JSON.stringify({ foo: 'bar' }))
      const value = await kv.get('jsonKey', { type: 'json' })
      expect(value).toEqual({ foo: 'bar' })
    })

    it('should support get with type option: arrayBuffer', async () => {
      const kv = createMockKVNamespace()
      const buffer = new TextEncoder().encode('binary data')
      await kv.put('bufferKey', buffer)
      const value = await kv.get('bufferKey', { type: 'arrayBuffer' })
      expect(value).toBeInstanceOf(ArrayBuffer)
    })

    it('should support get with type option: stream', async () => {
      const kv = createMockKVNamespace()
      await kv.put('streamKey', 'streaming content')
      const value = await kv.get('streamKey', { type: 'stream' })
      expect(value).toBeInstanceOf(ReadableStream)
    })

    it('should support put with expiration (seconds since epoch)', async () => {
      const kv = createMockKVNamespace()
      const expiration = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      await kv.put('expiringKey', 'value', { expiration })
      const value = await kv.get('expiringKey')
      expect(value).toBe('value')
    })

    it('should support put with expirationTtl (seconds from now)', async () => {
      const kv = createMockKVNamespace()
      await kv.put('ttlKey', 'value', { expirationTtl: 3600 })
      const value = await kv.get('ttlKey')
      expect(value).toBe('value')
    })

    it('should support put with metadata', async () => {
      const kv = createMockKVNamespace()
      await kv.put('metaKey', 'value', {
        metadata: { uploadedBy: 'user1', version: 2 },
      })
      const result = await kv.getWithMetadata('metaKey')
      expect(result.value).toBe('value')
      expect(result.metadata).toEqual({ uploadedBy: 'user1', version: 2 })
    })

    it('should support getWithMetadata', async () => {
      const kv = createMockKVNamespace()
      await kv.put('metaKey', 'value', { metadata: { foo: 'bar' } })
      const result = await kv.getWithMetadata('metaKey')
      expect(result).toHaveProperty('value')
      expect(result).toHaveProperty('metadata')
      expect(result.value).toBe('value')
      expect(result.metadata).toEqual({ foo: 'bar' })
    })

    it('should return null metadata for keys without metadata', async () => {
      const kv = createMockKVNamespace()
      await kv.put('noMetaKey', 'value')
      const result = await kv.getWithMetadata('noMetaKey')
      expect(result.value).toBe('value')
      expect(result.metadata).toBeNull()
    })

    it('should support delete operation', async () => {
      const kv = createMockKVNamespace()
      await kv.put('deleteMe', 'value')
      await kv.delete('deleteMe')
      const value = await kv.get('deleteMe')
      expect(value).toBeNull()
    })

    it('should not throw when deleting non-existent key', async () => {
      const kv = createMockKVNamespace()
      await expect(kv.delete('nonexistent')).resolves.toBeUndefined()
    })

    it('should support list with no options', async () => {
      const kv = createMockKVNamespace()
      await kv.put('a', '1')
      await kv.put('b', '2')
      await kv.put('c', '3')

      const result = await kv.list()
      expect(result.keys).toHaveLength(3)
      expect(result.list_complete).toBe(true)
    })

    it('should support list with prefix', async () => {
      const kv = createMockKVNamespace()
      await kv.put('user:1', 'alice')
      await kv.put('user:2', 'bob')
      await kv.put('session:1', 'token')

      const result = await kv.list({ prefix: 'user:' })
      expect(result.keys).toHaveLength(2)
      expect(result.keys.map(k => k.name)).toContain('user:1')
      expect(result.keys.map(k => k.name)).toContain('user:2')
    })

    it('should support list with limit', async () => {
      const kv = createMockKVNamespace()
      for (let i = 0; i < 10; i++) {
        await kv.put(`key${i}`, `value${i}`)
      }

      const result = await kv.list({ limit: 3 })
      expect(result.keys).toHaveLength(3)
      expect(result.list_complete).toBe(false)
      expect(result.cursor).toBeDefined()
    })

    it('should support list pagination with cursor', async () => {
      const kv = createMockKVNamespace()
      for (let i = 0; i < 10; i++) {
        await kv.put(`key${String(i).padStart(2, '0')}`, `value${i}`)
      }

      const page1 = await kv.list({ limit: 3 })
      expect(page1.keys).toHaveLength(3)
      expect(page1.list_complete).toBe(false)

      const page2 = await kv.list({ limit: 3, cursor: page1.cursor })
      expect(page2.keys).toHaveLength(3)
      expect(page2.list_complete).toBe(false)

      // Keys should be different between pages
      const page1Keys = page1.keys.map(k => k.name)
      const page2Keys = page2.keys.map(k => k.name)
      expect(page1Keys.every(k => !page2Keys.includes(k))).toBe(true)
    })

    it('should include metadata in list results when available', async () => {
      const kv = createMockKVNamespace()
      await kv.put('withMeta', 'value', { metadata: { type: 'test' } })
      await kv.put('withoutMeta', 'value')

      const result = await kv.list()
      const withMetaKey = result.keys.find(k => k.name === 'withMeta')
      const withoutMetaKey = result.keys.find(k => k.name === 'withoutMeta')

      expect(withMetaKey?.metadata).toEqual({ type: 'test' })
      expect(withoutMetaKey?.metadata).toBeUndefined()
    })

    it('should include expiration in list results when available', async () => {
      const kv = createMockKVNamespace()
      const expiration = Math.floor(Date.now() / 1000) + 3600
      await kv.put('expiring', 'value', { expiration })
      await kv.put('permanent', 'value')

      const result = await kv.list()
      const expiringKey = result.keys.find(k => k.name === 'expiring')
      const permanentKey = result.keys.find(k => k.name === 'permanent')

      expect(expiringKey?.expiration).toBe(expiration)
      expect(permanentKey?.expiration).toBeUndefined()
    })

    it('should support initial data seeding', async () => {
      const kv = createMockKVNamespace({
        initialData: {
          existingKey: 'existingValue',
          jsonKey: { nested: 'data' },
        },
      })

      expect(await kv.get('existingKey')).toBe('existingValue')
      expect(await kv.get('jsonKey', { type: 'json' })).toEqual({ nested: 'data' })
    })

    it('should simulate expired keys (optional behavior)', async () => {
      const kv = createMockKVNamespace({ simulateExpiration: true })
      // Set a key that expires in the past
      const pastExpiration = Math.floor(Date.now() / 1000) - 3600
      await kv.put('expired', 'value', { expiration: pastExpiration })

      const value = await kv.get('expired')
      expect(value).toBeNull() // Should be expired
    })
  })
})
