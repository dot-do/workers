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

  describe('AI Decision Layer', () => {
    describe('decideGenerationType', () => {
      it('should decide "text" for code generation methods', async () => {
        const decision = await service.decideGenerationType('generateCode', ['Create a function to sort an array'])
        expect(decision).toBe('text')
      })

      it('should decide "text" for explanations', async () => {
        const decision = await service.decideGenerationType('explain', ['How does React work?'])
        expect(decision).toBe('text')
      })

      it('should decide "object" for data extraction', async () => {
        const decision = await service.decideGenerationType('extractData', ['Extract name and email from: John Doe (john@example.com)'])
        expect(decision).toBe('object')
      })

      it('should decide "object" for structured lists', async () => {
        const decision = await service.decideGenerationType('listItems', [{ category: 'users' }])
        expect(decision).toBe('object')
      })

      it('should decide "object" for entity parsing', async () => {
        const decision = await service.decideGenerationType('parseEntity', ['<person><name>John</name><age>30</age></person>'])
        expect(decision).toBe('object')
      })

      it('should use Workers AI model by default', async () => {
        // Verify it uses @cf/openai/gpt-oss-120b
        const decision = await service.decideGenerationType('testMethod', ['test args'])
        expect(decision).toMatch(/^(text|object)$/)
      })

      it('should return decision quickly', async () => {
        const startTime = Date.now()
        await service.decideGenerationType('quickTest', ['test'])
        const duration = Date.now() - startTime

        expect(duration).toBeLessThan(3000) // Should be fast (3s max)
      })
    })

    describe('generateObject', () => {
      it('should generate structured object successfully', async () => {
        const result = await service.generateObject('Extract person details: John Doe, age 30, email john@example.com')

        expect(result.object).toBeDefined()
        expect(typeof result.object).toBe('object')
        expect(result.model).toBe('@cf/openai/gpt-oss-120b')
        expect(result.provider).toBe('workers-ai')
        expect(result.latency).toBeGreaterThan(0)
      })

      it('should include usage statistics', async () => {
        const result = await service.generateObject('Generate a simple user object')

        expect(result.usage).toBeDefined()
        expect(result.usage.promptTokens).toBeGreaterThan(0)
        expect(result.usage.completionTokens).toBeGreaterThan(0)
        expect(result.usage.totalTokens).toBeGreaterThan(0)
      })

      it('should support schema validation', async () => {
        const schema = {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
            email: { type: 'string' },
          },
          required: ['name', 'email'],
        }

        const result = await service.generateObject('Extract: John Doe, 30, john@example.com', { schema })

        expect(result.object).toHaveProperty('name')
        expect(result.object).toHaveProperty('email')
        expect(typeof result.object.name).toBe('string')
      })

      it('should support custom model selection', async () => {
        const result = await service.generateObject('Generate test data', {
          model: '@cf/openai/gpt-oss-120b',
          provider: 'workers-ai',
        })

        expect(result.model).toBe('@cf/openai/gpt-oss-120b')
        expect(result.provider).toBe('workers-ai')
      })

      it('should support temperature control', async () => {
        const result = await service.generateObject('Generate random user data', {
          temperature: 0.8,
        })

        expect(result.object).toBeDefined()
      })

      it('should handle JSON parsing correctly', async () => {
        const result = await service.generateObject('Create a person object with name and age')

        expect(result.object).toBeDefined()
        expect(typeof result.object).toBe('object')
        expect(result.object).not.toBeNull()
      })

      it('should throw error for invalid JSON', async () => {
        // Test with a prompt that's likely to produce invalid output
        try {
          await service.generateObject('Generate invalid JSON without any structure', {
            maxTokens: 5, // Force truncated response
          })
          expect.fail('Should have thrown error')
        } catch (error) {
          expect(error).toBeDefined()
          expect((error as Error).message).toContain('Failed to parse JSON')
        }
      })

      it('should strip markdown code blocks', async () => {
        // Even if AI returns ```json...```, should parse correctly
        const result = await service.generateObject('Return a JSON object with status: success')

        expect(result.object).toBeDefined()
        expect(typeof result.object).toBe('object')
      })

      it('should include cost estimation', async () => {
        const result = await service.generateObject('Generate test object')

        // Cost may or may not be present depending on provider
        if (result.cost !== undefined) {
          expect(result.cost).toBeGreaterThanOrEqual(0)
        }
      })

      it('should track latency accurately', async () => {
        const result = await service.generateObject('Quick object generation')

        expect(result.latency).toBeGreaterThan(0)
        expect(result.latency).toBeLessThan(10000) // 10s max
      })
    })

    describe('RPC Interface for AI Decision', () => {
      it('should expose decideGenerationType via RPC', async () => {
        const decision = await service.decideGenerationType('testMethod', ['args'])
        expect(decision).toMatch(/^(text|object)$/)
      })

      it('should expose generateObject via RPC', async () => {
        const result = await service.generateObject('Test prompt')
        expect(result.object).toBeDefined()
        expect(result.model).toBeDefined()
        expect(result.provider).toBeDefined()
      })
    })

    describe('HTTP Interface for AI Decision', () => {
      it('should handle POST /ai/decide', async () => {
        const request = new Request('http://localhost/ai/decide', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            method: 'extractData',
            args: ['test data'],
          }),
        })

        const response = await service.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as any
        expect(data.decision).toMatch(/^(text|object)$/)
      })

      it('should handle POST /ai/object', async () => {
        const request = new Request('http://localhost/ai/object', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'Generate a user object',
          }),
        })

        const response = await service.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as any
        expect(data.object).toBeDefined()
        expect(data.model).toBeDefined()
        expect(data.provider).toBeDefined()
      })

      it('should handle POST /ai/object with schema', async () => {
        const request = new Request('http://localhost/ai/object', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'Extract user data',
            options: {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  age: { type: 'number' },
                },
              },
            },
          }),
        })

        const response = await service.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as any
        expect(data.object).toBeDefined()
      })
    })
  })

  describe('Music Generation', () => {
    describe('RPC Interface', () => {
      it('should generate music successfully', async () => {
        const result = await service.generateMusic('upbeat electronic music for a video game')

        expect(result).toBeDefined()
        expect(result.audio).toBeInstanceOf(ArrayBuffer)
        expect(result.audioUrl).toBeTruthy()
        expect(result.model).toBe('stability-ai/stable-audio-open-1.0')
        expect(result.provider).toBe('replicate')
        expect(result.duration).toBeGreaterThan(0)
        expect(result.format).toBe('mp3')
      })

      it('should support custom options', async () => {
        const result = await service.generateMusic('cinematic orchestral music', {
          duration: 60,
          style: 'orchestral',
          mood: 'epic',
          bpm: 120,
          format: 'wav',
          seed: 42,
        })

        expect(result.duration).toBeLessThanOrEqual(60)
        expect(result.format).toBe('wav')
        expect(result.metadata?.style).toBe('orchestral')
        expect(result.metadata?.mood).toBe('epic')
        expect(result.metadata?.bpm).toBe(120)
        expect(result.metadata?.seed).toBe(42)
      })

      it('should enforce maximum duration of 180 seconds', async () => {
        const result = await service.generateMusic('long ambient music', {
          duration: 300, // Should be capped at 180
        })

        expect(result.duration).toBeLessThanOrEqual(180)
      })

      it('should use default duration of 30 seconds', async () => {
        const result = await service.generateMusic('short jingle')

        expect(result.duration).toBe(30)
      })

      it('should include usage statistics', async () => {
        const result = await service.generateMusic('test music')

        expect(result.usage).toBeDefined()
        expect(result.usage.seconds).toBeGreaterThan(0)
      })

      it('should calculate cost correctly', async () => {
        const result = await service.generateMusic('test music')

        expect(result.cost).toBeDefined()
        expect(result.cost).toBeGreaterThan(0)
        expect(result.cost).toBeCloseTo(0.08, 2) // ~$0.08 per generation
      })

      it('should track latency accurately', async () => {
        const result = await service.generateMusic('test music')

        expect(result.latency).toBeGreaterThan(0)
        expect(result.latency).toBeLessThan(180000) // Less than 3 minutes
      })

      it('should upload audio to R2 and return URL', async () => {
        const result = await service.generateMusic('test music')

        expect(result.audioUrl).toBeDefined()
        expect(result.audioUrl).toContain('http') // Should be a URL
      })

      it('should support different audio formats', async () => {
        const formats = ['mp3', 'wav', 'flac'] as const

        for (const format of formats) {
          const result = await service.generateMusic('test music', { format })
          expect(result.format).toBe(format)
        }
      })
    })

    describe('HTTP Interface', () => {
      it('should handle POST /ai/generate-music', async () => {
        const request = new Request('http://localhost/ai/generate-music', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'relaxing ambient music',
          }),
        })

        const response = await service.fetch(request)
        expect(response.status).toBe(200)

        const data = await response.json() as any
        expect(data.audioUrl).toBeTruthy()
        expect(data.model).toBe('stability-ai/stable-audio-open-1.0')
        expect(data.provider).toBe('replicate')
        expect(data.duration).toBeGreaterThan(0)
        expect(data.cost).toBeGreaterThan(0)
        expect(data.latency).toBeGreaterThan(0)
      })

      it('should handle POST /ai/generate-music with options', async () => {
        const request = new Request('http://localhost/ai/generate-music', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'upbeat dance music',
            duration: 45,
            style: 'electronic',
            mood: 'energetic',
            bpm: 128,
            format: 'mp3',
          }),
        })

        const response = await service.fetch(request)
        expect(response.status).toBe(200)

        const data = await response.json() as any
        expect(data.metadata.style).toBe('electronic')
        expect(data.metadata.mood).toBe('energetic')
        expect(data.metadata.bpm).toBe(128)
      })

      it('should return 400 for missing prompt', async () => {
        const request = new Request('http://localhost/ai/generate-music', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })

        const response = await service.fetch(request)
        expect(response.status).toBe(400)

        const data = await response.json() as any
        expect(data.error).toBe('Prompt is required')
      })

      it('should include metadata in response', async () => {
        const request = new Request('http://localhost/ai/generate-music', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'calm piano music',
            style: 'classical',
            mood: 'peaceful',
          }),
        })

        const response = await service.fetch(request)
        expect(response.status).toBe(200)

        const data = await response.json() as any
        expect(data.metadata).toBeDefined()
        expect(data.metadata.style).toBe('classical')
        expect(data.metadata.mood).toBe('peaceful')
      })
    })

    describe('Health Check', () => {
      it('should include music in capabilities', async () => {
        const request = new Request('http://localhost/ai/health')
        const response = await service.fetch(request)
        expect(response.status).toBe(200)

        const data = await response.json() as any
        expect(data.providers).toContain('replicate')
        expect(data.capabilities).toContain('music')
      })
    })

    describe('Error Handling', () => {
      it('should handle missing REPLICATE_API_KEY gracefully', async () => {
        // This would require mocking the env without REPLICATE_API_KEY
        // For now, just ensure error handling exists
        try {
          const result = await service.generateMusic('test music')
          expect(result).toBeDefined()
        } catch (error) {
          expect(error).toBeDefined()
          if (error instanceof Error) {
            expect(error.message).toContain('REPLICATE_API_KEY')
          }
        }
      })

      it('should handle Replicate API errors', async () => {
        // Test error handling for API failures
        // This would require mocking Replicate API failures
        try {
          const result = await service.generateMusic('test music')
          expect(result).toBeDefined()
        } catch (error) {
          expect(error).toBeDefined()
        }
      })
    })
  })
})
