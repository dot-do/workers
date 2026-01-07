/**
 * EventMixin Tests (RED phase - TDD)
 *
 * Tests for the EventMixin that adds event sourcing capabilities to Durable Objects.
 * Following the mixin pattern established by ThingsMixin.
 *
 * Key concepts:
 * - EventMixin wraps a DO to add appendEvent() and getEvents() methods
 * - Events are appended with monotonically increasing version numbers
 * - Integrates with EventStore repository for persistence
 * - Optionally emits to Cloudflare Streams for dual-write pattern
 *
 * @module event-mixin.test
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DOCore, type DOState, type DOEnv } from '../src/index.js'
import { createMockState, createMockSqlCursor } from './helpers.js'

// ============================================================================
// Import the mixin - THIS WILL FAIL until implementation exists
// ============================================================================

// This import will cause tests to fail in RED phase - implementation doesn't exist yet
import {
  applyEventMixin,
  type StoredEvent,
  type AppendEventInput,
  type GetEventsOptions,
  type EventMixinConfig,
  type IEventMixin,
  VersionConflictError,
} from '../src/event-mixin.js'

// ============================================================================
// Test Helper: Create mock state with SQL support for events
// ============================================================================

interface MockStoredEvent<T = unknown> {
  id: string
  streamId: string
  type: string
  data: T
  version: number
  timestamp: number
  metadata?: Record<string, unknown>
}

function createMockStateWithEventSql(): DOState & {
  _eventData: Map<string, MockStoredEvent[]>
  _lastQuery: string
  _lastParams: unknown[]
} {
  const eventData = new Map<string, MockStoredEvent[]>()
  let lastQuery = ''
  let lastParams: unknown[] = []

  const mockState = createMockState()

  const sqlStorage = {
    exec: vi.fn(<T = Record<string, unknown>>(query: string, ...params: unknown[]) => {
      lastQuery = query
      lastParams = params

      const normalizedQuery = query.toLowerCase().trim()

      // Handle CREATE TABLE/INDEX (schema initialization)
      if (normalizedQuery.startsWith('create')) {
        return createMockSqlCursor<T>([])
      }

      // Handle INSERT for events
      if (normalizedQuery.startsWith('insert') && normalizedQuery.includes('events')) {
        const [id, streamId, type, data, version, timestamp, metadata] = params
        const events = eventData.get(streamId as string) ?? []
        const event: MockStoredEvent = {
          id: id as string,
          streamId: streamId as string,
          type: type as string,
          data: JSON.parse(data as string),
          version: version as number,
          timestamp: timestamp as number,
          metadata: metadata ? JSON.parse(metadata as string) : undefined,
        }
        events.push(event)
        eventData.set(streamId as string, events)
        return { rowsWritten: 1, toArray: () => [] }
      }

      // Handle SELECT for events by stream ID
      if (normalizedQuery.startsWith('select') && normalizedQuery.includes('from events')) {
        const streamId = params[0] as string
        const events = eventData.get(streamId) ?? []

        // Check for version filter
        let filteredEvents = events
        if (normalizedQuery.includes('version >')) {
          const afterVersion = params[1] as number
          filteredEvents = events.filter((e) => e.version > afterVersion)
        }

        // Check for type filter
        if (normalizedQuery.includes('type = ?')) {
          const typeIdx = normalizedQuery.includes('version >') ? 2 : 1
          const eventType = params[typeIdx] as string
          filteredEvents = filteredEvents.filter((e) => e.type === eventType)
        }

        return createMockSqlCursor<T>(
          filteredEvents.map(
            (e) =>
              ({
                id: e.id,
                stream_id: e.streamId,
                type: e.type,
                data: JSON.stringify(e.data),
                version: e.version,
                timestamp: e.timestamp,
                metadata: e.metadata ? JSON.stringify(e.metadata) : null,
              }) as T
          )
        )
      }

      // Handle SELECT MAX(version) for latest version
      if (normalizedQuery.includes('max(version)')) {
        const streamId = params[0] as string
        const events = eventData.get(streamId) ?? []
        const maxVersion = events.length > 0 ? Math.max(...events.map((e) => e.version)) : 0
        return createMockSqlCursor<T>([{ max_version: maxVersion } as T])
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
    _eventData: eventData,
    get _lastQuery() {
      return lastQuery
    },
    get _lastParams() {
      return lastParams
    },
  }
}

// ============================================================================
// Tests
// ============================================================================

describe('EventMixin', () => {
  describe('Mixin Application', () => {
    it('should create a class with event sourcing methods', () => {
      // This test verifies the mixin pattern creates the expected methods
      const EventDO = applyEventMixin(DOCore)

      expect(EventDO).toBeDefined()
      expect(EventDO.prototype.appendEvent).toBeDefined()
      expect(EventDO.prototype.getEvents).toBeDefined()
      expect(EventDO.prototype.getLatestVersion).toBeDefined()
    })

    it('should extend DOCore', () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore)
      const instance = new EventDO(state, {})

      expect(instance).toBeInstanceOf(DOCore)
    })
  })

  describe('appendEvent()', () => {
    it('should append events to the event store', async () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore)
      const instance = new EventDO(state, {})

      const event = await instance.appendEvent({
        streamId: 'order-123',
        type: 'order.created',
        data: { customerId: 'cust-456', items: [] },
      })

      expect(event).toBeDefined()
      expect(event.id).toBeDefined()
      expect(event.streamId).toBe('order-123')
      expect(event.type).toBe('order.created')
      expect(event.version).toBe(1)
      expect(event.timestamp).toBeGreaterThan(0)
    })

    it('should auto-increment version numbers within a stream', async () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore)
      const instance = new EventDO(state, {})

      const event1 = await instance.appendEvent({
        streamId: 'order-123',
        type: 'order.created',
        data: { customerId: 'cust-456' },
      })
      const event2 = await instance.appendEvent({
        streamId: 'order-123',
        type: 'item.added',
        data: { itemId: 'item-1', quantity: 2 },
      })
      const event3 = await instance.appendEvent({
        streamId: 'order-123',
        type: 'item.added',
        data: { itemId: 'item-2', quantity: 1 },
      })

      expect(event1.version).toBe(1)
      expect(event2.version).toBe(2)
      expect(event3.version).toBe(3)
    })

    it('should maintain separate version sequences per stream', async () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore)
      const instance = new EventDO(state, {})

      const orderEvent = await instance.appendEvent({
        streamId: 'order-123',
        type: 'order.created',
        data: {},
      })
      const cartEvent = await instance.appendEvent({
        streamId: 'cart-456',
        type: 'cart.created',
        data: {},
      })

      expect(orderEvent.version).toBe(1)
      expect(cartEvent.version).toBe(1) // Independent sequence
    })

    it('should include metadata when provided', async () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore)
      const instance = new EventDO(state, {})

      const event = await instance.appendEvent({
        streamId: 'order-123',
        type: 'order.created',
        data: { customerId: 'cust-456' },
        metadata: {
          correlationId: 'req-789',
          userId: 'user-012',
          source: 'api',
        },
      })

      expect(event.metadata).toEqual({
        correlationId: 'req-789',
        userId: 'user-012',
        source: 'api',
      })
    })
  })

  describe('getEvents()', () => {
    it('should retrieve events by stream ID', async () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore)
      const instance = new EventDO(state, {})

      await instance.appendEvent({
        streamId: 'order-123',
        type: 'order.created',
        data: { customerId: 'cust-456' },
      })
      await instance.appendEvent({
        streamId: 'order-123',
        type: 'item.added',
        data: { itemId: 'item-1' },
      })
      await instance.appendEvent({
        streamId: 'order-456', // Different stream
        type: 'order.created',
        data: { customerId: 'cust-789' },
      })

      const events = await instance.getEvents('order-123')

      expect(events).toHaveLength(2)
      expect(events[0].type).toBe('order.created')
      expect(events[1].type).toBe('item.added')
    })

    it('should return events in version order', async () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore)
      const instance = new EventDO(state, {})

      await instance.appendEvent({ streamId: 'stream-1', type: 'event.a', data: {} })
      await instance.appendEvent({ streamId: 'stream-1', type: 'event.b', data: {} })
      await instance.appendEvent({ streamId: 'stream-1', type: 'event.c', data: {} })

      const events = await instance.getEvents('stream-1')

      expect(events[0].version).toBe(1)
      expect(events[1].version).toBe(2)
      expect(events[2].version).toBe(3)
    })

    it('should return empty array for non-existent stream', async () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore)
      const instance = new EventDO(state, {})

      const events = await instance.getEvents('non-existent-stream')

      expect(events).toEqual([])
    })
  })

  describe('Version Ordering', () => {
    it('should enforce version ordering', async () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore)
      const instance = new EventDO(state, {})

      const e1 = await instance.appendEvent({ streamId: 's1', type: 'e1', data: {} })
      const e2 = await instance.appendEvent({ streamId: 's1', type: 'e2', data: {} })
      const e3 = await instance.appendEvent({ streamId: 's1', type: 'e3', data: {} })

      expect(e1.version).toBeLessThan(e2.version)
      expect(e2.version).toBeLessThan(e3.version)

      const events = await instance.getEvents('s1')
      for (let i = 1; i < events.length; i++) {
        expect(events[i].version).toBeGreaterThan(events[i - 1].version)
      }
    })

    it('should get latest version for a stream', async () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore)
      const instance = new EventDO(state, {})

      expect(await instance.getLatestVersion('stream-1')).toBe(0)

      await instance.appendEvent({ streamId: 'stream-1', type: 'e1', data: {} })
      expect(await instance.getLatestVersion('stream-1')).toBe(1)

      await instance.appendEvent({ streamId: 'stream-1', type: 'e2', data: {} })
      await instance.appendEvent({ streamId: 'stream-1', type: 'e3', data: {} })
      expect(await instance.getLatestVersion('stream-1')).toBe(3)
    })
  })

  describe('Event Type Filtering', () => {
    it('should support event type filtering', async () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore)
      const instance = new EventDO(state, {})

      await instance.appendEvent({ streamId: 'order-1', type: 'order.created', data: {} })
      await instance.appendEvent({
        streamId: 'order-1',
        type: 'item.added',
        data: { itemId: '1' },
      })
      await instance.appendEvent({
        streamId: 'order-1',
        type: 'item.added',
        data: { itemId: '2' },
      })
      await instance.appendEvent({ streamId: 'order-1', type: 'order.submitted', data: {} })

      const itemEvents = await instance.getEvents('order-1', { type: 'item.added' })

      expect(itemEvents).toHaveLength(2)
      expect(itemEvents[0].data).toEqual({ itemId: '1' })
      expect(itemEvents[1].data).toEqual({ itemId: '2' })
    })

    it('should filter events after a specific version', async () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore)
      const instance = new EventDO(state, {})

      await instance.appendEvent({ streamId: 'stream-1', type: 'e1', data: { n: 1 } })
      await instance.appendEvent({ streamId: 'stream-1', type: 'e2', data: { n: 2 } })
      await instance.appendEvent({ streamId: 'stream-1', type: 'e3', data: { n: 3 } })
      await instance.appendEvent({ streamId: 'stream-1', type: 'e4', data: { n: 4 } })

      const events = await instance.getEvents('stream-1', { afterVersion: 2 })

      expect(events).toHaveLength(2)
      expect(events[0].version).toBe(3)
      expect(events[1].version).toBe(4)
    })

    it('should limit number of events returned', async () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore)
      const instance = new EventDO(state, {})

      for (let i = 0; i < 10; i++) {
        await instance.appendEvent({
          streamId: 'stream-1',
          type: 'event',
          data: { index: i },
        })
      }

      const events = await instance.getEvents('stream-1', { limit: 5 })

      expect(events).toHaveLength(5)
      expect(events[0].data).toEqual({ index: 0 })
      expect(events[4].data).toEqual({ index: 4 })
    })

    it('should combine multiple filter options', async () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore)
      const instance = new EventDO(state, {})

      await instance.appendEvent({ streamId: 's1', type: 'type.a', data: { n: 1 } })
      await instance.appendEvent({ streamId: 's1', type: 'type.b', data: { n: 2 } })
      await instance.appendEvent({ streamId: 's1', type: 'type.a', data: { n: 3 } })
      await instance.appendEvent({ streamId: 's1', type: 'type.a', data: { n: 4 } })
      await instance.appendEvent({ streamId: 's1', type: 'type.b', data: { n: 5 } })

      const events = await instance.getEvents('s1', {
        type: 'type.a',
        afterVersion: 1,
        limit: 1,
      })

      expect(events).toHaveLength(1)
      expect(events[0].data).toEqual({ n: 3 })
    })
  })

  describe('Stream Binding (Dual-Write Pattern)', () => {
    it('should emit events to stream binding when configured', async () => {
      const state = createMockStateWithEventSql()
      const mockStreamBinding = {
        send: vi.fn().mockResolvedValue(undefined),
      }
      const env = { EVENT_STREAM: mockStreamBinding }

      const EventDO = applyEventMixin(DOCore, { streamBinding: 'EVENT_STREAM' })
      const instance = new EventDO(state, env)

      await instance.appendEvent({
        streamId: 'order-123',
        type: 'order.created',
        data: { customerId: 'cust-456' },
      })

      expect(mockStreamBinding.send).toHaveBeenCalledTimes(1)
      const sentEvent = mockStreamBinding.send.mock.calls[0][0]
      expect(sentEvent.streamId).toBe('order-123')
      expect(sentEvent.type).toBe('order.created')
    })

    it('should still persist event if stream emission fails', async () => {
      const state = createMockStateWithEventSql()
      const mockStreamBinding = {
        send: vi.fn().mockRejectedValue(new Error('Stream unavailable')),
      }
      const env = { EVENT_STREAM: mockStreamBinding }

      const EventDO = applyEventMixin(DOCore, { streamBinding: 'EVENT_STREAM' })
      const instance = new EventDO(state, env)

      // Should not throw - event should still be persisted
      const event = await instance.appendEvent({
        streamId: 'order-123',
        type: 'order.created',
        data: {},
      })

      expect(event).toBeDefined()
      expect(event.version).toBe(1)

      // Verify event was persisted
      const events = await instance.getEvents('order-123')
      expect(events).toHaveLength(1)
    })

    it('should work without stream binding configured', async () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore) // No stream binding
      const instance = new EventDO(state, {})

      const event = await instance.appendEvent({
        streamId: 'order-123',
        type: 'order.created',
        data: {},
      })

      expect(event).toBeDefined()
      expect(event.version).toBe(1)
    })
  })

  describe('Concurrent Appends with Optimistic Locking', () => {
    it('should handle concurrent appends with optimistic locking', async () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore)
      const instance = new EventDO(state, {})

      // Append first event
      await instance.appendEvent({
        streamId: 'order-123',
        type: 'order.created',
        data: {},
      })

      // Attempt to append with correct expected version
      const event = await instance.appendEvent({
        streamId: 'order-123',
        type: 'item.added',
        data: { itemId: '1' },
        expectedVersion: 1,
      })

      expect(event.version).toBe(2)
    })

    it('should throw VersionConflictError on version mismatch', async () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore)
      const instance = new EventDO(state, {})

      // Append two events
      await instance.appendEvent({
        streamId: 'order-123',
        type: 'order.created',
        data: {},
      })
      await instance.appendEvent({
        streamId: 'order-123',
        type: 'item.added',
        data: {},
      })

      // Attempt to append with stale expected version
      await expect(
        instance.appendEvent({
          streamId: 'order-123',
          type: 'item.added',
          data: { itemId: '2' },
          expectedVersion: 1, // Stale - actual is 2
        })
      ).rejects.toThrow(VersionConflictError)
    })

    it('should include actual version in VersionConflictError', async () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore)
      const instance = new EventDO(state, {})

      await instance.appendEvent({ streamId: 's1', type: 'e1', data: {} })
      await instance.appendEvent({ streamId: 's1', type: 'e2', data: {} })
      await instance.appendEvent({ streamId: 's1', type: 'e3', data: {} })

      try {
        await instance.appendEvent({
          streamId: 's1',
          type: 'e4',
          data: {},
          expectedVersion: 1,
        })
        expect.fail('Should have thrown VersionConflictError')
      } catch (error) {
        expect(error).toBeInstanceOf(VersionConflictError)
        const conflictError = error as VersionConflictError
        expect(conflictError.streamId).toBe('s1')
        expect(conflictError.expectedVersion).toBe(1)
        expect(conflictError.actualVersion).toBe(3)
      }
    })

    it('should allow append without expectedVersion (auto-increment)', async () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore)
      const instance = new EventDO(state, {})

      // Append events without expectedVersion - should auto-increment
      const e1 = await instance.appendEvent({ streamId: 's1', type: 'e1', data: {} })
      const e2 = await instance.appendEvent({ streamId: 's1', type: 'e2', data: {} })
      const e3 = await instance.appendEvent({ streamId: 's1', type: 'e3', data: {} })

      expect(e1.version).toBe(1)
      expect(e2.version).toBe(2)
      expect(e3.version).toBe(3)
    })
  })

  describe('Integration with EventStore Repository', () => {
    it('should use SQL storage for persistence', async () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore)
      const instance = new EventDO(state, {})

      await instance.appendEvent({
        streamId: 'order-123',
        type: 'order.created',
        data: { customerId: 'cust-456' },
      })

      // Verify SQL was called
      expect(state.storage.sql.exec).toHaveBeenCalled()
      expect(state._lastQuery.toLowerCase()).toContain('insert')
    })

    it('should initialize schema on first operation', async () => {
      const state = createMockStateWithEventSql()
      const EventDO = applyEventMixin(DOCore)
      const instance = new EventDO(state, {})

      await instance.appendEvent({
        streamId: 'order-123',
        type: 'order.created',
        data: {},
      })

      // Check that CREATE TABLE was called
      const calls = (state.storage.sql.exec as ReturnType<typeof vi.fn>).mock.calls
      const createCalls = calls.filter((c: unknown[]) =>
        (c[0] as string).toLowerCase().includes('create table')
      )
      expect(createCalls.length).toBeGreaterThan(0)
    })
  })
})
