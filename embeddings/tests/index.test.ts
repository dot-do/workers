import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EmbeddingsService, type Env } from '../src/index'

describe('EmbeddingsService', () => {
  let service: EmbeddingsService
  let mockEnv: Env
  let mockCtx: ExecutionContext

  beforeEach(() => {
    // Mock execution context
    mockCtx = {
      waitUntil: vi.fn(),
      passThroughOnException: vi.fn(),
    } as any

    // Mock environment bindings
    mockEnv = {
      DB: {
        getThing: vi.fn(),
        updateThingEmbedding: vi.fn(),
        getThingsWithoutEmbeddings: vi.fn(),
      },
      AI: {
        run: vi.fn(),
      },
      OPENAI_API_KEY: 'sk-test-key',
      EMBEDDINGS_QUEUE: {
        send: vi.fn(),
      },
    } as any

    service = new EmbeddingsService(mockCtx, mockEnv)
  })

  describe('generateEmbedding', () => {
    it('should generate embedding using Workers AI by default', async () => {
      const mockEmbedding = new Array(768).fill(0).map((_, i) => i / 768)
      mockEnv.AI.run = vi.fn().mockResolvedValue({
        data: [mockEmbedding],
      })

      const result = await service.generateEmbedding('test text')

      expect(result).toHaveLength(768)
      expect(mockEnv.AI.run).toHaveBeenCalledWith('@cf/google/embeddinggemma-300m', {
        text: ['test text'],
      })
    })

    it('should generate embedding using OpenAI when specified', async () => {
      const mockEmbedding = new Array(1536).fill(0).map((_, i) => i / 1536)

      // Mock fetch for OpenAI API
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ embedding: mockEmbedding }],
        }),
      })

      const result = await service.generateEmbedding('test text', 'openai')

      expect(result).toHaveLength(1536)
      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/embeddings',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test-key',
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should truncate text longer than 8000 characters', async () => {
      const longText = 'a'.repeat(10000)
      const mockEmbedding = new Array(768).fill(0)

      mockEnv.AI.run = vi.fn().mockResolvedValue({
        data: [mockEmbedding],
      })

      await service.generateEmbedding(longText)

      expect(mockEnv.AI.run).toHaveBeenCalledWith(
        '@cf/google/embeddinggemma-300m',
        expect.objectContaining({
          text: [expect.stringMatching(/^a{8000}$/)],
        })
      )
    })

    it('should throw error for invalid Workers AI embedding dimension', async () => {
      mockEnv.AI.run = vi.fn().mockResolvedValue({
        data: [[1, 2, 3]], // Wrong dimension
      })

      await expect(service.generateEmbedding('test')).rejects.toThrow(
        'Invalid Workers AI embedding dimension: expected 768, got 3'
      )
    })

    it('should throw error for OpenAI API failure', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      })

      await expect(service.generateEmbedding('test', 'openai')).rejects.toThrow(
        'OpenAI API error: 401 - Unauthorized'
      )
    })
  })

  describe('embedThing', () => {
    it('should embed thing successfully', async () => {
      const mockThing = {
        ns: 'onet',
        id: 'software-developers',
        type: 'Occupation',
        data: {
          name: 'Software Developers',
          description: 'Design and develop software applications',
        },
      }

      const mockEmbedding = new Array(768).fill(0)

      mockEnv.DB.getThing = vi.fn().mockResolvedValue(mockThing)
      mockEnv.AI.run = vi.fn().mockResolvedValue({ data: [mockEmbedding] })
      mockEnv.DB.updateThingEmbedding = vi.fn().mockResolvedValue(true)

      const result = await service.embedThing('onet', 'software-developers')

      expect(result).toBe(true)
      expect(mockEnv.DB.getThing).toHaveBeenCalledWith('onet', 'software-developers')
      expect(mockEnv.DB.updateThingEmbedding).toHaveBeenCalledWith('onet', 'software-developers', mockEmbedding)
    })

    it('should throw error if thing not found', async () => {
      mockEnv.DB.getThing = vi.fn().mockResolvedValue(null)

      await expect(service.embedThing('onet', 'nonexistent')).rejects.toThrow(
        'Thing not found: onet:nonexistent'
      )
    })

    it('should throw error if no text content to embed', async () => {
      mockEnv.DB.getThing = vi.fn().mockResolvedValue({
        ns: 'onet',
        id: 'test',
        type: 'Test',
        data: {},
      })

      await expect(service.embedThing('onet', 'test')).rejects.toThrow(
        'No text content to embed'
      )
    })
  })

  describe('backfillEmbeddings', () => {
    it('should backfill embeddings for things without them', async () => {
      const mockThings = [
        { ns: 'onet', id: 'occupation-1', type: 'Occupation', data: { name: 'Test 1' } },
        { ns: 'onet', id: 'occupation-2', type: 'Occupation', data: { name: 'Test 2' } },
        { ns: 'onet', id: 'occupation-3', type: 'Occupation', data: { name: 'Test 3' } },
      ]

      const mockEmbedding = new Array(768).fill(0)

      mockEnv.DB.getThingsWithoutEmbeddings = vi.fn().mockResolvedValue(mockThings)
      mockEnv.DB.getThing = vi.fn().mockImplementation((ns, id) =>
        mockThings.find(t => t.ns === ns && t.id === id)
      )
      mockEnv.AI.run = vi.fn().mockResolvedValue({ data: [mockEmbedding] })
      mockEnv.DB.updateThingEmbedding = vi.fn().mockResolvedValue(true)

      const result = await service.backfillEmbeddings({ limit: 100 })

      expect(result).toEqual({
        total: 3,
        successful: 3,
        failed: 0,
      })
      expect(mockEnv.DB.getThingsWithoutEmbeddings).toHaveBeenCalledWith(undefined, 100)
    })

    it('should handle failures gracefully', async () => {
      const mockThings = [
        { ns: 'onet', id: 'occupation-1', type: 'Occupation', data: { name: 'Test 1' } },
        { ns: 'onet', id: 'occupation-2', type: 'Occupation', data: {} }, // No name, will fail
      ]

      const mockEmbedding = new Array(768).fill(0)

      mockEnv.DB.getThingsWithoutEmbeddings = vi.fn().mockResolvedValue(mockThings)
      mockEnv.DB.getThing = vi.fn().mockImplementation((ns, id) =>
        mockThings.find(t => t.ns === ns && t.id === id)
      )
      mockEnv.AI.run = vi.fn().mockResolvedValue({ data: [mockEmbedding] })
      mockEnv.DB.updateThingEmbedding = vi.fn().mockResolvedValue(true)

      const result = await service.backfillEmbeddings({ limit: 100 })

      expect(result.total).toBe(2)
      expect(result.successful).toBe(1)
      expect(result.failed).toBe(1)
    })

    it('should filter by namespace if provided', async () => {
      mockEnv.DB.getThingsWithoutEmbeddings = vi.fn().mockResolvedValue([])

      await service.backfillEmbeddings({ ns: 'onet', limit: 50 })

      expect(mockEnv.DB.getThingsWithoutEmbeddings).toHaveBeenCalledWith('onet', 50)
    })
  })

  describe('compareEmbeddings', () => {
    it('should calculate cosine similarity correctly', () => {
      const emb1 = [1, 0, 0, 0]
      const emb2 = [1, 0, 0, 0]

      const similarity = service.compareEmbeddings(emb1, emb2)

      expect(similarity).toBe(1) // Identical vectors
    })

    it('should return 0 for orthogonal vectors', () => {
      const emb1 = [1, 0, 0, 0]
      const emb2 = [0, 1, 0, 0]

      const similarity = service.compareEmbeddings(emb1, emb2)

      expect(similarity).toBe(0)
    })

    it('should return negative for opposite vectors', () => {
      const emb1 = [1, 0, 0, 0]
      const emb2 = [-1, 0, 0, 0]

      const similarity = service.compareEmbeddings(emb1, emb2)

      expect(similarity).toBe(-1)
    })

    it('should throw error for different length embeddings', () => {
      const emb1 = [1, 0, 0]
      const emb2 = [1, 0, 0, 0]

      expect(() => service.compareEmbeddings(emb1, emb2)).toThrow(
        'Embeddings must have same length'
      )
    })

    it('should return 0 for zero vectors', () => {
      const emb1 = [0, 0, 0, 0]
      const emb2 = [1, 1, 1, 1]

      const similarity = service.compareEmbeddings(emb1, emb2)

      expect(similarity).toBe(0)
    })
  })

  describe('queueEmbeddingJob', () => {
    it('should queue embedding job successfully', async () => {
      mockEnv.EMBEDDINGS_QUEUE!.send = vi.fn().mockResolvedValue(undefined)

      const result = await service.queueEmbeddingJob('onet', 'software-developers')

      expect(result).toBe(true)
      expect(mockEnv.EMBEDDINGS_QUEUE!.send).toHaveBeenCalledWith({
        ns: 'onet',
        id: 'software-developers',
        model: 'workers-ai',
      })
    })

    it('should throw error if queue not configured', async () => {
      delete mockEnv.EMBEDDINGS_QUEUE

      await expect(service.queueEmbeddingJob('onet', 'test')).rejects.toThrow(
        'Embeddings queue not configured'
      )
    })

    it('should support custom model in queue job', async () => {
      mockEnv.EMBEDDINGS_QUEUE!.send = vi.fn().mockResolvedValue(undefined)

      await service.queueEmbeddingJob('onet', 'test', 'openai')

      expect(mockEnv.EMBEDDINGS_QUEUE!.send).toHaveBeenCalledWith({
        ns: 'onet',
        id: 'test',
        model: 'openai',
      })
    })
  })

  describe('generateEmbeddingText', () => {
    it('should extract meaningful text from thing', () => {
      const service = new EmbeddingsService(mockCtx, mockEnv)
      const thing = {
        id: 'software-developers',
        type: 'Occupation',
        data: {
          name: 'Software Developers',
          description: 'Design and develop software applications',
          skills: ['programming', 'problem-solving'],
        },
      }

      // Access private method via any cast for testing
      const text = (service as any).generateEmbeddingText(thing)

      expect(text).toContain('software developers')
      expect(text).toContain('Occupation')
      expect(text).toContain('Software Developers')
      expect(text).toContain('Design and develop software applications')
    })

    it('should handle missing fields gracefully', () => {
      const thing = {
        id: 'test',
        type: 'Test',
        data: {},
      }

      const text = (service as any).generateEmbeddingText(thing)

      expect(text).toBe('test Test ')
    })

    it('should include content field if present', () => {
      const thing = {
        id: 'test',
        type: 'Article',
        data: { title: 'Test Article' },
        content: 'This is the article content',
      }

      const text = (service as any).generateEmbeddingText(thing)

      expect(text).toContain('This is the article content')
    })
  })
})

describe('HTTP API', () => {
  it('should export HTTP handler', async () => {
    const module = await import('../src/index')
    expect(module.default).toBeDefined()
    expect(module.default.fetch).toBeDefined()
    expect(module.default.queue).toBeDefined()
  })
})

describe('Queue Handler', () => {
  it('should export queue handler', async () => {
    const module = await import('../src/index')
    expect(module.queue).toBeDefined()
    expect(typeof module.queue).toBe('function')
  })
})
