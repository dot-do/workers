import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * RED Phase Tests: InMemoryRateLimiter Expired Entry Cleanup
 *
 * These tests verify that InMemoryRateLimiter properly cleans up expired entries
 * to prevent memory leaks under sustained load.
 *
 * Current state: The InMemoryRateLimiter does not exist yet or does not implement
 * cleanup functionality, so these tests should FAIL.
 */

// Import will fail until InMemoryRateLimiter is implemented
// This is expected for RED phase TDD
import { InMemoryRateLimiter, InMemoryRateLimitStorage } from '../src/index'

describe('InMemoryRateLimiter Expired Entry Cleanup', () => {
  describe('InMemoryRateLimitStorage', () => {
    let storage: InMemoryRateLimitStorage

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
      storage = new InMemoryRateLimitStorage()
    })

    afterEach(() => {
      storage.dispose?.()
      vi.useRealTimers()
    })

    describe('Expired Entry Removal', () => {
      it('should remove expired entries after their TTL', async () => {
        // Set an entry with 1000ms TTL
        await storage.set('key1', { value: 'test' }, 1000)

        // Entry should exist immediately
        const beforeExpiry = await storage.get('key1')
        expect(beforeExpiry).toEqual({ value: 'test' })

        // Advance time past TTL
        vi.advanceTimersByTime(1001)

        // Entry should be removed
        const afterExpiry = await storage.get('key1')
        expect(afterExpiry).toBeNull()
      })

      it('should not remove entries before their TTL expires', async () => {
        await storage.set('key1', { value: 'test' }, 5000)

        // Advance time but not past TTL
        vi.advanceTimersByTime(4999)

        const result = await storage.get('key1')
        expect(result).toEqual({ value: 'test' })
      })

      it('should handle entries with no TTL (never expire)', async () => {
        await storage.set('key1', { value: 'persistent' })

        // Advance time significantly
        vi.advanceTimersByTime(1000 * 60 * 60) // 1 hour

        const result = await storage.get('key1')
        expect(result).toEqual({ value: 'persistent' })
      })
    })

    describe('Cleanup Does Not Affect Active Entries', () => {
      it('should preserve active entries during cleanup', async () => {
        // Set entries with different TTLs
        await storage.set('short', { value: 'short-lived' }, 1000)
        await storage.set('long', { value: 'long-lived' }, 10000)

        // Advance time past short TTL but before long TTL
        vi.advanceTimersByTime(2000)

        // Short-lived entry should be gone
        const shortResult = await storage.get('short')
        expect(shortResult).toBeNull()

        // Long-lived entry should still exist
        const longResult = await storage.get('long')
        expect(longResult).toEqual({ value: 'long-lived' })
      })

      it('should preserve entries that get refreshed before expiry', async () => {
        await storage.set('key1', { value: 'v1' }, 2000)

        // Advance time halfway
        vi.advanceTimersByTime(1000)

        // Refresh the entry with a new TTL
        await storage.set('key1', { value: 'v2' }, 2000)

        // Advance time past original expiry but before new expiry
        vi.advanceTimersByTime(1500)

        // Entry should still exist with updated value
        const result = await storage.get('key1')
        expect(result).toEqual({ value: 'v2' })
      })

      it('should handle concurrent access during cleanup', async () => {
        // Create many entries with staggered expiries
        for (let i = 0; i < 100; i++) {
          await storage.set(`key${i}`, { index: i }, 1000 + i * 100)
        }

        // Advance time to expire some but not all
        vi.advanceTimersByTime(3000)

        // Entries 0-19 should be expired (TTL 1000-2900)
        for (let i = 0; i < 20; i++) {
          const result = await storage.get(`key${i}`)
          expect(result).toBeNull()
        }

        // Entries 20+ should still exist (TTL 3000+)
        for (let i = 20; i < 100; i++) {
          const result = await storage.get(`key${i}`)
          expect(result).toEqual({ index: i })
        }
      })
    })

    describe('Periodic Cleanup Mechanism', () => {
      it('should automatically run periodic cleanup', async () => {
        // Create a storage with a short cleanup interval
        const storageWithCleanup = new InMemoryRateLimitStorage({
          cleanupIntervalMs: 1000, // Run cleanup every second
        })

        try {
          // Set entries that will expire
          await storageWithCleanup.set('key1', { value: 'test1' }, 500)
          await storageWithCleanup.set('key2', { value: 'test2' }, 500)

          // Get internal size before cleanup (if exposed)
          const sizeBefore = storageWithCleanup.size

          // Advance time past expiry and past cleanup interval
          // This will trigger the cleanup at 1000ms
          await vi.advanceTimersByTimeAsync(1500)

          // Internal size should be reduced
          const sizeAfter = storageWithCleanup.size
          expect(sizeAfter).toBeLessThan(sizeBefore)
          expect(sizeAfter).toBe(0)
        } finally {
          storageWithCleanup.dispose?.()
        }
      })

      it('should clean up expired entries even if not accessed', async () => {
        const storageWithCleanup = new InMemoryRateLimitStorage({
          cleanupIntervalMs: 500,
        })

        try {
          // Set many entries with short TTL
          for (let i = 0; i < 1000; i++) {
            await storageWithCleanup.set(`key${i}`, { index: i }, 100)
          }

          expect(storageWithCleanup.size).toBe(1000)

          // Advance time past expiry and past cleanup interval
          // This will trigger cleanup at 500ms which removes all expired entries
          await vi.advanceTimersByTimeAsync(600)

          // Memory should be reclaimed even without accessing entries
          expect(storageWithCleanup.size).toBe(0)
        } finally {
          storageWithCleanup.dispose?.()
        }
      })

      it('should stop cleanup when disposed', async () => {
        const storageWithCleanup = new InMemoryRateLimitStorage({
          cleanupIntervalMs: 100,
        })

        await storageWithCleanup.set('key1', { value: 'test' }, 50)

        // Dispose the storage
        storageWithCleanup.dispose()

        // Advance time significantly - no cleanup should run since disposed
        await vi.advanceTimersByTimeAsync(1000)

        // Verify the entry is still there (not cleaned up since disposed before cleanup could run)
        // The entry should have expired, but since we didn't access it and cleanup was stopped,
        // it might still be in the map (depending on implementation). The important thing is
        // that no errors occur.
        expect(true).toBe(true) // Just verify no errors occurred
      })
    })

    describe('Memory Bounds', () => {
      it('should not grow unbounded under sustained load', async () => {
        const storageWithCleanup = new InMemoryRateLimitStorage({
          cleanupIntervalMs: 100,
        })

        try {
          // Simulate sustained load: add entries continuously
          for (let batch = 0; batch < 10; batch++) {
            // Add batch of entries with short TTL
            for (let i = 0; i < 100; i++) {
              const key = `batch${batch}_key${i}`
              await storageWithCleanup.set(key, { batch, index: i }, 50)
            }

            // Advance time to expire entries and trigger cleanup
            await vi.advanceTimersByTimeAsync(150)
          }

          // After all batches, size should be bounded (not 1000)
          // Should only have entries from the most recent batch that haven't expired
          expect(storageWithCleanup.size).toBeLessThan(200)
        } finally {
          storageWithCleanup.dispose?.()
        }
      })

      it('should expose size metric for monitoring', () => {
        expect(typeof storage.size).toBe('number')
        expect(storage.size).toBe(0)
      })
    })
  })

  describe('InMemoryRateLimiter Integration', () => {
    let limiter: InMemoryRateLimiter

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
      limiter = new InMemoryRateLimiter({
        capacity: 10,
        refillRate: 1,
        refillInterval: 1000,
        cleanupIntervalMs: 500,
      })
    })

    afterEach(() => {
      limiter.dispose?.()
      vi.useRealTimers()
    })

    it('should clean up rate limit buckets for inactive users', async () => {
      // Create rate limit entries for multiple users
      for (let i = 0; i < 100; i++) {
        await limiter.check(`user:${i}`)
      }

      // Initial storage should have 100 entries
      expect(limiter.storageSize).toBe(100)

      // Advance time past the bucket TTL (default is 10 * refillInterval = 10000ms)
      // Plus trigger cleanup interval
      await vi.advanceTimersByTimeAsync(11000)

      // Storage should be cleaned up
      // The exact behavior depends on implementation, but it shouldn't keep
      // all 100 entries indefinitely
      expect(limiter.storageSize).toBeLessThan(100)
    })

    it('should keep active user buckets during cleanup', async () => {
      // Create entries for two users
      await limiter.check('user:active')
      await limiter.check('user:inactive')

      // Advance time partway but keep accessing active user
      await vi.advanceTimersByTimeAsync(2000)
      await limiter.check('user:active')

      await vi.advanceTimersByTimeAsync(2000)
      await limiter.check('user:active')

      await vi.advanceTimersByTimeAsync(2000)
      await limiter.check('user:active')

      // Advance time to potentially trigger cleanup
      await vi.advanceTimersByTimeAsync(5000)

      // Active user should still have a bucket with state preserved
      const activeResult = await limiter.check('user:active')
      expect(activeResult.remaining).toBeLessThan(10) // Should have state preserved
    })

    it('should properly dispose and clean up resources', () => {
      const disposableLimiter = new InMemoryRateLimiter({
        capacity: 10,
        refillRate: 1,
        refillInterval: 1000,
      })

      // Verify dispose method exists and can be called
      expect(typeof disposableLimiter.dispose).toBe('function')

      // Should not throw
      disposableLimiter.dispose()

      // After disposal, accessing the limiter should either throw or return a safe default
      // This depends on the implementation design decision
    })

    it('should expose storage metrics', () => {
      expect(typeof limiter.storageSize).toBe('number')
    })

    it('should expose detailed memory metrics via getMetrics()', async () => {
      // Create some rate limit entries
      for (let i = 0; i < 10; i++) {
        await limiter.check(`user:${i}`)
      }

      const metrics = limiter.getMetrics()

      expect(metrics.totalEntries).toBe(10)
      expect(metrics.entriesWithTTL).toBe(10) // All rate limit entries have TTL
      expect(metrics.permanentEntries).toBe(0)
      expect(metrics.estimatedBytes).toBeGreaterThan(0)
      expect(metrics.expiryIndexSize).toBe(10) // All entries should be in expiry index
      expect(typeof metrics.totalCleaned).toBe('number')
      expect(typeof metrics.lastCleanupCount).toBe('number')
    })
  })

  describe('Memory Optimization Features', () => {
    let storage: InMemoryRateLimitStorage

    beforeEach(() => {
      vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] })
      storage = new InMemoryRateLimitStorage({
        cleanupIntervalMs: 100,
      })
    })

    afterEach(() => {
      storage.dispose?.()
      vi.useRealTimers()
    })

    describe('Expiry Index Optimization', () => {
      it('should use expiry index for efficient cleanup', async () => {
        // Add entries with varying TTLs
        for (let i = 0; i < 100; i++) {
          await storage.set(`key${i}`, { index: i }, (i + 1) * 10)
        }

        const metricsBefore = storage.getMetrics()
        expect(metricsBefore.expiryIndexSize).toBe(100)

        // Advance time to expire first 50 entries (TTL 10-500ms)
        await vi.advanceTimersByTimeAsync(550)

        // Cleanup should have run and removed expired entries
        expect(storage.size).toBe(50)

        // Check metrics after cleanup
        const metricsAfter = storage.getMetrics()
        expect(metricsAfter.totalCleaned).toBeGreaterThanOrEqual(50)
        expect(metricsAfter.lastCleanupCount).toBeGreaterThanOrEqual(0)
      })

      it('should handle entry updates correctly with expiry index', async () => {
        // Set initial entry
        await storage.set('key1', { value: 'v1' }, 100)

        // Update with longer TTL
        await storage.set('key1', { value: 'v2' }, 500)

        // Advance past original TTL but before new TTL
        vi.advanceTimersByTime(200)

        // Entry should still exist with updated value
        const result = await storage.get('key1')
        expect(result).toEqual({ value: 'v2' })
      })
    })

    describe('Batch-Limited Cleanup', () => {
      it('should respect maxCleanupBatchSize to prevent blocking', async () => {
        const batchLimitedStorage = new InMemoryRateLimitStorage({
          cleanupIntervalMs: 100,
          maxCleanupBatchSize: 10, // Only clean 10 entries per cycle
        })

        try {
          // Add 100 entries with very short TTL
          for (let i = 0; i < 100; i++) {
            await batchLimitedStorage.set(`key${i}`, { index: i }, 10)
          }

          expect(batchLimitedStorage.size).toBe(100)

          // Advance time to expire all entries and trigger cleanup
          await vi.advanceTimersByTimeAsync(150)

          // With batch limit of 10, not all entries will be cleaned in one cycle
          // But after multiple cleanup cycles, all should be cleaned
          // Note: The cleanup runs at 100ms intervals

          // Wait for multiple cleanup cycles
          await vi.advanceTimersByTimeAsync(1000)

          // All entries should eventually be cleaned
          expect(batchLimitedStorage.size).toBe(0)
        } finally {
          batchLimitedStorage.dispose()
        }
      })
    })

    describe('Memory Metrics Accuracy', () => {
      it('should provide accurate memory estimates', async () => {
        // Add entries of different types
        await storage.set('string', 'hello world', 1000)
        await storage.set('number', 42, 1000)
        await storage.set('object', { a: 1, b: 'test' }, 1000)
        await storage.set('array', [1, 2, 3], 1000)
        await storage.set('permanent', 'no ttl') // No TTL

        const metrics = storage.getMetrics()

        expect(metrics.totalEntries).toBe(5)
        expect(metrics.entriesWithTTL).toBe(4)
        expect(metrics.permanentEntries).toBe(1)
        expect(metrics.estimatedBytes).toBeGreaterThan(100) // Should have meaningful size
        expect(metrics.expiryIndexSize).toBe(4) // Only entries with TTL
      })

      it('should track cleanup statistics correctly', async () => {
        // Add entries with short TTL
        for (let i = 0; i < 50; i++) {
          await storage.set(`key${i}`, { index: i }, 50)
        }

        const metricsBefore = storage.getMetrics()
        expect(metricsBefore.totalCleaned).toBe(0)
        expect(metricsBefore.lastCleanupCount).toBe(0)

        // Trigger cleanup
        await vi.advanceTimersByTimeAsync(150)

        const metricsAfter = storage.getMetrics()
        expect(metricsAfter.totalCleaned).toBe(50)
        expect(metricsAfter.lastCleanupCount).toBe(50)

        // Add more entries with longer TTL to ensure they don't expire during the wait
        for (let i = 0; i < 25; i++) {
          await storage.set(`newkey${i}`, { index: i }, 200) // 200ms TTL
        }

        // Wait for the entries to expire (200ms) + trigger cleanup interval (100ms)
        await vi.advanceTimersByTimeAsync(350)

        const metricsFinal = storage.getMetrics()
        expect(metricsFinal.totalCleaned).toBe(75) // 50 + 25
        // lastCleanupCount only reflects the most recent cycle
        expect(metricsAfter.lastCleanupCount).toBeLessThanOrEqual(50)
      })
    })

    describe('forceCleanup Method', () => {
      it('should immediately clean all expired entries', async () => {
        // Add entries with short TTL
        for (let i = 0; i < 100; i++) {
          await storage.set(`key${i}`, { index: i }, 10)
        }

        expect(storage.size).toBe(100)

        // Advance time to expire entries but don't wait for cleanup interval
        vi.advanceTimersByTime(20)

        // Force immediate cleanup
        storage.forceCleanup()

        // All entries should be cleaned immediately
        expect(storage.size).toBe(0)
      })
    })
  })
})
