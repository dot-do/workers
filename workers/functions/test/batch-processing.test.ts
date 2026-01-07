/**
 * RED Tests: functions.do Batch Processing and AIPromise
 *
 * These tests define the contract for the functions.do worker's batch processing
 * and AIPromise functionality.
 *
 * Per ARCHITECTURE.md:
 * - fn.do implements AIPromise, batch processing, providers
 *
 * RED PHASE: These tests MUST FAIL because FunctionsDO is not implemented yet.
 * The implementation will be done in the GREEN phase (workers-v9z5).
 *
 * @see ARCHITECTURE.md line 1334
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockFunctionsEnv } from './helpers.js'

/**
 * Interface definition for batch processing
 */
interface FunctionsDOBatchContract {
  // Batch operations
  batch<T>(operations: BatchOperation[]): Promise<BatchResult<T>[]>
  generateBatch(prompts: string[], options?: BatchOptions): Promise<GenerateResult[]>
  embedBatch(texts: string[], options?: EmbedBatchOptions): Promise<number[][]>

  // AIPromise interface
  promise<T>(operation: () => Promise<T>): AIPromise<T>

  // Provider management
  listProviders(): Promise<Provider[]>
  setProvider(name: string, config: ProviderConfig): Promise<void>
  getProvider(name: string): Promise<Provider | null>

  // HTTP handler
  fetch(request: Request): Promise<Response>
}

interface BatchOperation {
  method: 'generate' | 'extract' | 'classify' | 'summarize' | 'translate' | 'embed'
  params: unknown[]
  id?: string
}

interface BatchResult<T> {
  id?: string
  result?: T
  error?: string
}

interface BatchOptions {
  model?: string
  concurrency?: number
  continueOnError?: boolean
}

interface EmbedBatchOptions extends BatchOptions {
  model?: string
}

interface GenerateResult {
  text: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

interface AIPromise<T> extends Promise<T> {
  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): AIPromise<TResult1 | TResult2>
  catch<TResult = never>(
    onrejected?: ((reason: unknown) => TResult | PromiseLike<TResult>) | undefined | null
  ): AIPromise<T | TResult>
  finally(onfinally?: (() => void) | undefined | null): AIPromise<T>

  // AIPromise specific
  map<U>(fn: (value: T) => U | Promise<U>): AIPromise<U>
  pipe<U>(fn: (value: T) => U | Promise<U>): AIPromise<U>
  retry(options?: RetryOptions): AIPromise<T>
  timeout(ms: number): AIPromise<T>
  cached(ttl?: number): AIPromise<T>
}

interface RetryOptions {
  maxAttempts?: number
  backoff?: 'linear' | 'exponential'
  initialDelay?: number
}

interface Provider {
  name: string
  type: 'workers-ai' | 'openai' | 'anthropic' | 'custom'
  models: string[]
  isDefault?: boolean
}

interface ProviderConfig {
  type: 'workers-ai' | 'openai' | 'anthropic' | 'custom'
  apiKey?: string
  baseUrl?: string
  models?: string[]
}

/**
 * Attempt to load FunctionsDO - this will fail in RED phase
 */
async function loadFunctionsDO(): Promise<new (ctx: MockDOState, env: MockFunctionsEnv) => FunctionsDOBatchContract> {
  const module = await import('../src/functions.js')
  return module.FunctionsDO
}

describe('FunctionsDO Batch Processing', () => {
  let ctx: MockDOState
  let env: MockFunctionsEnv
  let FunctionsDO: new (ctx: MockDOState, env: MockFunctionsEnv) => FunctionsDOBatchContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    FunctionsDO = await loadFunctionsDO()
  })

  describe('batch() - Generic batch operations', () => {
    it('should execute multiple operations in batch', async () => {
      const instance = new FunctionsDO(ctx, env)
      const results = await instance.batch([
        { method: 'generate', params: ['Query 1'] },
        { method: 'generate', params: ['Query 2'] },
        { method: 'classify', params: ['Text', ['a', 'b']] },
      ])
      expect(results).toHaveLength(3)
      results.forEach(r => {
        expect(r).toHaveProperty('result')
      })
    })

    it('should preserve operation order in results', async () => {
      const instance = new FunctionsDO(ctx, env)
      const results = await instance.batch([
        { method: 'generate', params: ['First'], id: 'op1' },
        { method: 'generate', params: ['Second'], id: 'op2' },
        { method: 'generate', params: ['Third'], id: 'op3' },
      ])
      expect(results[0]?.id).toBe('op1')
      expect(results[1]?.id).toBe('op2')
      expect(results[2]?.id).toBe('op3')
    })

    it('should include errors for failed operations', async () => {
      const instance = new FunctionsDO(ctx, env)
      const results = await instance.batch([
        { method: 'generate', params: ['Valid'] },
        { method: 'generate', params: [''] }, // Invalid empty prompt
        { method: 'generate', params: ['Also valid'] },
      ])
      expect(results[0]).toHaveProperty('result')
      expect(results[1]).toHaveProperty('error')
      expect(results[2]).toHaveProperty('result')
    })

    it('should support mixed operation types', async () => {
      const instance = new FunctionsDO(ctx, env)
      const results = await instance.batch([
        { method: 'generate', params: ['Generate text'] },
        { method: 'summarize', params: ['Long text to summarize'] },
        { method: 'embed', params: ['Text to embed'] },
      ])
      expect(results).toHaveLength(3)
    })
  })

  describe('generateBatch() - Batch text generation', () => {
    it('should generate text for multiple prompts', async () => {
      const instance = new FunctionsDO(ctx, env)
      const results = await instance.generateBatch([
        'What is AI?',
        'Explain machine learning',
        'Define neural networks'
      ])
      expect(results).toHaveLength(3)
      results.forEach(r => {
        expect(r).toHaveProperty('text')
        expect(typeof r.text).toBe('string')
      })
    })

    it('should respect concurrency option', async () => {
      const instance = new FunctionsDO(ctx, env)
      const startTime = Date.now()
      const prompts = Array(10).fill('Test prompt')
      await instance.generateBatch(prompts, { concurrency: 2 })
      const duration = Date.now() - startTime
      // With concurrency=2, should take longer than parallel
      expect(duration).toBeGreaterThan(0)
    })

    it('should support shared model option', async () => {
      const instance = new FunctionsDO(ctx, env)
      const results = await instance.generateBatch(
        ['Prompt 1', 'Prompt 2'],
        { model: '@cf/meta/llama-3.1-8b-instruct' }
      )
      expect(results).toHaveLength(2)
    })

    it('should continue on error when option is set', async () => {
      const instance = new FunctionsDO(ctx, env)
      // Mix of valid and invalid prompts
      const prompts = ['Valid', '', 'Also valid']
      const results = await instance.generateBatch(prompts, { continueOnError: true })
      expect(results).toHaveLength(3)
    })
  })

  describe('embedBatch() - Batch embeddings', () => {
    it('should generate embeddings for multiple texts', async () => {
      const instance = new FunctionsDO(ctx, env)
      const results = await instance.embedBatch([
        'First text',
        'Second text',
        'Third text'
      ])
      expect(results).toHaveLength(3)
      results.forEach(embedding => {
        expect(Array.isArray(embedding)).toBe(true)
        expect(embedding.length).toBeGreaterThan(0)
        embedding.forEach(val => {
          expect(typeof val).toBe('number')
        })
      })
    })

    it('should handle large batch sizes efficiently', async () => {
      const instance = new FunctionsDO(ctx, env)
      const texts = Array(100).fill('Sample text')
      const results = await instance.embedBatch(texts)
      expect(results).toHaveLength(100)
    })
  })

  describe('HTTP batch endpoints', () => {
    it('should handle POST /api/batch', async () => {
      const instance = new FunctionsDO(ctx, env)
      const request = new Request('http://functions.do/api/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operations: [
            { method: 'generate', params: ['Test 1'] },
            { method: 'generate', params: ['Test 2'] },
          ]
        })
      })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)
      const results = await response.json() as BatchResult<unknown>[]
      expect(results).toHaveLength(2)
    })

    it('should handle POST /api/generate/batch', async () => {
      const instance = new FunctionsDO(ctx, env)
      const request = new Request('http://functions.do/api/generate/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompts: ['Prompt 1', 'Prompt 2', 'Prompt 3']
        })
      })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)
      const results = await response.json() as GenerateResult[]
      expect(results).toHaveLength(3)
    })

    it('should handle POST /api/embed/batch', async () => {
      const instance = new FunctionsDO(ctx, env)
      const request = new Request('http://functions.do/api/embed/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          texts: ['Text 1', 'Text 2']
        })
      })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)
      const results = await response.json() as number[][]
      expect(results).toHaveLength(2)
    })
  })
})

describe('FunctionsDO AIPromise', () => {
  let ctx: MockDOState
  let env: MockFunctionsEnv
  let FunctionsDO: new (ctx: MockDOState, env: MockFunctionsEnv) => FunctionsDOBatchContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    FunctionsDO = await loadFunctionsDO()
  })

  describe('promise() - AIPromise creation', () => {
    it('should create an AIPromise from an operation', async () => {
      const instance = new FunctionsDO(ctx, env)
      const promise = instance.promise(async () => 'result')
      expect(promise).toHaveProperty('then')
      expect(promise).toHaveProperty('catch')
      expect(promise).toHaveProperty('finally')
      const result = await promise
      expect(result).toBe('result')
    })

    it('should support map() for transforming results', async () => {
      const instance = new FunctionsDO(ctx, env)
      const promise = instance.promise(async () => 5)
        .map(n => n * 2)
      const result = await promise
      expect(result).toBe(10)
    })

    it('should support pipe() for chaining operations', async () => {
      const instance = new FunctionsDO(ctx, env)
      const promise = instance.promise(async () => 'hello')
        .pipe(s => s.toUpperCase())
        .pipe(s => s + '!')
      const result = await promise
      expect(result).toBe('HELLO!')
    })

    it('should support chained map operations', async () => {
      const instance = new FunctionsDO(ctx, env)
      const promise = instance.promise(async () => 1)
        .map(n => n + 1)
        .map(n => n * 2)
        .map(n => n.toString())
      const result = await promise
      expect(result).toBe('4')
    })
  })

  describe('AIPromise retry()', () => {
    it('should retry failed operations', async () => {
      const instance = new FunctionsDO(ctx, env)
      let attempts = 0
      const promise = instance.promise(async () => {
        attempts++
        if (attempts < 3) throw new Error('Transient error')
        return 'success'
      }).retry({ maxAttempts: 3 })

      const result = await promise
      expect(result).toBe('success')
      expect(attempts).toBe(3)
    })

    it('should respect maxAttempts option', async () => {
      const instance = new FunctionsDO(ctx, env)
      let attempts = 0
      const promise = instance.promise(async () => {
        attempts++
        throw new Error('Always fails')
      }).retry({ maxAttempts: 2 })

      await expect(promise).rejects.toThrow('Always fails')
      expect(attempts).toBe(2)
    })

    it('should support exponential backoff', async () => {
      const instance = new FunctionsDO(ctx, env)
      const timestamps: number[] = []
      let attempts = 0

      const promise = instance.promise(async () => {
        timestamps.push(Date.now())
        attempts++
        if (attempts < 3) throw new Error('Fail')
        return 'done'
      }).retry({ maxAttempts: 3, backoff: 'exponential', initialDelay: 10 })

      await promise
      // Check that delays increased exponentially
      if (timestamps.length >= 3) {
        const delay1 = timestamps[1]! - timestamps[0]!
        const delay2 = timestamps[2]! - timestamps[1]!
        expect(delay2).toBeGreaterThan(delay1)
      }
    })
  })

  describe('AIPromise timeout()', () => {
    it('should timeout long-running operations', async () => {
      const instance = new FunctionsDO(ctx, env)
      const promise = instance.promise(async () => {
        await new Promise(resolve => setTimeout(resolve, 5000))
        return 'too late'
      }).timeout(100)

      await expect(promise).rejects.toThrow(/timeout/i)
    }, 10000)

    it('should not timeout fast operations', async () => {
      const instance = new FunctionsDO(ctx, env)
      const promise = instance.promise(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        return 'fast'
      }).timeout(1000)

      const result = await promise
      expect(result).toBe('fast')
    })
  })

  describe('AIPromise cached()', () => {
    it('should cache results', async () => {
      const instance = new FunctionsDO(ctx, env)
      let calls = 0
      const createPromise = () => instance.promise(async () => {
        calls++
        return 'cached result'
      }).cached()

      // First call
      const result1 = await createPromise()
      expect(result1).toBe('cached result')

      // Second call should use cache
      const result2 = await createPromise()
      expect(result2).toBe('cached result')

      // Only one actual execution
      expect(calls).toBe(1)
    })

    it('should respect TTL', async () => {
      const instance = new FunctionsDO(ctx, env)
      let calls = 0
      const createPromise = () => instance.promise(async () => {
        calls++
        return 'result ' + calls
      }).cached(50) // 50ms TTL

      const result1 = await createPromise()
      expect(result1).toBe('result 1')

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 100))

      const result2 = await createPromise()
      expect(result2).toBe('result 2')
    })
  })
})

describe('FunctionsDO Provider Management', () => {
  let ctx: MockDOState
  let env: MockFunctionsEnv
  let FunctionsDO: new (ctx: MockDOState, env: MockFunctionsEnv) => FunctionsDOBatchContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    FunctionsDO = await loadFunctionsDO()
  })

  describe('listProviders()', () => {
    it('should list available AI providers', async () => {
      const instance = new FunctionsDO(ctx, env)
      const providers = await instance.listProviders()
      expect(Array.isArray(providers)).toBe(true)
      // Workers AI should be the default provider
      const workersAI = providers.find(p => p.type === 'workers-ai')
      expect(workersAI).toBeDefined()
      expect(workersAI?.isDefault).toBe(true)
    })

    it('should include provider models', async () => {
      const instance = new FunctionsDO(ctx, env)
      const providers = await instance.listProviders()
      const workersAI = providers.find(p => p.type === 'workers-ai')
      expect(workersAI?.models).toBeInstanceOf(Array)
      expect(workersAI?.models.length).toBeGreaterThan(0)
    })
  })

  describe('setProvider()', () => {
    it('should configure a new provider', async () => {
      const instance = new FunctionsDO(ctx, env)
      await instance.setProvider('custom-openai', {
        type: 'openai',
        apiKey: 'test-key',
        models: ['gpt-4', 'gpt-3.5-turbo']
      })

      const provider = await instance.getProvider('custom-openai')
      expect(provider).not.toBeNull()
      expect(provider?.type).toBe('openai')
    })

    it('should update existing provider', async () => {
      const instance = new FunctionsDO(ctx, env)
      await instance.setProvider('myProvider', {
        type: 'custom',
        baseUrl: 'https://api.example.com/v1'
      })
      await instance.setProvider('myProvider', {
        type: 'custom',
        baseUrl: 'https://api.example.com/v2'
      })

      const provider = await instance.getProvider('myProvider')
      expect(provider).toBeDefined()
    })

    it('should validate provider configuration', async () => {
      const instance = new FunctionsDO(ctx, env)
      await expect(instance.setProvider('', { type: 'openai' })).rejects.toThrow(/name|required/i)
      await expect(instance.setProvider('test', { type: 'invalid' as any })).rejects.toThrow(/type|invalid/i)
    })
  })

  describe('getProvider()', () => {
    it('should return null for unknown provider', async () => {
      const instance = new FunctionsDO(ctx, env)
      const provider = await instance.getProvider('nonexistent')
      expect(provider).toBeNull()
    })

    it('should return provider details', async () => {
      const instance = new FunctionsDO(ctx, env)
      await instance.setProvider('testProvider', {
        type: 'anthropic',
        apiKey: 'key',
        models: ['claude-3-opus', 'claude-3-sonnet']
      })

      const provider = await instance.getProvider('testProvider')
      expect(provider).not.toBeNull()
      expect(provider?.name).toBe('testProvider')
      expect(provider?.type).toBe('anthropic')
      expect(provider?.models).toContain('claude-3-opus')
    })
  })

  describe('Provider HTTP endpoints', () => {
    it('should handle GET /api/providers', async () => {
      const instance = new FunctionsDO(ctx, env)
      const request = new Request('http://functions.do/api/providers', { method: 'GET' })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)
      const providers = await response.json() as Provider[]
      expect(Array.isArray(providers)).toBe(true)
    })

    it('should handle PUT /api/providers/:name', async () => {
      const instance = new FunctionsDO(ctx, env)
      const request = new Request('http://functions.do/api/providers/myProvider', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'openai',
          apiKey: 'test-key'
        })
      })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)
    })

    it('should handle GET /api/providers/:name', async () => {
      const instance = new FunctionsDO(ctx, env)
      await instance.setProvider('testProvider', { type: 'workers-ai' })

      const request = new Request('http://functions.do/api/providers/testProvider', { method: 'GET' })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)
      const provider = await response.json() as Provider
      expect(provider.name).toBe('testProvider')
    })
  })
})
