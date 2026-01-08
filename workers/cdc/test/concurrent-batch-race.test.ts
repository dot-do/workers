/**
 * RED Tests: Concurrent CDC Batch Creation Race Conditions
 *
 * Issue: workers-lo13
 * Related: workers-7buz (GREEN phase - transaction locking implementation)
 *
 * These tests verify that the CDC pipeline handles race conditions correctly
 * when multiple concurrent callers attempt to create batches for overlapping
 * time windows simultaneously.
 *
 * Critical invariants that must hold:
 * 1. No duplicate batches for the same time window
 * 2. No events missed between concurrent batch creations
 * 3. No events duplicated across concurrent batches
 * 4. Sequence numbers remain monotonic and gapless
 *
 * RED PHASE: These tests MUST FAIL because proper transaction locking
 * is not implemented yet. The implementation will be done in workers-7buz.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  createMockStorage,
  createSampleEvent,
  createSampleEvents,
  type MockDOState,
  type MockCDCEnv,
  type MockDOStorage,
  type CDCEvent,
} from './helpers.js'

/**
 * Extended interface for race condition testing
 */
interface CDCRaceConditionContract {
  createPipeline(config: {
    id: string
    sources: string[]
    batching: { maxSize: number; maxWaitMs: number; maxBytes?: number }
    output: { format: 'parquet' | 'json' }
    deliveryGuarantee: 'at-least-once' | 'at-most-once' | 'exactly-once'
    enabled: boolean
  }): Promise<unknown>

  ingestEvent(pipelineId: string, event: CDCEvent): Promise<{ eventId: string; sequenceNumber: number }>
  ingestBatch(pipelineId: string, events: CDCEvent[]): Promise<{ eventIds: string[]; sequenceNumbers: number[] }>

  /**
   * Create a CDC batch for events in the specified time window.
   * This is the method under test for race conditions.
   */
  createCDCBatch(
    pipelineId: string,
    options?: {
      fromTimestamp?: number
      toTimestamp?: number
      maxEvents?: number
    }
  ): Promise<{
    batchId: string
    pipelineId: string
    eventCount: number
    events: CDCEvent[]
    fromSequence: number
    toSequence: number
    createdAt: number
  }>

  flushBatch(pipelineId: string): Promise<{
    batchId: string
    pipelineId: string
    eventCount: number
    sizeBytes: number
    status: string
  }>

  getBatch(batchId: string): Promise<{
    batchId: string
    pipelineId: string
    eventCount: number
    events: CDCEvent[]
    status: string
  } | null>

  listBatches(
    pipelineId: string,
    options?: { status?: string; limit?: number }
  ): Promise<
    Array<{
      batchId: string
      pipelineId: string
      eventCount: number
      fromSequence: number
      toSequence: number
      status: string
    }>
  >

  getEventsBySequence(pipelineId: string, fromSeq: number, toSeq: number): Promise<CDCEvent[]>
  getLatestSequence(pipelineId: string): Promise<number>

  getStats(pipelineId?: string): Promise<{
    pendingEvents: number
    totalBatches: number
    totalEventsReceived: number
    totalEventsProcessed: number
  }>
}

/**
 * Attempt to load CDCDO - this will fail in RED phase
 */
async function loadCDCDO(): Promise<new (ctx: MockDOState, env: MockCDCEnv) => CDCRaceConditionContract> {
  const module = await import('../src/cdc.js')
  return module.CDCDO
}

describe('Concurrent CDC Batch Creation Race Conditions', () => {
  let ctx: MockDOState
  let env: MockCDCEnv
  let CDCDO: new (ctx: MockDOState, env: MockCDCEnv) => CDCRaceConditionContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    CDCDO = await loadCDCDO()
  })

  describe('Duplicate Batch Prevention', () => {
    it('should not create duplicate batches when two concurrent createCDCBatch calls overlap', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'race-test',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'exactly-once',
        enabled: true,
      })

      // Ingest events
      const events = createSampleEvents(20, 'test-source')
      await instance.ingestBatch('race-test', events)

      const now = Date.now()
      const timeWindow = {
        fromTimestamp: now - 10000,
        toTimestamp: now,
      }

      // Simulate two concurrent batch creation calls for the SAME time window
      const [batch1, batch2] = await Promise.all([
        instance.createCDCBatch('race-test', timeWindow),
        instance.createCDCBatch('race-test', timeWindow),
      ])

      // One of these should succeed and one should either:
      // a) Return the same batch (idempotent)
      // b) Return an empty batch (events already claimed)
      // c) Throw a conflict error

      // The key invariant: total events across both batches should equal
      // the number of events in the time window (no duplicates)
      const allBatches = await instance.listBatches('race-test')
      const totalEventsInBatches = allBatches.reduce((sum, b) => sum + b.eventCount, 0)

      // Should not exceed the events we ingested
      expect(totalEventsInBatches).toBeLessThanOrEqual(20)

      // If both returned events, they should not overlap
      if (batch1.eventCount > 0 && batch2.eventCount > 0) {
        const batch1Events = new Set(batch1.events.map((e) => e.id))
        const batch2Events = batch2.events.map((e) => e.id)

        for (const eventId of batch2Events) {
          expect(batch1Events.has(eventId)).toBe(false)
        }
      }
    })

    it('should handle rapid-fire concurrent batch creations without duplicates', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'rapid-fire',
        sources: ['test-source'],
        batching: { maxSize: 1000, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'exactly-once',
        enabled: true,
      })

      // Ingest 100 events
      const events = createSampleEvents(100, 'test-source')
      await instance.ingestBatch('rapid-fire', events)

      // Fire off 10 concurrent batch creation requests
      const batchPromises = Array.from({ length: 10 }, () =>
        instance.createCDCBatch('rapid-fire', { maxEvents: 20 })
      )

      const batches = await Promise.all(batchPromises)

      // Collect all event IDs across all batches
      const allEventIds: string[] = []
      for (const batch of batches) {
        for (const event of batch.events) {
          allEventIds.push(event.id)
        }
      }

      // Check for duplicates
      const uniqueEventIds = new Set(allEventIds)
      expect(uniqueEventIds.size).toBe(allEventIds.length)
    })
  })

  describe('Event Coverage Guarantees', () => {
    it('should not miss events during concurrent batch creation', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'no-miss',
        sources: ['test-source'],
        batching: { maxSize: 1000, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'exactly-once',
        enabled: true,
      })

      // Ingest events
      const events = createSampleEvents(50, 'test-source')
      await instance.ingestBatch('no-miss', events)
      const eventIds = new Set(events.map((e) => e.id))

      // Create batches concurrently until all events are batched
      const collectedEventIds = new Set<string>()
      const maxIterations = 20 // Prevent infinite loop

      for (let i = 0; i < maxIterations; i++) {
        const batchPromises = Array.from({ length: 5 }, () =>
          instance.createCDCBatch('no-miss', { maxEvents: 10 })
        )

        const batches = await Promise.all(batchPromises)

        for (const batch of batches) {
          for (const event of batch.events) {
            collectedEventIds.add(event.id)
          }
        }

        // Check if we have all events
        if (collectedEventIds.size === eventIds.size) break
      }

      // All original events should be captured
      for (const eventId of eventIds) {
        expect(collectedEventIds.has(eventId)).toBe(true)
      }
    })

    it('should process all events exactly once under concurrent batch creation', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'exactly-once',
        sources: ['test-source'],
        batching: { maxSize: 1000, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'exactly-once',
        enabled: true,
      })

      // Ingest 30 events
      const events = createSampleEvents(30, 'test-source')
      await instance.ingestBatch('exactly-once', events)

      // Run concurrent batch creation until done
      const allBatchedEvents: string[] = []
      let hasMoreEvents = true
      let iterations = 0
      const maxIterations = 15

      while (hasMoreEvents && iterations < maxIterations) {
        iterations++
        const batchPromises = Array.from({ length: 3 }, () =>
          instance.createCDCBatch('exactly-once', { maxEvents: 10 })
        )

        const batches = await Promise.all(batchPromises)
        const batchedCount = batches.reduce((sum, b) => sum + b.eventCount, 0)

        for (const batch of batches) {
          for (const event of batch.events) {
            allBatchedEvents.push(event.id)
          }
        }

        hasMoreEvents = batchedCount > 0
      }

      // Should have exactly 30 unique events
      expect(allBatchedEvents.length).toBe(30)
      expect(new Set(allBatchedEvents).size).toBe(30)
    })
  })

  describe('Sequence Number Integrity', () => {
    it('should maintain monotonic sequence numbers during concurrent batching', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'seq-integrity',
        sources: ['test-source'],
        batching: { maxSize: 1000, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'exactly-once',
        enabled: true,
      })

      // Ingest events
      const events = createSampleEvents(40, 'test-source')
      await instance.ingestBatch('seq-integrity', events)

      // Create batches concurrently
      const batchPromises = Array.from({ length: 8 }, () =>
        instance.createCDCBatch('seq-integrity', { maxEvents: 10 })
      )

      const batches = await Promise.all(batchPromises)

      // Collect all sequence ranges
      const sequenceRanges = batches
        .filter((b) => b.eventCount > 0)
        .map((b) => ({ from: b.fromSequence, to: b.toSequence }))
        .sort((a, b) => a.from - b.from)

      // Sequence ranges should not overlap
      for (let i = 1; i < sequenceRanges.length; i++) {
        const prev = sequenceRanges[i - 1]!
        const curr = sequenceRanges[i]!
        expect(curr.from).toBeGreaterThan(prev.to)
      }
    })

    it('should produce gapless sequence coverage after concurrent batch creation', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'gapless',
        sources: ['test-source'],
        batching: { maxSize: 1000, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'exactly-once',
        enabled: true,
      })

      // Ingest events
      const events = createSampleEvents(25, 'test-source')
      await instance.ingestBatch('gapless', events)

      // Create all batches concurrently
      const batchPromises = Array.from({ length: 5 }, () =>
        instance.createCDCBatch('gapless', { maxEvents: 10 })
      )

      const batches = await Promise.all(batchPromises)

      // Get all batched sequence numbers
      const allSequences: number[] = []
      for (const batch of batches) {
        for (const event of batch.events) {
          if (event.sequenceNumber !== undefined) {
            allSequences.push(event.sequenceNumber)
          }
        }
      }

      // Sort and verify no gaps
      allSequences.sort((a, b) => a - b)
      for (let i = 1; i < allSequences.length; i++) {
        expect(allSequences[i]).toBe(allSequences[i - 1]! + 1)
      }
    })
  })

  describe('Concurrent Ingestion and Batch Creation', () => {
    it('should handle concurrent ingestion while batch creation is in progress', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'ingest-while-batch',
        sources: ['test-source'],
        batching: { maxSize: 1000, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'exactly-once',
        enabled: true,
      })

      // Initial ingestion
      await instance.ingestBatch('ingest-while-batch', createSampleEvents(20, 'test-source'))

      // Run concurrent operations: ingestion and batch creation simultaneously
      const operations = [
        // Batch creations
        instance.createCDCBatch('ingest-while-batch', { maxEvents: 10 }),
        instance.createCDCBatch('ingest-while-batch', { maxEvents: 10 }),
        // New ingestions during batch creation
        instance.ingestBatch('ingest-while-batch', createSampleEvents(10, 'test-source')),
        instance.ingestBatch('ingest-while-batch', createSampleEvents(10, 'test-source')),
        // More batch creations
        instance.createCDCBatch('ingest-while-batch', { maxEvents: 10 }),
      ]

      await Promise.all(operations)

      // Verify no data corruption
      const stats = await instance.getStats('ingest-while-batch')

      // We ingested 20 + 10 + 10 = 40 events
      expect(stats.totalEventsReceived).toBe(40)

      // Get all batches and verify no duplicates
      const allBatches = await instance.listBatches('ingest-while-batch')
      const batchedSequences = new Set<number>()

      for (const batch of allBatches) {
        for (let seq = batch.fromSequence; seq <= batch.toSequence; seq++) {
          // Each sequence should only appear once
          expect(batchedSequences.has(seq)).toBe(false)
          batchedSequences.add(seq)
        }
      }
    })

    it('should not lose events ingested during concurrent batch creation', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'no-loss',
        sources: ['test-source'],
        batching: { maxSize: 1000, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'exactly-once',
        enabled: true,
      })

      const allIngestedIds = new Set<string>()

      // Run mixed concurrent operations
      const ingestAndCollect = async (count: number) => {
        const events = createSampleEvents(count, 'test-source')
        await instance.ingestBatch('no-loss', events)
        for (const e of events) allIngestedIds.add(e.id)
      }

      const operations = [
        ingestAndCollect(10),
        ingestAndCollect(10),
        instance.createCDCBatch('no-loss', { maxEvents: 5 }),
        ingestAndCollect(10),
        instance.createCDCBatch('no-loss', { maxEvents: 10 }),
        instance.createCDCBatch('no-loss', { maxEvents: 10 }),
        ingestAndCollect(10),
      ]

      await Promise.all(operations)

      // Drain remaining events into batches
      let remainingEvents = true
      while (remainingEvents) {
        const batch = await instance.createCDCBatch('no-loss', { maxEvents: 100 })
        remainingEvents = batch.eventCount > 0
      }

      // Collect all batched event IDs
      const allBatches = await instance.listBatches('no-loss')
      const batchedIds = new Set<string>()

      for (const batchInfo of allBatches) {
        const batch = await instance.getBatch(batchInfo.batchId)
        if (batch) {
          for (const event of batch.events) {
            batchedIds.add(event.id)
          }
        }
      }

      // Every ingested event should be in exactly one batch
      expect(batchedIds.size).toBe(allIngestedIds.size)
      for (const id of allIngestedIds) {
        expect(batchedIds.has(id)).toBe(true)
      }
    })
  })

  describe('Overlapping Time Window Conflicts', () => {
    it('should resolve conflicts when batch windows overlap exactly', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'overlap-exact',
        sources: ['test-source'],
        batching: { maxSize: 1000, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'exactly-once',
        enabled: true,
      })

      // Ingest events at known timestamps
      const now = Date.now()
      const events = Array.from({ length: 20 }, (_, i) =>
        createSampleEvent({
          source: 'test-source',
          timestamp: now - (20 - i) * 100, // Events spread over 2 seconds
        })
      )
      await instance.ingestBatch('overlap-exact', events)

      // Two batch requests for exact same window
      const window = { fromTimestamp: now - 2000, toTimestamp: now }

      const results = await Promise.allSettled([
        instance.createCDCBatch('overlap-exact', window),
        instance.createCDCBatch('overlap-exact', window),
      ])

      // Count successful batches and their events
      const successfulBatches = results
        .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof instance.createCDCBatch>>> =>
          r.status === 'fulfilled'
        )
        .map((r) => r.value)

      const totalEvents = successfulBatches.reduce((sum, b) => sum + b.eventCount, 0)

      // Should not have more events than we ingested
      expect(totalEvents).toBeLessThanOrEqual(20)

      // If both succeeded, they should not overlap
      if (successfulBatches.length === 2 && successfulBatches[0]!.eventCount > 0 && successfulBatches[1]!.eventCount > 0) {
        const ids1 = new Set(successfulBatches[0]!.events.map((e) => e.id))
        for (const event of successfulBatches[1]!.events) {
          expect(ids1.has(event.id)).toBe(false)
        }
      }
    })

    it('should handle partially overlapping time windows correctly', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'overlap-partial',
        sources: ['test-source'],
        batching: { maxSize: 1000, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'exactly-once',
        enabled: true,
      })

      const now = Date.now()
      const events = Array.from({ length: 30 }, (_, i) =>
        createSampleEvent({
          source: 'test-source',
          timestamp: now - 3000 + i * 100, // Events spread over 3 seconds
        })
      )
      await instance.ingestBatch('overlap-partial', events)

      // Overlapping windows: [now-3000, now-1000] and [now-2000, now]
      const results = await Promise.all([
        instance.createCDCBatch('overlap-partial', {
          fromTimestamp: now - 3000,
          toTimestamp: now - 1000,
        }),
        instance.createCDCBatch('overlap-partial', {
          fromTimestamp: now - 2000,
          toTimestamp: now,
        }),
      ])

      // Collect all events from both batches
      const allEventIds: string[] = []
      for (const batch of results) {
        for (const event of batch.events) {
          allEventIds.push(event.id)
        }
      }

      // No duplicates allowed even with overlapping windows
      const uniqueIds = new Set(allEventIds)
      expect(uniqueIds.size).toBe(allEventIds.length)
    })
  })

  describe('Transaction Isolation', () => {
    it('should provide proper isolation between concurrent batch operations', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'isolation',
        sources: ['test-source'],
        batching: { maxSize: 1000, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'exactly-once',
        enabled: true,
      })

      await instance.ingestBatch('isolation', createSampleEvents(50, 'test-source'))

      // Start multiple batch operations that should be isolated
      const operations = Array.from({ length: 10 }, (_, i) =>
        instance.createCDCBatch('isolation', { maxEvents: 10 }).then((batch) => ({
          operationId: i,
          batch,
        }))
      )

      const results = await Promise.all(operations)

      // Each operation should have received a consistent view
      // No two operations should have claimed the same events
      const eventToOperation = new Map<string, number>()

      for (const { operationId, batch } of results) {
        for (const event of batch.events) {
          const existingOp = eventToOperation.get(event.id)
          if (existingOp !== undefined) {
            // This would indicate a race condition - same event in multiple batches
            throw new Error(`Event ${event.id} was claimed by both operation ${existingOp} and ${operationId}`)
          }
          eventToOperation.set(event.id, operationId)
        }
      }

      // All events should be accounted for exactly once
      expect(eventToOperation.size).toBe(50)
    })

    it('should handle transaction rollback on failure without losing events', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'rollback',
        sources: ['test-source'],
        batching: { maxSize: 1000, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'exactly-once',
        enabled: true,
      })

      await instance.ingestBatch('rollback', createSampleEvents(20, 'test-source'))

      // First batch should succeed
      const batch1 = await instance.createCDCBatch('rollback', { maxEvents: 10 })
      expect(batch1.eventCount).toBe(10)

      // Remaining events should still be available
      const batch2 = await instance.createCDCBatch('rollback', { maxEvents: 20 })
      expect(batch2.eventCount).toBe(10) // The remaining 10

      // No events should be lost
      const stats = await instance.getStats('rollback')
      const allBatches = await instance.listBatches('rollback')
      const totalBatched = allBatches.reduce((sum, b) => sum + b.eventCount, 0)
      expect(totalBatched).toBe(20)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty pipeline during concurrent batch creation', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'empty-concurrent',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'exactly-once',
        enabled: true,
      })

      // No events ingested - multiple concurrent batch requests
      const results = await Promise.all([
        instance.createCDCBatch('empty-concurrent', { maxEvents: 10 }),
        instance.createCDCBatch('empty-concurrent', { maxEvents: 10 }),
        instance.createCDCBatch('empty-concurrent', { maxEvents: 10 }),
      ])

      // All should return empty batches without error
      for (const batch of results) {
        expect(batch.eventCount).toBe(0)
        expect(batch.events).toEqual([])
      }
    })

    it('should handle single event under concurrent batch creation', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'single-event',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'exactly-once',
        enabled: true,
      })

      // Only one event
      const event = createSampleEvent({ source: 'test-source' })
      await instance.ingestEvent('single-event', event)

      // Multiple concurrent batch requests for single event
      const results = await Promise.all([
        instance.createCDCBatch('single-event', { maxEvents: 10 }),
        instance.createCDCBatch('single-event', { maxEvents: 10 }),
        instance.createCDCBatch('single-event', { maxEvents: 10 }),
      ])

      // Only one batch should contain the event
      const batchesWithEvents = results.filter((b) => b.eventCount > 0)
      expect(batchesWithEvents.length).toBe(1)
      expect(batchesWithEvents[0]!.events[0]!.id).toBe(event.id)
    })

    it('should maintain consistency during high-contention scenarios', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'high-contention',
        sources: ['test-source'],
        batching: { maxSize: 1000, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'exactly-once',
        enabled: true,
      })

      // Ingest many events
      await instance.ingestBatch('high-contention', createSampleEvents(100, 'test-source'))

      // Very high contention: 50 concurrent batch requests
      const results = await Promise.all(
        Array.from({ length: 50 }, () => instance.createCDCBatch('high-contention', { maxEvents: 5 }))
      )

      // Collect all event IDs
      const allEventIds: string[] = []
      for (const batch of results) {
        for (const event of batch.events) {
          allEventIds.push(event.id)
        }
      }

      // No duplicates under high contention
      const uniqueIds = new Set(allEventIds)
      expect(uniqueIds.size).toBe(allEventIds.length)

      // Total should equal 100 (all events batched)
      expect(allEventIds.length).toBe(100)
    })
  })
})
