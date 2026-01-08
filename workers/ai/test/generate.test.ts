/**
 * RED Tests: AIDO generate() method
 *
 * These tests define the contract for the @dotdo/ai worker's generate() method.
 * The AIDO must implement generate() for both text generation and structured
 * object generation with schemas.
 *
 * Per README.md:
 * - generate(prompt, options?) provides general text or object generation
 * - Supports text generation with optional model selection
 * - Supports object generation with schema definition
 * - Supports streaming responses
 *
 * RED PHASE: These tests MUST FAIL because AIDO is not implemented yet.
 * The implementation will be done in the GREEN phase.
 *
 * @see workers/ai/README.md
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  type MockDOState,
  type MockAIEnv,
  type GenerateOptions,
  type GenerateResult,
} from './helpers.js'

/**
 * Interface definition for AIDO generate operations - this defines the contract
 * The implementation must satisfy this interface
 */
export interface AIDOGenerateContract {
  // Text generation
  generate(prompt: string, options?: GenerateOptions): Promise<GenerateResult>

  // Streaming generation
  generateStream(prompt: string, options?: GenerateOptions): Promise<ReadableStream<Uint8Array>>

  // HTTP handler
  fetch(request: Request): Promise<Response>

  // RPC interface
  hasMethod(name: string): boolean
  call(method: string, params: unknown[]): Promise<unknown>
}

/**
 * Attempt to load AIDO - this will fail in RED phase
 * In GREEN phase, the module will exist and tests will pass
 */
async function loadAIDO(): Promise<new (ctx: MockDOState, env: MockAIEnv) => AIDOGenerateContract> {
  // This dynamic import will fail because src/ai.js doesn't exist yet
  const module = await import('../src/ai.js')
  return module.AIDO
}

describe('AIDO.generate() - Text Generation', () => {
  let ctx: MockDOState
  let env: MockAIEnv
  let AIDO: new (ctx: MockDOState, env: MockAIEnv) => AIDOGenerateContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    // This will throw in RED phase because the module doesn't exist
    AIDO = await loadAIDO()
  })

  describe('simple text generation', () => {
    it('should generate text from a simple prompt', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Write a haiku about TypeScript')

      expect(result).toHaveProperty('text')
      expect(typeof result.text).toBe('string')
      expect(result.text.length).toBeGreaterThan(0)
    })

    it('should return a GenerateResult object', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Hello, world!')

      expect(result).toHaveProperty('text')
      expect(result).toHaveProperty('model')
      expect(result).toHaveProperty('usage')
      expect(result.usage).toHaveProperty('promptTokens')
      expect(result.usage).toHaveProperty('completionTokens')
      expect(result.usage).toHaveProperty('totalTokens')
    })

    it('should handle conversational prompts', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Explain TypeScript generics in simple terms')

      expect(result.text.length).toBeGreaterThan(50)
      expect(typeof result.text).toBe('string')
    })

    it('should handle code generation prompts', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Write a TypeScript function that adds two numbers')

      expect(result.text).toContain('function')
      expect(typeof result.text).toBe('string')
    })

    it('should handle creative writing prompts', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Write a short story opening about a robot learning to paint')

      expect(result.text.length).toBeGreaterThan(100)
    })
  })

  describe('model options', () => {
    it('should use default model when not specified', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Test prompt')

      expect(result.model).toBeDefined()
    })

    it('should use specified model', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Test prompt', {
        model: '@cf/meta/llama-3.1-8b-instruct',
      })

      expect(result.model).toBe('@cf/meta/llama-3.1-8b-instruct')
    })

    it('should support temperature option', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Write a creative tagline', {
        temperature: 0.9,
      })

      expect(result.text.length).toBeGreaterThan(0)
    })

    it('should support low temperature for deterministic output', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('What is 2 + 2?', {
        temperature: 0,
      })

      expect(result.text).toMatch(/4/)
    })

    it('should support maxTokens option', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Write a very long essay', {
        maxTokens: 50,
      })

      // Result should be limited by maxTokens
      expect(result.usage?.completionTokens).toBeLessThanOrEqual(50)
    })

    it('should combine multiple options', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Generate a greeting', {
        model: '@cf/meta/llama-3.1-8b-instruct',
        temperature: 0.7,
        maxTokens: 100,
      })

      expect(result).toHaveProperty('text')
      expect(result.model).toBe('@cf/meta/llama-3.1-8b-instruct')
    })
  })

  describe('usage tracking', () => {
    it('should return token counts', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Count to five')

      expect(result.usage?.promptTokens).toBeGreaterThan(0)
      expect(result.usage?.completionTokens).toBeGreaterThan(0)
      expect(result.usage?.totalTokens).toBe(
        (result.usage?.promptTokens ?? 0) + (result.usage?.completionTokens ?? 0)
      )
    })

    it('should track longer prompts with higher token counts', async () => {
      const instance = new AIDO(ctx, env)
      const shortResult = await instance.generate('Hi')
      const longResult = await instance.generate('Write a detailed explanation of quantum computing')

      expect((longResult.usage?.promptTokens ?? 0)).toBeGreaterThan((shortResult.usage?.promptTokens ?? 0))
    })
  })

  describe('finish reasons', () => {
    it('should return stop finish reason for normal completion', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Say hello')

      expect(result.finishReason).toBe('stop')
    })

    it('should return length finish reason when hitting token limit', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Write a novel', {
        maxTokens: 10,
      })

      expect(result.finishReason).toBe('length')
    })
  })
})

describe('AIDO.generate() - Object Generation with Schema', () => {
  let ctx: MockDOState
  let env: MockAIEnv
  let AIDO: new (ctx: MockDOState, env: MockAIEnv) => AIDOGenerateContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    AIDO = await loadAIDO()
  })

  describe('simple object generation', () => {
    it('should generate object matching simple schema', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('A fictional user profile', {
        schema: { name: 'string', age: 'number', bio: 'string' },
      })

      expect(result).toHaveProperty('data')
      const data = (result as unknown as { data: { name: string; age: number; bio: string } }).data
      expect(data).toHaveProperty('name')
      expect(data).toHaveProperty('age')
      expect(data).toHaveProperty('bio')
      expect(typeof data.name).toBe('string')
      expect(typeof data.age).toBe('number')
      expect(typeof data.bio).toBe('string')
    })

    it('should generate object with string fields', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('A product description', {
        schema: { title: 'string', description: 'string' },
      })

      const data = (result as unknown as { data: { title: string; description: string } }).data
      expect(typeof data.title).toBe('string')
      expect(typeof data.description).toBe('string')
    })

    it('should generate object with number fields', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Product pricing info', {
        schema: { price: 'number', quantity: 'number', discount: 'number' },
      })

      const data = (result as unknown as { data: { price: number; quantity: number; discount: number } }).data
      expect(typeof data.price).toBe('number')
      expect(typeof data.quantity).toBe('number')
      expect(typeof data.discount).toBe('number')
    })

    it('should generate object with boolean fields', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Product availability status', {
        schema: { inStock: 'boolean', isOnSale: 'boolean', featured: 'boolean' },
      })

      const data = (result as unknown as { data: { inStock: boolean; isOnSale: boolean; featured: boolean } }).data
      expect(typeof data.inStock).toBe('boolean')
      expect(typeof data.isOnSale).toBe('boolean')
      expect(typeof data.featured).toBe('boolean')
    })
  })

  describe('complex object generation', () => {
    it('should generate object with mixed types', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('An employee record', {
        schema: {
          id: 'string',
          name: 'string',
          age: 'number',
          salary: 'number',
          isFullTime: 'boolean',
          department: 'string',
        },
      })

      const data = (result as unknown as { data: Record<string, unknown> }).data
      expect(typeof data.id).toBe('string')
      expect(typeof data.name).toBe('string')
      expect(typeof data.age).toBe('number')
      expect(typeof data.salary).toBe('number')
      expect(typeof data.isFullTime).toBe('boolean')
      expect(typeof data.department).toBe('string')
    })

    it('should generate object with optional fields', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('A contact card', {
        schema: {
          name: 'string',
          email: 'string',
          phone: 'string?',
          website: 'string?',
        },
      })

      const data = (result as unknown as { data: { name: string; email: string; phone?: string; website?: string } }).data
      expect(typeof data.name).toBe('string')
      expect(typeof data.email).toBe('string')
      // Optional fields may or may not be present
      if (data.phone !== undefined) {
        expect(typeof data.phone).toBe('string')
      }
    })

    it('should generate object with enum-like union types', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('A task item', {
        schema: {
          title: 'string',
          priority: 'low | medium | high',
          status: 'pending | in_progress | done',
        },
      })

      const data = (result as unknown as { data: { title: string; priority: string; status: string } }).data
      expect(['low', 'medium', 'high']).toContain(data.priority)
      expect(['pending', 'in_progress', 'done']).toContain(data.status)
    })
  })

  describe('nested object generation', () => {
    it('should generate object with nested structure using dot notation', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('A company profile', {
        schema: {
          'company.name': 'string',
          'company.industry': 'string',
          'company.address.city': 'string',
          'company.address.country': 'string',
        },
      })

      const data = (result as unknown as {
        data: {
          company: {
            name: string
            industry: string
            address: { city: string; country: string }
          }
        }
      }).data
      expect(data.company).toBeDefined()
      expect(data.company.name).toBeDefined()
      expect(data.company.address).toBeDefined()
      expect(data.company.address.city).toBeDefined()
    })
  })

  describe('JSON schema format', () => {
    it('should support JSON Schema format', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('A user profile', {
        schema: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            age: { type: 'number' },
            email: { type: 'string', format: 'email' },
          },
          required: ['name', 'age', 'email'],
        },
      })

      const data = (result as unknown as { data: { name: string; age: number; email: string } }).data
      expect(typeof data.name).toBe('string')
      expect(typeof data.age).toBe('number')
      expect(data.email).toMatch(/@/)
    })

    it('should support JSON Schema with descriptions', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('A book entry', {
        schema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'The book title' },
            author: { type: 'string', description: 'Author full name' },
            year: { type: 'number', description: 'Publication year' },
          },
          required: ['title', 'author'],
        },
      })

      const data = (result as unknown as { data: { title: string; author: string; year?: number } }).data
      expect(data.title).toBeDefined()
      expect(data.author).toBeDefined()
    })

    it('should support JSON Schema with enum constraint', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('A priority setting', {
        schema: {
          type: 'object',
          properties: {
            level: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          },
          required: ['level'],
        },
      })

      const data = (result as unknown as { data: { level: string } }).data
      expect(['low', 'medium', 'high', 'critical']).toContain(data.level)
    })
  })
})

describe('AIDO.generate() - Streaming Support', () => {
  let ctx: MockDOState
  let env: MockAIEnv
  let AIDO: new (ctx: MockDOState, env: MockAIEnv) => AIDOGenerateContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    AIDO = await loadAIDO()
  })

  describe('stream option', () => {
    it('should enable streaming with stream: true option', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Write a paragraph', { stream: true })

      // When streaming is requested but accessed via generate(), should still return result
      expect(result).toHaveProperty('text')
    })
  })

  describe('generateStream method', () => {
    it('should return a ReadableStream', async () => {
      const instance = new AIDO(ctx, env)
      const stream = await instance.generateStream('Count from 1 to 5')

      expect(stream).toBeInstanceOf(ReadableStream)
    })

    it('should stream text chunks', async () => {
      const instance = new AIDO(ctx, env)
      const stream = await instance.generateStream('Hello, world!')
      const reader = stream.getReader()
      const decoder = new TextDecoder()

      const chunks: string[] = []
      let done = false

      while (!done) {
        const result = await reader.read()
        if (result.done) {
          done = true
        } else {
          chunks.push(decoder.decode(result.value))
        }
      }

      expect(chunks.length).toBeGreaterThan(0)
      const fullText = chunks.join('')
      expect(fullText.length).toBeGreaterThan(0)
    })

    it('should respect model option in streaming', async () => {
      const instance = new AIDO(ctx, env)
      const stream = await instance.generateStream('Test', {
        model: '@cf/meta/llama-3.1-8b-instruct',
      })

      expect(stream).toBeInstanceOf(ReadableStream)
    })

    it('should respect maxTokens option in streaming', async () => {
      const instance = new AIDO(ctx, env)
      const stream = await instance.generateStream('Write a long story', {
        maxTokens: 20,
      })

      const reader = stream.getReader()
      const chunks: Uint8Array[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (value) chunks.push(value)
      }

      // Stream should complete within token limit
      expect(chunks.length).toBeGreaterThan(0)
    })
  })
})

describe('AIDO.generate() - Error Handling', () => {
  let ctx: MockDOState
  let env: MockAIEnv
  let AIDO: new (ctx: MockDOState, env: MockAIEnv) => AIDOGenerateContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    AIDO = await loadAIDO()
  })

  describe('invalid input', () => {
    it('should throw error for empty prompt', async () => {
      const instance = new AIDO(ctx, env)

      await expect(instance.generate('')).rejects.toThrow(/empty|required|invalid/i)
    })

    it('should throw error for null prompt', async () => {
      const instance = new AIDO(ctx, env)

      await expect(instance.generate(null as unknown as string)).rejects.toThrow(/null|required|invalid/i)
    })

    it('should throw error for undefined prompt', async () => {
      const instance = new AIDO(ctx, env)

      await expect(instance.generate(undefined as unknown as string)).rejects.toThrow(/undefined|required|invalid/i)
    })

    it('should throw error for non-string prompt', async () => {
      const instance = new AIDO(ctx, env)

      await expect(instance.generate(123 as unknown as string)).rejects.toThrow(/string|type|invalid/i)
    })

    it('should throw error for prompt exceeding max length', async () => {
      const instance = new AIDO(ctx, env)
      const veryLongPrompt = 'x'.repeat(100000) // 100KB

      await expect(instance.generate(veryLongPrompt)).rejects.toThrow(/too long|limit|max/i)
    })
  })

  describe('invalid options', () => {
    it('should throw error for invalid model name', async () => {
      const instance = new AIDO(ctx, env)

      await expect(
        instance.generate('Test', { model: 'nonexistent-model-xyz' })
      ).rejects.toThrow(/model|not found|invalid/i)
    })

    it('should throw error for invalid temperature (negative)', async () => {
      const instance = new AIDO(ctx, env)

      await expect(
        instance.generate('Test', { temperature: -1 })
      ).rejects.toThrow(/temperature|invalid|range/i)
    })

    it('should throw error for invalid temperature (too high)', async () => {
      const instance = new AIDO(ctx, env)

      await expect(
        instance.generate('Test', { temperature: 3 })
      ).rejects.toThrow(/temperature|invalid|range/i)
    })

    it('should throw error for invalid maxTokens (negative)', async () => {
      const instance = new AIDO(ctx, env)

      await expect(
        instance.generate('Test', { maxTokens: -10 })
      ).rejects.toThrow(/maxTokens|invalid|negative/i)
    })

    it('should throw error for invalid maxTokens (zero)', async () => {
      const instance = new AIDO(ctx, env)

      await expect(
        instance.generate('Test', { maxTokens: 0 })
      ).rejects.toThrow(/maxTokens|invalid|zero/i)
    })
  })

  describe('timeout handling', () => {
    it('should throw timeout error for long-running requests', async () => {
      const instance = new AIDO(ctx, env)

      // Mock a slow response
      await expect(
        instance.generate('Generate something that takes forever', { timeout: 1 })
      ).rejects.toThrow(/timeout/i)
    })
  })

  describe('rate limiting', () => {
    it('should throw rate limit error when exceeded', async () => {
      const instance = new AIDO(ctx, env)

      // This would be mocked to simulate rate limiting
      // For RED phase, we just define the expected behavior
      await expect(
        instance.generate('Test when rate limited')
      ).rejects.toThrow(/rate limit|too many requests/i)
    })
  })

  describe('content filtering', () => {
    it('should throw content filter error for inappropriate content', async () => {
      const instance = new AIDO(ctx, env)

      // This would be mocked to simulate content filtering
      await expect(
        instance.generate('Generate harmful content')
      ).rejects.toThrow(/content|filter|blocked/i)
    })
  })
})

describe('AIDO.generate() - Edge Cases', () => {
  let ctx: MockDOState
  let env: MockAIEnv
  let AIDO: new (ctx: MockDOState, env: MockAIEnv) => AIDOGenerateContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    AIDO = await loadAIDO()
  })

  describe('special characters and unicode', () => {
    it('should handle unicode characters in prompt', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Translate to Japanese: Hello')

      expect(result.text).toBeDefined()
    })

    it('should handle emoji in prompt', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('What does this emoji mean? :)')

      expect(result.text.length).toBeGreaterThan(0)
    })

    it('should handle special characters in prompt', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('What is the meaning of @#$%^&*()?')

      expect(result.text).toBeDefined()
    })

    it('should handle newlines in prompt', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Line 1\nLine 2\nLine 3')

      expect(result.text).toBeDefined()
    })

    it('should handle tabs in prompt', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Column1\tColumn2\tColumn3')

      expect(result.text).toBeDefined()
    })
  })

  describe('whitespace handling', () => {
    it('should handle prompt with leading/trailing whitespace', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('   Hello world   ')

      expect(result.text.length).toBeGreaterThan(0)
    })

    it('should handle prompt with only whitespace', async () => {
      const instance = new AIDO(ctx, env)

      await expect(instance.generate('   ')).rejects.toThrow(/empty|whitespace|invalid/i)
    })

    it('should handle prompt with multiple spaces between words', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Hello    world    test')

      expect(result.text).toBeDefined()
    })
  })

  describe('prompt length edge cases', () => {
    it('should handle single character prompt', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('?')

      expect(result.text).toBeDefined()
    })

    it('should handle very long but valid prompt', async () => {
      const instance = new AIDO(ctx, env)
      const longPrompt = 'Explain ' + 'the concept of '.repeat(100) + 'recursion'
      const result = await instance.generate(longPrompt)

      expect(result.text.length).toBeGreaterThan(0)
    })
  })

  describe('schema edge cases', () => {
    it('should handle empty schema', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('Test', { schema: {} })

      // Empty schema should still work but return minimal structure
      expect(result).toHaveProperty('data')
    })

    it('should handle schema with single field', async () => {
      const instance = new AIDO(ctx, env)
      const result = await instance.generate('A name', { schema: { name: 'string' } })

      const data = (result as unknown as { data: { name: string } }).data
      expect(data.name).toBeDefined()
    })

    it('should handle schema with many fields', async () => {
      const instance = new AIDO(ctx, env)
      const schema: Record<string, string> = {}
      for (let i = 0; i < 50; i++) {
        schema[`field${i}`] = 'string'
      }
      const result = await instance.generate('Many fields', { schema })

      const data = (result as unknown as { data: Record<string, string> }).data
      expect(Object.keys(data).length).toBeGreaterThan(0)
    })
  })
})

describe('AIDO.generate() - HTTP API', () => {
  let ctx: MockDOState
  let env: MockAIEnv
  let AIDO: new (ctx: MockDOState, env: MockAIEnv) => AIDOGenerateContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    AIDO = await loadAIDO()
  })

  describe('POST /api/generate endpoint', () => {
    it('should handle POST request for text generation', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Hello, world!' }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as GenerateResult
      expect(data).toHaveProperty('text')
    })

    it('should accept options in request body', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'Test prompt',
          options: {
            model: '@cf/meta/llama-3.1-8b-instruct',
            temperature: 0.5,
          },
        }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as GenerateResult
      expect(data.model).toBe('@cf/meta/llama-3.1-8b-instruct')
    })

    it('should accept schema for object generation', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: 'A user profile',
          options: {
            schema: { name: 'string', age: 'number' },
          },
        }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as { data: { name: string; age: number } }
      expect(data.data).toHaveProperty('name')
      expect(data.data).toHaveProperty('age')
    })

    it('should return 400 for missing prompt', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(400)

      const error = await response.json() as { error: string }
      expect(error).toHaveProperty('error')
    })

    it('should return 400 for invalid JSON', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(400)
    })

    it('should include request ID in response headers', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Test' }),
      })

      const response = await instance.fetch(request)
      expect(response.headers.get('X-Request-Id')).toBeDefined()
    })
  })

  describe('streaming via HTTP', () => {
    it('should stream response when stream: true', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Count to 3', options: { stream: true } }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('text/event-stream')
      expect(response.body).toBeInstanceOf(ReadableStream)
    })

    it('should format streaming response as SSE', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Hi', options: { stream: true } }),
      })

      const response = await instance.fetch(request)
      const reader = response.body!.getReader()
      const decoder = new TextDecoder()

      const { value } = await reader.read()
      const text = decoder.decode(value)

      // SSE format: data: {...}\n\n
      expect(text).toMatch(/^data:/)
      reader.cancel()
    })
  })

  describe('content negotiation', () => {
    it('should return JSON by default', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Test' }),
      })

      const response = await instance.fetch(request)
      expect(response.headers.get('Content-Type')).toBe('application/json')
    })

    it('should return plain text when Accept: text/plain', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/plain',
        },
        body: JSON.stringify({ prompt: 'Test' }),
      })

      const response = await instance.fetch(request)
      expect(response.headers.get('Content-Type')).toBe('text/plain')
    })
  })
})

describe('AIDO.generate() - RPC Interface', () => {
  let ctx: MockDOState
  let env: MockAIEnv
  let AIDO: new (ctx: MockDOState, env: MockAIEnv) => AIDOGenerateContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    AIDO = await loadAIDO()
  })

  describe('hasMethod()', () => {
    it('should expose generate method', async () => {
      const instance = new AIDO(ctx, env)
      expect(instance.hasMethod('generate')).toBe(true)
    })

    it('should expose generateStream method', async () => {
      const instance = new AIDO(ctx, env)
      expect(instance.hasMethod('generateStream')).toBe(true)
    })

    it('should not expose internal methods', async () => {
      const instance = new AIDO(ctx, env)
      expect(instance.hasMethod('_internal')).toBe(false)
      expect(instance.hasMethod('constructor')).toBe(false)
    })
  })

  describe('call()', () => {
    it('should call generate via RPC', async () => {
      const instance = new AIDO(ctx, env)
      const result = (await instance.call('generate', ['Hello'])) as GenerateResult

      expect(result).toHaveProperty('text')
    })

    it('should pass options through RPC', async () => {
      const instance = new AIDO(ctx, env)
      const result = (await instance.call('generate', [
        'Test prompt',
        { temperature: 0.5 },
      ])) as GenerateResult

      expect(result).toHaveProperty('text')
    })

    it('should throw error for unknown method', async () => {
      const instance = new AIDO(ctx, env)

      await expect(instance.call('unknownMethod', [])).rejects.toThrow(
        /not found|unknown|not allowed/i
      )
    })

    it('should throw error for missing prompt parameter', async () => {
      const instance = new AIDO(ctx, env)

      await expect(instance.call('generate', [])).rejects.toThrow(
        /missing|required|prompt/i
      )
    })
  })

  describe('POST /rpc endpoint', () => {
    it('should handle RPC generate call', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'generate',
          params: ['Hello, world!'],
        }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = (await response.json()) as { result: GenerateResult }
      expect(data).toHaveProperty('result')
      expect(data.result).toHaveProperty('text')
    })

    it('should handle RPC batch calls', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/rpc/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { method: 'generate', params: ['First prompt'] },
          { method: 'generate', params: ['Second prompt'] },
        ]),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = (await response.json()) as Array<{ result?: GenerateResult; error?: string }>
      expect(data.length).toBe(2)
      expect(data[0]).toHaveProperty('result')
      expect(data[1]).toHaveProperty('result')
    })
  })
})
