/**
 * OpenFeature Provider Conformance Tests
 * Spec: https://openfeature.dev/specification/sections/providers
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { CloudflareWorkersProvider } from '../src/provider'
import type { CloudflareEnv, FlagDefinition } from '../src/provider/types'

// Mock Cloudflare environment
class MockD1Database implements D1Database {
  private data: Map<string, FlagDefinition> = new Map()

  constructor() {
    // Seed with test flags
    this.data.set('test-boolean', {
      key: 'test-boolean',
      type: 'boolean',
      defaultValue: false,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })

    this.data.set('test-string', {
      key: 'test-string',
      type: 'string',
      defaultValue: 'default',
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  prepare(query: string) {
    return {
      bind: (...args: any[]) => ({
        first: async () => {
          // Simple mock - return first matching flag
          const key = args[0]
          return this.data.get(key) || null
        },
        all: async () => ({ results: Array.from(this.data.values()) }),
        run: async () => ({ success: true }),
      }),
      first: async () => ({ success: 1 }),
    }
  }

  async dump(): Promise<ArrayBuffer> {
    throw new Error('Not implemented')
  }

  async batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> {
    throw new Error('Not implemented')
  }

  async exec(query: string): Promise<D1ExecResult> {
    throw new Error('Not implemented')
  }
}

class MockKVNamespace implements KVNamespace {
  private data: Map<string, string> = new Map()

  async get(key: string, options?: any): Promise<any> {
    const value = this.data.get(key)
    if (!value) return null

    // Handle both string type and options object
    const type = typeof options === 'string' ? options : options?.type
    if (type === 'json') return JSON.parse(value)
    return value
  }

  async put(key: string, value: string, options?: any): Promise<void> {
    this.data.set(key, value)
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key)
  }

  async list(options?: any): Promise<any> {
    return { keys: Array.from(this.data.keys()).map((name) => ({ name })) }
  }

  async getWithMetadata(key: string, options?: any): Promise<any> {
    return { value: await this.get(key, options), metadata: null }
  }
}

class MockAnalyticsEngine implements AnalyticsEngineDataset {
  writeDataPoint(data: any): void {
    // Mock - do nothing
  }
}

describe('CloudflareWorkersProvider - OpenFeature Conformance', () => {
  let provider: CloudflareWorkersProvider
  let env: CloudflareEnv

  beforeEach(() => {
    env = {
      DB: new MockD1Database() as any,
      CACHE: new MockKVNamespace() as any,
      ANALYTICS: new MockAnalyticsEngine(),
    }

    provider = new CloudflareWorkersProvider({ env })
  })

  describe('Provider Metadata', () => {
    it('MUST have a name', () => {
      expect(provider.metadata.name).toBe('cloudflare-workers-provider')
    })

    it('SHOULD have a version', () => {
      expect(provider.metadata.version).toBeDefined()
      expect(provider.metadata.version).toMatch(/^\d+\.\d+\.\d+$/)
    })
  })

  describe('Provider Initialization', () => {
    it('MUST support initialization', async () => {
      await expect(provider.initialize()).resolves.not.toThrow()
    })

    it('MUST be in READY state after initialization', async () => {
      await provider.initialize()
      // Provider status is private, but we can verify by evaluating a flag
      const result = await provider.resolveBooleanEvaluation('test-boolean', false, {})
      expect(result.value).toBeDefined()
    })
  })

  describe('Boolean Evaluation', () => {
    beforeEach(async () => {
      await provider.initialize()
    })

    it('MUST resolve boolean flags', async () => {
      const result = await provider.resolveBooleanEvaluation('test-boolean', true, {})
      expect(typeof result.value).toBe('boolean')
    })

    it('MUST return default value when flag not found', async () => {
      const result = await provider.resolveBooleanEvaluation('nonexistent', true, {})
      expect(result.value).toBe(true)
      expect(result.reason).toBe('ERROR')
    })

    it('MUST include resolution details', async () => {
      const result = await provider.resolveBooleanEvaluation('test-boolean', false, {})
      expect(result.value).toBeDefined()
      expect(result.reason).toBeDefined()
    })
  })

  describe('String Evaluation', () => {
    beforeEach(async () => {
      await provider.initialize()
    })

    it('MUST resolve string flags', async () => {
      const result = await provider.resolveStringEvaluation('test-string', 'fallback', {})
      expect(typeof result.value).toBe('string')
    })
  })

  describe('Number Evaluation', () => {
    beforeEach(async () => {
      await provider.initialize()
    })

    it('MUST resolve number flags', async () => {
      const result = await provider.resolveNumberEvaluation('test-number', 42, {})
      expect(typeof result.value).toBe('number')
    })
  })

  describe('Object Evaluation', () => {
    beforeEach(async () => {
      await provider.initialize()
    })

    it('MUST resolve object flags', async () => {
      const defaultValue = { key: 'value' }
      const result = await provider.resolveObjectEvaluation('test-object', defaultValue, {})
      expect(typeof result.value).toBe('object')
    })
  })

  describe('Context Handling', () => {
    beforeEach(async () => {
      await provider.initialize()
    })

    it('MUST accept evaluation context', async () => {
      const context = {
        targetingKey: 'user-123',
        email: 'test@example.com',
      }
      const result = await provider.resolveBooleanEvaluation('test-boolean', false, context)
      expect(result.value).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    beforeEach(async () => {
      await provider.initialize()
    })

    it('MUST handle FLAG_NOT_FOUND error', async () => {
      const result = await provider.resolveBooleanEvaluation('nonexistent', false, {})
      expect(result.errorCode).toBe('FLAG_NOT_FOUND')
      expect(result.reason).toBe('ERROR')
    })

    it('MUST return default value on error', async () => {
      const result = await provider.resolveBooleanEvaluation('nonexistent', true, {})
      expect(result.value).toBe(true)
    })
  })

  describe('Hooks', () => {
    it('SHOULD provide hooks', () => {
      expect(provider.hooks).toBeDefined()
      expect(Array.isArray(provider.hooks)).toBe(true)
    })

    it('SHOULD have before, after, error, and finally hooks', () => {
      const hooks = provider.hooks
      expect(hooks.some((h) => h.before)).toBe(true)
      expect(hooks.some((h) => h.after)).toBe(true)
      expect(hooks.some((h) => h.error)).toBe(true)
      expect(hooks.some((h) => h.finally)).toBe(true)
    })
  })

  describe('Provider Shutdown', () => {
    it('MUST support shutdown', async () => {
      await provider.initialize()
      await expect(provider.onClose()).resolves.not.toThrow()
    })
  })
})

describe('Caching Behavior', () => {
  let provider: CloudflareWorkersProvider
  let env: CloudflareEnv

  beforeEach(async () => {
    env = {
      DB: new MockD1Database() as any,
      CACHE: new MockKVNamespace() as any,
      ANALYTICS: new MockAnalyticsEngine(),
    }

    provider = new CloudflareWorkersProvider({ env, cacheTTL: 60 })
    await provider.initialize()
  })

  it('should cache flag evaluations', async () => {
    const context = { targetingKey: 'user-123' }

    // First evaluation - should hit DB
    const result1 = await provider.resolveBooleanEvaluation('test-boolean', false, context)

    // Second evaluation - should hit cache
    const result2 = await provider.resolveBooleanEvaluation('test-boolean', false, context)

    expect(result1.value).toEqual(result2.value)
    expect(result2.reason).toBe('CACHED')
  })
})
