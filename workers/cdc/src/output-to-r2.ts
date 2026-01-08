/**
 * outputToR2 - R2 upload function with exponential backoff retry
 *
 * This module provides reliable R2 uploads with configurable retry logic
 * using exponential backoff for transient failure handling.
 */

import type { MockR2Bucket, MockR2Object, R2PutOptions } from '../test/helpers.js'

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
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
export interface OutputResult {
  path: string
  sizeBytes: number
  retryCount: number
  totalDurationMs: number
}

/**
 * Options for outputToR2
 */
export interface OutputToR2Options {
  retryConfig?: RetryConfig
  contentType?: string
  customMetadata?: Record<string, string>
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 100,
  backoffMultiplier: 2,
}

/**
 * Sleep utility that works with both real and fake timers
 */
async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Upload data to R2 with exponential backoff retry
 *
 * @param bucket - R2 bucket to upload to
 * @param key - Object key in the bucket
 * @param data - Data to upload (ArrayBuffer or string)
 * @param options - Upload options including retry configuration
 * @returns Result with path, size, retry count, and duration
 * @throws Error if upload fails after all retries
 */
export async function outputToR2(
  bucket: MockR2Bucket,
  key: string,
  data: ArrayBuffer | string,
  options?: OutputToR2Options
): Promise<OutputResult> {
  const config = options?.retryConfig ?? DEFAULT_RETRY_CONFIG
  const startTime = Date.now()
  let lastError: Error | null = null
  let retryCount = 0
  let currentDelay = config.initialDelayMs

  // Build put options
  const putOptions: R2PutOptions = {}
  if (options?.contentType || options?.customMetadata) {
    if (options?.contentType) {
      putOptions.httpMetadata = { contentType: options.contentType }
    }
    if (options?.customMetadata) {
      putOptions.customMetadata = options.customMetadata
    }
  }

  // Attempt upload with retries
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      // Wait before retry (not on first attempt)
      if (attempt > 0) {
        await sleep(currentDelay)
        // Calculate next delay with exponential backoff
        currentDelay = Math.min(
          currentDelay * config.backoffMultiplier,
          config.maxDelayMs ?? Number.MAX_SAFE_INTEGER
        )
        retryCount++
      }

      // Attempt upload
      const result: MockR2Object = await bucket.put(
        key,
        data,
        Object.keys(putOptions).length > 0 ? putOptions : undefined
      )

      // Success
      return {
        path: key,
        sizeBytes: result.size,
        retryCount,
        totalDurationMs: Date.now() - startTime,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      // Continue to next retry
    }
  }

  // All retries exhausted
  const totalAttempts = config.maxRetries + 1
  throw new Error(
    `R2 upload failed after ${totalAttempts} attempts (${retryCount} retries): ${lastError?.message ?? 'Unknown error'}`
  )
}
