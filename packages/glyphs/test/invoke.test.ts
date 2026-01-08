/**
 * Tests for 入 (invoke/fn) glyph - Function Invocation
 *
 * This is a RED phase TDD test file. These tests define the API contract
 * for the function invocation glyph before implementation exists.
 *
 * The 入 glyph represents "enter" - a visual metaphor for entering/invoking
 * a function. It looks like an arrow entering something.
 *
 * Covers:
 * - Tagged template invocation: 入`functionName ${args}`
 * - Chaining with .then(): 入`fn1`.then(入`fn2`)
 * - Direct invocation: 入.invoke('name', ...args)
 * - Function registration: 入.register('name', fn)
 * - Pipeline composition: 入.pipe(fn1, fn2, fn3)
 * - Error handling and retries
 * - ASCII alias: fn
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
// These imports will fail until implementation exists - this is expected for RED phase
import { 入, fn } from '../src/invoke.js'

describe('入 (invoke/fn) glyph - Function Invocation', () => {
  beforeEach(() => {
    // Reset registered functions between tests
    入.clear?.()
  })

  describe('Tagged Template Invocation', () => {
    it('should invoke function via tagged template with single argument', async () => {
      const mockFn = vi.fn().mockResolvedValue(42)
      入.register('calculate', mockFn)

      const result = await 入`calculate ${10}`

      expect(mockFn).toHaveBeenCalledWith(10)
      expect(result).toBe(42)
    })

    it('should invoke function via tagged template with multiple arguments', async () => {
      const mockFn = vi.fn().mockResolvedValue('result')
      入.register('process', mockFn)

      const arg1 = 'hello'
      const arg2 = { key: 'value' }
      const arg3 = [1, 2, 3]
      const result = await 入`process ${arg1} ${arg2} ${arg3}`

      expect(mockFn).toHaveBeenCalledWith(arg1, arg2, arg3)
      expect(result).toBe('result')
    })

    it('should invoke function with no arguments when no interpolations', async () => {
      const mockFn = vi.fn().mockResolvedValue('no args')
      入.register('noArgs', mockFn)

      const result = await 入`noArgs`

      expect(mockFn).toHaveBeenCalledWith()
      expect(result).toBe('no args')
    })

    it('should handle function name with dots (namespaced)', async () => {
      const mockFn = vi.fn().mockResolvedValue('namespaced result')
      入.register('math.fibonacci', mockFn)

      const result = await 入`math.fibonacci ${42}`

      expect(mockFn).toHaveBeenCalledWith(42)
      expect(result).toBe('namespaced result')
    })

    it('should handle function name with colons (action syntax)', async () => {
      const mockFn = vi.fn().mockResolvedValue('action result')
      入.register('user:create', mockFn)

      const result = await 入`user:create ${{ name: 'Alice' }}`

      expect(mockFn).toHaveBeenCalledWith({ name: 'Alice' })
      expect(result).toBe('action result')
    })

    it('should preserve argument types through invocation', async () => {
      const mockFn = vi.fn((...args) => args)
      入.register('identity', mockFn)

      const date = new Date()
      const regex = /test/
      const symbol = Symbol('test')

      await 入`identity ${date} ${regex} ${symbol}`

      expect(mockFn).toHaveBeenCalledWith(date, regex, symbol)
    })

    it('should handle null and undefined arguments', async () => {
      const mockFn = vi.fn((...args) => args)
      入.register('nullish', mockFn)

      await 入`nullish ${null} ${undefined}`

      expect(mockFn).toHaveBeenCalledWith(null, undefined)
    })

    it('should return promise that resolves with function result', async () => {
      const mockFn = vi.fn().mockResolvedValue({ data: 'async result' })
      入.register('asyncFn', mockFn)

      const promise = 入`asyncFn ${1}`

      expect(promise).toBeInstanceOf(Promise)
      await expect(promise).resolves.toEqual({ data: 'async result' })
    })

    it('should handle synchronous functions', async () => {
      const syncFn = vi.fn((x: number) => x * 2)
      入.register('double', syncFn)

      const result = await 入`double ${21}`

      expect(result).toBe(42)
    })
  })

  describe('Chaining with .then()', () => {
    it('should chain invocations with .then()', async () => {
      const fetchFn = vi.fn().mockResolvedValue({ raw: 'data' })
      const transformFn = vi.fn().mockResolvedValue({ transformed: true })
      const validateFn = vi.fn().mockResolvedValue({ valid: true })

      入.register('fetch', fetchFn)
      入.register('transform', transformFn)
      入.register('validate', validateFn)

      const result = await 入`fetch`
        .then(入`transform`)
        .then(入`validate`)

      expect(fetchFn).toHaveBeenCalled()
      expect(transformFn).toHaveBeenCalledWith({ raw: 'data' })
      expect(validateFn).toHaveBeenCalledWith({ transformed: true })
      expect(result).toEqual({ valid: true })
    })

    it('should pass result of previous function as argument to next', async () => {
      const step1 = vi.fn().mockResolvedValue(10)
      const step2 = vi.fn((x) => x * 2)
      const step3 = vi.fn((x) => x + 5)

      入.register('step1', step1)
      入.register('step2', step2)
      入.register('step3', step3)

      const result = await 入`step1`
        .then(入`step2`)
        .then(入`step3`)

      expect(result).toBe(25) // 10 * 2 + 5
    })

    it('should support chaining with native Promise.then()', async () => {
      const mockFn = vi.fn().mockResolvedValue(42)
      入.register('getValue', mockFn)

      const result = await 入`getValue`
        .then((value) => value * 2)

      expect(result).toBe(84)
    })

    it('should support .catch() for error handling in chain', async () => {
      const failingFn = vi.fn().mockRejectedValue(new Error('Chain error'))
      入.register('fail', failingFn)

      const result = await 入`fail`
        .catch((error) => error.message)

      expect(result).toBe('Chain error')
    })

    it('should support .finally() in chain', async () => {
      const mockFn = vi.fn().mockResolvedValue('done')
      const finallyFn = vi.fn()
      入.register('withFinally', mockFn)

      await 入`withFinally`
        .finally(finallyFn)

      expect(finallyFn).toHaveBeenCalled()
    })
  })

  describe('Direct Invocation with .invoke()', () => {
    it('should invoke function by name with arguments', async () => {
      const mockFn = vi.fn().mockResolvedValue('invoked')
      入.register('myFunc', mockFn)

      const result = await 入.invoke('myFunc', 'arg1', 'arg2')

      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
      expect(result).toBe('invoked')
    })

    it('should invoke with no arguments', async () => {
      const mockFn = vi.fn().mockResolvedValue('no args')
      入.register('noArgsFunc', mockFn)

      const result = await 入.invoke('noArgsFunc')

      expect(mockFn).toHaveBeenCalledWith()
      expect(result).toBe('no args')
    })

    it('should throw if function is not registered', async () => {
      await expect(入.invoke('nonexistent'))
        .rejects.toThrow(/not found|not registered|unknown/i)
    })

    it('should support options object as last parameter', async () => {
      const mockFn = vi.fn().mockResolvedValue('with options')
      入.register('withOptions', mockFn)

      const result = await 入.invoke('withOptions', 'arg', {
        timeout: 5000,
        retries: 3,
      })

      expect(result).toBe('with options')
    })
  })

  describe('Function Registration with .register()', () => {
    it('should register a function by name', () => {
      const myFn = vi.fn()

      入.register('myFunction', myFn)

      expect(入.has('myFunction')).toBe(true)
    })

    it('should register multiple functions at once', () => {
      const fn1 = vi.fn()
      const fn2 = vi.fn()
      const fn3 = vi.fn()

      入.register({
        func1: fn1,
        func2: fn2,
        func3: fn3,
      })

      expect(入.has('func1')).toBe(true)
      expect(入.has('func2')).toBe(true)
      expect(入.has('func3')).toBe(true)
    })

    it('should override existing function with same name', async () => {
      const original = vi.fn().mockResolvedValue('original')
      const replacement = vi.fn().mockResolvedValue('replacement')

      入.register('overridable', original)
      入.register('overridable', replacement)

      const result = await 入`overridable`

      expect(result).toBe('replacement')
      expect(original).not.toHaveBeenCalled()
    })

    it('should return unregister function', () => {
      const myFn = vi.fn()

      const unregister = 入.register('removable', myFn)

      expect(入.has('removable')).toBe(true)

      unregister()

      expect(入.has('removable')).toBe(false)
    })

    it('should support namespaced registration', () => {
      const mathAdd = vi.fn((a, b) => a + b)
      const mathSubtract = vi.fn((a, b) => a - b)

      入.register('math.add', mathAdd)
      入.register('math.subtract', mathSubtract)

      expect(入.has('math.add')).toBe(true)
      expect(入.has('math.subtract')).toBe(true)
    })
  })

  describe('Pipeline Composition with .pipe()', () => {
    it('should compose multiple functions into a pipeline', async () => {
      const double = (x: number) => x * 2
      const addTen = (x: number) => x + 10
      const toString = (x: number) => `Result: ${x}`

      const pipeline = 入.pipe(double, addTen, toString)
      const result = await pipeline(5)

      expect(result).toBe('Result: 20') // (5 * 2) + 10 = 20
    })

    it('should handle async functions in pipeline', async () => {
      const asyncDouble = async (x: number) => x * 2
      const asyncAddTen = async (x: number) => x + 10

      const pipeline = 入.pipe(asyncDouble, asyncAddTen)
      const result = await pipeline(5)

      expect(result).toBe(20)
    })

    it('should handle mixed sync and async functions', async () => {
      const syncDouble = (x: number) => x * 2
      const asyncAddTen = async (x: number) => {
        await new Promise((r) => setTimeout(r, 1))
        return x + 10
      }
      const syncToString = (x: number) => `${x}`

      const pipeline = 入.pipe(syncDouble, asyncAddTen, syncToString)
      const result = await pipeline(5)

      expect(result).toBe('20')
    })

    it('should create named pipeline with .pipe(name, ...fns)', async () => {
      const double = (x: number) => x * 2
      const addTen = (x: number) => x + 10

      入.pipe('doubleAndAdd', double, addTen)

      const result = await 入`doubleAndAdd ${5}`

      expect(result).toBe(20)
    })

    it('should handle empty pipeline', async () => {
      const pipeline = 入.pipe()
      const result = await pipeline(42)

      expect(result).toBe(42) // Identity
    })

    it('should handle single function pipeline', async () => {
      const double = (x: number) => x * 2
      const pipeline = 入.pipe(double)
      const result = await pipeline(5)

      expect(result).toBe(10)
    })
  })

  describe('Error Handling', () => {
    it('should reject promise when function throws', async () => {
      const throwingFn = vi.fn(() => {
        throw new Error('Function error')
      })
      入.register('throwing', throwingFn)

      await expect(入`throwing`).rejects.toThrow('Function error')
    })

    it('should reject when async function rejects', async () => {
      const rejectingFn = vi.fn().mockRejectedValue(new Error('Async error'))
      入.register('rejecting', rejectingFn)

      await expect(入`rejecting`).rejects.toThrow('Async error')
    })

    it('should throw for unregistered function in tagged template', async () => {
      await expect(入`unregisteredFunction`).rejects.toThrow(/not found|not registered|unknown/i)
    })

    it('should include function name in error message', async () => {
      const failingFn = vi.fn(() => {
        throw new Error('Inner error')
      })
      入.register('namedFail', failingFn)

      try {
        await 入`namedFail`
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as Error).message).toMatch(/namedFail|Inner error/)
      }
    })

    it('should propagate error context through chain', async () => {
      const step1 = vi.fn().mockResolvedValue(1)
      const step2 = vi.fn(() => {
        throw new Error('Step 2 failed')
      })
      const step3 = vi.fn().mockResolvedValue(3)

      入.register('step1', step1)
      入.register('step2', step2)
      入.register('step3', step3)

      await expect(
        入`step1`.then(入`step2`).then(入`step3`)
      ).rejects.toThrow('Step 2 failed')

      expect(step3).not.toHaveBeenCalled()
    })
  })

  describe('Retry Mechanism', () => {
    it('should retry failed invocations with retries option', async () => {
      let attempts = 0
      const flaky = vi.fn(() => {
        attempts++
        if (attempts < 3) {
          throw new Error('Temporary failure')
        }
        return 'success'
      })
      入.register('flaky', flaky)

      const result = await 入.invoke('flaky', { retries: 3 })

      expect(attempts).toBe(3)
      expect(result).toBe('success')
    })

    it('should fail after exhausting retries', async () => {
      const alwaysFails = vi.fn(() => {
        throw new Error('Permanent failure')
      })
      入.register('alwaysFails', alwaysFails)

      await expect(入.invoke('alwaysFails', { retries: 3 })).rejects.toThrow('Permanent failure')
      expect(alwaysFails).toHaveBeenCalledTimes(3)
    })

    it('should wait between retries with retryDelay', async () => {
      vi.useFakeTimers()

      let attempts = 0
      const flaky = vi.fn(async () => {
        attempts++
        if (attempts < 2) {
          throw new Error('Temporary failure')
        }
        return 'success'
      })
      入.register('flakyWithDelay', flaky)

      const promise = 入.invoke('flakyWithDelay', { retries: 2, retryDelay: 1000 })

      // First attempt fails immediately
      await vi.advanceTimersByTimeAsync(0)
      expect(attempts).toBe(1)

      // Wait for retry delay
      await vi.advanceTimersByTimeAsync(1000)
      expect(attempts).toBe(2)

      await promise

      vi.useRealTimers()
    })

    it('should use exponential backoff when specified', async () => {
      vi.useFakeTimers()

      let attempts = 0
      const attemptTimes: number[] = []
      const flaky = vi.fn(async () => {
        attempts++
        attemptTimes.push(Date.now())
        if (attempts < 4) {
          throw new Error('Temporary failure')
        }
        return 'success'
      })
      入.register('exponentialBackoff', flaky)

      const promise = 入.invoke('exponentialBackoff', {
        retries: 4,
        retryDelay: 100,
        backoff: 'exponential',
      })

      // Attempt 1 at 0ms
      await vi.advanceTimersByTimeAsync(0)
      // Attempt 2 at 100ms
      await vi.advanceTimersByTimeAsync(100)
      // Attempt 3 at 300ms (100 + 200)
      await vi.advanceTimersByTimeAsync(200)
      // Attempt 4 at 700ms (300 + 400)
      await vi.advanceTimersByTimeAsync(400)

      await promise

      vi.useRealTimers()
    })
  })

  describe('Timeout Handling', () => {
    it('should timeout if function takes too long', async () => {
      vi.useFakeTimers()

      const slowFn = vi.fn(
        () => new Promise((resolve) => setTimeout(resolve, 10000))
      )
      入.register('slow', slowFn)

      const promise = 入.invoke('slow', { timeout: 1000 })

      await vi.advanceTimersByTimeAsync(1000)

      await expect(promise).rejects.toThrow(/timeout/i)

      vi.useRealTimers()
    })

    it('should not timeout if function completes in time', async () => {
      const fastFn = vi.fn().mockResolvedValue('fast')
      入.register('fast', fastFn)

      const result = await 入.invoke('fast', { timeout: 1000 })

      expect(result).toBe('fast')
    })
  })

  describe('Context and This Binding', () => {
    it('should support context binding with .bind()', async () => {
      const obj = {
        value: 42,
        getValue() {
          return this.value
        },
      }

      入.register('boundMethod', obj.getValue.bind(obj))

      const result = await 入`boundMethod`

      expect(result).toBe(42)
    })

    it('should support context object in invoke options', async () => {
      function getContext(this: { name: string }) {
        return this.name
      }

      入.register('contextual', getContext)

      const result = await 入.invoke('contextual', {
        context: { name: 'TestContext' },
      })

      expect(result).toBe('TestContext')
    })
  })

  describe('Function Introspection', () => {
    it('should list all registered function names with .list()', () => {
      入.register('fn1', vi.fn())
      入.register('fn2', vi.fn())
      入.register('fn3', vi.fn())

      const names = 入.list()

      expect(names).toContain('fn1')
      expect(names).toContain('fn2')
      expect(names).toContain('fn3')
    })

    it('should get function metadata with .get()', () => {
      const myFn = (a: number, b: number) => a + b
      入.register('add', myFn)

      const registered = 入.get('add')

      expect(registered).toBeDefined()
      expect(registered.fn).toBe(myFn)
    })

    it('should return undefined for unregistered function with .get()', () => {
      const registered = 入.get('nonexistent')

      expect(registered).toBeUndefined()
    })

    it('should check if function exists with .has()', () => {
      入.register('exists', vi.fn())

      expect(入.has('exists')).toBe(true)
      expect(入.has('doesNotExist')).toBe(false)
    })

    it('should unregister function with .unregister()', () => {
      入.register('toRemove', vi.fn())
      expect(入.has('toRemove')).toBe(true)

      入.unregister('toRemove')

      expect(入.has('toRemove')).toBe(false)
    })

    it('should clear all registered functions with .clear()', () => {
      入.register('fn1', vi.fn())
      入.register('fn2', vi.fn())
      入.register('fn3', vi.fn())

      入.clear()

      expect(入.list()).toHaveLength(0)
    })
  })

  describe('Middleware Support', () => {
    it('should support pre-invocation middleware', async () => {
      const mockFn = vi.fn((x: number) => x * 2)
      入.register('double', mockFn)

      const middleware = vi.fn((name, args, next) => {
        // Modify args before invocation
        return next(name, args.map((a: number) => a + 1))
      })

      入.use(middleware)

      const result = await 入`double ${5}`

      expect(result).toBe(12) // (5 + 1) * 2 = 12
    })

    it('should support post-invocation middleware', async () => {
      const mockFn = vi.fn().mockResolvedValue(10)
      入.register('getValue', mockFn)

      const middleware = vi.fn(async (name, args, next) => {
        const result = await next(name, args)
        return result * 2 // Double the result
      })

      入.use(middleware)

      const result = await 入`getValue`

      expect(result).toBe(20)
    })

    it('should support multiple middleware in order', async () => {
      const mockFn = vi.fn((x: number) => x)
      入.register('identity', mockFn)

      const order: number[] = []

      const middleware1 = vi.fn(async (name, args, next) => {
        order.push(1)
        const result = await next(name, args)
        order.push(4)
        return result
      })

      const middleware2 = vi.fn(async (name, args, next) => {
        order.push(2)
        const result = await next(name, args)
        order.push(3)
        return result
      })

      入.use(middleware1)
      入.use(middleware2)

      await 入`identity ${42}`

      expect(order).toEqual([1, 2, 3, 4])
    })

    it('should allow middleware to short-circuit', async () => {
      const mockFn = vi.fn().mockResolvedValue('real')
      入.register('real', mockFn)

      const cachingMiddleware = vi.fn((name, args, next) => {
        if (name === 'real') {
          return 'cached'
        }
        return next(name, args)
      })

      入.use(cachingMiddleware)

      const result = await 入`real`

      expect(result).toBe('cached')
      expect(mockFn).not.toHaveBeenCalled()
    })

    it('should remove middleware with returned function', () => {
      const middleware = vi.fn((name, args, next) => next(name, args))

      const remove = 入.use(middleware)
      remove()

      // Middleware should no longer be active
    })
  })

  describe('Async Iteration and Generators', () => {
    it('should handle generator functions', async () => {
      function* generator() {
        yield 1
        yield 2
        yield 3
      }
      入.register('generator', generator)

      const result = await 入`generator`

      expect(result[Symbol.iterator]).toBeDefined()
      expect([...result]).toEqual([1, 2, 3])
    })

    it('should handle async generator functions', async () => {
      async function* asyncGenerator() {
        yield 1
        yield 2
        yield 3
      }
      入.register('asyncGenerator', asyncGenerator)

      const result = await 入`asyncGenerator`

      const values: number[] = []
      for await (const value of result) {
        values.push(value)
      }
      expect(values).toEqual([1, 2, 3])
    })
  })

  describe('Type Safety', () => {
    it('should preserve input types through invocation', async () => {
      interface User {
        id: string
        name: string
      }

      const createUser = vi.fn((data: Partial<User>): User => ({
        id: '123',
        name: data.name || 'Unknown',
      }))
      入.register('createUser', createUser)

      const user = await 入`createUser ${{ name: 'Alice' }}`

      expect(user.id).toBe('123')
      expect(user.name).toBe('Alice')
    })

    it('should infer return types from registered functions', async () => {
      const add = (a: number, b: number): number => a + b
      入.register('add', add)

      const result = await 入`add ${1} ${2}`

      // TypeScript should infer result as number
      const doubled: number = result * 2
      expect(doubled).toBe(6)
    })
  })

  describe('ASCII Alias: fn', () => {
    it('should export fn as ASCII alias for 入', () => {
      expect(fn).toBe(入)
    })

    it('should work identically to 入 for registration', () => {
      const mockFn = vi.fn().mockResolvedValue('alias')
      fn.register('aliasTest', mockFn)

      expect(fn.has('aliasTest')).toBe(true)
      expect(入.has('aliasTest')).toBe(true)
    })

    it('should work identically for tagged template invocation', async () => {
      const mockFn = vi.fn().mockResolvedValue('via fn')
      fn.register('fnInvoke', mockFn)

      const result = await fn`fnInvoke ${'arg'}`

      expect(result).toBe('via fn')
    })

    it('should work identically for .invoke()', async () => {
      const mockFn = vi.fn().mockResolvedValue('direct')
      fn.register('directInvoke', mockFn)

      const result = await fn.invoke('directInvoke', 'arg')

      expect(result).toBe('direct')
    })

    it('should share registry between 入 and fn', async () => {
      const mockFn = vi.fn().mockResolvedValue('shared')
      入.register('sharedFn', mockFn)

      const result = await fn`sharedFn`

      expect(result).toBe('shared')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty string function name', async () => {
      await expect(入``).rejects.toThrow()
    })

    it('should handle whitespace-only function name', async () => {
      await expect(入`   `).rejects.toThrow()
    })

    it('should handle function returning undefined', async () => {
      const voidFn = vi.fn().mockResolvedValue(undefined)
      入.register('voidFn', voidFn)

      const result = await 入`voidFn`

      expect(result).toBeUndefined()
    })

    it('should handle function returning null', async () => {
      const nullFn = vi.fn().mockResolvedValue(null)
      入.register('nullFn', nullFn)

      const result = await 入`nullFn`

      expect(result).toBeNull()
    })

    it('should handle deeply nested objects as arguments', async () => {
      const mockFn = vi.fn((x) => x)
      入.register('deepNested', mockFn)

      const deepObj = {
        level1: {
          level2: {
            level3: {
              value: 'deep',
            },
          },
        },
      }

      const result = await 入`deepNested ${deepObj}`

      expect(result).toEqual(deepObj)
    })

    it('should handle circular references in arguments gracefully', async () => {
      const mockFn = vi.fn((x) => x)
      入.register('circular', mockFn)

      const obj: Record<string, unknown> = { name: 'test' }
      obj.self = obj

      // Should not throw
      const result = await 入`circular ${obj}`

      expect(result.name).toBe('test')
    })

    it('should handle very long function names', async () => {
      const longName = 'a'.repeat(1000)
      const mockFn = vi.fn().mockResolvedValue('long name')
      入.register(longName, mockFn)

      expect(入.has(longName)).toBe(true)
    })

    it('should handle unicode in function names', async () => {
      const mockFn = vi.fn().mockResolvedValue('unicode')
      入.register('calculer', mockFn)

      const result = await 入`calculer ${42}`

      expect(result).toBe('unicode')
    })

    it('should handle special characters in function names', async () => {
      const mockFn = vi.fn().mockResolvedValue('special')
      入.register('fn-with_special.chars:here', mockFn)

      expect(入.has('fn-with_special.chars:here')).toBe(true)
    })
  })

  describe('Concurrent Execution', () => {
    it('should handle concurrent invocations of same function', async () => {
      let counter = 0
      const incrementer = vi.fn(async () => {
        const value = counter
        await new Promise((r) => setTimeout(r, 10))
        counter = value + 1
        return counter
      })
      入.register('incrementer', incrementer)

      const results = await Promise.all([
        入`incrementer`,
        入`incrementer`,
        入`incrementer`,
      ])

      expect(incrementer).toHaveBeenCalledTimes(3)
      // Due to race condition, all might return 1
    })

    it('should handle concurrent invocations of different functions', async () => {
      const fn1 = vi.fn().mockResolvedValue('fn1')
      const fn2 = vi.fn().mockResolvedValue('fn2')
      const fn3 = vi.fn().mockResolvedValue('fn3')

      入.register('concurrent1', fn1)
      入.register('concurrent2', fn2)
      入.register('concurrent3', fn3)

      const results = await Promise.all([
        入`concurrent1`,
        入`concurrent2`,
        入`concurrent3`,
      ])

      expect(results).toEqual(['fn1', 'fn2', 'fn3'])
    })
  })

  describe('Performance and Limits', () => {
    it('should handle many registered functions', () => {
      for (let i = 0; i < 1000; i++) {
        入.register(`fn_${i}`, vi.fn())
      }

      expect(入.list().length).toBe(1000)
      expect(入.has('fn_500')).toBe(true)
    })

    it('should handle many arguments', async () => {
      const manyArgs = vi.fn((...args) => args.length)
      入.register('manyArgs', manyArgs)

      const args = Array.from({ length: 100 }, (_, i) => i)

      // Note: Tagged templates have a limit, using invoke for many args
      const result = await 入.invoke('manyArgs', ...args)

      expect(result).toBe(100)
    })

    it('should handle rapid sequential invocations', async () => {
      const rapid = vi.fn().mockResolvedValue('rapid')
      入.register('rapid', rapid)

      for (let i = 0; i < 100; i++) {
        await 入`rapid`
      }

      expect(rapid).toHaveBeenCalledTimes(100)
    })
  })
})

describe('入 Type Safety', () => {
  it('should be callable as tagged template literal', () => {
    // This test verifies the type signature allows tagged template usage
    const taggedCall = async () => {
      await 入`test.function ${{ data: 'value' }}`
    }
    expect(taggedCall).toBeDefined()
  })

  it('should have proper method signatures', () => {
    // Verify the shape of the exported object
    expect(typeof 入.register).toBe('function')
    expect(typeof 入.invoke).toBe('function')
    expect(typeof 入.has).toBe('function')
    expect(typeof 入.get).toBe('function')
    expect(typeof 入.list).toBe('function')
    expect(typeof 入.clear).toBe('function')
    expect(typeof 入.unregister).toBe('function')
    expect(typeof 入.pipe).toBe('function')
    expect(typeof 入.use).toBe('function')
  })
})
