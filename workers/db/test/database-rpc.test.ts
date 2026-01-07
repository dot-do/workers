/**
 * RED Tests: database.do ai-database RPC Interface
 *
 * These tests define the contract for the database.do worker's RPC interface.
 * The DatabaseDO must implement the ai-database compatible interface.
 *
 * Per ARCHITECTURE.md:
 * - database.do implements ai-database RPC
 * - Extends slim DO core
 * - Provides CRUD operations via RPC
 * - Supports @callable() decorated methods
 *
 * RED PHASE: These tests MUST FAIL because DatabaseDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-c00u).
 *
 * @see ARCHITECTURE.md lines 978, 1104-1108
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockDatabaseEnv } from './helpers.js'

/**
 * Interface definition for DatabaseDO - this defines the contract
 * The implementation must satisfy this interface
 */
export interface DatabaseDOContract {
  // Core CRUD operations (ai-database compatible)
  get<T>(collection: string, id: string): Promise<T | null>
  list<T>(collection: string, options?: ListOptions): Promise<T[]>
  create<T extends { _id?: string }>(collection: string, doc: T): Promise<T & { _id: string }>
  update<T>(collection: string, id: string, updates: Partial<T>): Promise<T | null>
  delete(collection: string, id: string): Promise<boolean>

  // RPC interface
  hasMethod(name: string): boolean
  invoke(method: string, params: unknown[]): Promise<unknown>

  // HTTP handlers
  fetch(request: Request): Promise<Response>
}

export interface ListOptions {
  limit?: number
  offset?: number
  where?: Record<string, unknown>
  orderBy?: string
  order?: 'asc' | 'desc'
}

export interface Document {
  _id: string
  [key: string]: unknown
}

export interface User extends Document {
  name: string
  email: string
}

/**
 * Attempt to load DatabaseDO - this will fail in RED phase
 * In GREEN phase, the module will exist and tests will pass
 */
async function loadDatabaseDO(): Promise<new (ctx: MockDOState, env: MockDatabaseEnv) => DatabaseDOContract> {
  // This dynamic import will fail because src/database.js doesn't exist yet
  const module = await import('../src/database.js')
  return module.DatabaseDO
}

describe('DatabaseDO RPC Interface', () => {
  let ctx: MockDOState
  let env: MockDatabaseEnv
  let DatabaseDO: new (ctx: MockDOState, env: MockDatabaseEnv) => DatabaseDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    // This will throw in RED phase because the module doesn't exist
    DatabaseDO = await loadDatabaseDO()
  })

  describe('ai-database CRUD operations', () => {
    describe('get()', () => {
      it('should return null for non-existent document', async () => {
        const instance = new DatabaseDO(ctx, env)
        const result = await instance.get<Document>('users', 'nonexistent')
        expect(result).toBeNull()
      })

      it('should return document by collection and id', async () => {
        const instance = new DatabaseDO(ctx, env)
        await ctx.storage.put('documents:users:123', { _id: '123', name: 'Alice' })
        const result = await instance.get<Document>('users', '123')
        expect(result).toEqual({ _id: '123', name: 'Alice' })
      })

      it('should support type inference for returned document', async () => {
        const instance = new DatabaseDO(ctx, env)
        await instance.create('users', { _id: '123', name: 'Test', email: 'test@example.com' })
        const user = await instance.get<User>('users', '123')
        expect(user).not.toBeNull()
        if (user) {
          expect(user._id).toBe('123')
          expect(user.name).toBe('Test')
          expect(user.email).toBe('test@example.com')
        }
      })
    })

    describe('list()', () => {
      it('should return empty array for empty collection', async () => {
        const instance = new DatabaseDO(ctx, env)
        const result = await instance.list<Document>('empty_collection')
        expect(result).toEqual([])
      })

      it('should list all documents in collection', async () => {
        const instance = new DatabaseDO(ctx, env)
        await instance.create('users', { _id: '1', name: 'Alice' })
        await instance.create('users', { _id: '2', name: 'Bob' })
        const result = await instance.list<Document>('users')
        expect(result).toHaveLength(2)
      })

      it('should respect limit option', async () => {
        const instance = new DatabaseDO(ctx, env)
        for (let i = 0; i < 10; i++) {
          await instance.create('users', { _id: String(i), name: 'User' + i })
        }
        const result = await instance.list<Document>('users', { limit: 2 })
        expect(result.length).toBeLessThanOrEqual(2)
      })

      it('should respect offset option', async () => {
        const instance = new DatabaseDO(ctx, env)
        for (let i = 0; i < 5; i++) {
          await instance.create('users', { _id: String(i), name: 'User' + i })
        }
        const result = await instance.list<Document>('users', { offset: 2, limit: 10 })
        expect(result.length).toBeLessThanOrEqual(3)
      })

      it('should support orderBy option', async () => {
        const instance = new DatabaseDO(ctx, env)
        await instance.create('users', { _id: '1', name: 'Zoe', email: 'zoe@example.com' })
        await instance.create('users', { _id: '2', name: 'Alice', email: 'alice@example.com' })
        const result = await instance.list<User>('users', { orderBy: 'name', order: 'asc' })
        expect(result[0]?.name).toBe('Alice')
        expect(result[1]?.name).toBe('Zoe')
      })

      it('should support where clause filtering', async () => {
        const instance = new DatabaseDO(ctx, env)
        await instance.create('users', { _id: '1', name: 'Alice', active: true })
        await instance.create('users', { _id: '2', name: 'Bob', active: false })
        const result = await instance.list<Document>('users', { where: { active: true } })
        expect(result).toHaveLength(1)
        expect(result[0]).toHaveProperty('active', true)
      })
    })

    describe('create()', () => {
      it('should create document with auto-generated _id', async () => {
        const instance = new DatabaseDO(ctx, env)
        const created = await instance.create('users', { name: 'Bob', email: 'bob@example.com' })
        expect(created._id).toBeDefined()
        expect(created._id).toHaveLength(36)
        expect(created.name).toBe('Bob')
        expect(created.email).toBe('bob@example.com')
      })

      it('should preserve provided _id', async () => {
        const instance = new DatabaseDO(ctx, env)
        const created = await instance.create('users', { _id: 'custom-id', name: 'Charlie' })
        expect(created._id).toBe('custom-id')
      })

      it('should store document in correct collection', async () => {
        const instance = new DatabaseDO(ctx, env)
        const created = await instance.create('users', { _id: 'test-id', name: 'David' })
        const retrieved = await instance.get<Document>('users', 'test-id')
        expect(retrieved).toEqual(created)
      })

      it('should return the created document with all fields', async () => {
        const instance = new DatabaseDO(ctx, env)
        const input = { name: 'Eve', email: 'eve@example.com', age: 25 }
        const created = await instance.create('users', input)
        expect(created._id).toBeDefined()
        expect(created.name).toBe('Eve')
        expect(created.email).toBe('eve@example.com')
        expect(created.age).toBe(25)
      })
    })

    describe('update()', () => {
      it('should return null for non-existent document', async () => {
        const instance = new DatabaseDO(ctx, env)
        const result = await instance.update('users', 'nonexistent', { name: 'Updated' })
        expect(result).toBeNull()
      })

      it('should update existing document with partial data', async () => {
        const instance = new DatabaseDO(ctx, env)
        await instance.create('users', { _id: '123', name: 'Frank', email: 'frank@example.com' })
        const updated = await instance.update<User>('users', '123', { name: 'Franklin' })
        expect(updated).not.toBeNull()
        expect(updated!.name).toBe('Franklin')
        expect(updated!.email).toBe('frank@example.com')
      })

      it('should merge updates with existing document', async () => {
        const instance = new DatabaseDO(ctx, env)
        await instance.create('users', { _id: '123', name: 'Grace', email: 'grace@example.com', age: 30 })
        const updated = await instance.update('users', '123', { age: 31 })
        expect(updated).toHaveProperty('name', 'Grace')
        expect(updated).toHaveProperty('email', 'grace@example.com')
        expect(updated).toHaveProperty('age', 31)
      })

      it('should not allow changing _id', async () => {
        const instance = new DatabaseDO(ctx, env)
        await instance.create('users', { _id: '123', name: 'Henry' })
        const updated = await instance.update('users', '123', { _id: 'new-id', name: 'Harry' } as Partial<Document>)
        expect(updated!._id).toBe('123')
      })
    })

    describe('delete()', () => {
      it('should return false for non-existent document', async () => {
        const instance = new DatabaseDO(ctx, env)
        const result = await instance.delete('users', 'nonexistent')
        expect(result).toBe(false)
      })

      it('should delete existing document and return true', async () => {
        const instance = new DatabaseDO(ctx, env)
        await instance.create('users', { _id: '123', name: 'Ivy' })
        const result = await instance.delete('users', '123')
        expect(result).toBe(true)
      })

      it('should remove document from storage', async () => {
        const instance = new DatabaseDO(ctx, env)
        await instance.create('users', { _id: '123', name: 'Jack' })
        await instance.delete('users', '123')
        const afterDelete = await instance.get('users', '123')
        expect(afterDelete).toBeNull()
      })
    })
  })

  describe('RPC interface', () => {
    describe('hasMethod()', () => {
      it('should return true for allowed CRUD methods', async () => {
        const instance = new DatabaseDO(ctx, env)
        expect(instance.hasMethod('get')).toBe(true)
        expect(instance.hasMethod('list')).toBe(true)
        expect(instance.hasMethod('create')).toBe(true)
        expect(instance.hasMethod('update')).toBe(true)
        expect(instance.hasMethod('delete')).toBe(true)
      })

      it('should return false for non-existent methods', async () => {
        const instance = new DatabaseDO(ctx, env)
        expect(instance.hasMethod('nonexistent')).toBe(false)
        expect(instance.hasMethod('eval')).toBe(false)
      })

      it('should return true for search method', async () => {
        const instance = new DatabaseDO(ctx, env)
        expect(instance.hasMethod('search')).toBe(true)
      })
    })

    describe('invoke()', () => {
      it('should invoke allowed method with params', async () => {
        const instance = new DatabaseDO(ctx, env)
        await instance.create('users', { _id: '123', name: 'Kate' })
        const result = await instance.invoke('get', ['users', '123'])
        expect(result).toHaveProperty('_id', '123')
        expect(result).toHaveProperty('name', 'Kate')
      })

      it('should throw error for disallowed method', async () => {
        const instance = new DatabaseDO(ctx, env)
        await expect(instance.invoke('dangerous', [])).rejects.toThrow(/Method not allowed|not found/i)
      })

      it('should throw error for non-existent method', async () => {
        const instance = new DatabaseDO(ctx, env)
        await expect(instance.invoke('nonexistent', [])).rejects.toThrow(/not allowed|not found/i)
      })

      it('should support batch invocation', async () => {
        const instance = new DatabaseDO(ctx, env)
        const batch = [
          { method: 'create', params: ['users', { name: 'Leo' }] },
          { method: 'create', params: ['users', { name: 'Mia' }] },
        ]
        const results = await Promise.all(batch.map(b => instance.invoke(b.method, b.params)))
        expect(results).toHaveLength(2)
      })
    })
  })

  describe('HTTP fetch() handler', () => {
    describe('RPC endpoint', () => {
      it('should handle POST /rpc with method call', async () => {
        const instance = new DatabaseDO(ctx, env)
        await instance.create('users', { _id: '123', name: 'Nancy' })
        const request = new Request('http://database.do/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'get', params: ['users', '123'] })
        })
        const response = await instance.fetch(request)
        expect(response.status).toBe(200)
        const result = await response.json() as { result: unknown }
        expect(result).toHaveProperty('result')
        expect(result.result).toHaveProperty('_id', '123')
      })

      it('should return error for invalid method', async () => {
        const instance = new DatabaseDO(ctx, env)
        const request = new Request('http://database.do/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'invalid', params: [] })
        })
        const response = await instance.fetch(request)
        expect(response.status).toBe(400)
        const result = await response.json() as { error: string }
        expect(result).toHaveProperty('error')
      })

      it('should handle POST /rpc/batch for batch operations', async () => {
        const instance = new DatabaseDO(ctx, env)
        const request = new Request('http://database.do/rpc/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([
            { method: 'create', params: ['users', { name: 'Oscar' }] },
            { method: 'create', params: ['users', { name: 'Pam' }] },
          ])
        })
        const response = await instance.fetch(request)
        expect(response.status).toBe(200)
        const results = await response.json() as Array<{ result: unknown }>
        expect(results).toHaveLength(2)
      })
    })

    describe('REST API endpoint', () => {
      it('should handle GET /api/:collection', async () => {
        const instance = new DatabaseDO(ctx, env)
        await instance.create('users', { _id: '1', name: 'Quinn' })
        const request = new Request('http://database.do/api/users', { method: 'GET' })
        const response = await instance.fetch(request)
        expect(response.status).toBe(200)
        const data = await response.json() as unknown[]
        expect(Array.isArray(data)).toBe(true)
      })

      it('should handle GET /api/:collection/:id', async () => {
        const instance = new DatabaseDO(ctx, env)
        await instance.create('users', { _id: '123', name: 'Rachel' })
        const request = new Request('http://database.do/api/users/123', { method: 'GET' })
        const response = await instance.fetch(request)
        expect(response.status).toBe(200)
        const data = await response.json() as Document
        expect(data._id).toBe('123')
      })

      it('should handle POST /api/:collection', async () => {
        const instance = new DatabaseDO(ctx, env)
        const request = new Request('http://database.do/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Sam' })
        })
        const response = await instance.fetch(request)
        expect(response.status).toBe(201)
        const data = await response.json() as Document
        expect(data._id).toBeDefined()
        expect(data.name).toBe('Sam')
      })

      it('should handle PUT /api/:collection/:id', async () => {
        const instance = new DatabaseDO(ctx, env)
        await instance.create('users', { _id: '123', name: 'Tina' })
        const request = new Request('http://database.do/api/users/123', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'Tiana' })
        })
        const response = await instance.fetch(request)
        expect(response.status).toBe(200)
        const data = await response.json() as Document
        expect(data.name).toBe('Tiana')
      })

      it('should handle DELETE /api/:collection/:id', async () => {
        const instance = new DatabaseDO(ctx, env)
        await instance.create('users', { _id: '123', name: 'Uma' })
        const request = new Request('http://database.do/api/users/123', { method: 'DELETE' })
        const response = await instance.fetch(request)
        expect(response.status).toBe(200)
        const getResponse = await instance.fetch(new Request('http://database.do/api/users/123', { method: 'GET' }))
        expect(getResponse.status).toBe(404)
      })
    })

    describe('HATEOAS discovery', () => {
      it('should return discovery info at GET /', async () => {
        const instance = new DatabaseDO(ctx, env)
        const request = new Request('http://database.do/', { method: 'GET' })
        const response = await instance.fetch(request)
        expect(response.status).toBe(200)
        const data = await response.json() as Record<string, unknown>
        expect(data.api).toBeDefined()
        expect(data.links).toBeDefined()
        expect(data.discover).toBeDefined()
      })

      it('should include available collections in discovery', async () => {
        const instance = new DatabaseDO(ctx, env)
        await instance.create('users', { name: 'Test' })
        await instance.create('posts', { title: 'Test' })
        const request = new Request('http://database.do/', { method: 'GET' })
        const response = await instance.fetch(request)
        const data = await response.json() as { discover: { collections: Array<{ name: string }> } }
        const collectionNames = data.discover.collections.map((c: { name: string }) => c.name)
        expect(collectionNames).toContain('users')
        expect(collectionNames).toContain('posts')
      })

      it('should include available RPC methods in discovery', async () => {
        const instance = new DatabaseDO(ctx, env)
        const request = new Request('http://database.do/', { method: 'GET' })
        const response = await instance.fetch(request)
        const data = await response.json() as { discover: { methods: Array<{ name: string }> } }
        const methodNames = data.discover.methods.map((m: { name: string }) => m.name)
        expect(methodNames).toContain('get')
        expect(methodNames).toContain('list')
        expect(methodNames).toContain('create')
        expect(methodNames).toContain('update')
        expect(methodNames).toContain('delete')
      })
    })
  })
})
