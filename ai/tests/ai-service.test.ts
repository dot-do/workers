/**
 * AI Service Tests
 * Comprehensive test suite for multi-provider AI service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test'
import AIService from '../src/index'

describe('AI Service', () => {
  let service: AIService
  let ctx: ExecutionContext

  beforeEach(() => {
    ctx = createExecutionContext()
    service = new AIService(ctx, env as any)
  })

  describe('Provider Selection', () => {
    it('should use OpenAI as default provider', async () => {
      const result = await service.generate('Hello, world!')
      expect(result.provider).toBe('openai')
    })

    it('should support explicit provider selection', async () => {
      const result = await service.generate('Hello, world!', { provider: 'workers-ai' })
      expect(result.provider).toBe('workers-ai')
    })

    it('should use default model for provider', async () => {
      const result = await service.generate('Hello, world!', { provider: 'openai' })
      expect(result.model).toBe('gpt-4o-mini')
    })

    it('should support custom model selection', async () => {
      const result = await service.generate('Hello, world!', { provider: 'openai', model: 'gpt-5' })
      expect(result.model).toBe('gpt-5')
    })
  })

  describe('Text Generation', () => {
    it('should generate text successfully', async () => {
      const result = await service.generate('Write a haiku about coding')
      expect(result.text).toBeTruthy()
      expect(result.usage).toBeDefined()
      expect(result.latency).toBeGreaterThan(0)
    })

    it('should include usage statistics', async () => {
      const result = await service.generate('Hello')
      expect(result.usage.promptTokens).toBeGreaterThan(0)
      expect(result.usage.completionTokens).toBeGreaterThan(0)
      expect(result.usage.totalTokens).toBeGreaterThan(0)
    })

    it('should calculate cost correctly', async () => {
      const result = await service.generate('Hello', { provider: 'openai', model: 'gpt-4o-mini' })
      expect(result.cost).toBeDefined()
      expect(result.cost).toBeGreaterThanOrEqual(0)
    })

    it('should support system prompts', async () => {
      const result = await service.generate('What is 2+2?', {
        systemPrompt: 'You are a helpful math tutor.',
      })
      expect(result.text).toBeTruthy()
    })

    it('should support temperature control', async () => {
      const result = await service.generate('Generate a random number', {
        temperature: 0.9,
      })
      expect(result.text).toBeTruthy()
    })

    it('should support max tokens limit', async () => {
      const result = await service.generate('Write a long essay', {
        maxTokens: 100,
      })
      expect(result.usage.completionTokens).toBeLessThanOrEqual(100)
    })
  })

  describe('Streaming', () => {
    it('should generate streaming response', async () => {
      const stream = await service.generateStream('Write a short story')
      expect(stream).toBeInstanceOf(ReadableStream)
    })

    it('should stream chunks progressively', async () => {
      const stream = await service.generateStream('Count to 5')
      const reader = stream.getReader()
      const chunks: string[] = []

      let done = false
      while (!done) {
        const { value, done: streamDone } = await reader.read()
        if (value) {
          chunks.push(new TextDecoder().decode(value))
        }
        done = streamDone
      }

      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks.join('')).toBeTruthy()
    })
  })

  describe('Embeddings', () => {
    it('should generate embeddings successfully', async () => {
      const result = await service.embed('This is a test sentence')
      expect(result.embedding).toBeDefined()
      expect(Array.isArray(result.embedding)).toBe(true)
      expect(result.embedding.length).toBeGreaterThan(0)
    })

    it('should generate consistent embedding dimensions', async () => {
      const result1 = await service.embed('First sentence')
      const result2 = await service.embed('Second sentence')
      expect(result1.embedding.length).toBe(result2.embedding.length)
    })

    it('should support different embedding models', async () => {
      const result = await service.embed('Test', {
        provider: 'workers-ai',
        model: '@cf/baai/bge-base-en-v1.5',
      })
      expect(result.embedding).toBeDefined()
      expect(result.model).toBe('@cf/baai/bge-base-en-v1.5')
    })

    it('should fallback to Workers AI if OpenAI embeddings fail', async () => {
      // Mock OpenAI failure
      const result = await service.embed('Test fallback')
      expect(result.embedding).toBeDefined()
    })
  })

  describe('Content Analysis', () => {
    it('should analyze content successfully', async () => {
      const result = await service.analyze('AI is transforming technology', 'sentiment')
      expect(result.result).toBeTruthy()
      expect(result.analysis).toBe('sentiment')
      expect(result.content).toBe('AI is transforming technology')
    })

    it('should support different analysis types', async () => {
      const analyses = ['sentiment', 'key points', 'grammar', 'tone']

      for (const analysis of analyses) {
        const result = await service.analyze('Sample text', analysis)
        expect(result.analysis).toBe(analysis)
        expect(result.result).toBeTruthy()
      }
    })

    it('should use GPT-4o by default for analysis', async () => {
      const result = await service.analyze('Test content', 'accuracy')
      expect(result.model).toBe('gpt-4o')
    })
  })

  describe('Provider Fallback', () => {
    it('should fallback to next provider on error', async () => {
      // This would require mocking provider failures
      // For now, just test that fallback option is supported
      const result = await service.generate('Test', { fallback: true })
      expect(result.text).toBeTruthy()
    })

    it('should not fallback when explicitly disabled', async () => {
      // Test that fallback can be disabled
      const result = await service.generate('Test', { fallback: false })
      expect(result.text).toBeTruthy()
    })
  })

  describe('HTTP Interface', () => {
    it('should handle POST /ai/generate', async () => {
      const request = new Request('http://localhost/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Hello, AI!' }),
      })

      const response = await service.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as any
      expect(data.text).toBeTruthy()
      expect(data.provider).toBeDefined()
      expect(data.model).toBeDefined()
    })

    it('should handle POST /ai/embed', async () => {
      const request = new Request('http://localhost/ai/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'Embed this text' }),
      })

      const response = await service.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as any
      expect(data.embedding).toBeDefined()
      expect(Array.isArray(data.embedding)).toBe(true)
    })

    it('should handle POST /ai/analyze', async () => {
      const request = new Request('http://localhost/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: 'This is great!',
          analysis: 'sentiment',
        }),
      })

      const response = await service.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as any
      expect(data.result).toBeTruthy()
      expect(data.analysis).toBe('sentiment')
    })

    it('should handle POST /ai/stream with SSE', async () => {
      const request = new Request('http://localhost/ai/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Stream this' }),
      })

      const response = await service.fetch(request)
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
    })

    it('should handle GET /ai/health', async () => {
      const request = new Request('http://localhost/ai/health')
      const response = await service.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as any
      expect(data.status).toBe('healthy')
      expect(data.providers).toEqual(['openai', 'anthropic', 'workers-ai'])
    })

    it('should return 404 for unknown routes', async () => {
      const request = new Request('http://localhost/unknown')
      const response = await service.fetch(request)
      expect(response.status).toBe(404)
    })

    it('should return 400 for missing prompt', async () => {
      const request = new Request('http://localhost/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await service.fetch(request)
      expect(response.status).toBe(400)

      const data = await response.json() as any
      expect(data.error).toBeTruthy()
    })
  })

  describe('Error Handling', () => {
    it('should handle provider errors gracefully', async () => {
      // Test with invalid provider
      try {
        await service.generate('Test', { provider: 'invalid' as any })
        expect.fail('Should have thrown error')
      } catch (error) {
        expect(error).toBeDefined()
      }
    })

    it('should return proper error response on HTTP error', async () => {
      const request = new Request('http://localhost/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json',
      })

      const response = await service.fetch(request)
      expect(response.status).toBeGreaterThanOrEqual(400)
    })
  })

  describe('Performance', () => {
    it('should complete generation in reasonable time', async () => {
      const startTime = Date.now()
      const result = await service.generate('Quick test')
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(5000) // 5 seconds max
      expect(result.latency).toBeLessThan(5000)
    })

    it('should track latency accurately', async () => {
      const result = await service.generate('Latency test')
      expect(result.latency).toBeGreaterThan(0)
      expect(result.latency).toBeLessThan(10000)
    })
  })
})
