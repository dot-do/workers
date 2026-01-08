/**
 * RED Test: Shared Event Fetching Logic in CDC Methods
 *
 * This test verifies that transformToParquet and outputToR2 methods
 * use a shared private helper method _fetchBatchEvents(batchId) to
 * fetch events for a batch, eliminating duplicated SQL query logic.
 *
 * Issue: workers-rcoj
 * TDD Phase: RED (these tests MUST FAIL)
 *
 * Design rationale:
 * - Both transformToParquet() and outputToR2() need to fetch events for a batch
 * - Currently they each implement the same SQL query pattern
 * - Extracting to _fetchBatchEvents(batchId) eliminates duplication
 * - The helper should be private (convention: underscore prefix)
 * - Tests verify the method exists and returns expected data
 *
 * @see workers-wqvr - GREEN phase: Extract _fetchBatchEvents helper method
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createMockState,
  createMockEnv,
  createSampleEvents,
  type MockDOState,
  type MockCDCEnv,
} from './helpers.js'

/**
 * Interface for the CDC Durable Object with internal methods exposed for testing
 *
 * In production, _fetchBatchEvents would be private. For testing purposes,
 * we need to verify it exists and behaves correctly.
 */
interface CDCDOWithInternals {
  // Public methods that use the shared fetching logic
  transformToParquet(batchId: string): Promise<{ path: string; sizeBytes: number }>
  outputToR2(batchId: string, options?: OutputToR2Options): Promise<{ key: string; sizeBytes: number }>

  // Internal helper method (exposed for testing)
  // Convention: underscore prefix indicates "internal/private" but accessible for testing
  _fetchBatchEvents(batchId: string): Promise<BatchEvent[]>

  // Method to check if internal method exists (for introspection)
  hasInternalMethod?(name: string): boolean
}

interface OutputToR2Options {
  bucket?: string
  keyPrefix?: string
  compression?: 'gzip' | 'snappy' | 'none'
}

interface BatchEvent {
  id: string
  batchId: string
  timestamp: number
  source: string
  type: string
  data: Record<string, unknown>
  sequenceNumber: number
}

/**
 * Attempt to load CDCDO - this will fail in RED phase
 * because the implementation doesn't exist yet
 */
async function loadCDCDO(): Promise<new (ctx: MockDOState, env: MockCDCEnv) => CDCDOWithInternals> {
  // This import will fail because src/cdc.js doesn't exist
  const module = await import('../src/cdc.js')
  return module.CDCDO
}

describe('Shared Event Fetching Logic', () => {
  let ctx: MockDOState
  let env: MockCDCEnv
  let CDCDO: new (ctx: MockDOState, env: MockCDCEnv) => CDCDOWithInternals

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    // This will throw in RED phase because the module doesn't exist
    CDCDO = await loadCDCDO()
  })

  describe('_fetchBatchEvents() helper method', () => {
    it('should expose _fetchBatchEvents method on CDCDO instance', async () => {
      const instance = new CDCDO(ctx, env)

      // The _fetchBatchEvents method must exist
      expect(typeof instance._fetchBatchEvents).toBe('function')
    })

    it('should return events for a given batchId', async () => {
      const instance = new CDCDO(ctx, env)
      const batchId = 'test-batch-001'

      // Seed mock storage with batch events
      const sampleEvents = createSampleEvents(5, 'test-source')
      const batchEvents = sampleEvents.map((e, i) => ({
        ...e,
        batchId,
        sequenceNumber: i + 1,
      }))

      // Store events in mock storage (simulating what ingestEvent would do)
      for (const event of batchEvents) {
        await ctx.storage.put(`event:${event.id}`, event)
        await ctx.storage.put(`batch:${batchId}:event:${event.id}`, event)
      }

      // Fetch events using the helper
      const fetchedEvents = await instance._fetchBatchEvents(batchId)

      expect(fetchedEvents).toHaveLength(5)
      expect(fetchedEvents[0].batchId).toBe(batchId)
    })

    it('should return events in sequence order', async () => {
      const instance = new CDCDO(ctx, env)
      const batchId = 'ordered-batch-001'

      // Create events with specific sequence numbers (out of order in storage)
      const events: BatchEvent[] = [
        { id: 'e3', batchId, timestamp: Date.now(), source: 's', type: 't', data: {}, sequenceNumber: 3 },
        { id: 'e1', batchId, timestamp: Date.now(), source: 's', type: 't', data: {}, sequenceNumber: 1 },
        { id: 'e5', batchId, timestamp: Date.now(), source: 's', type: 't', data: {}, sequenceNumber: 5 },
        { id: 'e2', batchId, timestamp: Date.now(), source: 's', type: 't', data: {}, sequenceNumber: 2 },
        { id: 'e4', batchId, timestamp: Date.now(), source: 's', type: 't', data: {}, sequenceNumber: 4 },
      ]

      for (const event of events) {
        await ctx.storage.put(`batch:${batchId}:event:${event.id}`, event)
      }

      const fetchedEvents = await instance._fetchBatchEvents(batchId)

      // Events should be sorted by sequenceNumber
      expect(fetchedEvents.map(e => e.sequenceNumber)).toEqual([1, 2, 3, 4, 5])
      expect(fetchedEvents.map(e => e.id)).toEqual(['e1', 'e2', 'e3', 'e4', 'e5'])
    })

    it('should return empty array for non-existent batchId', async () => {
      const instance = new CDCDO(ctx, env)

      const fetchedEvents = await instance._fetchBatchEvents('non-existent-batch')

      expect(fetchedEvents).toEqual([])
    })

    it('should throw for invalid batchId', async () => {
      const instance = new CDCDO(ctx, env)

      // Empty string should throw
      await expect(instance._fetchBatchEvents('')).rejects.toThrow(/batchId.*required|invalid/i)

      // Null/undefined should also be rejected at runtime
      await expect(instance._fetchBatchEvents(null as unknown as string)).rejects.toThrow()
    })
  })

  describe('transformToParquet() uses _fetchBatchEvents()', () => {
    it('should call _fetchBatchEvents to get events before transformation', async () => {
      const instance = new CDCDO(ctx, env)
      const batchId = 'parquet-batch-001'

      // Spy on the internal method
      const fetchSpy = vi.spyOn(instance, '_fetchBatchEvents')

      // Seed some events
      const events: BatchEvent[] = [
        { id: 'e1', batchId, timestamp: Date.now(), source: 's', type: 't', data: { foo: 'bar' }, sequenceNumber: 1 },
        { id: 'e2', batchId, timestamp: Date.now(), source: 's', type: 't', data: { foo: 'baz' }, sequenceNumber: 2 },
      ]
      for (const event of events) {
        await ctx.storage.put(`batch:${batchId}:event:${event.id}`, event)
      }

      // Call transformToParquet
      await instance.transformToParquet(batchId)

      // Verify _fetchBatchEvents was called with the batchId
      expect(fetchSpy).toHaveBeenCalledWith(batchId)
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    it('should use events from _fetchBatchEvents in Parquet output', async () => {
      const instance = new CDCDO(ctx, env)
      const batchId = 'parquet-verify-001'

      // Seed events
      const events: BatchEvent[] = [
        { id: 'unique-event-1', batchId, timestamp: Date.now(), source: 'source1', type: 'type1', data: { val: 1 }, sequenceNumber: 1 },
        { id: 'unique-event-2', batchId, timestamp: Date.now(), source: 'source2', type: 'type2', data: { val: 2 }, sequenceNumber: 2 },
      ]
      for (const event of events) {
        await ctx.storage.put(`batch:${batchId}:event:${event.id}`, event)
      }

      const result = await instance.transformToParquet(batchId)

      // transformToParquet should return a path and size
      expect(result.path).toContain('.parquet')
      expect(result.sizeBytes).toBeGreaterThan(0)
    })
  })

  describe('outputToR2() uses _fetchBatchEvents()', () => {
    it('should call _fetchBatchEvents to get events before R2 output', async () => {
      const instance = new CDCDO(ctx, env)
      const batchId = 'r2-batch-001'

      // Spy on the internal method
      const fetchSpy = vi.spyOn(instance, '_fetchBatchEvents')

      // Seed some events
      const events: BatchEvent[] = [
        { id: 'r2-e1', batchId, timestamp: Date.now(), source: 's', type: 't', data: { r2: true }, sequenceNumber: 1 },
      ]
      for (const event of events) {
        await ctx.storage.put(`batch:${batchId}:event:${event.id}`, event)
      }

      // Call outputToR2
      await instance.outputToR2(batchId)

      // Verify _fetchBatchEvents was called with the batchId
      expect(fetchSpy).toHaveBeenCalledWith(batchId)
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    it('should write events to R2 bucket using fetched data', async () => {
      const instance = new CDCDO(ctx, env)
      const batchId = 'r2-verify-001'

      // Seed events
      const events: BatchEvent[] = [
        { id: 'r2-verify-e1', batchId, timestamp: Date.now(), source: 's1', type: 't1', data: {}, sequenceNumber: 1 },
        { id: 'r2-verify-e2', batchId, timestamp: Date.now(), source: 's2', type: 't2', data: {}, sequenceNumber: 2 },
      ]
      for (const event of events) {
        await ctx.storage.put(`batch:${batchId}:event:${event.id}`, event)
      }

      const result = await instance.outputToR2(batchId)

      // outputToR2 should return the R2 key and size
      expect(result.key).toBeDefined()
      expect(result.sizeBytes).toBeGreaterThan(0)

      // Verify data was written to the mock R2 bucket
      expect(env.CDC_BUCKET?.put).toHaveBeenCalled()
    })
  })

  describe('Both methods use the same underlying query pattern', () => {
    it('should return identical events from _fetchBatchEvents regardless of caller', async () => {
      const instance = new CDCDO(ctx, env)
      const batchId = 'consistency-test-001'

      // Seed events
      const events: BatchEvent[] = [
        { id: 'c1', batchId, timestamp: Date.now(), source: 's', type: 't', data: { test: 'consistency' }, sequenceNumber: 1 },
        { id: 'c2', batchId, timestamp: Date.now(), source: 's', type: 't', data: { test: 'consistency' }, sequenceNumber: 2 },
        { id: 'c3', batchId, timestamp: Date.now(), source: 's', type: 't', data: { test: 'consistency' }, sequenceNumber: 3 },
      ]
      for (const event of events) {
        await ctx.storage.put(`batch:${batchId}:event:${event.id}`, event)
      }

      // Call _fetchBatchEvents directly twice
      const firstFetch = await instance._fetchBatchEvents(batchId)
      const secondFetch = await instance._fetchBatchEvents(batchId)

      // Results should be identical
      expect(firstFetch).toEqual(secondFetch)
      expect(firstFetch).toHaveLength(3)
    })

    it('should ensure transformToParquet and outputToR2 operate on same event set', async () => {
      const instance = new CDCDO(ctx, env)
      const batchId = 'same-events-001'

      // Seed events
      const events: BatchEvent[] = [
        { id: 'se1', batchId, timestamp: Date.now(), source: 's', type: 't', data: { shared: true }, sequenceNumber: 1 },
        { id: 'se2', batchId, timestamp: Date.now(), source: 's', type: 't', data: { shared: true }, sequenceNumber: 2 },
      ]
      for (const event of events) {
        await ctx.storage.put(`batch:${batchId}:event:${event.id}`, event)
      }

      // Collect events fetched during each operation
      const parquetFetchedEvents: BatchEvent[] = []
      const r2FetchedEvents: BatchEvent[] = []

      // Override _fetchBatchEvents to capture what's returned
      const originalFetch = instance._fetchBatchEvents.bind(instance)
      let callCount = 0

      instance._fetchBatchEvents = async (bid: string) => {
        const result = await originalFetch(bid)
        if (callCount === 0) {
          parquetFetchedEvents.push(...result)
        } else {
          r2FetchedEvents.push(...result)
        }
        callCount++
        return result
      }

      // Call both methods
      await instance.transformToParquet(batchId)
      await instance.outputToR2(batchId)

      // Both should have operated on the same set of events
      expect(parquetFetchedEvents).toEqual(r2FetchedEvents)
    })
  })
})
