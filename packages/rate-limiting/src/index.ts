/**
 * @dotdo/rate-limiting
 *
 * Rate limiting middleware for Cloudflare Workers with:
 * - Token bucket algorithm
 * - Sliding window algorithm
 * - Fail-closed option (deny when uncertain)
 * - Configurable limits per endpoint/user
 */

export type FailMode = 'open' | 'closed'

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean
  /** Number of requests/tokens remaining */
  remaining: number
  /** The rate limit */
  limit: number
  /** When the limit resets (Unix timestamp in seconds) */
  resetAt: number
  /** Seconds until retry is allowed (when rate limited) */
  retryAfter?: number
  /** Error message if storage failed */
  error?: string
}

export interface RateLimitStorage {
  get<T>(key: string): Promise<T | null>
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>
  delete(key: string): Promise<void>
}

export interface RateLimitConfig {
  storage: RateLimitStorage
  failMode?: FailMode
}

export interface TokenBucketConfig extends RateLimitConfig {
  /** Maximum number of tokens in the bucket */
  capacity: number
  /** Number of tokens to add per refill */
  refillRate: number
  /** Time between refills in milliseconds */
  refillInterval: number
}

export interface SlidingWindowConfig extends RateLimitConfig {
  /** Maximum requests per window */
  limit: number
  /** Window size in milliseconds */
  windowMs: number
}

export interface CheckOptions {
  /** Number of tokens/requests to consume (default: 1) */
  cost?: number
}

interface BucketState {
  tokens: number
  lastRefill: number
}

interface WindowState {
  requests: number[]
}

/**
 * Token Bucket Rate Limiter
 *
 * Allows bursts up to capacity, then limits to the refill rate.
 * Good for APIs that want to allow occasional bursts.
 */
export class TokenBucketRateLimiter {
  private config: TokenBucketConfig

  constructor(config: TokenBucketConfig) {
    this.config = {
      failMode: 'open',
      ...config,
    }
  }

  async check(key: string, options: CheckOptions = {}): Promise<RateLimitResult> {
    const cost = options.cost ?? 1
    const now = Date.now()

    try {
      // Get current bucket state
      let state = await this.config.storage.get<BucketState>(key)

      if (!state) {
        // Initialize new bucket
        state = {
          tokens: this.config.capacity,
          lastRefill: now,
        }
      }

      // Calculate tokens to add based on time elapsed
      const elapsed = now - state.lastRefill
      const tokensToAdd = Math.floor(elapsed / this.config.refillInterval) * this.config.refillRate
      state.tokens = Math.min(this.config.capacity, state.tokens + tokensToAdd)
      state.lastRefill = now

      // Check if we have enough tokens
      const allowed = state.tokens >= cost
      if (allowed) {
        state.tokens -= cost
      }

      // Calculate reset time (time until next refill)
      const resetAt = Math.ceil((now + this.config.refillInterval) / 1000)

      // Save state
      await this.config.storage.set(key, state)

      const result: RateLimitResult = {
        allowed,
        remaining: Math.max(0, state.tokens),
        limit: this.config.capacity,
        resetAt,
      }

      if (!allowed) {
        // Calculate when they'll have enough tokens
        const tokensNeeded = cost - state.tokens
        const timeUntilTokens = Math.ceil(tokensNeeded / this.config.refillRate) * this.config.refillInterval
        result.retryAfter = Math.ceil(timeUntilTokens / 1000)
      }

      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'

      if (this.config.failMode === 'closed') {
        return {
          allowed: false,
          remaining: 0,
          limit: this.config.capacity,
          resetAt: Math.ceil(Date.now() / 1000),
          error: errorMsg,
        }
      }

      // Fail-open: allow the request but log the error
      return {
        allowed: true,
        remaining: this.config.capacity,
        limit: this.config.capacity,
        resetAt: Math.ceil(Date.now() / 1000),
        error: errorMsg,
      }
    }
  }

  /**
   * Get HTTP headers for rate limit response
   */
  getHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(result.resetAt),
    }

    if (result.retryAfter !== undefined) {
      headers['Retry-After'] = String(result.retryAfter)
    }

    return headers
  }
}

/**
 * Sliding Window Rate Limiter
 *
 * Smoothly limits requests over a rolling time window.
 * Good for strict rate limiting without allowing bursts.
 */
export class SlidingWindowRateLimiter {
  private config: SlidingWindowConfig

  constructor(config: SlidingWindowConfig) {
    this.config = {
      failMode: 'open',
      ...config,
    }
  }

  async check(key: string, options: CheckOptions = {}): Promise<RateLimitResult> {
    const cost = options.cost ?? 1
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    try {
      // Get current window state
      let state = await this.config.storage.get<WindowState>(key)

      if (!state) {
        state = { requests: [] }
      }

      // Remove requests outside the current window
      state.requests = state.requests.filter((timestamp) => timestamp > windowStart)

      // Check if we're within limits
      const currentCount = state.requests.length
      const allowed = currentCount + cost <= this.config.limit

      if (allowed) {
        // Add new requests for the cost
        for (let i = 0; i < cost; i++) {
          state.requests.push(now)
        }
      }

      // Save state with TTL matching the window
      await this.config.storage.set(key, state, this.config.windowMs)

      const remaining = Math.max(0, this.config.limit - state.requests.length)
      const resetAt = Math.ceil((now + this.config.windowMs) / 1000)

      const result: RateLimitResult = {
        allowed,
        remaining,
        limit: this.config.limit,
        resetAt,
      }

      if (!allowed && state.requests.length > 0) {
        // Calculate when the oldest request will slide out
        const oldestRequest = Math.min(...state.requests)
        const timeUntilSlideOut = oldestRequest + this.config.windowMs - now
        result.retryAfter = Math.ceil(Math.max(0, timeUntilSlideOut) / 1000) + 1
      }

      return result
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'

      if (this.config.failMode === 'closed') {
        return {
          allowed: false,
          remaining: 0,
          limit: this.config.limit,
          resetAt: Math.ceil(Date.now() / 1000),
          error: errorMsg,
        }
      }

      // Fail-open: allow the request
      return {
        allowed: true,
        remaining: this.config.limit,
        limit: this.config.limit,
        resetAt: Math.ceil(Date.now() / 1000),
        error: errorMsg,
      }
    }
  }

  /**
   * Get HTTP headers for rate limit response
   */
  getHeaders(result: RateLimitResult): Record<string, string> {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(result.resetAt),
    }

    if (result.retryAfter !== undefined) {
      headers['Retry-After'] = String(result.retryAfter)
    }

    return headers
  }
}

/**
 * Factory for creating rate limiters
 */
export const RateLimiter = {
  /**
   * Create a token bucket rate limiter
   */
  tokenBucket(config: TokenBucketConfig): TokenBucketRateLimiter {
    return new TokenBucketRateLimiter(config)
  },

  /**
   * Create a sliding window rate limiter
   */
  slidingWindow(config: SlidingWindowConfig): SlidingWindowRateLimiter {
    return new SlidingWindowRateLimiter(config)
  },

  /**
   * Create an in-memory rate limiter with automatic cleanup
   */
  inMemory(config: InMemoryRateLimiterConfig): InMemoryRateLimiter {
    return new InMemoryRateLimiter(config)
  },
}

/**
 * Configuration for InMemoryRateLimitStorage
 */
export interface InMemoryRateLimitStorageConfig {
  /** Interval in milliseconds for running cleanup of expired entries (default: 60000 - 1 minute) */
  cleanupIntervalMs?: number
  /** Maximum number of entries to clean up per cycle (default: 1000) - prevents blocking */
  maxCleanupBatchSize?: number
}

/**
 * Memory usage metrics for monitoring
 */
export interface MemoryMetrics {
  /** Total number of entries in storage */
  totalEntries: number
  /** Number of entries with TTL set */
  entriesWithTTL: number
  /** Number of entries without TTL (permanent) */
  permanentEntries: number
  /** Estimated memory usage in bytes (approximate) */
  estimatedBytes: number
  /** Number of entries in the expiry index */
  expiryIndexSize: number
  /** Total entries cleaned up since creation */
  totalCleaned: number
  /** Entries cleaned in last cleanup cycle */
  lastCleanupCount: number
}

/**
 * Entry stored in the in-memory storage
 */
interface StorageEntry<T> {
  value: T
  expiresAt: number | null // null means never expires
}

/**
 * Expiry index entry for efficient cleanup
 */
interface ExpiryEntry {
  key: string
  expiresAt: number
}

/**
 * In-memory implementation of RateLimitStorage with automatic cleanup of expired entries.
 *
 * This implementation addresses the memory leak issue where entries accumulate
 * indefinitely. It provides:
 * - Lazy cleanup on get() - expired entries are removed when accessed
 * - Periodic cleanup with expiry heap - O(1) to find expired entries
 * - Batch-limited cleanup - prevents blocking the event loop
 * - dispose() method - stops the cleanup interval when no longer needed
 * - Memory metrics for monitoring
 *
 * Memory Optimization Features:
 * - Expiry heap for O(1) expired entry detection (vs O(n) full scan)
 * - Batch-limited cleanup to prevent event loop blocking
 * - Accurate memory metrics for capacity planning
 */
export class InMemoryRateLimitStorage implements RateLimitStorage {
  private entries: Map<string, StorageEntry<unknown>> = new Map()
  private cleanupTimeoutId: ReturnType<typeof setTimeout> | null = null
  private cleanupIntervalMs: number
  private maxCleanupBatchSize: number
  private disposed = false

  // Expiry index: sorted array for efficient expired entry lookup
  // Entries are sorted by expiresAt ascending, allowing O(1) check for expired entries
  private expiryIndex: ExpiryEntry[] = []

  // Metrics tracking
  private totalCleaned = 0
  private lastCleanupCount = 0

  constructor(config: InMemoryRateLimitStorageConfig = {}) {
    this.cleanupIntervalMs = config.cleanupIntervalMs ?? 60000 // Default: 1 minute
    this.maxCleanupBatchSize = config.maxCleanupBatchSize ?? 1000 // Default: 1000 entries per cycle

    // Start periodic cleanup using setTimeout (more testable than setInterval)
    this.scheduleCleanup()
  }

  /**
   * Get the number of entries currently stored (for monitoring)
   */
  get size(): number {
    return this.entries.size
  }

  /**
   * Get detailed memory usage metrics
   */
  getMetrics(): MemoryMetrics {
    let entriesWithTTL = 0
    let estimatedBytes = 0

    // Calculate metrics from entries
    for (const [key, entry] of this.entries) {
      // Estimate key size (2 bytes per char for UTF-16)
      estimatedBytes += key.length * 2

      // Estimate value size (rough approximation)
      estimatedBytes += this.estimateValueSize(entry.value)

      // Overhead per entry (object properties, map entry overhead)
      estimatedBytes += 64 // Approximate overhead

      if (entry.expiresAt !== null) {
        entriesWithTTL++
      }
    }

    // Add expiry index overhead
    estimatedBytes += this.expiryIndex.length * 48 // key ref + number + object overhead

    return {
      totalEntries: this.entries.size,
      entriesWithTTL,
      permanentEntries: this.entries.size - entriesWithTTL,
      estimatedBytes,
      expiryIndexSize: this.expiryIndex.length,
      totalCleaned: this.totalCleaned,
      lastCleanupCount: this.lastCleanupCount,
    }
  }

  /**
   * Estimate the size of a value in bytes
   */
  private estimateValueSize(value: unknown): number {
    if (value === null || value === undefined) return 8
    if (typeof value === 'boolean') return 4
    if (typeof value === 'number') return 8
    if (typeof value === 'string') return value.length * 2
    if (Array.isArray(value)) {
      return value.reduce((sum: number, v) => sum + this.estimateValueSize(v), 16)
    }
    if (typeof value === 'object') {
      let size = 16 // Object overhead
      for (const [k, v] of Object.entries(value)) {
        size += k.length * 2 + this.estimateValueSize(v)
      }
      return size
    }
    return 8 // Default for unknown types
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.entries.get(key)

    if (!entry) {
      return null
    }

    // Check if entry has expired (lazy cleanup)
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.entries.delete(key)
      // Note: expiry index will be cleaned up in next scheduled cleanup
      return null
    }

    return entry.value as T
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const now = Date.now()
    const expiresAt = ttlMs !== undefined ? now + ttlMs : null

    // Remove old expiry index entry if updating existing key with TTL
    const existingEntry = this.entries.get(key)
    if (existingEntry?.expiresAt !== null) {
      // Mark for lazy removal (actual cleanup happens during cleanupExpiredEntries)
      // This is more efficient than maintaining perfect index consistency
    }

    this.entries.set(key, {
      value,
      expiresAt,
    })

    // Add to expiry index if TTL is set
    if (expiresAt !== null) {
      this.insertIntoExpiryIndex(key, expiresAt)
    }
  }

  /**
   * Insert entry into expiry index maintaining sorted order
   * Uses binary search for O(log n) insertion
   */
  private insertIntoExpiryIndex(key: string, expiresAt: number): void {
    const entry: ExpiryEntry = { key, expiresAt }

    // Binary search for insertion point
    let left = 0
    let right = this.expiryIndex.length

    while (left < right) {
      const mid = (left + right) >>> 1
      if (this.expiryIndex[mid].expiresAt < expiresAt) {
        left = mid + 1
      } else {
        right = mid
      }
    }

    // Insert at the correct position
    this.expiryIndex.splice(left, 0, entry)
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key)
    // Expiry index entry will be cleaned up lazily during cleanup cycle
  }

  /**
   * Schedule the next cleanup using setTimeout (recursive pattern).
   * This approach is more compatible with fake timers in tests than setInterval.
   */
  private scheduleCleanup(): void {
    if (this.disposed) {
      return
    }

    this.cleanupTimeoutId = setTimeout(() => {
      if (!this.disposed) {
        this.cleanupExpiredEntries()
        this.scheduleCleanup() // Schedule next cleanup
      }
    }, this.cleanupIntervalMs)
  }

  /**
   * Remove expired entries from storage using the expiry index.
   * Uses batch-limited cleanup to prevent blocking the event loop.
   *
   * Optimization: Only checks entries from the expiry index that have
   * expired, rather than scanning all entries. O(k) where k is number
   * of expired entries, vs O(n) for full scan.
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now()
    let cleaned = 0
    let indexCleaned = 0

    // Process expired entries from the beginning of the sorted index
    while (
      this.expiryIndex.length > 0 &&
      cleaned < this.maxCleanupBatchSize
    ) {
      const entry = this.expiryIndex[0]

      // Stop if we've reached non-expired entries
      if (entry.expiresAt > now) {
        break
      }

      // Remove from expiry index
      this.expiryIndex.shift()
      indexCleaned++

      // Check if entry still exists and is actually expired
      // (it might have been updated with a new TTL)
      const storageEntry = this.entries.get(entry.key)
      if (storageEntry && storageEntry.expiresAt !== null && storageEntry.expiresAt <= now) {
        this.entries.delete(entry.key)
        cleaned++
      }
    }

    // Update metrics
    this.lastCleanupCount = cleaned
    this.totalCleaned += cleaned

    // Compact expiry index if it has too many stale entries
    // (entries that no longer exist in storage)
    if (indexCleaned > cleaned * 2 && this.expiryIndex.length > 100) {
      this.compactExpiryIndex()
    }
  }

  /**
   * Remove stale entries from the expiry index.
   * Called when the index has accumulated too many orphaned entries.
   */
  private compactExpiryIndex(): void {
    this.expiryIndex = this.expiryIndex.filter(entry => {
      const storageEntry = this.entries.get(entry.key)
      // Keep if entry exists and expiry time matches
      return storageEntry && storageEntry.expiresAt === entry.expiresAt
    })
  }

  /**
   * Force immediate cleanup of all expired entries (for testing)
   */
  forceCleanup(): void {
    const savedBatchSize = this.maxCleanupBatchSize
    this.maxCleanupBatchSize = Infinity
    this.cleanupExpiredEntries()
    this.maxCleanupBatchSize = savedBatchSize
  }

  /**
   * Stop the cleanup timeout and release resources
   */
  dispose(): void {
    this.disposed = true
    if (this.cleanupTimeoutId) {
      clearTimeout(this.cleanupTimeoutId)
      this.cleanupTimeoutId = null
    }
  }
}

/**
 * Configuration for InMemoryRateLimiter
 */
export interface InMemoryRateLimiterConfig {
  /** Maximum number of tokens in the bucket */
  capacity: number
  /** Number of tokens to add per refill */
  refillRate: number
  /** Time between refills in milliseconds */
  refillInterval: number
  /** How to handle storage errors (default: 'open') */
  failMode?: FailMode
  /** Interval in milliseconds for running cleanup of expired entries (default: 60000) */
  cleanupIntervalMs?: number
  /** TTL for bucket entries in milliseconds (default: 10 * refillInterval) */
  bucketTtlMs?: number
}

/**
 * In-Memory Token Bucket Rate Limiter with automatic cleanup
 *
 * This is a convenience class that combines TokenBucketRateLimiter with
 * InMemoryRateLimitStorage, providing automatic cleanup of expired entries.
 *
 * Use this for:
 * - Single-instance Workers or Durable Objects
 * - Development and testing
 * - Scenarios where distributed state isn't needed
 *
 * For distributed rate limiting, use TokenBucketRateLimiter with a shared
 * storage backend (e.g., Durable Objects, KV).
 */
export class InMemoryRateLimiter {
  private storage: InMemoryRateLimitStorage
  private limiter: TokenBucketRateLimiter
  private bucketTtlMs: number

  constructor(config: InMemoryRateLimiterConfig) {
    this.storage = new InMemoryRateLimitStorage({
      cleanupIntervalMs: config.cleanupIntervalMs,
    })

    // Bucket TTL: how long to keep a bucket before considering it stale
    // Default to 10x the refill interval, which means an inactive bucket
    // will be cleaned up after 10 refill cycles
    this.bucketTtlMs = config.bucketTtlMs ?? config.refillInterval * 10

    this.limiter = new TokenBucketRateLimiter({
      storage: this.createStorageWithTtl(),
      capacity: config.capacity,
      refillRate: config.refillRate,
      refillInterval: config.refillInterval,
      failMode: config.failMode,
    })
  }

  /**
   * Get the number of rate limit buckets currently stored (for monitoring)
   */
  get storageSize(): number {
    return this.storage.size
  }

  /**
   * Check if a request should be allowed
   */
  async check(key: string, options: CheckOptions = {}): Promise<RateLimitResult> {
    return this.limiter.check(key, options)
  }

  /**
   * Get HTTP headers for rate limit response
   */
  getHeaders(result: RateLimitResult): Record<string, string> {
    return this.limiter.getHeaders(result)
  }

  /**
   * Stop the cleanup interval and release resources
   */
  dispose(): void {
    this.storage.dispose()
  }

  /**
   * Create a storage wrapper that automatically sets TTL on entries
   */
  private createStorageWithTtl(): RateLimitStorage {
    const storage = this.storage
    const ttlMs = this.bucketTtlMs

    return {
      get: <T>(key: string) => storage.get<T>(key),
      set: <T>(key: string, value: T) => storage.set(key, value, ttlMs),
      delete: (key: string) => storage.delete(key),
    }
  }
}
