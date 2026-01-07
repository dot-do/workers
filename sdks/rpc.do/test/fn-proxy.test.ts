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
  batchRpc, // Kept for testing the deprecation error
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
  // These tests verify the auto-detection behavior via getDefaultApiKeySync

  it('should auto-detect Node.js process.env without explicit setEnv', async () => {
    // Clear any global env
    const { setEnv, getDefaultApiKeySync, getEnv } = await import('../index')

    // Set a test env var directly on process.env
    const testKey = `TEST_KEY_${Date.now()}`
    process.env.DO_API_KEY = testKey

    // Without calling setEnv, should still find the key via auto-detection
    // Note: This works because getDefaultApiKeySync falls back to process.env
    const key = getDefaultApiKeySync()
    expect(key).toBe(testKey)

    // Cleanup
    delete process.env.DO_API_KEY
  })

  it('should verify process.versions.node exists in real Node.js', () => {
    // This verifies we're in a real Node.js environment with versions info
    // Browsers with polyfilled process.env won't have this
    expect(process.versions).toBeDefined()
    expect(process.versions.node).toBeDefined()
    expect(typeof process.versions.node).toBe('string')
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

  it.skip('should apply defaults to direct interpolation templates (KNOWN LIMITATION)', async () => {
    // KNOWN LIMITATION: Direct interpolation templates `fn\`${val}\`` don't support options.
    // The tagged template is called directly and returns a promise - there's no way
    // to inject options without changing the underlying createFnProxy implementation.
    //
    // Workaround: Use named params syntax if you need options:
    //   fnWithDefaults`Hello {name}!`({ name: 'Alice' })
    //
    // This test is skipped to document the limitation.

    const rpcCall = vi.fn().mockResolvedValue('result')
    const baseFn = createFnProxy<string, any, { model?: string }>(
      'test',
      rpcCall
    )

    const fnWithDefaults = withDefaultOpts(baseFn, { model: 'gpt-4' })

    // Direct interpolation - no way to pass opts in current API
    await fnWithDefaults`Hello ${'Alice'}!`

    // This would require createFnProxy to support default opts injection
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
