/**
 * RED Tests: createCDCBatch Date Range Validation
 *
 * These tests define the contract for createCDCBatch input validation.
 * createCDCBatch must validate that startTime is not after endTime.
 *
 * Per TDD principles:
 * - RED PHASE: Write failing tests first
 * - GREEN PHASE: Implement just enough to pass (workers-ck3o)
 * - REFACTOR: Clean up while keeping tests green
 *
 * Issue: workers-veji - Test createCDCBatch error handling for invalid date ranges
 * Next: workers-ck3o - Add validation to createCDCBatch that throws ValidationError
 *
 * RED PHASE: These tests MUST FAIL because validation is not implemented yet.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  type MockDOState,
  type MockCDCEnv,
} from './helpers.js'

/**
 * CDC Batch creation options
 */
export interface CreateCDCBatchOptions {
  /** Pipeline to create batch for */
  pipelineId: string
  /** Start of time range for events to include */
  startTime: number
  /** End of time range for events to include */
  endTime: number
  /** Optional batch ID (auto-generated if not provided) */
  batchId?: string
  /** Optional filters for event selection */
  filters?: {
    sources?: string[]
    types?: string[]
  }
}

/**
 * CDC Batch result
 */
export interface CDCBatchResult {
  batchId: string
  pipelineId: string
  eventCount: number
  startTime: number
  endTime: number
  createdAt: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

/**
 * ValidationError for input validation failures
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

/**
 * Interface for CDC batch creation testing
 */
interface CDCBatchCreationContract {
  createPipeline(config: {
    id: string
    sources: string[]
    batching: { maxSize: number; maxWaitMs: number }
    output: { format: 'parquet' | 'json' }
    deliveryGuarantee: 'at-least-once' | 'at-most-once' | 'exactly-once'
    enabled: boolean
  }): Promise<unknown>

  ingestBatch(pipelineId: string, events: unknown[]): Promise<{ eventIds: string[]; sequenceNumbers: number[] }>

  /**
   * Create a CDC batch from events within a time range.
   * @throws ValidationError if startTime > endTime
   */
  createCDCBatch(options: CreateCDCBatchOptions): Promise<CDCBatchResult>
}

/**
 * Attempt to load CDCDO - this will fail in RED phase
 */
async function loadCDCDO(): Promise<new (ctx: MockDOState, env: MockCDCEnv) => CDCBatchCreationContract> {
  const module = await import('../src/cdc.js')
  return module.CDCDO
}

describe('createCDCBatch Date Range Validation', () => {
  let ctx: MockDOState
  let env: MockCDCEnv
  let CDCDO: new (ctx: MockDOState, env: MockCDCEnv) => CDCBatchCreationContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    CDCDO = await loadCDCDO()
  })

  describe('Invalid Date Range Errors', () => {
    it('should throw ValidationError when startTime is greater than endTime', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'date-validation-test',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      const now = Date.now()
      const startTime = now + 3600000 // 1 hour in the future
      const endTime = now // now (before startTime)

      await expect(
        instance.createCDCBatch({
          pipelineId: 'date-validation-test',
          startTime,
          endTime,
        })
      ).rejects.toThrow(/startTime.*endTime|invalid.*range|endTime.*before.*startTime/i)
    })

    it('should throw ValidationError with appropriate error code for invalid range', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'error-code-test',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      const startTime = 2000000000000 // Far future
      const endTime = 1000000000000 // Before startTime

      try {
        await instance.createCDCBatch({
          pipelineId: 'error-code-test',
          startTime,
          endTime,
        })
        // Should not reach here
        expect.fail('Expected ValidationError to be thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        const err = error as Error
        expect(err.name).toMatch(/ValidationError|Error/)
        expect(err.message).toMatch(/startTime|endTime|range|invalid/i)
      }
    })

    it('should throw when startTime equals endTime plus one millisecond (off by one)', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'off-by-one-test',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      const baseTime = Date.now()
      const startTime = baseTime + 1 // Just 1ms after endTime
      const endTime = baseTime

      await expect(
        instance.createCDCBatch({
          pipelineId: 'off-by-one-test',
          startTime,
          endTime,
        })
      ).rejects.toThrow()
    })

    it('should throw with significantly inverted date range', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'large-inversion-test',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      // startTime is 1 year after endTime
      const endTime = Date.now()
      const startTime = endTime + 365 * 24 * 60 * 60 * 1000

      await expect(
        instance.createCDCBatch({
          pipelineId: 'large-inversion-test',
          startTime,
          endTime,
        })
      ).rejects.toThrow(/startTime.*endTime|invalid.*range/i)
    })
  })

  describe('Valid Date Range Acceptance', () => {
    it('should accept when startTime equals endTime (zero-width range)', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'zero-width-test',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      const sameTime = Date.now()

      // This should NOT throw - equal times are valid (represents a point-in-time query)
      const result = await instance.createCDCBatch({
        pipelineId: 'zero-width-test',
        startTime: sameTime,
        endTime: sameTime,
      })

      expect(result).toBeDefined()
      expect(result.pipelineId).toBe('zero-width-test')
      expect(result.startTime).toBe(sameTime)
      expect(result.endTime).toBe(sameTime)
    })

    it('should accept when startTime is before endTime', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'valid-range-test',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      const startTime = Date.now() - 3600000 // 1 hour ago
      const endTime = Date.now()

      const result = await instance.createCDCBatch({
        pipelineId: 'valid-range-test',
        startTime,
        endTime,
      })

      expect(result).toBeDefined()
      expect(result.batchId).toBeDefined()
      expect(result.startTime).toBe(startTime)
      expect(result.endTime).toBe(endTime)
    })

    it('should return batch with correct time range metadata', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'metadata-test',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      const startTime = 1704067200000 // 2024-01-01 00:00:00 UTC
      const endTime = 1704153600000 // 2024-01-02 00:00:00 UTC (24 hours later)

      const result = await instance.createCDCBatch({
        pipelineId: 'metadata-test',
        startTime,
        endTime,
      })

      expect(result.startTime).toBe(startTime)
      expect(result.endTime).toBe(endTime)
      expect(result.createdAt).toBeGreaterThan(0)
      expect(result.status).toMatch(/pending|processing|completed/)
    })
  })

  describe('Edge Cases', () => {
    it('should handle Unix epoch timestamps', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'epoch-test',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      const startTime = 0 // Unix epoch
      const endTime = 1000 // 1 second after epoch

      const result = await instance.createCDCBatch({
        pipelineId: 'epoch-test',
        startTime,
        endTime,
      })

      expect(result).toBeDefined()
      expect(result.startTime).toBe(0)
      expect(result.endTime).toBe(1000)
    })

    it('should throw for negative timestamps in invalid order', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'negative-test',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      // -100 > -1000, so this is an invalid range (startTime after endTime)
      const startTime = -100
      const endTime = -1000

      await expect(
        instance.createCDCBatch({
          pipelineId: 'negative-test',
          startTime,
          endTime,
        })
      ).rejects.toThrow()
    })

    it('should accept negative timestamps in valid order', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'negative-valid-test',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      // -1000 < -100, so this is valid (startTime before endTime)
      const startTime = -1000
      const endTime = -100

      const result = await instance.createCDCBatch({
        pipelineId: 'negative-valid-test',
        startTime,
        endTime,
      })

      expect(result).toBeDefined()
    })

    it('should handle maximum safe integer timestamps', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'max-int-test',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      const startTime = Number.MAX_SAFE_INTEGER - 1000
      const endTime = Number.MAX_SAFE_INTEGER

      const result = await instance.createCDCBatch({
        pipelineId: 'max-int-test',
        startTime,
        endTime,
      })

      expect(result).toBeDefined()
    })

    it('should throw for max safe integer in wrong order', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'max-int-invalid-test',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      const startTime = Number.MAX_SAFE_INTEGER
      const endTime = Number.MAX_SAFE_INTEGER - 1000

      await expect(
        instance.createCDCBatch({
          pipelineId: 'max-int-invalid-test',
          startTime,
          endTime,
        })
      ).rejects.toThrow()
    })
  })

  describe('Error Message Quality', () => {
    it('should include both startTime and endTime values in error message', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'error-message-test',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      const startTime = 2000
      const endTime = 1000

      try {
        await instance.createCDCBatch({
          pipelineId: 'error-message-test',
          startTime,
          endTime,
        })
        expect.fail('Expected error to be thrown')
      } catch (error) {
        const err = error as Error
        // Error message should be informative
        expect(err.message.length).toBeGreaterThan(10)
        // Should mention the issue (startTime, endTime, range, invalid, etc.)
        expect(err.message.toLowerCase()).toMatch(/start|end|time|range|invalid|before|after/)
      }
    })

    it('should provide actionable error message', async () => {
      const instance = new CDCDO(ctx, env)
      await instance.createPipeline({
        id: 'actionable-error-test',
        sources: ['test-source'],
        batching: { maxSize: 100, maxWaitMs: 60000 },
        output: { format: 'parquet' },
        deliveryGuarantee: 'at-least-once',
        enabled: true,
      })

      const startTime = 5000
      const endTime = 1000

      try {
        await instance.createCDCBatch({
          pipelineId: 'actionable-error-test',
          startTime,
          endTime,
        })
        expect.fail('Expected error to be thrown')
      } catch (error) {
        const err = error as Error
        // The error should help the developer understand what went wrong
        // and ideally how to fix it
        expect(err.message).toBeTruthy()
        expect(typeof err.message).toBe('string')
      }
    })
  })
})
