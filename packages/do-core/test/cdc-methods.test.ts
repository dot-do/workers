/**
 * CDC Methods Integration Tests - RED Phase
 *
 * These tests verify that all 6 CDC (Change Data Capture) methods exist
 * NATIVELY on the DO class, without requiring any patching scripts.
 *
 * The purpose is to confirm that CDC functionality is properly integrated
 * into the core DO class and not bolted on via external patching.
 *
 * Expected CDC methods:
 * 1. createCDCBatch - Create a new batch for capturing changes
 * 2. getCDCBatch - Retrieve an existing CDC batch by ID
 * 3. queryCDCBatches - Query batches by criteria
 * 4. transformToParquet - Convert batch data to Parquet format
 * 5. outputToR2 - Write CDC data to R2 storage
 * 6. processCDCPipeline - Execute the full CDC pipeline
 *
 * RED PHASE: These tests should PASS because the methods are already
 * integrated into the DO class. If they fail, it means the CDC
 * architecture still depends on patching scripts.
 *
 * @see workers-0695 - RED: Test that CDC methods exist without patching scripts
 * @see workers-r99l - EPIC: CDC Architecture - Remove Code Patching Anti-pattern
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { DOCore, type DOState, type DOEnv } from '../src/index.js'
import { createMockState } from './helpers.js'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * CDC Batch represents a collection of change events captured together
 */
interface CDCBatch {
  /** Unique batch identifier */
  id: string
  /** Source table/collection the changes came from */
  sourceTable: string
  /** Operation type: insert, update, delete, or mixed */
  operation: 'insert' | 'update' | 'delete' | 'mixed'
  /** Array of change events in this batch */
  events: CDCEvent[]
  /** Unix timestamp when batch was created */
  createdAt: number
  /** Unix timestamp when batch was finalized */
  finalizedAt: number | null
  /** Current batch status */
  status: 'pending' | 'finalized' | 'transformed' | 'output'
  /** Total number of events in batch */
  eventCount: number
  /** Metadata about the batch */
  metadata?: Record<string, unknown>
}

/**
 * Individual CDC event representing a single change
 */
interface CDCEvent {
  /** Event ID */
  id: string
  /** Type of change */
  operation: 'insert' | 'update' | 'delete'
  /** Record ID that changed */
  recordId: string
  /** Data before the change (null for insert) */
  before: Record<string, unknown> | null
  /** Data after the change (null for delete) */
  after: Record<string, unknown> | null
  /** Timestamp of the change */
  timestamp: number
  /** Transaction ID if applicable */
  transactionId?: string
}

/**
 * Query criteria for finding CDC batches
 */
interface CDCBatchQuery {
  /** Filter by source table */
  sourceTable?: string
  /** Filter by status */
  status?: CDCBatch['status']
  /** Filter by operation type */
  operation?: CDCBatch['operation']
  /** Created after this timestamp */
  createdAfter?: number
  /** Created before this timestamp */
  createdBefore?: number
  /** Maximum results to return */
  limit?: number
  /** Offset for pagination */
  offset?: number
}

/**
 * Result of Parquet transformation
 */
interface ParquetResult {
  /** The transformed Parquet binary data */
  data: ArrayBuffer
  /** Original batch ID */
  batchId: string
  /** Number of rows in the Parquet file */
  rowCount: number
  /** Size in bytes */
  sizeBytes: number
  /** Schema information */
  schema: ParquetSchema
  /** Compression used */
  compression: 'none' | 'snappy' | 'gzip' | 'zstd'
}

interface ParquetSchema {
  fields: Array<{
    name: string
    type: string
    nullable: boolean
  }>
}

/**
 * Result of R2 output operation
 */
interface R2OutputResult {
  /** R2 object key where data was stored */
  key: string
  /** R2 bucket name */
  bucket: string
  /** ETag of the stored object */
  etag: string
  /** Size in bytes */
  sizeBytes: number
  /** Batch ID that was output */
  batchId: string
  /** Timestamp when written */
  writtenAt: number
}

/**
 * CDC Pipeline execution result
 */
interface CDCPipelineResult {
  /** Batches processed */
  batchesProcessed: number
  /** Total events processed */
  eventsProcessed: number
  /** Bytes written to R2 */
  bytesWritten: number
  /** R2 keys created */
  outputKeys: string[]
  /** Any errors encountered */
  errors: CDCPipelineError[]
  /** Pipeline execution duration in ms */
  durationMs: number
  /** Whether pipeline completed successfully */
  success: boolean
}

interface CDCPipelineError {
  batchId: string
  stage: 'transform' | 'output'
  error: string
}

/**
 * CDC Pipeline options
 */
interface CDCPipelineOptions {
  /** Process only batches from specific source tables */
  sourceTables?: string[]
  /** Process only batches with specific status */
  status?: CDCBatch['status']
  /** Maximum batches to process in one run */
  maxBatches?: number
  /** Compression for Parquet output */
  compression?: ParquetResult['compression']
  /** R2 path prefix */
  pathPrefix?: string
  /** Dry run - don't actually output to R2 */
  dryRun?: boolean
}

/**
 * Interface defining the CDC methods that must exist on DOCore
 */
interface ICDCMethods {
  /** Create a new CDC batch for capturing changes */
  createCDCBatch(sourceTable: string, operation: CDCBatch['operation'], events?: CDCEvent[]): Promise<CDCBatch>

  /** Get an existing CDC batch by ID */
  getCDCBatch(batchId: string): Promise<CDCBatch | null>

  /** Query CDC batches by criteria */
  queryCDCBatches(query?: CDCBatchQuery): Promise<CDCBatch[]>

  /** Transform a batch to Parquet format */
  transformToParquet(batchId: string, options?: { compression?: ParquetResult['compression'] }): Promise<ParquetResult>

  /** Output CDC data to R2 storage */
  outputToR2(parquetData: ParquetResult, options?: { bucket?: string; pathPrefix?: string }): Promise<R2OutputResult>

  /** Execute the full CDC pipeline */
  processCDCPipeline(options?: CDCPipelineOptions): Promise<CDCPipelineResult>
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create sample CDC events for testing
 */
function createSampleCDCEvents(count: number): CDCEvent[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `evt-${Date.now()}-${i}`,
    operation: 'insert' as const,
    recordId: `rec-${i}`,
    before: null,
    after: { id: `rec-${i}`, name: `Record ${i}`, value: i * 100 },
    timestamp: Date.now() + i,
  }))
}

// ============================================================================
// Tests
// ============================================================================

describe('CDC Methods Native Integration', () => {
  let ctx: DOState
  let env: DOEnv
  let doInstance: DOCore

  beforeEach(() => {
    ctx = createMockState()
    env = {}
    doInstance = new DOCore(ctx, env)
  })

  describe('Method Existence (No Patching Required)', () => {
    /**
     * These tests verify that CDC methods exist on DOCore without any patching.
     * If these fail, it indicates the CDC functionality still relies on
     * external patching scripts which is an anti-pattern we want to eliminate.
     */

    it('should have createCDCBatch method defined', () => {
      expect(typeof (doInstance as unknown as ICDCMethods).createCDCBatch).toBe('function')
    })

    it('should have getCDCBatch method defined', () => {
      expect(typeof (doInstance as unknown as ICDCMethods).getCDCBatch).toBe('function')
    })

    it('should have queryCDCBatches method defined', () => {
      expect(typeof (doInstance as unknown as ICDCMethods).queryCDCBatches).toBe('function')
    })

    it('should have transformToParquet method defined', () => {
      expect(typeof (doInstance as unknown as ICDCMethods).transformToParquet).toBe('function')
    })

    it('should have outputToR2 method defined', () => {
      expect(typeof (doInstance as unknown as ICDCMethods).outputToR2).toBe('function')
    })

    it('should have processCDCPipeline method defined', () => {
      expect(typeof (doInstance as unknown as ICDCMethods).processCDCPipeline).toBe('function')
    })

    it('should have all 6 CDC methods without running any patch scripts', () => {
      const cdcMethods = [
        'createCDCBatch',
        'getCDCBatch',
        'queryCDCBatches',
        'transformToParquet',
        'outputToR2',
        'processCDCPipeline',
      ] as const

      for (const method of cdcMethods) {
        const hasMethod = typeof (doInstance as unknown as Record<string, unknown>)[method] === 'function'
        expect(hasMethod, `Expected ${method} to be a function on DOCore`).toBe(true)
      }
    })
  })

  describe('createCDCBatch', () => {
    it('should create a batch with source table and operation', async () => {
      const batch = await (doInstance as unknown as ICDCMethods).createCDCBatch('users', 'insert')

      expect(batch).toBeDefined()
      expect(batch.id).toBeDefined()
      expect(batch.sourceTable).toBe('users')
      expect(batch.operation).toBe('insert')
      expect(batch.status).toBe('pending')
      expect(batch.eventCount).toBe(0)
      expect(batch.createdAt).toBeLessThanOrEqual(Date.now())
    })

    it('should create a batch with initial events', async () => {
      const events = createSampleCDCEvents(5)
      const batch = await (doInstance as unknown as ICDCMethods).createCDCBatch('orders', 'mixed', events)

      expect(batch).toBeDefined()
      expect(batch.events).toHaveLength(5)
      expect(batch.eventCount).toBe(5)
      expect(batch.operation).toBe('mixed')
    })

    it('should generate unique batch IDs', async () => {
      const batch1 = await (doInstance as unknown as ICDCMethods).createCDCBatch('users', 'insert')
      const batch2 = await (doInstance as unknown as ICDCMethods).createCDCBatch('users', 'insert')

      expect(batch1.id).not.toBe(batch2.id)
    })
  })

  describe('getCDCBatch', () => {
    it('should retrieve an existing batch by ID', async () => {
      const created = await (doInstance as unknown as ICDCMethods).createCDCBatch('products', 'update')
      const retrieved = await (doInstance as unknown as ICDCMethods).getCDCBatch(created.id)

      expect(retrieved).toBeDefined()
      expect(retrieved?.id).toBe(created.id)
      expect(retrieved?.sourceTable).toBe('products')
    })

    it('should return null for non-existent batch', async () => {
      const result = await (doInstance as unknown as ICDCMethods).getCDCBatch('nonexistent-batch-id')
      expect(result).toBeNull()
    })
  })

  describe('queryCDCBatches', () => {
    it('should return all batches when no query provided', async () => {
      await (doInstance as unknown as ICDCMethods).createCDCBatch('users', 'insert')
      await (doInstance as unknown as ICDCMethods).createCDCBatch('orders', 'update')
      await (doInstance as unknown as ICDCMethods).createCDCBatch('products', 'delete')

      const batches = await (doInstance as unknown as ICDCMethods).queryCDCBatches()
      expect(batches.length).toBeGreaterThanOrEqual(3)
    })

    it('should filter by source table', async () => {
      await (doInstance as unknown as ICDCMethods).createCDCBatch('users', 'insert')
      await (doInstance as unknown as ICDCMethods).createCDCBatch('users', 'update')
      await (doInstance as unknown as ICDCMethods).createCDCBatch('orders', 'insert')

      const batches = await (doInstance as unknown as ICDCMethods).queryCDCBatches({ sourceTable: 'users' })
      expect(batches.every(b => b.sourceTable === 'users')).toBe(true)
    })

    it('should filter by status', async () => {
      await (doInstance as unknown as ICDCMethods).createCDCBatch('users', 'insert')

      const batches = await (doInstance as unknown as ICDCMethods).queryCDCBatches({ status: 'pending' })
      expect(batches.every(b => b.status === 'pending')).toBe(true)
    })

    it('should respect limit parameter', async () => {
      for (let i = 0; i < 10; i++) {
        await (doInstance as unknown as ICDCMethods).createCDCBatch('users', 'insert')
      }

      const batches = await (doInstance as unknown as ICDCMethods).queryCDCBatches({ limit: 5 })
      expect(batches.length).toBeLessThanOrEqual(5)
    })
  })

  describe('transformToParquet', () => {
    it('should transform a batch to Parquet format', async () => {
      const events = createSampleCDCEvents(10)
      const batch = await (doInstance as unknown as ICDCMethods).createCDCBatch('users', 'insert', events)
      const parquet = await (doInstance as unknown as ICDCMethods).transformToParquet(batch.id)

      expect(parquet).toBeDefined()
      expect(parquet.batchId).toBe(batch.id)
      expect(parquet.rowCount).toBe(10)
      expect(parquet.data).toBeInstanceOf(ArrayBuffer)
      expect(parquet.sizeBytes).toBeGreaterThan(0)
    })

    it('should apply compression when specified', async () => {
      const events = createSampleCDCEvents(100)
      const batch = await (doInstance as unknown as ICDCMethods).createCDCBatch('events', 'mixed', events)

      const uncompressed = await (doInstance as unknown as ICDCMethods).transformToParquet(batch.id, { compression: 'none' })
      const compressed = await (doInstance as unknown as ICDCMethods).transformToParquet(batch.id, { compression: 'snappy' })

      expect(compressed.compression).toBe('snappy')
      expect(uncompressed.compression).toBe('none')
      // Compressed should generally be smaller (though not guaranteed for small data)
    })

    it('should throw error for non-existent batch', async () => {
      await expect(
        (doInstance as unknown as ICDCMethods).transformToParquet('nonexistent')
      ).rejects.toThrow()
    })

    it('should include schema information', async () => {
      const events = createSampleCDCEvents(5)
      const batch = await (doInstance as unknown as ICDCMethods).createCDCBatch('users', 'insert', events)
      const parquet = await (doInstance as unknown as ICDCMethods).transformToParquet(batch.id)

      expect(parquet.schema).toBeDefined()
      expect(parquet.schema.fields).toBeInstanceOf(Array)
      expect(parquet.schema.fields.length).toBeGreaterThan(0)
    })
  })

  describe('outputToR2', () => {
    it('should output Parquet data to R2', async () => {
      const events = createSampleCDCEvents(10)
      const batch = await (doInstance as unknown as ICDCMethods).createCDCBatch('users', 'insert', events)
      const parquet = await (doInstance as unknown as ICDCMethods).transformToParquet(batch.id)
      const result = await (doInstance as unknown as ICDCMethods).outputToR2(parquet)

      expect(result).toBeDefined()
      expect(result.key).toBeDefined()
      expect(result.batchId).toBe(batch.id)
      expect(result.sizeBytes).toBe(parquet.sizeBytes)
      expect(result.etag).toBeDefined()
    })

    it('should use custom path prefix when specified', async () => {
      const events = createSampleCDCEvents(5)
      const batch = await (doInstance as unknown as ICDCMethods).createCDCBatch('logs', 'insert', events)
      const parquet = await (doInstance as unknown as ICDCMethods).transformToParquet(batch.id)
      const result = await (doInstance as unknown as ICDCMethods).outputToR2(parquet, { pathPrefix: 'cdc/logs' })

      expect(result.key).toContain('cdc/logs')
    })
  })

  describe('processCDCPipeline', () => {
    it('should process the full CDC pipeline', async () => {
      // Create several batches
      const events1 = createSampleCDCEvents(10)
      const events2 = createSampleCDCEvents(20)
      await (doInstance as unknown as ICDCMethods).createCDCBatch('users', 'insert', events1)
      await (doInstance as unknown as ICDCMethods).createCDCBatch('orders', 'update', events2)

      const result = await (doInstance as unknown as ICDCMethods).processCDCPipeline()

      expect(result).toBeDefined()
      expect(result.batchesProcessed).toBeGreaterThan(0)
      expect(result.eventsProcessed).toBeGreaterThan(0)
      expect(result.success).toBe(true)
    })

    it('should filter by source tables when specified', async () => {
      await (doInstance as unknown as ICDCMethods).createCDCBatch('users', 'insert', createSampleCDCEvents(5))
      await (doInstance as unknown as ICDCMethods).createCDCBatch('orders', 'update', createSampleCDCEvents(5))

      const result = await (doInstance as unknown as ICDCMethods).processCDCPipeline({
        sourceTables: ['users'],
      })

      expect(result.batchesProcessed).toBeGreaterThanOrEqual(1)
    })

    it('should respect maxBatches option', async () => {
      // Create many batches
      for (let i = 0; i < 10; i++) {
        await (doInstance as unknown as ICDCMethods).createCDCBatch('events', 'insert', createSampleCDCEvents(5))
      }

      const result = await (doInstance as unknown as ICDCMethods).processCDCPipeline({
        maxBatches: 3,
      })

      expect(result.batchesProcessed).toBeLessThanOrEqual(3)
    })

    it('should support dry run mode', async () => {
      await (doInstance as unknown as ICDCMethods).createCDCBatch('users', 'insert', createSampleCDCEvents(10))

      const result = await (doInstance as unknown as ICDCMethods).processCDCPipeline({
        dryRun: true,
      })

      expect(result.success).toBe(true)
      expect(result.bytesWritten).toBe(0) // No actual writes in dry run
      expect(result.outputKeys).toHaveLength(0)
    })

    it('should report errors without failing completely', async () => {
      // This tests resilience - if one batch fails, others should still process
      await (doInstance as unknown as ICDCMethods).createCDCBatch('valid', 'insert', createSampleCDCEvents(5))

      const result = await (doInstance as unknown as ICDCMethods).processCDCPipeline()

      // Even with potential errors, pipeline should complete
      expect(result).toBeDefined()
      expect(typeof result.durationMs).toBe('number')
    })
  })

  describe('Integration - Full Pipeline Flow', () => {
    it('should execute create -> transform -> output flow', async () => {
      // Step 1: Create batch with events
      const events = createSampleCDCEvents(25)
      const batch = await (doInstance as unknown as ICDCMethods).createCDCBatch('customers', 'insert', events)
      expect(batch.status).toBe('pending')

      // Step 2: Transform to Parquet
      const parquet = await (doInstance as unknown as ICDCMethods).transformToParquet(batch.id, {
        compression: 'snappy',
      })
      expect(parquet.rowCount).toBe(25)
      expect(parquet.compression).toBe('snappy')

      // Step 3: Output to R2
      const output = await (doInstance as unknown as ICDCMethods).outputToR2(parquet, {
        pathPrefix: 'cdc/customers',
      })
      expect(output.batchId).toBe(batch.id)
      expect(output.key).toContain('customers')

      // Verify batch status updated after output
      const finalBatch = await (doInstance as unknown as ICDCMethods).getCDCBatch(batch.id)
      expect(finalBatch?.status).toBe('output')
    })

    it('should handle multiple batches across tables', async () => {
      const tables = ['users', 'orders', 'products', 'inventory']

      for (const table of tables) {
        const events = createSampleCDCEvents(Math.floor(Math.random() * 20) + 5)
        await (doInstance as unknown as ICDCMethods).createCDCBatch(table, 'mixed', events)
      }

      const result = await (doInstance as unknown as ICDCMethods).processCDCPipeline()

      expect(result.batchesProcessed).toBeGreaterThanOrEqual(tables.length)
      expect(result.success).toBe(true)
    })
  })
})
