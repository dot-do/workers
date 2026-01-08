/**
 * R2StorageAdapter Tests [RED Phase - TDD]
 *
 * Tests for the R2StorageAdapter - the concrete implementation that connects
 * cold vector storage to Cloudflare R2.
 *
 * This adapter is the bridge between ColdVectorSearch and the actual R2 bucket,
 * handling:
 * - Partition data retrieval (get)
 * - Partition metadata retrieval (head)
 * - Partition listing (list)
 * - Partition storage (put)
 * - Partial range reads for streaming
 * - Error handling and retry logic
 *
 * @see workers-ttxwj - [RED] R2StorageAdapter implementation tests
 * @see workers-qu22c - [GREEN] R2StorageAdapter implementation
 * @module r2-adapter.test
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { PartitionMetadata, R2StorageAdapter } from '../src/cold-vector-search.js'

// ============================================================================
// Mock R2 Bucket Types (mimicking @cloudflare/workers-types)
// ============================================================================

/**
 * Mock R2 object body - represents the response from R2
 */
interface MockR2ObjectBody {
  key: string
  size: number
  etag: string
  uploaded: Date
  httpMetadata?: {
    contentType?: string
    contentEncoding?: string
  }
  customMetadata?: Record<string, string>
  body: ReadableStream<Uint8Array>
  bodyUsed: boolean
  arrayBuffer(): Promise<ArrayBuffer>
  text(): Promise<string>
  json<T>(): Promise<T>
  blob(): Promise<Blob>
}

/**
 * Mock R2 object metadata (from HEAD request)
 */
interface MockR2Object {
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
 * Mock R2 list result
 */
interface MockR2ListResult {
  objects: MockR2Object[]
  truncated: boolean
  cursor?: string
  delimitedPrefixes: string[]
}

/**
 * Mock R2 bucket interface (subset of R2Bucket from @cloudflare/workers-types)
 */
interface MockR2Bucket {
  get(key: string, options?: { range?: { offset: number; length: number } }): Promise<MockR2ObjectBody | null>
  head(key: string): Promise<MockR2Object | null>
  put(key: string, value: ArrayBuffer | ReadableStream | string, options?: {
    httpMetadata?: { contentType?: string }
    customMetadata?: Record<string, string>
  }): Promise<MockR2Object>
  delete(key: string | string[]): Promise<void>
  list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<MockR2ListResult>
}

// ============================================================================
// Test Helpers
// ============================================================================

/**
 * Create a mock R2 bucket for testing
 */
function createMockR2Bucket(): MockR2Bucket & {
  _objects: Map<string, { data: ArrayBuffer; metadata: MockR2Object }>
  _failOnNext: { method?: string; error?: Error; count?: number }
  _requestLog: Array<{ method: string; key: string; options?: unknown }>
} {
  const objects = new Map<string, { data: ArrayBuffer; metadata: MockR2Object }>()
  const requestLog: Array<{ method: string; key: string; options?: unknown }> = []
  let failOnNext: { method?: string; error?: Error; count?: number } = {}

  const createObjectBody = (key: string, data: ArrayBuffer, metadata: MockR2Object): MockR2ObjectBody => ({
    ...metadata,
    body: new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(data))
        controller.close()
      },
    }),
    bodyUsed: false,
    arrayBuffer: async () => data,
    text: async () => new TextDecoder().decode(data),
    json: async <T>() => JSON.parse(new TextDecoder().decode(data)) as T,
    blob: async () => new Blob([data]),
  })

  return {
    _objects: objects,
    _failOnNext: failOnNext,
    _requestLog: requestLog,

    async get(key: string, options?: { range?: { offset: number; length: number } }): Promise<MockR2ObjectBody | null> {
      requestLog.push({ method: 'get', key, options })

      // Check for simulated failure
      if (failOnNext.method === 'get' && failOnNext.count && failOnNext.count > 0) {
        failOnNext.count--
        throw failOnNext.error ?? new Error('Simulated R2 failure')
      }

      const obj = objects.get(key)
      if (!obj) return null

      let data = obj.data

      // Handle range requests
      if (options?.range) {
        const { offset, length } = options.range
        data = obj.data.slice(offset, offset + length)
      }

      return createObjectBody(key, data, obj.metadata)
    },

    async head(key: string): Promise<MockR2Object | null> {
      requestLog.push({ method: 'head', key })

      // Check for simulated failure
      if (failOnNext.method === 'head' && failOnNext.count && failOnNext.count > 0) {
        failOnNext.count--
        throw failOnNext.error ?? new Error('Simulated R2 failure')
      }

      const obj = objects.get(key)
      if (!obj) return null

      return obj.metadata
    },

    async put(key: string, value: ArrayBuffer | ReadableStream | string, options?: {
      httpMetadata?: { contentType?: string }
      customMetadata?: Record<string, string>
    }): Promise<MockR2Object> {
      requestLog.push({ method: 'put', key, options })

      // Check for simulated failure
      if (failOnNext.method === 'put' && failOnNext.count && failOnNext.count > 0) {
        failOnNext.count--
        throw failOnNext.error ?? new Error('Simulated R2 failure')
      }

      let data: ArrayBuffer
      if (value instanceof ArrayBuffer) {
        data = value
      } else if (typeof value === 'string') {
        data = new TextEncoder().encode(value).buffer
      } else {
        // ReadableStream - read all chunks
        const reader = value.getReader()
        const chunks: Uint8Array[] = []
        let done = false
        while (!done) {
          const result = await reader.read()
          done = result.done
          if (result.value) {
            chunks.push(result.value)
          }
        }
        const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
        const combined = new Uint8Array(totalLength)
        let offset = 0
        for (const chunk of chunks) {
          combined.set(chunk, offset)
          offset += chunk.length
        }
        data = combined.buffer
      }

      const metadata: MockR2Object = {
        key,
        size: data.byteLength,
        etag: `"${Math.random().toString(36).slice(2)}"`,
        uploaded: new Date(),
        httpMetadata: options?.httpMetadata,
        customMetadata: options?.customMetadata,
      }

      objects.set(key, { data, metadata })
      return metadata
    },

    async delete(key: string | string[]): Promise<void> {
      const keys = Array.isArray(key) ? key : [key]
      for (const k of keys) {
        requestLog.push({ method: 'delete', key: k })
        objects.delete(k)
      }
    },

    async list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<MockR2ListResult> {
      requestLog.push({ method: 'list', key: options?.prefix ?? '', options })

      // Check for simulated failure
      if (failOnNext.method === 'list' && failOnNext.count && failOnNext.count > 0) {
        failOnNext.count--
        throw failOnNext.error ?? new Error('Simulated R2 failure')
      }

      let entries = Array.from(objects.entries())

      // Apply prefix filter
      if (options?.prefix) {
        entries = entries.filter(([key]) => key.startsWith(options.prefix!))
      }

      // Sort by key
      entries.sort(([a], [b]) => a.localeCompare(b))

      // Apply limit
      const limit = options?.limit ?? 1000
      const truncated = entries.length > limit
      entries = entries.slice(0, limit)

      return {
        objects: entries.map(([, obj]) => obj.metadata),
        truncated,
        cursor: truncated ? entries[entries.length - 1]?.[0] : undefined,
        delimitedPrefixes: [],
      }
    },
  }
}

/**
 * Create mock partition data with custom metadata
 */
function createMockPartitionData(clusterId: string, vectorCount: number): {
  data: ArrayBuffer
  customMetadata: Record<string, string>
} {
  // Create fake Parquet-like data (in real impl, this would be actual Parquet bytes)
  const data = new ArrayBuffer(vectorCount * 768 * 4) // 768 floats per vector

  // Custom metadata encodes partition info
  const customMetadata: Record<string, string> = {
    'x-partition-cluster-id': clusterId,
    'x-partition-vector-count': String(vectorCount),
    'x-partition-dimensionality': '768',
    'x-partition-compression': 'snappy',
    'x-partition-created-at': String(Date.now()),
  }

  return { data, customMetadata }
}

// ============================================================================
// R2StorageAdapter Interface Tests (Import check)
// ============================================================================

describe('R2StorageAdapter Interface', () => {
  it('should export R2StorageAdapter interface from cold-vector-search', async () => {
    // This test verifies the interface is properly exported
    const module = await import('../src/cold-vector-search.js')
    expect(module).toHaveProperty('ColdVectorSearch')
    // The interface R2StorageAdapter should be usable for type checking
  })
})

// ============================================================================
// R2StorageAdapter Implementation Tests
// ============================================================================

describe('R2StorageAdapter', () => {
  // NOTE: These tests will fail until the R2StorageAdapter class is implemented
  // The implementation should be in packages/do-core/src/r2-adapter.ts

  describe('Constructor', () => {
    it('should create adapter with R2 bucket binding', async () => {
      // Import the not-yet-existing implementation
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)

      expect(adapter).toBeDefined()
      expect(adapter).toHaveProperty('get')
      expect(adapter).toHaveProperty('head')
      expect(adapter).toHaveProperty('list')
      expect(adapter).toHaveProperty('put')
      expect(adapter).toHaveProperty('getPartialRange')
    })

    it('should accept optional prefix configuration', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket, {
        prefix: 'vectors/',
      })

      expect(adapter).toBeDefined()
    })

    it('should accept retry configuration', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket, {
        maxRetries: 5,
        retryDelayMs: 200,
        retryBackoffMultiplier: 2,
      })

      expect(adapter).toBeDefined()
    })
  })

  describe('get()', () => {
    it('should retrieve partition data by key', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const { data, customMetadata } = createMockPartitionData('cluster-0', 100)
      await bucket.put('partitions/cluster-0.parquet', data, { customMetadata })

      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)
      const result = await adapter.get('partitions/cluster-0.parquet')

      expect(result).not.toBeNull()
      expect(result).toBeInstanceOf(ArrayBuffer)
      expect(result!.byteLength).toBe(data.byteLength)
    })

    it('should return null for non-existent key', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)

      const result = await adapter.get('partitions/nonexistent.parquet')

      expect(result).toBeNull()
    })

    it('should apply prefix to key when configured', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const { data, customMetadata } = createMockPartitionData('cluster-0', 100)
      await bucket.put('vectors/partitions/cluster-0.parquet', data, { customMetadata })

      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket, {
        prefix: 'vectors/',
      })

      // Should find it with just 'partitions/cluster-0.parquet' due to prefix
      const result = await adapter.get('partitions/cluster-0.parquet')

      expect(result).not.toBeNull()
    })

    it('should track request for monitoring', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)

      await adapter.get('partitions/cluster-0.parquet')

      expect(bucket._requestLog.some((r) => r.method === 'get')).toBe(true)
    })
  })

  describe('head()', () => {
    it('should return PartitionMetadata without downloading full object', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const { data, customMetadata } = createMockPartitionData('cluster-0', 150)
      await bucket.put('partitions/cluster-0.parquet', data, { customMetadata })

      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)
      const metadata = await adapter.head('partitions/cluster-0.parquet')

      expect(metadata).not.toBeNull()
      expect(metadata!.clusterId).toBe('cluster-0')
      expect(metadata!.vectorCount).toBe(150)
      expect(metadata!.dimensionality).toBe(768)
      expect(metadata!.compressionType).toBe('snappy')
      expect(metadata!.sizeBytes).toBeGreaterThan(0)
      expect(metadata!.createdAt).toBeDefined()
    })

    it('should return null for non-existent key', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)

      const metadata = await adapter.head('partitions/nonexistent.parquet')

      expect(metadata).toBeNull()
    })

    it('should parse custom metadata headers correctly', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const customMetadata: Record<string, string> = {
        'x-partition-cluster-id': 'my-cluster-id',
        'x-partition-vector-count': '999',
        'x-partition-dimensionality': '768',
        'x-partition-compression': 'zstd',
        'x-partition-created-at': '1704067200000',
      }
      await bucket.put('partitions/test.parquet', new ArrayBuffer(1024), { customMetadata })

      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)
      const metadata = await adapter.head('partitions/test.parquet')

      expect(metadata!.clusterId).toBe('my-cluster-id')
      expect(metadata!.vectorCount).toBe(999)
      expect(metadata!.compressionType).toBe('zstd')
      expect(metadata!.createdAt).toBe(1704067200000)
    })

    it('should use HEAD request (not GET) for efficiency', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const { data, customMetadata } = createMockPartitionData('cluster-0', 100)
      await bucket.put('partitions/cluster-0.parquet', data, { customMetadata })
      bucket._requestLog.length = 0 // Clear log

      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)
      await adapter.head('partitions/cluster-0.parquet')

      // Should have used HEAD, not GET
      expect(bucket._requestLog.some((r) => r.method === 'head')).toBe(true)
      expect(bucket._requestLog.every((r) => r.method !== 'get')).toBe(true)
    })
  })

  describe('list()', () => {
    it('should return partition keys by prefix', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      // Add multiple partitions
      for (let i = 0; i < 5; i++) {
        const { data, customMetadata } = createMockPartitionData(`cluster-${i}`, 100)
        await bucket.put(`partitions/cluster-${i}.parquet`, data, { customMetadata })
      }
      // Add unrelated object
      await bucket.put('other/file.txt', 'test')

      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)
      const keys = await adapter.list('partitions/')

      expect(keys).toHaveLength(5)
      expect(keys.every((k) => k.startsWith('partitions/'))).toBe(true)
    })

    it('should return empty array when no matches', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)

      const keys = await adapter.list('nonexistent/')

      expect(keys).toEqual([])
    })

    it('should handle pagination for large result sets', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      // Add many partitions
      for (let i = 0; i < 50; i++) {
        const { data, customMetadata } = createMockPartitionData(`cluster-${i}`, 10)
        await bucket.put(`partitions/cluster-${i.toString().padStart(2, '0')}.parquet`, data, { customMetadata })
      }

      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)
      const keys = await adapter.list('partitions/')

      // Should return all keys even if R2 paginates internally
      expect(keys).toHaveLength(50)
    })

    it('should apply prefix configuration', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      for (let i = 0; i < 3; i++) {
        const { data, customMetadata } = createMockPartitionData(`cluster-${i}`, 10)
        await bucket.put(`myns/partitions/cluster-${i}.parquet`, data, { customMetadata })
      }

      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket, {
        prefix: 'myns/',
      })

      // Search with 'partitions/' but adapter prefixes with 'myns/'
      const keys = await adapter.list('partitions/')

      expect(keys).toHaveLength(3)
    })
  })

  describe('put()', () => {
    it('should store partition data', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)

      const data = new ArrayBuffer(1024)
      await adapter.put('partitions/new-cluster.parquet', data)

      // Verify it was stored
      const retrieved = await bucket.get('partitions/new-cluster.parquet')
      expect(retrieved).not.toBeNull()
      expect(retrieved!.size).toBe(1024)
    })

    it('should store with custom metadata', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)

      const data = new ArrayBuffer(1024)
      const metadata: PartitionMetadata = {
        clusterId: 'my-cluster',
        vectorCount: 500,
        dimensionality: 768,
        compressionType: 'snappy',
        sizeBytes: 1024,
        createdAt: Date.now(),
      }

      await adapter.put('partitions/my-cluster.parquet', data, metadata)

      // Verify metadata was stored
      const head = await bucket.head('partitions/my-cluster.parquet')
      expect(head?.customMetadata?.['x-partition-cluster-id']).toBe('my-cluster')
      expect(head?.customMetadata?.['x-partition-vector-count']).toBe('500')
    })

    it('should apply prefix to key when configured', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket, {
        prefix: 'vectors/',
      })

      const data = new ArrayBuffer(1024)
      await adapter.put('partitions/cluster.parquet', data)

      // Should be stored with prefix
      const retrieved = await bucket.get('vectors/partitions/cluster.parquet')
      expect(retrieved).not.toBeNull()
    })

    it('should overwrite existing partition', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)

      // Store initial
      await adapter.put('partitions/cluster.parquet', new ArrayBuffer(100))

      // Overwrite with larger data
      await adapter.put('partitions/cluster.parquet', new ArrayBuffer(500))

      // Verify new size
      const retrieved = await bucket.get('partitions/cluster.parquet')
      expect(retrieved!.size).toBe(500)
    })
  })

  describe('getPartialRange()', () => {
    it('should support range reads for streaming', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      // Create larger data
      const fullData = new Uint8Array(10000)
      for (let i = 0; i < 10000; i++) {
        fullData[i] = i % 256
      }
      await bucket.put('partitions/large.parquet', fullData.buffer)

      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)
      const partial = await adapter.getPartialRange('partitions/large.parquet', 1000, 500)

      expect(partial).not.toBeNull()
      expect(partial!.byteLength).toBe(500)

      // Verify correct data was returned
      const view = new Uint8Array(partial!)
      expect(view[0]).toBe(1000 % 256) // First byte should be at offset 1000
    })

    it('should return null for non-existent key', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)

      const partial = await adapter.getPartialRange('partitions/nonexistent.parquet', 0, 100)

      expect(partial).toBeNull()
    })

    it('should handle range at end of file', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      await bucket.put('partitions/small.parquet', new ArrayBuffer(500))

      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)
      // Request range that goes past end of file
      const partial = await adapter.getPartialRange('partitions/small.parquet', 400, 200)

      expect(partial).not.toBeNull()
      // Should return only available bytes (100)
      expect(partial!.byteLength).toBeLessThanOrEqual(200)
    })

    it('should use R2 range request (not download full file)', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      await bucket.put('partitions/large.parquet', new ArrayBuffer(100000))
      bucket._requestLog.length = 0

      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)
      await adapter.getPartialRange('partitions/large.parquet', 5000, 1000)

      // Should have passed range option to get
      const getRequest = bucket._requestLog.find((r) => r.method === 'get')
      expect(getRequest).toBeDefined()
      expect(getRequest!.options).toHaveProperty('range')
    })
  })

  describe('Error Handling', () => {
    it('should handle R2 timeout errors', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      bucket._failOnNext = {
        method: 'get',
        error: new Error('Connection timeout'),
        count: 10, // Fail all retries
      }

      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)

      await expect(adapter.get('partitions/cluster-0.parquet')).rejects.toThrow('Connection timeout')
    })

    it('should handle R2 not found gracefully (return null)', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)

      // Not found should return null, not throw
      const result = await adapter.get('partitions/nonexistent.parquet')
      expect(result).toBeNull()
    })

    it('should propagate R2 errors with context', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      bucket._failOnNext = {
        method: 'put',
        error: new Error('Bucket write failed: quota exceeded'),
        count: 10,
      }

      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)

      await expect(adapter.put('partitions/cluster.parquet', new ArrayBuffer(1024))).rejects.toThrow(
        /quota exceeded/
      )
    })

    it('should handle list errors', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      bucket._failOnNext = {
        method: 'list',
        error: new Error('R2 service unavailable'),
        count: 10,
      }

      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)

      await expect(adapter.list('partitions/')).rejects.toThrow('R2 service unavailable')
    })
  })

  describe('Retry Behavior', () => {
    it('should retry transient failures with exponential backoff', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const { data, customMetadata } = createMockPartitionData('cluster-0', 100)
      await bucket.put('partitions/cluster-0.parquet', data, { customMetadata })

      // Fail first 2 attempts, succeed on 3rd
      bucket._failOnNext = {
        method: 'get',
        error: new Error('Temporary failure'),
        count: 2,
      }

      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket, {
        maxRetries: 3,
        retryDelayMs: 10, // Fast for testing
      })

      const result = await adapter.get('partitions/cluster-0.parquet')

      expect(result).not.toBeNull()
    })

    it('should fail after max retries exceeded', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      bucket._failOnNext = {
        method: 'get',
        error: new Error('Persistent failure'),
        count: 100, // Always fail
      }

      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket, {
        maxRetries: 3,
        retryDelayMs: 1,
      })

      await expect(adapter.get('partitions/cluster-0.parquet')).rejects.toThrow('Persistent failure')
    })

    it('should not retry on non-retryable errors (e.g., 404)', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      // Non-existent key returns null, not an error
      // So we test with a specific error type that shouldn't be retried

      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket, {
        maxRetries: 3,
        retryDelayMs: 10,
      })

      const startTime = Date.now()
      const result = await adapter.get('partitions/nonexistent.parquet')
      const elapsed = Date.now() - startTime

      // Should return null immediately without retries
      expect(result).toBeNull()
      expect(elapsed).toBeLessThan(100) // Should be fast, no retry delays
    })

    it('should apply backoff multiplier between retries', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const { data, customMetadata } = createMockPartitionData('cluster-0', 100)
      await bucket.put('partitions/cluster-0.parquet', data, { customMetadata })

      // Fail first 2 attempts
      bucket._failOnNext = {
        method: 'get',
        error: new Error('Temporary failure'),
        count: 2,
      }

      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket, {
        maxRetries: 3,
        retryDelayMs: 50,
        retryBackoffMultiplier: 2,
      })

      const startTime = Date.now()
      await adapter.get('partitions/cluster-0.parquet')
      const elapsed = Date.now() - startTime

      // Should have waited: 50ms + 100ms = 150ms minimum
      // Allow some buffer for execution time
      expect(elapsed).toBeGreaterThanOrEqual(100)
    })
  })

  describe('Integration with ColdVectorSearch', () => {
    it('should implement R2StorageAdapter interface correctly', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

      const bucket = createMockR2Bucket()
      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)

      // Verify interface methods exist with correct signatures
      expect(typeof adapter.get).toBe('function')
      expect(typeof adapter.head).toBe('function')
      expect(typeof adapter.list).toBe('function')

      // Verify return types match interface
      const getResult = await adapter.get('test')
      expect(getResult === null || getResult instanceof ArrayBuffer).toBe(true)

      const headResult = await adapter.head('test')
      expect(headResult === null || typeof headResult === 'object').toBe(true)

      const listResult = await adapter.list('test/')
      expect(Array.isArray(listResult)).toBe(true)
    })

    it('should work with ColdVectorSearch class', async () => {
      const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')
      const { ColdVectorSearch } = await import('../src/cold-vector-search.js')

      const bucket = createMockR2Bucket()
      const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)

      // Create minimal cluster index
      const clusterIndex = {
        version: 1,
        clusterCount: 0,
        totalVectors: 0,
        clusters: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }

      // Should be able to construct ColdVectorSearch with our adapter
      const search = new ColdVectorSearch(adapter, clusterIndex)
      expect(search).toBeDefined()
    })
  })
})

// ============================================================================
// Performance Tests
// ============================================================================

describe('R2StorageAdapter Performance', () => {
  it('should handle concurrent requests efficiently', async () => {
    const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

    const bucket = createMockR2Bucket()
    // Create 10 partitions
    for (let i = 0; i < 10; i++) {
      const { data, customMetadata } = createMockPartitionData(`cluster-${i}`, 100)
      await bucket.put(`partitions/cluster-${i}.parquet`, data, { customMetadata })
    }

    const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)

    const startTime = Date.now()
    // Fetch all 10 partitions concurrently
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) => adapter.get(`partitions/cluster-${i}.parquet`))
    )
    const elapsed = Date.now() - startTime

    expect(results.every((r) => r !== null)).toBe(true)
    // Concurrent requests should be faster than sequential
    expect(elapsed).toBeLessThan(1000)
  })

  it('should complete list operation in <100ms for 1000 objects', async () => {
    const { R2StorageAdapterImpl } = await import('../src/r2-adapter.js')

    const bucket = createMockR2Bucket()
    // Create 1000 small partitions (just metadata, minimal data)
    for (let i = 0; i < 1000; i++) {
      await bucket.put(`partitions/cluster-${i.toString().padStart(4, '0')}.parquet`, new ArrayBuffer(1))
    }

    const adapter = new R2StorageAdapterImpl(bucket as unknown as R2Bucket)

    const startTime = Date.now()
    const keys = await adapter.list('partitions/')
    const elapsed = Date.now() - startTime

    expect(keys).toHaveLength(1000)
    expect(elapsed).toBeLessThan(100)
  })
})

// ============================================================================
// Type exports (for use with ColdVectorSearch)
// ============================================================================

// Re-export type to verify it's compatible
type _R2StorageAdapterCheck = R2StorageAdapter

// Placeholder for R2Bucket type from @cloudflare/workers-types
// In the actual implementation, this would be imported from workers-types
declare global {
  interface R2Bucket {
    get(key: string, options?: { range?: { offset: number; length: number } }): Promise<R2ObjectBody | null>
    head(key: string): Promise<R2Object | null>
    put(key: string, value: ArrayBuffer | ReadableStream | string, options?: {
      httpMetadata?: { contentType?: string }
      customMetadata?: Record<string, string>
    }): Promise<R2Object>
    delete(key: string | string[]): Promise<void>
    list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<R2Objects>
  }

  interface R2Object {
    key: string
    size: number
    etag: string
    uploaded: Date
    httpMetadata?: { contentType?: string; contentEncoding?: string }
    customMetadata?: Record<string, string>
  }

  interface R2ObjectBody extends R2Object {
    body: ReadableStream<Uint8Array>
    bodyUsed: boolean
    arrayBuffer(): Promise<ArrayBuffer>
    text(): Promise<string>
    json<T>(): Promise<T>
    blob(): Promise<Blob>
  }

  interface R2Objects {
    objects: R2Object[]
    truncated: boolean
    cursor?: string
    delimitedPrefixes: string[]
  }
}
