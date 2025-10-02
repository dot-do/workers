/**
 * Job Processor Tests
 *
 * Tests for job processing functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { processJob, validateJob } from '../src/processor'
import type { QueueJobRecord } from '../src/index'

describe('Job Processor', () => {
  let mockEnv: any

  beforeEach(() => {
    mockEnv = {
      AI: {
        generateEmbedding: vi.fn().mockResolvedValue({
          embedding: new Array(768).fill(0.1),
        }),
        generateText: vi.fn().mockResolvedValue({
          text: 'Generated content',
          tokens: 100,
        }),
      },
      DB: {
        upsert: vi.fn().mockResolvedValue({ success: true }),
      },
    }

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
    })
  })

  describe('processJob', () => {
    it('should process send-email job', async () => {
      const payload = {
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'This is a test',
        from: 'noreply@example.com',
      }

      const result = await processJob('send-email', payload, mockEnv)

      expect(result).toBeDefined()
      expect(result.sent).toBe(true)
      expect(result.to).toBe(payload.to)
    })

    it('should throw error for send-email without required fields', async () => {
      const payload = { to: 'test@example.com' } // Missing subject and body

      await expect(processJob('send-email', payload, mockEnv)).rejects.toThrow('Missing required email fields')
    })

    it('should process generate-embedding job', async () => {
      const payload = {
        text: 'This is test text to embed',
        model: '@cf/baai/bge-base-en-v1.5',
      }

      const result = await processJob('generate-embedding', payload, mockEnv)

      expect(result).toBeDefined()
      expect(result.embedding).toHaveLength(768)
      expect(result.dimensions).toBe(768)
      expect(mockEnv.AI.generateEmbedding).toHaveBeenCalledWith(payload.text, {
        model: payload.model,
      })
    })

    it('should use default model for embeddings', async () => {
      const payload = { text: 'Test text' }

      await processJob('generate-embedding', payload, mockEnv)

      expect(mockEnv.AI.generateEmbedding).toHaveBeenCalledWith(payload.text, {
        model: '@cf/baai/bge-base-en-v1.5',
      })
    })

    it('should throw error for embedding without text', async () => {
      await expect(processJob('generate-embedding', {}, mockEnv)).rejects.toThrow('Missing required field: text')
    })

    it('should process crawl-website job', async () => {
      const payload = {
        url: 'https://example.com',
        maxPages: 5,
      }

      const result = await processJob('crawl-website', payload, mockEnv)

      expect(result).toBeDefined()
      expect(result.url).toBe(payload.url)
      expect(result.crawled).toBe(true)
    })

    it('should throw error for crawl without URL', async () => {
      await expect(processJob('crawl-website', {}, mockEnv)).rejects.toThrow('Missing required field: url')
    })

    it('should process generate-content job', async () => {
      const payload = {
        prompt: 'Write a short story',
        type: 'story',
      }

      const result = await processJob('generate-content', payload, mockEnv)

      expect(result).toBeDefined()
      expect(result.content).toBe('Generated content')
      expect(result.tokens).toBe(100)
      expect(mockEnv.AI.generateText).toHaveBeenCalledWith({
        prompt: payload.prompt,
        model: '@cf/meta/llama-3.1-8b-instruct',
      })
    })

    it('should process batch-import job', async () => {
      const payload = {
        items: [
          { id: 'item-1', data: { name: 'Item 1' } },
          { id: 'item-2', data: { name: 'Item 2' } },
        ],
        namespace: 'test',
      }

      const result = await processJob('batch-import', payload, mockEnv)

      expect(result).toBeDefined()
      expect(result.total).toBe(2)
      expect(result.success).toBeGreaterThan(0)
      expect(mockEnv.DB.upsert).toHaveBeenCalledTimes(2)
    })

    it('should throw error for batch-import without items', async () => {
      await expect(processJob('batch-import', {}, mockEnv)).rejects.toThrow('Missing or invalid field: items')
    })

    it('should process webhook-delivery job', async () => {
      const payload = {
        url: 'https://webhook.example.com',
        method: 'POST',
        body: { event: 'test' },
        headers: { 'X-Custom': 'value' },
      }

      const result = await processJob('webhook-delivery', payload, mockEnv)

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(result.status).toBe(200)
      expect(global.fetch).toHaveBeenCalledWith(payload.url, expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          'X-Custom': 'value',
        }),
      }))
    })

    it('should throw error for unknown job type', async () => {
      await expect(processJob('unknown-type', {}, mockEnv)).rejects.toThrow('Unknown job type')
    })
  })

  describe('validateJob', () => {
    it('should validate a valid job', () => {
      const job: QueueJobRecord = {
        id: 'test-id',
        type: 'test-job',
        payload: { test: 'data' },
        status: 'pending',
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = validateJob(job)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject job without type', () => {
      const job: any = {
        id: 'test-id',
        payload: { test: 'data' },
        status: 'pending',
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = validateJob(job)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('type is required')
    })

    it('should reject job without payload', () => {
      const job: any = {
        id: 'test-id',
        type: 'test-job',
        status: 'pending',
        priority: 0,
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = validateJob(job)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('payload is required')
    })

    it('should reject job that exceeded max attempts', () => {
      const job: QueueJobRecord = {
        id: 'test-id',
        type: 'test-job',
        payload: { test: 'data' },
        status: 'failed',
        priority: 0,
        attempts: 3,
        maxAttempts: 3,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const result = validateJob(job)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeded maximum retry attempts')
    })
  })
})
