/**
 * Event Store Tests - GREEN Phase
 *
 * Tests verifying the EventStore implementation for event sourcing foundation.
 *
 * The Event Store provides:
 * - Stream-based event storage with monotonic versioning
 * - Causation and correlation tracking for distributed systems
 * - JSON serialization/deserialization
 * - Optimistic concurrency control via version enforcement
 *
 * @module event-store.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { SqlStorage, SqlStorageCursor } from '../src/index.js'
import {
  EventStore,
  ConcurrencyError,
  EVENT_STORE_SCHEMA_SQL,
  type StreamDomainEvent,
  type AppendEventInput,
  type ReadStreamOptions,
  type AppendResult,
  type EventMetadata,
} from '../src/event-store.js'

// ============================================================================
// Test SQL Storage Implementation
// ============================================================================

interface StoredEvent {
  id: string
  stream_id: string
  type: string
  version: number
  timestamp: number
  payload: string
  metadata: string | null
}

/**
 * Create a functional mock SQL storage for testing
 * This mock simulates SQLite behavior including:
 * - INSERT/SELECT/UPDATE/DELETE operations
 * - Schema creation (CREATE TABLE/INDEX)
 * - Aggregate functions (MAX, COUNT)
 */
function createMockSqlStorage(): SqlStorage & {
  _events: StoredEvent[]
  _queries: Array<{ sql: string; params: unknown[] }>
} {
  const events: StoredEvent[] = []
  const queries: Array<{ sql: string; params: unknown[] }> = []

  const createCursor = <T>(data: T[], rowsWritten = 0): SqlStorageCursor<T> => ({
    columnNames: data.length > 0 ? Object.keys(data[0] as object) : [],
    rowsRead: data.length,
    rowsWritten,
    toArray: () => [...data],
    one: () => data[0] ?? null,
    raw: function* <R extends unknown[] = unknown[]>(): IterableIterator<R> {
      for (const row of data) {
        yield Object.values(row as object) as R
      }
    },
    [Symbol.iterator]: function* () {
      for (const row of data) {
        yield row
      }
    },
  })

  return {
    _events: events,
    _queries: queries,
    exec: vi.fn(<T = Record<string, unknown>>(query: string, ...params: unknown[]) => {
      queries.push({ sql: query, params })
      const normalizedQuery = query.toLowerCase().trim()

      // Handle CREATE TABLE/INDEX (schema initialization)
      if (normalizedQuery.startsWith('create') || normalizedQuery.includes('create table') || normalizedQuery.includes('create index')) {
        return createCursor<T>([], 0)
      }

      // Handle INSERT
      if (normalizedQuery.includes('insert into events')) {
        const [id, stream_id, type, version, timestamp, payload, metadata] = params as [
          string,
          string,
          string,
          number,
          number,
          string,
          string | null
        ]
        events.push({ id, stream_id, type, version, timestamp, payload, metadata })
        return createCursor<T>([], 1)
      }

      // Handle SELECT MAX(version)
      if (normalizedQuery.includes('max(version)')) {
        const streamId = params[0] as string
        const streamEvents = events.filter((e) => e.stream_id === streamId)
        const maxVersion = streamEvents.length > 0 ? Math.max(...streamEvents.map((e) => e.version)) : null
        return createCursor<T>([{ max_version: maxVersion } as T], 0)
      }

      // Handle SELECT COUNT(*)
      if (normalizedQuery.includes('count(*)')) {
        const streamId = params[0] as string
        const count = events.filter((e) => e.stream_id === streamId).length
        return createCursor<T>([{ count } as T], 0)
      }

      // Handle SELECT for readStream
      if (normalizedQuery.includes('select') && normalizedQuery.includes('from events')) {
        const streamId = params[0] as string
        let streamEvents = events.filter((e) => e.stream_id === streamId)

        // Check for version filters in the query
        let paramIndex = 1
        if (normalizedQuery.includes('version >=')) {
          const fromVersion = params[paramIndex] as number
          streamEvents = streamEvents.filter((e) => e.version >= fromVersion)
          paramIndex++
        }
        if (normalizedQuery.includes('version <=')) {
          const toVersion = params[paramIndex] as number
          streamEvents = streamEvents.filter((e) => e.version <= toVersion)
          paramIndex++
        }

        // Sort by version
        const isReverse = normalizedQuery.includes('desc')
        streamEvents.sort((a, b) => (isReverse ? b.version - a.version : a.version - b.version))

        // Apply limit
        if (normalizedQuery.includes('limit')) {
          const limitParam = params[paramIndex] as number
          streamEvents = streamEvents.slice(0, limitParam)
        }

        return createCursor<T>(streamEvents as T[], 0)
      }

      return createCursor<T>([], 0)
    }),
  }
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Generate a unique event ID
 */
function generateEventId(): string {
  return crypto.randomUUID()
}

/**
 * Create a test event
 */
function createTestEvent<T>(
  streamId: string,
  type: string,
  payload: T,
  version: number = 1,
  metadata?: EventMetadata
): StreamDomainEvent<T> {
  return {
    id: generateEventId(),
    streamId,
    type,
    version,
    timestamp: Date.now(),
    payload,
    metadata,
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('DomainEvent', () => {
  describe('Required Fields', () => {
    it('should have required fields: id, streamId, type, version, timestamp, payload', () => {
      const event: StreamDomainEvent<{ name: string }> = {
        id: 'evt-123',
        streamId: 'order-456',
        type: 'OrderCreated',
        version: 1,
        timestamp: Date.now(),
        payload: { name: 'Test Order' },
      }

      expect(event.id).toBe('evt-123')
      expect(event.streamId).toBe('order-456')
      expect(event.type).toBe('OrderCreated')
      expect(event.version).toBe(1)
      expect(event.timestamp).toBeGreaterThan(0)
      expect(event.payload).toEqual({ name: 'Test Order' })
    })

    it('should have optional metadata: causationId, correlationId, userId', () => {
      const event: StreamDomainEvent<{ amount: number }> = {
        id: 'evt-789',
        streamId: 'payment-001',
        type: 'PaymentProcessed',
        version: 3,
        timestamp: Date.now(),
        payload: { amount: 100 },
        metadata: {
          causationId: 'evt-456',
          correlationId: 'req-abc-123',
          userId: 'user-007',
        },
      }

      expect(event.metadata?.causationId).toBe('evt-456')
      expect(event.metadata?.correlationId).toBe('req-abc-123')
      expect(event.metadata?.userId).toBe('user-007')
    })

    it('should allow custom metadata fields', () => {
      const event: StreamDomainEvent<{ item: string }> = {
        id: 'evt-custom',
        streamId: 'inventory-123',
        type: 'ItemAdded',
        version: 1,
        timestamp: Date.now(),
        payload: { item: 'Widget' },
        metadata: {
          causationId: 'cmd-001',
          customField: 'custom-value',
          numericMeta: 42,
          nestedMeta: { deep: true },
        },
      }

      expect(event.metadata?.customField).toBe('custom-value')
      expect(event.metadata?.numericMeta).toBe(42)
      expect(event.metadata?.nestedMeta).toEqual({ deep: true })
    })
  })

  describe('JSON Serialization', () => {
    it('should serialize to JSON correctly', () => {
      const event: StreamDomainEvent<{ orderId: string; items: string[] }> = {
        id: 'evt-serialize-001',
        streamId: 'order-serialize-001',
        type: 'OrderCreated',
        version: 1,
        timestamp: 1704067200000, // 2024-01-01T00:00:00Z
        payload: { orderId: 'ORD-001', items: ['item1', 'item2'] },
        metadata: {
          correlationId: 'corr-001',
          userId: 'user-001',
        },
      }

      const json = JSON.stringify(event)
      const parsed = JSON.parse(json)

      expect(parsed).toEqual(event)
      expect(typeof json).toBe('string')
      expect(json).toContain('"id":"evt-serialize-001"')
      expect(json).toContain('"streamId":"order-serialize-001"')
      expect(json).toContain('"type":"OrderCreated"')
      expect(json).toContain('"version":1')
      expect(json).toContain('"timestamp":1704067200000')
    })

    it('should deserialize from JSON correctly', () => {
      const json = `{
        "id": "evt-deserialize-001",
        "streamId": "order-deserialize-001",
        "type": "ItemAdded",
        "version": 2,
        "timestamp": 1704067200000,
        "payload": { "itemId": "ITEM-001", "quantity": 5 },
        "metadata": { "causationId": "evt-001" }
      }`

      const event = JSON.parse(json) as StreamDomainEvent<{ itemId: string; quantity: number }>

      expect(event.id).toBe('evt-deserialize-001')
      expect(event.streamId).toBe('order-deserialize-001')
      expect(event.type).toBe('ItemAdded')
      expect(event.version).toBe(2)
      expect(event.timestamp).toBe(1704067200000)
      expect(event.payload.itemId).toBe('ITEM-001')
      expect(event.payload.quantity).toBe(5)
      expect(event.metadata?.causationId).toBe('evt-001')
    })

    it('should handle events without metadata', () => {
      const event: StreamDomainEvent<{ status: string }> = {
        id: 'evt-no-meta',
        streamId: 'status-001',
        type: 'StatusChanged',
        version: 1,
        timestamp: Date.now(),
        payload: { status: 'active' },
      }

      const json = JSON.stringify(event)
      const parsed = JSON.parse(json) as StreamDomainEvent<{ status: string }>

      expect(parsed.metadata).toBeUndefined()
      expect(parsed.payload.status).toBe('active')
    })

    it('should handle complex nested payloads', () => {
      interface ComplexPayload {
        customer: {
          id: string
          name: string
          address: {
            street: string
            city: string
          }
        }
        items: Array<{ sku: string; price: number }>
      }

      const event: StreamDomainEvent<ComplexPayload> = {
        id: 'evt-complex',
        streamId: 'order-complex',
        type: 'OrderPlaced',
        version: 1,
        timestamp: Date.now(),
        payload: {
          customer: {
            id: 'cust-001',
            name: 'Alice',
            address: {
              street: '123 Main St',
              city: 'Springfield',
            },
          },
          items: [
            { sku: 'SKU-001', price: 19.99 },
            { sku: 'SKU-002', price: 29.99 },
          ],
        },
      }

      const json = JSON.stringify(event)
      const parsed = JSON.parse(json) as StreamDomainEvent<ComplexPayload>

      expect(parsed.payload.customer.address.city).toBe('Springfield')
      expect(parsed.payload.items).toHaveLength(2)
      expect(parsed.payload.items[1]?.price).toBe(29.99)
    })
  })

  describe('ID Generation', () => {
    it('should generate unique IDs', () => {
      const ids = new Set<string>()
      const iterations = 1000

      for (let i = 0; i < iterations; i++) {
        ids.add(generateEventId())
      }

      expect(ids.size).toBe(iterations)
    })

    it('should generate valid UUID format', () => {
      const id = generateEventId()
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

      expect(id).toMatch(uuidRegex)
    })
  })

  describe('Version Enforcement', () => {
    it('should enforce monotonic version within stream', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      // First event should succeed with expectedVersion 0
      const result = await store.append({
        streamId: 'order-001',
        type: 'OrderCreated',
        payload: { name: 'Test' },
        expectedVersion: 0,
      })

      expect(result.event.version).toBe(1)
      expect(result.currentVersion).toBe(1)
    })

    it('should start version at 1 for new streams', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      const result = await store.append({
        streamId: 'new-stream',
        type: 'StreamStarted',
        payload: {},
      })

      expect(result.event.version).toBe(1)
    })

    it('should reject append with wrong expected version (optimistic concurrency)', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      // Stream doesn't exist (version 0), but we expect version 5
      await expect(
        store.append({
          streamId: 'order-001',
          type: 'OrderUpdated',
          payload: {},
          expectedVersion: 5, // Wrong version - stream is at version 0
        })
      ).rejects.toThrow(ConcurrencyError)
    })

    it('should increment version for each event in stream', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      const stream = 'order-increment'

      const result1 = await store.append({ streamId: stream, type: 'Event1', payload: {} })
      const result2 = await store.append({ streamId: stream, type: 'Event2', payload: {}, expectedVersion: 1 })
      const result3 = await store.append({ streamId: stream, type: 'Event3', payload: {}, expectedVersion: 2 })

      expect(result1.event.version).toBe(1)
      expect(result2.event.version).toBe(2)
      expect(result3.event.version).toBe(3)
    })
  })
})

describe('EventStore', () => {
  describe('Constructor', () => {
    it('should create EventStore instance without throwing', () => {
      const sql = createMockSqlStorage()

      expect(() => new EventStore(sql)).not.toThrow()
    })
  })

  describe('append()', () => {
    it('should append event to a stream', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      const result = await store.append({
        streamId: 'test-stream',
        type: 'TestEvent',
        payload: { test: true },
      })

      expect(result.event.streamId).toBe('test-stream')
      expect(result.event.type).toBe('TestEvent')
      expect(result.event.payload).toEqual({ test: true })
      expect(result.event.version).toBe(1)
    })

    it('should generate unique ID for event', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      const result = await store.append({
        streamId: 'test-stream',
        type: 'TestEvent',
        payload: {},
      })

      expect(result.event.id).toBeDefined()
      expect(typeof result.event.id).toBe('string')
      expect(result.event.id.length).toBeGreaterThan(0)
    })

    it('should record timestamp when appending', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      const before = Date.now()
      const result = await store.append({
        streamId: 'test-stream',
        type: 'TestEvent',
        payload: {},
      })
      const after = Date.now()

      expect(result.event.timestamp).toBeGreaterThanOrEqual(before)
      expect(result.event.timestamp).toBeLessThanOrEqual(after)
    })

    it('should include metadata in appended event', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      const result = await store.append({
        streamId: 'test-stream',
        type: 'TestEvent',
        payload: {},
        metadata: {
          causationId: 'cause-001',
          correlationId: 'corr-001',
          userId: 'user-001',
        },
      })

      expect(result.event.metadata?.causationId).toBe('cause-001')
      expect(result.event.metadata?.correlationId).toBe('corr-001')
      expect(result.event.metadata?.userId).toBe('user-001')
    })

    it('should throw ConcurrencyError when expectedVersion does not match', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      // First, add an event
      await store.append({
        streamId: 'test-stream',
        type: 'Event1',
        payload: {},
      })

      // Now try to add with wrong expected version
      await expect(
        store.append({
          streamId: 'test-stream',
          type: 'Event2',
          payload: {},
          expectedVersion: 5, // Wrong - actual is 1
        })
      ).rejects.toThrow(ConcurrencyError)
    })
  })

  describe('readStream()', () => {
    it('should return empty array for non-existent stream', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      const events = await store.readStream('non-existent')

      expect(events).toEqual([])
    })

    it('should return events in version order', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      // Add multiple events
      await store.append({ streamId: 'test-stream', type: 'Event1', payload: { seq: 1 } })
      await store.append({ streamId: 'test-stream', type: 'Event2', payload: { seq: 2 }, expectedVersion: 1 })
      await store.append({ streamId: 'test-stream', type: 'Event3', payload: { seq: 3 }, expectedVersion: 2 })

      const events = await store.readStream('test-stream')

      expect(events).toHaveLength(3)
      expect(events[0]?.version).toBe(1)
      expect(events[1]?.version).toBe(2)
      expect(events[2]?.version).toBe(3)

      for (let i = 1; i < events.length; i++) {
        const prev = events[i - 1]
        const curr = events[i]
        if (prev && curr) {
          expect(curr.version).toBeGreaterThan(prev.version)
        }
      }
    })

    it('should respect fromVersion option', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      // Add multiple events
      for (let i = 0; i < 5; i++) {
        await store.append({
          streamId: 'test-stream',
          type: `Event${i + 1}`,
          payload: { seq: i + 1 },
          expectedVersion: i,
        })
      }

      const events = await store.readStream('test-stream', { fromVersion: 3 })

      expect(events.length).toBe(3)
      for (const event of events) {
        expect(event.version).toBeGreaterThanOrEqual(3)
      }
    })

    it('should respect toVersion option', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      // Add multiple events
      for (let i = 0; i < 5; i++) {
        await store.append({
          streamId: 'test-stream',
          type: `Event${i + 1}`,
          payload: { seq: i + 1 },
          expectedVersion: i,
        })
      }

      const events = await store.readStream('test-stream', { toVersion: 3 })

      expect(events.length).toBe(3)
      for (const event of events) {
        expect(event.version).toBeLessThanOrEqual(3)
      }
    })

    it('should respect limit option', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      // Add multiple events
      for (let i = 0; i < 10; i++) {
        await store.append({
          streamId: 'test-stream',
          type: `Event${i + 1}`,
          payload: { seq: i + 1 },
          expectedVersion: i,
        })
      }

      const events = await store.readStream('test-stream', { limit: 5 })

      expect(events.length).toBeLessThanOrEqual(5)
    })

    it('should support reverse order', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      // Add multiple events
      await store.append({ streamId: 'test-stream', type: 'Event1', payload: {} })
      await store.append({ streamId: 'test-stream', type: 'Event2', payload: {}, expectedVersion: 1 })
      await store.append({ streamId: 'test-stream', type: 'Event3', payload: {}, expectedVersion: 2 })

      const events = await store.readStream('test-stream', { reverse: true })

      expect(events).toHaveLength(3)
      for (let i = 1; i < events.length; i++) {
        const prev = events[i - 1]
        const curr = events[i]
        if (prev && curr) {
          expect(curr.version).toBeLessThan(prev.version)
        }
      }
    })

    it('should deserialize payload correctly', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      const payload = { name: 'Test', items: ['a', 'b', 'c'], nested: { value: 42 } }
      await store.append({ streamId: 'test-stream', type: 'TestEvent', payload })

      const events = await store.readStream('test-stream')

      expect(events[0]?.payload).toEqual(payload)
    })

    it('should deserialize metadata correctly', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      const metadata = { causationId: 'cause-1', correlationId: 'corr-1', custom: 'value' }
      await store.append({ streamId: 'test-stream', type: 'TestEvent', payload: {}, metadata })

      const events = await store.readStream('test-stream')

      expect(events[0]?.metadata).toEqual(metadata)
    })
  })

  describe('getStreamVersion()', () => {
    it('should return 0 for non-existent stream', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      const version = await store.getStreamVersion('non-existent')

      expect(version).toBe(0)
    })

    it('should return correct version after appending events', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      await store.append({ streamId: 'test-stream', type: 'Event1', payload: {} })
      await store.append({ streamId: 'test-stream', type: 'Event2', payload: {}, expectedVersion: 1 })
      await store.append({ streamId: 'test-stream', type: 'Event3', payload: {}, expectedVersion: 2 })

      const version = await store.getStreamVersion('test-stream')

      expect(version).toBe(3)
    })
  })

  describe('streamExists()', () => {
    it('should return false for non-existent stream', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      const exists = await store.streamExists('non-existent')

      expect(exists).toBe(false)
    })

    it('should return true for existing stream', async () => {
      const sql = createMockSqlStorage()
      const store = new EventStore(sql)

      await store.append({
        streamId: 'existing-stream',
        type: 'StreamCreated',
        payload: {},
      })

      const exists = await store.streamExists('existing-stream')

      expect(exists).toBe(true)
    })
  })
})

describe('ConcurrencyError', () => {
  it('should create error with correct properties', () => {
    const error = new ConcurrencyError('order-123', 5, 7)

    expect(error.name).toBe('ConcurrencyError')
    expect(error.streamId).toBe('order-123')
    expect(error.expectedVersion).toBe(5)
    expect(error.actualVersion).toBe(7)
    expect(error.message).toContain('order-123')
    expect(error.message).toContain('expected version 5')
    expect(error.message).toContain('actual version is 7')
  })

  it('should be instance of Error', () => {
    const error = new ConcurrencyError('test', 1, 2)

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(ConcurrencyError)
  })
})

describe('EVENT_STORE_SCHEMA_SQL', () => {
  it('should define events table with required columns', () => {
    expect(EVENT_STORE_SCHEMA_SQL).toContain('CREATE TABLE')
    expect(EVENT_STORE_SCHEMA_SQL).toContain('events')
    expect(EVENT_STORE_SCHEMA_SQL).toContain('id TEXT PRIMARY KEY')
    expect(EVENT_STORE_SCHEMA_SQL).toContain('stream_id TEXT NOT NULL')
    expect(EVENT_STORE_SCHEMA_SQL).toContain('type TEXT NOT NULL')
    expect(EVENT_STORE_SCHEMA_SQL).toContain('version INTEGER NOT NULL')
    expect(EVENT_STORE_SCHEMA_SQL).toContain('timestamp INTEGER NOT NULL')
    expect(EVENT_STORE_SCHEMA_SQL).toContain('payload TEXT NOT NULL')
    expect(EVENT_STORE_SCHEMA_SQL).toContain('metadata TEXT')
  })

  it('should define unique constraint on (stream_id, version)', () => {
    expect(EVENT_STORE_SCHEMA_SQL).toContain('UNIQUE(stream_id, version)')
  })

  it('should create stream index for efficient queries', () => {
    expect(EVENT_STORE_SCHEMA_SQL).toContain('CREATE INDEX')
    expect(EVENT_STORE_SCHEMA_SQL).toContain('idx_events_stream')
    expect(EVENT_STORE_SCHEMA_SQL).toContain('stream_id, version')
  })

  it('should create timestamp index for time-based queries', () => {
    expect(EVENT_STORE_SCHEMA_SQL).toContain('idx_events_timestamp')
    expect(EVENT_STORE_SCHEMA_SQL).toContain('timestamp')
  })

  it('should create type index for event type queries', () => {
    expect(EVENT_STORE_SCHEMA_SQL).toContain('idx_events_type')
  })
})
