/**
 * Tests for 彡 (db) - Database Operations Glyph
 *
 * RED Phase: Define the API contract through failing tests.
 *
 * The 彡 glyph represents stacked layers - a visual metaphor for
 * database tables/rows stacked on top of each other.
 *
 * Covers:
 * - Type-safe database proxy: 彡<Schema>()
 * - Table access via proxy: database.tableName
 * - Query building: .where(), .select(), .orderBy(), .limit()
 * - Data operations: .insert(), .update(), .delete()
 * - Transactions: .tx(async fn) with rollback on error
 * - Query execution: .execute()
 * - ASCII alias: db
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
// These imports will fail until implementation exists - this is expected for RED phase
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error - Module doesn't exist yet (RED phase)
import { 彡, db } from '../src/db.js'

// Define test schema interfaces
interface User {
  id: string
  name: string
  email: string
  age?: number
  active?: boolean
  createdAt?: Date
}

interface Post {
  id: string
  title: string
  body: string
  authorId: string
  published?: boolean
}

interface Comment {
  id: string
  postId: string
  userId: string
  content: string
}

interface TestSchema {
  users: User
  posts: Post
  comments: Comment
}

describe('彡 (db) - Database Operations', () => {
  describe('Database Proxy Creation', () => {
    it('should create a typed database proxy with 彡<Schema>()', () => {
      const database = 彡<TestSchema>()

      expect(database).toBeDefined()
      expect(typeof database).toBe('object')
    })

    it('should access tables via proxy property access', () => {
      const database = 彡<TestSchema>()

      expect(database.users).toBeDefined()
      expect(database.posts).toBeDefined()
      expect(database.comments).toBeDefined()
    })

    it('should return table accessor for any table name', () => {
      const database = 彡<TestSchema>()

      // Table accessors should be chainable query builders
      expect(typeof database.users.where).toBe('function')
      expect(typeof database.users.insert).toBe('function')
      expect(typeof database.users.select).toBe('function')
    })

    it('should create database with connection options', () => {
      const database = 彡<TestSchema>({
        connection: 'sqlite://test.db',
      })

      expect(database).toBeDefined()
    })

    it('should create database with D1 binding', () => {
      const mockD1 = { prepare: vi.fn() }
      const database = 彡<TestSchema>({
        binding: mockD1,
      })

      expect(database).toBeDefined()
    })
  })

  describe('Query Building - where()', () => {
    it('should query table with simple where clause', async () => {
      const database = 彡<TestSchema>()
      const query = database.users.where({ name: 'Tom' })

      expect(query).toBeDefined()
      expect(typeof query.execute).toBe('function')
    })

    it('should query with equality predicate', async () => {
      const database = 彡<TestSchema>()
      const users = await database.users
        .where({ email: 'tom@agents.do' })
        .execute()

      expect(Array.isArray(users)).toBe(true)
    })

    it('should query with comparison operators', async () => {
      const database = 彡<TestSchema>()
      const users = await database.users
        .where({ age: { gte: 21 } })
        .execute()

      expect(Array.isArray(users)).toBe(true)
    })

    it('should support like operator for pattern matching', async () => {
      const database = 彡<TestSchema>()
      const users = await database.users
        .where({ email: { like: '%@agents.do' } })
        .execute()

      expect(Array.isArray(users)).toBe(true)
    })

    it('should support in operator for multiple values', async () => {
      const database = 彡<TestSchema>()
      const users = await database.users
        .where({ id: { in: ['1', '2', '3'] } })
        .execute()

      expect(Array.isArray(users)).toBe(true)
    })

    it('should support not operator', async () => {
      const database = 彡<TestSchema>()
      const users = await database.users
        .where({ active: { not: false } })
        .execute()

      expect(Array.isArray(users)).toBe(true)
    })

    it('should support null checks', async () => {
      const database = 彡<TestSchema>()
      const users = await database.users
        .where({ age: { isNull: true } })
        .execute()

      expect(Array.isArray(users)).toBe(true)
    })

    it('should chain multiple where clauses with AND', async () => {
      const database = 彡<TestSchema>()
      const users = await database.users
        .where({ active: true })
        .where({ age: { gte: 18 } })
        .execute()

      expect(Array.isArray(users)).toBe(true)
    })

    it('should support OR conditions', async () => {
      const database = 彡<TestSchema>()
      const users = await database.users
        .where({
          $or: [
            { name: 'Tom' },
            { name: 'Priya' },
          ]
        })
        .execute()

      expect(Array.isArray(users)).toBe(true)
    })
  })

  describe('Query Building - select()', () => {
    it('should select specific columns', async () => {
      const database = 彡<TestSchema>()
      const users = await database.users
        .select('id', 'name')
        .execute()

      expect(Array.isArray(users)).toBe(true)
    })

    it('should select with array of column names', async () => {
      const database = 彡<TestSchema>()
      const users = await database.users
        .select(['id', 'name', 'email'])
        .execute()

      expect(Array.isArray(users)).toBe(true)
    })

    it('should chain select with where', async () => {
      const database = 彡<TestSchema>()
      const users = await database.users
        .select('id', 'name')
        .where({ active: true })
        .execute()

      expect(Array.isArray(users)).toBe(true)
    })
  })

  describe('Query Building - orderBy()', () => {
    it('should order by single column ascending', async () => {
      const database = 彡<TestSchema>()
      const users = await database.users
        .orderBy('name')
        .execute()

      expect(Array.isArray(users)).toBe(true)
    })

    it('should order by column with direction', async () => {
      const database = 彡<TestSchema>()
      const users = await database.users
        .orderBy('createdAt', 'desc')
        .execute()

      expect(Array.isArray(users)).toBe(true)
    })

    it('should order by object with column and direction', async () => {
      const database = 彡<TestSchema>()
      const users = await database.users
        .orderBy({ column: 'name', direction: 'asc' })
        .execute()

      expect(Array.isArray(users)).toBe(true)
    })

    it('should order by multiple columns', async () => {
      const database = 彡<TestSchema>()
      const users = await database.users
        .orderBy('active', 'desc')
        .orderBy('name', 'asc')
        .execute()

      expect(Array.isArray(users)).toBe(true)
    })
  })

  describe('Query Building - limit() and offset()', () => {
    it('should limit results', async () => {
      const database = 彡<TestSchema>()
      const users = await database.users
        .limit(10)
        .execute()

      expect(Array.isArray(users)).toBe(true)
    })

    it('should offset results for pagination', async () => {
      const database = 彡<TestSchema>()
      const users = await database.users
        .offset(20)
        .limit(10)
        .execute()

      expect(Array.isArray(users)).toBe(true)
    })
  })

  describe('Complex Query Building', () => {
    it('should build complex queries with chaining', async () => {
      const database = 彡<TestSchema>()
      const result = await database.users
        .select('id', 'name')
        .where({ email: { like: '%@agents.do' } })
        .orderBy('name')
        .limit(10)
        .execute()

      expect(Array.isArray(result)).toBe(true)
    })

    it('should support find() for single row', async () => {
      const database = 彡<TestSchema>()
      const user = await database.users.find('user-123')

      // find() returns single record or null
      expect(user === null || typeof user === 'object').toBe(true)
    })

    it('should support findFirst() with predicate', async () => {
      const database = 彡<TestSchema>()
      const user = await database.users
        .where({ email: 'tom@agents.do' })
        .findFirst()

      expect(user === null || typeof user === 'object').toBe(true)
    })

    it('should support count()', async () => {
      const database = 彡<TestSchema>()
      const count = await database.users
        .where({ active: true })
        .count()

      expect(typeof count).toBe('number')
    })

    it('should support exists()', async () => {
      const database = 彡<TestSchema>()
      const exists = await database.users
        .where({ email: 'tom@agents.do' })
        .exists()

      expect(typeof exists).toBe('boolean')
    })
  })

  describe('Data Operations - insert()', () => {
    it('should insert a single row', async () => {
      const database = 彡<TestSchema>()
      const user = await database.users.insert({
        id: '1',
        name: 'Tom',
        email: 'tom@agents.do',
      })

      expect(user).toBeDefined()
      expect(user.id).toBe('1')
      expect(user.name).toBe('Tom')
      expect(user.email).toBe('tom@agents.do')
    })

    it('should insert multiple rows', async () => {
      const database = 彡<TestSchema>()
      const users = await database.users.insert([
        { id: '1', name: 'Tom', email: 'tom@agents.do' },
        { id: '2', name: 'Priya', email: 'priya@agents.do' },
        { id: '3', name: 'Ralph', email: 'ralph@agents.do' },
      ])

      expect(Array.isArray(users)).toBe(true)
      expect(users.length).toBe(3)
    })

    it('should return inserted row with generated fields', async () => {
      const database = 彡<TestSchema>()
      const user = await database.users.insert({
        id: 'auto',
        name: 'New User',
        email: 'new@agents.do',
      })

      expect(user.id).toBeDefined()
    })

    it('should support insertOrIgnore()', async () => {
      const database = 彡<TestSchema>()

      // Should not throw on duplicate
      await database.users.insertOrIgnore({
        id: '1',
        name: 'Tom',
        email: 'tom@agents.do',
      })

      await database.users.insertOrIgnore({
        id: '1',
        name: 'Duplicate',
        email: 'dupe@agents.do',
      })

      // No error expected
      expect(true).toBe(true)
    })

    it('should support upsert() for insert or update', async () => {
      const database = 彡<TestSchema>()
      const user = await database.users.upsert(
        { id: '1', name: 'Tom Updated', email: 'tom@agents.do' },
        { conflictColumns: ['id'] }
      )

      expect(user.name).toBe('Tom Updated')
    })
  })

  describe('Data Operations - update()', () => {
    it('should update rows matching predicate', async () => {
      const database = 彡<TestSchema>()
      const updated = await database.users
        .where({ id: '1' })
        .update({ name: 'Tom Updated' })

      expect(updated).toBeDefined()
    })

    it('should update and return affected rows', async () => {
      const database = 彡<TestSchema>()
      const result = await database.users
        .where({ active: false })
        .update({ active: true })
        .returning()

      expect(Array.isArray(result)).toBe(true)
    })

    it('should support updateById() shorthand', async () => {
      const database = 彡<TestSchema>()
      const user = await database.users.updateById('1', {
        name: 'Tom v2',
      })

      expect(user).toBeDefined()
    })

    it('should return number of affected rows', async () => {
      const database = 彡<TestSchema>()
      const affectedRows = await database.users
        .where({ active: false })
        .update({ active: true })
        .affectedRows()

      expect(typeof affectedRows).toBe('number')
    })
  })

  describe('Data Operations - delete()', () => {
    it('should delete rows matching predicate', async () => {
      const database = 彡<TestSchema>()
      await database.users
        .where({ id: '1' })
        .delete()

      // No error expected
      expect(true).toBe(true)
    })

    it('should prevent delete without where clause', async () => {
      const database = 彡<TestSchema>()

      // Should throw or require explicit confirmation
      await expect(
        database.users.delete()
      ).rejects.toThrow()
    })

    it('should support deleteById() shorthand', async () => {
      const database = 彡<TestSchema>()
      await database.users.deleteById('1')

      expect(true).toBe(true)
    })

    it('should support delete with returning()', async () => {
      const database = 彡<TestSchema>()
      const deleted = await database.users
        .where({ id: '1' })
        .delete()
        .returning()

      expect(Array.isArray(deleted)).toBe(true)
    })
  })

  describe('Transactions with .tx()', () => {
    it('should execute operations in transaction', async () => {
      const database = 彡<TestSchema>()

      await database.tx(async (tx) => {
        await tx.users.insert({ id: '1', name: 'Tom', email: 'tom@agents.do' })
        await tx.posts.insert({ id: '1', title: 'Hello', body: 'World', authorId: '1' })
      })

      expect(true).toBe(true)
    })

    it('should rollback transaction on error', async () => {
      const database = 彡<TestSchema>()

      await expect(database.tx(async (tx) => {
        await tx.users.insert({ id: '1', name: 'Tom', email: 'tom@agents.do' })
        throw new Error('Rollback!')
      })).rejects.toThrow('Rollback!')
    })

    it('should provide typed transaction context', async () => {
      const database = 彡<TestSchema>()

      await database.tx(async (tx) => {
        // Transaction should have same table accessors
        expect(tx.users).toBeDefined()
        expect(tx.posts).toBeDefined()
        expect(tx.comments).toBeDefined()
      })
    })

    it('should support nested operations in transaction', async () => {
      const database = 彡<TestSchema>()

      await database.tx(async (tx) => {
        const user = await tx.users.insert({
          id: '1',
          name: 'Author',
          email: 'author@agents.do',
        })

        await tx.posts.insert({
          id: '1',
          title: 'My Post',
          body: 'Content',
          authorId: user.id,
        })

        await tx.comments.insert({
          id: '1',
          postId: '1',
          userId: user.id,
          content: 'Self comment',
        })
      })

      expect(true).toBe(true)
    })

    it('should isolate transaction from other operations', async () => {
      const database = 彡<TestSchema>()
      const results: string[] = []

      const txPromise = database.tx(async (tx) => {
        await tx.users.insert({ id: 'tx-1', name: 'TX User', email: 'tx@agents.do' })
        results.push('tx-insert')
        await new Promise(r => setTimeout(r, 50))
        results.push('tx-complete')
      })

      // Outside transaction - should not see uncommitted data
      results.push('outside-read')

      await txPromise
      expect(results).toContain('tx-complete')
    })

    it('should return value from transaction', async () => {
      const database = 彡<TestSchema>()

      const user = await database.tx(async (tx) => {
        return tx.users.insert({
          id: '1',
          name: 'Tom',
          email: 'tom@agents.do',
        })
      })

      expect(user.id).toBe('1')
    })
  })

  describe('Raw SQL Support', () => {
    it('should execute raw SQL queries', async () => {
      const database = 彡<TestSchema>()
      const result = await database.raw<User[]>(
        'SELECT * FROM users WHERE active = ?',
        [true]
      )

      expect(Array.isArray(result)).toBe(true)
    })

    it('should execute raw SQL with named parameters', async () => {
      const database = 彡<TestSchema>()
      const result = await database.raw<User[]>(
        'SELECT * FROM users WHERE name = :name',
        { name: 'Tom' }
      )

      expect(Array.isArray(result)).toBe(true)
    })

    it('should support raw in transactions', async () => {
      const database = 彡<TestSchema>()

      await database.tx(async (tx) => {
        await tx.raw('UPDATE users SET active = ? WHERE id = ?', [true, '1'])
      })

      expect(true).toBe(true)
    })
  })

  describe('Batch Operations', () => {
    it('should support batch execute', async () => {
      const database = 彡<TestSchema>()

      const results = await database.batch([
        database.users.where({ active: true }),
        database.posts.where({ published: true }),
        database.comments.where({ postId: '1' }),
      ])

      expect(Array.isArray(results)).toBe(true)
      expect(results.length).toBe(3)
    })
  })

  describe('Schema Introspection', () => {
    it('should list available tables', () => {
      const database = 彡<TestSchema>()
      const tables = database.tables

      expect(tables).toContain('users')
      expect(tables).toContain('posts')
      expect(tables).toContain('comments')
    })

    it('should describe table schema', () => {
      const database = 彡<TestSchema>()
      const schema = database.describe('users')

      expect(schema).toBeDefined()
      expect(schema.name).toBe('users')
      expect(Array.isArray(schema.columns)).toBe(true)
    })
  })

  describe('ASCII Alias: db', () => {
    it('should export db as ASCII alias for 彡', () => {
      expect(db).toBe(彡)
    })

    it('should work identically via db alias - create database', () => {
      const database = db<TestSchema>()
      expect(database).toBeDefined()
      expect(database.users).toBeDefined()
    })

    it('should work identically via db alias - query building', async () => {
      const database = db<TestSchema>()
      const users = await database.users
        .where({ name: 'Tom' })
        .execute()

      expect(Array.isArray(users)).toBe(true)
    })

    it('should work identically via db alias - transactions', async () => {
      const database = db<TestSchema>()

      await database.tx(async (tx) => {
        await tx.users.insert({ id: '1', name: 'Tom', email: 'tom@agents.do' })
      })

      expect(true).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should throw on invalid table access', () => {
      const database = 彡<TestSchema>()

      // TypeScript should prevent this, but runtime should also throw
      expect(() => {
        // @ts-expect-error - Testing invalid access
        database.invalidTable.where({})
      }).toThrow()
    })

    it('should throw descriptive error for constraint violations', async () => {
      const database = 彡<TestSchema>()

      // Assuming unique constraint on email
      await database.users.insert({ id: '1', name: 'Tom', email: 'tom@agents.do' })

      await expect(
        database.users.insert({ id: '2', name: 'Tom2', email: 'tom@agents.do' })
      ).rejects.toThrow(/constraint|unique|duplicate/i)
    })

    it('should handle connection errors gracefully', async () => {
      const database = 彡<TestSchema>({
        connection: 'invalid://connection',
      })

      await expect(
        database.users.execute()
      ).rejects.toThrow()
    })
  })

  describe('Query Inspection', () => {
    it('should expose toSQL() for query debugging', () => {
      const database = 彡<TestSchema>()
      const query = database.users
        .select('id', 'name')
        .where({ active: true })
        .orderBy('name')
        .limit(10)

      const sql = query.toSQL()

      expect(typeof sql).toBe('string')
      expect(sql).toContain('SELECT')
      expect(sql).toContain('FROM')
    })

    it('should expose parameters in toSQL()', () => {
      const database = 彡<TestSchema>()
      const query = database.users.where({ name: 'Tom' })

      const { sql, params } = query.toSQLWithParams()

      expect(typeof sql).toBe('string')
      expect(Array.isArray(params) || typeof params === 'object').toBe(true)
    })
  })

  describe('Type Safety', () => {
    it('should enforce schema types on insert', async () => {
      const database = 彡<TestSchema>()

      // This should be caught by TypeScript
      // @ts-expect-error - Missing required fields
      await database.users.insert({ id: '1' })
    })

    it('should enforce schema types on where clause', async () => {
      const database = 彡<TestSchema>()

      // This should be caught by TypeScript
      // @ts-expect-error - Invalid field
      await database.users.where({ invalidField: true })
    })

    it('should return properly typed results', async () => {
      const database = 彡<TestSchema>()
      const users = await database.users.execute()

      // TypeScript should infer users as User[]
      if (users.length > 0) {
        const user = users[0]
        // These should all be properly typed
        const id: string = user.id
        const name: string = user.name
        const email: string = user.email

        expect(id).toBeDefined()
        expect(name).toBeDefined()
        expect(email).toBeDefined()
      }
    })

    it('should narrow types with select()', async () => {
      const database = 彡<TestSchema>()
      const partialUsers = await database.users
        .select('id', 'name')
        .execute()

      // TypeScript should infer partialUsers as Pick<User, 'id' | 'name'>[]
      if (partialUsers.length > 0) {
        const user = partialUsers[0]
        expect(user.id).toBeDefined()
        expect(user.name).toBeDefined()
        // @ts-expect-error - email not selected
        expect(user.email).toBeUndefined()
      }
    })
  })
})

describe('彡 Function Signature', () => {
  it('should be callable as a generic function', () => {
    // Verify 彡 is a function that accepts type parameter
    expect(typeof 彡).toBe('function')
  })

  it('should accept optional configuration', () => {
    const database = 彡<TestSchema>({
      connection: 'sqlite::memory:',
      debug: true,
    })

    expect(database).toBeDefined()
  })

  it('should have proper method signatures on returned database', () => {
    const database = 彡<TestSchema>()

    expect(typeof database.tx).toBe('function')
    expect(typeof database.raw).toBe('function')
    expect(typeof database.batch).toBe('function')
  })
})
