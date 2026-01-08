// @dotdo/security - Bounded Set implementation for memory-safe branded type tracking

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
 * Internal metadata for tracking entry expiration
 */
interface EntryMetadata {
  expiresAt?: number
}

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
  private readonly evictionPolicy: EvictionPolicy
  private readonly ttlMs?: number
  private readonly refreshTtlOnAccess: boolean
  private readonly onEvict?: (value: T) => void
  private readonly data: Map<T, EntryMetadata>
  private cleanupTimer?: ReturnType<typeof setInterval>

  // Stats
  private _evictionCount = 0
  private _hitCount = 0
  private _missCount = 0

  constructor(options?: BoundedSetOptions<T>) {
    const {
      maxSize = 10000,
      evictionPolicy = 'fifo',
      ttlMs,
      refreshTtlOnAccess = false,
      cleanupIntervalMs,
      onEvict,
    } = options ?? {}

    // Validate maxSize
    if (!Number.isFinite(maxSize) || maxSize <= 0) {
      throw new Error('maxSize must be a positive number')
    }

    this._maxSize = maxSize
    this.evictionPolicy = evictionPolicy
    this.ttlMs = ttlMs
    this.refreshTtlOnAccess = refreshTtlOnAccess
    this.onEvict = onEvict
    this.data = new Map()

    // Setup automatic cleanup if configured
    if (cleanupIntervalMs) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup()
      }, cleanupIntervalMs)
    }
  }

  get maxSize(): number {
    return this._maxSize
  }

  get size(): number {
    return this.data.size
  }

  get stats(): BoundedSetStats {
    const total = this._hitCount + this._missCount
    const hitRate = total === 0 ? 0 : this._hitCount / total
    return {
      evictionCount: this._evictionCount,
      hitCount: this._hitCount,
      missCount: this._missCount,
      hitRate,
    }
  }

  private isExpired(metadata: EntryMetadata): boolean {
    if (!metadata.expiresAt) return false
    return Date.now() >= metadata.expiresAt
  }

  private getExpiresAt(): number | undefined {
    if (!this.ttlMs) return undefined
    return Date.now() + this.ttlMs
  }

  add(value: T): this {
    // Check if already exists
    const existing = this.data.get(value)

    if (existing) {
      // For LRU, update position (delete and re-insert)
      if (this.evictionPolicy === 'lru') {
        this.data.delete(value)
        this.data.set(value, { expiresAt: this.getExpiresAt() })
      } else if (this.refreshTtlOnAccess && this.ttlMs) {
        // Update TTL for FIFO with refresh
        existing.expiresAt = this.getExpiresAt()
      }
      return this
    }

    // Need to make room if at capacity
    if (this.data.size >= this._maxSize) {
      this.evictOne()
    }

    // Add new entry
    this.data.set(value, { expiresAt: this.getExpiresAt() })
    return this
  }

  private evictOne(): void {
    // Get first entry (oldest for both FIFO and LRU)
    const firstKey = this.data.keys().next().value
    if (firstKey !== undefined) {
      this.data.delete(firstKey)
      this._evictionCount++
      if (this.onEvict) {
        this.onEvict(firstKey)
      }
    }
  }

  has(value: T): boolean {
    const metadata = this.data.get(value)

    if (!metadata) {
      this._missCount++
      return false
    }

    // Check if expired
    if (this.isExpired(metadata)) {
      this.data.delete(value)
      this._missCount++
      return false
    }

    // Hit!
    this._hitCount++

    // For LRU, update access order
    if (this.evictionPolicy === 'lru') {
      this.data.delete(value)
      const expiresAt = this.refreshTtlOnAccess ? this.getExpiresAt() : metadata.expiresAt
      this.data.set(value, { expiresAt })
    } else if (this.refreshTtlOnAccess && this.ttlMs) {
      metadata.expiresAt = this.getExpiresAt()
    }

    return true
  }

  delete(value: T): boolean {
    return this.data.delete(value)
  }

  clear(): void {
    this.data.clear()
  }

  forEach(callback: (value: T, value2: T, set: BoundedSet<T>) => void): void {
    // Need to collect values first to avoid issues with iteration during modification
    const values = Array.from(this.data.keys())
    for (const value of values) {
      if (this.data.has(value)) {
        callback(value, value, this)
      }
    }
  }

  values(): IterableIterator<T> {
    return this.data.keys()
  }

  keys(): IterableIterator<T> {
    return this.data.keys()
  }

  *entries(): IterableIterator<[T, T]> {
    for (const value of this.data.keys()) {
      yield [value, value]
    }
  }

  [Symbol.iterator](): Iterator<T> {
    return this.data.keys()
  }

  /**
   * Manually trigger cleanup of expired entries
   * @returns Number of entries removed
   */
  cleanup(): number {
    if (!this.ttlMs) return 0

    let removed = 0
    const now = Date.now()

    for (const [value, metadata] of this.data.entries()) {
      if (metadata.expiresAt && now >= metadata.expiresAt) {
        this.data.delete(value)
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
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }
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
  private readonly evictionPolicy: EvictionPolicy
  private readonly ttlMs?: number
  private readonly refreshTtlOnAccess: boolean
  private readonly onEvict?: (key: K, value: V) => void
  private readonly data: Map<K, { value: V; metadata: EntryMetadata }>
  private cleanupTimer?: ReturnType<typeof setInterval>

  // Stats
  private _evictionCount = 0
  private _hitCount = 0
  private _missCount = 0

  constructor(options?: BoundedMapOptions<K, V>) {
    const {
      maxSize = 10000,
      evictionPolicy = 'fifo',
      ttlMs,
      refreshTtlOnAccess = false,
      cleanupIntervalMs,
      onEvict,
    } = options ?? {}

    // Validate maxSize
    if (!Number.isFinite(maxSize) || maxSize <= 0) {
      throw new Error('maxSize must be a positive number')
    }

    this._maxSize = maxSize
    this.evictionPolicy = evictionPolicy
    this.ttlMs = ttlMs
    this.refreshTtlOnAccess = refreshTtlOnAccess
    this.onEvict = onEvict
    this.data = new Map()

    // Setup automatic cleanup if configured
    if (cleanupIntervalMs) {
      this.cleanupTimer = setInterval(() => {
        this.cleanup()
      }, cleanupIntervalMs)
    }
  }

  get maxSize(): number {
    return this._maxSize
  }

  get size(): number {
    return this.data.size
  }

  get stats(): BoundedSetStats {
    const total = this._hitCount + this._missCount
    const hitRate = total === 0 ? 0 : this._hitCount / total
    return {
      evictionCount: this._evictionCount,
      hitCount: this._hitCount,
      missCount: this._missCount,
      hitRate,
    }
  }

  private isExpired(metadata: EntryMetadata): boolean {
    if (!metadata.expiresAt) return false
    return Date.now() >= metadata.expiresAt
  }

  private getExpiresAt(): number | undefined {
    if (!this.ttlMs) return undefined
    return Date.now() + this.ttlMs
  }

  set(key: K, value: V): this {
    // Check if already exists
    const existing = this.data.get(key)

    if (existing) {
      // For LRU, update position (delete and re-insert)
      if (this.evictionPolicy === 'lru') {
        this.data.delete(key)
        this.data.set(key, { value, metadata: { expiresAt: this.getExpiresAt() } })
      } else {
        // Update value and optionally refresh TTL
        existing.value = value
        if (this.refreshTtlOnAccess && this.ttlMs) {
          existing.metadata.expiresAt = this.getExpiresAt()
        }
      }
      return this
    }

    // Need to make room if at capacity
    if (this.data.size >= this._maxSize) {
      this.evictOne()
    }

    // Add new entry
    this.data.set(key, { value, metadata: { expiresAt: this.getExpiresAt() } })
    return this
  }

  private evictOne(): void {
    // Get first entry (oldest for both FIFO and LRU)
    const firstEntry = this.data.entries().next().value
    if (firstEntry) {
      const [key, { value }] = firstEntry
      this.data.delete(key)
      this._evictionCount++
      if (this.onEvict) {
        this.onEvict(key, value)
      }
    }
  }

  get(key: K): V | undefined {
    const entry = this.data.get(key)

    if (!entry) {
      this._missCount++
      return undefined
    }

    // Check if expired
    if (this.isExpired(entry.metadata)) {
      this.data.delete(key)
      this._missCount++
      return undefined
    }

    // Hit!
    this._hitCount++

    // For LRU, update access order
    if (this.evictionPolicy === 'lru') {
      this.data.delete(key)
      const expiresAt = this.refreshTtlOnAccess
        ? this.getExpiresAt()
        : entry.metadata.expiresAt
      this.data.set(key, { value: entry.value, metadata: { expiresAt } })
    } else if (this.refreshTtlOnAccess && this.ttlMs) {
      entry.metadata.expiresAt = this.getExpiresAt()
    }

    return entry.value
  }

  has(key: K): boolean {
    const entry = this.data.get(key)

    if (!entry) {
      this._missCount++
      return false
    }

    // Check if expired
    if (this.isExpired(entry.metadata)) {
      this.data.delete(key)
      this._missCount++
      return false
    }

    // Hit!
    this._hitCount++

    // For LRU, update access order
    if (this.evictionPolicy === 'lru') {
      this.data.delete(key)
      const expiresAt = this.refreshTtlOnAccess
        ? this.getExpiresAt()
        : entry.metadata.expiresAt
      this.data.set(key, { value: entry.value, metadata: { expiresAt } })
    } else if (this.refreshTtlOnAccess && this.ttlMs) {
      entry.metadata.expiresAt = this.getExpiresAt()
    }

    return true
  }

  delete(key: K): boolean {
    return this.data.delete(key)
  }

  clear(): void {
    this.data.clear()
  }

  forEach(callback: (value: V, key: K, map: BoundedMap<K, V>) => void): void {
    // Need to collect entries first to avoid issues with iteration during modification
    const entries = Array.from(this.data.entries())
    for (const [key, { value }] of entries) {
      if (this.data.has(key)) {
        callback(value, key, this)
      }
    }
  }

  *keys(): IterableIterator<K> {
    for (const key of this.data.keys()) {
      yield key
    }
  }

  *values(): IterableIterator<V> {
    for (const { value } of this.data.values()) {
      yield value
    }
  }

  *entries(): IterableIterator<[K, V]> {
    for (const [key, { value }] of this.data.entries()) {
      yield [key, value]
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
    if (!this.ttlMs) return 0

    let removed = 0
    const now = Date.now()

    for (const [key, { metadata }] of this.data.entries()) {
      if (metadata.expiresAt && now >= metadata.expiresAt) {
        this.data.delete(key)
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
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
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
