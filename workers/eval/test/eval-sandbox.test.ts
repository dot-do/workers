/**
 * Tests: eval.do Sandbox Code Evaluation
 *
 * These tests define the contract for the eval.do worker's secure sandbox execution.
 * The EvalDO must evaluate code safely in an isolated environment.
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

describe('EvalDO Sandbox Execution', () => {
  let ctx: MockDOState
  let env: MockEvalEnv
  let EvalDO: new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalDO = await loadEvalDO()
  })

  describe('Basic code evaluation', () => {
    it('should evaluate simple expressions', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('1 + 1')
      expect(result.success).toBe(true)
      expect(result.result).toBe(2)
    })

    it('should evaluate string operations', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('"hello".toUpperCase()')
      expect(result.success).toBe(true)
      expect(result.result).toBe('HELLO')
    })

    it('should evaluate array operations', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('[1, 2, 3].map(x => x * 2)')
      expect(result.success).toBe(true)
      expect(result.result).toEqual([2, 4, 6])
    })

    it('should evaluate object literals', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('({ name: "test", value: 42 })')
      expect(result.success).toBe(true)
      expect(result.result).toEqual({ name: 'test', value: 42 })
    })

    it('should evaluate function definitions and calls', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        function add(a, b) { return a + b; }
        add(3, 4)
      `)
      expect(result.success).toBe(true)
      expect(result.result).toBe(7)
    })

    it('should evaluate arrow functions', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        const multiply = (a, b) => a * b;
        multiply(5, 6)
      `)
      expect(result.success).toBe(true)
      expect(result.result).toBe(30)
    })

    it('should handle multi-line code blocks', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        let sum = 0;
        for (let i = 1; i <= 5; i++) {
          sum += i;
        }
        sum
      `)
      expect(result.success).toBe(true)
      expect(result.result).toBe(15)
    })
  })

  describe('Async code evaluation', () => {
    it('should evaluate async/await code', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluateAsync(`
        async function fetchData() {
          return Promise.resolve(42);
        }
        await fetchData()
      `)
      expect(result.success).toBe(true)
      expect(result.result).toBe(42)
    })

    it('should handle Promise.all', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluateAsync(`
        await Promise.all([
          Promise.resolve(1),
          Promise.resolve(2),
          Promise.resolve(3)
        ])
      `)
      expect(result.success).toBe(true)
      expect(result.result).toEqual([1, 2, 3])
    })

    it('should handle Promise rejections', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluateAsync(`
        await Promise.reject(new Error('Async error'))
      `)
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/async error/i)
    })
  })

  describe('Return value handling', () => {
    it('should return undefined for statements without return value', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('let x = 5;')
      expect(result.success).toBe(true)
      expect(result.result).toBeUndefined()
    })

    it('should return the last expression value', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('let x = 5; x * 2')
      expect(result.success).toBe(true)
      expect(result.result).toBe(10)
    })

    it('should handle null return values', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('null')
      expect(result.success).toBe(true)
      expect(result.result).toBeNull()
    })

    it('should handle boolean return values', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('true && false')
      expect(result.success).toBe(true)
      expect(result.result).toBe(false)
    })
  })

  describe('Console capture', () => {
    it('should capture console.log output', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        console.log('Hello, World!');
        42
      `)
      expect(result.success).toBe(true)
      expect(result.logs).toContain('Hello, World!')
      expect(result.result).toBe(42)
    })

    it('should capture multiple console outputs', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        console.log('First');
        console.log('Second');
        console.log('Third');
        'done'
      `)
      expect(result.success).toBe(true)
      expect(result.logs).toHaveLength(3)
      expect(result.logs).toEqual(['First', 'Second', 'Third'])
    })

    it('should capture console.warn and console.error', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        console.warn('Warning message');
        console.error('Error message');
        'done'
      `)
      expect(result.success).toBe(true)
      expect(result.logs).toBeDefined()
      expect(result.logs!.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Execution metrics', () => {
    it('should report execution duration', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('1 + 1')
      expect(result.success).toBe(true)
      expect(result.duration).toBeDefined()
      expect(typeof result.duration).toBe('number')
      expect(result.duration).toBeGreaterThanOrEqual(0)
    })

    it('should report memory usage', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        const arr = new Array(1000).fill('data');
        arr.length
      `)
      expect(result.success).toBe(true)
      expect(result.memoryUsed).toBeDefined()
      expect(typeof result.memoryUsed).toBe('number')
    })
  })
})

describe('EvalDO Code Validation', () => {
  let ctx: MockDOState
  let env: MockEvalEnv
  let EvalDO: new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalDO = await loadEvalDO()
  })

  it('should validate correct JavaScript code', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.validateCode('const x = 1 + 1;')
    expect(result.valid).toBe(true)
    expect(result.errors).toBeUndefined()
  })

  it('should detect syntax errors', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.validateCode('const x = ')
    expect(result.valid).toBe(false)
    expect(result.errors).toBeDefined()
    expect(result.errors!.length).toBeGreaterThan(0)
  })

  it('should detect unmatched brackets', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.validateCode('function test() {')
    expect(result.valid).toBe(false)
    expect(result.errors).toBeDefined()
  })

  it('should detect invalid keywords', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.validateCode('const class = 5;')
    expect(result.valid).toBe(false)
    expect(result.errors).toBeDefined()
  })

  it('should detect multiple syntax errors', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.validateCode(`
      const x = ;
      function { }
      let 123invalid = 5;
    `)
    expect(result.valid).toBe(false)
    expect(result.errors!.length).toBeGreaterThan(0)
  })
})
