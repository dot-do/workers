// @dotdo/security - Bounded Set implementation for memory-safe branded type tracking
//
// This implementation provides bounded collections that prevent memory leaks
// when tracking branded types like validated IDs, used tokens, or nonces.
//
// Issue: workers-dgfm (Memory leak fix)

/**
 * Eviction policy for bounded collections
 */
export type EvictionPolicy = 'fifo' | 'lru'

/**
 * Statistics for bounded collection monitoring
 */
export interface BoundedSetStats {
  /** Number of items evicted due to size limits */
  evictionCount: number
  /** Number of successful has() calls (item found) */
  hitCount: number
  /** Number of unsuccessful has() calls (item not found) */
  missCount: number
  /** Hit rate (hitCount / (hitCount + missCount)) */
  hitRate: number
}

/**
 * Options for BoundedSet configuration
 */
export interface BoundedSetOptions<T = unknown> {
  /** Maximum number of items in the set (default: 10000) */
  maxSize?: number
  /** Eviction policy when set is full (default: 'fifo') */
  evictionPolicy?: EvictionPolicy
  /** Time-to-live in milliseconds (optional, no TTL if not set) */
  ttlMs?: number
  /** Whether to refresh TTL on access (default: false) */
  refreshTtlOnAccess?: boolean
  /** Interval for automatic cleanup of expired entries in ms (optional) */
  cleanupIntervalMs?: number
  /** Callback when an item is evicted */
  onEvict?: (value: T) => void
}

/**
 * Options for BoundedMap configuration
 */
export interface BoundedMapOptions<K = unknown, V = unknown> {
  /** Maximum number of entries in the map (default: 10000) */
  maxSize?: number
  /** Eviction policy when map is full (default: 'fifo') */
  evictionPolicy?: EvictionPolicy
  /** Time-to-live in milliseconds (optional, no TTL if not set) */
  ttlMs?: number
  /** Whether to refresh TTL on access (default: false) */
  refreshTtlOnAccess?: boolean
  /** Interval for automatic cleanup of expired entries in ms (optional) */
  cleanupIntervalMs?: number
  /** Callback when an entry is evicted */
  onEvict?: (key: K, value: V) => void
}

/**
 * Internal entry with timestamp for TTL and ordering
 */
interface TimestampedEntry<T> {
  value: T
  addedAt: number
  accessedAt: number
}

const DEFAULT_MAX_SIZE = 10000

/**
 * A Set implementation with bounded size to prevent memory leaks.
 *
 * Useful for tracking branded types like validated IDs, used tokens,
 * or nonces without risking unbounded memory growth.
 *
 * @example
 * ```ts
 * type UserId = string & { __brand: 'UserId' }
 *
 * const validatedUsers = new BoundedSet<UserId>({
 *   maxSize: 10000,
 *   evictionPolicy: 'lru',
 *   ttlMs: 60000, // 1 minute TTL
 * })
 *
 * validatedUsers.add(userId)
 * if (validatedUsers.has(userId)) {
 *   // User was recently validated
 * }
 * ```
 */
export class BoundedSet<T> implements Iterable<T> {
  private readonly _maxSize: number
  private readonly _evictionPolicy: EvictionPolicy
  private readonly _ttlMs?: number
  private readonly _refreshTtlOnAccess: boolean
  private readonly _onEvict?: (value: T) => void
  private readonly _entries: Map<T, TimestampedEntry<T>>
  private readonly _insertionOrder: T[] // For FIFO eviction
  private _evictionCount = 0
  private _hitCount = 0
  private _missCount = 0
  private _cleanupIntervalId?: ReturnType<typeof setInterval>

  constructor(options?: BoundedSetOptions<T>) {
    const maxSize = options?.maxSize ?? DEFAULT_MAX_SIZE

    // Validate maxSize
    if (maxSize <= 0 || !Number.isFinite(maxSize)) {
      throw new Error('maxSize must be a positive finite number')
    }

    this._maxSize = maxSize
    this._evictionPolicy = options?.evictionPolicy ?? 'fifo'
    this._ttlMs = options?.ttlMs
    this._refreshTtlOnAccess = options?.refreshTtlOnAccess ?? false
    this._onEvict = options?.onEvict
    this._entries = new Map()
    this._insertionOrder = []

    // Setup automatic cleanup if configured
    if (options?.cleanupIntervalMs && options.cleanupIntervalMs > 0) {
      this._cleanupIntervalId = setInterval(() => {
        this.cleanup()
      }, options.cleanupIntervalMs)
    }
  }

  get maxSize(): number {
    return this._maxSize
  }

  get size(): number {
    return this._entries.size
  }

  get stats(): BoundedSetStats {
    const total = this._hitCount + this._missCount
    return {
      evictionCount: this._evictionCount,
      hitCount: this._hitCount,
      missCount: this._missCount,
      hitRate: total > 0 ? this._hitCount / total : 0,
    }
  }

  add(value: T): this {
    const now = Date.now()

    // Check if already exists
    const existing = this._entries.get(value)
    if (existing) {
      // Update access time for LRU and optionally refresh TTL
      existing.accessedAt = now
      if (this._refreshTtlOnAccess) {
        existing.addedAt = now
      }
      // For LRU: move to end of insertion order
      if (this._evictionPolicy === 'lru') {
        const idx = this._insertionOrder.indexOf(value)
        if (idx !== -1) {
          this._insertionOrder.splice(idx, 1)
          this._insertionOrder.push(value)
        }
      }
      return this
    }

    // Evict if at capacity
    while (this._entries.size >= this._maxSize) {
      this._evictOne()
    }

    // Add new entry
    this._entries.set(value, {
      value,
      addedAt: now,
      accessedAt: now,
    })
    this._insertionOrder.push(value)

    return this
  }

  has(value: T): boolean {
    // First check if entry exists
    const entry = this._entries.get(value)
    if (!entry) {
      this._missCount++
      return false
    }

    // Check TTL if configured
    if (this._ttlMs !== undefined) {
      const age = Date.now() - entry.addedAt
      if (age > this._ttlMs) {
        // Entry expired - remove it
        this._removeEntry(value)
        this._missCount++
        return false
      }
    }

    // Update access time for LRU
    entry.accessedAt = Date.now()
    if (this._evictionPolicy === 'lru') {
      // Move to end for LRU tracking
      const idx = this._insertionOrder.indexOf(value)
      if (idx !== -1) {
        this._insertionOrder.splice(idx, 1)
        this._insertionOrder.push(value)
      }
    }

    this._hitCount++
    return true
  }

  delete(value: T): boolean {
    return this._removeEntry(value)
  }

  clear(): void {
    this._entries.clear()
    this._insertionOrder.length = 0
  }

  forEach(callback: (value: T, value2: T, set: BoundedSet<T>) => void): void {
    for (const [value] of this._entries) {
      callback(value, value, this)
    }
  }

  *values(): IterableIterator<T> {
    for (const [value] of this._entries) {
      yield value
    }
  }

  *keys(): IterableIterator<T> {
    yield* this.values()
  }

  *entries(): IterableIterator<[T, T]> {
    for (const [value] of this._entries) {
      yield [value, value]
    }
  }

  [Symbol.iterator](): Iterator<T> {
    return this.values()
  }

  /**
   * Manually trigger cleanup of expired entries
   * @returns Number of entries removed
   */
  cleanup(): number {
    if (this._ttlMs === undefined) {
      return 0
    }

    const now = Date.now()
    let removed = 0

    for (const [value, entry] of this._entries) {
      const age = now - entry.addedAt
      if (age > this._ttlMs) {
        this._removeEntry(value)
        removed++
      }
    }

    return removed
  }

  /**
   * Reset statistics counters
   */
  resetStats(): void {
    this._evictionCount = 0
    this._hitCount = 0
    this._missCount = 0
  }

  /**
   * Destroy the set and cleanup resources (timers, etc.)
   */
  destroy(): void {
    if (this._cleanupIntervalId !== undefined) {
      clearInterval(this._cleanupIntervalId)
      this._cleanupIntervalId = undefined
    }
    this.clear()
  }

  private _evictOne(): void {
    if (this._insertionOrder.length === 0) return

    let valueToEvict: T

    if (this._evictionPolicy === 'fifo') {
      // FIFO: remove first inserted
      valueToEvict = this._insertionOrder[0]
    } else {
      // LRU: remove least recently accessed (first in our reordered list)
      valueToEvict = this._insertionOrder[0]
    }

    const entry = this._entries.get(valueToEvict)
    if (entry) {
      this._onEvict?.(entry.value)
    }

    this._removeEntry(valueToEvict)
    this._evictionCount++
  }

  private _removeEntry(value: T): boolean {
    const existed = this._entries.delete(value)
    if (existed) {
      const idx = this._insertionOrder.indexOf(value)
      if (idx !== -1) {
        this._insertionOrder.splice(idx, 1)
      }
    }
    return existed
  }
}

/**
 * Internal map entry with timestamp for TTL and ordering
 */
interface TimestampedMapEntry<K, V> {
  key: K
  value: V
  addedAt: number
  accessedAt: number
}

/**
 * A Map implementation with bounded size to prevent memory leaks.
 *
 * Similar to BoundedSet but for key-value pairs.
 *
 * @example
 * ```ts
 * type SessionId = string & { __brand: 'SessionId' }
 *
 * const sessions = new BoundedMap<SessionId, SessionData>({
 *   maxSize: 10000,
 *   ttlMs: 3600000, // 1 hour TTL
 * })
 * ```
 */
export class BoundedMap<K, V> implements Iterable<[K, V]> {
  private readonly _maxSize: number
  private readonly _evictionPolicy: EvictionPolicy
  private readonly _ttlMs?: number
  private readonly _refreshTtlOnAccess: boolean
  private readonly _onEvict?: (key: K, value: V) => void
  private readonly _entries: Map<K, TimestampedMapEntry<K, V>>
  private readonly _insertionOrder: K[] // For FIFO eviction
  private _evictionCount = 0
  private _hitCount = 0
  private _missCount = 0
  private _cleanupIntervalId?: ReturnType<typeof setInterval>

  constructor(options?: BoundedMapOptions<K, V>) {
    const maxSize = options?.maxSize ?? DEFAULT_MAX_SIZE

    // Validate maxSize
    if (maxSize <= 0 || !Number.isFinite(maxSize)) {
      throw new Error('maxSize must be a positive finite number')
    }

    this._maxSize = maxSize
    this._evictionPolicy = options?.evictionPolicy ?? 'fifo'
    this._ttlMs = options?.ttlMs
    this._refreshTtlOnAccess = options?.refreshTtlOnAccess ?? false
    this._onEvict = options?.onEvict
    this._entries = new Map()
    this._insertionOrder = []

    // Setup automatic cleanup if configured
    if (options?.cleanupIntervalMs && options.cleanupIntervalMs > 0) {
      this._cleanupIntervalId = setInterval(() => {
        this.cleanup()
      }, options.cleanupIntervalMs)
    }
  }

  get maxSize(): number {
    return this._maxSize
  }

  get size(): number {
    return this._entries.size
  }

  get stats(): BoundedSetStats {
    const total = this._hitCount + this._missCount
    return {
      evictionCount: this._evictionCount,
      hitCount: this._hitCount,
      missCount: this._missCount,
      hitRate: total > 0 ? this._hitCount / total : 0,
    }
  }

  set(key: K, value: V): this {
    const now = Date.now()

    // Check if already exists
    const existing = this._entries.get(key)
    if (existing) {
      // Update value and access time
      existing.value = value
      existing.accessedAt = now
      if (this._refreshTtlOnAccess) {
        existing.addedAt = now
      }
      // For LRU: move to end of insertion order
      if (this._evictionPolicy === 'lru') {
        const idx = this._insertionOrder.indexOf(key)
        if (idx !== -1) {
          this._insertionOrder.splice(idx, 1)
          this._insertionOrder.push(key)
        }
      }
      return this
    }

    // Evict if at capacity
    while (this._entries.size >= this._maxSize) {
      this._evictOne()
    }

    // Add new entry
    this._entries.set(key, {
      key,
      value,
      addedAt: now,
      accessedAt: now,
    })
    this._insertionOrder.push(key)

    return this
  }

  get(key: K): V | undefined {
    const entry = this._entries.get(key)
    if (!entry) {
      this._missCount++
      return undefined
    }

    // Check TTL if configured
    if (this._ttlMs !== undefined) {
      const age = Date.now() - entry.addedAt
      if (age > this._ttlMs) {
        // Entry expired - remove it
        this._removeEntry(key)
        this._missCount++
        return undefined
      }
    }

    // Update access time for LRU
    entry.accessedAt = Date.now()
    if (this._evictionPolicy === 'lru') {
      // Move to end for LRU tracking
      const idx = this._insertionOrder.indexOf(key)
      if (idx !== -1) {
        this._insertionOrder.splice(idx, 1)
        this._insertionOrder.push(key)
      }
    }

    this._hitCount++
    return entry.value
  }

  has(key: K): boolean {
    const entry = this._entries.get(key)
    if (!entry) {
      this._missCount++
      return false
    }

    // Check TTL if configured
    if (this._ttlMs !== undefined) {
      const age = Date.now() - entry.addedAt
      if (age > this._ttlMs) {
        // Entry expired - remove it
        this._removeEntry(key)
        this._missCount++
        return false
      }
    }

    // Update access time for LRU
    entry.accessedAt = Date.now()
    if (this._evictionPolicy === 'lru') {
      const idx = this._insertionOrder.indexOf(key)
      if (idx !== -1) {
        this._insertionOrder.splice(idx, 1)
        this._insertionOrder.push(key)
      }
    }

    this._hitCount++
    return true
  }

  delete(key: K): boolean {
    return this._removeEntry(key)
  }

  clear(): void {
    this._entries.clear()
    this._insertionOrder.length = 0
  }

  forEach(callback: (value: V, key: K, map: BoundedMap<K, V>) => void): void {
    for (const [key, entry] of this._entries) {
      callback(entry.value, key, this)
    }
  }

  *keys(): IterableIterator<K> {
    for (const [key] of this._entries) {
      yield key
    }
  }

  *values(): IterableIterator<V> {
    for (const [, entry] of this._entries) {
      yield entry.value
    }
  }

  *entries(): IterableIterator<[K, V]> {
    for (const [key, entry] of this._entries) {
      yield [key, entry.value]
    }
  }

  [Symbol.iterator](): Iterator<[K, V]> {
    return this.entries()
  }

  /**
   * Manually trigger cleanup of expired entries
   * @returns Number of entries removed
   */
  cleanup(): number {
    if (this._ttlMs === undefined) {
      return 0
    }

    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this._entries) {
      const age = now - entry.addedAt
      if (age > this._ttlMs) {
        this._removeEntry(key)
        removed++
      }
    }

    return removed
  }

  /**
   * Reset statistics counters
   */
  resetStats(): void {
    this._evictionCount = 0
    this._hitCount = 0
    this._missCount = 0
  }

  /**
   * Destroy the map and cleanup resources (timers, etc.)
   */
  destroy(): void {
    if (this._cleanupIntervalId !== undefined) {
      clearInterval(this._cleanupIntervalId)
      this._cleanupIntervalId = undefined
    }
    this.clear()
  }

  private _evictOne(): void {
    if (this._insertionOrder.length === 0) return

    // Both FIFO and LRU evict from the front (oldest/least-recently-accessed)
    const keyToEvict = this._insertionOrder[0]

    const entry = this._entries.get(keyToEvict)
    if (entry) {
      this._onEvict?.(entry.key, entry.value)
    }

    this._removeEntry(keyToEvict)
    this._evictionCount++
  }

  private _removeEntry(key: K): boolean {
    const existed = this._entries.delete(key)
    if (existed) {
      const idx = this._insertionOrder.indexOf(key)
      if (idx !== -1) {
        this._insertionOrder.splice(idx, 1)
      }
    }
    return existed
  }
}

/**
 * Factory function to create a BoundedSet with type inference
 */
export function createBoundedSet<T>(options?: BoundedSetOptions<T>): BoundedSet<T> {
  return new BoundedSet<T>(options)
}

/**
 * Factory function to create a BoundedMap with type inference
 */
export function createBoundedMap<K, V>(options?: BoundedMapOptions<K, V>): BoundedMap<K, V> {
  return new BoundedMap<K, V>(options)
}
