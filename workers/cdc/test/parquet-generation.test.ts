/**
 * RED Tests: cdc.do Parquet File Generation
 *
 * These tests define the contract for the CDC worker's Parquet file generation capabilities.
 * Parquet files provide efficient columnar storage for CDC events.
 *
 * Per ARCHITECTURE.md:
 * - CDC pipeline generates Parquet files from batched events
 * - Support compression (snappy, gzip, zstd)
 * - Partitioning by time and custom fields
 * - Store in R2 bucket
 *
 * RED PHASE: These tests MUST FAIL because CDCDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-k6ud).
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  createSampleEvents,
  type MockDOState,
  type MockCDCEnv,
} from './helpers.js'

/**
 * Parquet file metadata
 */
interface ParquetFileMetadata {
  path: string
  sizeBytes: number
  rowCount: number
  createdAt: number
  compression: string
  schema: ParquetSchema
  partitionValues?: Record<string, string>
}

/**
 * Parquet schema definition
 */
interface ParquetSchema {
  fields: Array<{
    name: string
    type: 'string' | 'int64' | 'double' | 'boolean' | 'timestamp' | 'json'
    nullable: boolean
  }>
}

/**
 * Interface for Parquet generation testing
 */
interface CDCParquetContract {
  createPipeline(config: {
    id: string
    sources: string[]
    batching: { maxSize: number; maxWaitMs: number }
    output: {
      format: 'parquet'
      compression?: 'none' | 'snappy' | 'gzip' | 'zstd'
      partitioning?: {
        fields?: string[]
        timeField?: string
        timeGranularity?: 'hour' | 'day' | 'month'
      }
      pathPrefix?: string
    }
    deliveryGuarantee: 'at-least-once' | 'at-most-once' | 'exactly-once'
    enabled: boolean
  }): Promise<unknown>

  ingestBatch(pipelineId: string, events: unknown[]): Promise<{ eventIds: string[]; sequenceNumbers: number[] }>
  flushBatch(pipelineId: string): Promise<{ batchId: string; eventCount: number }>

  generateParquet(pipelineId: string, batchId: string): Promise<{ path: string; sizeBytes: number }>
  getParquetMetadata(path: string): Promise<ParquetFileMetadata | null>
  listParquetFiles(pipelineId: string, options?: { since?: number; until?: number; prefix?: string }): Promise<string[]>
  readParquetFile(path: string, options?: { columns?: string[]; limit?: number }): Promise<unknown[]>
  deleteParquetFile(path: string): Promise<boolean>
}

/**
 * Attempt to load CDCDO - this will fail in RED phase
 */
async function loadCDCDO(): Promise<new (ctx: MockDOState, env: MockCDCEnv) => CDCParquetContract> {
  const module = await import('../src/cdc.js')
  return module.CDCDO
}

describe('CDC Parquet File Generation', () => {
  let ctx: MockDOState
  let env: MockCDCEnv
  let CDCDO: new (ctx: MockDOState, env: MockCDCEnv) => CDCParquetContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    CDCDO = await loadCDCDO()
  })

  describe('Basic Parquet Generation', () => {
    it('should generate Parquet file from batch', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'basic-parquet',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      await instance.ingestBatch('basic-parquet', createSampleEvents(10, 'test-source'))
      const batch = await instance.flushBatch('basic-parquet')

      const result = await instance.generateParquet('basic-parquet', batch.batchId)
      expect(result.path).toBeDefined()
      expect(result.path).toMatch(/\.parquet$/)
      expect(result.sizeBytes).toBeGreaterThan(0)
    })

    it('should include all event fields in Parquet schema', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'schema-test',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      await instance.ingestBatch('schema-test', createSampleEvents(5, 'test-source'))
      const batch = await instance.flushBatch('schema-test')
      const result = await instance.generateParquet('schema-test', batch.batchId)

      const metadata = await instance.getParquetMetadata(result.path)
      expect(metadata).not.toBeNull()
      expect(metadata!.schema.fields).toBeDefined()

      // Should include standard CDC event fields
      const fieldNames = metadata!.schema.fields.map((f) => f.name)
      expect(fieldNames).toContain('id')
      expect(fieldNames).toContain('timestamp')
      expect(fieldNames).toContain('source')
      expect(fieldNames).toContain('type')
      expect(fieldNames).toContain('data')
    })

    it('should store correct row count in metadata', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'row-count',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      const eventCount = 25
      await instance.ingestBatch('row-count', createSampleEvents(eventCount, 'test-source'))
      const batch = await instance.flushBatch('row-count')
      const result = await instance.generateParquet('row-count', batch.batchId)

      const metadata = await instance.getParquetMetadata(result.path)
      expect(metadata!.rowCount).toBe(eventCount)
    })
  })

  describe('Compression', () => {
    it('should apply snappy compression by default', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'default-compression',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' }, // No compression specified
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      await instance.ingestBatch('default-compression', createSampleEvents(10, 'test-source'))
      const batch = await instance.flushBatch('default-compression')
      const result = await instance.generateParquet('default-compression', batch.batchId)

      const metadata = await instance.getParquetMetadata(result.path)
      expect(metadata!.compression).toBe('snappy')
    })

    it('should apply gzip compression when configured', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'gzip-compression',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet', compression: 'gzip' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      await instance.ingestBatch('gzip-compression', createSampleEvents(10, 'test-source'))
      const batch = await instance.flushBatch('gzip-compression')
      const result = await instance.generateParquet('gzip-compression', batch.batchId)

      const metadata = await instance.getParquetMetadata(result.path)
      expect(metadata!.compression).toBe('gzip')
    })

    it('should apply zstd compression when configured', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'zstd-compression',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet', compression: 'zstd' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      await instance.ingestBatch('zstd-compression', createSampleEvents(10, 'test-source'))
      const batch = await instance.flushBatch('zstd-compression')
      const result = await instance.generateParquet('zstd-compression', batch.batchId)

      const metadata = await instance.getParquetMetadata(result.path)
      expect(metadata!.compression).toBe('zstd')
    })

    it('should support no compression', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'no-compression',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet', compression: 'none' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      await instance.ingestBatch('no-compression', createSampleEvents(10, 'test-source'))
      const batch = await instance.flushBatch('no-compression')
      const result = await instance.generateParquet('no-compression', batch.batchId)

      const metadata = await instance.getParquetMetadata(result.path)
      expect(metadata!.compression).toBe('none')
    })

    it('should produce smaller files with compression enabled', async () => {
      const instance = new CDCDO(ctx, env)

      // Create pipeline without compression
      await instance.createPipeline({
        id: 'uncompressed',
        sources: ['test-source'],
        batching: { maxSize: 1000, maxWaitMs: 60000 },
        output: { format: 'parquet', compression: 'none' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      // Create pipeline with compression
      await instance.createPipeline({
        id: 'compressed',
        sources: ['test-source'],
        batching: { maxSize: 1000, maxWaitMs: 60000 },
        output: { format: 'parquet', compression: 'snappy' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      const events = createSampleEvents(100, 'test-source')

      await instance.ingestBatch('uncompressed', events)
      const uncompressedBatch = await instance.flushBatch('uncompressed')
      const uncompressedResult = await instance.generateParquet('uncompressed', uncompressedBatch.batchId)

      await instance.ingestBatch('compressed', events)
      const compressedBatch = await instance.flushBatch('compressed')
      const compressedResult = await instance.generateParquet('compressed', compressedBatch.batchId)

      expect(compressedResult.sizeBytes).toBeLessThan(uncompressedResult.sizeBytes)
    })
  })

  describe('Partitioning', () => {
    it('should partition by time (day granularity)', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'time-partition',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
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

      await instance.ingestBatch('time-partition', createSampleEvents(10, 'test-source'))
      const batch = await instance.flushBatch('time-partition')
      const result = await instance.generateParquet('time-partition', batch.batchId)

      // Path should include date partition
      expect(result.path).toMatch(/cdc-data\/\d{4}\/\d{2}\/\d{2}\/.*\.parquet$/)
    })

    it('should partition by time (hour granularity)', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'hour-partition',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: {
          format: 'parquet',
          partitioning: {
            timeField: 'timestamp',
            timeGranularity: 'hour',
          },
        },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      await instance.ingestBatch('hour-partition', createSampleEvents(10, 'test-source'))
      const batch = await instance.flushBatch('hour-partition')
      const result = await instance.generateParquet('hour-partition', batch.batchId)

      // Path should include hour partition
      expect(result.path).toMatch(/\d{4}\/\d{2}\/\d{2}\/\d{2}\/.*\.parquet$/)
    })

    it('should partition by custom fields', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'field-partition',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: {
          format: 'parquet',
          partitioning: {
            fields: ['source', 'type'],
          },
        },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      await instance.ingestBatch('field-partition', createSampleEvents(10, 'test-source'))
      const batch = await instance.flushBatch('field-partition')
      const result = await instance.generateParquet('field-partition', batch.batchId)

      // Path should include field partitions
      expect(result.path).toMatch(/source=.*\/type=.*\/.*\.parquet$/)
    })

    it('should store partition values in metadata', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'partition-meta',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: {
          format: 'parquet',
          partitioning: {
            fields: ['source'],
            timeField: 'timestamp',
            timeGranularity: 'day',
          },
        },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      await instance.ingestBatch('partition-meta', createSampleEvents(10, 'test-source'))
      const batch = await instance.flushBatch('partition-meta')
      const result = await instance.generateParquet('partition-meta', batch.batchId)

      const metadata = await instance.getParquetMetadata(result.path)
      expect(metadata!.partitionValues).toBeDefined()
      expect(metadata!.partitionValues!.source).toBe('test-source')
    })
  })

  describe('File Listing', () => {
    it('should list all Parquet files for a pipeline', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'list-files',
        sources: ['test-source'],
        batching: { maxSize: 10, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      // Generate multiple batches
      for (let i = 0; i < 3; i++) {
        await instance.ingestBatch('list-files', createSampleEvents(10, 'test-source'))
        const batch = await instance.flushBatch('list-files')
        await instance.generateParquet('list-files', batch.batchId)
      }

      const files = await instance.listParquetFiles('list-files')
      expect(files).toHaveLength(3)
      expect(files.every((f) => f.endsWith('.parquet'))).toBe(true)
    })

    it('should filter files by time range', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'time-filter',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      await instance.ingestBatch('time-filter', createSampleEvents(10, 'test-source'))
      const batch = await instance.flushBatch('time-filter')
      await instance.generateParquet('time-filter', batch.batchId)

      const now = Date.now()

      // Should find files from last hour
      const recentFiles = await instance.listParquetFiles('time-filter', {
        since: now - 3600000,
        until: now,
      })
      expect(recentFiles.length).toBeGreaterThan(0)

      // Should not find files from far future
      const futureFiles = await instance.listParquetFiles('time-filter', {
        since: now + 86400000,
        until: now + 172800000,
      })
      expect(futureFiles).toHaveLength(0)
    })

    it('should filter files by prefix', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'prefix-filter',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: {
          format: 'parquet',
          pathPrefix: 'my-data/cdc',
        },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      await instance.ingestBatch('prefix-filter', createSampleEvents(10, 'test-source'))
      const batch = await instance.flushBatch('prefix-filter')
      await instance.generateParquet('prefix-filter', batch.batchId)

      const files = await instance.listParquetFiles('prefix-filter', { prefix: 'my-data/cdc' })
      expect(files.length).toBeGreaterThan(0)
      expect(files.every((f) => f.startsWith('my-data/cdc'))).toBe(true)
    })
  })

  describe('File Reading', () => {
    it('should read Parquet file contents', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'read-test',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      await instance.ingestBatch('read-test', createSampleEvents(10, 'test-source'))
      const batch = await instance.flushBatch('read-test')
      const result = await instance.generateParquet('read-test', batch.batchId)

      const rows = await instance.readParquetFile(result.path)
      expect(rows).toHaveLength(10)
    })

    it('should support column projection', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'column-projection',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      await instance.ingestBatch('column-projection', createSampleEvents(5, 'test-source'))
      const batch = await instance.flushBatch('column-projection')
      const result = await instance.generateParquet('column-projection', batch.batchId)

      const rows = await instance.readParquetFile(result.path, { columns: ['id', 'type'] })

      // Rows should only have the requested columns
      for (const row of rows) {
        const rowObj = row as Record<string, unknown>
        expect(Object.keys(rowObj)).toContain('id')
        expect(Object.keys(rowObj)).toContain('type')
        expect(Object.keys(rowObj)).not.toContain('data')
      }
    })

    it('should support row limit', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'row-limit',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      await instance.ingestBatch('row-limit', createSampleEvents(20, 'test-source'))
      const batch = await instance.flushBatch('row-limit')
      const result = await instance.generateParquet('row-limit', batch.batchId)

      const rows = await instance.readParquetFile(result.path, { limit: 5 })
      expect(rows).toHaveLength(5)
    })
  })

  describe('File Deletion', () => {
    it('should delete Parquet file', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'delete-test',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      await instance.ingestBatch('delete-test', createSampleEvents(10, 'test-source'))
      const batch = await instance.flushBatch('delete-test')
      const result = await instance.generateParquet('delete-test', batch.batchId)

      const deleted = await instance.deleteParquetFile(result.path)
      expect(deleted).toBe(true)

      // File should no longer exist
      const metadata = await instance.getParquetMetadata(result.path)
      expect(metadata).toBeNull()
    })

    it('should return false for non-existent file', async () => {
      const instance = new CDCDO(ctx, env)
      const deleted = await instance.deleteParquetFile('non-existent.parquet')
      expect(deleted).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid batch ID', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'invalid-batch',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      await expect(instance.generateParquet('invalid-batch', 'nonexistent-batch')).rejects.toThrow(/batch.*not found/i)
    })

    it('should handle empty batch gracefully', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'empty-batch',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      // Flush without ingesting any events
      const batch = await instance.flushBatch('empty-batch')

      // Should handle gracefully (either return empty file or skip)
      if (batch.eventCount === 0) {
        await expect(instance.generateParquet('empty-batch', batch.batchId)).rejects.toThrow(/empty|no events/i)
      }
    })
  })
})
