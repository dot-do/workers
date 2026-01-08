/**
 * JWKS Cache - Instance-Isolated JWT Key Set Caching
 *
 * This module provides a JWKS caching implementation that:
 * 1. Maintains proper isolation between Durable Object instances
 * 2. Supports TTL (Time-To-Live) with automatic expiration
 * 3. Uses LRU eviction when cache limits are reached
 * 4. Cleans up properly when DO instances are destroyed
 * 5. Provides metrics for cache performance observability
 *
 * Unlike the previous module-level Map approach, this implementation uses
 * a factory pattern where each DO instance gets its own isolated cache.
 *
 * Issues: workers-28tp (isolation), workers-9bpz (metrics optimization)
 */

/**
 * Cache entry for a JWKS endpoint
 */
export interface JWKSCacheEntry {
  keys: JsonWebKey[]
  fetchedAt: number
  expiresAt: number
}

/**
 * Cache metrics for observability
 */
export interface JWKSCacheMetrics {
  /** Total cache hits */
  hits: number
  /** Total cache misses */
  misses: number
  /** Total entries evicted due to LRU */
  evictions: number
  /** Total entries expired and cleaned up */
  expirations: number
  /** Total number of set operations */
  sets: number
  /** Total number of delete operations */
  deletes: number
  /** Cache hit rate (0-1) - hits / (hits + misses) */
  hitRate: number
}

/**
 * Aggregated metrics across all cache instances
 */
export interface JWKSCacheAggregateMetrics extends JWKSCacheMetrics {
  /** Number of active cache instances */
  instanceCount: number
  /** Total entries across all instances */
  totalEntries: number
  /** Metrics breakdown by instance ID */
  byInstance: Map<string, JWKSCacheMetrics>
}

/**
 * Per-instance JWKS cache interface
 */
export interface JWKSCache {
  /** Get a cached JWKS entry, returns undefined if expired or not found */
  get(uri: string): JWKSCacheEntry | undefined
  /** Set a JWKS entry in the cache */
  set(uri: string, entry: JWKSCacheEntry): void
  /** Delete a specific entry */
  delete(uri: string): boolean
  /** Clear all entries in this cache instance */
  clear(): void
  /** Get the number of entries in this cache */
  size(): number
  /** Clean up expired entries */
  cleanup(): void
  /** Get cache performance metrics */
  getMetrics(): JWKSCacheMetrics
  /** Reset metrics counters (useful for testing or periodic reporting) */
  resetMetrics(): void
}

/**
 * Factory for creating and managing instance-isolated JWKS caches
 */
export interface JWKSCacheFactory {
  /** Create a new cache for a specific DO instance */
  createCache(instanceId: string): JWKSCache
  /** Get an existing cache for an instance, undefined if not found */
  getInstanceCache(instanceId: string): JWKSCache | undefined
  /** Destroy and clean up an instance's cache (call when DO is evicted) */
  destroyInstanceCache(instanceId: string): void
  /** Get all active instance IDs */
  getAllInstanceIds(): string[]
  /** Get total cache size across all instances */
  getTotalCacheSize(): number
  /** Get aggregated metrics across all cache instances */
  getAggregateMetrics(): JWKSCacheAggregateMetrics
  /** Reset metrics for all instances */
  resetAllMetrics(): void
}

/**
 * Configuration options for the JWKS cache factory
 */
export interface JWKSCacheFactoryOptions {
  /** Maximum entries per instance (default: 100) */
  maxEntriesPerInstance?: number
  /** Maximum total entries across all instances (default: 1000) */
  maxTotalEntries?: number
  /** Default TTL in milliseconds (default: 1 hour) */
  defaultTtlMs?: number
}

/**
 * Internal cache entry with LRU tracking
 */
interface InternalCacheEntry extends JWKSCacheEntry {
  lastAccessedAt: number
}

/**
 * Internal metrics tracking structure
 */
interface MetricsTracker {
  hits: number
  misses: number
  evictions: number
  expirations: number
  sets: number
  deletes: number
}

/**
 * Create initial metrics
 */
function createInitialMetrics(): MetricsTracker {
  return {
    hits: 0,
    misses: 0,
    evictions: 0,
    expirations: 0,
    sets: 0,
    deletes: 0,
  }
}

/**
 * Calculate hit rate from metrics
 */
function calculateHitRate(metrics: MetricsTracker): number {
  const total = metrics.hits + metrics.misses
  return total === 0 ? 0 : metrics.hits / total
}

/**
 * Per-instance cache implementation with TTL, LRU eviction, and metrics
 */
class JWKSCacheImpl implements JWKSCache {
  private readonly entries: Map<string, InternalCacheEntry> = new Map()
  private readonly maxEntries: number
  private readonly onSizeChange: (delta: number) => void
  private readonly evictGlobalLRU: () => boolean
  private readonly onEviction: () => void
  private metrics: MetricsTracker = createInitialMetrics()

  constructor(
    maxEntries: number,
    onSizeChange: (delta: number) => void,
    evictGlobalLRU: () => boolean,
    onEviction: () => void
  ) {
    this.maxEntries = maxEntries
    this.onSizeChange = onSizeChange
    this.evictGlobalLRU = evictGlobalLRU
    this.onEviction = onEviction
  }

  get(uri: string): JWKSCacheEntry | undefined {
    const entry = this.entries.get(uri)
    if (!entry) {
      this.metrics.misses++
      return undefined
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.entries.delete(uri)
      this.onSizeChange(-1)
      this.metrics.expirations++
      this.metrics.misses++ // Expired entry counts as a miss
      return undefined
    }

    // Update last accessed time for LRU
    entry.lastAccessedAt = Date.now()
    this.metrics.hits++

    // Return without internal tracking field
    return {
      keys: entry.keys,
      fetchedAt: entry.fetchedAt,
      expiresAt: entry.expiresAt,
    }
  }

  set(uri: string, entry: JWKSCacheEntry): void {
    const existing = this.entries.has(uri)

    // Check if we need to evict before adding
    if (!existing) {
      // Evict if at per-instance limit
      if (this.entries.size >= this.maxEntries) {
        this.evictLRU()
      }

      // Evict globally if at total limit - factory handles picking the right cache
      // evictGlobalLRU returns true while we're at/over limit and successfully evicted
      while (this.evictGlobalLRU()) {
        // Keep evicting until we're under the limit or can't evict anymore
      }
    }

    const internalEntry: InternalCacheEntry = {
      ...entry,
      lastAccessedAt: Date.now(),
    }

    this.entries.set(uri, internalEntry)
    this.metrics.sets++

    if (!existing) {
      this.onSizeChange(1)
    }
  }

  delete(uri: string): boolean {
    const existed = this.entries.delete(uri)
    if (existed) {
      this.onSizeChange(-1)
      this.metrics.deletes++
    }
    return existed
  }

  clear(): void {
    const size = this.entries.size
    this.entries.clear()
    this.onSizeChange(-size)
  }

  size(): number {
    return this.entries.size
  }

  cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []

    for (const [uri, entry] of this.entries) {
      if (now > entry.expiresAt) {
        toDelete.push(uri)
      }
    }

    for (const uri of toDelete) {
      this.entries.delete(uri)
      this.onSizeChange(-1)
      this.metrics.expirations++
    }
  }

  getMetrics(): JWKSCacheMetrics {
    return {
      ...this.metrics,
      hitRate: calculateHitRate(this.metrics),
    }
  }

  resetMetrics(): void {
    this.metrics = createInitialMetrics()
  }

  /**
   * Evict the least recently used entry
   */
  evictLRU(): boolean {
    if (this.entries.size === 0) return false

    let oldestUri: string | null = null
    let oldestTime = Infinity

    for (const [uri, entry] of this.entries) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt
        oldestUri = uri
      }
    }

    if (oldestUri) {
      this.entries.delete(oldestUri)
      this.onSizeChange(-1)
      this.metrics.evictions++
      this.onEviction()
      return true
    }
    return false
  }

  /**
   * Get the oldest (least recently accessed) entry time for global LRU
   */
  getOldestEntryTime(): number {
    if (this.entries.size === 0) return Infinity

    let oldestTime = Infinity
    for (const entry of this.entries.values()) {
      if (entry.lastAccessedAt < oldestTime) {
        oldestTime = entry.lastAccessedAt
      }
    }
    return oldestTime
  }
}

/**
 * Factory implementation for creating instance-isolated JWKS caches
 */
class JWKSCacheFactoryImpl implements JWKSCacheFactory {
  private readonly caches: Map<string, JWKSCacheImpl> = new Map()
  private readonly maxEntriesPerInstance: number
  private readonly maxTotalEntries: number
  private totalEntries = 0
  private globalEvictions = 0 // Track evictions triggered at the factory level

  constructor(options: JWKSCacheFactoryOptions = {}) {
    this.maxEntriesPerInstance = options.maxEntriesPerInstance ?? 100
    this.maxTotalEntries = options.maxTotalEntries ?? 1000
  }

  /**
   * Evict the globally least recently used entry across all caches.
   * Returns true if we're at/over the limit (caller should keep trying),
   * or false if we're under the limit or couldn't evict anything.
   */
  private evictGlobalLRU(): boolean {
    // If under limit, no need to evict
    if (this.totalEntries < this.maxTotalEntries) {
      return false
    }

    // Find the cache with the oldest entry
    let oldestCache: JWKSCacheImpl | null = null
    let oldestTime = Infinity

    for (const cache of this.caches.values()) {
      const cacheOldestTime = cache.getOldestEntryTime()
      if (cacheOldestTime < oldestTime) {
        oldestTime = cacheOldestTime
        oldestCache = cache
      }
    }

    // Evict from the cache with the oldest entry
    if (oldestCache) {
      const evicted = oldestCache.evictLRU()
      // Return true if we successfully evicted and are still at/over limit
      return evicted && this.totalEntries >= this.maxTotalEntries
    }

    return false
  }

  createCache(instanceId: string): JWKSCache {
    // Return existing cache if already created
    const existing = this.caches.get(instanceId)
    if (existing) return existing

    const cache = new JWKSCacheImpl(
      this.maxEntriesPerInstance,
      // Callback to track total entries
      (delta: number) => {
        this.totalEntries += delta
      },
      // Callback to evict globally when limit is exceeded
      () => this.evictGlobalLRU(),
      // Callback when eviction happens (for global tracking)
      () => {
        this.globalEvictions++
      }
    )

    this.caches.set(instanceId, cache)
    return cache
  }

  getInstanceCache(instanceId: string): JWKSCache | undefined {
    return this.caches.get(instanceId)
  }

  destroyInstanceCache(instanceId: string): void {
    const cache = this.caches.get(instanceId)
    if (cache) {
      // Update total count before destroying
      this.totalEntries -= cache.size()
      this.caches.delete(instanceId)
    }
  }

  getAllInstanceIds(): string[] {
    return Array.from(this.caches.keys())
  }

  getTotalCacheSize(): number {
    return this.totalEntries
  }

  getAggregateMetrics(): JWKSCacheAggregateMetrics {
    const byInstance = new Map<string, JWKSCacheMetrics>()
    let totalHits = 0
    let totalMisses = 0
    let totalEvictions = 0
    let totalExpirations = 0
    let totalSets = 0
    let totalDeletes = 0

    for (const [instanceId, cache] of this.caches) {
      const metrics = cache.getMetrics()
      byInstance.set(instanceId, metrics)
      totalHits += metrics.hits
      totalMisses += metrics.misses
      totalEvictions += metrics.evictions
      totalExpirations += metrics.expirations
      totalSets += metrics.sets
      totalDeletes += metrics.deletes
    }

    const totalLookups = totalHits + totalMisses
    const hitRate = totalLookups === 0 ? 0 : totalHits / totalLookups

    return {
      hits: totalHits,
      misses: totalMisses,
      evictions: totalEvictions,
      expirations: totalExpirations,
      sets: totalSets,
      deletes: totalDeletes,
      hitRate,
      instanceCount: this.caches.size,
      totalEntries: this.totalEntries,
      byInstance,
    }
  }

  resetAllMetrics(): void {
    for (const cache of this.caches.values()) {
      cache.resetMetrics()
    }
    this.globalEvictions = 0
  }
}

/**
 * Create a new JWKS cache factory
 *
 * Use this in your Durable Object class to manage JWKS caches:
 *
 * @example
 * ```ts
 * // In your DO class
 * class MyDO extends DurableObject {
 *   private jwksCache: JWKSCache
 *
 *   constructor(state: DurableObjectState, env: Env) {
 *     super(state, env)
 *     // Get or create cache for this instance
 *     this.jwksCache = getOrCreateCache(state.id.toString())
 *   }
 *
 *   async destroy() {
 *     // Clean up when DO is evicted
 *     destroyCache(this.state.id.toString())
 *   }
 * }
 * ```
 */
export function createJWKSCacheFactory(
  options?: JWKSCacheFactoryOptions
): JWKSCacheFactory {
  return new JWKSCacheFactoryImpl(options)
}

// Default factory instance - for convenience
// Each DO should still use factory.createCache(instanceId) to get isolated caches
let defaultFactory: JWKSCacheFactory | null = null

/**
 * Get the default JWKS cache factory (creates one if needed)
 */
export function getDefaultFactory(): JWKSCacheFactory {
  if (!defaultFactory) {
    defaultFactory = createJWKSCacheFactory()
  }
  return defaultFactory
}

/**
 * Reset the default factory (useful for testing)
 */
export function resetDefaultFactory(): void {
  defaultFactory = null
}
