/**
 * GREEN Phase: D1 Database Adapter Tests
 *
 * Tests for D1 database adapter integration with connection pooling and
 * prepared statements support.
 *
 * Issue: workers-34hyo
 *
 * This test suite validates:
 * - D1 database adapter creation
 * - Query execution with D1 API
 * - Prepared statements caching
 * - Batch operations
 * - Type safety for results
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  D1Adapter,
  createD1Adapter,
  D1Database,
  D1PreparedStatement,
  D1Result,
  D1ExecResult,
} from '../src/index.js'

// ============================================
// Mock D1 Database and Statement
// ============================================

interface MockD1PreparedStatementOptions {
  results?: unknown[]
  meta?: {
    duration: number
    size_after: number
    rows_read: number
    rows_written: number
  }
}

function createMockD1PreparedStatement(
  options: MockD1PreparedStatementOptions = {}
): D1PreparedStatement {
  const results = options.results || []
  const meta = options.meta || {
    duration: 10,
    size_after: 1024,
    rows_read: results.length,
    rows_written: 0,
  }

  let boundValues: unknown[] = []

  return {
    bind(...values: unknown[]) {
      boundValues = values
      return this
    },
    async first<T = unknown>(_colName?: string): Promise<T | null> {
      return (results[0] as T) || null
    },
    async run(): Promise<D1Result> {
      return {
        results: [],
        success: true,
        meta,
      }
    },
    async all<T = unknown>(): Promise<D1Result<T>> {
      return {
        results: results as T[],
        success: true,
        meta,
      }
    },
    async raw<T = unknown>(): Promise<T[]> {
      return results as T[]
    },
  }
}

function createMockD1Database(
  options: {
    prepareResults?: Record<string, MockD1PreparedStatementOptions>
  } = {}
): D1Database {
  const prepareResults = options.prepareResults || {}

  return {
    prepare(query: string): D1PreparedStatement {
      const options = prepareResults[query] || {}
      return createMockD1PreparedStatement(options)
    },
    async dump(): Promise<ArrayBuffer> {
      return new ArrayBuffer(0)
    },
    async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
      return await Promise.all(statements.map((s) => s.all<T>()))
    },
    async exec(_query: string): Promise<D1ExecResult> {
      return {
        count: 0,
        duration: 10,
      }
    },
  }
}

// ============================================
// Test Suites
// ============================================

describe('D1 Adapter Interface', () => {
  it('should export D1Adapter class', () => {
    expect(D1Adapter).toBeDefined()
    expect(typeof D1Adapter).toBe('function')
  })

  it('should export createD1Adapter factory', () => {
    expect(createD1Adapter).toBeDefined()
    expect(typeof createD1Adapter).toBe('function')
  })

  it('should create instance with D1Database', () => {
    const db = createMockD1Database()
    const adapter = createD1Adapter(db)

    expect(adapter).toBeInstanceOf(D1Adapter)
    expect(adapter.db).toBe(db)
  })

  it('should have required methods', () => {
    const db = createMockD1Database()
    const adapter = createD1Adapter(db)

    expect(typeof adapter.query).toBe('function')
    expect(typeof adapter.queryOne).toBe('function')
    expect(typeof adapter.execute).toBe('function')
    expect(typeof adapter.batch).toBe('function')
    expect(typeof adapter.prepare).toBe('function')
  })
})

describe('D1 Adapter Query Execution', () => {
  let db: D1Database
  let adapter: D1Adapter

  beforeEach(() => {
    db = createMockD1Database({
      prepareResults: {
        'SELECT * FROM users': {
          results: [
            { id: 1, name: 'Alice', email: 'alice@example.com' },
            { id: 2, name: 'Bob', email: 'bob@example.com' },
          ],
        },
        'SELECT * FROM users WHERE id = ?': {
          results: [{ id: 1, name: 'Alice', email: 'alice@example.com' }],
        },
        'INSERT INTO users (name, email) VALUES (?, ?)': {
          results: [],
          meta: {
            duration: 5,
            size_after: 2048,
            rows_read: 0,
            rows_written: 1,
          },
        },
      },
    })
    adapter = createD1Adapter(db)
  })

  it('should execute query and return all rows', async () => {
    const results = await adapter.query('SELECT * FROM users')

    expect(results).toBeDefined()
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBe(2)
    expect(results[0]).toHaveProperty('name', 'Alice')
  })

  it('should execute query with bindings', async () => {
    const results = await adapter.query('SELECT * FROM users WHERE id = ?', 1)

    expect(results).toBeDefined()
    expect(results.length).toBe(1)
    expect(results[0]).toHaveProperty('id', 1)
  })

  it('should return typed results', async () => {
    interface User {
      id: number
      name: string
      email: string
    }

    const results = await adapter.query<User>('SELECT * FROM users')

    expect(results[0]!.name).toBe('Alice')
    expect(results[0]!.email).toBe('alice@example.com')
  })

  it('should execute queryOne and return single row', async () => {
    const result = await adapter.queryOne('SELECT * FROM users WHERE id = ?', 1)

    expect(result).toBeDefined()
    expect(result).toHaveProperty('name', 'Alice')
  })

  it('should return undefined when no results', async () => {
    const db = createMockD1Database({
      prepareResults: {
        'SELECT * FROM users WHERE id = ?': {
          results: [],
        },
      },
    })
    const adapter = createD1Adapter(db)

    const result = await adapter.queryOne('SELECT * FROM users WHERE id = ?', 999)

    expect(result).toBeUndefined()
  })

  it('should execute INSERT/UPDATE/DELETE statements', async () => {
    const result = await adapter.execute('INSERT INTO users (name, email) VALUES (?, ?)', 'Charlie', 'charlie@example.com')

    expect(result).toBeDefined()
    expect(result.count).toBe(1)
    expect(result.duration).toBeGreaterThanOrEqual(0)
  })
})

describe('D1 Adapter Prepared Statements', () => {
  let db: D1Database
  let adapter: D1Adapter

  beforeEach(() => {
    db = createMockD1Database({
      prepareResults: {
        'SELECT * FROM users WHERE id = ?': {
          results: [{ id: 1, name: 'Alice' }],
        },
      },
    })
    adapter = createD1Adapter(db)
  })

  it('should prepare statement', () => {
    const stmt = adapter.prepare('SELECT * FROM users WHERE id = ?')

    expect(stmt).toBeDefined()
    expect(typeof stmt.bind).toBe('function')
    expect(typeof stmt.all).toBe('function')
    expect(typeof stmt.first).toBe('function')
  })

  it('should cache prepared statements', () => {
    const sql = 'SELECT * FROM users WHERE id = ?'

    const stmt1 = adapter.prepare(sql)
    const stmt2 = adapter.prepare(sql)

    // Should return the same cached statement
    expect(stmt1).toBe(stmt2)
    expect(adapter.getCacheSize()).toBe(1)
  })

  it('should cache multiple different statements', () => {
    adapter.prepare('SELECT * FROM users')
    adapter.prepare('SELECT * FROM posts')
    adapter.prepare('SELECT * FROM comments')

    expect(adapter.getCacheSize()).toBe(3)
  })

  it('should clear cache', () => {
    adapter.prepare('SELECT * FROM users')
    adapter.prepare('SELECT * FROM posts')
    expect(adapter.getCacheSize()).toBe(2)

    adapter.clearCache()
    expect(adapter.getCacheSize()).toBe(0)
  })

  it('should prepare new statement after cache clear', () => {
    const sql = 'SELECT * FROM users'
    const stmt1 = adapter.prepare(sql)

    adapter.clearCache()

    const stmt2 = adapter.prepare(sql)

    // Should be different instances after cache clear
    expect(stmt1).not.toBe(stmt2)
  })
})

describe('D1 Adapter Batch Operations', () => {
  let db: D1Database
  let adapter: D1Adapter

  beforeEach(() => {
    db = createMockD1Database()
    adapter = createD1Adapter(db)
  })

  it('should execute batch operations', async () => {
    const stmt1 = adapter.prepare('INSERT INTO users (name) VALUES (?)')
    const stmt2 = adapter.prepare('INSERT INTO users (name) VALUES (?)')

    const results = await adapter.batch([
      stmt1.bind('Alice'),
      stmt2.bind('Bob'),
    ])

    expect(results).toBeDefined()
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBe(2)
  })

  it('should return typed batch results', async () => {
    const db = createMockD1Database({
      prepareResults: {
        'SELECT * FROM users WHERE id = ?': {
          results: [{ id: 1, name: 'Alice' }],
        },
      },
    })
    const adapter = createD1Adapter(db)

    interface User {
      id: number
      name: string
    }

    const stmt = adapter.prepare('SELECT * FROM users WHERE id = ?')
    const results = await adapter.batch<User>([stmt.bind(1)])

    expect(results[0]!.results[0]!.name).toBe('Alice')
  })
})

describe('D1 Adapter Error Handling', () => {
  it('should handle database connection errors', async () => {
    const db = createMockD1Database()
    const prepareSpy = vi.spyOn(db, 'prepare')
    prepareSpy.mockImplementation(() => {
      throw new Error('Connection error')
    })

    const adapter = createD1Adapter(db)

    await expect(adapter.query('SELECT * FROM users')).rejects.toThrow('Connection error')
  })

  it('should handle SQL errors', async () => {
    const db = createMockD1Database()
    const adapter = createD1Adapter(db)

    const stmt = adapter.prepare('INVALID SQL')
    vi.spyOn(stmt, 'all').mockRejectedValue(new Error('SQL syntax error'))

    await expect(adapter.query('INVALID SQL')).rejects.toThrow('SQL syntax error')
  })

  it('should handle binding errors', async () => {
    const db = createMockD1Database()
    const adapter = createD1Adapter(db)

    const stmt = adapter.prepare('SELECT * FROM users WHERE id = ?')
    vi.spyOn(stmt, 'bind').mockImplementation(() => {
      throw new Error('Invalid binding')
    })

    await expect(adapter.query('SELECT * FROM users WHERE id = ?', 'invalid')).rejects.toThrow('Invalid binding')
  })
})

describe('D1 Adapter Type Safety', () => {
  let adapter: D1Adapter

  beforeEach(() => {
    const db = createMockD1Database({
      prepareResults: {
        'SELECT * FROM users': {
          results: [
            { id: 1, name: 'Alice', email: 'alice@example.com', age: 30 },
          ],
        },
      },
    })
    adapter = createD1Adapter(db)
  })

  it('should preserve generic type in query results', async () => {
    interface User {
      id: number
      name: string
      email: string
      age: number
    }

    const results = await adapter.query<User>('SELECT * FROM users')

    // TypeScript should know about User properties
    expect(results[0]!.id).toBe(1)
    expect(results[0]!.name).toBe('Alice')
    expect(results[0]!.email).toBe('alice@example.com')
    expect(results[0]!.age).toBe(30)
  })

  it('should preserve generic type in queryOne result', async () => {
    interface User {
      id: number
      name: string
    }

    const result = await adapter.queryOne<User>('SELECT * FROM users')

    if (result) {
      expect(result.id).toBeDefined()
      expect(result.name).toBeDefined()
    }
  })
})

describe('D1 Adapter Performance', () => {
  it('should measure query duration', async () => {
    const db = createMockD1Database({
      prepareResults: {
        'SELECT * FROM users': {
          results: [{ id: 1, name: 'Alice' }],
          meta: {
            duration: 15.5,
            size_after: 1024,
            rows_read: 1,
            rows_written: 0,
          },
        },
      },
    })
    const adapter = createD1Adapter(db)

    const stmt = adapter.prepare('SELECT * FROM users')
    const result = await stmt.all()

    expect(result.meta.duration).toBe(15.5)
  })

  it('should track rows read/written', async () => {
    const db = createMockD1Database({
      prepareResults: {
        'INSERT INTO users (name) VALUES (?)': {
          results: [],
          meta: {
            duration: 5,
            size_after: 2048,
            rows_read: 0,
            rows_written: 1,
          },
        },
      },
    })
    const adapter = createD1Adapter(db)

    const result = await adapter.execute('INSERT INTO users (name) VALUES (?)', 'Alice')

    expect(result.count).toBe(1)
  })

  it('should efficiently cache prepared statements', () => {
    const db = createMockD1Database()
    const prepareSpy = vi.spyOn(db, 'prepare')
    const adapter = createD1Adapter(db)

    const sql = 'SELECT * FROM users WHERE id = ?'

    // First call should prepare
    adapter.prepare(sql)
    expect(prepareSpy).toHaveBeenCalledTimes(1)

    // Second call should use cache
    adapter.prepare(sql)
    expect(prepareSpy).toHaveBeenCalledTimes(1) // Still 1, not 2

    // Different SQL should prepare again
    adapter.prepare('SELECT * FROM posts')
    expect(prepareSpy).toHaveBeenCalledTimes(2)
  })
})
