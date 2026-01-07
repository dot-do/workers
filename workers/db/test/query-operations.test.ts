/**
 * RED Tests: database.do Query Operations
 *
 * These tests define the contract for the database.do worker's query operations.
 * The DatabaseDO must support SQL queries, full-text search, and natural language queries.
 *
 * Per ARCHITECTURE.md:
 * - GET /do?q= for natural language queries (lines 1599-1662)
 * - MCP search tool (lines 729-757)
 * - SQL-backed storage (line 51)
 *
 * RED PHASE: These tests MUST FAIL because DatabaseDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-c00u).
 *
 * @see ARCHITECTURE.md
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockDatabaseEnv } from './helpers.js'

/**
 * Interface definition for DatabaseDO query operations
 */
interface DatabaseDOQueryContract {
  // Core CRUD (inherited)
  get<T>(collection: string, id: string): Promise<T | null>
  create<T extends { _id?: string }>(collection: string, doc: T): Promise<T & { _id: string }>
  list<T>(collection: string, options?: ListOptions): Promise<T[]>

  // Query operations
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>
  query<T>(collection: string, sql: string, params?: unknown[]): Promise<T[]>
  count(collection: string, filter?: Record<string, unknown>): Promise<number>
  listCollections(): Promise<string[]>

  // Index operations
  createIndex(collection: string, field: string): Promise<void>
  listIndexes(collection: string): Promise<string[]>

  // HTTP handler
  fetch(request: Request): Promise<Response>
}

interface ListOptions {
  limit?: number
  offset?: number
  where?: Record<string, unknown>
  orderBy?: string
  order?: 'asc' | 'desc'
}

interface SearchOptions {
  collection?: string
  limit?: number
}

interface SearchResult {
  collection: string
  id: string
  data: unknown
  score: number
}

interface QueryResult<T> {
  query: string
  interpreted: { method: string; params: unknown[] }
  result: T
}

/**
 * Attempt to load DatabaseDO - this will fail in RED phase
 */
async function loadDatabaseDO(): Promise<new (ctx: MockDOState, env: MockDatabaseEnv) => DatabaseDOQueryContract> {
  const module = await import('../src/database.js')
  return module.DatabaseDO
}

describe('DatabaseDO Query Operations', () => {
  let ctx: MockDOState
  let env: MockDatabaseEnv
  let DatabaseDO: new (ctx: MockDOState, env: MockDatabaseEnv) => DatabaseDOQueryContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    DatabaseDO = await loadDatabaseDO()
  })

  describe('search() - MCP Tool', () => {
    it('should search across all collections by default', async () => {
      const instance = new DatabaseDO(ctx, env)
      await instance.create('users', { _id: '1', name: 'alice smith' })
      await instance.create('posts', { _id: '1', title: 'hello alice' })

      const results = await instance.search('alice')
      expect(results).toBeInstanceOf(Array)
      expect(results.length).toBeGreaterThan(0)
      results.forEach(r => {
        expect(r).toHaveProperty('collection')
        expect(r).toHaveProperty('id')
        expect(r).toHaveProperty('data')
        expect(r).toHaveProperty('score')
      })
    })

    it('should filter by collection when specified', async () => {
      const instance = new DatabaseDO(ctx, env)
      await instance.create('users', { _id: '1', name: 'test user' })
      await instance.create('posts', { _id: '1', title: 'test post' })

      const results = await instance.search('test', { collection: 'users' })
      expect(results.every(r => r.collection === 'users')).toBe(true)
    })

    it('should respect limit option', async () => {
      const instance = new DatabaseDO(ctx, env)
      for (let i = 0; i < 10; i++) {
        await instance.create('users', { _id: String(i), name: 'test user ' + i })
      }

      const results = await instance.search('test', { limit: 5 })
      expect(results.length).toBeLessThanOrEqual(5)
    })

    it('should return results sorted by relevance score', async () => {
      const instance = new DatabaseDO(ctx, env)
      await instance.create('users', { _id: '1', name: 'important note' })
      await instance.create('users', { _id: '2', name: 'very important important' })

      const results = await instance.search('important')
      for (let i = 1; i < results.length; i++) {
        const prevResult = results[i - 1]
        const currResult = results[i]
        if (prevResult && currResult) {
          expect(prevResult.score).toBeGreaterThanOrEqual(currResult.score)
        }
      }
    })

    it('should return empty array for no matches', async () => {
      const instance = new DatabaseDO(ctx, env)
      await instance.create('users', { _id: '1', name: 'alice' })

      const results = await instance.search('xyznonexistent123')
      expect(results).toEqual([])
    })

    it('should support case-insensitive search', async () => {
      const instance = new DatabaseDO(ctx, env)
      await instance.create('users', { _id: '1', name: 'Alice Smith' })

      const lower = await instance.search('alice')
      const upper = await instance.search('ALICE')
      expect(lower.length).toBe(upper.length)
    })
  })

  describe('SQL query() - Direct SQL access', () => {
    it('should execute SELECT queries', async () => {
      const instance = new DatabaseDO(ctx, env)
      await instance.create('users', { _id: '1', name: 'Test' })

      const results = await instance.query<{ _id: string; name: string }>(
        'users',
        'SELECT * FROM documents WHERE collection = ?',
        ['users']
      )
      expect(results).toBeInstanceOf(Array)
    })

    it('should support parameterized queries', async () => {
      const instance = new DatabaseDO(ctx, env)
      await instance.create('users', { _id: '1', name: 'Alice' })
      await instance.create('users', { _id: '2', name: 'Bob' })

      const results = await instance.query<{ _id: string; name: string }>(
        'users',
        'SELECT * FROM documents WHERE collection = ? AND json_extract(data, "$.name") = ?',
        ['users', 'Alice']
      )
      expect(results).toHaveLength(1)
    })

    it('should return typed results', async () => {
      const instance = new DatabaseDO(ctx, env)
      await instance.create('users', { _id: '1', name: 'Test', email: 'test@example.com' })

      interface UserResult { _id: string; name: string; email: string }
      const users = await instance.query<UserResult>('users', 'SELECT * FROM documents WHERE collection = ?', ['users'])
      expect(users[0]).toHaveProperty('_id')
      expect(users[0]).toHaveProperty('name')
    })

    it('should reject dangerous SQL operations', async () => {
      const instance = new DatabaseDO(ctx, env)
      await expect(instance.query('users', 'DROP TABLE documents')).rejects.toThrow(/not allowed|forbidden/i)
    })
  })

  describe('Natural Language Queries - GET /do?q=', () => {
    it('should interpret "show me all users"', async () => {
      const instance = new DatabaseDO(ctx, env)
      await instance.create('users', { _id: '1', name: 'Test' })

      const request = new Request('http://database.do/do?q=show+me+all+users', { method: 'GET' })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const result = await response.json() as QueryResult<unknown[]>
      expect(result.interpreted.method).toBe('list')
      expect(result.interpreted.params[0]).toBe('users')
    })

    it('should interpret "find user with email john@example.com"', async () => {
      const instance = new DatabaseDO(ctx, env)
      await instance.create('users', { _id: '1', name: 'John', email: 'john@example.com' })

      const request = new Request('http://database.do/do?q=find+user+with+email+john@example.com')
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const result = await response.json() as QueryResult<unknown>
      expect(result.interpreted.method).toMatch(/find|list|get/)
    })

    it('should interpret "count orders from last week"', async () => {
      const instance = new DatabaseDO(ctx, env)
      const request = new Request('http://database.do/do?q=count+orders+from+last+week')
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const result = await response.json() as QueryResult<number>
      expect(result.interpreted.method).toMatch(/count|aggregate/)
    })

    it('should require query parameter', async () => {
      const instance = new DatabaseDO(ctx, env)
      const request = new Request('http://database.do/do', { method: 'GET' })
      const response = await instance.fetch(request)
      expect(response.status).toBe(400)
    })

    it('should return interpreted query and result', async () => {
      const instance = new DatabaseDO(ctx, env)
      await instance.create('users', { _id: '1', name: 'Test' })

      const request = new Request('http://database.do/do?q=get+all+users')
      const response = await instance.fetch(request)
      const result = await response.json() as QueryResult<unknown>

      expect(result).toHaveProperty('query')
      expect(result).toHaveProperty('interpreted')
      expect(result.interpreted).toHaveProperty('method')
      expect(result.interpreted).toHaveProperty('params')
      expect(result).toHaveProperty('result')
    })
  })

  describe('Collection operations', () => {
    it('should list all collections', async () => {
      const instance = new DatabaseDO(ctx, env)
      await instance.create('users', { _id: '1', name: 'Test' })
      await instance.create('posts', { _id: '1', title: 'Test' })

      const collections = await instance.listCollections()
      expect(collections).toBeInstanceOf(Array)
      expect(collections).toContain('users')
      expect(collections).toContain('posts')
    })

    it('should return unique collection names', async () => {
      const instance = new DatabaseDO(ctx, env)
      await instance.create('users', { _id: '1', name: 'Test1' })
      await instance.create('users', { _id: '2', name: 'Test2' })
      await instance.create('posts', { _id: '1', title: 'Test' })

      const collections = await instance.listCollections()
      const uniqueCollections = [...new Set(collections)]
      expect(collections.length).toBe(uniqueCollections.length)
    })

    it('should return empty array when no collections exist', async () => {
      const instance = new DatabaseDO(ctx, env)
      const collections = await instance.listCollections()
      expect(collections).toEqual([])
    })
  })

  describe('Aggregation operations', () => {
    it('should support count aggregation', async () => {
      const instance = new DatabaseDO(ctx, env)
      await instance.create('users', { _id: '1', name: 'Alice' })
      await instance.create('users', { _id: '2', name: 'Bob' })
      await instance.create('users', { _id: '3', name: 'Charlie' })

      const count = await instance.count('users')
      expect(typeof count).toBe('number')
      expect(count).toBe(3)
    })

    it('should support count with filter', async () => {
      const instance = new DatabaseDO(ctx, env)
      await instance.create('users', { _id: '1', name: 'Alice', active: true })
      await instance.create('users', { _id: '2', name: 'Bob', active: false })
      await instance.create('users', { _id: '3', name: 'Charlie', active: true })

      const count = await instance.count('users', { active: true })
      expect(count).toBe(2)
    })
  })

  describe('Index support', () => {
    it('should support creating indexes', async () => {
      const instance = new DatabaseDO(ctx, env)
      await instance.create('users', { _id: '1', name: 'Test', email: 'test@example.com' })

      await expect(instance.createIndex('users', 'email')).resolves.not.toThrow()
    })

    it('should support listing indexes', async () => {
      const instance = new DatabaseDO(ctx, env)
      await instance.createIndex('users', 'email')
      await instance.createIndex('users', 'name')

      const indexes = await instance.listIndexes('users')
      expect(indexes).toBeInstanceOf(Array)
      expect(indexes).toContain('email')
      expect(indexes).toContain('name')
    })
  })
})
