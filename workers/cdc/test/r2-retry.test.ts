/**
 * RED Tests: outputToR2 Retry Logic
 *
 * These tests define the contract for the CDC worker's R2 upload retry mechanism.
 * R2 uploads should be resilient to transient failures with exponential backoff.
 *
 * Per issue workers-cvz7:
 * - outputToR2 should retry with exponential backoff if R2.put fails
 * - Test with mock that fails first 2 attempts then succeeds
 * - Retry delays: 100ms, 200ms, 400ms (exponential backoff)
 *
 * RED PHASE: These tests MUST FAIL because outputToR2 is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-7ow1).
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { createMockR2Bucket, type MockR2Bucket, type MockR2Object } from './helpers.js'

/**
 * Configuration for outputToR2 retry behavior
 */
interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number
  /** Initial backoff delay in milliseconds */
  initialDelayMs: number
  /** Multiplier for exponential backoff */
  backoffMultiplier: number
  /** Maximum delay between retries */
  maxDelayMs?: number
}

/**
 * Result from outputToR2
 */
interface OutputResult {
  path: string
  sizeBytes: number
  retryCount: number
  totalDurationMs: number
}

/**
 * Interface for outputToR2 function
 */
interface OutputToR2Function {
  (
    bucket: MockR2Bucket,
    key: string,
    data: ArrayBuffer | string,
    options?: {
      retryConfig?: RetryConfig
      contentType?: string
      customMetadata?: Record<string, string>
    }
  ): Promise<OutputResult>
}

/**
 * Attempt to load outputToR2 - this will fail in RED phase
 */
async function loadOutputToR2(): Promise<OutputToR2Function> {
  const module = await import('../src/output-to-r2.js')
  return module.outputToR2
}

/**
 * Create a mock R2 bucket that fails N times before succeeding
 */
function createFailingR2Bucket(failCount: number): {
  bucket: MockR2Bucket
  putCalls: Array<{ key: string; timestamp: number }>
} {
  const putCalls: Array<{ key: string; timestamp: number }> = []
  let attemptCount = 0

  // Internal store for data persistence across put/get calls
  const store = new Map<string, { data: ArrayBuffer; metadata?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> } }>()

  const bucket = createMockR2Bucket()

  // Override the put mock to fail N times
  const originalPut = bucket.put as Mock
  originalPut.mockImplementation(
    async (key: string, value: ArrayBuffer | ReadableStream | string, options?: { httpMetadata?: { contentType?: string }; customMetadata?: Record<string, string> }): Promise<MockR2Object> => {
      putCalls.push({ key, timestamp: Date.now() })
      attemptCount++

      if (attemptCount <= failCount) {
        throw new Error(`R2 upload failed (attempt ${attemptCount}): Internal Server Error`)
      }

      // Success case - store the data and return mock R2Object
      const data =
        typeof value === 'string' ? new TextEncoder().encode(value).buffer : value instanceof ArrayBuffer ? value : new ArrayBuffer(0)

      // Store the data so get() can retrieve it
      store.set(key, { data: data as ArrayBuffer, metadata: options })

      return {
        key,
        size: data instanceof ArrayBuffer ? data.byteLength : 0,
        etag: `etag-${Date.now()}`,
        uploaded: new Date(),
        arrayBuffer: async () => data as ArrayBuffer,
        text: async () => new TextDecoder().decode(data as ArrayBuffer),
        json: async <T>() => JSON.parse(new TextDecoder().decode(data as ArrayBuffer)) as T,
      }
    }
  )

  // Override the get mock to return data from our store
  const originalGet = bucket.get as Mock
  originalGet.mockImplementation(async (key: string): Promise<MockR2Object | null> => {
    const entry = store.get(key)
    if (!entry) return null

    return {
      key,
      size: entry.data.byteLength,
      etag: `etag-${Date.now()}`,
      uploaded: new Date(),
      httpMetadata: entry.metadata?.httpMetadata,
      customMetadata: entry.metadata?.customMetadata,
      arrayBuffer: async () => entry.data,
      text: async () => new TextDecoder().decode(entry.data),
      json: async <T>() => JSON.parse(new TextDecoder().decode(entry.data)) as T,
    }
  })

  return { bucket, putCalls }
}

describe('outputToR2 Retry Logic', () => {
  let outputToR2: OutputToR2Function

  beforeEach(async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    outputToR2 = await loadOutputToR2()
  })

  describe('Basic Retry Behavior', () => {
    it('should retry with exponential backoff when R2.put fails', async () => {
      const { bucket, putCalls } = createFailingR2Bucket(2) // Fail first 2 attempts

      const result = await outputToR2(bucket, 'test/file.parquet', 'test data', {
        retryConfig: {
          maxRetries: 3,
          initialDelayMs: 100,
          backoffMultiplier: 2,
        },
      })

      // Should have made 3 attempts total (2 failures + 1 success)
      expect(putCalls).toHaveLength(3)

      // Result should indicate retry count
      expect(result.retryCount).toBe(2)
      expect(result.path).toBe('test/file.parquet')
    })

    it('should succeed on first attempt when no errors occur', async () => {
      const { bucket, putCalls } = createFailingR2Bucket(0) // No failures

      const result = await outputToR2(bucket, 'test/success.parquet', 'test data', {
        retryConfig: {
          maxRetries: 3,
          initialDelayMs: 100,
          backoffMultiplier: 2,
        },
      })

      expect(putCalls).toHaveLength(1)
      expect(result.retryCount).toBe(0)
    })

    it('should throw after max retries exceeded', async () => {
      const { bucket } = createFailingR2Bucket(5) // Fail all attempts

      await expect(
        outputToR2(bucket, 'test/fail.parquet', 'test data', {
          retryConfig: {
            maxRetries: 3,
            initialDelayMs: 100,
            backoffMultiplier: 2,
          },
        })
      ).rejects.toThrow(/max retries|exceeded|failed after/i)
    })
  })

  describe('Exponential Backoff Timing', () => {
    it('should wait 100ms before first retry', async () => {
      const { bucket, putCalls } = createFailingR2Bucket(1)

      const promise = outputToR2(bucket, 'test/timing.parquet', 'test data', {
        retryConfig: {
          maxRetries: 3,
          initialDelayMs: 100,
          backoffMultiplier: 2,
        },
      })

      // First call happens immediately
      await vi.advanceTimersByTimeAsync(0)
      expect(putCalls).toHaveLength(1)

      // Second call should happen after 100ms
      await vi.advanceTimersByTimeAsync(100)
      expect(putCalls).toHaveLength(2)

      await promise
    })

    it('should wait 200ms before second retry (100ms * 2)', async () => {
      const { bucket, putCalls } = createFailingR2Bucket(2)

      const promise = outputToR2(bucket, 'test/timing2.parquet', 'test data', {
        retryConfig: {
          maxRetries: 3,
          initialDelayMs: 100,
          backoffMultiplier: 2,
        },
      })

      // First call
      await vi.advanceTimersByTimeAsync(0)
      expect(putCalls).toHaveLength(1)

      // Second call after 100ms
      await vi.advanceTimersByTimeAsync(100)
      expect(putCalls).toHaveLength(2)

      // Third call after additional 200ms (100 * 2)
      await vi.advanceTimersByTimeAsync(200)
      expect(putCalls).toHaveLength(3)

      await promise
    })

    it('should wait 400ms before third retry (100ms * 2 * 2)', async () => {
      const { bucket, putCalls } = createFailingR2Bucket(3)

      const promise = outputToR2(bucket, 'test/timing3.parquet', 'test data', {
        retryConfig: {
          maxRetries: 4,
          initialDelayMs: 100,
          backoffMultiplier: 2,
        },
      })

      // First call
      await vi.advanceTimersByTimeAsync(0)
      expect(putCalls).toHaveLength(1)

      // Second call after 100ms
      await vi.advanceTimersByTimeAsync(100)
      expect(putCalls).toHaveLength(2)

      // Third call after 200ms more
      await vi.advanceTimersByTimeAsync(200)
      expect(putCalls).toHaveLength(3)

      // Fourth call after 400ms more (100 * 2^2)
      await vi.advanceTimersByTimeAsync(400)
      expect(putCalls).toHaveLength(4)

      await promise
    })

    it('should respect maxDelayMs cap on backoff', async () => {
      const { bucket, putCalls } = createFailingR2Bucket(4)

      const promise = outputToR2(bucket, 'test/maxdelay.parquet', 'test data', {
        retryConfig: {
          maxRetries: 5,
          initialDelayMs: 100,
          backoffMultiplier: 2,
          maxDelayMs: 300, // Cap at 300ms
        },
      })

      // First call
      await vi.advanceTimersByTimeAsync(0)
      expect(putCalls).toHaveLength(1)

      // Second call after 100ms
      await vi.advanceTimersByTimeAsync(100)
      expect(putCalls).toHaveLength(2)

      // Third call after 200ms
      await vi.advanceTimersByTimeAsync(200)
      expect(putCalls).toHaveLength(3)

      // Fourth call after 300ms (capped, would have been 400)
      await vi.advanceTimersByTimeAsync(300)
      expect(putCalls).toHaveLength(4)

      // Fifth call after 300ms (still capped)
      await vi.advanceTimersByTimeAsync(300)
      expect(putCalls).toHaveLength(5)

      await promise
    })
  })

  describe('Total Duration Tracking', () => {
    it('should track total duration including retry delays', async () => {
      const { bucket } = createFailingR2Bucket(2)

      const result = await outputToR2(bucket, 'test/duration.parquet', 'test data', {
        retryConfig: {
          maxRetries: 3,
          initialDelayMs: 100,
          backoffMultiplier: 2,
        },
      })

      // Total expected delay: 100ms (first retry) + 200ms (second retry) = 300ms
      // Plus some small execution time
      expect(result.totalDurationMs).toBeGreaterThanOrEqual(300)
    })

    it('should have minimal duration when no retries needed', async () => {
      const { bucket } = createFailingR2Bucket(0)

      const result = await outputToR2(bucket, 'test/fast.parquet', 'test data', {
        retryConfig: {
          maxRetries: 3,
          initialDelayMs: 100,
          backoffMultiplier: 2,
        },
      })

      // Should be nearly instant when no retries needed
      expect(result.totalDurationMs).toBeLessThan(100)
    })
  })

  describe('Default Retry Configuration', () => {
    it('should use default retry config when not specified', async () => {
      const { bucket, putCalls } = createFailingR2Bucket(2)

      // Call without explicit retry config
      const result = await outputToR2(bucket, 'test/default.parquet', 'test data')

      // Should still retry with sensible defaults
      expect(putCalls.length).toBeGreaterThan(1)
      expect(result.retryCount).toBe(2)
    })

    it('should have sensible default retry settings (3 retries, 100ms initial)', async () => {
      const { bucket } = createFailingR2Bucket(4) // Exceed default max

      // Default should allow 3 retries (4 total attempts)
      await expect(outputToR2(bucket, 'test/defaults.parquet', 'test data')).rejects.toThrow()
    })
  })

  describe('Error Information', () => {
    it('should include original error in thrown error after max retries', async () => {
      const { bucket } = createFailingR2Bucket(10)

      try {
        await outputToR2(bucket, 'test/error.parquet', 'test data', {
          retryConfig: {
            maxRetries: 2,
            initialDelayMs: 100,
            backoffMultiplier: 2,
          },
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        const err = error as Error
        expect(err.message).toMatch(/R2 upload failed|Internal Server Error|retry/i)
      }
    })

    it('should include attempt count in error message', async () => {
      const { bucket } = createFailingR2Bucket(10)

      try {
        await outputToR2(bucket, 'test/attempts.parquet', 'test data', {
          retryConfig: {
            maxRetries: 3,
            initialDelayMs: 100,
            backoffMultiplier: 2,
          },
        })
        expect.fail('Should have thrown')
      } catch (error) {
        const err = error as Error
        // Should mention the number of attempts made
        expect(err.message).toMatch(/3|attempt|retries/i)
      }
    })
  })

  describe('Data Integrity', () => {
    it('should upload correct data after retries', async () => {
      const { bucket } = createFailingR2Bucket(2)
      const testData = 'test parquet content'

      await outputToR2(bucket, 'test/data.parquet', testData, {
        retryConfig: {
          maxRetries: 3,
          initialDelayMs: 100,
          backoffMultiplier: 2,
        },
      })

      // Verify the data was uploaded correctly
      const uploaded = await bucket.get('test/data.parquet')
      expect(uploaded).not.toBeNull()
      const text = await uploaded!.text()
      expect(text).toBe(testData)
    })

    it('should preserve content type through retries', async () => {
      const { bucket } = createFailingR2Bucket(1)

      await outputToR2(bucket, 'test/typed.parquet', 'content', {
        retryConfig: {
          maxRetries: 3,
          initialDelayMs: 100,
          backoffMultiplier: 2,
        },
        contentType: 'application/x-parquet',
      })

      // The mock should have received the content type
      expect(bucket.put).toHaveBeenCalledWith(
        'test/typed.parquet',
        expect.anything(),
        expect.objectContaining({
          httpMetadata: expect.objectContaining({
            contentType: 'application/x-parquet',
          }),
        })
      )
    })

    it('should preserve custom metadata through retries', async () => {
      const { bucket } = createFailingR2Bucket(1)

      await outputToR2(bucket, 'test/meta.parquet', 'content', {
        retryConfig: {
          maxRetries: 3,
          initialDelayMs: 100,
          backoffMultiplier: 2,
        },
        customMetadata: {
          batchId: 'batch-123',
          pipelineId: 'pipeline-456',
        },
      })

      expect(bucket.put).toHaveBeenCalledWith(
        'test/meta.parquet',
        expect.anything(),
        expect.objectContaining({
          customMetadata: {
            batchId: 'batch-123',
            pipelineId: 'pipeline-456',
          },
        })
      )
    })
  })

  describe('Idempotency', () => {
    it('should not create duplicate files on retry', async () => {
      const { bucket, putCalls } = createFailingR2Bucket(2)

      await outputToR2(bucket, 'test/idempotent.parquet', 'content', {
        retryConfig: {
          maxRetries: 3,
          initialDelayMs: 100,
          backoffMultiplier: 2,
        },
      })

      // All calls should use the same key
      const keys = putCalls.map((c) => c.key)
      expect(new Set(keys).size).toBe(1)
      expect(keys[0]).toBe('test/idempotent.parquet')
    })
  })
})
