/**
 * Tests for the shared tagged template helper
 *
 * This helper is currently duplicated in 30+ SDKs:
 * - actions.do, analytics.do, workflows.do, etc.
 *
 * These tests verify the extraction to rpc.do works correctly.
 *
 * RED PHASE: These tests should FAIL because rpc.do doesn't export `tagged` yet.
 */

import { describe, it, expect, vi } from 'vitest'

// This import should fail in RED phase - tagged is not yet exported from rpc.do
import { tagged, type TaggedTemplate, type DoOptions } from 'rpc.do'

describe('tagged template helper', () => {
  describe('function signature', () => {
    it('should export tagged function', () => {
      expect(typeof tagged).toBe('function')
    })

    it('should return a function when called with a handler', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const result = tagged(handler)
      expect(typeof result).toBe('function')
    })
  })

  describe('tagged template literal syntax: fn`template ${value} here`', () => {
    it('should handle simple template without interpolation', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)

      const result = doFn`Hello world`

      expect(handler).toHaveBeenCalledWith('Hello world')
      expect(result).toBe('Hello world')
    })

    it('should handle template with single string interpolation', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)
      const name = 'Alice'

      const result = doFn`Hello ${name}!`

      expect(handler).toHaveBeenCalledWith('Hello Alice!')
      expect(result).toBe('Hello Alice!')
    })

    it('should handle template with multiple interpolations', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)
      const action = 'send'
      const target = 'email'
      const recipient = 'customer'

      const result = doFn`Please ${action} a ${target} to the ${recipient}`

      expect(handler).toHaveBeenCalledWith('Please send a email to the customer')
      expect(result).toBe('Please send a email to the customer')
    })

    it('should handle multiline templates', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)

      const result = doFn`
        When a customer signs up,
        send a welcome email,
        wait 3 days, then send onboarding tips
      `

      expect(handler).toHaveBeenCalled()
      expect(result).toContain('When a customer signs up')
      expect(result).toContain('send a welcome email')
      expect(result).toContain('wait 3 days')
    })

    it('should handle template with interpolation at start', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)
      const verb = 'Create'

      const result = doFn`${verb} a new user account`

      expect(handler).toHaveBeenCalledWith('Create a new user account')
      expect(result).toBe('Create a new user account')
    })

    it('should handle template with interpolation at end', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)
      const subject = 'user'

      const result = doFn`Create a new ${subject}`

      expect(handler).toHaveBeenCalledWith('Create a new user')
      expect(result).toBe('Create a new user')
    })

    it('should handle template with adjacent interpolations', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)
      const first = 'Hello'
      const second = 'World'

      const result = doFn`${first}${second}!`

      expect(handler).toHaveBeenCalledWith('HelloWorld!')
      expect(result).toBe('HelloWorld!')
    })

    it('should handle empty template', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)

      const result = doFn``

      expect(handler).toHaveBeenCalledWith('')
      expect(result).toBe('')
    })
  })

  describe('string syntax with options: fn(prompt, options)', () => {
    it('should handle string-only call', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)

      const result = doFn('Hello world')

      expect(handler).toHaveBeenCalledWith('Hello world', undefined)
      expect(result).toBe('Hello world')
    })

    it('should handle string with empty options', () => {
      const handler = vi.fn((prompt: string, options?: DoOptions) => ({ prompt, options }))
      const doFn = tagged(handler)

      const result = doFn('Hello world', {})

      expect(handler).toHaveBeenCalledWith('Hello world', {})
      expect(result).toEqual({ prompt: 'Hello world', options: {} })
    })

    it('should handle string with context option', () => {
      const handler = vi.fn((prompt: string, options?: DoOptions) => ({ prompt, options }))
      const doFn = tagged(handler)
      const context = { userId: 'user_123', sessionId: 'sess_456' }

      const result = doFn('Process this request', { context })

      expect(handler).toHaveBeenCalledWith('Process this request', { context })
      expect(result).toEqual({
        prompt: 'Process this request',
        options: { context }
      })
    })

    it('should handle string with timeout option', () => {
      const handler = vi.fn((prompt: string, options?: DoOptions) => ({ prompt, options }))
      const doFn = tagged(handler)

      const result = doFn('Long running task', { timeout: '5m' })

      expect(handler).toHaveBeenCalledWith('Long running task', { timeout: '5m' })
      expect(result).toEqual({
        prompt: 'Long running task',
        options: { timeout: '5m' }
      })
    })

    it('should handle string with permissions option', () => {
      const handler = vi.fn((prompt: string, options?: DoOptions) => ({ prompt, options }))
      const doFn = tagged(handler)

      const result = doFn('Send email', { permissions: ['email:send', 'email:read'] })

      expect(handler).toHaveBeenCalledWith('Send email', { permissions: ['email:send', 'email:read'] })
      expect(result).toEqual({
        prompt: 'Send email',
        options: { permissions: ['email:send', 'email:read'] }
      })
    })

    it('should handle string with multiple options', () => {
      const handler = vi.fn((prompt: string, options?: DoOptions) => ({ prompt, options }))
      const doFn = tagged(handler)
      const options = {
        context: { org: 'org_123' },
        permissions: ['admin'],
        timeout: '10m'
      }

      const result = doFn('Admin action', options)

      expect(handler).toHaveBeenCalledWith('Admin action', options)
      expect(result).toEqual({ prompt: 'Admin action', options })
    })
  })

  describe('interpolation handling with various value types', () => {
    it('should handle number interpolation', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)
      const count = 42

      const result = doFn`Process ${count} items`

      expect(handler).toHaveBeenCalledWith('Process 42 items')
      expect(result).toBe('Process 42 items')
    })

    it('should handle zero interpolation', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)
      const zero = 0

      const result = doFn`Found ${zero} matches`

      expect(handler).toHaveBeenCalledWith('Found 0 matches')
      expect(result).toBe('Found 0 matches')
    })

    it('should handle boolean interpolation', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)
      const active = true
      const disabled = false

      const result = doFn`Status: active=${active}, disabled=${disabled}`

      expect(handler).toHaveBeenCalledWith('Status: active=true, disabled=false')
      expect(result).toBe('Status: active=true, disabled=false')
    })

    it('should handle null interpolation (should be omitted)', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)
      const value = null

      const result = doFn`Value is ${value} here`

      // null should be omitted (undefined behavior in current impl)
      expect(handler).toHaveBeenCalled()
      // Current implementation converts null to empty string
      expect(result).toBe('Value is null here')
    })

    it('should handle undefined interpolation (should be omitted)', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)
      const value = undefined

      const result = doFn`Value is ${value} here`

      // undefined should be omitted per current implementation
      expect(handler).toHaveBeenCalled()
      // Current implementation: undefined values are skipped
      expect(result).toBe('Value is  here')
    })

    it('should handle object interpolation (toString)', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)
      const obj = { name: 'test', count: 5 }

      const result = doFn`Object: ${obj}`

      expect(handler).toHaveBeenCalled()
      // Objects are converted via String(obj) which calls toString
      expect(result).toBe('Object: [object Object]')
    })

    it('should handle object with custom toString', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)
      const obj = {
        name: 'CustomObj',
        toString() { return `CustomObj(${this.name})` }
      }

      const result = doFn`Object: ${obj}`

      expect(handler).toHaveBeenCalledWith('Object: CustomObj(CustomObj)')
      expect(result).toBe('Object: CustomObj(CustomObj)')
    })

    it('should handle array interpolation', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)
      const items = ['apple', 'banana', 'cherry']

      const result = doFn`Items: ${items}`

      expect(handler).toHaveBeenCalledWith('Items: apple,banana,cherry')
      expect(result).toBe('Items: apple,banana,cherry')
    })

    it('should handle empty array interpolation', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)
      const items: string[] = []

      const result = doFn`Items: ${items}`

      expect(handler).toHaveBeenCalledWith('Items: ')
      expect(result).toBe('Items: ')
    })

    it('should handle Date interpolation', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)
      const date = new Date('2024-01-15T12:00:00Z')

      const result = doFn`Created on ${date}`

      expect(handler).toHaveBeenCalled()
      // Date uses toString which gives locale-dependent output
      expect(result).toContain('Created on')
    })

    it('should handle BigInt interpolation', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)
      const big = BigInt('9007199254740993')

      const result = doFn`Large number: ${big}`

      expect(handler).toHaveBeenCalledWith('Large number: 9007199254740993')
      expect(result).toBe('Large number: 9007199254740993')
    })

    it('should handle Symbol interpolation', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)
      const sym = Symbol('test')

      const result = doFn`Symbol: ${sym}`

      expect(handler).toHaveBeenCalledWith('Symbol: Symbol(test)')
      expect(result).toBe('Symbol: Symbol(test)')
    })

    it('should handle function interpolation', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)
      const fn = function myFunc() { return 42 }

      const result = doFn`Function: ${fn}`

      expect(handler).toHaveBeenCalled()
      expect(result).toContain('Function:')
    })
  })

  describe('type inference for return types', () => {
    it('should preserve Promise return type', async () => {
      const handler = vi.fn(async (prompt: string) => ({ answer: prompt }))
      const doFn = tagged(handler)

      const result = doFn`What is the meaning of life?`

      expect(result).toBeInstanceOf(Promise)
      const resolved = await result
      expect(resolved).toEqual({ answer: 'What is the meaning of life?' })
    })

    it('should preserve sync return type', () => {
      const handler = vi.fn((prompt: string) => ({ length: prompt.length }))
      const doFn = tagged(handler)

      const result = doFn`Hello`

      expect(result).toEqual({ length: 5 })
    })

    it('should preserve complex return type', () => {
      interface ComplexResult {
        id: string
        processed: boolean
        data: { prompt: string; timestamp: number }
      }

      const handler = vi.fn((prompt: string): ComplexResult => ({
        id: 'test-id',
        processed: true,
        data: { prompt, timestamp: Date.now() }
      }))

      const doFn = tagged(handler)
      const result = doFn`Process this`

      expect(result.id).toBe('test-id')
      expect(result.processed).toBe(true)
      expect(result.data.prompt).toBe('Process this')
    })

    it('should preserve void return type', () => {
      const handler = vi.fn((_prompt: string): void => {
        // side effect only
      })
      const doFn = tagged(handler)

      const result = doFn`Log this`

      expect(result).toBeUndefined()
      expect(handler).toHaveBeenCalledWith('Log this')
    })

    it('should preserve union return type', () => {
      const handler = vi.fn((prompt: string): string | null => {
        return prompt.length > 5 ? prompt : null
      })
      const doFn = tagged(handler)

      expect(doFn`Hi`).toBeNull()
      expect(doFn`Hello World`).toBe('Hello World')
    })
  })

  describe('DoOptions interface validation', () => {
    it('should accept standard DoOptions properties', () => {
      const handler = vi.fn((prompt: string, options?: DoOptions) => options)
      const doFn = tagged(handler)

      const options: DoOptions = {
        context: { key: 'value' },
        permissions: ['read', 'write'],
        timeout: '30s'
      }

      doFn('test', options)

      expect(handler).toHaveBeenCalledWith('test', options)
    })

    it('should allow additional properties on DoOptions', () => {
      const handler = vi.fn((prompt: string, options?: DoOptions) => options)
      const doFn = tagged(handler)

      // DoOptions should allow arbitrary additional properties
      const options = {
        context: {},
        customField: 'custom value',
        anotherField: 123
      }

      doFn('test', options)

      expect(handler).toHaveBeenCalledWith('test', options)
    })

    it('should work with undefined options', () => {
      const handler = vi.fn((prompt: string, options?: DoOptions) => options)
      const doFn = tagged(handler)

      doFn('test')

      expect(handler).toHaveBeenCalledWith('test', undefined)
    })
  })

  describe('edge cases', () => {
    it('should handle handler that throws', () => {
      const handler = vi.fn((_prompt: string) => {
        throw new Error('Handler error')
      })
      const doFn = tagged(handler)

      expect(() => doFn`test`).toThrow('Handler error')
    })

    it('should handle handler that returns Promise rejection', async () => {
      const handler = vi.fn(async (_prompt: string) => {
        throw new Error('Async handler error')
      })
      const doFn = tagged(handler)

      await expect(doFn`test`).rejects.toThrow('Async handler error')
    })

    it('should not call handler multiple times for same invocation', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)

      doFn`test`

      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should create independent instances for each tagged call', () => {
      const handler1 = vi.fn((prompt: string) => `h1: ${prompt}`)
      const handler2 = vi.fn((prompt: string) => `h2: ${prompt}`)

      const doFn1 = tagged(handler1)
      const doFn2 = tagged(handler2)

      const result1 = doFn1`test`
      const result2 = doFn2`test`

      expect(result1).toBe('h1: test')
      expect(result2).toBe('h2: test')
      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
    })

    it('should handle very long prompts', () => {
      const handler = vi.fn((prompt: string) => prompt.length)
      const doFn = tagged(handler)
      const longText = 'a'.repeat(10000)

      const result = doFn`${longText}`

      expect(result).toBe(10000)
    })

    it('should handle unicode in templates', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)
      const emoji = '🚀'

      const result = doFn`Launch ${emoji} rocket`

      expect(handler).toHaveBeenCalledWith('Launch 🚀 rocket')
      expect(result).toBe('Launch 🚀 rocket')
    })

    it('should handle special characters in templates', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)

      const result = doFn`Query: SELECT * FROM users WHERE name = 'test'`

      expect(handler).toHaveBeenCalledWith("Query: SELECT * FROM users WHERE name = 'test'")
    })

    it('should handle newlines and tabs in templates', () => {
      const handler = vi.fn((prompt: string) => prompt)
      const doFn = tagged(handler)

      const result = doFn`Line 1\nLine 2\tTabbed`

      expect(handler).toHaveBeenCalledWith('Line 1\nLine 2\tTabbed')
    })
  })
})

describe('TaggedTemplate type', () => {
  it('should be a callable type that supports both signatures', () => {
    // Type test: This should compile without errors
    const handler = (prompt: string, options?: DoOptions) => ({ prompt, options })
    const fn: TaggedTemplate<{ prompt: string; options?: DoOptions }> = tagged(handler)

    // Both call signatures should work
    const result1 = fn`template literal`
    const result2 = fn('string', { context: {} })

    expect(result1.prompt).toBe('template literal')
    expect(result2.prompt).toBe('string')
  })
})

describe('DoOptions type', () => {
  it('should have expected shape', () => {
    // Type test: DoOptions should accept these properties
    const options: DoOptions = {
      context: { userId: '123' },
      permissions: ['read'],
      timeout: '5m'
    }

    expect(options.context).toBeDefined()
    expect(options.permissions).toBeDefined()
    expect(options.timeout).toBeDefined()
  })

  it('should allow optional properties', () => {
    const minimalOptions: DoOptions = {}
    expect(minimalOptions).toBeDefined()
  })
})
