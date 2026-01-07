/**
 * Tests: eval.do Resource Limits
 *
 * These tests define the resource limit contract for the eval.do worker.
 * The EvalDO must enforce timeout and memory limits.
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
  fetch(request: Request): Promise<Response>
}

/**
 * Load EvalDO
 */
async function loadEvalDO(): Promise<new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract> {
  const module = await import('../src/eval.js')
  return module.EvalDO
}

describe('EvalDO Timeout Handling', () => {
  let ctx: MockDOState
  let env: MockEvalEnv
  let EvalDO: new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalDO = await loadEvalDO()
  })

  it('should timeout infinite loops', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('while(true) {}', { timeout: 100 })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/timeout|time limit|execution.*exceeded/i)
  }, 5000)

  it('should timeout long-running computations', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(`
      let n = 0;
      for (let i = 0; i < 1e12; i++) { n += i; }
      n
    `, { timeout: 100 })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/timeout|time limit|execution.*exceeded/i)
  }, 5000)

  it('should respect custom timeout values', async () => {
    const instance = new EvalDO(ctx, env)

    // Short timeout should fail
    const shortResult = await instance.evaluate(`
      let sum = 0;
      for (let i = 0; i < 1e8; i++) { sum += i; }
      sum
    `, { timeout: 10 })
    expect(shortResult.success).toBe(false)

    // Longer timeout should succeed for quick operations
    const longResult = await instance.evaluate('1 + 1', { timeout: 5000 })
    expect(longResult.success).toBe(true)
  }, 10000)

  it('should timeout async operations that take too long', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluateAsync(`
      await new Promise(resolve => {
        // This creates a promise that never resolves in time
        let i = 0;
        while (i < 1e12) i++;
        resolve(i);
      })
    `, { timeout: 100 })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/timeout|time limit|execution.*exceeded/i)
  }, 5000)

  it('should use default timeout when not specified', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('while(true) {}')
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/timeout|time limit|execution.*exceeded/i)
  }, 15000)
})

describe('EvalDO Memory Limits', () => {
  let ctx: MockDOState
  let env: MockEvalEnv
  let EvalDO: new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalDO = await loadEvalDO()
  })

  it('should limit memory allocation', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(`
      const arr = [];
      for (let i = 0; i < 1e9; i++) {
        arr.push(new Array(1e6).fill('x'));
      }
      arr.length
    `, { memoryLimit: 10 * 1024 * 1024 }) // 10MB limit
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/memory|heap|allocation|limit|exceeded/i)
  }, 10000)

  it('should respect memory limit options', async () => {
    const instance = new EvalDO(ctx, env)
    // Small allocation should succeed
    const smallResult = await instance.evaluate(`
      const arr = new Array(100).fill('x');
      arr.length
    `, { memoryLimit: 100 * 1024 * 1024 }) // 100MB limit
    expect(smallResult.success).toBe(true)
    expect(smallResult.result).toBe(100)
  })

  it('should report memory usage in result', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(`
      const arr = new Array(10000).fill('test string data');
      arr.length
    `)
    expect(result.success).toBe(true)
    expect(result.memoryUsed).toBeDefined()
    expect(result.memoryUsed).toBeGreaterThan(0)
  })

  it('should prevent string bombing', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(`
      let str = 'x';
      for (let i = 0; i < 30; i++) {
        str = str + str;
      }
      str.length
    `, { memoryLimit: 10 * 1024 * 1024 })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/memory|limit|exceeded/i)
  }, 10000)
})

describe('EvalDO Recursion Limits', () => {
  let ctx: MockDOState
  let env: MockEvalEnv
  let EvalDO: new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalDO = await loadEvalDO()
  })

  it('should handle stack overflow from infinite recursion', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(`
      function recurse() { return recurse(); }
      recurse()
    `)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/stack|recursion|overflow|exceeded/i)
  })

  it('should allow reasonable recursion depth', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(`
      function factorial(n) {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
      }
      factorial(10)
    `)
    expect(result.success).toBe(true)
    expect(result.result).toBe(3628800)
  })

  it('should handle mutual recursion overflow', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(`
      function a() { return b(); }
      function b() { return a(); }
      a()
    `)
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/stack|recursion|overflow|exceeded/i)
  })
})

describe('EvalDO CPU Limits', () => {
  let ctx: MockDOState
  let env: MockEvalEnv
  let EvalDO: new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalDO = await loadEvalDO()
  })

  it('should limit CPU-intensive regular expressions', async () => {
    const instance = new EvalDO(ctx, env)
    // ReDoS attack pattern
    const result = await instance.evaluate(`
      const regex = /^(a+)+$/;
      regex.test('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!')
    `, { timeout: 100 })
    // Should either complete quickly (safe regex engine) or timeout
    if (!result.success) {
      expect(result.error).toMatch(/timeout|time limit|execution.*exceeded/i)
    }
  }, 5000)

  it('should limit iterations in reduce operations', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(`
      const arr = new Array(1e9);
      arr.reduce((a, b) => a + 1, 0)
    `, { timeout: 100 })
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/timeout|time limit|memory|execution.*exceeded/i)
  }, 5000)
})

describe('EvalDO Output Limits', () => {
  let ctx: MockDOState
  let env: MockEvalEnv
  let EvalDO: new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalDO = await loadEvalDO()
  })

  it('should limit console output size', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(`
      for (let i = 0; i < 10000; i++) {
        console.log('x'.repeat(1000));
      }
      'done'
    `)
    expect(result.success).toBe(true)
    // Logs should be truncated or limited
    if (result.logs) {
      const totalLogSize = result.logs.join('').length
      expect(totalLogSize).toBeLessThan(1024 * 1024) // Less than 1MB
    }
  })

  it('should limit return value size', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(`
      'x'.repeat(10 * 1024 * 1024)
    `)
    // Either the string is truncated or an error is returned
    if (result.success) {
      const strResult = result.result as string
      expect(strResult.length).toBeLessThan(10 * 1024 * 1024)
    } else {
      expect(result.error).toMatch(/size|limit|too large/i)
    }
  })
})
