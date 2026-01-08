/**
 * RED Tests: createCDCBatch Date Range Validation
 *
 * These tests verify that createCDCBatch throws ValidationError
 * when startTime is after endTime.
 *
 * Issue: workers-ck3o (GREEN phase)
 * Prerequisite: workers-veji (RED phase)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  type MockDOState,
  type MockCDCEnv,
} from './helpers.js'

/**
 * Minimal contract for createCDCBatch testing
 */
interface CDCBatchContract {
  createCDCBatch(options: {
    pipelineId: string
    startTime: number
    endTime: number
    format?: 'parquet' | 'json'
  }): Promise<{
    batchId: string
    pipelineId: string
    startTime: number
    endTime: number
    eventCount: number
    status: string
  }>
}

/**
 * Attempt to load CDCDO and ValidationError from implementation
 */
async function loadCDCDO(): Promise<{
  CDCDO: new (ctx: MockDOState, env: MockCDCEnv) => CDCBatchContract
  ValidationError: new (message: string) => Error
}> {
  const module = await import('../src/cdc.js')
  return { CDCDO: module.CDCDO, ValidationError: module.ValidationError }
}

describe('createCDCBatch Date Range Validation', () => {
  let ctx: MockDOState
  let env: MockCDCEnv
  let CDCDO: new (ctx: MockDOState, env: MockCDCEnv) => CDCBatchContract
  let ValidationError: new (message: string) => Error
  let instance: CDCBatchContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    const loaded = await loadCDCDO()
    CDCDO = loaded.CDCDO
    ValidationError = loaded.ValidationError
    instance = new CDCDO(ctx, env)
  })

  describe('Invalid Date Range - startTime > endTime', () => {
    it('should throw ValidationError when startTime is after endTime', async () => {
      await expect(
        instance.createCDCBatch({
          pipelineId: 'test-pipeline',
          startTime: 2000,
          endTime: 1000,
        })
      ).rejects.toThrow(ValidationError)
    })

    it('should throw ValidationError with descriptive message', async () => {
      await expect(
        instance.createCDCBatch({
          pipelineId: 'test-pipeline',
          startTime: 2000,
          endTime: 1000,
        })
      ).rejects.toThrow(/startTime.*endTime|invalid.*date range|start.*after.*end/i)
    })

    it('should reject large time differences (startTime >> endTime)', async () => {
      const now = Date.now()
      await expect(
        instance.createCDCBatch({
          pipelineId: 'test-pipeline',
          startTime: now + 86400000, // tomorrow
          endTime: now - 86400000, // yesterday
        })
      ).rejects.toThrow(ValidationError)
    })

    it('should reject when startTime is 1ms after endTime', async () => {
      const baseTime = Date.now()
      await expect(
        instance.createCDCBatch({
          pipelineId: 'test-pipeline',
          startTime: baseTime + 1,
          endTime: baseTime,
        })
      ).rejects.toThrow(ValidationError)
    })

    it('should reject negative time ranges', async () => {
      await expect(
        instance.createCDCBatch({
          pipelineId: 'test-pipeline',
          startTime: -1000,
          endTime: -2000,
        })
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('Valid Date Range - startTime <= endTime', () => {
    it('should accept when startTime equals endTime', async () => {
      const time = Date.now()
      const result = await instance.createCDCBatch({
        pipelineId: 'test-pipeline',
        startTime: time,
        endTime: time,
      })

      expect(result).toBeDefined()
      expect(result.startTime).toBe(time)
      expect(result.endTime).toBe(time)
    })

    it('should accept when startTime is before endTime', async () => {
      const start = Date.now()
      const end = start + 1000

      const result = await instance.createCDCBatch({
        pipelineId: 'test-pipeline',
        startTime: start,
        endTime: end,
      })

      expect(result).toBeDefined()
      expect(result.startTime).toBe(start)
      expect(result.endTime).toBe(end)
    })

    it('should accept large valid time ranges', async () => {
      const start = Date.now() - 86400000 // yesterday
      const end = Date.now() + 86400000 // tomorrow

      const result = await instance.createCDCBatch({
        pipelineId: 'test-pipeline',
        startTime: start,
        endTime: end,
      })

      expect(result).toBeDefined()
      expect(result.startTime).toBe(start)
      expect(result.endTime).toBe(end)
    })

    it('should accept epoch time ranges', async () => {
      const result = await instance.createCDCBatch({
        pipelineId: 'test-pipeline',
        startTime: 0,
        endTime: 1000,
      })

      expect(result).toBeDefined()
      expect(result.startTime).toBe(0)
      expect(result.endTime).toBe(1000)
    })

    it('should return batch metadata with valid range', async () => {
      const start = Date.now()
      const end = start + 5000

      const result = await instance.createCDCBatch({
        pipelineId: 'batch-test',
        startTime: start,
        endTime: end,
      })

      expect(result.batchId).toBeDefined()
      expect(result.pipelineId).toBe('batch-test')
      expect(result.eventCount).toBeGreaterThanOrEqual(0)
      expect(result.status).toBeDefined()
    })
  })

  describe('Edge Cases', () => {
    it('should handle zero timestamps', async () => {
      const result = await instance.createCDCBatch({
        pipelineId: 'test-pipeline',
        startTime: 0,
        endTime: 0,
      })

      expect(result).toBeDefined()
    })

    it('should handle very large timestamps', async () => {
      const largeTime = 9999999999999 // far future
      const result = await instance.createCDCBatch({
        pipelineId: 'test-pipeline',
        startTime: largeTime,
        endTime: largeTime + 1000,
      })

      expect(result).toBeDefined()
    })

    it('should maintain precision for millisecond differences', async () => {
      const base = Date.now()
      const result = await instance.createCDCBatch({
        pipelineId: 'test-pipeline',
        startTime: base,
        endTime: base + 1, // 1ms difference
      })

      expect(result.startTime).toBe(base)
      expect(result.endTime).toBe(base + 1)
    })

    it('should work with different format options', async () => {
      const start = Date.now()
      const end = start + 1000

      const parquetResult = await instance.createCDCBatch({
        pipelineId: 'test-pipeline',
        startTime: start,
        endTime: end,
        format: 'parquet',
      })

      expect(parquetResult).toBeDefined()

      const jsonResult = await instance.createCDCBatch({
        pipelineId: 'test-pipeline',
        startTime: start,
        endTime: end,
        format: 'json',
      })

      expect(jsonResult).toBeDefined()
    })
  })
})
