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
}

/**
 * Entry stored in the in-memory storage
 */
interface StorageEntry<T> {
  value: T
  expiresAt: number | null // null means never expires
}

/**
 * In-memory implementation of RateLimitStorage with automatic cleanup of expired entries.
 *
 * This implementation addresses the memory leak issue where entries accumulate
 * indefinitely. It provides:
 * - Lazy cleanup on get() - expired entries are removed when accessed
 * - Periodic cleanup - a background interval removes expired entries
 * - dispose() method - stops the cleanup interval when no longer needed
 */
export class InMemoryRateLimitStorage implements RateLimitStorage {
  private entries: Map<string, StorageEntry<unknown>> = new Map()
  private cleanupTimeoutId: ReturnType<typeof setTimeout> | null = null
  private cleanupIntervalMs: number
  private disposed = false

  constructor(config: InMemoryRateLimitStorageConfig = {}) {
    this.cleanupIntervalMs = config.cleanupIntervalMs ?? 60000 // Default: 1 minute

    // Start periodic cleanup using setTimeout (more testable than setInterval)
    this.scheduleCleanup()
  }

  /**
   * Get the number of entries currently stored (for monitoring)
   */
  get size(): number {
    return this.entries.size
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.entries.get(key)

    if (!entry) {
      return null
    }

    // Check if entry has expired
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.entries.delete(key)
      return null
    }

    return entry.value as T
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const expiresAt = ttlMs !== undefined ? Date.now() + ttlMs : null

    this.entries.set(key, {
      value,
      expiresAt,
    })
  }

  async delete(key: string): Promise<void> {
    this.entries.delete(key)
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
   * Remove all expired entries from storage
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now()

    for (const [key, entry] of this.entries) {
      if (entry.expiresAt !== null && now > entry.expiresAt) {
        this.entries.delete(key)
      }
    }
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
