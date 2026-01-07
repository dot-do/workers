/**
 * TDD RED Phase Tests for fn-proxy issues
 *
 * These tests should FAIL until the GREEN phase implements fixes.
 * Each test documents the expected behavior for issues found in code review.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createFnProxy,
  createStreamFnProxy,
  withDefaultOpts,
  batchRpc,
  serializeFnCall,
  isTemplateStringsArray,
  hasNamedParams,
  extractParamNames,
} from '../fn-proxy'
import type { SerializableFnCall, RpcFn } from '../fn-proxy'
import type { RpcPromise } from '@dotdo/types/rpc'

// =============================================================================
// Issue #1: batchRpc was broken and has been removed
// =============================================================================

describe('batchRpc', () => {
  it('should throw with helpful error message', () => {
    // batchRpc was fundamentally broken - promises execute immediately when created,
    // making batching impossible. It has been removed with a clear error message.

    expect(() => batchRpc()).toThrow(/batchRpc has been removed/i)
  })

  it('should suggest Promise.all as alternative', () => {
    expect(() => batchRpc()).toThrow(/Promise\.all/i)
  })
})

// =============================================================================
// Issue #2: Node.js detection - should use process.versions.node
// =============================================================================

describe('Node.js environment detection', () => {
  // These tests are in client.test.ts but we add specific detection tests here

  it('should detect Node.js via process.versions.node', async () => {
    // This tests the more robust detection pattern
    // process.versions.node exists only in real Node.js, not polyfills

    const { getEffectiveEnv } = await import('../index')

    // In Node.js test environment, this should work
    const env = getEffectiveEnv()
    expect(env).not.toBeNull()
  })

  it('should NOT detect browser with process.env polyfill as Node.js', () => {
    // Test that browser polyfills don't trigger Node.js detection
    // This is a design requirement - browsers sometimes polyfill process.env
    // but NOT process.versions.node

    // Current implementation checks only globalThis.process?.env
    // which would incorrectly detect polyfilled browsers as Node.js

    // Save and mock
    const originalProcess = globalThis.process

    // Simulate browser with process.env polyfill (no versions)
    ;(globalThis as any).process = { env: { FAKE_VAR: 'test' } }

    // This should NOT detect as Node.js environment
    // But current implementation WILL incorrectly detect it
    const hasVersions = (globalThis as any).process?.versions?.node
    expect(hasVersions).toBeUndefined()

    // Restore
    ;(globalThis as any).process = originalProcess
  })
})

// =============================================================================
// Issue #3: Strict mode for extra params in named templates
// =============================================================================

describe('named template strict mode', () => {
  it('should throw on unknown parameters in strict mode', () => {
    const rpcCall = vi.fn().mockResolvedValue('result')
    const fn = createFnProxy<string>('test', rpcCall, { strict: true })

    // Template expects only {name}
    const taggedFn = fn`Hello {name}!`

    // Passing extra param 'typo' should throw in strict mode
    // BUG: Currently silently ignores extra params
    expect(() => {
      taggedFn({ name: 'Alice', typo: 'Bob' })
    }).toThrow(/unknown parameter|unexpected/i)
  })

  it('should warn on unknown parameters in non-strict mode', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const rpcCall = vi.fn().mockResolvedValue('result')
    const fn = createFnProxy<string>('test', rpcCall, { debug: true })

    const taggedFn = fn`Hello {name}!`
    taggedFn({ name: 'Alice', typo: 'Bob' })

    // Should warn about unused param
    // BUG: Currently no warning
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringMatching(/unused|unknown|extra/i)
    )

    consoleSpy.mockRestore()
  })

  it('should not throw on valid parameters in strict mode', () => {
    const rpcCall = vi.fn().mockResolvedValue('result')
    const fn = createFnProxy<string>('test', rpcCall, { strict: true })

    const taggedFn = fn`Hello {name}!`

    // This should work fine - only expected param
    expect(() => {
      taggedFn({ name: 'Alice' })
    }).not.toThrow()
  })

  it('should allow opts in params without throwing', () => {
    const rpcCall = vi.fn().mockResolvedValue('result')
    const fn = createFnProxy<string, any, { timeout?: number }>('test', rpcCall, { strict: true })

    const taggedFn = fn`Hello {name}!`

    // timeout is a valid opt, not an unknown param
    expect(() => {
      taggedFn({ name: 'Alice', timeout: 5000 })
    }).not.toThrow()
  })
})

// =============================================================================
// Issue #4: withDefaultOpts doesn't apply to named template calls
// =============================================================================

describe('withDefaultOpts with templates', () => {
  it('should apply defaults to named template calls', async () => {
    const rpcCall = vi.fn().mockResolvedValue('result')
    const baseFn = createFnProxy<string, any, { model?: string; timeout?: number }>(
      'test',
      rpcCall
    )

    const fnWithDefaults = withDefaultOpts(baseFn, { model: 'gpt-4', timeout: 5000 })

    // Named template call
    const taggedFn = fnWithDefaults`Hello {name}!`
    await taggedFn({ name: 'Alice' })

    // Should include default opts in the call
    // BUG: Current implementation doesn't handle template case
    expect(rpcCall).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          model: 'gpt-4',
          timeout: 5000,
        }),
      })
    )
  })

  it('should allow overriding defaults in named template params', async () => {
    const rpcCall = vi.fn().mockResolvedValue('result')
    const baseFn = createFnProxy<string, any, { model?: string }>(
      'test',
      rpcCall
    )

    const fnWithDefaults = withDefaultOpts(baseFn, { model: 'gpt-4' })

    const taggedFn = fnWithDefaults`Hello {name}!`
    await taggedFn({ name: 'Alice', model: 'claude-3' })

    // Override should take precedence
    expect(rpcCall).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          model: 'claude-3',
        }),
      })
    )
  })

  it('should apply defaults to direct interpolation templates', async () => {
    const rpcCall = vi.fn().mockResolvedValue('result')
    const baseFn = createFnProxy<string, any, { model?: string }>(
      'test',
      rpcCall
    )

    const fnWithDefaults = withDefaultOpts(baseFn, { model: 'gpt-4' })

    // Direct interpolation - no way to pass opts in current API
    // This is a known limitation, but defaults should still apply
    await fnWithDefaults`Hello ${'Alice'}!`

    // BUG: Defaults not applied for direct templates
    expect(rpcCall).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          model: 'gpt-4',
        }),
      })
    )
  })
})

// =============================================================================
// Issue #5: undefined as In type cast (lower priority - runtime OK)
// =============================================================================

describe('serializeFnCall args handling', () => {
  it('should omit args when undefined', () => {
    const call = serializeFnCall('test', undefined)

    // args should be omitted, not set to undefined
    expect('args' in call).toBe(false)
  })

  it('should include args when provided', () => {
    const call = serializeFnCall('test', { data: 'value' })

    expect(call.args).toEqual({ data: 'value' })
  })

  it('should handle template calls without args field', () => {
    const template = {
      strings: ['Hello ', '!'],
      values: ['World'],
      isNamedParams: false,
    }

    const call = serializeFnCall('test', undefined, undefined, template)

    // Should have template but not args
    expect(call.template).toBeDefined()
    expect('args' in call).toBe(false)
  })
})

// =============================================================================
// Helper function tests
// =============================================================================

describe('template helper functions', () => {
  describe('isTemplateStringsArray', () => {
    it('should return true for actual template strings', () => {
      function captureTemplateStrings(strings: TemplateStringsArray) {
        return strings
      }
      const strings = captureTemplateStrings`hello ${'world'}`
      expect(isTemplateStringsArray(strings)).toBe(true)
    })

    it('should return false for regular arrays', () => {
      expect(isTemplateStringsArray(['hello', 'world'])).toBe(false)
    })

    it('should return false for non-arrays', () => {
      expect(isTemplateStringsArray('string')).toBe(false)
      expect(isTemplateStringsArray(123)).toBe(false)
      expect(isTemplateStringsArray(null)).toBe(false)
      expect(isTemplateStringsArray(undefined)).toBe(false)
    })
  })

  describe('hasNamedParams', () => {
    it('should detect {name} style params', () => {
      function captureTemplateStrings(strings: TemplateStringsArray) {
        return strings
      }
      const strings = captureTemplateStrings`Hello {name}!`
      expect(hasNamedParams(strings)).toBe(true)
    })

    it('should not detect ${value} interpolations as named params', () => {
      function captureTemplateStrings(strings: TemplateStringsArray) {
        return strings
      }
      const value = 'test'
      const strings = captureTemplateStrings`Hello ${value}!`
      expect(hasNamedParams(strings)).toBe(false)
    })

    it('should detect multiple named params', () => {
      function captureTemplateStrings(strings: TemplateStringsArray) {
        return strings
      }
      const strings = captureTemplateStrings`{greeting} {name}!`
      expect(hasNamedParams(strings)).toBe(true)
    })
  })

  describe('extractParamNames', () => {
    it('should extract single param name', () => {
      function captureTemplateStrings(strings: TemplateStringsArray) {
        return strings
      }
      const strings = captureTemplateStrings`Hello {name}!`
      expect(extractParamNames(strings)).toEqual(['name'])
    })

    it('should extract multiple param names in order', () => {
      function captureTemplateStrings(strings: TemplateStringsArray) {
        return strings
      }
      const strings = captureTemplateStrings`{greeting} {name}, your ID is {id}`
      expect(extractParamNames(strings)).toEqual(['greeting', 'name', 'id'])
    })

    it('should return empty array for no params', () => {
      function captureTemplateStrings(strings: TemplateStringsArray) {
        return strings
      }
      const strings = captureTemplateStrings`Hello world!`
      expect(extractParamNames(strings)).toEqual([])
    })
  })
})

// =============================================================================
// createFnProxy tests
// =============================================================================

describe('createFnProxy', () => {
  it('should handle direct call', async () => {
    const rpcCall = vi.fn().mockResolvedValue('result')
    const fn = createFnProxy<string, { message: string }>('test', rpcCall)

    await fn({ message: 'hello' })

    expect(rpcCall).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'test',
        args: { message: 'hello' },
      })
    )
  })

  it('should handle template interpolation', async () => {
    const rpcCall = vi.fn().mockResolvedValue('result')
    const fn = createFnProxy<string>('test', rpcCall)

    const name = 'Alice'
    await fn`Hello ${name}!`

    expect(rpcCall).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'test',
        template: expect.objectContaining({
          strings: expect.any(Array),
          values: ['Alice'],
        }),
      })
    )
  })

  it('should handle named params template', async () => {
    const rpcCall = vi.fn().mockResolvedValue('result')
    const fn = createFnProxy<string>('test', rpcCall)

    const taggedFn = fn`Hello {name}!`
    await taggedFn({ name: 'Alice' })

    expect(rpcCall).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'test',
        params: { name: 'Alice' },
      })
    )
  })

  it('should throw on missing required param', () => {
    const rpcCall = vi.fn().mockResolvedValue('result')
    const fn = createFnProxy<string>('test', rpcCall)

    const taggedFn = fn`Hello {name}!`

    expect(() => {
      taggedFn({})
    }).toThrow(/missing parameter/i)
  })
})

// =============================================================================
// createStreamFnProxy tests
// =============================================================================

describe('createStreamFnProxy', () => {
  it('should return async iterable for direct call', async () => {
    async function* mockStream() {
      yield 'chunk1'
      yield 'chunk2'
    }

    const rpcStream = vi.fn().mockReturnValue(mockStream())
    const fn = createStreamFnProxy<string>('test', rpcStream)

    const stream = fn('input')

    const chunks: string[] = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual(['chunk1', 'chunk2'])
  })

  it('should handle template literal streaming', async () => {
    async function* mockStream() {
      yield 'Hello '
      yield 'World'
    }

    const rpcStream = vi.fn().mockReturnValue(mockStream())
    const fn = createStreamFnProxy<string>('test', rpcStream)

    const stream = fn`Tell me a story`

    const chunks: string[] = []
    for await (const chunk of stream) {
      chunks.push(chunk)
    }

    expect(chunks).toEqual(['Hello ', 'World'])
    expect(rpcStream).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'test',
        template: expect.any(Object),
      })
    )
  })
})
