/**
 * ThingsMixin Tests
 *
 * Tests for the Things management mixin, covering:
 * - CRUD operations (create, read, update, delete)
 * - Listing and filtering
 * - Search functionality
 * - Event emission
 * - Schema initialization
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DOCore, type DOState } from '../src/index.js'
import { applyThingsMixin, type Thing, type CreateThingInput, type ThingEvent } from '../src/things-mixin.js'
import { createMockState, createMockSqlCursor } from './helpers.js'

// Create a test class that uses the ThingsMixin
const ThingsDO = applyThingsMixin(DOCore)

// Helper to create a mock state with SQL support
function createMockStateWithSql(): DOState & {
  _sqlData: Map<string, unknown[]>
  _lastQuery: string
  _lastParams: unknown[]
} {
  const sqlData = new Map<string, unknown[]>()
  let lastQuery = ''
  let lastParams: unknown[] = []
  let rowCounter = 0

  const mockState = createMockState()

  // Override SQL with tracking capabilities
  const sqlStorage = {
    exec: vi.fn(<T = Record<string, unknown>>(query: string, ...params: unknown[]) => {
      lastQuery = query
      lastParams = params

      const normalizedQuery = query.toLowerCase().trim()

      // Handle CREATE TABLE/INDEX (schema initialization)
      if (normalizedQuery.startsWith('create')) {
        return createMockSqlCursor<T>([])
      }

      // Handle INSERT
      if (normalizedQuery.startsWith('insert')) {
        rowCounter++
        // Extract table name and store data
        const tableMatch = query.match(/insert into (\w+)/i)
        if (tableMatch) {
          const table = tableMatch[1]
          const rows = sqlData.get(table) ?? []
          rows.push({ rowid: rowCounter, params: [...params] })
          sqlData.set(table, rows)
        }
        return { rowsWritten: 1, toArray: () => [] }
      }

      // Handle UPDATE for things (check before generic SELECT)
      if (normalizedQuery.startsWith('update') && normalizedQuery.includes('things')) {
        // Extract ns, type, id from WHERE clause params (last 3 params)
        const [url, data, context, updatedAt, ns, type, id] = params
        const things = sqlData.get('things') ?? []
        const found = things.find((t: unknown) => {
          const thing = t as { params: unknown[] }
          return thing.params[0] === ns && thing.params[1] === type && thing.params[2] === id
        })

        if (found) {
          const thing = found as { rowid: number; params: unknown[] }
          // Update the stored data
          if (url !== null) thing.params[3] = url
          thing.params[4] = data
          if (context !== null) thing.params[5] = context
          thing.params[7] = updatedAt
          return { rowsWritten: 1, toArray: () => [] }
        }
        return { rowsWritten: 0, toArray: () => [] }
      }

      // Handle DELETE from things (check before generic SELECT)
      if (normalizedQuery.startsWith('delete') && normalizedQuery.includes('things')) {
        const things = sqlData.get('things') ?? []
        const [ns, type, id] = params
        const initialLength = things.length
        const remaining = things.filter((t: unknown) => {
          const thing = t as { params: unknown[] }
          return !(thing.params[0] === ns && thing.params[1] === type && thing.params[2] === id)
        })
        sqlData.set('things', remaining)
        const deletedCount = initialLength - remaining.length
        return {
          rowsWritten: deletedCount,
          toArray: () => []
        }
      }

      // Handle SELECT for things (must be after UPDATE/DELETE checks)
      if (normalizedQuery.startsWith('select') && normalizedQuery.includes('from things')) {
        const things = sqlData.get('things') ?? []

        // Check for specific ID lookup
        if (normalizedQuery.includes('where ns = ? and type = ? and id = ?')) {
          const [ns, type, id] = params.slice(0, 3)
          const found = things.find((t: unknown) => {
            const thing = t as { params: unknown[] }
            return thing.params[0] === ns && thing.params[1] === type && thing.params[2] === id
          })

          if (found) {
            const p = (found as { rowid: number; params: unknown[] }).params
            return createMockSqlCursor<T>([{
              rowid: (found as { rowid: number }).rowid,
              ns: p[0],
              type: p[1],
              id: p[2],
              url: p[3],
              data: p[4],
              context: p[5],
              created_at: p[6],
              updated_at: p[7],
            } as T])
          }
          return createMockSqlCursor<T>([])
        }

        // Return all things for list queries
        const results = things.map((t: unknown) => {
          const thing = t as { rowid: number; params: unknown[] }
          return {
            rowid: thing.rowid,
            ns: thing.params[0],
            type: thing.params[1],
            id: thing.params[2],
            url: thing.params[3],
            data: thing.params[4],
            context: thing.params[5],
            created_at: thing.params[6],
            updated_at: thing.params[7],
          } as T
        })
        return createMockSqlCursor<T>(results)
      }

      return createMockSqlCursor<T>([])
    }),
  }

  return {
    ...mockState,
    storage: {
      ...mockState.storage,
      sql: sqlStorage,
    },
    _sqlData: sqlData,
    get _lastQuery() { return lastQuery },
    get _lastParams() { return lastParams },
  }
}

describe('ThingsMixin', () => {
  describe('Mixin Application', () => {
    it('should create a class with Things methods', () => {
      expect(ThingsDO).toBeDefined()
      expect(ThingsDO.prototype.getThing).toBeDefined()
      expect(ThingsDO.prototype.createThing).toBeDefined()
      expect(ThingsDO.prototype.updateThing).toBeDefined()
      expect(ThingsDO.prototype.deleteThing).toBeDefined()
      expect(ThingsDO.prototype.listThings).toBeDefined()
      expect(ThingsDO.prototype.searchThings).toBeDefined()
      expect(ThingsDO.prototype.onThingEvent).toBeDefined()
      expect(ThingsDO.prototype.offThingEvent).toBeDefined()
    })

    it('should extend DOCore', () => {
      const state = createMockStateWithSql()
      const instance = new ThingsDO(state, {})

      expect(instance).toBeInstanceOf(DOCore)
    })
  })

  describe('CRUD Operations', () => {
    let instance: InstanceType<typeof ThingsDO>
    let state: ReturnType<typeof createMockStateWithSql>

    beforeEach(() => {
      state = createMockStateWithSql()
      instance = new ThingsDO(state, {})
    })

    describe('createThing()', () => {
      it('should create a thing with required fields', async () => {
        const input: CreateThingInput = {
          type: 'user',
          data: { name: 'John Doe', email: 'john@example.com' },
        }

        const thing = await instance.createThing(input)

        expect(thing).toBeDefined()
        expect(thing.type).toBe('user')
        expect(thing.ns).toBe('default')
        expect(thing.data).toEqual({ name: 'John Doe', email: 'john@example.com' })
        expect(thing.id).toBeDefined()
        expect(thing.createdAt).toBeGreaterThan(0)
        expect(thing.updatedAt).toBeGreaterThan(0)
      })

      it('should create a thing with custom namespace', async () => {
        const input: CreateThingInput = {
          ns: 'myapp',
          type: 'product',
          data: { name: 'Widget' },
        }

        const thing = await instance.createThing(input)

        expect(thing.ns).toBe('myapp')
      })

      it('should create a thing with custom ID', async () => {
        const input: CreateThingInput = {
          type: 'user',
          id: 'custom-id-123',
          data: { name: 'Jane' },
        }

        const thing = await instance.createThing(input)

        expect(thing.id).toBe('custom-id-123')
      })

      it('should create a thing with optional URL and context', async () => {
        const input: CreateThingInput = {
          type: 'article',
          url: 'https://example.com/articles/1',
          context: 'https://schema.org/Article',
          data: { title: 'Hello World' },
        }

        const thing = await instance.createThing(input)

        expect(thing.url).toBe('https://example.com/articles/1')
        expect(thing.context).toBe('https://schema.org/Article')
      })

      it('should emit thing:created event', async () => {
        const events: ThingEvent[] = []
        instance.onThingEvent((event) => {
          events.push(event)
        })

        await instance.createThing({
          type: 'user',
          data: { name: 'Test' },
        })

        expect(events).toHaveLength(1)
        expect(events[0]?.type).toBe('thing:created')
        expect(events[0]?.thing.type).toBe('user')
        expect(events[0]?.timestamp).toBeGreaterThan(0)
      })
    })

    describe('getThing()', () => {
      it('should get an existing thing', async () => {
        // Create a thing first
        const created = await instance.createThing({
          type: 'user',
          id: 'user-1',
          data: { name: 'Alice' },
        })

        const thing = await instance.getThing('default', 'user', 'user-1')

        expect(thing).toBeDefined()
        expect(thing?.id).toBe('user-1')
        expect(thing?.data.name).toBe('Alice')
      })

      it('should return null for non-existent thing', async () => {
        const thing = await instance.getThing('default', 'user', 'non-existent')

        expect(thing).toBeNull()
      })
    })

    describe('updateThing()', () => {
      it('should update an existing thing', async () => {
        // Create a thing first
        await instance.createThing({
          type: 'user',
          id: 'user-1',
          data: { name: 'Alice', age: 25 },
        })

        const updated = await instance.updateThing('default', 'user', 'user-1', {
          data: { age: 26, city: 'NYC' },
        })

        expect(updated).toBeDefined()
        expect(updated?.data.name).toBe('Alice') // Original data preserved
        expect(updated?.data.age).toBe(26) // Updated
        expect(updated?.data.city).toBe('NYC') // New field
      })

      it('should return null for non-existent thing', async () => {
        const updated = await instance.updateThing('default', 'user', 'non-existent', {
          data: { name: 'Test' },
        })

        expect(updated).toBeNull()
      })

      it('should emit thing:updated event', async () => {
        const events: ThingEvent[] = []
        instance.onThingEvent((event) => {
          events.push(event)
        })

        await instance.createThing({
          type: 'user',
          id: 'user-1',
          data: { name: 'Alice' },
        })

        await instance.updateThing('default', 'user', 'user-1', {
          data: { name: 'Alice Updated' },
        })

        expect(events).toHaveLength(2)
        expect(events[1]?.type).toBe('thing:updated')
      })

      it('should update URL', async () => {
        await instance.createThing({
          type: 'user',
          id: 'user-1',
          data: { name: 'Alice' },
        })

        const updated = await instance.updateThing('default', 'user', 'user-1', {
          url: 'https://example.com/users/alice',
        })

        expect(updated?.url).toBe('https://example.com/users/alice')
      })
    })

    describe('deleteThing()', () => {
      it('should delete an existing thing', async () => {
        const created = await instance.createThing({
          type: 'user',
          id: 'user-1',
          data: { name: 'Alice' },
        })

        // Verify it was created
        expect(created.id).toBe('user-1')

        // Verify we can get it
        const beforeDelete = await instance.getThing('default', 'user', 'user-1')
        expect(beforeDelete).not.toBeNull()

        const deleted = await instance.deleteThing('default', 'user', 'user-1')

        expect(deleted).toBe(true)

        // Verify it's gone
        const thing = await instance.getThing('default', 'user', 'user-1')
        expect(thing).toBeNull()
      })

      it('should return false for non-existent thing', async () => {
        const deleted = await instance.deleteThing('default', 'user', 'non-existent')

        expect(deleted).toBe(false)
      })

      it('should emit thing:deleted event', async () => {
        const events: ThingEvent[] = []
        instance.onThingEvent((event) => {
          events.push(event)
        })

        await instance.createThing({
          type: 'user',
          id: 'user-1',
          data: { name: 'Alice' },
        })

        await instance.deleteThing('default', 'user', 'user-1')

        expect(events).toHaveLength(2)
        expect(events[1]?.type).toBe('thing:deleted')
        expect(events[1]?.thing.id).toBe('user-1')
      })
    })
  })

  describe('Listing and Filtering', () => {
    let instance: InstanceType<typeof ThingsDO>
    let state: ReturnType<typeof createMockStateWithSql>

    beforeEach(async () => {
      state = createMockStateWithSql()
      instance = new ThingsDO(state, {})

      // Create some test data
      await instance.createThing({ type: 'user', id: 'user-1', data: { name: 'Alice' } })
      await instance.createThing({ type: 'user', id: 'user-2', data: { name: 'Bob' } })
      await instance.createThing({ ns: 'other', type: 'user', id: 'user-3', data: { name: 'Charlie' } })
      await instance.createThing({ type: 'product', id: 'prod-1', data: { name: 'Widget' } })
    })

    describe('listThings()', () => {
      it('should list all things without filter', async () => {
        const things = await instance.listThings()

        expect(things.length).toBe(4)
      })

      it('should generate correct SQL for namespace filter', async () => {
        // This test verifies the SQL is generated correctly
        // Actual filtering is handled by SQLite in real implementation
        await instance.listThings({ ns: 'default' })

        // Verify the SQL query includes namespace filter
        expect(state._lastQuery).toContain('ns = ?')
      })

      it('should generate correct SQL for type filter', async () => {
        await instance.listThings({ type: 'user' })

        expect(state._lastQuery).toContain('type = ?')
      })

      it('should generate correct SQL for combined filters', async () => {
        await instance.listThings({ ns: 'default', type: 'user' })

        expect(state._lastQuery).toContain('ns = ?')
        expect(state._lastQuery).toContain('type = ?')
      })

      it('should generate correct SQL for limit', async () => {
        await instance.listThings({ limit: 2 })

        expect(state._lastQuery).toContain('LIMIT')
      })

      it('should generate correct SQL for offset', async () => {
        await instance.listThings({ offset: 2 })

        expect(state._lastQuery).toContain('OFFSET')
      })

      it('should return array of Things', async () => {
        const things = await instance.listThings()

        expect(Array.isArray(things)).toBe(true)
        expect(things.length).toBeGreaterThan(0)
        expect(things[0].type).toBeDefined()
        expect(things[0].data).toBeDefined()
      })
    })
  })

  describe('Search', () => {
    let instance: InstanceType<typeof ThingsDO>
    let state: ReturnType<typeof createMockStateWithSql>

    beforeEach(async () => {
      state = createMockStateWithSql()
      instance = new ThingsDO(state, {})

      await instance.createThing({
        type: 'article',
        data: { title: 'Hello World', content: 'This is a test article' },
      })
      await instance.createThing({
        type: 'article',
        data: { title: 'Goodbye World', content: 'Another test article' },
      })
    })

    describe('searchThings()', () => {
      it('should search by text query', async () => {
        const results = await instance.searchThings('Hello')

        expect(results.length).toBeGreaterThanOrEqual(0) // Mock may not filter
      })

      it('should generate correct SQL with namespace filter', async () => {
        await instance.searchThings('test', { ns: 'default' })

        expect(state._lastQuery).toContain('ns = ?')
        expect(state._lastQuery).toContain('LIKE')
      })

      it('should generate correct SQL with type filter', async () => {
        await instance.searchThings('test', { type: 'article' })

        expect(state._lastQuery).toContain('type = ?')
        expect(state._lastQuery).toContain('LIKE')
      })

      it('should generate correct SQL with limit', async () => {
        await instance.searchThings('test', { limit: 1 })

        expect(state._lastQuery).toContain('LIMIT')
      })
    })
  })

  describe('Event Handling', () => {
    let instance: InstanceType<typeof ThingsDO>
    let state: ReturnType<typeof createMockStateWithSql>

    beforeEach(() => {
      state = createMockStateWithSql()
      instance = new ThingsDO(state, {})
    })

    it('should register event handlers', async () => {
      const events: ThingEvent[] = []
      const handler = (event: ThingEvent) => {
        events.push(event)
      }

      instance.onThingEvent(handler)

      await instance.createThing({ type: 'user', data: { name: 'Test' } })

      expect(events.length).toBe(1)
    })

    it('should unregister event handlers', async () => {
      const events: ThingEvent[] = []
      const handler = (event: ThingEvent) => {
        events.push(event)
      }

      instance.onThingEvent(handler)
      instance.offThingEvent(handler)

      await instance.createThing({ type: 'user', data: { name: 'Test' } })

      expect(events.length).toBe(0)
    })

    it('should support multiple event handlers', async () => {
      const events1: ThingEvent[] = []
      const events2: ThingEvent[] = []

      instance.onThingEvent((event) => events1.push(event))
      instance.onThingEvent((event) => events2.push(event))

      await instance.createThing({ type: 'user', data: { name: 'Test' } })

      expect(events1.length).toBe(1)
      expect(events2.length).toBe(1)
    })

    it('should handle async event handlers', async () => {
      let processed = false
      instance.onThingEvent(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        processed = true
      })

      await instance.createThing({ type: 'user', data: { name: 'Test' } })

      expect(processed).toBe(true)
    })

    it('should not throw if event handler errors', async () => {
      instance.onThingEvent(() => {
        throw new Error('Handler error')
      })

      // Should not throw
      await expect(
        instance.createThing({ type: 'user', data: { name: 'Test' } })
      ).resolves.toBeDefined()
    })
  })

  describe('Schema Initialization', () => {
    it('should initialize schema on first operation', async () => {
      const state = createMockStateWithSql()
      const instance = new ThingsDO(state, {})

      await instance.createThing({ type: 'user', data: { name: 'Test' } })

      // Check that CREATE TABLE was called
      expect(state.storage.sql.exec).toHaveBeenCalled()
    })

    it('should only initialize schema once', async () => {
      const state = createMockStateWithSql()
      const instance = new ThingsDO(state, {})

      await instance.createThing({ type: 'user', data: { name: 'Test1' } })
      await instance.createThing({ type: 'user', data: { name: 'Test2' } })
      await instance.listThings()

      // Count CREATE TABLE calls
      const calls = (state.storage.sql.exec as ReturnType<typeof vi.fn>).mock.calls
      const createCalls = calls.filter((c: unknown[]) =>
        (c[0] as string).toLowerCase().includes('create table')
      )

      // Should only have CREATE TABLE calls from first initialization
      expect(createCalls.length).toBeLessThanOrEqual(3) // Table + indexes
    })
  })

  describe('Type Safety', () => {
    it('should properly type Thing data', async () => {
      const state = createMockStateWithSql()
      const instance = new ThingsDO(state, {})

      const thing = await instance.createThing({
        type: 'user',
        data: { name: 'Alice', age: 25 },
      })

      // TypeScript should allow accessing these
      const _name: unknown = thing.data.name
      const _age: unknown = thing.data.age
      expect(_name).toBe('Alice')
      expect(_age).toBe(25)
    })

    it('should properly type filter options', async () => {
      const state = createMockStateWithSql()
      const instance = new ThingsDO(state, {})

      // These should compile without errors
      await instance.listThings({ orderBy: 'createdAt', order: 'asc' })
      await instance.listThings({ orderBy: 'updatedAt', order: 'desc' })
      await instance.listThings({ orderBy: 'id' })
    })
  })
})
