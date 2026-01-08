/**
 * JWKS Cache with Memory Isolation and TTL
 *
 * This module provides a JWKS (JSON Web Key Set) cache with the following features:
 * - TTL (Time-To-Live) for cache entries
 * - Automatic cleanup of expired entries
 * - Memory isolation between different Durable Object instances
 * - LRU eviction when cache reaches size limits
 * - Per-instance and global memory limits
 */

export interface JWKSCacheEntry {
  keys: JsonWebKey[]
  fetchedAt: number
  expiresAt: number
}

export interface JWKSCache {
  get(uri: string): JWKSCacheEntry | undefined
  set(uri: string, entry: JWKSCacheEntry): void
  delete(uri: string): boolean
  clear(): void
  size(): number
  cleanup(): void
}

export interface JWKSCacheFactory {
  createCache(instanceId: string, options?: JWKSCacheOptions): JWKSCache
  getInstanceCache(instanceId: string): JWKSCache | undefined
  destroyInstanceCache(instanceId: string): void
  getAllInstanceIds(): string[]
  getTotalCacheSize(): number
}

export interface JWKSCacheOptions {
  maxEntries?: number
}

export interface JWKSCacheFactoryOptions {
  maxEntriesPerInstance?: number
  maxTotalEntries?: number
}

/**
 * Internal cache entry with access tracking for LRU eviction
 */
interface InternalCacheEntry extends JWKSCacheEntry {
  lastAccessedAt: number
}

/**
 * Default configuration for cache limits
 */
const DEFAULT_MAX_ENTRIES_PER_INSTANCE = 100
const DEFAULT_MAX_TOTAL_ENTRIES = 1000

/**
 * JWKS Cache implementation with TTL and LRU eviction
 */
class JWKSCacheImpl implements JWKSCache {
  private readonly instanceId: string
  private readonly entries: Map<string, InternalCacheEntry> = new Map()
  private readonly factory: JWKSCacheFactoryImpl
  private readonly maxEntries: number

  constructor(instanceId: string, factory: JWKSCacheFactoryImpl, options?: JWKSCacheOptions) {
    this.instanceId = instanceId
    this.factory = factory
    this.maxEntries = options?.maxEntries ?? factory.getMaxEntriesPerInstance()
  }

  get(uri: string): JWKSCacheEntry | undefined {
    const entry = this.entries.get(uri)

    if (!entry) {
      return undefined
    }

    // Check if entry is expired
    if (Date.now() > entry.expiresAt) {
      // Auto-cleanup expired entry
      this.entries.delete(uri)
      return undefined
    }

    // Update last accessed time for LRU tracking
    entry.lastAccessedAt = Date.now()

    return {
      keys: entry.keys,
      fetchedAt: entry.fetchedAt,
      expiresAt: entry.expiresAt,
    }
  }

  set(uri: string, entry: JWKSCacheEntry): void {
    // Check if we need to evict entries before adding
    if (!this.entries.has(uri) && this.entries.size >= this.maxEntries) {
      this.evictLRU()
    }

    // Also check global limit
    if (!this.entries.has(uri) && this.factory.getTotalCacheSize() >= this.factory.getMaxTotalEntries()) {
      this.factory.evictGlobalLRU()
    }

    // Add or update entry
    this.entries.set(uri, {
      ...entry,
      lastAccessedAt: Date.now(),
    })
  }

  delete(uri: string): boolean {
    return this.entries.delete(uri)
  }

  clear(): void {
    this.entries.clear()
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
    }
  }

  /**
   * Evict the least recently used entry from this cache
   */
  private evictLRU(): void {
    if (this.entries.size === 0) return

    let lruUri: string | undefined
    let lruTime = Infinity

    for (const [uri, entry] of this.entries) {
      if (entry.lastAccessedAt < lruTime) {
        lruTime = entry.lastAccessedAt
        lruUri = uri
      }
    }

    if (lruUri) {
      this.entries.delete(lruUri)
    }
  }

  /**
   * Get all entries (for factory-level LRU eviction)
   */
  getEntries(): Map<string, InternalCacheEntry> {
    return this.entries
  }
}

/**
 * Factory for creating and managing JWKS cache instances
 */
class JWKSCacheFactoryImpl implements JWKSCacheFactory {
  private readonly instances: Map<string, JWKSCacheImpl> = new Map()
  private readonly maxEntriesPerInstance: number
  private readonly maxTotalEntries: number

  constructor(options?: JWKSCacheFactoryOptions) {
    this.maxEntriesPerInstance = options?.maxEntriesPerInstance ?? DEFAULT_MAX_ENTRIES_PER_INSTANCE
    this.maxTotalEntries = options?.maxTotalEntries ?? DEFAULT_MAX_TOTAL_ENTRIES
  }

  getMaxEntriesPerInstance(): number {
    return this.maxEntriesPerInstance
  }

  getMaxTotalEntries(): number {
    return this.maxTotalEntries
  }

  createCache(instanceId: string, options?: JWKSCacheOptions): JWKSCache {
    let cache = this.instances.get(instanceId)

    if (!cache) {
      cache = new JWKSCacheImpl(instanceId, this, options)
      this.instances.set(instanceId, cache)
    }

    return cache
  }

  getInstanceCache(instanceId: string): JWKSCache | undefined {
    return this.instances.get(instanceId)
  }

  destroyInstanceCache(instanceId: string): void {
    this.instances.delete(instanceId)
  }

  getAllInstanceIds(): string[] {
    return Array.from(this.instances.keys())
  }

  getTotalCacheSize(): number {
    let total = 0
    for (const cache of this.instances.values()) {
      total += cache.size()
    }
    return total
  }

  /**
   * Evict the least recently used entry across all instances
   * Called when global cache limit is reached
   */
  evictGlobalLRU(): void {
    let lruCache: JWKSCacheImpl | undefined
    let lruUri: string | undefined
    let lruTime = Infinity

    // Find the least recently used entry across all caches
    for (const cache of this.instances.values()) {
      for (const [uri, entry] of cache.getEntries()) {
        if (entry.lastAccessedAt < lruTime) {
          lruTime = entry.lastAccessedAt
          lruUri = uri
          lruCache = cache
        }
      }
    }

    // Evict the LRU entry
    if (lruCache && lruUri) {
      lruCache.delete(lruUri)
    }
  }
}

/**
 * Create a new JWKS cache factory
 */
export function createJWKSCacheFactory(options?: JWKSCacheFactoryOptions): JWKSCacheFactory {
  return new JWKSCacheFactoryImpl(options)
}
