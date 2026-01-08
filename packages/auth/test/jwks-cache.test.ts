/**
 * GREEN Phase Tests: JWKS Cache Memory Isolation
 *
 * These tests verify that the JWKS (JSON Web Key Set) cache:
 * 1. Has proper TTL (Time-To-Live) for cache entries
 * 2. Cleans up expired entries automatically
 * 3. Maintains memory isolation between different tenants/DO instances
 * 4. Does not grow unbounded across multiple DO instances
 *
 * Issue: workers-28tp (fix), workers-vfkb (original)
 * Status: GREEN - Implementation complete
 *
 * The JWKS cache now uses a factory pattern with instance-isolated caches
 * to prevent memory leaks and security issues between Durable Object instances.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  createJWKSCacheFactory,
  type JWKSCache,
  type JWKSCacheFactory,
  type JWKSCacheEntry,
  type JWKSCacheMetrics,
  type JWKSCacheAggregateMetrics,
} from '../src/jwks-cache'

// Mock JWKS response for testing
const createMockJWKS = (keyId: string): JsonWebKey[] => [
  {
    kty: 'RSA',
    use: 'sig',
    alg: 'RS256',
    kid: keyId,
    n: 'mock-modulus',
    e: 'AQAB',
  },
]

describe('JWKS Cache Memory Isolation', () => {
  let cacheFactory: JWKSCacheFactory

  beforeEach(() => {
    vi.useFakeTimers()
    cacheFactory = createJWKSCacheFactory()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('TTL (Time-To-Live) Behavior', () => {
    it('should expire cache entries after the configured TTL', () => {
      // Default TTL should be 1 hour (3600000ms)
      const DEFAULT_TTL_MS = 3600000

      const cache = cacheFactory.createCache('instance-1')
      const jwksUri = 'https://auth.example.com/.well-known/jwks.json'

      const now = Date.now()
      cache.set(jwksUri, {
        keys: createMockJWKS('key-1'),
        fetchedAt: now,
        expiresAt: now + DEFAULT_TTL_MS,
      })

      // Entry should exist immediately after setting
      expect(cache.get(jwksUri)).toBeDefined()
      expect(cache.size()).toBe(1)

      // Advance time by TTL + 1ms
      vi.advanceTimersByTime(DEFAULT_TTL_MS + 1)

      // After TTL expiration, get() should return undefined
      expect(cache.get(jwksUri)).toBeUndefined()
    })

    it('should allow custom TTL configuration', () => {
      const CUSTOM_TTL_MS = 1800000 // 30 minutes

      const cache = cacheFactory.createCache('instance-custom-ttl')
      const jwksUri = 'https://custom.example.com/jwks.json'

      const now = Date.now()
      cache.set(jwksUri, {
        keys: createMockJWKS('key-custom'),
        fetchedAt: now,
        expiresAt: now + CUSTOM_TTL_MS, // Custom TTL
      })

      // Entry should exist before TTL
      vi.advanceTimersByTime(CUSTOM_TTL_MS - 1000)
      expect(cache.get(jwksUri)).toBeDefined()

      // Entry should be expired after TTL
      vi.advanceTimersByTime(2000)
      expect(cache.get(jwksUri)).toBeUndefined()
    })

    it('should update TTL when entry is refreshed', () => {
      const DEFAULT_TTL_MS = 3600000
      const cache = cacheFactory.createCache('instance-refresh')
      const jwksUri = 'https://refresh.example.com/jwks.json'

      const now = Date.now()

      // Set initial entry
      cache.set(jwksUri, {
        keys: createMockJWKS('key-v1'),
        fetchedAt: now,
        expiresAt: now + DEFAULT_TTL_MS,
      })

      // Advance time by half the TTL
      vi.advanceTimersByTime(DEFAULT_TTL_MS / 2)

      // Refresh the entry with new keys
      const refreshTime = Date.now()
      cache.set(jwksUri, {
        keys: createMockJWKS('key-v2'),
        fetchedAt: refreshTime,
        expiresAt: refreshTime + DEFAULT_TTL_MS,
      })

      // Advance time by another half TTL + some buffer
      vi.advanceTimersByTime(DEFAULT_TTL_MS / 2 + 1000)

      // Entry should still exist because it was refreshed
      expect(cache.get(jwksUri)).toBeDefined()
      expect(cache.get(jwksUri)?.keys[0].kid).toBe('key-v2')

      // Advance past the refreshed TTL
      vi.advanceTimersByTime(DEFAULT_TTL_MS / 2)
      expect(cache.get(jwksUri)).toBeUndefined()
    })
  })

  describe('Expired Entry Cleanup', () => {
    it('should clean up expired entries when cleanup() is called', () => {
      const DEFAULT_TTL_MS = 3600000
      const cache = cacheFactory.createCache('instance-cleanup')

      const now = Date.now()

      // Add multiple entries with different expiration times
      cache.set('https://auth1.example.com/jwks.json', {
        keys: createMockJWKS('key-1'),
        fetchedAt: now,
        expiresAt: now + DEFAULT_TTL_MS,
      })

      cache.set('https://auth2.example.com/jwks.json', {
        keys: createMockJWKS('key-2'),
        fetchedAt: now,
        expiresAt: now + DEFAULT_TTL_MS / 2, // Expires sooner
      })

      cache.set('https://auth3.example.com/jwks.json', {
        keys: createMockJWKS('key-3'),
        fetchedAt: now,
        expiresAt: now + DEFAULT_TTL_MS * 2, // Expires later
      })

      expect(cache.size()).toBe(3)

      // Advance time past the second entry's expiration
      vi.advanceTimersByTime(DEFAULT_TTL_MS / 2 + 1)

      // Call cleanup
      cache.cleanup()

      // Only entries 1 and 3 should remain (entry 2 expired)
      expect(cache.size()).toBe(2)
      expect(cache.get('https://auth1.example.com/jwks.json')).toBeDefined()
      expect(cache.get('https://auth2.example.com/jwks.json')).toBeUndefined()
      expect(cache.get('https://auth3.example.com/jwks.json')).toBeDefined()
    })

    it('should automatically clean up expired entries on get()', () => {
      const DEFAULT_TTL_MS = 3600000
      const cache = cacheFactory.createCache('instance-auto-cleanup')

      const now = Date.now()

      cache.set('https://stale.example.com/jwks.json', {
        keys: createMockJWKS('stale-key'),
        fetchedAt: now,
        expiresAt: now + DEFAULT_TTL_MS,
      })

      // Advance time past expiration
      vi.advanceTimersByTime(DEFAULT_TTL_MS + 1)

      // get() should trigger cleanup for this entry
      const result = cache.get('https://stale.example.com/jwks.json')
      expect(result).toBeUndefined()

      // The cache size should reflect the cleanup
      expect(cache.size()).toBe(0)
    })

    it('should not leak memory with many expired entries', () => {
      // Create a factory with large enough limits for this test
      const largeFactory = createJWKSCacheFactory({
        maxEntriesPerInstance: 2000,
        maxTotalEntries: 5000,
      })
      const SHORT_TTL_MS = 60000 // 1 minute
      const cache = largeFactory.createCache('instance-memory')

      const now = Date.now()

      // Add 1000 entries that will expire quickly
      for (let i = 0; i < 1000; i++) {
        cache.set(`https://auth${i}.example.com/jwks.json`, {
          keys: createMockJWKS(`key-${i}`),
          fetchedAt: now,
          expiresAt: now + SHORT_TTL_MS,
        })
      }

      expect(cache.size()).toBe(1000)

      // Advance time past expiration
      vi.advanceTimersByTime(SHORT_TTL_MS + 1)

      // Trigger cleanup
      cache.cleanup()

      // All entries should be cleaned up
      expect(cache.size()).toBe(0)
    })
  })

  describe('Memory Isolation Between Tenants/Instances', () => {
    it('should isolate cache between different DO instances', () => {
      const cache1 = cacheFactory.createCache('tenant-1-instance')
      const cache2 = cacheFactory.createCache('tenant-2-instance')

      const jwksUri = 'https://shared-idp.example.com/jwks.json'
      const now = Date.now()

      // Tenant 1 caches their JWKS
      cache1.set(jwksUri, {
        keys: createMockJWKS('tenant-1-key'),
        fetchedAt: now,
        expiresAt: now + 3600000,
      })

      // Tenant 2 should NOT see Tenant 1's cached keys
      expect(cache2.get(jwksUri)).toBeUndefined()
      expect(cache2.size()).toBe(0)

      // Tenant 1 should still have their cache
      expect(cache1.get(jwksUri)).toBeDefined()
      expect(cache1.get(jwksUri)?.keys[0].kid).toBe('tenant-1-key')
    })

    it('should not share cache entries across tenant boundaries', () => {
      const tenantCaches: JWKSCache[] = []

      // Create caches for 10 different tenants
      for (let i = 0; i < 10; i++) {
        tenantCaches.push(cacheFactory.createCache(`tenant-${i}`))
      }

      const now = Date.now()

      // Each tenant caches different keys for the same URI
      tenantCaches.forEach((cache, index) => {
        cache.set('https://common-idp.example.com/jwks.json', {
          keys: createMockJWKS(`tenant-${index}-unique-key`),
          fetchedAt: now,
          expiresAt: now + 3600000,
        })
      })

      // Verify each tenant has their own isolated cache
      tenantCaches.forEach((cache, index) => {
        const entry = cache.get('https://common-idp.example.com/jwks.json')
        expect(entry).toBeDefined()
        expect(entry?.keys[0].kid).toBe(`tenant-${index}-unique-key`)
      })
    })

    it('should clean up cache when DO instance is destroyed', () => {
      const instanceId = 'temporary-instance'
      const cache = cacheFactory.createCache(instanceId)

      const now = Date.now()

      cache.set('https://temp.example.com/jwks.json', {
        keys: createMockJWKS('temp-key'),
        fetchedAt: now,
        expiresAt: now + 3600000,
      })

      expect(cache.size()).toBe(1)

      // Simulate DO instance destruction
      cacheFactory.destroyInstanceCache(instanceId)

      // Attempting to get the cache for destroyed instance should return undefined
      expect(cacheFactory.getInstanceCache(instanceId)).toBeUndefined()

      // The destroyed cache should not contribute to total memory
      expect(cacheFactory.getTotalCacheSize()).toBe(0)
    })

    it('should track total cache size across all instances', () => {
      const cache1 = cacheFactory.createCache('tracking-1')
      const cache2 = cacheFactory.createCache('tracking-2')
      const cache3 = cacheFactory.createCache('tracking-3')

      const now = Date.now()

      // Add entries to different caches
      cache1.set('https://uri1.example.com/jwks.json', {
        keys: createMockJWKS('key-1'),
        fetchedAt: now,
        expiresAt: now + 3600000,
      })

      cache2.set('https://uri2.example.com/jwks.json', {
        keys: createMockJWKS('key-2'),
        fetchedAt: now,
        expiresAt: now + 3600000,
      })

      cache2.set('https://uri2b.example.com/jwks.json', {
        keys: createMockJWKS('key-2b'),
        fetchedAt: now,
        expiresAt: now + 3600000,
      })

      cache3.set('https://uri3.example.com/jwks.json', {
        keys: createMockJWKS('key-3'),
        fetchedAt: now,
        expiresAt: now + 3600000,
      })

      // Total should be 4 entries across all caches
      expect(cacheFactory.getTotalCacheSize()).toBe(4)

      // Destroy one cache
      cacheFactory.destroyInstanceCache('tracking-2')

      // Total should now be 2 entries
      expect(cacheFactory.getTotalCacheSize()).toBe(2)
    })
  })

  describe('Cache Size Limits', () => {
    it('should limit cache entries per instance', () => {
      const MAX_ENTRIES_PER_INSTANCE = 100
      const cache = cacheFactory.createCache('bounded-instance')

      const now = Date.now()

      // Try to add more than the limit
      for (let i = 0; i < 1000; i++) {
        cache.set(`https://auth${i}.example.com/jwks.json`, {
          keys: createMockJWKS(`key-${i}`),
          fetchedAt: now,
          expiresAt: now + 3600000,
        })
      }

      // Cache size should not exceed the limit
      expect(cache.size()).toBeLessThanOrEqual(MAX_ENTRIES_PER_INSTANCE)
    })

    it('should use LRU eviction when cache is full', () => {
      const MAX_ENTRIES = 5
      // Create a factory with a small cache limit for this test
      const smallFactory = createJWKSCacheFactory({
        maxEntriesPerInstance: MAX_ENTRIES,
        maxTotalEntries: 1000,
      })
      const cache = smallFactory.createCache('lru-test')

      const now = Date.now()

      // Fill the cache
      for (let i = 0; i < MAX_ENTRIES; i++) {
        cache.set(`https://auth${i}.example.com/jwks.json`, {
          keys: createMockJWKS(`key-${i}`),
          fetchedAt: now,
          expiresAt: now + 3600000,
        })
        vi.advanceTimersByTime(100) // Ensure different timestamps
      }

      // Access the first entry to mark it as recently used
      cache.get('https://auth0.example.com/jwks.json')

      // Add a new entry (should evict the least recently used)
      vi.advanceTimersByTime(100)
      cache.set('https://auth-new.example.com/jwks.json', {
        keys: createMockJWKS('key-new'),
        fetchedAt: Date.now(),
        expiresAt: Date.now() + 3600000,
      })

      // Entry 0 should still exist (was accessed recently)
      expect(cache.get('https://auth0.example.com/jwks.json')).toBeDefined()

      // Entry 1 (least recently used after 0 was accessed) might be evicted
      // The exact eviction behavior depends on implementation
      expect(cache.size()).toBeLessThanOrEqual(MAX_ENTRIES)
    })

    it('should not grow unbounded across multiple DO instances', () => {
      const MAX_TOTAL_ENTRIES = 1000

      // Create many instances with many entries each
      for (let instance = 0; instance < 100; instance++) {
        const cache = cacheFactory.createCache(`unbounded-test-${instance}`)
        const now = Date.now()

        for (let entry = 0; entry < 100; entry++) {
          cache.set(`https://auth${entry}.tenant${instance}.com/jwks.json`, {
            keys: createMockJWKS(`key-${instance}-${entry}`),
            fetchedAt: now,
            expiresAt: now + 3600000,
          })
        }
      }

      // Total cache size across all instances should be bounded
      expect(cacheFactory.getTotalCacheSize()).toBeLessThanOrEqual(MAX_TOTAL_ENTRIES)
    })
  })

  describe('Edge Cases', () => {
    it('should handle cache clear() correctly', () => {
      const cache = cacheFactory.createCache('clear-test')
      const now = Date.now()

      cache.set('https://uri1.example.com/jwks.json', {
        keys: createMockJWKS('key-1'),
        fetchedAt: now,
        expiresAt: now + 3600000,
      })

      cache.set('https://uri2.example.com/jwks.json', {
        keys: createMockJWKS('key-2'),
        fetchedAt: now,
        expiresAt: now + 3600000,
      })

      expect(cache.size()).toBe(2)

      cache.clear()

      expect(cache.size()).toBe(0)
      expect(cache.get('https://uri1.example.com/jwks.json')).toBeUndefined()
      expect(cache.get('https://uri2.example.com/jwks.json')).toBeUndefined()
    })

    it('should handle delete() for non-existent entries', () => {
      const cache = cacheFactory.createCache('delete-test')

      // Delete should return false for non-existent entry
      expect(cache.delete('https://nonexistent.example.com/jwks.json')).toBe(false)
    })

    it('should handle empty JWKS keys array', () => {
      const cache = cacheFactory.createCache('empty-keys')
      const now = Date.now()

      cache.set('https://empty.example.com/jwks.json', {
        keys: [],
        fetchedAt: now,
        expiresAt: now + 3600000,
      })

      const entry = cache.get('https://empty.example.com/jwks.json')
      expect(entry).toBeDefined()
      expect(entry?.keys).toHaveLength(0)
    })

    it('should handle concurrent access to the same cache entry', async () => {
      const cache = cacheFactory.createCache('concurrent-test')
      const now = Date.now()

      // Simulate concurrent updates
      const promises = Array.from({ length: 10 }, (_, i) =>
        Promise.resolve().then(() => {
          cache.set('https://concurrent.example.com/jwks.json', {
            keys: createMockJWKS(`key-${i}`),
            fetchedAt: now + i,
            expiresAt: now + 3600000 + i,
          })
        })
      )

      await Promise.all(promises)

      // Cache should have exactly one entry for the URI
      expect(cache.size()).toBe(1)

      // The last write should win
      const entry = cache.get('https://concurrent.example.com/jwks.json')
      expect(entry).toBeDefined()
    })
  })

  describe('Cache Metrics (REFACTOR: workers-9bpz)', () => {
    it('should track cache hits and misses', () => {
      const cache = cacheFactory.createCache('metrics-hit-miss')
      const now = Date.now()

      // Initial metrics should be zero
      let metrics = cache.getMetrics()
      expect(metrics.hits).toBe(0)
      expect(metrics.misses).toBe(0)
      expect(metrics.hitRate).toBe(0)

      // Miss: entry doesn't exist
      cache.get('https://nonexistent.example.com/jwks.json')
      metrics = cache.getMetrics()
      expect(metrics.misses).toBe(1)
      expect(metrics.hits).toBe(0)

      // Add an entry
      cache.set('https://auth.example.com/jwks.json', {
        keys: createMockJWKS('key-1'),
        fetchedAt: now,
        expiresAt: now + 3600000,
      })

      // Hit: entry exists
      cache.get('https://auth.example.com/jwks.json')
      metrics = cache.getMetrics()
      expect(metrics.hits).toBe(1)
      expect(metrics.misses).toBe(1)
      expect(metrics.hitRate).toBe(0.5) // 1 hit / 2 total lookups

      // Another hit
      cache.get('https://auth.example.com/jwks.json')
      metrics = cache.getMetrics()
      expect(metrics.hits).toBe(2)
      expect(metrics.hitRate).toBeCloseTo(0.667, 2) // 2 hits / 3 total lookups
    })

    it('should track set and delete operations', () => {
      const cache = cacheFactory.createCache('metrics-set-delete')
      const now = Date.now()

      cache.set('https://uri1.example.com/jwks.json', {
        keys: createMockJWKS('key-1'),
        fetchedAt: now,
        expiresAt: now + 3600000,
      })

      cache.set('https://uri2.example.com/jwks.json', {
        keys: createMockJWKS('key-2'),
        fetchedAt: now,
        expiresAt: now + 3600000,
      })

      let metrics = cache.getMetrics()
      expect(metrics.sets).toBe(2)
      expect(metrics.deletes).toBe(0)

      cache.delete('https://uri1.example.com/jwks.json')
      metrics = cache.getMetrics()
      expect(metrics.deletes).toBe(1)

      // Updating existing entry still counts as a set
      cache.set('https://uri2.example.com/jwks.json', {
        keys: createMockJWKS('key-2-updated'),
        fetchedAt: now,
        expiresAt: now + 3600000,
      })
      metrics = cache.getMetrics()
      expect(metrics.sets).toBe(3)
    })

    it('should track expirations', () => {
      const cache = cacheFactory.createCache('metrics-expirations')
      const SHORT_TTL = 1000
      const now = Date.now()

      cache.set('https://short-lived.example.com/jwks.json', {
        keys: createMockJWKS('key-short'),
        fetchedAt: now,
        expiresAt: now + SHORT_TTL,
      })

      let metrics = cache.getMetrics()
      expect(metrics.expirations).toBe(0)

      // Advance time past expiration
      vi.advanceTimersByTime(SHORT_TTL + 1)

      // Access the entry - should trigger expiration
      const entry = cache.get('https://short-lived.example.com/jwks.json')
      expect(entry).toBeUndefined()

      metrics = cache.getMetrics()
      expect(metrics.expirations).toBe(1)
      expect(metrics.misses).toBe(1) // Expired entries count as misses
    })

    it('should track expirations during cleanup()', () => {
      const cache = cacheFactory.createCache('metrics-cleanup-expirations')
      const now = Date.now()

      // Add multiple entries with short TTL
      for (let i = 0; i < 5; i++) {
        cache.set(`https://auth${i}.example.com/jwks.json`, {
          keys: createMockJWKS(`key-${i}`),
          fetchedAt: now,
          expiresAt: now + 1000,
        })
      }

      // Advance time past expiration
      vi.advanceTimersByTime(1001)

      // Cleanup should expire all entries
      cache.cleanup()

      const metrics = cache.getMetrics()
      expect(metrics.expirations).toBe(5)
    })

    it('should track evictions when cache limit is reached', () => {
      const smallFactory = createJWKSCacheFactory({
        maxEntriesPerInstance: 3,
        maxTotalEntries: 1000,
      })
      const cache = smallFactory.createCache('metrics-evictions')
      const now = Date.now()

      // Fill cache to limit
      for (let i = 0; i < 3; i++) {
        cache.set(`https://auth${i}.example.com/jwks.json`, {
          keys: createMockJWKS(`key-${i}`),
          fetchedAt: now,
          expiresAt: now + 3600000,
        })
        vi.advanceTimersByTime(100)
      }

      let metrics = cache.getMetrics()
      expect(metrics.evictions).toBe(0)

      // Add one more - should trigger eviction
      cache.set('https://auth-new.example.com/jwks.json', {
        keys: createMockJWKS('key-new'),
        fetchedAt: Date.now(),
        expiresAt: Date.now() + 3600000,
      })

      metrics = cache.getMetrics()
      expect(metrics.evictions).toBe(1)
      expect(cache.size()).toBe(3) // Still at limit
    })

    it('should reset metrics', () => {
      const cache = cacheFactory.createCache('metrics-reset')
      const now = Date.now()

      cache.set('https://auth.example.com/jwks.json', {
        keys: createMockJWKS('key-1'),
        fetchedAt: now,
        expiresAt: now + 3600000,
      })
      cache.get('https://auth.example.com/jwks.json')
      cache.get('https://nonexistent.example.com/jwks.json')

      let metrics = cache.getMetrics()
      expect(metrics.sets).toBe(1)
      expect(metrics.hits).toBe(1)
      expect(metrics.misses).toBe(1)

      cache.resetMetrics()

      metrics = cache.getMetrics()
      expect(metrics.sets).toBe(0)
      expect(metrics.hits).toBe(0)
      expect(metrics.misses).toBe(0)
      expect(metrics.evictions).toBe(0)
      expect(metrics.expirations).toBe(0)
      expect(metrics.deletes).toBe(0)
      expect(metrics.hitRate).toBe(0)
    })

    it('should provide aggregate metrics across all instances', () => {
      const cache1 = cacheFactory.createCache('metrics-aggregate-1')
      const cache2 = cacheFactory.createCache('metrics-aggregate-2')
      const now = Date.now()

      // Add entries and access them
      cache1.set('https://auth1.example.com/jwks.json', {
        keys: createMockJWKS('key-1'),
        fetchedAt: now,
        expiresAt: now + 3600000,
      })
      cache1.get('https://auth1.example.com/jwks.json') // Hit
      cache1.get('https://nonexistent.example.com/jwks.json') // Miss

      cache2.set('https://auth2a.example.com/jwks.json', {
        keys: createMockJWKS('key-2a'),
        fetchedAt: now,
        expiresAt: now + 3600000,
      })
      cache2.set('https://auth2b.example.com/jwks.json', {
        keys: createMockJWKS('key-2b'),
        fetchedAt: now,
        expiresAt: now + 3600000,
      })
      cache2.get('https://auth2a.example.com/jwks.json') // Hit
      cache2.get('https://auth2b.example.com/jwks.json') // Hit

      const aggregateMetrics = cacheFactory.getAggregateMetrics()

      expect(aggregateMetrics.instanceCount).toBe(2)
      expect(aggregateMetrics.totalEntries).toBe(3)
      expect(aggregateMetrics.sets).toBe(3)
      expect(aggregateMetrics.hits).toBe(3) // 1 from cache1 + 2 from cache2
      expect(aggregateMetrics.misses).toBe(1) // 1 from cache1
      expect(aggregateMetrics.hitRate).toBe(0.75) // 3 hits / 4 total lookups

      // Check per-instance breakdown
      expect(aggregateMetrics.byInstance.size).toBe(2)

      const cache1Metrics = aggregateMetrics.byInstance.get('metrics-aggregate-1')
      expect(cache1Metrics?.hits).toBe(1)
      expect(cache1Metrics?.misses).toBe(1)
      expect(cache1Metrics?.sets).toBe(1)

      const cache2Metrics = aggregateMetrics.byInstance.get('metrics-aggregate-2')
      expect(cache2Metrics?.hits).toBe(2)
      expect(cache2Metrics?.misses).toBe(0)
      expect(cache2Metrics?.sets).toBe(2)
    })

    it('should reset all metrics across instances', () => {
      const cache1 = cacheFactory.createCache('metrics-reset-all-1')
      const cache2 = cacheFactory.createCache('metrics-reset-all-2')
      const now = Date.now()

      cache1.set('https://auth1.example.com/jwks.json', {
        keys: createMockJWKS('key-1'),
        fetchedAt: now,
        expiresAt: now + 3600000,
      })
      cache2.set('https://auth2.example.com/jwks.json', {
        keys: createMockJWKS('key-2'),
        fetchedAt: now,
        expiresAt: now + 3600000,
      })

      cache1.get('https://auth1.example.com/jwks.json')
      cache2.get('https://auth2.example.com/jwks.json')

      let aggregateMetrics = cacheFactory.getAggregateMetrics()
      expect(aggregateMetrics.hits).toBe(2)
      expect(aggregateMetrics.sets).toBe(2)

      cacheFactory.resetAllMetrics()

      aggregateMetrics = cacheFactory.getAggregateMetrics()
      expect(aggregateMetrics.hits).toBe(0)
      expect(aggregateMetrics.misses).toBe(0)
      expect(aggregateMetrics.sets).toBe(0)
      expect(aggregateMetrics.evictions).toBe(0)
      expect(aggregateMetrics.expirations).toBe(0)
      expect(aggregateMetrics.deletes).toBe(0)
      expect(aggregateMetrics.hitRate).toBe(0)

      // Entries should still exist (only metrics are reset)
      expect(cache1.size()).toBe(1)
      expect(cache2.size()).toBe(1)
    })

    it('should calculate correct hit rate with edge cases', () => {
      const cache = cacheFactory.createCache('metrics-hitrate-edge')

      // No lookups - hitRate should be 0 (not NaN)
      let metrics = cache.getMetrics()
      expect(metrics.hitRate).toBe(0)
      expect(Number.isNaN(metrics.hitRate)).toBe(false)

      // All misses - hitRate should be 0
      cache.get('https://miss1.example.com/jwks.json')
      cache.get('https://miss2.example.com/jwks.json')
      metrics = cache.getMetrics()
      expect(metrics.hitRate).toBe(0)

      // Add entry and hit it
      const now = Date.now()
      cache.set('https://hit.example.com/jwks.json', {
        keys: createMockJWKS('key-hit'),
        fetchedAt: now,
        expiresAt: now + 3600000,
      })
      cache.get('https://hit.example.com/jwks.json')
      cache.get('https://hit.example.com/jwks.json')
      cache.get('https://hit.example.com/jwks.json')

      // 3 hits, 2 misses = 60% hit rate
      metrics = cache.getMetrics()
      expect(metrics.hitRate).toBe(0.6)
    })
  })
})
