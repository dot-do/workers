/**
 * RED Tests: cdc.do CDC Pipeline RPC Interface
 *
 * These tests define the contract for the cdc.do worker's CDC (Change Data Capture) pipeline.
 * The CDCDO must implement event batching, Parquet generation, event ordering, and delivery guarantees.
 *
 * Per ARCHITECTURE.md:
 * - cdc.do implements CDC pipeline for data synchronization
 * - Extends slim DO core
 * - Provides event capture and replication via RPC
 * - Supports @callable() decorated methods
 *
 * RED PHASE: These tests MUST FAIL because CDCDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-k6ud).
 *
 * @see ARCHITECTURE.md CDC pipeline sections
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  createSampleEvent,
  createSampleEvents,
  type MockDOState,
  type MockCDCEnv,
  type CDCEvent,
} from './helpers.js'

/**
 * CDC Pipeline configuration
 */
export interface CDCPipelineConfig {
  /** Pipeline identifier */
  id: string
  /** Human-readable name */
  name?: string
  /** Source systems to capture events from */
  sources: string[]
  /** Event types to capture (glob patterns supported) */
  eventTypes?: string[]
  /** Batch configuration */
  batching: BatchConfig
  /** Output configuration */
  output: OutputConfig
  /** Delivery guarantees */
  deliveryGuarantee: 'at-least-once' | 'at-most-once' | 'exactly-once'
  /** Whether pipeline is active */
  enabled: boolean
}

/**
 * Batch configuration for event batching
 */
export interface BatchConfig {
  /** Maximum events per batch */
  maxSize: number
  /** Maximum time to wait before flushing (ms) */
  maxWaitMs: number
  /** Maximum batch size in bytes */
  maxBytes?: number
}

/**
 * Output configuration for CDC data
 */
export interface OutputConfig {
  /** Output format */
  format: 'parquet' | 'json' | 'avro'
  /** Compression algorithm */
  compression?: 'none' | 'snappy' | 'gzip' | 'zstd'
  /** Partition strategy */
  partitioning?: PartitionConfig
  /** R2 bucket path prefix */
  pathPrefix?: string
}

/**
 * Partition configuration
 */
export interface PartitionConfig {
  /** Partition by fields (e.g., ['source', 'type']) */
  fields?: string[]
  /** Time-based partitioning */
  timeField?: string
  /** Time granularity */
  timeGranularity?: 'hour' | 'day' | 'month'
}

/**
 * Batch status tracking
 */
export interface BatchStatus {
  /** Batch identifier */
  batchId: string
  /** Pipeline this batch belongs to */
  pipelineId: string
  /** Number of events in batch */
  eventCount: number
  /** Batch size in bytes */
  sizeBytes: number
  /** Batch creation timestamp */
  createdAt: number
  /** Batch flush timestamp */
  flushedAt?: number
  /** Output file path (if written) */
  outputPath?: string
  /** Batch status */
  status: 'pending' | 'flushing' | 'completed' | 'failed'
  /** Error message if failed */
  error?: string
  /** First event sequence number */
  firstSequence?: number
  /** Last event sequence number */
  lastSequence?: number
}

/**
 * Delivery acknowledgment
 */
export interface DeliveryAck {
  /** Event ID */
  eventId: string
  /** Acknowledgment status */
  status: 'acked' | 'nacked' | 'pending'
  /** Timestamp */
  timestamp: number
  /** Consumer ID */
  consumerId?: string
  /** Error if nacked */
  error?: string
}

/**
 * CDC statistics
 */
export interface CDCStats {
  /** Total events received */
  totalEventsReceived: number
  /** Total events processed */
  totalEventsProcessed: number
  /** Total batches created */
  totalBatches: number
  /** Total bytes written */
  totalBytesWritten: number
  /** Events pending in buffer */
  pendingEvents: number
  /** Average batch size */
  averageBatchSize: number
  /** Average latency (ms) */
  averageLatencyMs: number
  /** Error count */
  errorCount: number
  /** Last event timestamp */
  lastEventTimestamp?: number
}

/**
 * Interface definition for CDCDO - this defines the contract
 * The implementation must satisfy this interface
 */
export interface CDCDOContract {
  // Pipeline Management
  createPipeline(config: CDCPipelineConfig): Promise<CDCPipelineConfig>
  getPipeline(pipelineId: string): Promise<CDCPipelineConfig | null>
  updatePipeline(pipelineId: string, updates: Partial<CDCPipelineConfig>): Promise<CDCPipelineConfig | null>
  deletePipeline(pipelineId: string): Promise<boolean>
  listPipelines(options?: ListOptions): Promise<CDCPipelineConfig[]>
  enablePipeline(pipelineId: string): Promise<boolean>
  disablePipeline(pipelineId: string): Promise<boolean>

  // Event Ingestion
  ingestEvent(pipelineId: string, event: CDCEvent): Promise<{ eventId: string; sequenceNumber: number }>
  ingestBatch(pipelineId: string, events: CDCEvent[]): Promise<{ eventIds: string[]; sequenceNumbers: number[] }>

  // Batch Management
  getBatch(batchId: string): Promise<BatchStatus | null>
  listBatches(pipelineId: string, options?: ListOptions): Promise<BatchStatus[]>
  flushBatch(pipelineId: string): Promise<BatchStatus>
  retryBatch(batchId: string): Promise<BatchStatus>

  // Event Ordering
  getEventsBySequence(pipelineId: string, startSequence: number, endSequence: number): Promise<CDCEvent[]>
  getLatestSequence(pipelineId: string): Promise<number>
  setCheckpoint(pipelineId: string, consumerId: string, sequenceNumber: number): Promise<void>
  getCheckpoint(pipelineId: string, consumerId: string): Promise<number>

  // Delivery Management
  acknowledgeEvent(pipelineId: string, eventId: string, consumerId: string): Promise<DeliveryAck>
  acknowledgeEvents(pipelineId: string, eventIds: string[], consumerId: string): Promise<DeliveryAck[]>
  getPendingDeliveries(pipelineId: string, consumerId: string): Promise<CDCEvent[]>
  replayEvents(pipelineId: string, fromSequence: number, toSequence?: number): Promise<CDCEvent[]>

  // Statistics
  getStats(pipelineId?: string): Promise<CDCStats>

  // Parquet Operations
  generateParquet(pipelineId: string, batchId: string): Promise<{ path: string; sizeBytes: number }>
  listParquetFiles(pipelineId: string, options?: { since?: number; until?: number }): Promise<string[]>

  // RPC interface
  hasMethod(name: string): boolean
  invoke(method: string, params: unknown[]): Promise<unknown>

  // HTTP handlers
  fetch(request: Request): Promise<Response>
}

export interface ListOptions {
  limit?: number
  offset?: number
  status?: string
}

/**
 * Attempt to load CDCDO - this will fail in RED phase
 * In GREEN phase, the module will exist and tests will pass
 */
async function loadCDCDO(): Promise<new (ctx: MockDOState, env: MockCDCEnv) => CDCDOContract> {
  // This dynamic import will fail because src/cdc.js doesn't exist yet
  const module = await import('../src/cdc.js')
  return module.CDCDO
}

describe('CDCDO CDC Pipeline Interface', () => {
  let ctx: MockDOState
  let env: MockCDCEnv
  let CDCDO: new (ctx: MockDOState, env: MockCDCEnv) => CDCDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    // This will throw in RED phase because the module doesn't exist
    CDCDO = await loadCDCDO()
  })

  describe('Pipeline Management', () => {
    describe('createPipeline()', () => {
      it('should create a new CDC pipeline', async () => {
        const instance = new CDCDO(ctx, env)
        const config: CDCPipelineConfig = {
          id: 'test-pipeline',
          name: 'Test Pipeline',
          sources: ['database.do'],
          batching: { maxSize: 1000, maxWaitMs: 5000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        }

        const created = await instance.createPipeline(config)
        expect(created.id).toBe('test-pipeline')
        expect(created.name).toBe('Test Pipeline')
        expect(created.sources).toContain('database.do')
        expect(created.enabled).toBe(true)
      })

      it('should auto-generate id if not provided', async () => {
        const instance = new CDCDO(ctx, env)
        const config = {
          id: '',
          sources: ['source1'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' as const },
          deliveryGuarantee: 'at-least-once' as const,
          enabled: true,
        }

        const created = await instance.createPipeline(config)
        expect(created.id).toBeDefined()
        expect(created.id.length).toBeGreaterThan(0)
      })

      it('should reject pipeline with no sources', async () => {
        const instance = new CDCDO(ctx, env)
        const config: CDCPipelineConfig = {
          id: 'no-sources',
          sources: [],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        }

        await expect(instance.createPipeline(config)).rejects.toThrow(/sources.*required|empty/i)
      })

      it('should validate batch configuration', async () => {
        const instance = new CDCDO(ctx, env)
        const config: CDCPipelineConfig = {
          id: 'invalid-batch',
          sources: ['source1'],
          batching: { maxSize: 0, maxWaitMs: -1 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        }

        await expect(instance.createPipeline(config)).rejects.toThrow(/batch.*invalid|maxSize|maxWaitMs/i)
      })

      it('should set default output compression', async () => {
        const instance = new CDCDO(ctx, env)
        const config: CDCPipelineConfig = {
          id: 'default-compression',
          sources: ['source1'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        }

        const created = await instance.createPipeline(config)
        expect(created.output.compression).toBeDefined()
      })
    })

    describe('getPipeline()', () => {
      it('should return null for non-existent pipeline', async () => {
        const instance = new CDCDO(ctx, env)
        const result = await instance.getPipeline('nonexistent')
        expect(result).toBeNull()
      })

      it('should return pipeline by id', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'my-pipeline',
          name: 'My Pipeline',
          sources: ['source1'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const result = await instance.getPipeline('my-pipeline')
        expect(result).not.toBeNull()
        expect(result!.id).toBe('my-pipeline')
        expect(result!.name).toBe('My Pipeline')
      })
    })

    describe('updatePipeline()', () => {
      it('should return null for non-existent pipeline', async () => {
        const instance = new CDCDO(ctx, env)
        const result = await instance.updatePipeline('nonexistent', { name: 'Updated' })
        expect(result).toBeNull()
      })

      it('should update pipeline properties', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'updatable',
          name: 'Original',
          sources: ['source1'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const updated = await instance.updatePipeline('updatable', { name: 'Updated Name' })
        expect(updated).not.toBeNull()
        expect(updated!.name).toBe('Updated Name')
        expect(updated!.id).toBe('updatable')
      })

      it('should merge updates with existing configuration', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'merge-test',
          name: 'Original',
          sources: ['source1'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const updated = await instance.updatePipeline('merge-test', {
          batching: { maxSize: 500, maxWaitMs: 1000 },
        })
        expect(updated!.name).toBe('Original')
        expect(updated!.batching.maxSize).toBe(500)
      })
    })

    describe('deletePipeline()', () => {
      it('should return false for non-existent pipeline', async () => {
        const instance = new CDCDO(ctx, env)
        const result = await instance.deletePipeline('nonexistent')
        expect(result).toBe(false)
      })

      it('should delete existing pipeline and return true', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'deletable',
          sources: ['source1'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const result = await instance.deletePipeline('deletable')
        expect(result).toBe(true)
      })

      it('should remove pipeline from storage', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'to-delete',
          sources: ['source1'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        await instance.deletePipeline('to-delete')
        const afterDelete = await instance.getPipeline('to-delete')
        expect(afterDelete).toBeNull()
      })
    })

    describe('listPipelines()', () => {
      it('should return empty array when no pipelines exist', async () => {
        const instance = new CDCDO(ctx, env)
        const result = await instance.listPipelines()
        expect(result).toEqual([])
      })

      it('should list all pipelines', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'p1',
          sources: ['s1'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })
        await instance.createPipeline({
          id: 'p2',
          sources: ['s2'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const result = await instance.listPipelines()
        expect(result).toHaveLength(2)
      })

      it('should respect limit option', async () => {
        const instance = new CDCDO(ctx, env)
        for (let i = 0; i < 10; i++) {
          await instance.createPipeline({
            id: `p-${i}`,
            sources: ['s1'],
            batching: { maxSize: 100, maxWaitMs: 1000 },
            output: { format: 'parquet' },
            deliveryGuarantee: 'at-least-once',
            enabled: true,
          })
        }

        const result = await instance.listPipelines({ limit: 5 })
        expect(result.length).toBeLessThanOrEqual(5)
      })
    })

    describe('enablePipeline() / disablePipeline()', () => {
      it('should enable a disabled pipeline', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'toggle-test',
          sources: ['s1'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: false,
        })

        const result = await instance.enablePipeline('toggle-test')
        expect(result).toBe(true)

        const pipeline = await instance.getPipeline('toggle-test')
        expect(pipeline!.enabled).toBe(true)
      })

      it('should disable an enabled pipeline', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'disable-test',
          sources: ['s1'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const result = await instance.disablePipeline('disable-test')
        expect(result).toBe(true)

        const pipeline = await instance.getPipeline('disable-test')
        expect(pipeline!.enabled).toBe(false)
      })

      it('should return false for non-existent pipeline', async () => {
        const instance = new CDCDO(ctx, env)
        const enableResult = await instance.enablePipeline('nonexistent')
        const disableResult = await instance.disablePipeline('nonexistent')
        expect(enableResult).toBe(false)
        expect(disableResult).toBe(false)
      })
    })
  })

  describe('Event Ingestion', () => {
    describe('ingestEvent()', () => {
      it('should ingest a single event', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'ingest-test',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const event = createSampleEvent({ source: 'test-source' })
        const result = await instance.ingestEvent('ingest-test', event)

        expect(result.eventId).toBe(event.id)
        expect(result.sequenceNumber).toBeGreaterThan(0)
      })

      it('should assign sequential sequence numbers', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'seq-test',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const event1 = createSampleEvent({ source: 'test-source' })
        const event2 = createSampleEvent({ source: 'test-source' })

        const result1 = await instance.ingestEvent('seq-test', event1)
        const result2 = await instance.ingestEvent('seq-test', event2)

        expect(result2.sequenceNumber).toBe(result1.sequenceNumber + 1)
      })

      it('should reject events from non-configured sources', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'source-check',
          sources: ['allowed-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const event = createSampleEvent({ source: 'unauthorized-source' })
        await expect(instance.ingestEvent('source-check', event)).rejects.toThrow(/source.*not allowed|unauthorized/i)
      })

      it('should reject events for disabled pipeline', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'disabled-pipeline',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: false,
        })

        const event = createSampleEvent({ source: 'test-source' })
        await expect(instance.ingestEvent('disabled-pipeline', event)).rejects.toThrow(/pipeline.*disabled|not enabled/i)
      })

      it('should throw for non-existent pipeline', async () => {
        const instance = new CDCDO(ctx, env)
        const event = createSampleEvent()
        await expect(instance.ingestEvent('nonexistent', event)).rejects.toThrow(/not found/i)
      })
    })

    describe('ingestBatch()', () => {
      it('should ingest multiple events at once', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'batch-ingest',
          sources: ['test-source'],
          batching: { maxSize: 1000, maxWaitMs: 5000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const events = createSampleEvents(10, 'test-source')
        const result = await instance.ingestBatch('batch-ingest', events)

        expect(result.eventIds).toHaveLength(10)
        expect(result.sequenceNumbers).toHaveLength(10)
      })

      it('should maintain ordering across batch ingestion', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'order-test',
          sources: ['test-source'],
          batching: { maxSize: 1000, maxWaitMs: 5000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const events = createSampleEvents(5, 'test-source')
        const result = await instance.ingestBatch('order-test', events)

        // Sequence numbers should be strictly increasing
        for (let i = 1; i < result.sequenceNumbers.length; i++) {
          expect(result.sequenceNumbers[i]).toBeGreaterThan(result.sequenceNumbers[i - 1]!)
        }
      })

      it('should be atomic - all or nothing', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'atomic-test',
          sources: ['valid-source'],
          batching: { maxSize: 1000, maxWaitMs: 5000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        // Mix valid and invalid events
        const events = [
          createSampleEvent({ source: 'valid-source' }),
          createSampleEvent({ source: 'invalid-source' }), // This should cause rejection
          createSampleEvent({ source: 'valid-source' }),
        ]

        await expect(instance.ingestBatch('atomic-test', events)).rejects.toThrow()

        // No events should have been ingested
        const stats = await instance.getStats('atomic-test')
        expect(stats.totalEventsReceived).toBe(0)
      })
    })
  })

  describe('Event Ordering', () => {
    describe('getEventsBySequence()', () => {
      it('should return events in sequence order', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'seq-order',
          sources: ['test-source'],
          batching: { maxSize: 1000, maxWaitMs: 5000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const events = createSampleEvents(10, 'test-source')
        await instance.ingestBatch('seq-order', events)

        const retrieved = await instance.getEventsBySequence('seq-order', 1, 5)
        expect(retrieved).toHaveLength(5)

        // Verify ordering
        for (let i = 1; i < retrieved.length; i++) {
          expect(retrieved[i]!.sequenceNumber).toBeGreaterThan(retrieved[i - 1]!.sequenceNumber!)
        }
      })

      it('should return empty array for out-of-range sequence', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'out-of-range',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const retrieved = await instance.getEventsBySequence('out-of-range', 1000, 2000)
        expect(retrieved).toEqual([])
      })
    })

    describe('getLatestSequence()', () => {
      it('should return 0 for pipeline with no events', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'empty-seq',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const sequence = await instance.getLatestSequence('empty-seq')
        expect(sequence).toBe(0)
      })

      it('should return the latest sequence number', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'latest-seq',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const events = createSampleEvents(5, 'test-source')
        await instance.ingestBatch('latest-seq', events)

        const sequence = await instance.getLatestSequence('latest-seq')
        expect(sequence).toBe(5)
      })
    })

    describe('setCheckpoint() / getCheckpoint()', () => {
      it('should set and retrieve consumer checkpoint', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'checkpoint-test',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        await instance.setCheckpoint('checkpoint-test', 'consumer-1', 42)
        const checkpoint = await instance.getCheckpoint('checkpoint-test', 'consumer-1')
        expect(checkpoint).toBe(42)
      })

      it('should return 0 for non-existent checkpoint', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'no-checkpoint',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const checkpoint = await instance.getCheckpoint('no-checkpoint', 'unknown-consumer')
        expect(checkpoint).toBe(0)
      })

      it('should maintain separate checkpoints per consumer', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'multi-consumer',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        await instance.setCheckpoint('multi-consumer', 'consumer-1', 10)
        await instance.setCheckpoint('multi-consumer', 'consumer-2', 20)

        const cp1 = await instance.getCheckpoint('multi-consumer', 'consumer-1')
        const cp2 = await instance.getCheckpoint('multi-consumer', 'consumer-2')

        expect(cp1).toBe(10)
        expect(cp2).toBe(20)
      })
    })
  })

  describe('Delivery Guarantees', () => {
    describe('acknowledgeEvent()', () => {
      it('should acknowledge a delivered event', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'ack-test',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const event = createSampleEvent({ source: 'test-source' })
        await instance.ingestEvent('ack-test', event)

        const ack = await instance.acknowledgeEvent('ack-test', event.id, 'consumer-1')
        expect(ack.eventId).toBe(event.id)
        expect(ack.status).toBe('acked')
        expect(ack.consumerId).toBe('consumer-1')
      })

      it('should track acknowledgment timestamp', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'ack-time',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const event = createSampleEvent({ source: 'test-source' })
        const beforeAck = Date.now()
        await instance.ingestEvent('ack-time', event)

        const ack = await instance.acknowledgeEvent('ack-time', event.id, 'consumer-1')
        expect(ack.timestamp).toBeGreaterThanOrEqual(beforeAck)
      })
    })

    describe('acknowledgeEvents()', () => {
      it('should acknowledge multiple events at once', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'batch-ack',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const events = createSampleEvents(5, 'test-source')
        await instance.ingestBatch('batch-ack', events)

        const eventIds = events.map((e) => e.id)
        const acks = await instance.acknowledgeEvents('batch-ack', eventIds, 'consumer-1')

        expect(acks).toHaveLength(5)
        expect(acks.every((a) => a.status === 'acked')).toBe(true)
      })
    })

    describe('getPendingDeliveries()', () => {
      it('should return unacknowledged events', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'pending-test',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const events = createSampleEvents(5, 'test-source')
        await instance.ingestBatch('pending-test', events)

        // Acknowledge only first 2
        await instance.acknowledgeEvents('pending-test', [events[0]!.id, events[1]!.id], 'consumer-1')

        const pending = await instance.getPendingDeliveries('pending-test', 'consumer-1')
        expect(pending).toHaveLength(3)
      })

      it('should return empty array when all events acknowledged', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'all-acked',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const events = createSampleEvents(3, 'test-source')
        await instance.ingestBatch('all-acked', events)
        await instance.acknowledgeEvents(
          'all-acked',
          events.map((e) => e.id),
          'consumer-1'
        )

        const pending = await instance.getPendingDeliveries('all-acked', 'consumer-1')
        expect(pending).toEqual([])
      })
    })

    describe('replayEvents()', () => {
      it('should replay events from a specific sequence', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'replay-test',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const events = createSampleEvents(10, 'test-source')
        await instance.ingestBatch('replay-test', events)

        const replayed = await instance.replayEvents('replay-test', 5)
        expect(replayed.length).toBe(6) // Events 5-10
        expect(replayed[0]!.sequenceNumber).toBe(5)
      })

      it('should replay events within a sequence range', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'replay-range',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const events = createSampleEvents(10, 'test-source')
        await instance.ingestBatch('replay-range', events)

        const replayed = await instance.replayEvents('replay-range', 3, 7)
        expect(replayed.length).toBe(5) // Events 3-7
      })
    })
  })

  describe('Batch Management', () => {
    describe('getBatch()', () => {
      it('should return null for non-existent batch', async () => {
        const instance = new CDCDO(ctx, env)
        const result = await instance.getBatch('nonexistent')
        expect(result).toBeNull()
      })
    })

    describe('listBatches()', () => {
      it('should return empty array when no batches exist', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'no-batches',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const batches = await instance.listBatches('no-batches')
        expect(batches).toEqual([])
      })
    })

    describe('flushBatch()', () => {
      it('should flush pending events to a batch', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'flush-test',
          sources: ['test-source'],
          batching: { maxSize: 1000, maxWaitMs: 60000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const events = createSampleEvents(10, 'test-source')
        await instance.ingestBatch('flush-test', events)

        const batch = await instance.flushBatch('flush-test')
        expect(batch.batchId).toBeDefined()
        expect(batch.pipelineId).toBe('flush-test')
        expect(batch.eventCount).toBe(10)
        expect(batch.status).toMatch(/pending|flushing|completed/)
      })

      it('should track batch sequence numbers', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'seq-batch',
          sources: ['test-source'],
          batching: { maxSize: 1000, maxWaitMs: 60000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const events = createSampleEvents(5, 'test-source')
        await instance.ingestBatch('seq-batch', events)

        const batch = await instance.flushBatch('seq-batch')
        expect(batch.firstSequence).toBeDefined()
        expect(batch.lastSequence).toBeDefined()
        expect(batch.lastSequence).toBeGreaterThanOrEqual(batch.firstSequence!)
      })
    })

    describe('retryBatch()', () => {
      it('should retry a failed batch', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'retry-pipeline',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const events = createSampleEvents(5, 'test-source')
        await instance.ingestBatch('retry-pipeline', events)
        const originalBatch = await instance.flushBatch('retry-pipeline')

        // Simulate failure and retry
        const retriedBatch = await instance.retryBatch(originalBatch.batchId)
        expect(retriedBatch.batchId).toBe(originalBatch.batchId)
        expect(retriedBatch.eventCount).toBe(originalBatch.eventCount)
      })
    })
  })

  describe('Parquet Operations', () => {
    describe('generateParquet()', () => {
      it('should generate Parquet file for a batch', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'parquet-gen',
          sources: ['test-source'],
          batching: { maxSize: 1000, maxWaitMs: 60000 },
          output: { format: 'parquet', compression: 'snappy' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const events = createSampleEvents(10, 'test-source')
        await instance.ingestBatch('parquet-gen', events)
        const batch = await instance.flushBatch('parquet-gen')

        const result = await instance.generateParquet('parquet-gen', batch.batchId)
        expect(result.path).toBeDefined()
        expect(result.path).toMatch(/\.parquet$/)
        expect(result.sizeBytes).toBeGreaterThan(0)
      })

      it('should use configured partitioning', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'partitioned',
          sources: ['test-source'],
          batching: { maxSize: 1000, maxWaitMs: 60000 },
          output: {
            format: 'parquet',
            partitioning: {
              timeField: 'timestamp',
              timeGranularity: 'day',
            },
            pathPrefix: 'cdc-data',
          },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const events = createSampleEvents(5, 'test-source')
        await instance.ingestBatch('partitioned', events)
        const batch = await instance.flushBatch('partitioned')

        const result = await instance.generateParquet('partitioned', batch.batchId)
        expect(result.path).toContain('cdc-data')
        // Should include date-based partition
        expect(result.path).toMatch(/\d{4}\/\d{2}\/\d{2}/)
      })
    })

    describe('listParquetFiles()', () => {
      it('should list generated Parquet files', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'list-parquet',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const events = createSampleEvents(5, 'test-source')
        await instance.ingestBatch('list-parquet', events)
        const batch = await instance.flushBatch('list-parquet')
        await instance.generateParquet('list-parquet', batch.batchId)

        const files = await instance.listParquetFiles('list-parquet')
        expect(files).toHaveLength(1)
        expect(files[0]).toMatch(/\.parquet$/)
      })

      it('should filter by time range', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'time-filter',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const now = Date.now()
        const files = await instance.listParquetFiles('time-filter', {
          since: now - 3600000, // Last hour
          until: now,
        })

        expect(Array.isArray(files)).toBe(true)
      })
    })
  })

  describe('Statistics', () => {
    describe('getStats()', () => {
      it('should return overall statistics', async () => {
        const instance = new CDCDO(ctx, env)
        const stats = await instance.getStats()

        expect(stats).toHaveProperty('totalEventsReceived')
        expect(stats).toHaveProperty('totalEventsProcessed')
        expect(stats).toHaveProperty('totalBatches')
        expect(stats).toHaveProperty('totalBytesWritten')
        expect(stats).toHaveProperty('pendingEvents')
        expect(stats).toHaveProperty('averageBatchSize')
        expect(stats).toHaveProperty('averageLatencyMs')
        expect(stats).toHaveProperty('errorCount')
      })

      it('should return pipeline-specific statistics', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'stats-pipeline',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const events = createSampleEvents(10, 'test-source')
        await instance.ingestBatch('stats-pipeline', events)

        const stats = await instance.getStats('stats-pipeline')
        expect(stats.totalEventsReceived).toBe(10)
        expect(stats.pendingEvents).toBe(10)
      })
    })
  })

  describe('RPC interface', () => {
    describe('hasMethod()', () => {
      it('should return true for allowed CDC methods', async () => {
        const instance = new CDCDO(ctx, env)
        expect(instance.hasMethod('createPipeline')).toBe(true)
        expect(instance.hasMethod('ingestEvent')).toBe(true)
        expect(instance.hasMethod('flushBatch')).toBe(true)
        expect(instance.hasMethod('generateParquet')).toBe(true)
      })

      it('should return false for non-existent methods', async () => {
        const instance = new CDCDO(ctx, env)
        expect(instance.hasMethod('nonexistent')).toBe(false)
        expect(instance.hasMethod('eval')).toBe(false)
      })
    })

    describe('invoke()', () => {
      it('should invoke allowed method with params', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'invoke-test',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const result = await instance.invoke('getPipeline', ['invoke-test'])
        expect(result).toHaveProperty('id', 'invoke-test')
      })

      it('should throw error for disallowed method', async () => {
        const instance = new CDCDO(ctx, env)
        await expect(instance.invoke('dangerous', [])).rejects.toThrow(/Method not allowed|not found/i)
      })
    })
  })

  describe('HTTP fetch() handler', () => {
    describe('RPC endpoint', () => {
      it('should handle POST /rpc with method call', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'http-test',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const request = new Request('http://cdc.do/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'getPipeline', params: ['http-test'] }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const result = (await response.json()) as { result: unknown }
        expect(result).toHaveProperty('result')
        expect(result.result).toHaveProperty('id', 'http-test')
      })

      it('should return error for invalid method', async () => {
        const instance = new CDCDO(ctx, env)
        const request = new Request('http://cdc.do/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ method: 'invalid', params: [] }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(400)

        const result = (await response.json()) as { error: string }
        expect(result).toHaveProperty('error')
      })
    })

    describe('REST API endpoint', () => {
      it('should handle GET /api/pipelines', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'rest-test',
          sources: ['s1'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const request = new Request('http://cdc.do/api/pipelines', { method: 'GET' })
        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as unknown[]
        expect(Array.isArray(data)).toBe(true)
      })

      it('should handle GET /api/pipelines/:id', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'get-rest',
          sources: ['s1'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const request = new Request('http://cdc.do/api/pipelines/get-rest', { method: 'GET' })
        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as { id: string }
        expect(data.id).toBe('get-rest')
      })

      it('should handle POST /api/pipelines', async () => {
        const instance = new CDCDO(ctx, env)
        const request = new Request('http://cdc.do/api/pipelines', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 'new-pipeline',
            sources: ['s1'],
            batching: { maxSize: 100, maxWaitMs: 1000 },
            output: { format: 'parquet' },
            deliveryGuarantee: 'at-least-once',
            enabled: true,
          }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(201)

        const data = (await response.json()) as { id: string }
        expect(data.id).toBe('new-pipeline')
      })

      it('should handle POST /api/pipelines/:id/events for event ingestion', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'ingest-api',
          sources: ['test-source'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const event = createSampleEvent({ source: 'test-source' })
        const request = new Request('http://cdc.do/api/pipelines/ingest-api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as { eventId: string; sequenceNumber: number }
        expect(data.eventId).toBe(event.id)
        expect(data.sequenceNumber).toBeGreaterThan(0)
      })

      it('should handle POST /api/pipelines/:id/flush', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'flush-api',
          sources: ['test-source'],
          batching: { maxSize: 1000, maxWaitMs: 60000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const events = createSampleEvents(5, 'test-source')
        await instance.ingestBatch('flush-api', events)

        const request = new Request('http://cdc.do/api/pipelines/flush-api/flush', {
          method: 'POST',
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as BatchStatus
        expect(data.pipelineId).toBe('flush-api')
        expect(data.eventCount).toBe(5)
      })

      it('should handle GET /api/stats', async () => {
        const instance = new CDCDO(ctx, env)
        const request = new Request('http://cdc.do/api/stats', { method: 'GET' })
        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as CDCStats
        expect(data).toHaveProperty('totalEventsReceived')
        expect(data).toHaveProperty('totalBatches')
      })

      it('should handle DELETE /api/pipelines/:id', async () => {
        const instance = new CDCDO(ctx, env)
        await instance.createPipeline({
          id: 'deletable',
          sources: ['s1'],
          batching: { maxSize: 100, maxWaitMs: 1000 },
          output: { format: 'parquet' },
          deliveryGuarantee: 'at-least-once',
          enabled: true,
        })

        const request = new Request('http://cdc.do/api/pipelines/deletable', { method: 'DELETE' })
        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const getResponse = await instance.fetch(
          new Request('http://cdc.do/api/pipelines/deletable', { method: 'GET' })
        )
        expect(getResponse.status).toBe(404)
      })
    })

    describe('HATEOAS discovery', () => {
      it('should return discovery info at GET /', async () => {
        const instance = new CDCDO(ctx, env)
        const request = new Request('http://cdc.do/', { method: 'GET' })
        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as Record<string, unknown>
        expect(data.api).toBeDefined()
        expect(data.links).toBeDefined()
        expect(data.discover).toBeDefined()
      })

      it('should include available RPC methods in discovery', async () => {
        const instance = new CDCDO(ctx, env)
        const request = new Request('http://cdc.do/', { method: 'GET' })
        const response = await instance.fetch(request)

        const data = (await response.json()) as { discover: { methods: Array<{ name: string }> } }
        const methodNames = data.discover.methods.map((m) => m.name)
        expect(methodNames).toContain('createPipeline')
        expect(methodNames).toContain('ingestEvent')
        expect(methodNames).toContain('flushBatch')
        expect(methodNames).toContain('generateParquet')
      })
    })
  })
})
