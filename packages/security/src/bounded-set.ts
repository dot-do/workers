// @dotdo/security - Bounded Set implementation for memory-safe branded type tracking
//
// This implementation provides bounded collections that prevent memory leaks
// when tracking branded types like validated IDs, used tokens, or nonces.
//
// Issue: workers-dgfm (Memory leak fix)
// Issue: workers-igay (Memory optimization - O(1) LRU, reduced overhead)

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
 * Extended statistics including memory metrics
 */
export interface BoundedSetExtendedStats extends BoundedSetStats {
  /** Current number of entries */
  size: number
  /** Maximum allowed entries */
  maxSize: number
  /** Estimated memory usage in bytes (approximate) */
  estimatedMemoryBytes: number
  /** Fill ratio (size / maxSize) */
  fillRatio: number
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
 * Doubly-linked list node for O(1) LRU operations
 * Using a linked list instead of array + indexOf/splice reduces:
 * - Access update: O(n) -> O(1)
 * - Eviction: O(n) -> O(1)
 * - Memory: No array resizing/copying overhead
 */
interface LinkedNode<T> {
  value: T
  addedAt: number
  prev: LinkedNode<T> | null
  next: LinkedNode<T> | null
}

const DEFAULT_MAX_SIZE = 10000

/**
 * Estimate memory usage of a value (rough approximation)
 * This helps users understand memory consumption patterns
 */
function estimateValueMemory(value: unknown): number {
  if (value === null || value === undefined) return 8
  if (typeof value === 'boolean') return 4
  if (typeof value === 'number') return 8
  if (typeof value === 'string') return 2 * (value as string).length + 40 // UTF-16 + object overhead
  if (typeof value === 'bigint') return 8 + Math.ceil(value.toString(16).length / 2)
  if (typeof value === 'symbol') return 40
  if (typeof value === 'function') return 64
  // Objects/arrays - rough estimate
  return 64
}

/**
 * A Set implementation with bounded size to prevent memory leaks.
 *
 * Memory Optimization (workers-igay):
 * - Uses doubly-linked list for O(1) LRU operations (vs O(n) with array)
 * - Single Map lookup for all operations
 * - No array resizing/copying overhead during eviction
 * - Provides memory estimation for monitoring
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
 *
 * // Monitor memory usage
 * const stats = validatedUsers.extendedStats
 * console.log(`Memory: ${stats.estimatedMemoryBytes} bytes, Fill: ${stats.fillRatio}`)
 * ```
 */
export class BoundedSet<T> implements Iterable<T> {
  private readonly _maxSize: number
  private readonly _evictionPolicy: EvictionPolicy
  private readonly _ttlMs?: number
  private readonly _refreshTtlOnAccess: boolean
  private readonly _onEvict?: (value: T) => void

  // O(1) lookup: value -> linked list node
  private readonly _nodeMap: Map<T, LinkedNode<T>>

  // Doubly-linked list head/tail for O(1) eviction and reordering
  private _head: LinkedNode<T> | null = null
  private _tail: LinkedNode<T> | null = null

  // Statistics
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
    this._nodeMap = new Map()

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
    return this._nodeMap.size
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

  /**
   * Extended statistics including memory metrics for monitoring
   */
  get extendedStats(): BoundedSetExtendedStats {
    const baseStats = this.stats
    const size = this._nodeMap.size

    // Estimate memory: Map overhead + node overhead per entry + value size
    // LinkedNode overhead: ~56 bytes (value ref, addedAt, prev, next pointers)
    // Map entry overhead: ~48 bytes per entry
    let estimatedMemoryBytes = 64 // Base object overhead

    for (const [value] of this._nodeMap) {
      estimatedMemoryBytes += 48 + 56 + estimateValueMemory(value)
    }

    return {
      ...baseStats,
      size,
      maxSize: this._maxSize,
      estimatedMemoryBytes,
      fillRatio: this._maxSize > 0 ? size / this._maxSize : 0,
    }
  }

  add(value: T): this {
    const now = Date.now()

    // Check if already exists - O(1) lookup
    const existingNode = this._nodeMap.get(value)
    if (existingNode) {
      // Update addedAt if refreshing TTL on access
      if (this._refreshTtlOnAccess) {
        existingNode.addedAt = now
      }
      // For LRU: move to tail (most recently used) - O(1)
      if (this._evictionPolicy === 'lru') {
        this._moveToTail(existingNode)
      }
      return this
    }

    // Evict if at capacity - O(1) per eviction
    while (this._nodeMap.size >= this._maxSize) {
      this._evictOne()
    }

    // Create and add new node - O(1)
    const node: LinkedNode<T> = {
      value,
      addedAt: now,
      prev: null,
      next: null,
    }
    this._nodeMap.set(value, node)
    this._appendToTail(node)

    return this
  }

  has(value: T): boolean {
    // O(1) lookup
    const node = this._nodeMap.get(value)
    if (!node) {
      this._missCount++
      return false
    }

    // Check TTL if configured
    if (this._ttlMs !== undefined) {
      const age = Date.now() - node.addedAt
      if (age > this._ttlMs) {
        // Entry expired - remove it - O(1)
        this._removeNode(node)
        this._nodeMap.delete(value)
        this._missCount++
        return false
      }
    }

    // For LRU: move to tail (most recently used) - O(1)
    if (this._evictionPolicy === 'lru') {
      this._moveToTail(node)
    }

    this._hitCount++
    return true
  }

  delete(value: T): boolean {
    const node = this._nodeMap.get(value)
    if (!node) {
      return false
    }
    this._removeNode(node)
    this._nodeMap.delete(value)
    return true
  }

  clear(): void {
    this._nodeMap.clear()
    this._head = null
    this._tail = null
  }

  forEach(callback: (value: T, value2: T, set: BoundedSet<T>) => void): void {
    for (const [value] of this._nodeMap) {
      callback(value, value, this)
    }
  }

  *values(): IterableIterator<T> {
    for (const [value] of this._nodeMap) {
      yield value
    }
  }

  *keys(): IterableIterator<T> {
    yield* this.values()
  }

  *entries(): IterableIterator<[T, T]> {
    for (const [value] of this._nodeMap) {
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

    // Iterate from head (oldest) for efficient TTL cleanup
    let current = this._head
    while (current) {
      const next = current.next
      const age = now - current.addedAt
      if (age > this._ttlMs) {
        this._removeNode(current)
        this._nodeMap.delete(current.value)
        removed++
      }
      current = next
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

  // === Linked List Operations (all O(1)) ===

  private _appendToTail(node: LinkedNode<T>): void {
    if (!this._tail) {
      // Empty list
      this._head = node
      this._tail = node
    } else {
      // Append to end
      node.prev = this._tail
      this._tail.next = node
      this._tail = node
    }
  }

  private _removeNode(node: LinkedNode<T>): void {
    if (node.prev) {
      node.prev.next = node.next
    } else {
      // Node was head
      this._head = node.next
    }

    if (node.next) {
      node.next.prev = node.prev
    } else {
      // Node was tail
      this._tail = node.prev
    }

    // Clear references for GC
    node.prev = null
    node.next = null
  }

  private _moveToTail(node: LinkedNode<T>): void {
    if (node === this._tail) {
      // Already at tail
      return
    }
    this._removeNode(node)
    this._appendToTail(node)
  }

  private _evictOne(): void {
    if (!this._head) return

    // Always evict from head (oldest for FIFO, least recently used for LRU)
    const nodeToEvict = this._head
    this._onEvict?.(nodeToEvict.value)
    this._removeNode(nodeToEvict)
    this._nodeMap.delete(nodeToEvict.value)
    this._evictionCount++
  }
}

/**
 * Doubly-linked list node for BoundedMap with O(1) LRU operations
 */
interface LinkedMapNode<K, V> {
  key: K
  value: V
  addedAt: number
  prev: LinkedMapNode<K, V> | null
  next: LinkedMapNode<K, V> | null
}

/**
 * Extended statistics for BoundedMap including memory metrics
 */
export interface BoundedMapExtendedStats extends BoundedSetStats {
  /** Current number of entries */
  size: number
  /** Maximum allowed entries */
  maxSize: number
  /** Estimated memory usage in bytes (approximate) */
  estimatedMemoryBytes: number
  /** Fill ratio (size / maxSize) */
  fillRatio: number
}

/**
 * A Map implementation with bounded size to prevent memory leaks.
 *
 * Memory Optimization (workers-igay):
 * - Uses doubly-linked list for O(1) LRU operations (vs O(n) with array)
 * - Single Map lookup for all operations
 * - No array resizing/copying overhead during eviction
 * - Provides memory estimation for monitoring
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
 *
 * // Monitor memory usage
 * const stats = sessions.extendedStats
 * console.log(`Memory: ${stats.estimatedMemoryBytes} bytes`)
 * ```
 */
export class BoundedMap<K, V> implements Iterable<[K, V]> {
  private readonly _maxSize: number
  private readonly _evictionPolicy: EvictionPolicy
  private readonly _ttlMs?: number
  private readonly _refreshTtlOnAccess: boolean
  private readonly _onEvict?: (key: K, value: V) => void

  // O(1) lookup: key -> linked list node
  private readonly _nodeMap: Map<K, LinkedMapNode<K, V>>

  // Doubly-linked list head/tail for O(1) eviction and reordering
  private _head: LinkedMapNode<K, V> | null = null
  private _tail: LinkedMapNode<K, V> | null = null

  // Statistics
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
    this._nodeMap = new Map()

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
    return this._nodeMap.size
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

  /**
   * Extended statistics including memory metrics for monitoring
   */
  get extendedStats(): BoundedMapExtendedStats {
    const baseStats = this.stats
    const size = this._nodeMap.size

    // Estimate memory: Map overhead + node overhead per entry + key/value size
    // LinkedMapNode overhead: ~64 bytes (key ref, value ref, addedAt, prev, next)
    // Map entry overhead: ~48 bytes per entry
    let estimatedMemoryBytes = 64 // Base object overhead

    for (const [key, node] of this._nodeMap) {
      estimatedMemoryBytes += 48 + 64 + estimateValueMemory(key) + estimateValueMemory(node.value)
    }

    return {
      ...baseStats,
      size,
      maxSize: this._maxSize,
      estimatedMemoryBytes,
      fillRatio: this._maxSize > 0 ? size / this._maxSize : 0,
    }
  }

  set(key: K, value: V): this {
    const now = Date.now()

    // Check if already exists - O(1) lookup
    const existingNode = this._nodeMap.get(key)
    if (existingNode) {
      // Update value
      existingNode.value = value
      if (this._refreshTtlOnAccess) {
        existingNode.addedAt = now
      }
      // For LRU: move to tail (most recently used) - O(1)
      if (this._evictionPolicy === 'lru') {
        this._moveToTail(existingNode)
      }
      return this
    }

    // Evict if at capacity - O(1) per eviction
    while (this._nodeMap.size >= this._maxSize) {
      this._evictOne()
    }

    // Create and add new node - O(1)
    const node: LinkedMapNode<K, V> = {
      key,
      value,
      addedAt: now,
      prev: null,
      next: null,
    }
    this._nodeMap.set(key, node)
    this._appendToTail(node)

    return this
  }

  get(key: K): V | undefined {
    // O(1) lookup
    const node = this._nodeMap.get(key)
    if (!node) {
      this._missCount++
      return undefined
    }

    // Check TTL if configured
    if (this._ttlMs !== undefined) {
      const age = Date.now() - node.addedAt
      if (age > this._ttlMs) {
        // Entry expired - remove it - O(1)
        this._removeNode(node)
        this._nodeMap.delete(key)
        this._missCount++
        return undefined
      }
    }

    // For LRU: move to tail (most recently used) - O(1)
    if (this._evictionPolicy === 'lru') {
      this._moveToTail(node)
    }

    this._hitCount++
    return node.value
  }

  has(key: K): boolean {
    // O(1) lookup
    const node = this._nodeMap.get(key)
    if (!node) {
      this._missCount++
      return false
    }

    // Check TTL if configured
    if (this._ttlMs !== undefined) {
      const age = Date.now() - node.addedAt
      if (age > this._ttlMs) {
        // Entry expired - remove it - O(1)
        this._removeNode(node)
        this._nodeMap.delete(key)
        this._missCount++
        return false
      }
    }

    // For LRU: move to tail (most recently used) - O(1)
    if (this._evictionPolicy === 'lru') {
      this._moveToTail(node)
    }

    this._hitCount++
    return true
  }

  delete(key: K): boolean {
    const node = this._nodeMap.get(key)
    if (!node) {
      return false
    }
    this._removeNode(node)
    this._nodeMap.delete(key)
    return true
  }

  clear(): void {
    this._nodeMap.clear()
    this._head = null
    this._tail = null
  }

  forEach(callback: (value: V, key: K, map: BoundedMap<K, V>) => void): void {
    for (const [key, node] of this._nodeMap) {
      callback(node.value, key, this)
    }
  }

  *keys(): IterableIterator<K> {
    for (const [key] of this._nodeMap) {
      yield key
    }
  }

  *values(): IterableIterator<V> {
    for (const [, node] of this._nodeMap) {
      yield node.value
    }
  }

  *entries(): IterableIterator<[K, V]> {
    for (const [key, node] of this._nodeMap) {
      yield [key, node.value]
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

    // Iterate from head (oldest) for efficient TTL cleanup
    let current = this._head
    while (current) {
      const next = current.next
      const age = now - current.addedAt
      if (age > this._ttlMs) {
        this._removeNode(current)
        this._nodeMap.delete(current.key)
        removed++
      }
      current = next
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

  // === Linked List Operations (all O(1)) ===

  private _appendToTail(node: LinkedMapNode<K, V>): void {
    if (!this._tail) {
      // Empty list
      this._head = node
      this._tail = node
    } else {
      // Append to end
      node.prev = this._tail
      this._tail.next = node
      this._tail = node
    }
  }

  private _removeNode(node: LinkedMapNode<K, V>): void {
    if (node.prev) {
      node.prev.next = node.next
    } else {
      // Node was head
      this._head = node.next
    }

    if (node.next) {
      node.next.prev = node.prev
    } else {
      // Node was tail
      this._tail = node.prev
    }

    // Clear references for GC
    node.prev = null
    node.next = null
  }

  private _moveToTail(node: LinkedMapNode<K, V>): void {
    if (node === this._tail) {
      // Already at tail
      return
    }
    this._removeNode(node)
    this._appendToTail(node)
  }

  private _evictOne(): void {
    if (!this._head) return

    // Always evict from head (oldest for FIFO, least recently used for LRU)
    const nodeToEvict = this._head
    this._onEvict?.(nodeToEvict.key, nodeToEvict.value)
    this._removeNode(nodeToEvict)
    this._nodeMap.delete(nodeToEvict.key)
    this._evictionCount++
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
