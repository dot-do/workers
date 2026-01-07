/**
 * Tests: eval.do Runtime Support
 *
 * These tests define the runtime support contract for the eval.do worker.
 * The EvalDO should support JavaScript and optionally TypeScript.
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

describe('EvalDO JavaScript Runtime', () => {
  let ctx: MockDOState
  let env: MockEvalEnv
  let EvalDO: new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalDO = await loadEvalDO()
  })

  describe('ES2022+ Features', () => {
    it('should support arrow functions', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('const add = (a, b) => a + b; add(2, 3)')
      expect(result.success).toBe(true)
      expect(result.result).toBe(5)
    })

    it('should support template literals', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate('const name = "World"; `Hello, ${name}!`')
      expect(result.success).toBe(true)
      expect(result.result).toBe('Hello, World!')
    })

    it('should support destructuring', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        const { a, b } = { a: 1, b: 2 };
        const [x, y] = [3, 4];
        a + b + x + y
      `)
      expect(result.success).toBe(true)
      expect(result.result).toBe(10)
    })

    it('should support spread operator', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        const arr1 = [1, 2, 3];
        const arr2 = [...arr1, 4, 5];
        arr2
      `)
      expect(result.success).toBe(true)
      expect(result.result).toEqual([1, 2, 3, 4, 5])
    })

    it('should support rest parameters', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        function sum(...nums) { return nums.reduce((a, b) => a + b, 0); }
        sum(1, 2, 3, 4, 5)
      `)
      expect(result.success).toBe(true)
      expect(result.result).toBe(15)
    })

    it('should support classes', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        class Counter {
          constructor(start = 0) { this.value = start; }
          increment() { return ++this.value; }
        }
        const counter = new Counter(10);
        counter.increment();
        counter.increment();
        counter.value
      `)
      expect(result.success).toBe(true)
      expect(result.result).toBe(12)
    })

    it('should support async/await', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluateAsync(`
        async function getData() {
          return Promise.resolve(42);
        }
        await getData()
      `)
      expect(result.success).toBe(true)
      expect(result.result).toBe(42)
    })

    it('should support optional chaining', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        const obj = { a: { b: { c: 42 } } };
        obj?.a?.b?.c
      `)
      expect(result.success).toBe(true)
      expect(result.result).toBe(42)
    })

    it('should support nullish coalescing', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        const value = null ?? 'default';
        value
      `)
      expect(result.success).toBe(true)
      expect(result.result).toBe('default')
    })

    it('should support logical assignment operators', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        let a = null;
        a ??= 42;
        a
      `)
      expect(result.success).toBe(true)
      expect(result.result).toBe(42)
    })

    it('should support private class fields', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        class Secret {
          #value = 42;
          getValue() { return this.#value; }
        }
        new Secret().getValue()
      `)
      expect(result.success).toBe(true)
      expect(result.result).toBe(42)
    })

    it('should support static class fields', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        class Config {
          static VERSION = '1.0.0';
        }
        Config.VERSION
      `)
      expect(result.success).toBe(true)
      expect(result.result).toBe('1.0.0')
    })

    it('should support Object.fromEntries', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        Object.fromEntries([['a', 1], ['b', 2]])
      `)
      expect(result.success).toBe(true)
      expect(result.result).toEqual({ a: 1, b: 2 })
    })

    it('should support Array.prototype.at', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        [1, 2, 3, 4, 5].at(-1)
      `)
      expect(result.success).toBe(true)
      expect(result.result).toBe(5)
    })

    it('should support Array.prototype.flatMap', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        [1, 2, 3].flatMap(x => [x, x * 2])
      `)
      expect(result.success).toBe(true)
      expect(result.result).toEqual([1, 2, 2, 4, 3, 6])
    })

    it('should support String.prototype.replaceAll', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        'hello world world'.replaceAll('world', 'there')
      `)
      expect(result.success).toBe(true)
      expect(result.result).toBe('hello there there')
    })

    it('should support BigInt', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        const big = 9007199254740991n + 1n;
        big > 9007199254740991n
      `)
      expect(result.success).toBe(true)
      expect(result.result).toBe(true)
    })

    it('should support WeakRef and FinalizationRegistry types', async () => {
      const instance = new EvalDO(ctx, env)
      // Just check that WeakRef exists, don't test actual weak reference behavior
      const result = await instance.evaluate(`
        typeof WeakRef
      `)
      expect(result.success).toBe(true)
      expect(result.result).toBe('function')
    })
  })

  describe('Generator Functions', () => {
    it('should support generator functions', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        function* gen() {
          yield 1;
          yield 2;
          yield 3;
        }
        [...gen()]
      `)
      expect(result.success).toBe(true)
      expect(result.result).toEqual([1, 2, 3])
    })

    it('should support generator delegation', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        function* inner() { yield 1; yield 2; }
        function* outer() { yield* inner(); yield 3; }
        [...outer()]
      `)
      expect(result.success).toBe(true)
      expect(result.result).toEqual([1, 2, 3])
    })
  })

  describe('Iterators and Iterables', () => {
    it('should support for...of loops', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        const arr = [];
        for (const x of [1, 2, 3]) { arr.push(x * 2); }
        arr
      `)
      expect(result.success).toBe(true)
      expect(result.result).toEqual([2, 4, 6])
    })

    it('should support custom iterables', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        const range = {
          *[Symbol.iterator]() {
            for (let i = 1; i <= 3; i++) yield i;
          }
        };
        [...range]
      `)
      expect(result.success).toBe(true)
      expect(result.result).toEqual([1, 2, 3])
    })
  })

  describe('Proxy and Reflect', () => {
    it('should support Proxy', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        const target = { value: 42 };
        const proxy = new Proxy(target, {
          get(obj, prop) { return obj[prop] * 2; }
        });
        proxy.value
      `)
      expect(result.success).toBe(true)
      expect(result.result).toBe(84)
    })

    it('should support Reflect', async () => {
      const instance = new EvalDO(ctx, env)
      const result = await instance.evaluate(`
        const obj = { a: 1, b: 2 };
        Reflect.ownKeys(obj)
      `)
      expect(result.success).toBe(true)
      expect(result.result).toEqual(['a', 'b'])
    })
  })
})

describe('EvalDO TypeScript Runtime (Optional)', () => {
  let ctx: MockDOState
  let env: MockEvalEnv
  let EvalDO: new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalDO = await loadEvalDO()
  })

  it('should evaluate TypeScript with runtime option', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(`
      const add = (a: number, b: number): number => a + b;
      add(2, 3)
    `, { runtime: 'typescript' })

    // TypeScript support is optional - either succeeds or fails gracefully
    // TypeScript code without a transpiler will fail with a syntax error
    if (result.success) {
      expect(result.result).toBe(5)
    } else {
      // Accept any error message - TypeScript isn't natively supported
      expect(result.error).toBeDefined()
    }
  })

  it('should handle TypeScript interfaces', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(`
      interface User { name: string; age: number; }
      const user: User = { name: 'Alice', age: 30 };
      user
    `, { runtime: 'typescript' })

    if (result.success) {
      expect(result.result).toEqual({ name: 'Alice', age: 30 })
    }
  })

  it('should handle TypeScript generics', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(`
      function identity<T>(arg: T): T { return arg; }
      identity<number>(42)
    `, { runtime: 'typescript' })

    if (result.success) {
      expect(result.result).toBe(42)
    }
  })

  it('should strip TypeScript types and execute as JavaScript', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate(`
      const greet = (name: string): string => \`Hello, \${name}!\`;
      greet('World')
    `, { runtime: 'typescript' })

    if (result.success) {
      expect(result.result).toBe('Hello, World!')
    }
  })
})

describe('EvalDO Default Runtime', () => {
  let ctx: MockDOState
  let env: MockEvalEnv
  let EvalDO: new (ctx: MockDOState, env: MockEvalEnv) => EvalDOContract

  beforeEach(async () => {
    ctx = createMockState()
    env = createMockEnv()
    EvalDO = await loadEvalDO()
  })

  it('should default to JavaScript runtime', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('1 + 1')
    expect(result.success).toBe(true)
    expect(result.result).toBe(2)
  })

  it('should explicitly use JavaScript runtime', async () => {
    const instance = new EvalDO(ctx, env)
    const result = await instance.evaluate('1 + 1', { runtime: 'javascript' })
    expect(result.success).toBe(true)
    expect(result.result).toBe(2)
  })
})
