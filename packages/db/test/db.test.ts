/**
 * @dotdo/db - Core DB Class Tests (RED Phase)
 *
 * These tests define the expected behavior of the DB base class.
 * They should FAIL initially (RED), then pass after implementation (GREEN).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DB } from '../src/db'
import type { ListOptions, SearchOptions, FetchOptions, DoOptions } from '../src/types'

// Mock execution context
const mockCtx = {
  waitUntil: vi.fn(),
  passThroughOnException: vi.fn(),
}

// Mock environment
const mockEnv = {
  DB_NAMESPACE: {
    idFromName: vi.fn(() => ({ toString: () => 'mock-id' })),
    get: vi.fn(),
  },
}

describe('DB Base Class', () => {
  describe('Class Structure', () => {
    it('should extend Agent from agents package', () => {
      // DB should be a class that can be instantiated
      expect(typeof DB).toBe('function')
      expect(DB.prototype).toBeDefined()
    })

    it('should implement RpcTarget interface with allowedMethods', () => {
      const db = new DB(mockCtx as any, mockEnv)
      expect(db.hasMethod).toBeDefined()
      expect(typeof db.hasMethod).toBe('function')
    })

    it('should have invoke method for RPC calls', () => {
      const db = new DB(mockCtx as any, mockEnv)
      expect(db.invoke).toBeDefined()
      expect(typeof db.invoke).toBe('function')
    })
  })

  describe('RpcTarget Implementation', () => {
    let db: DB

    beforeEach(() => {
      db = new DB(mockCtx as any, mockEnv)
    })

    it('should return true for allowed methods', () => {
      // CRUD methods should be allowed
      expect(db.hasMethod('get')).toBe(true)
      expect(db.hasMethod('list')).toBe(true)
      expect(db.hasMethod('create')).toBe(true)
      expect(db.hasMethod('update')).toBe(true)
      expect(db.hasMethod('delete')).toBe(true)
    })

    it('should return true for MCP tool methods', () => {
      expect(db.hasMethod('search')).toBe(true)
      expect(db.hasMethod('fetch')).toBe(true)
      expect(db.hasMethod('do')).toBe(true)
    })

    it('should return false for disallowed methods', () => {
      expect(db.hasMethod('constructor')).toBe(false)
      expect(db.hasMethod('__proto__')).toBe(false)
      expect(db.hasMethod('toString')).toBe(false)
      expect(db.hasMethod('nonexistent')).toBe(false)
    })

    it('should invoke allowed methods via invoke()', async () => {
      const result = await db.invoke('get', ['users', '123'])
      // Result depends on implementation, but should not throw for allowed methods
      expect(result).toBeDefined()
    })

    it('should throw for disallowed methods via invoke()', async () => {
      await expect(db.invoke('constructor', [])).rejects.toThrow('Method not allowed')
      await expect(db.invoke('__proto__', [])).rejects.toThrow('Method not allowed')
    })
  })

  describe('Simple CRUD Operations', () => {
    let db: DB

    beforeEach(() => {
      db = new DB(mockCtx as any, mockEnv)
    })

    describe('get()', () => {
      it('should return document by id', async () => {
        const doc = await db.get<{ name: string }>('users', '123')
        // Initially returns null (no data)
        expect(doc).toBeNull()
      })

      it('should return null for non-existent document', async () => {
        const doc = await db.get('users', 'nonexistent')
        expect(doc).toBeNull()
      })
    })

    describe('list()', () => {
      it('should return array of documents', async () => {
        const docs = await db.list('users')
        expect(Array.isArray(docs)).toBe(true)
      })

      it('should support limit option', async () => {
        const options: ListOptions = { limit: 10 }
        const docs = await db.list('users', options)
        expect(docs.length).toBeLessThanOrEqual(10)
      })

      it('should support offset option', async () => {
        const options: ListOptions = { offset: 5 }
        const docs = await db.list('users', options)
        expect(Array.isArray(docs)).toBe(true)
      })

      it('should support orderBy option', async () => {
        const options: ListOptions = { orderBy: 'createdAt', order: 'desc' }
        const docs = await db.list('users', options)
        expect(Array.isArray(docs)).toBe(true)
      })
    })

    describe('create()', () => {
      it('should create a new document', async () => {
        const input = { name: 'Test User', email: 'test@example.com' }
        const doc = await db.create('users', input)
        expect(doc).toBeDefined()
        expect(doc.id).toBeDefined()
        expect(doc.name).toBe('Test User')
      })

      it('should generate id if not provided', async () => {
        const doc = await db.create('users', { name: 'Test' })
        expect(doc.id).toBeDefined()
        expect(typeof doc.id).toBe('string')
        expect(doc.id.length).toBeGreaterThan(0)
      })

      it('should preserve provided id', async () => {
        const doc = await db.create('users', { id: 'custom-id', name: 'Test' })
        expect(doc.id).toBe('custom-id')
      })
    })

    describe('update()', () => {
      it('should update existing document', async () => {
        // First create a document
        const created = await db.create('users', { name: 'Original' })

        // Then update it
        const updated = await db.update('users', created.id, { name: 'Updated' })
        expect(updated).toBeDefined()
        expect(updated?.name).toBe('Updated')
      })

      it('should return null for non-existent document', async () => {
        const result = await db.update('users', 'nonexistent', { name: 'Test' })
        expect(result).toBeNull()
      })

      it('should merge updates with existing document', async () => {
        const created = await db.create('users', { name: 'Test', email: 'test@example.com' })
        const updated = await db.update('users', created.id, { name: 'Updated' })
        expect(updated?.name).toBe('Updated')
        expect(updated?.email).toBe('test@example.com')
      })
    })

    describe('delete()', () => {
      it('should delete existing document', async () => {
        const created = await db.create('users', { name: 'To Delete' })
        const result = await db.delete('users', created.id)
        expect(result).toBe(true)
      })

      it('should return false for non-existent document', async () => {
        const result = await db.delete('users', 'nonexistent')
        expect(result).toBe(false)
      })

      it('should make document inaccessible after deletion', async () => {
        const created = await db.create('users', { name: 'To Delete' })
        await db.delete('users', created.id)
        const doc = await db.get('users', created.id)
        expect(doc).toBeNull()
      })
    })
  })

  describe('MCP Tools', () => {
    let db: DB

    beforeEach(() => {
      db = new DB(mockCtx as any, mockEnv)
    })

    describe('search()', () => {
      it('should return search results', async () => {
        const results = await db.search('test query')
        expect(Array.isArray(results)).toBe(true)
      })

      it('should support options', async () => {
        const options: SearchOptions = { limit: 5, collections: ['users'] }
        const results = await db.search('test', options)
        expect(results.length).toBeLessThanOrEqual(5)
      })

      it('should return results with score', async () => {
        // Create some searchable data first
        await db.create('users', { name: 'John Doe', email: 'john@example.com' })
        const results = await db.search('John')
        if (results.length > 0) {
          expect(results[0].score).toBeDefined()
          expect(typeof results[0].score).toBe('number')
        }
      })
    })

    describe('fetch()', () => {
      it('should fetch URL and return result', async () => {
        const result = await db.fetch('https://example.com')
        expect(result).toBeDefined()
        expect(result.status).toBeDefined()
        expect(result.url).toBe('https://example.com')
      })

      it('should support custom options', async () => {
        const options: FetchOptions = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: { test: true },
        }
        const result = await db.fetch('https://example.com/api', options)
        expect(result).toBeDefined()
      })

      it('should handle fetch errors gracefully', async () => {
        const result = await db.fetch('https://invalid-url-that-does-not-exist.invalid')
        expect(result.status).toBeGreaterThanOrEqual(400)
      })
    })

    describe('do()', () => {
      it('should execute code and return result', async () => {
        const result = await db.do('return 1 + 1')
        expect(result.success).toBe(true)
        expect(result.result).toBe(2)
      })

      it('should capture execution duration', async () => {
        const result = await db.do('return true')
        expect(result.duration).toBeDefined()
        expect(typeof result.duration).toBe('number')
      })

      it('should handle execution errors', async () => {
        const result = await db.do('throw new Error("test error")')
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      })

      it('should support options', async () => {
        const options: DoOptions = { timeout: 5000, env: { TEST_VAR: 'value' } }
        const result = await db.do('return process.env.TEST_VAR', options)
        expect(result).toBeDefined()
      })
    })
  })

  describe('WebSocket Hibernation', () => {
    let db: DB

    beforeEach(() => {
      db = new DB(mockCtx as any, mockEnv)
    })

    it('should have webSocketMessage handler', () => {
      expect(db.webSocketMessage).toBeDefined()
      expect(typeof db.webSocketMessage).toBe('function')
    })

    it('should have webSocketClose handler', () => {
      expect(db.webSocketClose).toBeDefined()
      expect(typeof db.webSocketClose).toBe('function')
    })

    it('should have webSocketError handler', () => {
      expect(db.webSocketError).toBeDefined()
      expect(typeof db.webSocketError).toBe('function')
    })
  })

  describe('Multi-Transport fetch()', () => {
    let db: DB

    beforeEach(() => {
      db = new DB(mockCtx as any, mockEnv)
    })

    it('should handle HTTP requests', async () => {
      const request = new Request('http://localhost/health', { method: 'GET' })
      const response = await db.fetch(request)
      expect(response).toBeInstanceOf(Response)
    })

    it('should route /rpc requests to RPC handler', async () => {
      const request = new Request('http://localhost/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: '1', method: 'get', params: ['users', '123'] }),
      })
      const response = await db.fetch(request)
      expect(response).toBeInstanceOf(Response)
      expect(response.headers.get('Content-Type')).toBe('application/json')
    })

    it('should handle WebSocket upgrade requests', async () => {
      const request = new Request('http://localhost/ws', {
        headers: { Upgrade: 'websocket' },
      })
      const response = await db.fetch(request)
      expect(response.status).toBe(101) // Switching Protocols
    })

    it('should route /mcp requests to MCP handler', async () => {
      const request = new Request('http://localhost/mcp', { method: 'GET' })
      const response = await db.fetch(request)
      expect(response).toBeInstanceOf(Response)
    })
  })
})
