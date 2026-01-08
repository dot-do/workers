/**
 * RED Tests: Dataset R2 Storage
 *
 * Tests for storing datasets in Cloudflare R2.
 * Covers upload, download, chunking, and metadata management.
 *
 * Per workers-6d7j: Write failing tests for storing datasets in R2.
 * Tests should cover upload, download, and chunking.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Mock R2 Bucket interface for testing
 */
interface R2Object {
  key: string
  body: ReadableStream<Uint8Array>
  size: number
  etag: string
  httpEtag: string
  checksums: {
    md5?: ArrayBuffer
  }
  uploaded: Date
  httpMetadata?: {
    contentType?: string
  }
  customMetadata?: Record<string, string>
}

interface R2Bucket {
  put(key: string, value: ReadableStream | ArrayBuffer | string, options?: {
    httpMetadata?: {
      contentType?: string
    }
    customMetadata?: Record<string, string>
  }): Promise<R2Object | null>

  get(key: string): Promise<R2Object | null>

  delete(key: string): Promise<void>

  head(key: string): Promise<R2Object | null>

  list(options?: { prefix?: string; limit?: number }): Promise<{
    objects: Array<Pick<R2Object, 'key' | 'size' | 'etag' | 'uploaded'>>
    truncated: boolean
  }>
}

/**
 * Dataset metadata stored in SQLite
 */
export interface DatasetMetadata {
  id: string
  name: string
  format: 'json' | 'jsonl' | 'csv' | 'parquet'
  size: number
  recordCount: number
  checksum: string
  r2Key: string
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, unknown>
}

/**
 * Options for uploading a dataset
 */
export interface UploadOptions {
  format?: 'json' | 'jsonl' | 'csv' | 'parquet'
  chunkSize?: number
  metadata?: Record<string, unknown>
}

/**
 * Options for downloading a dataset
 */
export interface DownloadOptions {
  offset?: number
  limit?: number
}

/**
 * DatasetR2Storage interface - manages dataset storage in R2
 */
export interface DatasetR2Storage {
  /**
   * Upload a dataset to R2
   * @param datasetId - Unique dataset identifier
   * @param data - Dataset content as string or buffer
   * @param options - Upload options
   * @returns Metadata about the uploaded dataset
   */
  upload(datasetId: string, data: string | ArrayBuffer, options?: UploadOptions): Promise<DatasetMetadata>

  /**
   * Download a dataset from R2
   * @param datasetId - Dataset identifier
   * @param options - Download options
   * @returns Dataset content as string
   */
  download(datasetId: string, options?: DownloadOptions): Promise<string>

  /**
   * Get dataset metadata
   * @param datasetId - Dataset identifier
   * @returns Dataset metadata or null if not found
   */
  getMetadata(datasetId: string): Promise<DatasetMetadata | null>

  /**
   * List all datasets
   * @param options - List options
   * @returns Array of dataset metadata
   */
  list(options?: { limit?: number; offset?: number }): Promise<DatasetMetadata[]>

  /**
   * Delete a dataset
   * @param datasetId - Dataset identifier
   * @returns True if deleted, false if not found
   */
  delete(datasetId: string): Promise<boolean>

  /**
   * Check if a dataset exists
   * @param datasetId - Dataset identifier
   */
  exists(datasetId: string): Promise<boolean>
}

/**
 * Create a mock R2 bucket for testing
 */
function createMockR2Bucket(): R2Bucket {
  const storage = new Map<string, { value: string | ArrayBuffer; metadata?: any }>()

  return {
    async put(key, value, options) {
      let dataString: string
      if (value instanceof ReadableStream) {
        const reader = value.getReader()
        const chunks: Uint8Array[] = []
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          chunks.push(value)
        }
        const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
        const result = new Uint8Array(totalLength)
        let offset = 0
        for (const chunk of chunks) {
          result.set(chunk, offset)
          offset += chunk.length
        }
        dataString = new TextDecoder().decode(result)
      } else if (value instanceof ArrayBuffer) {
        dataString = new TextDecoder().decode(value)
      } else {
        dataString = value
      }

      storage.set(key, { value: dataString, metadata: options })

      return {
        key,
        body: new ReadableStream(),
        size: dataString.length,
        etag: 'mock-etag',
        httpEtag: 'mock-http-etag',
        checksums: {},
        uploaded: new Date(),
        httpMetadata: options?.httpMetadata,
        customMetadata: options?.customMetadata,
      }
    },

    async get(key) {
      const item = storage.get(key)
      if (!item) return null

      const encoder = new TextEncoder()
      const data = typeof item.value === 'string' ? encoder.encode(item.value) : item.value

      return {
        key,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new Uint8Array(data))
            controller.close()
          },
        }),
        size: typeof item.value === 'string' ? item.value.length : (item.value as ArrayBuffer).byteLength,
        etag: 'mock-etag',
        httpEtag: 'mock-http-etag',
        checksums: {},
        uploaded: new Date(),
        httpMetadata: item.metadata?.httpMetadata,
        customMetadata: item.metadata?.customMetadata,
      }
    },

    async delete(key) {
      storage.delete(key)
    },

    async head(key) {
      const item = storage.get(key)
      if (!item) return null

      return {
        key,
        body: new ReadableStream(),
        size: typeof item.value === 'string' ? item.value.length : (item.value as ArrayBuffer).byteLength,
        etag: 'mock-etag',
        httpEtag: 'mock-http-etag',
        checksums: {},
        uploaded: new Date(),
        httpMetadata: item.metadata?.httpMetadata,
        customMetadata: item.metadata?.customMetadata,
      }
    },

    async list(options) {
      const keys = Array.from(storage.keys())
        .filter(k => !options?.prefix || k.startsWith(options.prefix))
        .slice(0, options?.limit || 1000)

      return {
        objects: keys.map(key => ({
          key,
          size: typeof storage.get(key)!.value === 'string'
            ? storage.get(key)!.value.length
            : (storage.get(key)!.value as ArrayBuffer).byteLength,
          etag: 'mock-etag',
          uploaded: new Date(),
        })),
        truncated: false,
      }
    },
  }
}

/**
 * Create a mock SQLite database for metadata
 */
function createMockDb() {
  const datasets = new Map<string, DatasetMetadata>()

  return {
    async insertDataset(metadata: DatasetMetadata) {
      datasets.set(metadata.id, metadata)
    },

    async getDataset(id: string): Promise<DatasetMetadata | null> {
      return datasets.get(id) || null
    },

    async listDatasets(options?: { limit?: number; offset?: number }): Promise<DatasetMetadata[]> {
      const all = Array.from(datasets.values())
      const offset = options?.offset || 0
      const limit = options?.limit || 100
      return all.slice(offset, offset + limit)
    },

    async deleteDataset(id: string): Promise<boolean> {
      return datasets.delete(id)
    },

    async updateDataset(id: string, updates: Partial<DatasetMetadata>) {
      const existing = datasets.get(id)
      if (existing) {
        datasets.set(id, { ...existing, ...updates, updatedAt: new Date() })
      }
    },
  }
}

/**
 * Attempt to load DatasetR2Storage - will fail until implemented
 */
async function loadDatasetR2Storage(): Promise<new (r2: R2Bucket, db: any) => DatasetR2Storage> {
  // This will fail in RED phase because the module doesn't exist yet
  const module = await import('../src/storage/dataset-r2-storage.js')
  return module.DatasetR2Storage
}

describe('DatasetR2Storage', () => {
  let r2: R2Bucket
  let db: ReturnType<typeof createMockDb>
  let DatasetR2StorageClass: new (r2: R2Bucket, db: any) => DatasetR2Storage
  let storage: DatasetR2Storage

  beforeEach(async () => {
    r2 = createMockR2Bucket()
    db = createMockDb()
    DatasetR2StorageClass = await loadDatasetR2Storage()
    storage = new DatasetR2StorageClass(r2, db)
  })

  describe('upload()', () => {
    it('should upload a JSON dataset to R2', async () => {
      const datasetId = 'test-dataset-1'
      const data = JSON.stringify([
        { id: 1, text: 'Hello', label: 'greeting' },
        { id: 2, text: 'Goodbye', label: 'farewell' },
      ])

      const metadata = await storage.upload(datasetId, data, { format: 'json' })

      expect(metadata.id).toBe(datasetId)
      expect(metadata.format).toBe('json')
      expect(metadata.size).toBe(data.length)
      expect(metadata.recordCount).toBe(2)
      expect(metadata.r2Key).toMatch(/^datasets\/.+/)
      expect(metadata.checksum).toBeDefined()
      expect(metadata.createdAt).toBeInstanceOf(Date)
    })

    it('should upload a JSONL dataset to R2', async () => {
      const datasetId = 'test-dataset-jsonl'
      const data = '{"id":1,"text":"Hello"}\n{"id":2,"text":"World"}\n'

      const metadata = await storage.upload(datasetId, data, { format: 'jsonl' })

      expect(metadata.format).toBe('jsonl')
      expect(metadata.recordCount).toBe(2)
    })

    it('should upload a CSV dataset to R2', async () => {
      const datasetId = 'test-dataset-csv'
      const data = 'id,text,label\n1,Hello,greeting\n2,Goodbye,farewell\n'

      const metadata = await storage.upload(datasetId, data, { format: 'csv' })

      expect(metadata.format).toBe('csv')
      expect(metadata.recordCount).toBe(2) // Excluding header
    })

    it('should handle large datasets with chunking', async () => {
      const datasetId = 'large-dataset'
      // Create a large dataset (>1MB)
      const records = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        text: `Record ${i} with some content to make it larger - padding with more text to reach size threshold`,
        label: `label-${i % 10}`,
        description: 'Additional field to increase record size and ensure we exceed 1MB threshold',
      }))
      const data = JSON.stringify(records)

      const metadata = await storage.upload(datasetId, data, {
        format: 'json',
        chunkSize: 1024 * 512, // 512KB chunks
      })

      expect(metadata.size).toBeGreaterThan(1024 * 1024) // > 1MB
      expect(metadata.recordCount).toBe(10000)
    })

    it('should store custom metadata', async () => {
      const datasetId = 'dataset-with-metadata'
      const data = JSON.stringify([{ test: 'data' }])
      const customMetadata = {
        source: 'test-source',
        version: '1.0.0',
        author: 'test-author',
      }

      const metadata = await storage.upload(datasetId, data, {
        format: 'json',
        metadata: customMetadata,
      })

      expect(metadata.metadata).toEqual(customMetadata)
    })

    it('should calculate checksum for data integrity', async () => {
      const datasetId = 'dataset-checksum'
      const data = JSON.stringify([{ test: 'data' }])

      const metadata = await storage.upload(datasetId, data, { format: 'json' })

      expect(metadata.checksum).toBeDefined()
      expect(metadata.checksum).toMatch(/^[a-f0-9]{32}$/) // MD5 hex format
    })

    it('should handle ArrayBuffer data', async () => {
      const datasetId = 'binary-dataset'
      const data = new TextEncoder().encode(JSON.stringify([{ test: 'data' }]))

      const metadata = await storage.upload(datasetId, data.buffer, { format: 'json' })

      expect(metadata.size).toBe(data.length)
    })

    it('should reject invalid format', async () => {
      const datasetId = 'invalid-format'
      const data = 'test data'

      await expect(
        storage.upload(datasetId, data, { format: 'invalid' as any })
      ).rejects.toThrow(/invalid format/i)
    })

    it('should handle empty datasets', async () => {
      const datasetId = 'empty-dataset'
      const data = JSON.stringify([])

      const metadata = await storage.upload(datasetId, data, { format: 'json' })

      expect(metadata.recordCount).toBe(0)
      expect(metadata.size).toBeGreaterThan(0) // Still has "[]"
    })
  })

  describe('download()', () => {
    it('should download a dataset from R2', async () => {
      const datasetId = 'download-test'
      const originalData = JSON.stringify([{ id: 1, text: 'Test' }])

      await storage.upload(datasetId, originalData, { format: 'json' })
      const downloaded = await storage.download(datasetId)

      expect(downloaded).toBe(originalData)
    })

    it('should throw error for non-existent dataset', async () => {
      await expect(storage.download('nonexistent')).rejects.toThrow(/not found/i)
    })

    it('should support partial downloads with offset and limit', async () => {
      const datasetId = 'partial-download'
      const records = Array.from({ length: 100 }, (_, i) => ({ id: i }))
      const data = records.map(r => JSON.stringify(r)).join('\n')

      await storage.upload(datasetId, data, { format: 'jsonl' })
      const partial = await storage.download(datasetId, { offset: 10, limit: 5 })

      const lines = partial.trim().split('\n')
      expect(lines).toHaveLength(5)
      expect(JSON.parse(lines[0]).id).toBe(10)
      expect(JSON.parse(lines[4]).id).toBe(14)
    })

    it('should handle large dataset downloads', async () => {
      const datasetId = 'large-download'
      const records = Array.from({ length: 5000 }, (_, i) => ({ id: i, data: 'x'.repeat(100) }))
      const data = JSON.stringify(records)

      await storage.upload(datasetId, data, { format: 'json' })
      const downloaded = await storage.download(datasetId)

      expect(downloaded.length).toBe(data.length)
    })
  })

  describe('getMetadata()', () => {
    it('should return metadata for existing dataset', async () => {
      const datasetId = 'metadata-test'
      const data = JSON.stringify([{ test: 'data' }])

      await storage.upload(datasetId, data, { format: 'json' })
      const metadata = await storage.getMetadata(datasetId)

      expect(metadata).not.toBeNull()
      expect(metadata!.id).toBe(datasetId)
      expect(metadata!.format).toBe('json')
      expect(metadata!.size).toBe(data.length)
    })

    it('should return null for non-existent dataset', async () => {
      const metadata = await storage.getMetadata('nonexistent')
      expect(metadata).toBeNull()
    })

    it('should include custom metadata', async () => {
      const datasetId = 'custom-metadata-test'
      const data = JSON.stringify([{ test: 'data' }])
      const customMetadata = { version: '1.0.0' }

      await storage.upload(datasetId, data, { format: 'json', metadata: customMetadata })
      const metadata = await storage.getMetadata(datasetId)

      expect(metadata!.metadata).toEqual(customMetadata)
    })
  })

  describe('list()', () => {
    it('should list all datasets', async () => {
      await storage.upload('dataset-1', JSON.stringify([{ a: 1 }]), { format: 'json' })
      await storage.upload('dataset-2', JSON.stringify([{ b: 2 }]), { format: 'jsonl' })
      await storage.upload('dataset-3', 'id,val\n1,test\n', { format: 'csv' })

      const datasets = await storage.list()

      expect(datasets).toHaveLength(3)
      expect(datasets.map(d => d.id).sort()).toEqual(['dataset-1', 'dataset-2', 'dataset-3'])
    })

    it('should return empty array when no datasets exist', async () => {
      const datasets = await storage.list()
      expect(datasets).toEqual([])
    })

    it('should support pagination', async () => {
      for (let i = 0; i < 20; i++) {
        await storage.upload(`dataset-${i}`, JSON.stringify([{ id: i }]), { format: 'json' })
      }

      const page1 = await storage.list({ limit: 10, offset: 0 })
      const page2 = await storage.list({ limit: 10, offset: 10 })

      expect(page1).toHaveLength(10)
      expect(page2).toHaveLength(10)
      expect(page1[0].id).not.toBe(page2[0].id)
    })
  })

  describe('delete()', () => {
    it('should delete a dataset from R2 and metadata', async () => {
      const datasetId = 'delete-test'
      await storage.upload(datasetId, JSON.stringify([{ test: 'data' }]), { format: 'json' })

      const deleted = await storage.delete(datasetId)

      expect(deleted).toBe(true)
      expect(await storage.exists(datasetId)).toBe(false)
      expect(await storage.getMetadata(datasetId)).toBeNull()
    })

    it('should return false for non-existent dataset', async () => {
      const deleted = await storage.delete('nonexistent')
      expect(deleted).toBe(false)
    })

    it('should clean up both R2 and SQLite', async () => {
      const datasetId = 'cleanup-test'
      await storage.upload(datasetId, JSON.stringify([{ test: 'data' }]), { format: 'json' })
      await storage.delete(datasetId)

      // Verify both are cleaned up
      expect(await storage.exists(datasetId)).toBe(false)
      expect(await storage.getMetadata(datasetId)).toBeNull()
    })
  })

  describe('exists()', () => {
    it('should return true for existing dataset', async () => {
      const datasetId = 'exists-test'
      await storage.upload(datasetId, JSON.stringify([{ test: 'data' }]), { format: 'json' })

      expect(await storage.exists(datasetId)).toBe(true)
    })

    it('should return false for non-existent dataset', async () => {
      expect(await storage.exists('nonexistent')).toBe(false)
    })
  })

  describe('concurrent operations', () => {
    it('should handle concurrent uploads', async () => {
      const uploads = Array.from({ length: 10 }, (_, i) =>
        storage.upload(`concurrent-${i}`, JSON.stringify([{ id: i }]), { format: 'json' })
      )

      const results = await Promise.all(uploads)

      expect(results).toHaveLength(10)
      expect(new Set(results.map(r => r.id)).size).toBe(10) // All unique
    })

    it('should handle concurrent downloads', async () => {
      // Upload datasets first
      for (let i = 0; i < 5; i++) {
        await storage.upload(`concurrent-dl-${i}`, JSON.stringify([{ id: i }]), { format: 'json' })
      }

      const downloads = Array.from({ length: 5 }, (_, i) =>
        storage.download(`concurrent-dl-${i}`)
      )

      const results = await Promise.all(downloads)

      expect(results).toHaveLength(5)
      results.forEach((data, i) => {
        expect(JSON.parse(data)[0].id).toBe(i)
      })
    })
  })

  describe('error handling', () => {
    it('should handle R2 upload failures gracefully', async () => {
      const failingR2 = {
        ...r2,
        put: vi.fn().mockRejectedValue(new Error('R2 service unavailable')),
      }
      const failingStorage = new DatasetR2StorageClass(failingR2, db)

      await expect(
        failingStorage.upload('fail-test', JSON.stringify([{ test: 'data' }]), { format: 'json' })
      ).rejects.toThrow(/R2 service unavailable|upload failed/i)
    })

    it('should handle corrupted data gracefully', async () => {
      const datasetId = 'corrupted-test'
      await storage.upload(datasetId, 'not valid json', { format: 'json' })

      // Should still be able to download the raw data
      const data = await storage.download(datasetId)
      expect(data).toBe('not valid json')
    })
  })
})
