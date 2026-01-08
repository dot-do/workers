import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  BoundedSet,
  BoundedMap,
  createBoundedSet,
  createBoundedMap,
  type BoundedSetOptions,
  type BoundedMapOptions,
  type BoundedSetExtendedStats,
  type BoundedMapExtendedStats,
  type EvictionPolicy,
} from '../src/bounded-set.js'

/**
 * RED PHASE TESTS: Branded type Sets memory bounds
 *
 * These tests define the expected behavior for bounded Sets that prevent
 * memory leaks when tracking branded types (like validated IDs, tokens, nonces).
 *
 * The implementation should:
 * - Limit Set size to prevent unbounded growth
 * - Evict old entries when limit is reached
 * - Support different eviction policies (FIFO, LRU, time-based)
 * - Maintain Set semantics (no duplicates, has/add/delete)
 *
 * All tests should FAIL initially (RED phase) until implementation is complete.
 */

describe('BoundedSet - Memory Bounds for Branded Types', () => {
  describe('Basic Size Limits', () => {
    it('should enforce maximum size limit', () => {
      const set = new BoundedSet<string>({ maxSize: 5 })

      // Add 10 items
      for (let i = 0; i < 10; i++) {
        set.add(`item-${i}`)
      }

      // Size should never exceed maxSize
      expect(set.size).toBeLessThanOrEqual(5)
    })

    it('should maintain exactly maxSize items when full', () => {
      const set = new BoundedSet<string>({ maxSize: 100 })

      // Add exactly maxSize items
      for (let i = 0; i < 100; i++) {
        set.add(`id-${i}`)
      }

      expect(set.size).toBe(100)

      // Add one more - size should still be 100
      set.add('id-overflow')
      expect(set.size).toBe(100)
    })

    it('should return the configured maxSize', () => {
      const set = new BoundedSet<string>({ maxSize: 1000 })
      expect(set.maxSize).toBe(1000)
    })

    it('should throw on invalid maxSize', () => {
      expect(() => new BoundedSet<string>({ maxSize: 0 })).toThrow()
      expect(() => new BoundedSet<string>({ maxSize: -1 })).toThrow()
      expect(() => new BoundedSet<string>({ maxSize: NaN })).toThrow()
    })

    it('should have a default maxSize if not specified', () => {
      const set = new BoundedSet<string>()
      expect(set.maxSize).toBeGreaterThan(0)
      expect(set.maxSize).toBe(10000) // Expected default
    })
  })

  describe('FIFO Eviction Policy', () => {
    it('should evict oldest entries first (FIFO)', () => {
      const set = new BoundedSet<string>({ maxSize: 3, evictionPolicy: 'fifo' })

      set.add('first')
      set.add('second')
      set.add('third')

      // Add fourth item - should evict 'first'
      set.add('fourth')

      expect(set.has('first')).toBe(false)
      expect(set.has('second')).toBe(true)
      expect(set.has('third')).toBe(true)
      expect(set.has('fourth')).toBe(true)
    })

    it('should evict multiple items in FIFO order', () => {
      const set = new BoundedSet<string>({ maxSize: 3, evictionPolicy: 'fifo' })

      set.add('a')
      set.add('b')
      set.add('c')
      set.add('d') // evicts 'a'
      set.add('e') // evicts 'b'

      expect(set.has('a')).toBe(false)
      expect(set.has('b')).toBe(false)
      expect(set.has('c')).toBe(true)
      expect(set.has('d')).toBe(true)
      expect(set.has('e')).toBe(true)
    })

    it('should not count re-adding existing item as new', () => {
      const set = new BoundedSet<string>({ maxSize: 3, evictionPolicy: 'fifo' })

      set.add('a')
      set.add('b')
      set.add('c')
      set.add('a') // Re-add existing item - should NOT evict anything

      expect(set.size).toBe(3)
      expect(set.has('a')).toBe(true)
      expect(set.has('b')).toBe(true)
      expect(set.has('c')).toBe(true)
    })
  })

  describe('LRU Eviction Policy', () => {
    it('should evict least recently used entries', () => {
      const set = new BoundedSet<string>({ maxSize: 3, evictionPolicy: 'lru' })

      set.add('first')
      set.add('second')
      set.add('third')

      // Access 'first' to make it recently used
      set.has('first') // This should update LRU tracking

      // Add fourth item - should evict 'second' (least recently used)
      set.add('fourth')

      expect(set.has('first')).toBe(true) // Was accessed, so not evicted
      expect(set.has('second')).toBe(false) // Least recently used, evicted
      expect(set.has('third')).toBe(true)
      expect(set.has('fourth')).toBe(true)
    })

    it('should update LRU order on re-add', () => {
      const set = new BoundedSet<string>({ maxSize: 3, evictionPolicy: 'lru' })

      set.add('a')
      set.add('b')
      set.add('c')
      set.add('a') // Re-add 'a' - should update its position to most recent
      set.add('d') // Should evict 'b' (now least recently used)

      expect(set.has('a')).toBe(true)
      expect(set.has('b')).toBe(false)
      expect(set.has('c')).toBe(true)
      expect(set.has('d')).toBe(true)
    })
  })

  describe('Time-Based Eviction (TTL)', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('should evict entries after TTL expires', async () => {
      const set = new BoundedSet<string>({
        maxSize: 100,
        ttlMs: 1000, // 1 second TTL
      })

      set.add('token-1')
      expect(set.has('token-1')).toBe(true)

      // Advance time past TTL
      vi.advanceTimersByTime(1500)

      // Entry should be evicted
      expect(set.has('token-1')).toBe(false)
    })

    it('should not evict entries before TTL expires', () => {
      const set = new BoundedSet<string>({
        maxSize: 100,
        ttlMs: 5000, // 5 second TTL
      })

      set.add('token-1')

      // Advance time but not past TTL
      vi.advanceTimersByTime(3000)

      expect(set.has('token-1')).toBe(true)
    })

    it('should refresh TTL on re-add when configured', () => {
      const set = new BoundedSet<string>({
        maxSize: 100,
        ttlMs: 1000,
        refreshTtlOnAccess: true,
      })

      set.add('token-1')

      // Advance time partially
      vi.advanceTimersByTime(800)

      // Re-add to refresh TTL
      set.add('token-1')

      // Advance time past original TTL but not past refreshed TTL
      vi.advanceTimersByTime(800)

      expect(set.has('token-1')).toBe(true)
    })

    it('should combine TTL with size limits', () => {
      const set = new BoundedSet<string>({
        maxSize: 3,
        ttlMs: 10000,
        evictionPolicy: 'fifo',
      })

      set.add('a')
      set.add('b')
      set.add('c')
      set.add('d') // Should evict 'a' due to size limit

      expect(set.has('a')).toBe(false)
      expect(set.size).toBe(3)

      // All remaining should still be valid (TTL not expired)
      expect(set.has('b')).toBe(true)
      expect(set.has('c')).toBe(true)
      expect(set.has('d')).toBe(true)
    })

    afterEach(() => {
      vi.useRealTimers()
    })
  })

  describe('Set Interface Compatibility', () => {
    it('should implement add/has/delete methods', () => {
      const set = new BoundedSet<string>({ maxSize: 10 })

      expect(set.add('item')).toBe(set) // Should return this for chaining
      expect(set.has('item')).toBe(true)
      expect(set.delete('item')).toBe(true)
      expect(set.has('item')).toBe(false)
      expect(set.delete('item')).toBe(false) // Already deleted
    })

    it('should implement clear method', () => {
      const set = new BoundedSet<string>({ maxSize: 10 })

      set.add('a')
      set.add('b')
      set.add('c')

      set.clear()

      expect(set.size).toBe(0)
      expect(set.has('a')).toBe(false)
    })

    it('should implement forEach method', () => {
      const set = new BoundedSet<string>({ maxSize: 10 })
      set.add('a')
      set.add('b')

      const items: string[] = []
      set.forEach((value) => items.push(value))

      expect(items).toContain('a')
      expect(items).toContain('b')
    })

    it('should implement iterator protocol', () => {
      const set = new BoundedSet<string>({ maxSize: 10 })
      set.add('x')
      set.add('y')

      const items = [...set]
      expect(items).toHaveLength(2)
      expect(items).toContain('x')
      expect(items).toContain('y')
    })

    it('should implement values/keys/entries methods', () => {
      const set = new BoundedSet<string>({ maxSize: 10 })
      set.add('test')

      expect([...set.values()]).toContain('test')
      expect([...set.keys()]).toContain('test')
      expect([...set.entries()]).toContainEqual(['test', 'test'])
    })
  })

  describe('Typed Branded Values', () => {
    // Simulating branded types
    type UserId = string & { readonly __brand: unique symbol }
    type SessionToken = string & { readonly __brand: unique symbol }

    it('should work with branded string types', () => {
      const userIds = new BoundedSet<UserId>({ maxSize: 100 })

      const id1 = 'user-123' as UserId
      const id2 = 'user-456' as UserId

      userIds.add(id1)
      userIds.add(id2)

      expect(userIds.has(id1)).toBe(true)
      expect(userIds.has('user-789' as UserId)).toBe(false)
    })

    it('should enforce bounds for branded type tracking', () => {
      const validatedTokens = new BoundedSet<SessionToken>({ maxSize: 3 })

      const tokens = [
        'token-a' as SessionToken,
        'token-b' as SessionToken,
        'token-c' as SessionToken,
        'token-d' as SessionToken,
      ]

      tokens.forEach((t) => validatedTokens.add(t))

      expect(validatedTokens.size).toBe(3)
    })
  })

  describe('Memory Bounds Under Load', () => {
    it('should maintain bounded memory under continuous additions', () => {
      const set = new BoundedSet<string>({ maxSize: 1000 })

      // Simulate heavy load - add 100,000 items
      for (let i = 0; i < 100000; i++) {
        set.add(`id-${i}`)
      }

      // Memory should still be bounded
      expect(set.size).toBe(1000)
    })

    it('should handle rapid add/delete cycles', () => {
      const set = new BoundedSet<string>({ maxSize: 100 })

      for (let cycle = 0; cycle < 1000; cycle++) {
        const id = `cycle-${cycle}`
        set.add(id)
        if (cycle % 2 === 0) {
          set.delete(id)
        }
      }

      expect(set.size).toBeLessThanOrEqual(100)
    })

    it('should provide eviction callback for monitoring', () => {
      const evicted: string[] = []
      const set = new BoundedSet<string>({
        maxSize: 3,
        onEvict: (value) => evicted.push(value),
      })

      set.add('a')
      set.add('b')
      set.add('c')
      set.add('d') // Should evict and call callback

      expect(evicted).toHaveLength(1)
      expect(evicted[0]).toBe('a')
    })
  })

  describe('Factory Functions', () => {
    it('should create bounded set via factory function', () => {
      const set = createBoundedSet<string>({ maxSize: 50 })

      expect(set).toBeInstanceOf(BoundedSet)
      expect(set.maxSize).toBe(50)
    })

    it('should create bounded set with default options', () => {
      const set = createBoundedSet<number>()

      expect(set).toBeInstanceOf(BoundedSet)
      expect(set.maxSize).toBe(10000) // Default
    })
  })
})

describe('BoundedMap - Memory Bounds for Key-Value Branded Types', () => {
  describe('Basic Size Limits', () => {
    it('should enforce maximum size limit', () => {
      const map = new BoundedMap<string, number>({ maxSize: 5 })

      for (let i = 0; i < 10; i++) {
        map.set(`key-${i}`, i)
      }

      expect(map.size).toBeLessThanOrEqual(5)
    })

    it('should preserve most recent entries on eviction', () => {
      const map = new BoundedMap<string, string>({
        maxSize: 3,
        evictionPolicy: 'fifo',
      })

      map.set('first', 'value1')
      map.set('second', 'value2')
      map.set('third', 'value3')
      map.set('fourth', 'value4')

      expect(map.has('first')).toBe(false)
      expect(map.get('fourth')).toBe('value4')
    })
  })

  describe('Map Interface Compatibility', () => {
    it('should implement get/set/has/delete methods', () => {
      const map = new BoundedMap<string, number>({ maxSize: 10 })

      expect(map.set('key', 42)).toBe(map)
      expect(map.get('key')).toBe(42)
      expect(map.has('key')).toBe(true)
      expect(map.delete('key')).toBe(true)
      expect(map.get('key')).toBeUndefined()
    })

    it('should implement clear method', () => {
      const map = new BoundedMap<string, number>({ maxSize: 10 })
      map.set('a', 1)
      map.set('b', 2)

      map.clear()

      expect(map.size).toBe(0)
    })

    it('should implement iterator methods', () => {
      const map = new BoundedMap<string, number>({ maxSize: 10 })
      map.set('x', 1)
      map.set('y', 2)

      expect([...map.keys()]).toContain('x')
      expect([...map.values()]).toContain(1)
      expect([...map.entries()]).toContainEqual(['x', 1])
    })
  })

  describe('Factory Functions', () => {
    it('should create bounded map via factory function', () => {
      const map = createBoundedMap<string, object>({ maxSize: 100 })

      expect(map).toBeInstanceOf(BoundedMap)
      expect(map.maxSize).toBe(100)
    })
  })
})

describe('Cleanup Mechanisms', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('should support manual cleanup trigger', () => {
    const set = new BoundedSet<string>({
      maxSize: 100,
      ttlMs: 1000,
    })

    set.add('old-entry')
    vi.advanceTimersByTime(2000)
    set.add('new-entry')

    // Manual cleanup should remove expired entries
    const removed = set.cleanup()

    expect(removed).toBe(1)
    expect(set.has('old-entry')).toBe(false)
    expect(set.has('new-entry')).toBe(true)
  })

  it('should support automatic periodic cleanup', () => {
    const set = new BoundedSet<string>({
      maxSize: 100,
      ttlMs: 1000,
      cleanupIntervalMs: 500, // Cleanup every 500ms
    })

    set.add('entry-1')

    // Advance past TTL
    vi.advanceTimersByTime(1500)

    // Automatic cleanup should have run
    expect(set.has('entry-1')).toBe(false)
  })

  it('should dispose cleanup interval on destroy', () => {
    const set = new BoundedSet<string>({
      maxSize: 100,
      cleanupIntervalMs: 100,
    })

    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval')

    set.destroy()

    expect(clearIntervalSpy).toHaveBeenCalled()
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})

describe('Statistics and Monitoring', () => {
  it('should track eviction count', () => {
    const set = new BoundedSet<string>({ maxSize: 3 })

    for (let i = 0; i < 10; i++) {
      set.add(`item-${i}`)
    }

    expect(set.stats.evictionCount).toBe(7) // 10 - 3 = 7 evictions
  })

  it('should track hit/miss counts', () => {
    const set = new BoundedSet<string>({ maxSize: 10 })

    set.add('exists')
    set.has('exists') // hit
    set.has('exists') // hit
    set.has('missing') // miss
    set.has('missing') // miss
    set.has('missing') // miss

    expect(set.stats.hitCount).toBe(2)
    expect(set.stats.missCount).toBe(3)
  })

  it('should calculate hit rate', () => {
    const set = new BoundedSet<string>({ maxSize: 10 })

    set.add('item')
    set.has('item') // hit
    set.has('item') // hit
    set.has('item') // hit
    set.has('item') // hit
    set.has('other') // miss

    expect(set.stats.hitRate).toBeCloseTo(0.8, 2) // 4 hits / 5 total = 0.8
  })

  it('should reset stats', () => {
    const set = new BoundedSet<string>({ maxSize: 3 })

    for (let i = 0; i < 10; i++) {
      set.add(`item-${i}`)
    }

    set.resetStats()

    expect(set.stats.evictionCount).toBe(0)
    expect(set.stats.hitCount).toBe(0)
    expect(set.stats.missCount).toBe(0)
  })
})

describe('Extended Statistics and Memory Monitoring', () => {
  describe('BoundedSet Extended Stats', () => {
    it('should provide extended stats with memory metrics', () => {
      const set = new BoundedSet<string>({ maxSize: 100 })

      set.add('item-1')
      set.add('item-2')
      set.add('item-3')

      const stats = set.extendedStats

      expect(stats.size).toBe(3)
      expect(stats.maxSize).toBe(100)
      expect(stats.fillRatio).toBeCloseTo(0.03, 2)
      expect(stats.estimatedMemoryBytes).toBeGreaterThan(0)
      // Should include base stats
      expect(stats.evictionCount).toBe(0)
      expect(stats.hitCount).toBe(0)
      expect(stats.missCount).toBe(0)
    })

    it('should estimate memory based on value types', () => {
      const stringSet = new BoundedSet<string>({ maxSize: 10 })
      const shortString = 'a'
      const longString = 'a'.repeat(1000)

      stringSet.add(shortString)
      const statsShort = stringSet.extendedStats

      stringSet.clear()
      stringSet.add(longString)
      const statsLong = stringSet.extendedStats

      // Longer strings should estimate more memory
      expect(statsLong.estimatedMemoryBytes).toBeGreaterThan(statsShort.estimatedMemoryBytes)
    })

    it('should track fill ratio accurately', () => {
      const set = new BoundedSet<string>({ maxSize: 10 })

      expect(set.extendedStats.fillRatio).toBe(0)

      for (let i = 0; i < 5; i++) {
        set.add(`item-${i}`)
      }
      expect(set.extendedStats.fillRatio).toBeCloseTo(0.5, 2)

      for (let i = 5; i < 10; i++) {
        set.add(`item-${i}`)
      }
      expect(set.extendedStats.fillRatio).toBe(1)
    })
  })

  describe('BoundedMap Extended Stats', () => {
    it('should provide extended stats with memory metrics', () => {
      const map = new BoundedMap<string, number>({ maxSize: 100 })

      map.set('key-1', 1)
      map.set('key-2', 2)
      map.set('key-3', 3)

      const stats = map.extendedStats

      expect(stats.size).toBe(3)
      expect(stats.maxSize).toBe(100)
      expect(stats.fillRatio).toBeCloseTo(0.03, 2)
      expect(stats.estimatedMemoryBytes).toBeGreaterThan(0)
    })

    it('should estimate memory for both keys and values', () => {
      const map = new BoundedMap<string, string>({ maxSize: 10 })

      map.set('short', 'short')
      const statsSmall = map.extendedStats

      map.clear()
      map.set('a'.repeat(100), 'b'.repeat(100))
      const statsLarge = map.extendedStats

      // Larger keys and values should estimate more memory
      expect(statsLarge.estimatedMemoryBytes).toBeGreaterThan(statsSmall.estimatedMemoryBytes)
    })
  })
})

describe('O(1) LRU Performance', () => {
  it('should handle large LRU sets efficiently', () => {
    const set = new BoundedSet<string>({
      maxSize: 10000,
      evictionPolicy: 'lru',
    })

    // Add initial entries
    for (let i = 0; i < 10000; i++) {
      set.add(`item-${i}`)
    }

    // Time a series of LRU operations
    const start = performance.now()

    // Perform 10000 accesses and additions (triggers LRU reordering)
    for (let i = 0; i < 10000; i++) {
      set.has(`item-${i % 10000}`)
      set.add(`new-item-${i}`)
    }

    const elapsed = performance.now() - start

    // With O(1) operations, 20000 operations should complete quickly
    // This is more of a sanity check than a strict benchmark
    expect(elapsed).toBeLessThan(1000) // Should complete in under 1 second
    expect(set.size).toBe(10000)
  })

  it('should handle large LRU maps efficiently', () => {
    const map = new BoundedMap<string, number>({
      maxSize: 10000,
      evictionPolicy: 'lru',
    })

    // Add initial entries
    for (let i = 0; i < 10000; i++) {
      map.set(`key-${i}`, i)
    }

    // Time a series of LRU operations
    const start = performance.now()

    // Perform 10000 gets and sets (triggers LRU reordering)
    for (let i = 0; i < 10000; i++) {
      map.get(`key-${i % 10000}`)
      map.set(`new-key-${i}`, i)
    }

    const elapsed = performance.now() - start

    // With O(1) operations, 20000 operations should complete quickly
    expect(elapsed).toBeLessThan(1000)
    expect(map.size).toBe(10000)
  })
})
