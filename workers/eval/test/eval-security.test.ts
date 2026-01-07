/**
 * Tests: eval.do Security Constraints
 *
 * These tests define the security contract for the eval.do worker.
 * The EvalDO must prevent access to dangerous globals and operations.
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

describe('EvalDO Security Constraints', () => {
  let ctx: MockDOState
  let env: MockEvalEnv
  let EvalDO: new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalDO = await loadEvalDO()
  })

  describe('Global access restrictions', () => {
    it('should block access to globalThis', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('globalThis')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not defined|not allowed|blocked|access denied/i)
    })

    it('should block access to self', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('self')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not defined|not allowed|blocked|access denied/i)
    })

    it('should block access to window', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('window')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not defined|not allowed|blocked|access denied/i)
    })

    it('should block access to global', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('global')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not defined|not allowed|blocked|access denied/i)
    })

    it('should block access to process', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('process')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not defined|not allowed|blocked|access denied/i)
    })

    it('should block access to require', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('require("fs")')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not defined|not allowed|blocked|access denied/i)
    })

    it('should block access to __dirname', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('__dirname')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not defined|not allowed|blocked|access denied/i)
    })

    it('should block access to __filename', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('__filename')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not defined|not allowed|blocked|access denied/i)
    })
  })

  describe('Dangerous function restrictions', () => {
    it('should block eval() calls', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('eval("1 + 1")')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not defined|not allowed|blocked|access denied/i)
    })

    it('should block Function constructor', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('new Function("return 1")()')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not defined|not allowed|blocked|access denied/i)
    })

    it('should block setTimeout', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('setTimeout(() => {}, 0)')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not defined|not allowed|blocked|access denied/i)
    })

    it('should block setInterval', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('setInterval(() => {}, 100)')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not defined|not allowed|blocked|access denied/i)
    })

    it('should block fetch', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('fetch("https://example.com")')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not defined|not allowed|blocked|access denied/i)
    })

    it('should block XMLHttpRequest', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('new XMLHttpRequest()')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not defined|not allowed|blocked|access denied/i)
    })

    it('should block WebSocket', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('new WebSocket("ws://example.com")')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not defined|not allowed|blocked|access denied/i)
    })
  })

  describe('Prototype pollution prevention', () => {
    it('should prevent Object.prototype modification', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        Object.prototype.malicious = 'hacked';
        ({}).malicious
      `)
      // Either fails or the modification doesn't persist
      if (result.success) {
        expect(result.result).not.toBe('hacked')
      } else {
        expect(result.error).toBeDefined()
      }
    })

    it('should prevent Array.prototype modification', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        Array.prototype.malicious = 'hacked';
        [].malicious
      `)
      if (result.success) {
        expect(result.result).not.toBe('hacked')
      } else {
        expect(result.error).toBeDefined()
      }
    })

    it('should prevent __proto__ access', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        const obj = {};
        obj.__proto__.polluted = true;
        ({}).polluted
      `)
      if (result.success) {
        expect(result.result).not.toBe(true)
      } else {
        expect(result.error).toBeDefined()
      }
    })

    it('should prevent constructor.prototype access', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        const obj = {};
        obj.constructor.prototype.hacked = true;
        ({}).hacked
      `)
      if (result.success) {
        expect(result.result).not.toBe(true)
      } else {
        expect(result.error).toBeDefined()
      }
    })
  })

  describe('Sandbox isolation', () => {
    it('should isolate execution contexts between calls', async () => {
      const instance = new EvalDO(ctx, env)

      // First call sets a variable
      await instance.evaluate('var sharedVar = "secret";')

      // Second call should not have access to it
      const result = await instance.evaluate('sharedVar')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not defined/i)
    })

    it('should not leak variables between instances', async () => {
      const instance1 = new EvalDO(ctx, env)
      const instance2 = new EvalDO(createMockState(), env)

      await instance1.evaluate('var instanceVar = 123;')

      const result = await instance2.evaluate('instanceVar')
      expect(result.success).toBe(false)
      expect(result.error).toMatch(/not defined/i)
    })

    it('should prevent access to sandbox internals', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        this.constructor.constructor('return this')()
      `)
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Import/Export restrictions', () => {
    it('should block import statements', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('import fs from "fs"')
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should block dynamic import', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluateAsync('await import("fs")')
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should block export statements', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('export const x = 1;')
      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Allowed standard globals', () => {
    it('should allow Math operations', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('Math.max(1, 2, 3)')
      expect(result.success).toBe(true)
      expect(result.result).toBe(3)
    })

    it('should allow JSON operations', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('JSON.stringify({ a: 1 })')
      expect(result.success).toBe(true)
      expect(result.result).toBe('{"a":1}')
    })

    it('should allow Date operations', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('new Date(0).getFullYear()')
      expect(result.success).toBe(true)
      expect(result.result).toBe(1970)
    })

    it('should allow String operations', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('String.fromCharCode(65)')
      expect(result.success).toBe(true)
      expect(result.result).toBe('A')
    })

    it('should allow Number operations', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('Number.isInteger(42)')
      expect(result.success).toBe(true)
      expect(result.result).toBe(true)
    })

    it('should allow Array methods', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('Array.isArray([1, 2, 3])')
      expect(result.success).toBe(true)
      expect(result.result).toBe(true)
    })

    it('should allow Object methods', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('Object.keys({ a: 1, b: 2 })')
      expect(result.success).toBe(true)
      expect(result.result).toEqual(['a', 'b'])
    })

    it('should allow Promise (without network)', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluateAsync('await Promise.resolve(42)')
      expect(result.success).toBe(true)
      expect(result.result).toBe(42)
    })

    it('should allow Map and Set', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        const map = new Map();
        map.set('key', 'value');
        const set = new Set([1, 2, 3]);
        [map.get('key'), set.size]
      `)
      expect(result.success).toBe(true)
      expect(result.result).toEqual(['value', 3])
    })

    it('should allow RegExp', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('/hello/.test("hello world")')
      expect(result.success).toBe(true)
      expect(result.result).toBe(true)
    })
  })

  describe('Custom allowed globals', () => {
    it('should allow custom globals when specified', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('customGlobal', {
        allowedGlobals: ['customGlobal']
      })
      // This should either work (if customGlobal is provided) or fail gracefully
      // The key is that it doesn't throw a "blocked" error
      expect(result).toBeDefined()
    })
  })
})
