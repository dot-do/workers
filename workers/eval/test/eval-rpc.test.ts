/**
 * Tests: eval.do RPC Interface
 *
 * These tests define the RPC and HTTP contract for the eval.do worker.
 * The EvalDO must expose both RPC methods and HTTP endpoints.
 *
 * @see ARCHITECTURE.md
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createMockState, createMockEnv, type MockDOState, type MockEvalEnv, type ExecutionResult, type EvalOptions } from './helpers.js'

/**
 * Interface definition for EvalDO
 */
interface EvalDOContract {
  evaluate(code: string, options?: EvalOptions): Promise<ExecutionResult>
  evaluateAsync(code: string, options?: EvalOptions): Promise<ExecutionResult>
  validateCode(code: string): Promise<{ valid: boolean; errors?: string[] }>
  hasMethod(name: string): boolean
  call(method: string, params: unknown[]): Promise<unknown>
  fetch(request: Request): Promise<Response>
}

/**
 * Load EvalDO
 */
async function loadEvalDO(): Promise<new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract> {
  const module = await import('../src/eval.js')
  return module.EvalDO
}

describe('EvalDO RPC Interface', () => {
  let ctx: MockDOState
  let env: MockEvalEnv
  let EvalDO: new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalDO = await loadEvalDO()
  })

  describe('hasMethod checks', () => {
    it('should expose evaluate method', () => {
      const instance = new EvalDO(ctx, env)
      expect(instance.hasMethod('evaluate')).toBe(true)
    })

    it('should expose evaluateAsync method', () => {
      const instance = new EvalDO(ctx, env)
      expect(instance.hasMethod('evaluateAsync')).toBe(true)
    })

    it('should expose validateCode method', () => {
      const instance = new EvalDO(ctx, env)
      expect(instance.hasMethod('validateCode')).toBe(true)
    })

    it('should not expose internal methods', () => {
      const instance = new EvalDO(ctx, env)
      expect(instance.hasMethod('_internal')).toBe(false)
      expect(instance.hasMethod('constructor')).toBe(false)
    })
  })

  describe('RPC call method', () => {
    it('should call evaluate via RPC', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.call('evaluate', ['1 + 1']) as ExecutionResult
      expect(result.success).toBe(true)
      expect(result.result).toBe(2)
    })

    it('should call evaluateAsync via RPC', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.call('evaluateAsync', ['await Promise.resolve(42)']) as ExecutionResult
      expect(result.success).toBe(true)
      expect(result.result).toBe(42)
    })

    it('should call validateCode via RPC', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.call('validateCode', ['const x = 1;']) as { valid: boolean }
      expect(result.valid).toBe(true)
    })

    it('should pass options through RPC', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.call('evaluate', ['1 + 1', { timeout: 5000 }]) as ExecutionResult
      expect(result.success).toBe(true)
    })
  })
})

describe('EvalDO HTTP Interface', () => {
  let ctx: MockDOState
  let env: MockEvalEnv
  let EvalDO: new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalDO = await loadEvalDO()
  })

  describe('HATEOAS discovery', () => {
    it('should return discovery info on GET /', async () => {
      const instance = new EvalDO(ctx, env)
      const request = new Request('http://eval.do/', { method: 'GET' })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as { api: string; links: Record<string, string> }
      expect(data.api).toBe('eval.do')
      expect(data.links).toBeDefined()
      expect(data.links.eval).toBeDefined()
      expect(data.links.validate).toBeDefined()
    })
  })

  describe('POST /api/eval endpoint', () => {
    it('should evaluate code via HTTP', async () => {
      const instance = new EvalDO(ctx, env)
      const request = new Request('http://eval.do/api/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '1 + 1' })
      })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as ExecutionResult
      expect(data.success).toBe(true)
      expect(data.result).toBe(2)
    })

    it('should accept options in request body', async () => {
      const instance = new EvalDO(ctx, env)
      const request = new Request('http://eval.do/api/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: '1 + 1',
          options: { timeout: 5000 }
        })
      })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)
    })

    it('should include request ID in response headers', async () => {
      const instance = new EvalDO(ctx, env)
      const request = new Request('http://eval.do/api/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '1 + 1' })
      })
      const response = await instance.fetch(request)
      expect(response.headers.get('X-Request-Id')).toBeDefined()
    })
  })

  describe('POST /api/eval/async endpoint', () => {
    it('should evaluate async code via HTTP', async () => {
      const instance = new EvalDO(ctx, env)
      const request = new Request('http://eval.do/api/eval/async', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'await Promise.resolve(42)' })
      })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as ExecutionResult
      expect(data.success).toBe(true)
      expect(data.result).toBe(42)
    })
  })

  describe('POST /api/validate endpoint', () => {
    it('should validate code via HTTP', async () => {
      const instance = new EvalDO(ctx, env)
      const request = new Request('http://eval.do/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'const x = 1;' })
      })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as { valid: boolean }
      expect(data.valid).toBe(true)
    })

    it('should return errors for invalid code', async () => {
      const instance = new EvalDO(ctx, env)
      const request = new Request('http://eval.do/api/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'const x = ' })
      })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as { valid: boolean; errors?: string[] }
      expect(data.valid).toBe(false)
      expect(data.errors).toBeDefined()
    })
  })

  describe('POST /rpc endpoint', () => {
    it('should handle RPC calls via HTTP', async () => {
      const instance = new EvalDO(ctx, env)
      const request = new Request('http://eval.do/rpc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: 'evaluate',
          params: ['1 + 1']
        })
      })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as { result: ExecutionResult }
      expect(data.result.success).toBe(true)
      expect(data.result.result).toBe(2)
    })

    it('should handle RPC batch calls', async () => {
      const instance = new EvalDO(ctx, env)
      const request = new Request('http://eval.do/rpc/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([
          { method: 'evaluate', params: ['1 + 1'] },
          { method: 'evaluate', params: ['2 * 3'] },
          { method: 'validateCode', params: ['const x = 1;'] }
        ])
      })
      const response = await instance.fetch(request)
      expect(response.status).toBe(200)

      const data = await response.json() as Array<{ result?: unknown; error?: string }>
      expect(data.length).toBe(3)
      expect((data[0].result as ExecutionResult).result).toBe(2)
      expect((data[1].result as ExecutionResult).result).toBe(6)
      expect((data[2].result as { valid: boolean }).valid).toBe(true)
    })
  })

  describe('Content negotiation', () => {
    it('should return JSON by default', async () => {
      const instance = new EvalDO(ctx, env)
      const request = new Request('http://eval.do/api/eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: '"hello"' })
      })
      const response = await instance.fetch(request)
      expect(response.headers.get('Content-Type')).toContain('application/json')
    })

    it('should return text/plain when Accept header is text/plain', async () => {
      const instance = new EvalDO(ctx, env)
      const request = new Request('http://eval.do/api/eval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/plain'
        },
        body: JSON.stringify({ code: '"hello"' })
      })
      const response = await instance.fetch(request)
      expect(response.headers.get('Content-Type')).toContain('text/plain')
      const text = await response.text()
      expect(text).toBe('hello')
    })
  })
})

describe('EvalDO Result Serialization', () => {
  let ctx: MockDOState
  let env: MockEvalEnv
  let EvalDO: new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalDO = await loadEvalDO()
  })

  it('should serialize primitive values', async () => {
    const instance = new EvalDO(ctx, env)

    const numberResult = await instance.evaluate('42')
    expect(numberResult.result).toBe(42)

    const stringResult = await instance.evaluate('"hello"')
    expect(stringResult.result).toBe('hello')

    const boolResult = await instance.evaluate('true')
    expect(boolResult.result).toBe(true)

    const nullResult = await instance.evaluate('null')
    expect(nullResult.result).toBeNull()
  })

  it('should serialize arrays', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('[1, 2, 3]')
    expect(result.result).toEqual([1, 2, 3])
  })

  it('should serialize objects', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('({ a: 1, b: "two" })')
    expect(result.result).toEqual({ a: 1, b: 'two' })
  })

  it('should serialize nested structures', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(`
      ({
        arr: [1, 2, { nested: true }],
        obj: { deep: { value: 42 } }
      })
    `)
    expect(result.result).toEqual({
      arr: [1, 2, { nested: true }],
      obj: { deep: { value: 42 } }
    })
  })

  it('should handle Date serialization', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('new Date(0)')
    expect(result.success).toBe(true)
    // Dates are typically serialized as ISO strings
    if (typeof result.result === 'string') {
      expect(result.result).toMatch(/1970/)
    }
  })

  it('should handle BigInt serialization', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('BigInt(12345678901234567890n)')
    expect(result.success).toBe(true)
    // BigInts are typically converted to strings
    if (typeof result.result === 'string') {
      expect(result.result).toContain('12345678901234567890')
    }
  })

  it('should handle Map serialization', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(`
      const map = new Map();
      map.set('a', 1);
      map.set('b', 2);
      map
    `)
    expect(result.success).toBe(true)
    // Maps might be serialized as arrays of entries or objects
  })

  it('should handle Set serialization', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('new Set([1, 2, 3])')
    expect(result.success).toBe(true)
    // Sets might be serialized as arrays
  })

  it('should handle circular reference gracefully', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(`
      const obj = { a: 1 };
      obj.circular = obj;
      obj
    `)
    // Should either serialize successfully or return an error
    expect(result).toBeDefined()
    if (!result.success) {
      expect(result.error).toMatch(/circular|serialize/i)
    }
  })

  it('should handle undefined values in objects', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('({ a: 1, b: undefined })')
    expect(result.success).toBe(true)
    // undefined properties are typically omitted in JSON serialization
  })

  it('should handle function values gracefully', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('({ fn: function() {} })')
    expect(result.success).toBe(true)
    // Functions cannot be serialized - they're typically omitted or converted to null
  })

  it('should handle Symbol values gracefully', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('Symbol("test")')
    expect(result.success).toBe(true)
    // Symbols cannot be serialized - they're typically converted to null or undefined
  })
})
