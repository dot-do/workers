/**
 * R2StorageAdapter Implementation
 *
 * Concrete implementation of the R2StorageAdapter interface that connects
 * cold vector storage to Cloudflare R2.
 *
 * This adapter handles:
 * - Partition data retrieval (get)
 * - Partition metadata retrieval (head)
 * - Partition listing (list)
 * - Partition storage (put)
 * - Partial range reads for streaming
 * - Error handling and retry logic with exponential backoff
 *
 * @see workers-qu22c - [GREEN] R2StorageAdapter implementation
 * @module r2-adapter
 */

import type { R2StorageAdapter, PartitionMetadata } from './cold-vector-search.js'

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Configuration options for R2StorageAdapter
 */
export interface R2StorageAdapterOptions {
  /** Prefix to apply to all keys */
  prefix?: string
  /** Maximum number of retries for transient failures */
  maxRetries?: number
  /** Initial delay between retries in milliseconds */
  retryDelayMs?: number
  /** Multiplier for exponential backoff between retries */
  retryBackoffMultiplier?: number
}

/**
 * Default configuration values
 */
const DEFAULT_OPTIONS: Required<Omit<R2StorageAdapterOptions, 'prefix'>> = {
  maxRetries: 3,
  retryDelayMs: 100,
  retryBackoffMultiplier: 2,
}

// ============================================================================
// R2 Types (compatible with @cloudflare/workers-types)
// ============================================================================

/**
 * R2 object metadata (from HEAD request)
 */
interface R2ObjectMetadata {
  key: string
  size: number
  etag: string
  uploaded: Date
  httpMetadata?: {
    contentType?: string
    contentEncoding?: string
  }
  customMetadata?: Record<string, string>
}

/**
 * R2 object body (from GET request)
 */
interface R2ObjectBody extends R2ObjectMetadata {
  body: ReadableStream<Uint8Array>
  bodyUsed: boolean
  arrayBuffer(): Promise<ArrayBuffer>
  text(): Promise<string>
  json<T>(): Promise<T>
  blob(): Promise<Blob>
}

/**
 * R2 list result
 */
interface R2ListResult {
  objects: R2ObjectMetadata[]
  truncated: boolean
  cursor?: string
  delimitedPrefixes: string[]
}

/**
 * R2 Bucket interface (subset of Cloudflare R2Bucket)
 */
interface R2BucketLike {
  get(
    key: string,
    options?: { range?: { offset: number; length: number } }
  ): Promise<R2ObjectBody | null>
  head(key: string): Promise<R2ObjectMetadata | null>
  put(
    key: string,
    value: ArrayBuffer | ReadableStream | string,
    options?: {
      httpMetadata?: { contentType?: string }
      customMetadata?: Record<string, string>
    }
  ): Promise<R2ObjectMetadata>
  delete(key: string | string[]): Promise<void>
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<R2ListResult>
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Parse custom metadata from R2 object into PartitionMetadata
 */
function parseCustomMetadata(obj: R2ObjectMetadata): PartitionMetadata {
  const custom = obj.customMetadata ?? {}

  return {
    clusterId: custom['x-partition-cluster-id'] ?? '',
    vectorCount: parseInt(custom['x-partition-vector-count'] ?? '0', 10),
    dimensionality: parseInt(custom['x-partition-dimensionality'] ?? '768', 10),
    compressionType: custom['x-partition-compression'] ?? 'none',
    sizeBytes: obj.size,
    createdAt: parseInt(custom['x-partition-created-at'] ?? String(Date.now()), 10),
  }
}

/**
 * Convert PartitionMetadata to R2 custom metadata headers
 */
function toCustomMetadata(metadata: PartitionMetadata): Record<string, string> {
  return {
    'x-partition-cluster-id': metadata.clusterId,
    'x-partition-vector-count': String(metadata.vectorCount),
    'x-partition-dimensionality': String(metadata.dimensionality),
    'x-partition-compression': metadata.compressionType,
    'x-partition-created-at': String(metadata.createdAt),
  }
}

// ============================================================================
// R2StorageAdapterImpl Implementation
// ============================================================================

/**
 * R2StorageAdapter Implementation
 *
 * Provides a concrete implementation of the R2StorageAdapter interface
 * for connecting cold vector storage to Cloudflare R2.
 *
 * Features:
 * - Automatic key prefixing for namespace isolation
 * - Retry logic with exponential backoff for transient failures
 * - Range read support for efficient partial file access
 * - Custom metadata parsing for partition information
 *
 * @example
 * ```typescript
 * const adapter = new R2StorageAdapterImpl(env.MY_BUCKET, {
 *   prefix: 'vectors/',
 *   maxRetries: 3,
 * })
 *
 * const data = await adapter.get('partitions/cluster-0.parquet')
 * const metadata = await adapter.head('partitions/cluster-0.parquet')
 * const keys = await adapter.list('partitions/')
 * ```
 */
export class R2StorageAdapterImpl implements R2StorageAdapter {
  private readonly bucket: R2BucketLike
  private readonly prefix: string
  private readonly maxRetries: number
  private readonly retryDelayMs: number
  private readonly retryBackoffMultiplier: number

  constructor(bucket: R2BucketLike, options?: R2StorageAdapterOptions) {
    this.bucket = bucket
    this.prefix = options?.prefix ?? ''
    this.maxRetries = options?.maxRetries ?? DEFAULT_OPTIONS.maxRetries
    this.retryDelayMs = options?.retryDelayMs ?? DEFAULT_OPTIONS.retryDelayMs
    this.retryBackoffMultiplier =
      options?.retryBackoffMultiplier ?? DEFAULT_OPTIONS.retryBackoffMultiplier
  }

  /**
   * Apply prefix to a key
   */
  private prefixKey(key: string): string {
    return this.prefix + key
  }

  /**
   * Execute an operation with retry logic
   */
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | undefined
    let delay = this.retryDelayMs

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))

        // If we've exhausted retries, throw
        if (attempt >= this.maxRetries) {
          throw lastError
        }

        // Wait before retrying with exponential backoff
        await sleep(delay)
        delay *= this.retryBackoffMultiplier
      }
    }

    // Should never reach here, but TypeScript needs it
    throw lastError ?? new Error(`${operationName} failed after ${this.maxRetries} retries`)
  }

  /**
   * Get partition data from R2
   *
   * @param key - The partition key (without prefix)
   * @returns ArrayBuffer containing the partition data, or null if not found
   */
  async get(key: string): Promise<ArrayBuffer | null> {
    const prefixedKey = this.prefixKey(key)

    return this.withRetry(async () => {
      const obj = await this.bucket.get(prefixedKey)

      if (obj === null) {
        return null
      }

      return obj.arrayBuffer()
    }, 'get')
  }

  /**
   * Get partition metadata from R2 using HEAD request
   *
   * @param key - The partition key (without prefix)
   * @returns PartitionMetadata parsed from custom headers, or null if not found
   */
  async head(key: string): Promise<PartitionMetadata | null> {
    const prefixedKey = this.prefixKey(key)

    return this.withRetry(async () => {
      const obj = await this.bucket.head(prefixedKey)

      if (obj === null) {
        return null
      }

      return parseCustomMetadata(obj)
    }, 'head')
  }

  /**
   * List partition keys by prefix
   *
   * Handles pagination automatically to return all matching keys.
   *
   * @param prefix - The prefix to filter keys by
   * @returns Array of matching partition keys
   */
  async list(prefix: string): Promise<string[]> {
    const prefixedPrefix = this.prefixKey(prefix)
    const keys: string[] = []

    return this.withRetry(async () => {
      let cursor: string | undefined
      let truncated = true

      while (truncated) {
        const result = await this.bucket.list({
          prefix: prefixedPrefix,
          cursor,
        })

        for (const obj of result.objects) {
          keys.push(obj.key)
        }

        truncated = result.truncated
        cursor = result.cursor
      }

      return keys
    }, 'list')
  }

  /**
   * Store partition data in R2
   *
   * @param key - The partition key (without prefix)
   * @param data - The partition data as ArrayBuffer
   * @param metadata - Optional partition metadata to store as custom headers
   */
  async put(key: string, data: ArrayBuffer, metadata?: PartitionMetadata): Promise<void> {
    const prefixedKey = this.prefixKey(key)

    await this.withRetry(async () => {
      const options: {
        httpMetadata?: { contentType: string }
        customMetadata?: Record<string, string>
      } = {
        httpMetadata: { contentType: 'application/octet-stream' },
      }

      if (metadata) {
        options.customMetadata = toCustomMetadata(metadata)
      }

      await this.bucket.put(prefixedKey, data, options)
    }, 'put')
  }

  /**
   * Get a partial range of partition data from R2
   *
   * Uses R2's range request feature for efficient partial file access
   * without downloading the entire partition.
   *
   * @param key - The partition key (without prefix)
   * @param offset - Starting byte offset
   * @param length - Number of bytes to read
   * @returns ArrayBuffer containing the requested range, or null if not found
   */
  async getPartialRange(
    key: string,
    offset: number,
    length: number
  ): Promise<ArrayBuffer | null> {
    const prefixedKey = this.prefixKey(key)

    return this.withRetry(async () => {
      const obj = await this.bucket.get(prefixedKey, {
        range: { offset, length },
      })

      if (obj === null) {
        return null
      }

      return obj.arrayBuffer()
    }, 'getPartialRange')
  }
}
