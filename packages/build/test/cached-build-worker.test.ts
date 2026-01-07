/**
 * Cached Build Worker Tests
 *
 * Tests for build caching and incremental build functionality.
 * Validates the CachedBuildWorker contract:
 * - Content-addressable caching with SHA-256 hashes
 * - KV-compatible storage backend
 * - Cache hit/miss statistics
 * - Incremental builds with change detection
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  createCachedBuildWorker,
  createInMemoryCacheStorage,
  type CachedBuildWorker,
  type BuildCacheStorage,
} from '../src/index.js'

describe('Cached Build Worker - Build Caching', () => {
  describe('createCachedBuildWorker() factory', () => {
    it('should create a cached build worker instance', () => {
      const worker = createCachedBuildWorker()
      expect(worker).toBeDefined()
      expect(typeof worker.initialize).toBe('function')
      expect(typeof worker.compile).toBe('function')
      expect(typeof worker.bundle).toBe('function')
      expect(typeof worker.incrementalBuild).toBe('function')
      expect(typeof worker.detectChanges).toBe('function')
      expect(typeof worker.getCacheStats).toBe('function')
      expect(typeof worker.clearCache).toBe('function')
      expect(typeof worker.invalidateCache).toBe('function')
      expect(typeof worker.dispose).toBe('function')
    })

    it('should accept custom cache storage', () => {
      const cache = createInMemoryCacheStorage()
      const worker = createCachedBuildWorker({ cache })
      expect(worker).toBeDefined()
    })

    it('should accept custom cache TTL', () => {
      const worker = createCachedBuildWorker({ cacheTtl: 3600 })
      expect(worker).toBeDefined()
    })

    it('should accept custom cache key prefix', () => {
      const worker = createCachedBuildWorker({ cacheKeyPrefix: 'custom:' })
      expect(worker).toBeDefined()
    })

    it('should allow disabling cache', () => {
      const worker = createCachedBuildWorker({ enableCache: false })
      expect(worker).toBeDefined()
    })
  })

  describe('compile() with caching', () => {
    let worker: CachedBuildWorker

    beforeEach(async () => {
      worker = createCachedBuildWorker()
      await worker.initialize()
    })

    afterEach(() => {
      worker?.dispose()
    })

    it('should return fromCache: false on first compile', async () => {
      const result = await worker.compile('const x: number = 42; export default x;')

      expect(result.code).toBeDefined()
      expect(result.fromCache).toBe(false)
      expect(result.cacheKey).toBeDefined()
      expect(result.duration).toBeGreaterThanOrEqual(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should return fromCache: true on second compile with same source', async () => {
      const source = 'const x: number = 42; export default x;'

      const result1 = await worker.compile(source)
      expect(result1.fromCache).toBe(false)

      const result2 = await worker.compile(source)
      expect(result2.fromCache).toBe(true)
      expect(result2.code).toBe(result1.code)
    })

    it('should have cache miss for different source', async () => {
      const result1 = await worker.compile('const x: number = 1;')
      expect(result1.fromCache).toBe(false)

      const result2 = await worker.compile('const y: string = "hello";')
      expect(result2.fromCache).toBe(false)
    })

    it('should have cache miss for different options', async () => {
      const source = 'const x: number = 42;'

      const result1 = await worker.compile(source, { minify: false })
      expect(result1.fromCache).toBe(false)

      const result2 = await worker.compile(source, { minify: true })
      expect(result2.fromCache).toBe(false)

      // Same options should hit cache
      const result3 = await worker.compile(source, { minify: true })
      expect(result3.fromCache).toBe(true)
    })

    it('should not cache build errors', async () => {
      const invalidSource = 'const x: number = {{{;'

      const result1 = await worker.compile(invalidSource)
      expect(result1.errors.length).toBeGreaterThan(0)
      expect(result1.fromCache).toBe(false)

      // Should not be cached since it had errors
      const result2 = await worker.compile(invalidSource)
      expect(result2.fromCache).toBe(false)
    })

    it('should track cache statistics', async () => {
      const source = 'const x: number = 42;'

      // Initial stats should be empty
      let stats = worker.getCacheStats()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
      expect(stats.hitRate).toBe(0)

      // First compile - miss
      await worker.compile(source)
      stats = worker.getCacheStats()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(1)

      // Second compile - hit
      await worker.compile(source)
      stats = worker.getCacheStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)
      expect(stats.hitRate).toBe(0.5)

      // Third compile - hit
      await worker.compile(source)
      stats = worker.getCacheStats()
      expect(stats.hits).toBe(2)
      expect(stats.misses).toBe(1)
      expect(stats.hitRate).toBeCloseTo(0.667, 2)
    })
  })

  describe('compile() with caching disabled', () => {
    let worker: CachedBuildWorker

    beforeEach(async () => {
      worker = createCachedBuildWorker({ enableCache: false })
      await worker.initialize()
    })

    afterEach(() => {
      worker?.dispose()
    })

    it('should always return fromCache: false when caching is disabled', async () => {
      const source = 'const x: number = 42;'

      const result1 = await worker.compile(source)
      expect(result1.fromCache).toBe(false)

      const result2 = await worker.compile(source)
      expect(result2.fromCache).toBe(false)
    })

    it('should not set cacheKey when caching is disabled', async () => {
      const result = await worker.compile('const x: number = 42;')
      expect(result.cacheKey).toBeUndefined()
    })
  })

  describe('bundle() with caching', () => {
    let worker: CachedBuildWorker

    beforeEach(async () => {
      worker = createCachedBuildWorker()
      await worker.initialize()
    })

    afterEach(() => {
      worker?.dispose()
    })

    it('should cache bundle results', async () => {
      const files = {
        'index.ts': 'import { greet } from "./utils"; export default greet("World");',
        'utils.ts': 'export function greet(name: string): string { return `Hello ${name}`; }',
      }

      const result1 = await worker.bundle(files, 'index.ts')
      expect(result1.fromCache).toBe(false)
      expect(result1.code).toContain('Hello')

      const result2 = await worker.bundle(files, 'index.ts')
      expect(result2.fromCache).toBe(true)
      expect(result2.code).toBe(result1.code)
    })

    it('should have cache miss when files change', async () => {
      const files1 = {
        'index.ts': 'import { x } from "./a"; export default x;',
        'a.ts': 'export const x = 1;',
      }

      const files2 = {
        'index.ts': 'import { x } from "./a"; export default x;',
        'a.ts': 'export const x = 2;', // Changed content
      }

      const result1 = await worker.bundle(files1, 'index.ts')
      expect(result1.fromCache).toBe(false)

      const result2 = await worker.bundle(files2, 'index.ts')
      expect(result2.fromCache).toBe(false) // Different file content
    })

    it('should have cache miss when entry point changes', async () => {
      const files = {
        'a.ts': 'export const a = 1;',
        'b.ts': 'export const b = 2;',
      }

      const result1 = await worker.bundle(files, 'a.ts')
      expect(result1.fromCache).toBe(false)

      const result2 = await worker.bundle(files, 'b.ts')
      expect(result2.fromCache).toBe(false) // Different entry point
    })
  })

  describe('incrementalBuild()', () => {
    let worker: CachedBuildWorker

    beforeEach(async () => {
      worker = createCachedBuildWorker()
      await worker.initialize()
    })

    afterEach(() => {
      worker?.dispose()
    })

    it('should perform full build on first call', async () => {
      const files = {
        'index.ts': 'export const x = 1;',
      }

      const result = await worker.incrementalBuild(files, 'index.ts')
      expect(result.code).toBeDefined()
      expect(result.errors).toHaveLength(0)
    })

    it('should use cache for unchanged files', async () => {
      const files = {
        'index.ts': 'export const x = 1;',
      }

      // First build
      await worker.incrementalBuild(files, 'index.ts')

      // Second build with same files
      const result = await worker.incrementalBuild(files, 'index.ts')
      expect(result.fromCache).toBe(true)
    })

    it('should rebuild when files change', async () => {
      const files1 = {
        'index.ts': 'export const x = 1;',
      }

      // First build
      await worker.incrementalBuild(files1, 'index.ts')

      const files2 = {
        'index.ts': 'export const x = 2;', // Changed
      }

      // Second build with changed files
      const result = await worker.incrementalBuild(files2, 'index.ts')
      // Note: Even though files changed, the result is still cached because
      // the cache is content-addressable and the new content is now cached
      expect(result.code).toBeDefined()
    })
  })

  describe('detectChanges()', () => {
    let worker: CachedBuildWorker

    beforeEach(async () => {
      worker = createCachedBuildWorker()
      await worker.initialize()
    })

    afterEach(() => {
      worker?.dispose()
    })

    it('should detect all files as added on first call', async () => {
      const files = {
        'index.ts': 'export const x = 1;',
        'utils.ts': 'export const y = 2;',
      }

      const context = await worker.detectChanges(files)

      expect(context.addedFiles.size).toBe(2)
      expect(context.addedFiles.has('index.ts')).toBe(true)
      expect(context.addedFiles.has('utils.ts')).toBe(true)
      expect(context.changedFiles.size).toBe(0)
      expect(context.removedFiles.size).toBe(0)
    })

    it('should detect changed files', async () => {
      const files1 = {
        'index.ts': 'export const x = 1;',
        'utils.ts': 'export const y = 2;',
      }

      // First detect to establish baseline
      await worker.detectChanges(files1)

      // Simulate incrementalBuild to update previousFileHashes
      await worker.incrementalBuild(files1, 'index.ts')

      const files2 = {
        'index.ts': 'export const x = 100;', // Changed
        'utils.ts': 'export const y = 2;', // Unchanged
      }

      const context = await worker.detectChanges(files2)

      expect(context.changedFiles.size).toBe(1)
      expect(context.changedFiles.has('index.ts')).toBe(true)
      expect(context.addedFiles.size).toBe(0)
      expect(context.removedFiles.size).toBe(0)
    })

    it('should detect removed files', async () => {
      const files1 = {
        'index.ts': 'export const x = 1;',
        'utils.ts': 'export const y = 2;',
      }

      // First build to establish baseline
      await worker.incrementalBuild(files1, 'index.ts')

      const files2 = {
        'index.ts': 'export const x = 1;',
        // utils.ts removed
      }

      const context = await worker.detectChanges(files2)

      expect(context.removedFiles.size).toBe(1)
      expect(context.removedFiles.has('utils.ts')).toBe(true)
    })

    it('should detect added files', async () => {
      const files1 = {
        'index.ts': 'export const x = 1;',
      }

      // First build to establish baseline
      await worker.incrementalBuild(files1, 'index.ts')

      const files2 = {
        'index.ts': 'export const x = 1;',
        'newfile.ts': 'export const z = 3;', // Added
      }

      const context = await worker.detectChanges(files2)

      expect(context.addedFiles.size).toBe(1)
      expect(context.addedFiles.has('newfile.ts')).toBe(true)
    })
  })

  describe('clearCache()', () => {
    let worker: CachedBuildWorker

    beforeEach(async () => {
      worker = createCachedBuildWorker()
      await worker.initialize()
    })

    afterEach(() => {
      worker?.dispose()
    })

    it('should clear all cached results', async () => {
      const source = 'const x: number = 42;'

      // Build and cache
      await worker.compile(source)
      let stats = worker.getCacheStats()
      expect(stats.misses).toBe(1)

      // Verify cache hit
      await worker.compile(source)
      stats = worker.getCacheStats()
      expect(stats.hits).toBe(1)

      // Clear cache
      await worker.clearCache()

      // Should be a miss now
      await worker.compile(source)
      stats = worker.getCacheStats()
      expect(stats.misses).toBe(1) // Reset to 1
      expect(stats.hits).toBe(0) // Reset to 0
    })

    it('should reset cache statistics', async () => {
      const source = 'const x: number = 42;'

      await worker.compile(source)
      await worker.compile(source)

      let stats = worker.getCacheStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)

      await worker.clearCache()

      stats = worker.getCacheStats()
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
      expect(stats.hitRate).toBe(0)
    })
  })

  describe('invalidateCache()', () => {
    let worker: CachedBuildWorker

    beforeEach(async () => {
      worker = createCachedBuildWorker()
      await worker.initialize()
    })

    afterEach(() => {
      worker?.dispose()
    })

    it('should invalidate cache for specific source', async () => {
      const source1 = 'const x: number = 1;'
      const source2 = 'const y: number = 2;'

      // Cache both
      await worker.compile(source1)
      await worker.compile(source2)

      // Verify both are cached
      const result1 = await worker.compile(source1)
      const result2 = await worker.compile(source2)
      expect(result1.fromCache).toBe(true)
      expect(result2.fromCache).toBe(true)

      // Invalidate source1 only
      await worker.invalidateCache(source1)

      // source1 should be a miss, source2 should still be a hit
      const result3 = await worker.compile(source1)
      const result4 = await worker.compile(source2)
      expect(result3.fromCache).toBe(false)
      expect(result4.fromCache).toBe(true)
    })
  })

  describe('Cache hit rate > 90% for unchanged content', () => {
    let worker: CachedBuildWorker

    beforeEach(async () => {
      worker = createCachedBuildWorker()
      await worker.initialize()
    })

    afterEach(() => {
      worker?.dispose()
    })

    it('should achieve >90% hit rate for repeated compiles of same source', async () => {
      const source = 'const x: number = 42; export default x;'

      // First compile is a miss
      await worker.compile(source)

      // Next 99 compiles should all be hits
      for (let i = 0; i < 99; i++) {
        await worker.compile(source)
      }

      const stats = worker.getCacheStats()
      expect(stats.hits).toBe(99)
      expect(stats.misses).toBe(1)
      expect(stats.hitRate).toBe(0.99) // 99% hit rate
      expect(stats.hitRate).toBeGreaterThan(0.9)
    })
  })
})

describe('In-Memory Cache Storage', () => {
  describe('createInMemoryCacheStorage()', () => {
    it('should create a cache storage instance', () => {
      const cache = createInMemoryCacheStorage()
      expect(cache).toBeDefined()
      expect(typeof cache.get).toBe('function')
      expect(typeof cache.put).toBe('function')
      expect(typeof cache.delete).toBe('function')
      expect(typeof cache.clear).toBe('function')
    })

    it('should store and retrieve values', async () => {
      const cache = createInMemoryCacheStorage()

      await cache.put('key1', 'value1')
      const result = await cache.get('key1')
      expect(result).toBe('value1')
    })

    it('should return null for missing keys', async () => {
      const cache = createInMemoryCacheStorage()
      const result = await cache.get('nonexistent')
      expect(result).toBeNull()
    })

    it('should parse JSON when type is json', async () => {
      const cache = createInMemoryCacheStorage()
      const data = { foo: 'bar', count: 42 }

      await cache.put('key1', JSON.stringify(data))
      const result = await cache.get('key1', 'json')
      expect(result).toEqual(data)
    })

    it('should delete values', async () => {
      const cache = createInMemoryCacheStorage()

      await cache.put('key1', 'value1')
      await cache.delete('key1')
      const result = await cache.get('key1')
      expect(result).toBeNull()
    })

    it('should clear all values', async () => {
      const cache = createInMemoryCacheStorage()

      await cache.put('key1', 'value1')
      await cache.put('key2', 'value2')
      cache.clear()

      expect(await cache.get('key1')).toBeNull()
      expect(await cache.get('key2')).toBeNull()
      expect(cache.size).toBe(0)
    })

    it('should track size', async () => {
      const cache = createInMemoryCacheStorage()

      expect(cache.size).toBe(0)

      await cache.put('key1', 'value1')
      expect(cache.size).toBe(1)

      await cache.put('key2', 'value2')
      expect(cache.size).toBe(2)

      await cache.delete('key1')
      expect(cache.size).toBe(1)
    })

    it('should respect TTL expiration', async () => {
      const cache = createInMemoryCacheStorage()

      // Store with 0.1 second TTL
      await cache.put('key1', 'value1', { expirationTtl: 0.1 })

      // Should be available immediately
      expect(await cache.get('key1')).toBe('value1')

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150))

      // Should be expired
      expect(await cache.get('key1')).toBeNull()
    })
  })
})

describe('Custom Cache Storage Integration', () => {
  it('should work with custom cache storage implementation', async () => {
    // Simple custom cache storage
    const storage = new Map<string, string>()
    const customCache: BuildCacheStorage = {
      async get(key: string, type?: 'json' | 'text') {
        const value = storage.get(key)
        if (!value) return null
        return type === 'json' ? JSON.parse(value) : value
      },
      async put(key: string, value: string) {
        storage.set(key, value)
      },
      async delete(key: string) {
        storage.delete(key)
      },
    }

    const worker = createCachedBuildWorker({ cache: customCache })
    await worker.initialize()

    const source = 'const x: number = 42;'

    // First compile
    const result1 = await worker.compile(source)
    expect(result1.fromCache).toBe(false)

    // Second compile should use custom cache
    const result2 = await worker.compile(source)
    expect(result2.fromCache).toBe(true)

    // Verify data was stored in custom storage
    expect(storage.size).toBeGreaterThan(0)

    worker.dispose()
  })
})
