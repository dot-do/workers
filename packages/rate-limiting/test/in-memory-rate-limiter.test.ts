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
      vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
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
          vi.advanceTimersByTime(1500)

          // Allow any pending promises to resolve
          await vi.runAllTimersAsync()

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
          vi.advanceTimersByTime(600)
          await vi.runAllTimersAsync()

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

        // Advance time significantly
        vi.advanceTimersByTime(1000)

        // This should not throw - cleanup should have stopped
        // (We can't directly test that the interval stopped,
        // but we can verify no errors occur after disposal)
        expect(() => vi.runAllTimers()).not.toThrow()
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
            vi.advanceTimersByTime(150)
            await vi.runAllTimersAsync()
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
      vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] })
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

      // Advance time significantly (entries should become stale and be cleaned up)
      // Assuming bucket entries have an implicit TTL based on refill interval
      vi.advanceTimersByTime(10000)
      await vi.runAllTimersAsync()

      // Storage should be cleaned up
      // The exact behavior depends on implementation, but it shouldn't keep
      // all 100 entries indefinitely
      expect(limiter.storageSize).toBeLessThan(100)
    })

    it('should keep active user buckets during cleanup', async () => {
      // Create entries for two users
      await limiter.check('user:active')
      await limiter.check('user:inactive')

      // Advance time partway
      vi.advanceTimersByTime(2000)

      // Access active user's bucket
      await limiter.check('user:active')

      // Advance time to trigger cleanup
      vi.advanceTimersByTime(5000)
      await vi.runAllTimersAsync()

      // Active user should still have a bucket
      const activeResult = await limiter.check('user:active')
      expect(activeResult.remaining).toBeLessThan(10) // Should have state preserved

      // Inactive user's bucket may be cleaned up (depends on implementation)
      // At minimum, their state should be reset
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
  })
})
