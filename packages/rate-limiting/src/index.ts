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

      // Save state with TTL to allow cleanup of inactive buckets
      // Use 100x refill interval as TTL so inactive buckets are eventually cleaned up
      const ttl = this.config.refillInterval * 100
      await this.config.storage.set(key, state, ttl)

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
}

/**
 * Storage entry with expiry information
 */
interface StorageEntry<T = any> {
  value: T
  expiresAt?: number // Timestamp in ms when entry expires, undefined = never expires
}

/**
 * Configuration for InMemoryRateLimitStorage
 */
export interface InMemoryStorageConfig {
  /** How often to run cleanup of expired entries (milliseconds) */
  cleanupIntervalMs?: number
}

/**
 * In-Memory Rate Limit Storage
 *
 * Provides an in-memory implementation of RateLimitStorage with:
 * - Automatic cleanup of expired entries
 * - Memory monitoring via size property
 * - Proper resource disposal
 */
export class InMemoryRateLimitStorage implements RateLimitStorage {
  private store = new Map<string, StorageEntry>()
  private cleanupInterval?: ReturnType<typeof setInterval>
  private cleanupIntervalMs?: number

  constructor(config: InMemoryStorageConfig = {}) {
    this.cleanupIntervalMs = config.cleanupIntervalMs
    // Cleanup interval is started lazily when first item is added
  }

  private startCleanupIfNeeded(): void {
    // Start cleanup interval if configured and not already running
    if (
      this.cleanupIntervalMs !== undefined &&
      this.cleanupIntervalMs > 0 &&
      this.cleanupInterval === undefined &&
      this.store.size > 0
    ) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup()
        // Stop interval if store is empty to prevent infinite loops in tests
        if (this.store.size === 0) {
          this.stopCleanup()
        }
      }, this.cleanupIntervalMs)
    }
  }

  private stopCleanup(): void {
    if (this.cleanupInterval !== undefined) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = undefined
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key)

    if (!entry) {
      return null
    }

    // Check if entry has expired (use > so entry is valid up to and including expiresAt)
    if (entry.expiresAt !== undefined && Date.now() > entry.expiresAt) {
      // Remove expired entry
      this.store.delete(key)
      return null
    }

    return entry.value as T
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    const entry: StorageEntry<T> = {
      value,
      expiresAt: ttlMs !== undefined ? Date.now() + ttlMs : undefined,
    }

    this.store.set(key, entry)
    this.startCleanupIfNeeded()
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key)
  }

  /**
   * Get the current number of entries in storage
   */
  get size(): number {
    return this.store.size
  }

  /**
   * Clean up all expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt !== undefined && now > entry.expiresAt) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.store.delete(key)
    }
  }

  /**
   * Dispose of the storage and clean up resources
   */
  dispose(): void {
    this.stopCleanup()
    this.store.clear()
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
  /** How often to run cleanup of expired entries (milliseconds) */
  cleanupIntervalMs?: number
  /** Fail mode (default: 'open') */
  failMode?: FailMode
}

/**
 * In-Memory Rate Limiter
 *
 * A token bucket rate limiter with in-memory storage and automatic cleanup.
 */
export class InMemoryRateLimiter extends TokenBucketRateLimiter {
  private storage: InMemoryRateLimitStorage

  constructor(config: InMemoryRateLimiterConfig) {
    // Create storage with cleanup configuration
    const storage = new InMemoryRateLimitStorage({
      cleanupIntervalMs: config.cleanupIntervalMs,
    })

    // Pass storage to parent TokenBucketRateLimiter
    super({
      storage,
      capacity: config.capacity,
      refillRate: config.refillRate,
      refillInterval: config.refillInterval,
      failMode: config.failMode,
    })

    this.storage = storage
  }

  /**
   * Get the current number of entries in storage
   */
  get storageSize(): number {
    return this.storage.size
  }

  /**
   * Dispose of the limiter and clean up resources
   */
  dispose(): void {
    this.storage.dispose()
  }
}
