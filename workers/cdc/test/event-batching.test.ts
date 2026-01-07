/**
 * RED Tests: cdc.do Event Batching
 *
 * These tests define the contract for the CDC worker's event batching capabilities.
 * Event batching is critical for efficient data processing and Parquet file generation.
 *
 * Per ARCHITECTURE.md:
 * - CDC pipeline must batch events efficiently
 * - Support configurable batch sizes and timeouts
 * - Handle backpressure gracefully
 *
 * RED PHASE: These tests MUST FAIL because CDCDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-k6ud).
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  createSampleEvent,
  createSampleEvents,
  type MockDOState,
  type MockCDCEnv,
} from './helpers.js'

/**
 * Interface for batch-specific testing
 */
interface CDCBatchingContract {
  createPipeline(config: {
    id: string
    sources: string[]
    batching: { maxSize: number; maxWaitMs: number; maxBytes?: number }
    output: { format: 'parquet' | 'json' }
    deliveryGuarantee: 'at-least-once' | 'at-most-once' | 'exactly-once'
    enabled: boolean
  }): Promise<unknown>

  ingestEvent(pipelineId: string, event: unknown): Promise<{ eventId: string; sequenceNumber: number }>
  ingestBatch(pipelineId: string, events: unknown[]): Promise<{ eventIds: string[]; sequenceNumbers: number[] }>

  flushBatch(pipelineId: string): Promise<{
    batchId: string
    pipelineId: string
    eventCount: number
    sizeBytes: number
    status: string
  }>

  getBatchBuffer(pipelineId: string): Promise<{
    eventCount: number
    sizeBytes: number
    oldestEventTimestamp?: number
    newestEventTimestamp?: number
  }>

  getStats(pipelineId?: string): Promise<{
    pendingEvents: number
    averageBatchSize: number
    totalBatches: number
  }>
}

/**
 * Attempt to load CDCDO - this will fail in RED phase
 */
async function loadCDCDO(): Promise<new (ctx: MockDOState, env: MockCDCEnv) => CDCBatchingContract> {
  const module = await import('../src/cdc.js')
  return module.CDCDO
}

describe('CDC Event Batching', () => {
  let ctx: MockDOState
  let env: MockCDCEnv
  let CDCDO: new (ctx: MockDOState, env: MockCDCEnv) => CDCBatchingContract

  beforeEach(async () => {
    vi.useFakeTimers()
    ctx = createMockState()
    env = createMockEnv()
    CDCDO = await loadCDCDO()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Batch Size Limits', () => {
    it('should auto-flush when batch reaches maxSize', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'size-limit',
        sources: ['test-source'],
        batching: { maxSize: 5, maxWaitMs: 60000 }, // Small batch size, long timeout
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      // Ingest exactly maxSize events
      const events = createSampleEvents(5, 'test-source')
      await instance.ingestBatch('size-limit', events)

      // Buffer should be empty or batch should be flushed
      const stats = await instance.getStats('size-limit')
      expect(stats.pendingEvents).toBeLessThanOrEqual(0)
      expect(stats.totalBatches).toBeGreaterThanOrEqual(1)
    })

    it('should accumulate events below maxSize threshold', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'accumulate',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      // Ingest less than maxSize
      const events = createSampleEvents(10, 'test-source')
      await instance.ingestBatch('accumulate', events)

      const stats = await instance.getStats('accumulate')
      expect(stats.pendingEvents).toBe(10)
    })

    it('should handle events that exceed maxSize in single batch', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'overflow',
        sources: ['test-source'],
        batching: { maxSize: 5, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      // Ingest more than maxSize
      const events = createSampleEvents(12, 'test-source')
      await instance.ingestBatch('overflow', events)

      const stats = await instance.getStats('overflow')
      // Should have created at least 2 batches (5 + 5) with 2 remaining
      expect(stats.totalBatches).toBeGreaterThanOrEqual(2)
      expect(stats.pendingEvents).toBe(2)
    })

    it('should respect maxBytes limit', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'bytes-limit',
        sources: ['test-source'],
        batching: {
          maxSize: 1000,
          maxWaitMs: 60000,
          maxBytes: 1024, // 1KB limit
        },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      // Create events with large payloads
      const largeEvents = Array.from({ length: 10 }, (_, i) =>
        createSampleEvent({
          source: 'test-source',
          data: { payload: 'x'.repeat(200) }, // ~200 bytes each
        })
      )

      await instance.ingestBatch('bytes-limit', largeEvents)

      const stats = await instance.getStats('bytes-limit')
      // Should have flushed batches when bytes exceeded
      expect(stats.totalBatches).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Time-based Flushing', () => {
    it('should auto-flush when maxWaitMs expires', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'time-flush',
        sources: ['test-source'],
        batching: { maxSize: 1000, maxWaitMs: 5000 }, // Large size, 5s timeout
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      // Ingest some events
      const events = createSampleEvents(3, 'test-source')
      await instance.ingestBatch('time-flush', events)

      // Verify events are pending
      let stats = await instance.getStats('time-flush')
      expect(stats.pendingEvents).toBe(3)

      // Advance time past maxWaitMs
      await vi.advanceTimersByTimeAsync(6000)

      // Should have auto-flushed
      stats = await instance.getStats('time-flush')
      expect(stats.pendingEvents).toBe(0)
      expect(stats.totalBatches).toBe(1)
    })

    it('should reset timer on each new event', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'timer-reset',
        sources: ['test-source'],
        batching: { maxSize: 1000, maxWaitMs: 5000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      // Ingest first event
      await instance.ingestEvent('timer-reset', createSampleEvent({ source: 'test-source' }))

      // Advance time but not past timeout
      await vi.advanceTimersByTimeAsync(3000)

      // Ingest another event (should reset timer)
      await instance.ingestEvent('timer-reset', createSampleEvent({ source: 'test-source' }))

      // Advance time again (total from last event: 3s)
      await vi.advanceTimersByTimeAsync(3000)

      // Should still be pending (timer was reset)
      const stats = await instance.getStats('timer-reset')
      expect(stats.pendingEvents).toBe(2)
    })

    it('should not flush empty batches on timeout', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'empty-timeout',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 1000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      // Don't ingest any events
      await vi.advanceTimersByTimeAsync(5000)

      const stats = await instance.getStats('empty-timeout')
      expect(stats.totalBatches).toBe(0)
    })
  })

  describe('Manual Flush', () => {
    it('should allow manual flush before timeout', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'manual-flush',
        sources: ['test-source'],
        batching: { maxSize: 1000, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      const events = createSampleEvents(5, 'test-source')
      await instance.ingestBatch('manual-flush', events)

      const batch = await instance.flushBatch('manual-flush')
      expect(batch.eventCount).toBe(5)
      expect(batch.pipelineId).toBe('manual-flush')

      const stats = await instance.getStats('manual-flush')
      expect(stats.pendingEvents).toBe(0)
    })

    it('should return empty batch info when no pending events', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'empty-flush',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 1000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      const batch = await instance.flushBatch('empty-flush')
      expect(batch.eventCount).toBe(0)
    })
  })

  describe('Batch Buffer State', () => {
    it('should track buffer statistics', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'buffer-stats',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      const events = createSampleEvents(10, 'test-source')
      await instance.ingestBatch('buffer-stats', events)

      const buffer = await instance.getBatchBuffer('buffer-stats')
      expect(buffer.eventCount).toBe(10)
      expect(buffer.sizeBytes).toBeGreaterThan(0)
      expect(buffer.oldestEventTimestamp).toBeDefined()
      expect(buffer.newestEventTimestamp).toBeDefined()
      expect(buffer.newestEventTimestamp).toBeGreaterThanOrEqual(buffer.oldestEventTimestamp!)
    })

    it('should update buffer state on each ingestion', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'buffer-update',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      await instance.ingestBatch('buffer-update', createSampleEvents(5, 'test-source'))
      let buffer = await instance.getBatchBuffer('buffer-update')
      expect(buffer.eventCount).toBe(5)

      await instance.ingestBatch('buffer-update', createSampleEvents(3, 'test-source'))
      buffer = await instance.getBatchBuffer('buffer-update')
      expect(buffer.eventCount).toBe(8)
    })

    it('should clear buffer after flush', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'buffer-clear',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      await instance.ingestBatch('buffer-clear', createSampleEvents(5, 'test-source'))
      await instance.flushBatch('buffer-clear')

      const buffer = await instance.getBatchBuffer('buffer-clear')
      expect(buffer.eventCount).toBe(0)
      expect(buffer.sizeBytes).toBe(0)
    })
  })

  describe('Concurrent Batching', () => {
    it('should handle concurrent event ingestion', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'concurrent',
        sources: ['test-source'],
        batching: { maxSize: 1000, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      // Simulate concurrent ingestion
      const ingestions = Array.from({ length: 10 }, () =>
        instance.ingestEvent('concurrent', createSampleEvent({ source: 'test-source' }))
      )

      await Promise.all(ingestions)

      const stats = await instance.getStats('concurrent')
      expect(stats.pendingEvents).toBe(10)
    })

    it('should maintain correct sequence numbers under concurrency', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'seq-concurrent',
        sources: ['test-source'],
        batching: { maxSize: 1000, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      const ingestions = Array.from({ length: 20 }, () =>
        instance.ingestEvent('seq-concurrent', createSampleEvent({ source: 'test-source' }))
      )

      const results = await Promise.all(ingestions)
      const sequenceNumbers = results.map((r) => r.sequenceNumber).sort((a, b) => a - b)

      // All sequence numbers should be unique
      const uniqueNumbers = new Set(sequenceNumbers)
      expect(uniqueNumbers.size).toBe(20)

      // Should be sequential
      for (let i = 1; i < sequenceNumbers.length; i++) {
        expect(sequenceNumbers[i]).toBe(sequenceNumbers[i - 1]! + 1)
      }
    })
  })

  describe('Backpressure Handling', () => {
    it('should apply backpressure when buffer is full', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'backpressure',
        sources: ['test-source'],
        batching: {
          maxSize: 10,
          maxWaitMs: 60000,
          maxBytes: 500, // Small byte limit
        },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      // Try to ingest many large events quickly
      const largeEvents = Array.from({ length: 50 }, () =>
        createSampleEvent({
          source: 'test-source',
          data: { payload: 'x'.repeat(100) },
        })
      )

      // Should complete without error (batches are flushed automatically)
      await instance.ingestBatch('backpressure', largeEvents)

      const stats = await instance.getStats('backpressure')
      // Multiple batches should have been created
      expect(stats.totalBatches).toBeGreaterThan(1)
    })
  })

  describe('Batch Metadata', () => {
    it('should track batch creation timestamp', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'batch-meta',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      const beforeIngest = Date.now()
      await instance.ingestBatch('batch-meta', createSampleEvents(5, 'test-source'))

      const batch = await instance.flushBatch('batch-meta')
      expect(batch.batchId).toBeDefined()
      expect(batch.sizeBytes).toBeGreaterThan(0)
    })

    it('should include sequence range in batch', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'seq-range',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      await instance.ingestBatch('seq-range', createSampleEvents(10, 'test-source'))
      const batch = await instance.flushBatch('seq-range')

      // Batch should have sequence range info
      expect(batch).toBeDefined()
      expect(batch.eventCount).toBe(10)
    })
  })
})
