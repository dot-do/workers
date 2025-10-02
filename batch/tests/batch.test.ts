/**
 * Tests for Batch Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { BatchService } from '../src/index'

// Mock environment
const createMockEnv = () => {
  const storage = new Map<string, any>()

  return {
    DB: {
      upsert: vi.fn(async (items: any[], metadata: any) => {
        items.forEach((item) => {
          storage.set(item.$id, { data: item.data, metadata })
        })
        return { success: true }
      }),
      get: vi.fn(async (id: string) => {
        const stored = storage.get(id)
        return stored ? { data: stored } : null
      }),
      list: vi.fn(async (ns: string, options?: any) => {
        const items = Array.from(storage.entries())
          .filter(([key]) => key.startsWith(`${ns}/`))
          .map(([key, value]) => value)
        return { data: items }
      }),
    },
    BATCH_QUEUE: {
      send: vi.fn(async (message: any) => {
        return { success: true }
      }),
    },
    EMBEDDINGS: {
      embedThing: vi.fn(async (ns: string, id: string) => {
        return { embedding: [0.1, 0.2, 0.3] }
      }),
    },
  } as any
}

describe('BatchService', () => {
  let service: BatchService
  let env: any

  beforeEach(() => {
    env = createMockEnv()
    service = new BatchService({} as any, env)
  })

  describe('createBatchJob', () => {
    it('should create a batch job for import-things', async () => {
      const jobId = await service.createBatchJob({
        type: 'import-things',
        items: [
          { ns: 'test', id: 'item1', type: 'Thing', data: { name: 'Item 1' } },
          { ns: 'test', id: 'item2', type: 'Thing', data: { name: 'Item 2' } },
        ],
      })

      expect(jobId).toBeDefined()
      expect(env.DB.upsert).toHaveBeenCalled()
      expect(env.BATCH_QUEUE.send).toHaveBeenCalled()
    })

    it('should create a batch job for import-relationships', async () => {
      const jobId = await service.createBatchJob({
        type: 'import-relationships',
        items: [
          { ns: 'test', id: 'rel1', type: 'hasSkill', fromNs: 'test', fromId: 'item1', toNs: 'test', toId: 'skill1' },
        ],
      })

      expect(jobId).toBeDefined()
      expect(env.DB.upsert).toHaveBeenCalled()
      expect(env.BATCH_QUEUE.send).toHaveBeenCalled()
    })

    it('should create a batch job for generate-embeddings', async () => {
      const jobId = await service.createBatchJob({
        type: 'generate-embeddings',
        items: [
          { ns: 'test', id: 'item1' },
          { ns: 'test', id: 'item2' },
        ],
      })

      expect(jobId).toBeDefined()
      expect(env.DB.upsert).toHaveBeenCalled()
      expect(env.BATCH_QUEUE.send).toHaveBeenCalled()
    })

    it('should create a batch job for export-things', async () => {
      const jobId = await service.createBatchJob({
        type: 'export-things',
        items: [
          { ns: 'test', id: 'item1' },
          { ns: 'test', id: 'item2' },
        ],
      })

      expect(jobId).toBeDefined()
      expect(env.DB.upsert).toHaveBeenCalled()
      expect(env.BATCH_QUEUE.send).toHaveBeenCalled()
    })

    it('should create a batch job for transform-data', async () => {
      const jobId = await service.createBatchJob({
        type: 'transform-data',
        items: [{ data: 'test' }],
      })

      expect(jobId).toBeDefined()
      expect(env.DB.upsert).toHaveBeenCalled()
      expect(env.BATCH_QUEUE.send).toHaveBeenCalled()
    })

    it('should reject invalid batch type', async () => {
      await expect(
        service.createBatchJob({
          type: 'invalid-type' as any,
          items: [],
        })
      ).rejects.toThrow('Invalid batch type')
    })

    it('should store job with correct initial status', async () => {
      const jobId = await service.createBatchJob({
        type: 'import-things',
        items: [{ ns: 'test', id: 'item1', type: 'Thing', data: {} }],
      })

      const job = await service.getBatchJob(jobId)
      expect(job).toBeDefined()
      expect(job?.status).toBe('pending')
      expect(job?.processed).toBe(0)
      expect(job?.failed).toBe(0)
    })
  })

  describe('getBatchJob', () => {
    it('should retrieve a batch job', async () => {
      const jobId = await service.createBatchJob({
        type: 'import-things',
        items: [],
      })

      const job = await service.getBatchJob(jobId)
      expect(job).toBeDefined()
      expect(job?.id).toBe(jobId)
      expect(job?.type).toBe('import-things')
    })

    it('should return null for non-existent job', async () => {
      const job = await service.getBatchJob('non-existent')
      expect(job).toBeNull()
    })
  })

  describe('processBatch', () => {
    it('should process import-things items', async () => {
      const jobId = await service.createBatchJob({
        type: 'import-things',
        items: [
          { ns: 'test', id: 'item1', type: 'Thing', data: { name: 'Item 1' }, content: 'Test content' },
          { ns: 'test', id: 'item2', type: 'Thing', data: { name: 'Item 2' }, content: 'Test content 2' },
        ],
      })

      const items = [
        { ns: 'test', id: 'item1', type: 'Thing', data: { name: 'Item 1' }, content: 'Test content' },
        { ns: 'test', id: 'item2', type: 'Thing', data: { name: 'Item 2' }, content: 'Test content 2' },
      ]

      await service.processBatch(jobId, items)

      const job = await service.getBatchJob(jobId)
      expect(job?.processed).toBe(2)
      expect(job?.failed).toBe(0)
      expect(job?.status).toBe('completed')
    })

    it('should process import-relationships items', async () => {
      const jobId = await service.createBatchJob({
        type: 'import-relationships',
        items: [
          {
            ns: 'test',
            id: 'rel1',
            type: 'hasSkill',
            fromNs: 'test',
            fromId: 'item1',
            toNs: 'test',
            toId: 'skill1',
            data: {},
          },
        ],
      })

      const items = [
        {
          ns: 'test',
          id: 'rel1',
          type: 'hasSkill',
          fromNs: 'test',
          fromId: 'item1',
          toNs: 'test',
          toId: 'skill1',
          data: {},
        },
      ]

      await service.processBatch(jobId, items)

      const job = await service.getBatchJob(jobId)
      expect(job?.processed).toBe(1)
      expect(job?.failed).toBe(0)
      expect(job?.status).toBe('completed')
    })

    it('should process generate-embeddings items', async () => {
      const jobId = await service.createBatchJob({
        type: 'generate-embeddings',
        items: [
          { ns: 'test', id: 'item1' },
          { ns: 'test', id: 'item2' },
        ],
      })

      const items = [
        { ns: 'test', id: 'item1' },
        { ns: 'test', id: 'item2' },
      ]

      await service.processBatch(jobId, items)

      const job = await service.getBatchJob(jobId)
      expect(job?.processed).toBe(2)
      expect(job?.failed).toBe(0)
      expect(env.EMBEDDINGS.embedThing).toHaveBeenCalledTimes(2)
    })

    it('should handle errors and track failed items', async () => {
      // Make DB.upsert throw error on second call
      let callCount = 0
      env.DB.upsert.mockImplementation(async (items: any[], metadata: any) => {
        callCount++
        if (callCount === 2) {
          throw new Error('Database error')
        }
        return { success: true }
      })

      const jobId = await service.createBatchJob({
        type: 'import-things',
        items: [
          { ns: 'test', id: 'item1', type: 'Thing', data: {} },
          { ns: 'test', id: 'item2', type: 'Thing', data: {} },
        ],
      })

      const items = [
        { ns: 'test', id: 'item1', type: 'Thing', data: {} },
        { ns: 'test', id: 'item2', type: 'Thing', data: {} },
      ]

      await service.processBatch(jobId, items)

      const job = await service.getBatchJob(jobId)
      expect(job?.processed).toBe(1)
      expect(job?.failed).toBe(1)
      expect(job?.status).toBe('failed')
      expect(job?.errors).toHaveLength(1)
    })

    it('should throw error for non-existent job', async () => {
      await expect(service.processBatch('non-existent', [])).rejects.toThrow('Job non-existent not found')
    })
  })

  describe('exportToFormat', () => {
    it('should export to JSON format', async () => {
      // Add some test data
      await env.DB.upsert(
        [{ $id: 'test/item1', data: { name: 'Item 1' } }],
        { ns: 'test', $context: 'https://test.do', type: 'Thing', $type: 'Thing' }
      )

      const stream = await service.exportToFormat('test', 'json')
      expect(stream).toBeInstanceOf(ReadableStream)

      // Read stream
      const reader = stream.getReader()
      const { value } = await reader.read()
      const text = new TextDecoder().decode(value)

      expect(text).toContain('Item 1')
    })

    it('should export to NDJSON format', async () => {
      await env.DB.upsert(
        [
          { $id: 'test/item1', data: { name: 'Item 1' } },
          { $id: 'test/item2', data: { name: 'Item 2' } },
        ],
        { ns: 'test', $context: 'https://test.do', type: 'Thing', $type: 'Thing' }
      )

      const stream = await service.exportToFormat('test', 'ndjson')
      expect(stream).toBeInstanceOf(ReadableStream)

      // Read stream
      const reader = stream.getReader()
      const chunks: string[] = []
      let done = false

      while (!done) {
        const { value, done: isDone } = await reader.read()
        done = isDone
        if (value) {
          chunks.push(new TextDecoder().decode(value))
        }
      }

      const text = chunks.join('')
      expect(text).toContain('Item 1')
      expect(text).toContain('Item 2')
      expect(text.split('\n').filter((line) => line.trim()).length).toBeGreaterThan(0)
    })

    it('should export to CSV format', async () => {
      await env.DB.upsert(
        [{ $id: 'test/item1', data: { name: 'Item 1', value: 100 } }],
        { ns: 'test', $context: 'https://test.do', type: 'Thing', $type: 'Thing' }
      )

      const stream = await service.exportToFormat('test', 'csv')
      expect(stream).toBeInstanceOf(ReadableStream)

      // Read stream
      const reader = stream.getReader()
      const { value } = await reader.read()
      const text = new TextDecoder().decode(value)

      expect(text).toContain('name')
      expect(text).toContain('value')
    })
  })

  describe('getStats', () => {
    it('should return batch statistics', async () => {
      // Create some test jobs
      await service.createBatchJob({ type: 'import-things', items: [] })
      await service.createBatchJob({ type: 'import-relationships', items: [] })

      const stats = await service.getStats()

      expect(stats).toBeDefined()
      expect(stats.total).toBeGreaterThan(0)
      expect(stats.pending).toBeDefined()
      expect(stats.processing).toBeDefined()
      expect(stats.completed).toBeDefined()
      expect(stats.failed).toBeDefined()
      expect(stats.successRate).toBeDefined()
    })

    it('should calculate success rate correctly', async () => {
      const jobId1 = await service.createBatchJob({ type: 'import-things', items: [] })
      const jobId2 = await service.createBatchJob({ type: 'import-things', items: [] })

      // Mark one as completed, one as failed
      await env.DB.upsert(
        [{ $id: `batch/${jobId1}`, data: { status: 'completed' } }],
        { ns: 'batch', $context: 'https://batch.do', type: 'BatchJob', $type: 'BatchJob' }
      )

      await env.DB.upsert(
        [{ $id: `batch/${jobId2}`, data: { status: 'failed' } }],
        { ns: 'batch', $context: 'https://batch.do', type: 'BatchJob', $type: 'BatchJob' }
      )

      const stats = await service.getStats()

      expect(stats.completed).toBe(1)
      expect(stats.failed).toBe(1)
      expect(stats.successRate).toBe('50.00%')
    })
  })
})
