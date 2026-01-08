/**
 * RED Tests: workers/ai AIDO RPC Interface
 *
 * These tests define the contract for the workers/ai Durable Object's RPC interface.
 * AIDO provides high-level generative AI primitives built on top of workers/llm.
 *
 * Per README.md and ARCHITECTURE.md:
 * - workers/ai provides generative AI primitives
 * - Access via service binding: env.AI
 * - Supports generate, list, lists, extract, summarize, is, diagram, slides
 * - Multi-transport: Workers RPC, REST, CapnWeb, MCP
 *
 * RED PHASE: These tests MUST FAIL because AIDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-m6qgb).
 *
 * @see workers/ai/README.md for API documentation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockState,
  createMockEnv,
  type MockDOState,
  type MockAIEnv,
  type IsOptions,
  type SummarizeOptions,
  type DiagramOptions,
  type DiagramResult,
  type ListOptions,
  type ListsOptions,
  type ExtractOptions,
  type SimpleSchema,
} from './helpers.js'

/**
 * Interface definition for AIDO - this defines the contract
 * The implementation must satisfy this interface
 */
export interface AIDOContract {
  // Core AI primitives (from README.md)
  generate(prompt: string, options?: GenerateOptions): Promise<string>
  list<T = string>(prompt: string, options?: ListOptions): Promise<T[]>
  lists<T = string>(prompt: string, options?: ListsOptions): Promise<Record<string, T[]>>
  extract<T>(text: string, schema: SimpleSchema, options?: ExtractOptions): Promise<T>
  summarize(text: string, options?: SummarizeOptions): Promise<string>
  is(value: string, condition: string, options?: IsOptions): Promise<boolean>
  diagram(description: string, options?: DiagramOptions): Promise<DiagramResult>
  slides(topic: string, options?: SlidesOptions): Promise<Slide[]>

  // RPC interface (follows eval.ts pattern)
  hasMethod(name: string): boolean
  call(method: string, params: unknown[]): Promise<unknown>

  // HTTP handlers
  fetch(request: Request): Promise<Response>
}

export interface GenerateOptions {
  model?: string
  maxTokens?: number
  temperature?: number
  stream?: boolean
  schema?: Record<string, unknown>
}

export interface SlidesOptions {
  model?: string
  slideCount?: number
  audience?: string
  style?: 'presentation' | 'lecture' | 'pitch'
}

export interface Slide {
  title: string
  content: string
  notes?: string
  layout?: 'title' | 'content' | 'bullets' | 'image'
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

describe('AIDO RPC Interface', () => {
  let ctx: MockDOState
  let env: MockAIEnv
  let AIDO: new (ctx: MockDOState, env: MockAIEnv) => AIDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    // This will throw in RED phase because the module doesn't exist
    AIDO = await loadAIDO()
  })

  describe('Core AI Primitives', () => {
    describe('generate()', () => {
      it('should generate text from a prompt', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.generate('Write a haiku about TypeScript')
        expect(typeof result).toBe('string')
        expect(result.length).toBeGreaterThan(0)
      })

      it('should support model selection', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.generate('Hello', { model: 'claude-3-5-sonnet' })
        expect(typeof result).toBe('string')
      })

      it('should support maxTokens option', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.generate('Write a very long essay', { maxTokens: 50 })
        expect(typeof result).toBe('string')
      })

      it('should support temperature option', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.generate('Be creative', { temperature: 0.9 })
        expect(typeof result).toBe('string')
      })

      it('should support structured output with schema', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.generate('Return a user profile', {
          schema: { name: 'string', age: 'number', bio: 'string' },
        })
        // With schema, should return valid JSON string
        expect(typeof result).toBe('string')
        expect(() => JSON.parse(result)).not.toThrow()
      })
    })

    describe('list()', () => {
      it('should generate a list of items from a prompt', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.list('5 programming languages')
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThan(0)
      })

      it('should respect maxItems option', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.list('List all countries', { maxItems: 3 })
        expect(result.length).toBeLessThanOrEqual(3)
      })

      it('should support typed results with schema', async () => {
        interface Person { name: string; age: number }
        const instance = new AIDO(ctx, env)
        const result = await instance.list<Person>('3 fictional characters with ages', {
          schema: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                age: { type: 'number' },
              },
            },
          },
        })
        expect(Array.isArray(result)).toBe(true)
        result.forEach((person) => {
          expect(person).toHaveProperty('name')
          expect(person).toHaveProperty('age')
        })
      })
    })

    describe('lists()', () => {
      it('should generate multiple named arrays for destructuring', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.lists('Pros and cons of microservices architecture')
        expect(typeof result).toBe('object')
        expect(result).toHaveProperty('pros')
        expect(result).toHaveProperty('cons')
        expect(Array.isArray(result.pros)).toBe(true)
        expect(Array.isArray(result.cons)).toBe(true)
      })

      it('should support explicit keys option', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.lists('Ideas for a startup', {
          keys: ['product', 'marketing', 'engineering'],
        })
        expect(result).toHaveProperty('product')
        expect(result).toHaveProperty('marketing')
        expect(result).toHaveProperty('engineering')
      })
    })

    describe('extract()', () => {
      it('should extract structured data from text', async () => {
        const instance = new AIDO(ctx, env)
        const text = 'John Smith is 30 years old and lives in New York.'
        const result = await instance.extract<{ name: string; age: number; city?: string }>(
          text,
          {
            name: 'string',
            age: 'number',
            city: 'string?',
          }
        )
        expect(result).toHaveProperty('name')
        expect(result).toHaveProperty('age')
        expect(typeof result.age).toBe('number')
      })

      it('should handle optional fields with ? suffix', async () => {
        const instance = new AIDO(ctx, env)
        const text = 'Email: test@example.com'
        const result = await instance.extract<{ email: string; phone?: string }>(
          text,
          {
            email: 'string',
            phone: 'string?',
          }
        )
        expect(result.email).toMatch(/@/)
        // phone is optional, may be undefined
      })

      it('should support enum-like types with pipe syntax', async () => {
        const instance = new AIDO(ctx, env)
        const text = 'This is an urgent request!'
        const result = await instance.extract<{ urgency: 'low' | 'medium' | 'high' }>(
          text,
          {
            urgency: 'low | medium | high',
          }
        )
        expect(['low', 'medium', 'high']).toContain(result.urgency)
      })

      it('should throw in strict mode for missing required fields', async () => {
        const instance = new AIDO(ctx, env)
        const text = 'Just some random text without the expected data'
        await expect(
          instance.extract(
            text,
            { specificField: 'string' },
            { strict: true }
          )
        ).rejects.toThrow(/extract|missing|required/i)
      })
    })

    describe('summarize()', () => {
      it('should summarize text', async () => {
        const instance = new AIDO(ctx, env)
        const longText = 'This is a very long article about artificial intelligence. '.repeat(50)
        const result = await instance.summarize(longText)
        expect(typeof result).toBe('string')
        expect(result.length).toBeLessThan(longText.length)
      })

      it('should respect length option', async () => {
        const instance = new AIDO(ctx, env)
        const text = 'A detailed explanation of quantum computing principles.'.repeat(20)

        const shortSummary = await instance.summarize(text, { length: 'short' })
        const longSummary = await instance.summarize(text, { length: 'long' })

        expect(shortSummary.length).toBeLessThan(longSummary.length)
      })

      it('should support bullet format', async () => {
        const instance = new AIDO(ctx, env)
        const text = 'First point about topic. Second point about topic. Third point.'
        const result = await instance.summarize(text, { format: 'bullets' })
        expect(typeof result).toBe('string')
        // Bullet format should contain bullet markers
        expect(result).toMatch(/[-*]/)
      })
    })

    describe('is()', () => {
      it('should return boolean classification', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.is('Buy now! Limited offer!', 'spam or promotional content')
        expect(typeof result).toBe('boolean')
      })

      it('should classify spam correctly', async () => {
        const instance = new AIDO(ctx, env)
        const spamResult = await instance.is('Buy now! Limited offer! Click here!', 'spam')
        expect(spamResult).toBe(true)

        const notSpamResult = await instance.is('Hello, how are you today?', 'spam')
        expect(notSpamResult).toBe(false)
      })

      it('should classify urgency', async () => {
        const instance = new AIDO(ctx, env)
        const urgent = await instance.is('CRITICAL: Server is down!', 'requires immediate attention')
        expect(urgent).toBe(true)
      })

      it('should support model option', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.is('Test message', 'a greeting', { model: 'claude-3-5-sonnet' })
        expect(typeof result).toBe('boolean')
      })
    })

    describe('diagram()', () => {
      it('should generate a diagram from description', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.diagram('User authentication flow with OAuth')
        expect(result).toHaveProperty('content')
        expect(result).toHaveProperty('format')
        expect(result.content.length).toBeGreaterThan(0)
      })

      it('should support mermaid format', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.diagram('Simple flowchart', { format: 'mermaid' })
        expect(result.format).toBe('mermaid')
        // Mermaid diagrams typically start with a diagram type
        expect(result.content).toMatch(/flowchart|graph|sequenceDiagram|classDiagram/i)
      })

      it('should support svg format', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.diagram('Simple diagram', { format: 'svg' })
        expect(result.format).toBe('svg')
        expect(result.content).toMatch(/<svg/i)
      })

      it('should support different diagram styles', async () => {
        const instance = new AIDO(ctx, env)
        const flowchart = await instance.diagram('Process flow', { style: 'flowchart' })
        const sequence = await instance.diagram('API calls', { style: 'sequence' })
        expect(flowchart.content).toBeDefined()
        expect(sequence.content).toBeDefined()
      })
    })

    describe('slides()', () => {
      it('should generate presentation slides', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.slides('Introduction to Workers.do')
        expect(Array.isArray(result)).toBe(true)
        expect(result.length).toBeGreaterThan(0)
        expect(result[0]).toHaveProperty('title')
        expect(result[0]).toHaveProperty('content')
      })

      it('should respect slideCount option', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.slides('AI presentation', { slideCount: 5 })
        expect(result.length).toBe(5)
      })

      it('should support audience option', async () => {
        const instance = new AIDO(ctx, env)
        const devSlides = await instance.slides('TypeScript', { audience: 'developers' })
        const execSlides = await instance.slides('TypeScript', { audience: 'executives' })
        // Both should return valid slides, content may differ based on audience
        expect(devSlides.length).toBeGreaterThan(0)
        expect(execSlides.length).toBeGreaterThan(0)
      })

      it('should include speaker notes when requested', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.slides('Technical topic')
        // At least some slides should have notes
        const slidesWithNotes = result.filter((s) => s.notes)
        expect(slidesWithNotes.length).toBeGreaterThan(0)
      })
    })
  })

  describe('RPC interface', () => {
    describe('hasMethod()', () => {
      it('should return true for generate method', async () => {
        const instance = new AIDO(ctx, env)
        expect(instance.hasMethod('generate')).toBe(true)
      })

      it('should return true for list method', async () => {
        const instance = new AIDO(ctx, env)
        expect(instance.hasMethod('list')).toBe(true)
      })

      it('should return true for lists method', async () => {
        const instance = new AIDO(ctx, env)
        expect(instance.hasMethod('lists')).toBe(true)
      })

      it('should return true for extract method', async () => {
        const instance = new AIDO(ctx, env)
        expect(instance.hasMethod('extract')).toBe(true)
      })

      it('should return true for summarize method', async () => {
        const instance = new AIDO(ctx, env)
        expect(instance.hasMethod('summarize')).toBe(true)
      })

      it('should return true for is method', async () => {
        const instance = new AIDO(ctx, env)
        expect(instance.hasMethod('is')).toBe(true)
      })

      it('should return true for diagram method', async () => {
        const instance = new AIDO(ctx, env)
        expect(instance.hasMethod('diagram')).toBe(true)
      })

      it('should return true for slides method', async () => {
        const instance = new AIDO(ctx, env)
        expect(instance.hasMethod('slides')).toBe(true)
      })

      it('should return false for non-existent methods', async () => {
        const instance = new AIDO(ctx, env)
        expect(instance.hasMethod('nonexistent')).toBe(false)
        expect(instance.hasMethod('eval')).toBe(false)
        expect(instance.hasMethod('execute')).toBe(false)
        expect(instance.hasMethod('unknown')).toBe(false)
      })

      it('should return false for internal/private methods', async () => {
        const instance = new AIDO(ctx, env)
        // Internal methods should not be exposed via RPC
        expect(instance.hasMethod('constructor')).toBe(false)
        expect(instance.hasMethod('toString')).toBe(false)
        expect(instance.hasMethod('_internal')).toBe(false)
        expect(instance.hasMethod('__proto__')).toBe(false)
      })

      it('should return false for fetch method (not callable via RPC)', async () => {
        const instance = new AIDO(ctx, env)
        // fetch is the HTTP handler, not an RPC method
        expect(instance.hasMethod('fetch')).toBe(false)
      })

      it('should return false for hasMethod itself', async () => {
        const instance = new AIDO(ctx, env)
        expect(instance.hasMethod('hasMethod')).toBe(false)
      })

      it('should return false for call method', async () => {
        const instance = new AIDO(ctx, env)
        expect(instance.hasMethod('call')).toBe(false)
      })
    })

    describe('call()', () => {
      it('should call generate method with array params', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.call('generate', ['Hello'])
        expect(typeof result).toBe('string')
      })

      it('should call list method with params', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.call('list', ['3 colors'])
        expect(Array.isArray(result)).toBe(true)
      })

      it('should call is method for boolean classification', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.call('is', ['Hello there!', 'a greeting'])
        expect(typeof result).toBe('boolean')
      })

      it('should call extract method with text and schema', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.call('extract', [
          'John is 30 years old',
          { name: 'string', age: 'number' },
        ])
        expect(typeof result).toBe('object')
      })

      it('should call summarize method', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.call('summarize', ['A long text to summarize.'])
        expect(typeof result).toBe('string')
      })

      it('should call diagram method', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.call('diagram', ['Simple flowchart'])
        expect(typeof result).toBe('object')
        expect(result).toHaveProperty('content')
        expect(result).toHaveProperty('format')
      })

      it('should throw error for non-existent method', async () => {
        const instance = new AIDO(ctx, env)
        await expect(instance.call('nonexistent', [])).rejects.toThrow(/not found|not allowed/i)
      })

      it('should throw error for internal methods', async () => {
        const instance = new AIDO(ctx, env)
        await expect(instance.call('constructor', [])).rejects.toThrow(/not found|not allowed/i)
      })

      it('should pass options as second array element', async () => {
        const instance = new AIDO(ctx, env)
        const result = await instance.call('generate', ['Hello', { maxTokens: 50 }])
        expect(typeof result).toBe('string')
      })

      it('should propagate errors from underlying methods', async () => {
        const instance = new AIDO(ctx, env)
        // Calling with invalid params should propagate the error
        await expect(instance.call('generate', [])).rejects.toThrow(/required|missing|parameter/i)
      })
    })
  })

  describe('HTTP fetch() handler', () => {
    describe('Discovery endpoint', () => {
      it('should return discovery info at GET /', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/', { method: 'GET' })
        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as Record<string, unknown>
        expect(data).toHaveProperty('id')
        expect(data).toHaveProperty('type')
        expect(data).toHaveProperty('api')
        expect(data).toHaveProperty('endpoints')
      })

      it('should include available methods in discovery', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/', { method: 'GET' })
        const response = await instance.fetch(request)
        const data = (await response.json()) as { methods?: string[] }

        expect(data.methods).toContain('generate')
        expect(data.methods).toContain('list')
        expect(data.methods).toContain('extract')
        expect(data.methods).toContain('summarize')
        expect(data.methods).toContain('is')
      })
    })

    describe('Health check endpoint', () => {
      it('should return health status at GET /health', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/health', { method: 'GET' })
        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as { status: string; id: string }
        expect(data.status).toBe('ok')
        expect(data.id).toBeDefined()
      })
    })

    describe('JSON-RPC endpoint', () => {
      it('should handle POST /rpc with method call', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'generate',
            params: { prompt: 'Hello' },
            id: 1,
          }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const result = (await response.json()) as { jsonrpc: string; result: string; id: number }
        expect(result.jsonrpc).toBe('2.0')
        expect(result).toHaveProperty('result')
        expect(result.id).toBe(1)
      })

      it('should return error for invalid method', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'invalid',
            params: {},
            id: 1,
          }),
        })

        const response = await instance.fetch(request)
        const result = (await response.json()) as { jsonrpc: string; error: { code: number; message: string }; id: number }
        expect(result).toHaveProperty('error')
        expect(result.error.code).toBe(-32603) // Internal error
      })

      it('should return parse error for invalid JSON', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: 'not valid json',
        })

        const response = await instance.fetch(request)
        const result = (await response.json()) as { error: { code: number } }
        expect(result.error.code).toBe(-32700) // Parse error
      })

      it('should handle batch requests', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([
            { jsonrpc: '2.0', method: 'generate', params: { prompt: 'One' }, id: 1 },
            { jsonrpc: '2.0', method: 'generate', params: { prompt: 'Two' }, id: 2 },
          ]),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const results = (await response.json()) as Array<{ id: number }>
        expect(Array.isArray(results)).toBe(true)
        expect(results).toHaveLength(2)
      })
    })

    describe('REST API endpoints', () => {
      it('should handle POST /api/generate', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'Write a haiku' }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as { text: string }
        expect(data).toHaveProperty('text')
      })

      it('should handle POST /api/list', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/api/list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: '5 programming languages' }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as { items: string[] }
        expect(data).toHaveProperty('items')
        expect(Array.isArray(data.items)).toBe(true)
      })

      it('should handle POST /api/extract', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'John is 30 years old',
            schema: { name: 'string', age: 'number' },
          }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as { name: string; age: number }
        expect(data).toHaveProperty('name')
        expect(data).toHaveProperty('age')
      })

      it('should handle POST /api/summarize', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/api/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: 'This is a long article about AI.'.repeat(10),
          }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as { summary: string }
        expect(data).toHaveProperty('summary')
      })

      it('should handle POST /api/is', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/api/is', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            value: 'Hello there!',
            condition: 'a greeting',
          }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as { result: boolean }
        expect(data).toHaveProperty('result')
        expect(typeof data.result).toBe('boolean')
      })

      it('should handle POST /api/diagram', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/api/diagram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: 'Simple flowchart',
            format: 'mermaid',
          }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as DiagramResult
        expect(data).toHaveProperty('content')
        expect(data).toHaveProperty('format')
      })

      it('should handle POST /api/slides', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/api/slides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: 'Introduction to AI',
            slideCount: 3,
          }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as { slides: Slide[] }
        expect(data).toHaveProperty('slides')
        expect(Array.isArray(data.slides)).toBe(true)
      })
    })

    describe('Agentic endpoint', () => {
      it('should handle POST /do with natural language prompt', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/do', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'generate a poem about TypeScript' }),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(200)

        const data = (await response.json()) as { result: unknown }
        expect(data).toHaveProperty('result')
      })

      it('should return error for missing prompt', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/do', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        })

        const response = await instance.fetch(request)
        expect(response.status).toBe(400)

        const data = (await response.json()) as { error: string }
        expect(data).toHaveProperty('error')
      })
    })

    describe('Error handling', () => {
      it('should return 404 for unknown routes', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/unknown', { method: 'GET' })
        const response = await instance.fetch(request)
        expect(response.status).toBe(404)
      })

      it('should return 405 for unsupported methods on endpoints', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/api/generate', { method: 'GET' })
        const response = await instance.fetch(request)
        // Either 404 or 405 is acceptable
        expect([404, 405]).toContain(response.status)
      })

      it('should return error response with proper JSON structure', async () => {
        const instance = new AIDO(ctx, env)
        const request = new Request('http://ai.do/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}), // Missing required prompt
        })

        const response = await instance.fetch(request)
        expect(response.status).toBeGreaterThanOrEqual(400)

        const data = (await response.json()) as { error: string }
        expect(data).toHaveProperty('error')
        expect(typeof data.error).toBe('string')
      })
    })
  })
})
