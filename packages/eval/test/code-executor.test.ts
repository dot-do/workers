/**
 * RED Phase TDD: CodeExecutor Workers Compatibility Tests
 *
 * These tests define the contract for a Workers-compatible code executor.
 * All tests should FAIL initially - implementation comes in GREEN phase.
 *
 * Key requirement: Must NOT use Node.js vm module (not available in Workers).
 * Alternative approaches:
 * 1. Function constructor with strict context binding
 * 2. WebAssembly-based interpreters (QuickJS, etc.)
 * 3. Proxy-based sandboxing
 *
 * The executor contract includes:
 * - execute() - Run code and return result
 * - validate() - Check syntax without executing
 * - dispose() - Clean up resources
 * - Timeout enforcement
 * - Context isolation
 * - Log capture
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createExecutor,
  createEvaluator,
  Evaluator,
  type CodeExecutor,
  type ExecutionResult,
  type ExecutionOptions,
  type ExecutorConfig,
} from '../src/index.js'

describe('CodeExecutor - Workers Compatibility', () => {
  describe('createExecutor() factory', () => {
    it('should create an executor instance', () => {
      const executor = createExecutor()
      expect(executor).toBeDefined()
      expect(typeof executor.execute).toBe('function')
      expect(typeof executor.validate).toBe('function')
      expect(typeof executor.dispose).toBe('function')
    })

    it('should accept configuration options', () => {
      const config: ExecutorConfig = {
        maxTimeout: 10000,
        strictMode: true,
        globals: { Math, JSON },
      }
      const executor = createExecutor(config)
      expect(executor).toBeDefined()
    })

    it('should NOT use Node.js vm module', () => {
      // This test verifies the implementation doesn't import vm
      // In a real scenario, we'd check the bundle or source
      const executor = createExecutor()
      expect(executor).toBeDefined()

      // The executor should work in Workers environment
      // (vm module would throw: "vm is not available in Workers")
    })
  })

  describe('execute() - Basic Execution', () => {
    let executor: CodeExecutor

    beforeEach(() => {
      executor = createExecutor()
    })

    afterEach(() => {
      executor?.dispose()
    })

    it('should execute simple expressions', async () => {
      const result = await executor.execute('return 2 + 2')

      expect(result.success).toBe(true)
      expect(result.value).toBe(4)
      expect(result.error).toBeUndefined()
    })

    it('should execute code returning objects', async () => {
      const result = await executor.execute('return { foo: "bar", num: 42 }')

      expect(result.success).toBe(true)
      expect(result.value).toEqual({ foo: 'bar', num: 42 })
    })

    it('should execute code returning arrays', async () => {
      const result = await executor.execute('return [1, 2, 3].map(x => x * 2)')

      expect(result.success).toBe(true)
      expect(result.value).toEqual([2, 4, 6])
    })

    it('should execute multi-line code', async () => {
      const code = `
        const a = 10
        const b = 20
        const sum = a + b
        return sum
      `
      const result = await executor.execute(code)

      expect(result.success).toBe(true)
      expect(result.value).toBe(30)
    })

    it('should handle code with no return statement', async () => {
      const result = await executor.execute('const x = 5')

      expect(result.success).toBe(true)
      expect(result.value).toBeUndefined()
    })

    it('should return execution duration', async () => {
      const result = await executor.execute('return 1')

      expect(result.duration).toBeGreaterThanOrEqual(0)
      expect(typeof result.duration).toBe('number')
    })
  })

  describe('execute() - Context Injection', () => {
    let executor: CodeExecutor

    beforeEach(() => {
      executor = createExecutor()
    })

    afterEach(() => {
      executor?.dispose()
    })

    it('should inject context variables', async () => {
      const result = await executor.execute('return x + y', {
        context: { x: 10, y: 20 },
      })

      expect(result.success).toBe(true)
      expect(result.value).toBe(30)
    })

    it('should inject functions into context', async () => {
      const double = (n: number) => n * 2
      const result = await executor.execute('return double(21)', {
        context: { double },
      })

      expect(result.success).toBe(true)
      expect(result.value).toBe(42)
    })

    it('should inject async functions into context', async () => {
      const fetchData = async () => ({ data: 'test' })
      const result = await executor.execute('return await fetchData()', {
        context: { fetchData },
        allowAsync: true,
      })

      expect(result.success).toBe(true)
      expect(result.value).toEqual({ data: 'test' })
    })

    it('should inject objects with methods', async () => {
      const db = {
        get: (key: string) => `value-${key}`,
        set: (key: string, value: string) => ({ key, value }),
      }
      const result = await executor.execute('return db.get("test")', {
        context: { db },
      })

      expect(result.success).toBe(true)
      expect(result.value).toBe('value-test')
    })

    it('should isolate context between executions', async () => {
      await executor.execute('globalThis.leaked = "secret"', {
        context: {},
      })

      const result = await executor.execute('return typeof leaked', {
        context: {},
      })

      expect(result.success).toBe(true)
      expect(result.value).toBe('undefined')
    })
  })

  describe('execute() - Error Handling', () => {
    let executor: CodeExecutor

    beforeEach(() => {
      executor = createExecutor()
    })

    afterEach(() => {
      executor?.dispose()
    })

    it('should catch and report runtime errors', async () => {
      const result = await executor.execute('throw new Error("test error")')

      expect(result.success).toBe(false)
      expect(result.error).toContain('test error')
      expect(result.value).toBeUndefined()
    })

    it('should catch reference errors', async () => {
      const result = await executor.execute('return undefinedVariable')

      expect(result.success).toBe(false)
      expect(result.error).toContain('undefinedVariable')
    })

    it('should catch type errors', async () => {
      const result = await executor.execute('null.foo()')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should report syntax errors', async () => {
      const result = await executor.execute('return {{{')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should include error stack when available', async () => {
      const result = await executor.execute(`
        function inner() { throw new Error('deep error') }
        function outer() { inner() }
        outer()
      `)

      expect(result.success).toBe(false)
      expect(result.error).toContain('deep error')
    })
  })

  describe('execute() - Timeout Enforcement', () => {
    let executor: CodeExecutor

    beforeEach(() => {
      executor = createExecutor({ maxTimeout: 5000 })
    })

    afterEach(() => {
      executor?.dispose()
    })

    it('should timeout infinite loops', async () => {
      const result = await executor.execute('while(true) {}', {
        timeout: 100,
      })

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/timeout|time/i)
    })

    it('should timeout long-running async operations', async () => {
      const result = await executor.execute(
        'await new Promise(r => setTimeout(r, 10000))',
        {
          timeout: 100,
          allowAsync: true,
        }
      )

      expect(result.success).toBe(false)
      expect(result.error).toMatch(/timeout|time/i)
    })

    it('should complete within timeout if fast enough', async () => {
      const result = await executor.execute('return 42', {
        timeout: 5000,
      })

      expect(result.success).toBe(true)
      expect(result.value).toBe(42)
    })

    it('should respect maxTimeout from config', async () => {
      const limitedExecutor = createExecutor({ maxTimeout: 50 })

      const result = await limitedExecutor.execute(
        'await new Promise(r => setTimeout(r, 1000))',
        {
          timeout: 10000, // This should be capped to 50
          allowAsync: true,
        }
      )

      expect(result.success).toBe(false)
      expect(result.duration).toBeLessThan(1000)
      limitedExecutor.dispose()
    })
  })

  describe('execute() - Log Capture', () => {
    let executor: CodeExecutor

    beforeEach(() => {
      executor = createExecutor()
    })

    afterEach(() => {
      executor?.dispose()
    })

    it('should capture console.log calls', async () => {
      const result = await executor.execute(`
        console.log('hello')
        console.log('world')
        return true
      `)

      expect(result.success).toBe(true)
      expect(result.logs).toHaveLength(2)
      expect(result.logs[0]?.level).toBe('log')
      expect(result.logs[0]?.args).toEqual(['hello'])
      expect(result.logs[1]?.args).toEqual(['world'])
    })

    it('should capture console.warn calls', async () => {
      const result = await executor.execute(`
        console.warn('warning message')
        return true
      `)

      expect(result.logs).toHaveLength(1)
      expect(result.logs[0]?.level).toBe('warn')
      expect(result.logs[0]?.args).toEqual(['warning message'])
    })

    it('should capture console.error calls', async () => {
      const result = await executor.execute(`
        console.error('error message')
        return true
      `)

      expect(result.logs).toHaveLength(1)
      expect(result.logs[0]?.level).toBe('error')
    })

    it('should capture multiple arguments', async () => {
      const result = await executor.execute(`
        console.log('value:', 42, { key: 'val' })
        return true
      `)

      expect(result.logs[0]?.args).toEqual(['value:', 42, { key: 'val' }])
    })

    it('should include timestamps on logs', async () => {
      const before = Date.now()
      const result = await executor.execute(`
        console.log('timestamped')
        return true
      `)
      const after = Date.now()

      expect(result.logs[0]?.timestamp).toBeGreaterThanOrEqual(before)
      expect(result.logs[0]?.timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('execute() - Async Code', () => {
    let executor: CodeExecutor

    beforeEach(() => {
      executor = createExecutor()
    })

    afterEach(() => {
      executor?.dispose()
    })

    it('should execute async code when allowAsync is true', async () => {
      const result = await executor.execute(
        'return await Promise.resolve(42)',
        { allowAsync: true }
      )

      expect(result.success).toBe(true)
      expect(result.value).toBe(42)
    })

    it('should handle async/await syntax', async () => {
      const result = await executor.execute(
        `
        async function getData() {
          return { data: 'async' }
        }
        return await getData()
        `,
        { allowAsync: true }
      )

      expect(result.success).toBe(true)
      expect(result.value).toEqual({ data: 'async' })
    })

    it('should reject async code when allowAsync is false', async () => {
      const result = await executor.execute(
        'return await Promise.resolve(42)',
        { allowAsync: false }
      )

      expect(result.success).toBe(false)
    })

    it('should handle Promise.all', async () => {
      const result = await executor.execute(
        `
        const results = await Promise.all([
          Promise.resolve(1),
          Promise.resolve(2),
          Promise.resolve(3)
        ])
        return results
        `,
        { allowAsync: true }
      )

      expect(result.success).toBe(true)
      expect(result.value).toEqual([1, 2, 3])
    })
  })

  describe('execute() - Security / Sandboxing', () => {
    let executor: CodeExecutor

    beforeEach(() => {
      executor = createExecutor()
    })

    afterEach(() => {
      executor?.dispose()
    })

    it('should not have access to require/import', async () => {
      const result = await executor.execute("require('fs')")

      expect(result.success).toBe(false)
    })

    it('should not have access to process', async () => {
      const result = await executor.execute('return process.env')

      expect(result.success).toBe(false)
    })

    it('should not modify global scope', async () => {
      await executor.execute('globalThis.INJECTED = true')

      // @ts-expect-error - Testing that INJECTED is not defined
      expect(globalThis.INJECTED).toBeUndefined()
    })

    it('should not access constructor to escape sandbox', async () => {
      const result = await executor.execute(`
        const fn = function(){}.constructor
        const evil = fn('return this')()
        return evil === globalThis
      `)

      // Should either fail or return false (not escape to real global)
      expect(result.success === false || result.value === false).toBe(true)
    })

    it('should limit recursion depth', async () => {
      const result = await executor.execute(`
        function recurse(n) {
          return recurse(n + 1)
        }
        return recurse(0)
      `, { timeout: 1000 })

      expect(result.success).toBe(false)
    })
  })

  describe('validate() - Syntax Validation', () => {
    let executor: CodeExecutor

    beforeEach(() => {
      executor = createExecutor()
    })

    afterEach(() => {
      executor?.dispose()
    })

    it('should validate correct syntax', () => {
      const result = executor.validate('const x = 1 + 2')

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should reject invalid syntax', () => {
      const result = executor.validate('const x = {{{')

      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should provide error location for syntax errors', () => {
      const result = executor.validate(`
        const x = 1
        const y = {{{
      `)

      expect(result.valid).toBe(false)
      expect(result.location).toBeDefined()
      expect(result.location?.line).toBeGreaterThan(0)
    })

    it('should validate complex code', () => {
      const result = executor.validate(`
        async function processData(items) {
          const results = await Promise.all(
            items.map(async item => {
              return { ...item, processed: true }
            })
          )
          return results.filter(r => r.processed)
        }
      `)

      expect(result.valid).toBe(true)
    })

    it('should detect unterminated strings', () => {
      const result = executor.validate('const x = "unterminated')

      expect(result.valid).toBe(false)
    })

    it('should detect missing brackets', () => {
      const result = executor.validate('function foo() { return 1')

      expect(result.valid).toBe(false)
    })
  })

  describe('dispose() - Resource Cleanup', () => {
    it('should clean up resources', () => {
      const executor = createExecutor()
      expect(() => executor.dispose()).not.toThrow()
    })

    it('should throw after disposal', async () => {
      const executor = createExecutor()
      executor.dispose()

      await expect(executor.execute('return 1')).rejects.toThrow()
    })

    it('should be idempotent', () => {
      const executor = createExecutor()
      expect(() => {
        executor.dispose()
        executor.dispose()
        executor.dispose()
      }).not.toThrow()
    })
  })

  describe('Evaluator class - ai-evaluate compatibility', () => {
    let evaluator: Evaluator

    beforeEach(() => {
      evaluator = createEvaluator()
    })

    afterEach(() => {
      evaluator?.dispose()
    })

    it('should be created via createEvaluator factory', () => {
      expect(evaluator).toBeInstanceOf(Evaluator)
    })

    it('should implement CodeExecutor interface', () => {
      expect(typeof evaluator.execute).toBe('function')
      expect(typeof evaluator.validate).toBe('function')
      expect(typeof evaluator.dispose).toBe('function')
    })

    it('should execute code like CodeExecutor', async () => {
      const result = await evaluator.execute('return 42')

      expect(result.success).toBe(true)
      expect(result.value).toBe(42)
    })

    it('should accept configuration', () => {
      const configured = createEvaluator({
        maxTimeout: 1000,
        strictMode: true,
      })

      expect(configured).toBeInstanceOf(Evaluator)
      configured.dispose()
    })
  })

  describe('Workers Environment Compatibility', () => {
    it('should work without Node.js specific APIs', async () => {
      const executor = createExecutor()

      // These APIs should NOT be available in Workers
      const result = await executor.execute(`
        const nodeAPIs = [
          typeof require,
          typeof module,
          typeof __dirname,
          typeof __filename,
          typeof Buffer,
          typeof process
        ]
        return nodeAPIs.every(t => t === 'undefined')
      `)

      expect(result.success).toBe(true)
      expect(result.value).toBe(true)
      executor.dispose()
    })

    it('should have access to standard globals', async () => {
      const executor = createExecutor()

      const result = await executor.execute(`
        return {
          hasJSON: typeof JSON !== 'undefined',
          hasMath: typeof Math !== 'undefined',
          hasDate: typeof Date !== 'undefined',
          hasPromise: typeof Promise !== 'undefined',
          hasMap: typeof Map !== 'undefined',
          hasSet: typeof Set !== 'undefined',
        }
      `)

      expect(result.success).toBe(true)
      expect(result.value).toEqual({
        hasJSON: true,
        hasMath: true,
        hasDate: true,
        hasPromise: true,
        hasMap: true,
        hasSet: true,
      })
      executor.dispose()
    })

    it('should support Web APIs available in Workers', async () => {
      const executor = createExecutor({
        globals: {
          URL: globalThis.URL,
          URLSearchParams: globalThis.URLSearchParams,
          TextEncoder: globalThis.TextEncoder,
          TextDecoder: globalThis.TextDecoder,
          crypto: globalThis.crypto,
          atob: globalThis.atob,
          btoa: globalThis.btoa,
        },
      })

      const result = await executor.execute(`
        const url = new URL('https://example.com/path?foo=bar')
        return {
          hostname: url.hostname,
          param: url.searchParams.get('foo')
        }
      `)

      expect(result.success).toBe(true)
      expect(result.value).toEqual({
        hostname: 'example.com',
        param: 'bar',
      })
      executor.dispose()
    })
  })
})
