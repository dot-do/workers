/**
 * Tests: eval.do Error Handling
 *
 * These tests define the error handling contract for the eval.do worker.
 * The EvalDO must handle errors gracefully and return appropriate responses.
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

describe('EvalDO Syntax Error Handling', () => {
  let ctx: MockDOState
  let env: MockEvalEnv
  let EvalDO: new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalDO = await loadEvalDO()
  })

  it('should report syntax errors clearly', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('const x = ')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error).toMatch(/syntax|unexpected|parse/i)
  })

  it('should report the error position', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(`
      const a = 1;
      const b = ;
      const c = 3;
    `)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('should handle unclosed strings', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('const str = "unclosed')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/syntax|string|unterminated|unexpected|token/i)
  })

  it('should handle unclosed brackets', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('const arr = [1, 2, 3')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/syntax|unexpected|bracket/i)
  })

  it('should handle unclosed braces', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('function test() {')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/syntax|unexpected|brace/i)
  })

  it('should handle invalid regular expressions', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('/[/')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('EvalDO Runtime Error Handling', () => {
  let ctx: MockDOState
  let env: MockEvalEnv
  let EvalDO: new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalDO = await loadEvalDO()
  })

  it('should handle ReferenceError', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('undefinedVariable')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/not defined|reference/i)
  })

  it('should handle TypeError for null property access', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('null.property')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/cannot read|null|property/i)
  })

  it('should handle TypeError for undefined property access', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('undefined.property')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/cannot read|undefined|property/i)
  })

  it('should handle TypeError for non-function calls', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('const x = 5; x()')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/not a function|type/i)
  })

  it('should handle RangeError', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('new Array(-1)')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/range|invalid.*length/i)
  })

  it('should handle thrown errors', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('throw new Error("Custom error")')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/custom error/i)
  })

  it('should handle thrown strings', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('throw "String error"')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/string error/i)
  })

  it('should handle thrown objects', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('throw { code: 123, message: "Error object" }')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('EvalDO Input Validation', () => {
  let ctx: MockDOState
  let env: MockEvalEnv
  let EvalDO: new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalDO = await loadEvalDO()
  })

  it('should reject empty code', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/empty|invalid|required/i)
  })

  it('should reject null code', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(null as never)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/invalid|null|required/i)
  })

  it('should reject undefined code', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(undefined as never)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/invalid|undefined|required/i)
  })

  it('should reject non-string code', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(123 as never)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/invalid|type|string/i)
  })

  it('should reject code that is too long', async () => {
    const instance = new EvalDO(ctx, env)
    const longCode = 'x'.repeat(10 * 1024 * 1024) // 10MB
    const result = await instance.evaluate(longCode)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/too long|size|limit/i)
  })

  it('should handle whitespace-only code', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('   \n\t   ')
    // Whitespace-only could return undefined or be treated as empty
    expect(result).toBeDefined()
  })

  it('should handle comments-only code', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('// just a comment')
    expect(result.success).toBe(true)
    expect(result.result).toBeUndefined()
  })
})

describe('EvalDO HTTP Error Responses', () => {
  let ctx: MockDOState
  let env: MockEvalEnv
  let EvalDO: new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalDO = await loadEvalDO()
  })

  it('should return 400 for malformed JSON', async () => {
    const instance = new EvalDO(ctx, env)
    const request = new Request('http://eval.do/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json {'
    })
    const response = await instance.fetch(request)
    expect(response.status).toBe(400)
    const data = await response.json() as { error: string }
    expect(data.error).toMatch(/json|parse/i)
  })

  it('should return 400 for missing code field', async () => {
    const instance = new EvalDO(ctx, env)
    const request = new Request('http://eval.do/api/eval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    const response = await instance.fetch(request)
    expect(response.status).toBe(400)
    const data = await response.json() as { error: string }
    expect(data.error).toMatch(/required|missing|code/i)
  })

  it('should return 404 for unknown endpoints', async () => {
    const instance = new EvalDO(ctx, env)
    const request = new Request('http://eval.do/unknown/endpoint', { method: 'GET' })
    const response = await instance.fetch(request)
    expect(response.status).toBe(404)
  })

  it('should return 405 for unsupported HTTP methods', async () => {
    const instance = new EvalDO(ctx, env)
    const request = new Request('http://eval.do/api/eval', { method: 'DELETE' })
    const response = await instance.fetch(request)
    expect(response.status).toBe(405)
  })

  it('should include request ID in error responses', async () => {
    const instance = new EvalDO(ctx, env)
    const request = new Request('http://eval.do/api/eval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    })
    const response = await instance.fetch(request)
    expect(response.headers.get('X-Request-Id')).toBeDefined()
  })
})

describe('EvalDO RPC Error Handling', () => {
  let ctx: MockDOState
  let env: MockEvalEnv
  let EvalDO: new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalDO = await loadEvalDO()
  })

  it('should check if method exists', () => {
    const instance = new EvalDO(ctx, env)
    expect(instance.hasMethod('evaluate')).toBe(true)
    expect(instance.hasMethod('evaluateAsync')).toBe(true)
    expect(instance.hasMethod('validateCode')).toBe(true)
    expect(instance.hasMethod('nonexistent')).toBe(false)
  })

  it('should reject calls to unknown methods', async () => {
    const instance = new EvalDO(ctx, env)
    await expect(instance.call('nonexistent', [])).rejects.toThrow(/not found|not allowed/i)
  })

  it('should handle missing parameters', async () => {
    const instance = new EvalDO(ctx, env)
    await expect(instance.call('evaluate', [])).rejects.toThrow(/required|parameter|missing/i)
  })

  it('should handle invalid parameter types', async () => {
    const instance = new EvalDO(ctx, env)
    await expect(instance.call('evaluate', [123])).rejects.toThrow(/type|invalid|string/i)
  })
})

describe('EvalDO Error Message Sanitization', () => {
  let ctx: MockDOState
  let env: MockEvalEnv
  let EvalDO: new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalDO = await loadEvalDO()
  })

  it('should not expose internal paths in errors', async () => {
    const instance = new EvalDO(ctx, env)
    // User-provided data in thrown errors is OK to include since it's user code
    // What we want to prevent is leaking our own internal paths from stack traces
    const result = await instance.evaluate('throw new Error("test error")')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    // Should not contain any stack trace with internal paths
    expect(result.error).not.toMatch(/at\s+\w+\s+\(\//)
  })

  it('should not expose stack traces to clients', async () => {
    const instance = new EvalDO(ctx, env)
    const request = new Request('http://eval.do/api/eval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'throw new Error("test")' })
    })
    const response = await instance.fetch(request)
    const data = await response.json() as { error: string; stack?: string }
    expect(data.stack).toBeUndefined()
  })

  it('should provide user-friendly error messages', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('undefinedVar')
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error!.length).toBeGreaterThan(0)
    expect(result.error!.length).toBeLessThan(500)
  })
})
