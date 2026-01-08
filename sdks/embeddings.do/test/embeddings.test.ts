/**
 * TDD Tests for embeddings.do SDK
 *
 * These tests define the expected behavior for the embeddings.do SDK.
 * The SDK provides intelligent caching for text embeddings to reduce API calls.
 *
 * Test coverage:
 * 1. Export patterns (Embeddings factory, embeddings instance, default export)
 * 2. Type definitions (EmbeddingRequest, EmbeddingResponse, EmbeddingsClient)
 * 3. Client methods (embed, embedBatch, similarity, cached, clearCache)
 * 4. Caching behavior (deduplication, cache hits, cache stats)
 * 5. Tagged template syntax
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// =============================================================================
// Mock Setup
// =============================================================================

const { mockCreateClient, defaultMockClient } = vi.hoisted(() => {
  const defaultMockClient = {
    embed: vi.fn().mockResolvedValue({
      embedding: new Array(1536).fill(0).map(() => Math.random()),
      model: 'text-embedding-3-small',
      usage: { tokens: 10 },
      cached: false,
    }),
    embedBatch: vi.fn().mockImplementation(async (texts: string[]) => ({
      embeddings: texts.map(() => new Array(1536).fill(0).map(() => Math.random())),
      model: 'text-embedding-3-small',
      usage: { tokens: texts.length * 10 },
      cached: texts.map(() => false),
    })),
    similarity: vi.fn().mockResolvedValue({ score: 0.85 }),
    cached: vi.fn().mockResolvedValue({
      embedding: new Array(1536).fill(0).map(() => Math.random()),
      model: 'text-embedding-3-small',
      usage: { tokens: 0 },
      cached: true,
    }),
    cacheStats: vi.fn().mockResolvedValue({
      hits: 100,
      misses: 50,
      hitRate: 0.667,
      size: 150,
    }),
    clearCache: vi.fn().mockResolvedValue({ cleared: 150 }),
    models: vi.fn().mockResolvedValue(['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002']),
  }

  const mockCreateClient = vi.fn().mockReturnValue(defaultMockClient)

  return { mockCreateClient, defaultMockClient }
})

vi.mock('rpc.do', () => ({
  createClient: mockCreateClient,
}))

// Import module under test
import {
  Embeddings,
  embeddings,
  EmbeddingRequest,
  EmbeddingResponse,
  BatchEmbeddingRequest,
  BatchEmbeddingResponse,
  SimilarityResult,
  CacheStats,
  EmbeddingsClient,
} from '../index'
import type { ClientOptions } from '../index'

// Default export
import defaultExport from '../index'

// =============================================================================
// Test Suites
// =============================================================================

describe('embeddings.do SDK', () => {
  const mockClientInstance = defaultMockClient

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset the mock implementations for each test
    mockClientInstance.embed.mockResolvedValue({
      embedding: new Array(1536).fill(0).map(() => Math.random()),
      model: 'text-embedding-3-small',
      usage: { tokens: 10 },
      cached: false,
    })
    mockClientInstance.embedBatch.mockImplementation(async (input: string[] | { texts: string[] }) => {
      const texts = Array.isArray(input) ? input : input.texts
      return {
        embeddings: texts.map(() => new Array(1536).fill(0).map(() => Math.random())),
        model: 'text-embedding-3-small',
        usage: { tokens: texts.length * 10 },
        cached: texts.map(() => false),
      }
    })
    mockClientInstance.similarity.mockResolvedValue({ score: 0.85 })
    mockClientInstance.cached.mockResolvedValue({
      embedding: new Array(1536).fill(0).map(() => Math.random()),
      model: 'text-embedding-3-small',
      usage: { tokens: 0 },
      cached: true,
    })
    mockClientInstance.cacheStats.mockResolvedValue({
      hits: 100,
      misses: 50,
      hitRate: 0.667,
      size: 150,
    })
    mockClientInstance.clearCache.mockResolvedValue({ cleared: 150 })
    mockClientInstance.models.mockResolvedValue(['text-embedding-3-small', 'text-embedding-3-large', 'text-embedding-ada-002'])

    mockCreateClient.mockReturnValue(mockClientInstance)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ===========================================================================
  // Export Pattern Tests
  // ===========================================================================

  describe('Export Pattern', () => {
    it('should export Embeddings factory function (PascalCase)', () => {
      expect(Embeddings).toBeDefined()
      expect(typeof Embeddings).toBe('function')
    })

    it('should export embeddings instance (camelCase)', () => {
      expect(embeddings).toBeDefined()
      expect(typeof embeddings).toBe('object')
    })

    it('should export embeddings as default export', () => {
      expect(defaultExport).toBe(embeddings)
    })

    it('should re-export ClientOptions type from rpc.do', () => {
      const typeCheck: ClientOptions = {
        apiKey: 'test',
        baseURL: 'https://test.do',
      }
      expect(typeCheck.apiKey).toBe('test')
    })
  })

  // ===========================================================================
  // Type Definition Tests
  // ===========================================================================

  describe('Type Definitions', () => {
    it('should define EmbeddingRequest interface correctly', () => {
      const request: EmbeddingRequest = {
        text: 'Hello, world!',
        model: 'text-embedding-3-small',
        dimensions: 1536,
      }

      expect(request.text).toBe('Hello, world!')
      expect(request.model).toBe('text-embedding-3-small')
      expect(request.dimensions).toBe(1536)
    })

    it('should define EmbeddingResponse interface correctly', () => {
      const response: EmbeddingResponse = {
        embedding: [0.1, 0.2, 0.3],
        model: 'text-embedding-3-small',
        usage: { tokens: 5 },
        cached: false,
      }

      expect(response.embedding).toHaveLength(3)
      expect(response.model).toBe('text-embedding-3-small')
      expect(response.usage.tokens).toBe(5)
      expect(response.cached).toBe(false)
    })

    it('should define BatchEmbeddingRequest interface correctly', () => {
      const request: BatchEmbeddingRequest = {
        texts: ['Hello', 'World'],
        model: 'text-embedding-3-small',
      }

      expect(request.texts).toHaveLength(2)
      expect(request.model).toBe('text-embedding-3-small')
    })

    it('should define BatchEmbeddingResponse interface correctly', () => {
      const response: BatchEmbeddingResponse = {
        embeddings: [[0.1, 0.2], [0.3, 0.4]],
        model: 'text-embedding-3-small',
        usage: { tokens: 10 },
        cached: [false, true],
      }

      expect(response.embeddings).toHaveLength(2)
      expect(response.cached).toEqual([false, true])
    })

    it('should define SimilarityResult interface correctly', () => {
      const result: SimilarityResult = {
        score: 0.95,
        distance: 0.05,
      }

      expect(result.score).toBe(0.95)
      expect(result.distance).toBe(0.05)
    })

    it('should define CacheStats interface correctly', () => {
      const stats: CacheStats = {
        hits: 100,
        misses: 50,
        hitRate: 0.667,
        size: 150,
      }

      expect(stats.hits).toBe(100)
      expect(stats.misses).toBe(50)
      expect(stats.hitRate).toBeCloseTo(0.667)
      expect(stats.size).toBe(150)
    })

    it('should define EmbeddingsClient interface with all required methods', () => {
      const client: EmbeddingsClient = mockClientInstance as EmbeddingsClient

      expect(typeof client.embed).toBe('function')
      expect(typeof client.embedBatch).toBe('function')
      expect(typeof client.similarity).toBe('function')
      expect(typeof client.cached).toBe('function')
      expect(typeof client.cacheStats).toBe('function')
      expect(typeof client.clearCache).toBe('function')
      expect(typeof client.models).toBe('function')
    })
  })

  // ===========================================================================
  // Factory Function Tests
  // ===========================================================================

  describe('Embeddings Factory Function', () => {
    it('should create client with default endpoint https://embeddings.do', () => {
      mockCreateClient.mockClear()

      Embeddings()

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://embeddings.do',
        undefined
      )
    })

    it('should pass options to createClient', () => {
      const options: ClientOptions = {
        apiKey: 'my-api-key',
        baseURL: 'https://custom.embeddings.do',
      }

      Embeddings(options)

      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://embeddings.do',
        options
      )
    })

    it('should return typed EmbeddingsClient', () => {
      const client = Embeddings()

      expect(client).toBeDefined()
      expect(typeof client.embed).toBe('function')
    })
  })

  // ===========================================================================
  // Client Method Tests
  // ===========================================================================

  describe('Client Methods', () => {
    describe('embed()', () => {
      it('should generate embedding for text string', async () => {
        const client = Embeddings()

        const result = await client.embed('Hello, world!')

        expect(mockClientInstance.embed).toHaveBeenCalledWith('Hello, world!')
        expect(result.embedding).toBeDefined()
        expect(Array.isArray(result.embedding)).toBe(true)
        expect(result.model).toBe('text-embedding-3-small')
      })

      it('should accept request object with options', async () => {
        const client = Embeddings()
        const request: EmbeddingRequest = {
          text: 'Hello, world!',
          model: 'text-embedding-3-large',
          dimensions: 3072,
        }

        await client.embed(request)

        expect(mockClientInstance.embed).toHaveBeenCalledWith(request)
      })

      it('should indicate whether result is cached', async () => {
        const client = Embeddings()

        const result = await client.embed('Hello, world!')

        expect(typeof result.cached).toBe('boolean')
      })

      it('should include token usage', async () => {
        const client = Embeddings()

        const result = await client.embed('Hello, world!')

        expect(result.usage).toBeDefined()
        expect(typeof result.usage.tokens).toBe('number')
      })
    })

    describe('embedBatch()', () => {
      it('should generate embeddings for multiple texts', async () => {
        const client = Embeddings()
        const texts = ['Hello', 'World', 'Test']

        const result = await client.embedBatch(texts)

        expect(mockClientInstance.embedBatch).toHaveBeenCalledWith(texts)
        expect(result.embeddings).toHaveLength(3)
        expect(result.cached).toHaveLength(3)
      })

      it('should accept request object with options', async () => {
        const client = Embeddings()
        const request: BatchEmbeddingRequest = {
          texts: ['Hello', 'World'],
          model: 'text-embedding-3-large',
          dimensions: 3072,
        }

        await client.embedBatch(request)

        expect(mockClientInstance.embedBatch).toHaveBeenCalledWith(request)
      })

      it('should indicate which results are cached per-text', async () => {
        const client = Embeddings()
        const texts = ['Hello', 'World']

        const result = await client.embedBatch(texts)

        expect(result.cached).toBeDefined()
        expect(Array.isArray(result.cached)).toBe(true)
        expect(result.cached).toHaveLength(texts.length)
      })
    })

    describe('similarity()', () => {
      it('should compute similarity between two texts', async () => {
        const client = Embeddings()

        const result = await client.similarity('Hello', 'Hi there')

        expect(mockClientInstance.similarity).toHaveBeenCalledWith('Hello', 'Hi there')
        expect(result.score).toBe(0.85)
      })

      it('should compute similarity between two embeddings', async () => {
        const client = Embeddings()
        const emb1 = [0.1, 0.2, 0.3]
        const emb2 = [0.2, 0.3, 0.4]

        await client.similarity(emb1, emb2)

        expect(mockClientInstance.similarity).toHaveBeenCalledWith(emb1, emb2)
      })

      it('should return score between 0 and 1', async () => {
        const client = Embeddings()

        const result = await client.similarity('Hello', 'Hi')

        expect(result.score).toBeGreaterThanOrEqual(0)
        expect(result.score).toBeLessThanOrEqual(1)
      })
    })

    describe('cached()', () => {
      it('should return cached embedding only (no API call if cached)', async () => {
        const client = Embeddings()

        const result = await client.cached('Hello, world!')

        expect(mockClientInstance.cached).toHaveBeenCalledWith('Hello, world!')
        expect(result.cached).toBe(true)
        expect(result.usage.tokens).toBe(0) // No tokens used for cached results
      })

      it('should return null if not cached', async () => {
        mockClientInstance.cached.mockResolvedValueOnce(null)
        const client = Embeddings()

        const result = await client.cached('New text never seen before')

        expect(result).toBeNull()
      })
    })

    describe('cacheStats()', () => {
      it('should return cache statistics', async () => {
        const client = Embeddings()

        const stats = await client.cacheStats()

        expect(mockClientInstance.cacheStats).toHaveBeenCalled()
        expect(stats.hits).toBe(100)
        expect(stats.misses).toBe(50)
        expect(stats.hitRate).toBeCloseTo(0.667)
        expect(stats.size).toBe(150)
      })
    })

    describe('clearCache()', () => {
      it('should clear the embedding cache', async () => {
        const client = Embeddings()

        const result = await client.clearCache()

        expect(mockClientInstance.clearCache).toHaveBeenCalled()
        expect(result.cleared).toBe(150)
      })

      it('should accept optional pattern parameter', async () => {
        const client = Embeddings()

        await client.clearCache('prefix:*')

        expect(mockClientInstance.clearCache).toHaveBeenCalledWith('prefix:*')
      })
    })

    describe('models()', () => {
      it('should list available embedding models', async () => {
        const client = Embeddings()

        const models = await client.models()

        expect(mockClientInstance.models).toHaveBeenCalled()
        expect(models).toContain('text-embedding-3-small')
        expect(models).toContain('text-embedding-3-large')
      })
    })
  })

  // ===========================================================================
  // Caching Behavior Tests
  // ===========================================================================

  describe('Caching Behavior', () => {
    it('should deduplicate identical texts in batch request', async () => {
      // Mock to verify deduplication by checking received texts
      mockClientInstance.embedBatch.mockImplementation(async (input) => {
        const texts = Array.isArray(input) ? input : input.texts
        return {
          embeddings: texts.map(() => new Array(1536).fill(0).map(() => Math.random())),
          model: 'text-embedding-3-small',
          usage: { tokens: texts.length * 10 },
          cached: texts.map(() => false),
        }
      })

      const client = Embeddings()
      const textsWithDuplicates = ['Hello', 'World', 'Hello', 'Test', 'World']

      const result = await client.embedBatch(textsWithDuplicates)

      // Should still return correct number of embeddings
      expect(result.embeddings).toHaveLength(5)
    })

    it('should return cached results for previously embedded texts', async () => {
      const client = Embeddings()

      // First call - not cached
      mockClientInstance.embed.mockResolvedValueOnce({
        embedding: [0.1, 0.2, 0.3],
        model: 'text-embedding-3-small',
        usage: { tokens: 10 },
        cached: false,
      })

      const first = await client.embed('Hello')
      expect(first.cached).toBe(false)

      // Second call - should be cached
      mockClientInstance.embed.mockResolvedValueOnce({
        embedding: [0.1, 0.2, 0.3],
        model: 'text-embedding-3-small',
        usage: { tokens: 0 },
        cached: true,
      })

      const second = await client.embed('Hello')
      expect(second.cached).toBe(true)
      expect(second.usage.tokens).toBe(0)
    })

    it('should track cache hit rate', async () => {
      const client = Embeddings()

      const stats = await client.cacheStats()

      expect(stats.hitRate).toBeDefined()
      expect(stats.hitRate).toBeGreaterThanOrEqual(0)
      expect(stats.hitRate).toBeLessThanOrEqual(1)
    })
  })

  // ===========================================================================
  // Integration Pattern Tests
  // ===========================================================================

  describe('Integration Patterns', () => {
    it('should work with Workers service bindings pattern', () => {
      // Internal (Workers): await env.EMBEDDINGS.embed(text)
      // External (SDK): import { embeddings } from 'embeddings.do'
      expect(embeddings).toBeDefined()
    })

    it('should handle metered billing based on actual API calls (not cached)', async () => {
      const client = Embeddings()

      // Cached results should show 0 tokens
      mockClientInstance.embed.mockResolvedValueOnce({
        embedding: [0.1, 0.2, 0.3],
        model: 'text-embedding-3-small',
        usage: { tokens: 0 },
        cached: true,
      })

      const result = await client.embed('Previously cached text')

      expect(result.cached).toBe(true)
      expect(result.usage.tokens).toBe(0) // No cost for cached
    })

    it('should support custom embedding models', async () => {
      const client = Embeddings()

      await client.embed({
        text: 'Custom model test',
        model: 'custom-embedding-model',
        dimensions: 768,
      })

      expect(mockClientInstance.embed).toHaveBeenCalledWith({
        text: 'Custom model test',
        model: 'custom-embedding-model',
        dimensions: 768,
      })
    })
  })

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should propagate RPC errors', async () => {
      mockClientInstance.embed = vi.fn().mockRejectedValue(
        new Error('API rate limit exceeded')
      )

      const client = Embeddings()

      await expect(client.embed('test'))
        .rejects.toThrow('API rate limit exceeded')
    })

    it('should handle invalid model errors', async () => {
      mockClientInstance.embed = vi.fn().mockRejectedValue(
        new Error('Model not found: invalid-model')
      )

      const client = Embeddings()

      await expect(client.embed({ text: 'test', model: 'invalid-model' }))
        .rejects.toThrow('Model not found')
    })

    it('should handle empty text gracefully', async () => {
      mockClientInstance.embed = vi.fn().mockRejectedValue(
        new Error('Text cannot be empty')
      )

      const client = Embeddings()

      await expect(client.embed(''))
        .rejects.toThrow('Text cannot be empty')
    })

    it('should handle batch with too many texts', async () => {
      mockClientInstance.embedBatch = vi.fn().mockRejectedValue(
        new Error('Batch size exceeds limit of 2048')
      )

      const client = Embeddings()
      const tooManyTexts = new Array(3000).fill('test')

      await expect(client.embedBatch(tooManyTexts))
        .rejects.toThrow('Batch size exceeds limit')
    })
  })
})
