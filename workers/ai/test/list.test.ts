/**
 * RED Tests: AIDO list() and lists() methods
 *
 * These tests define the contract for the @dotdo/ai worker's list generation methods.
 * The AIDO must implement list() for single arrays and lists() for multiple named arrays.
 *
 * Per README.md:
 * - list<T>(prompt, options?) generates arrays of items
 * - lists<T>(prompt, options?) generates multiple named arrays for destructuring
 *
 * RED PHASE: These tests MUST FAIL because AIDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-v3mhx).
 *
 * @see workers/ai/README.md
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockAIEnv, type ListOptions, type ListsOptions } from './helpers.js'

/**
 * Interface definition for AIDO list operations - this defines the contract
 * The implementation must satisfy this interface
 */
export interface AIDOListContract {
  // Generate a single array
  list<T = string>(prompt: string, options?: ListOptions): Promise<T[]>

  // Generate multiple named arrays (for destructuring)
  lists<T = string>(prompt: string, options?: ListsOptions): Promise<Record<string, T[]>>
}

/**
 * Full AIDO contract including list methods
 */
export interface AIDOContract extends AIDOListContract {
  // HTTP handler
  fetch(request: Request): Promise<Response>
}

/**
 * Attempt to load AIDO - this will fail in RED phase
 * In GREEN phase, the module will exist and tests will pass
 */
async function loadAIDO(): Promise<new (ctx: MockDOState, env: MockAIEnv) => AIDOContract> {
  // This dynamic import will fail because src/ai.js doesn't exist yet
  const module = await import('../src/ai.js')
  return module.AIDO
}

describe('AIDO list() and lists() methods', () => {
  let ctx: MockDOState
  let env: MockAIEnv
  let AIDO: new (ctx: MockDOState, env: MockAIEnv) => AIDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    // This will throw in RED phase because the module doesn't exist
    AIDO = await loadAIDO()
  })

  describe('list() - single array generation', () => {
    describe('string arrays (default type)', () => {
      it('should generate an array of strings from a prompt', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.list('5 programming languages')

        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThan(0)
        result.forEach((item) => {
          expect(typeof item).toBe('string')
        })
      })

      it('should generate marketing taglines', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.list<string>('5 marketing taglines for a coffee shop')

        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBe(5)
        result.forEach((tagline) => {
          expect(typeof tagline).toBe('string')
          expect(tagline.length).toBeGreaterThan(0)
        })
      })

      it('should generate an array with specific count when requested', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.list('3 fruit names')

        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBe(3)
      })

      it('should handle empty results gracefully', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.list('things that do not exist anywhere')

        expect(Array.isArray(result)).toBe(true)
        // May be empty or contain items based on model interpretation
      })

      it('should respect maxItems option', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.list('all countries in the world', { maxItems: 5 })

        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeLessThanOrEqual(5)
      })
    })

    describe('object arrays with schema', () => {
      interface Person {
        name: string
        age: number
      }

      it('should generate an array of objects matching schema', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.list<Person>('3 fictional characters', {
          schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              age: { type: 'number' },
            },
            required: ['name', 'age'],
          },
        })

        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBe(3)
        result.forEach((person) => {
          expect(person).toHaveProperty('name')
          expect(person).toHaveProperty('age')
          expect(typeof person.name).toBe('string')
          expect(typeof person.age).toBe('number')
        })
      })

      interface Product {
        id: string
        name: string
        price: number
        inStock: boolean
      }

      it('should support complex object schemas', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.list<Product>('5 electronics products', {
          schema: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique product identifier' },
              name: { type: 'string' },
              price: { type: 'number', description: 'Price in USD' },
              inStock: { type: 'boolean' },
            },
            required: ['id', 'name', 'price', 'inStock'],
          },
        })

        expect(Array.isArray(result)).toBe(true)
        result.forEach((product) => {
          expect(product).toHaveProperty('id')
          expect(product).toHaveProperty('name')
          expect(product).toHaveProperty('price')
          expect(product).toHaveProperty('inStock')
          expect(typeof product.id).toBe('string')
          expect(typeof product.price).toBe('number')
          expect(typeof product.inStock).toBe('boolean')
        })
      })

      interface Task {
        title: string
        priority: 'low' | 'medium' | 'high'
        tags?: string[]
      }

      it('should handle optional properties and enums in schema', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.list<Task>('3 project tasks', {
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'medium', 'high'] },
              tags: { type: 'array', items: { type: 'string' } },
            },
            required: ['title', 'priority'],
          },
        })

        expect(Array.isArray(result)).toBe(true)
        result.forEach((task) => {
          expect(task).toHaveProperty('title')
          expect(task).toHaveProperty('priority')
          expect(['low', 'medium', 'high']).toContain(task.priority)
        })
      })
    })

    describe('options handling', () => {
      it('should support model selection', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.list('5 colors', {
          model: '@cf/meta/llama-3.1-8b-instruct',
        })

        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThan(0)
      })

      it('should support temperature option', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.list('5 creative startup names', {
          temperature: 0.9,
        })

        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThan(0)
      })

      it('should combine multiple options', async () => {
        interface Idea {
          title: string
          description: string
        }

        const instance = new AIDO(ctx, env)
        const result = await instance.list<Idea>('3 app ideas', {
          model: '@cf/meta/llama-3.1-8b-instruct',
          temperature: 0.7,
          maxItems: 3,
          schema: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['title', 'description'],
          },
        })

        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeLessThanOrEqual(3)
      })
    })

    describe('large array generation', () => {
      it('should handle generating many items (50+)', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.list('50 common English words', { maxItems: 50 })

        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThanOrEqual(20) // Allow some flexibility
        expect(result.length).toBeLessThanOrEqual(50)
      })

      it('should handle large object arrays', async () => {
        interface Record {
          id: number
          name: string
          active: boolean
        }

        const instance = new AIDO(ctx, env)
        const result = await instance.list<Record>('20 database records', {
          maxItems: 20,
          schema: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              name: { type: 'string' },
              active: { type: 'boolean' },
            },
            required: ['id', 'name', 'active'],
          },
        })

        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThan(0)
        result.forEach((record, index) => {
          expect(record).toHaveProperty('id')
          expect(record).toHaveProperty('name')
          expect(record).toHaveProperty('active')
        })
      })

      it('should respect maxItems limit for large requests', async () => {
        const instance = new AIDO(ctx, env)
        // Request 100 but limit to 10
        const result = await instance.list('100 random numbers', { maxItems: 10 })

        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeLessThanOrEqual(10)
      })
    })

    describe('error handling', () => {
      it('should throw error for empty prompt', async () => {
        const instance = new AIDO(ctx, env)

        await expect(instance.list('')).rejects.toThrow(/prompt|empty|required/i)
      })

      it('should throw error for null prompt', async () => {
        const instance = new AIDO(ctx, env)

        await expect(instance.list(null as unknown as string)).rejects.toThrow()
      })

      it('should throw error for undefined prompt', async () => {
        const instance = new AIDO(ctx, env)

        await expect(instance.list(undefined as unknown as string)).rejects.toThrow()
      })

      it('should handle invalid schema gracefully', async () => {
        const instance = new AIDO(ctx, env)

        // Invalid schema should still attempt generation or throw meaningful error
        const resultOrError = instance.list('3 items', {
          schema: { invalid: 'not-a-valid-schema-format' } as unknown as Record<string, unknown>,
        })

        // Either returns array or throws meaningful error
        await expect(resultOrError).resolves.toBeDefined()
      })

      it('should handle AI timeout gracefully', async () => {
        // Mock a slow AI response that times out
        const slowEnv = createMockEnv()
        slowEnv.AI.run = async () => {
          await new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Operation timeout')), 100)
          )
        }

        const instance = new AIDO(ctx, slowEnv)

        await expect(instance.list('5 items')).rejects.toThrow(/timeout/i)
      })

      it('should handle rate limiting', async () => {
        const rateLimitedEnv = createMockEnv()
        rateLimitedEnv.AI.run = async () => {
          const error = new Error('Rate limit exceeded') as Error & { status?: number }
          error.status = 429
          throw error
        }

        const instance = new AIDO(ctx, rateLimitedEnv)

        await expect(instance.list('5 items')).rejects.toThrow(/rate limit/i)
      })
    })
  })

  describe('lists() - multiple named arrays', () => {
    describe('basic named arrays', () => {
      it('should generate an object with named arrays', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.lists('Pros and cons of TypeScript')

        expect(typeof result).toBe('object')
        expect(result).not.toBeNull()
        // Should have at least some keys
        expect(Object.keys(result).length).toBeGreaterThan(0)
      })

      it('should support destructuring the result', async () => {
        const instance = new AIDO(ctx, env)
        const { pros, cons } = await instance.lists('Pros and cons of microservices')

        expect(Array.isArray(pros)).toBe(true)
        expect(Array.isArray(cons)).toBe(true)
        expect(pros.length).toBeGreaterThan(0)
        expect(cons.length).toBeGreaterThan(0)
      })

      it('should generate multiple distinct arrays', async () => {
        const instance = new AIDO(ctx, env)
        const { strengths, weaknesses, opportunities, threats } = await instance.lists(
          'SWOT analysis for a new coffee shop'
        )

        expect(Array.isArray(strengths)).toBe(true)
        expect(Array.isArray(weaknesses)).toBe(true)
        expect(Array.isArray(opportunities)).toBe(true)
        expect(Array.isArray(threats)).toBe(true)
      })
    })

    describe('explicit keys option', () => {
      it('should generate arrays for specified keys', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.lists('Categories of software development', {
          keys: ['frontend', 'backend', 'devops'],
        })

        expect(result).toHaveProperty('frontend')
        expect(result).toHaveProperty('backend')
        expect(result).toHaveProperty('devops')
        expect(Array.isArray(result.frontend)).toBe(true)
        expect(Array.isArray(result.backend)).toBe(true)
        expect(Array.isArray(result.devops)).toBe(true)
      })

      it('should only include specified keys', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.lists('Things about programming', {
          keys: ['good', 'bad'],
        })

        const keys = Object.keys(result)
        expect(keys).toContain('good')
        expect(keys).toContain('bad')
        expect(keys.length).toBe(2)
      })
    })

    describe('typed lists', () => {
      interface Skill {
        name: string
        level: 'beginner' | 'intermediate' | 'advanced'
      }

      it('should support typed arrays in lists', async () => {
        const instance = new AIDO(ctx, env)
        // Note: lists() returns Record<string, T[]> where T is the array item type
        const result = await instance.lists<Skill>('Skills for a full-stack developer')

        const allArrays = Object.values(result)
        allArrays.forEach((arr) => {
          expect(Array.isArray(arr)).toBe(true)
        })
      })
    })

    describe('options handling', () => {
      it('should support model selection', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.lists('Benefits and drawbacks of remote work', {
          model: '@cf/meta/llama-3.1-8b-instruct',
        })

        expect(typeof result).toBe('object')
        expect(Object.keys(result).length).toBeGreaterThan(0)
      })

      it('should support temperature option', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.lists('Creative uses for a paperclip categorized by difficulty', {
          temperature: 0.9,
        })

        expect(typeof result).toBe('object')
        expect(Object.keys(result).length).toBeGreaterThan(0)
      })
    })

    describe('error handling for lists()', () => {
      it('should throw error for empty prompt', async () => {
        const instance = new AIDO(ctx, env)

        await expect(instance.lists('')).rejects.toThrow(/prompt|empty|required/i)
      })

      it('should throw error for null prompt', async () => {
        const instance = new AIDO(ctx, env)

        await expect(instance.lists(null as unknown as string)).rejects.toThrow()
      })

      it('should return empty object when no categories can be inferred', async () => {
        const instance = new AIDO(ctx, env)
        // This prompt doesn't have natural category divisions
        const result = await instance.lists('a single item')

        expect(typeof result).toBe('object')
        // May return empty or with inferred categories
      })

      it('should handle AI errors gracefully', async () => {
        const errorEnv = createMockEnv()
        errorEnv.AI.run = async () => {
          throw new Error('AI service unavailable')
        }

        const instance = new AIDO(ctx, errorEnv)

        await expect(instance.lists('pros and cons')).rejects.toThrow(/unavailable|error/i)
      })
    })

    describe('edge cases', () => {
      it('should handle prompts with many potential categories', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.lists(
          'Things categorized by color: red things, blue things, green things, yellow things, purple things'
        )

        expect(typeof result).toBe('object')
        const keys = Object.keys(result)
        expect(keys.length).toBeGreaterThan(0)
        // Should create arrays for each color
      })

      it('should handle single-category prompts', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.lists('Just pros of using TypeScript', {
          keys: ['pros'],
        })

        expect(result).toHaveProperty('pros')
        expect(Array.isArray(result.pros)).toBe(true)
        expect(Object.keys(result).length).toBe(1)
      })

      it('should maintain array item types across all categories', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.lists('advantages and disadvantages of cloud computing')

        Object.values(result).forEach((arr) => {
          expect(Array.isArray(arr)).toBe(true)
          arr.forEach((item) => {
            expect(typeof item).toBe('string')
          })
        })
      })
    })
  })

  describe('HTTP API for list operations', () => {
    describe('POST /api/list', () => {
      it('should handle POST request for list generation', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/api/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: '5 programming languages' }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as string[]
        expect(Array.isArray(data)).toBe(true)
      })

      it('should accept options in request body', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/api/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: '3 fictional characters',
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

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as Array<{ name: string; age: number }>
        expect(Array.isArray(data)).toBe(true)
      })

      it('should return 400 for missing prompt', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/api/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(400)

        const error = (await response.json()) as { error: string }
        expect(error).toHaveProperty('error')
      })
    })

    describe('POST /api/lists', () => {
      it('should handle POST request for lists generation', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/api/lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'Pros and cons of Rust' }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as Record<string, string[]>
        expect(typeof data).toBe('object')
        expect(Object.keys(data).length).toBeGreaterThan(0)
      })

      it('should accept keys option in request body', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/api/lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: 'Software development categories',
            options: {
              keys: ['frontend', 'backend', 'mobile'],
            },
          }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as Record<string, string[]>
        expect(data).toHaveProperty('frontend')
        expect(data).toHaveProperty('backend')
        expect(data).toHaveProperty('mobile')
      })

      it('should return 400 for missing prompt', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/api/lists', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(400)

        const error = (await response.json()) as { error: string }
        expect(error).toHaveProperty('error')
      })
    })
  })

  describe('RPC interface for list operations', () => {
    it('should expose list method via RPC', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'list',
          params: ['5 programming languages', {}],
        }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = (await response.json()) as { result: string[] }
      expect(data).toHaveProperty('result')
      expect(Array.isArray(data.result)).toBe(true)
    })

    it('should expose lists method via RPC', async () => {
      const instance = new AIDO(ctx, env)
      const request = new Request('http://ai.do/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'lists',
          params: ['Pros and cons of GraphQL', {}],
        }),
      })

      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = (await response.json()) as { result: Record<string, string[]> }
      expect(data).toHaveProperty('result')
      expect(typeof data.result).toBe('object')
    })
  })
})
