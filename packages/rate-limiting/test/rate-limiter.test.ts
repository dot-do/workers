import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  RateLimiter,
  TokenBucketRateLimiter,
  SlidingWindowRateLimiter,
  RateLimitConfig,
  RateLimitResult,
  RateLimitStorage,
  FailMode,
} from '../src/index'

// Mock storage for testing
class MockStorage implements RateLimitStorage {
  private data: Map<string, { value: unknown; expireAt?: number }> = new Map()

  async get<T>(key: string): Promise<T | null> {
    const entry = this.data.get(key)
    if (!entry) return null
    if (entry.expireAt && Date.now() > entry.expireAt) {
      this.data.delete(key)
      return null
    }
    return entry.value as T
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    this.data.set(key, {
      value,
      expireAt: ttlMs ? Date.now() + ttlMs : undefined,
    })
  }

  async delete(key: string): Promise<void> {
    this.data.delete(key)
  }

  clear(): void {
    this.data.clear()
  }
}

// Helper to create storage and limiter within fake timer context
function createTokenBucketLimiter(config?: Partial<{ capacity: number; refillRate: number; refillInterval: number }>) {
  const storage = new MockStorage()
  const limiter = new TokenBucketRateLimiter({
    capacity: config?.capacity ?? 10,
    refillRate: config?.refillRate ?? 1,
    refillInterval: config?.refillInterval ?? 1000,
    storage,
  })
  return { storage, limiter }
}

function createSlidingWindowLimiter(config?: Partial<{ limit: number; windowMs: number }>) {
  const storage = new MockStorage()
  const limiter = new SlidingWindowRateLimiter({
    limit: config?.limit ?? 10,
    windowMs: config?.windowMs ?? 60000,
    storage,
  })
  return { storage, limiter }
}

// Mock storage that simulates failures
class FailingStorage implements RateLimitStorage {
  async get<T>(_key: string): Promise<T | null> {
    throw new Error('Storage unavailable')
  }

  async set<T>(_key: string, _value: T, _ttlMs?: number): Promise<void> {
    throw new Error('Storage unavailable')
  }

  async delete(_key: string): Promise<void> {
    throw new Error('Storage unavailable')
  }
}

describe('RateLimiter', () => {
  describe('TokenBucketRateLimiter', () => {
    let storage: MockStorage
    let limiter: TokenBucketRateLimiter

    beforeEach(() => {
      storage = new MockStorage()
      limiter = new TokenBucketRateLimiter({
        capacity: 10,
        refillRate: 1, // 1 token per second
        refillInterval: 1000, // refill every second
        storage,
      })
    })

    it('should allow requests within rate limit', async () => {
      const result = await limiter.check('user:123')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9)
      expect(result.limit).toBe(10)
    })

    it('should track tokens correctly across multiple requests', async () => {
      // Use 5 tokens
      for (let i = 0; i < 5; i++) {
        const result = await limiter.check('user:123')
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(9 - i)
      }

      // Should have 5 remaining
      const finalResult = await limiter.check('user:123')
      expect(finalResult.allowed).toBe(true)
      expect(finalResult.remaining).toBe(4)
    })

    it('should deny requests when bucket is empty', async () => {
      // Exhaust all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.check('user:123')
      }

      // Next request should be denied
      const result = await limiter.check('user:123')
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should refill tokens over time', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      try {
        // Create storage and limiter AFTER fake timers are set up
        const { limiter: timedLimiter } = createTokenBucketLimiter()

        // Exhaust all tokens
        for (let i = 0; i < 10; i++) {
          await timedLimiter.check('user:123')
        }

        // Advance time by 5 seconds (should refill 5 tokens)
        vi.advanceTimersByTime(5000)

        const result = await timedLimiter.check('user:123')
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBeGreaterThanOrEqual(4) // At least 4 remaining (5 refilled - 1 used)
      } finally {
        vi.useRealTimers()
      }
    })

    it('should isolate rate limits by key', async () => {
      // Exhaust user1's tokens
      for (let i = 0; i < 10; i++) {
        await limiter.check('user:1')
      }

      // user1 should be denied
      const user1Result = await limiter.check('user:1')
      expect(user1Result.allowed).toBe(false)

      // user2 should still be allowed
      const user2Result = await limiter.check('user:2')
      expect(user2Result.allowed).toBe(true)
      expect(user2Result.remaining).toBe(9)
    })

    it('should not exceed capacity when refilling', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      try {
        // Create storage and limiter AFTER fake timers are set up
        const { limiter: timedLimiter } = createTokenBucketLimiter()

        // Make one request
        await timedLimiter.check('user:123')

        // Advance time by 100 seconds (way more than needed to refill)
        vi.advanceTimersByTime(100000)

        const result = await timedLimiter.check('user:123')
        expect(result.remaining).toBeLessThanOrEqual(9) // capacity - 1
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('SlidingWindowRateLimiter', () => {
    let storage: MockStorage
    let limiter: SlidingWindowRateLimiter

    beforeEach(() => {
      storage = new MockStorage()
      limiter = new SlidingWindowRateLimiter({
        limit: 10,
        windowMs: 60000, // 1 minute window
        storage,
      })
    })

    it('should allow requests within rate limit', async () => {
      const result = await limiter.check('user:123')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9)
      expect(result.limit).toBe(10)
    })

    it('should track requests in the current window', async () => {
      for (let i = 0; i < 5; i++) {
        const result = await limiter.check('user:123')
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(9 - i)
      }
    })

    it('should deny requests when limit is exceeded', async () => {
      // Use up all requests
      for (let i = 0; i < 10; i++) {
        await limiter.check('user:123')
      }

      // Next request should be denied
      const result = await limiter.check('user:123')
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfter).toBeGreaterThan(0)
    })

    it('should reset after the window expires', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      try {
        // Create storage and limiter AFTER fake timers are set up
        const { limiter: timedLimiter } = createSlidingWindowLimiter()

        // Use up all requests
        for (let i = 0; i < 10; i++) {
          await timedLimiter.check('user:123')
        }

        // Should be denied
        let result = await timedLimiter.check('user:123')
        expect(result.allowed).toBe(false)

        // Advance past the window
        vi.advanceTimersByTime(61000)

        // Should be allowed again
        result = await timedLimiter.check('user:123')
        expect(result.allowed).toBe(true)
        expect(result.remaining).toBe(9)
      } finally {
        vi.useRealTimers()
      }
    })

    it('should use sliding window logic for smooth rate limiting', async () => {
      vi.useFakeTimers({ toFake: ['Date'] })
      try {
        // Create storage and limiter AFTER fake timers are set up
        const { limiter: timedLimiter } = createSlidingWindowLimiter()

        // Make 5 requests at the start
        for (let i = 0; i < 5; i++) {
          await timedLimiter.check('user:123')
        }

        // Advance 30 seconds (halfway through window)
        vi.advanceTimersByTime(30000)

        // Make 5 more requests
        for (let i = 0; i < 5; i++) {
          await timedLimiter.check('user:123')
        }

        // Should be at limit now
        let result = await timedLimiter.check('user:123')
        expect(result.allowed).toBe(false)

        // Advance 31 more seconds (first 5 requests should slide out)
        vi.advanceTimersByTime(31000)

        // Should be allowed now as old requests slid out
        result = await timedLimiter.check('user:123')
        expect(result.allowed).toBe(true)
      } finally {
        vi.useRealTimers()
      }
    })
  })

  describe('Fail-Closed Mode', () => {
    it('should deny requests when storage fails in fail-closed mode', async () => {
      const failingStorage = new FailingStorage()
      const limiter = new TokenBucketRateLimiter({
        capacity: 10,
        refillRate: 1,
        refillInterval: 1000,
        storage: failingStorage,
        failMode: 'closed',
      })

      const result = await limiter.check('user:123')
      expect(result.allowed).toBe(false)
      expect(result.error).toBe('Storage unavailable')
    })

    it('should allow requests when storage fails in fail-open mode', async () => {
      const failingStorage = new FailingStorage()
      const limiter = new TokenBucketRateLimiter({
        capacity: 10,
        refillRate: 1,
        refillInterval: 1000,
        storage: failingStorage,
        failMode: 'open',
      })

      const result = await limiter.check('user:123')
      expect(result.allowed).toBe(true)
      expect(result.error).toBe('Storage unavailable')
    })

    it('should default to fail-open mode', async () => {
      const failingStorage = new FailingStorage()
      const limiter = new TokenBucketRateLimiter({
        capacity: 10,
        refillRate: 1,
        refillInterval: 1000,
        storage: failingStorage,
        // No failMode specified - should default to 'open'
      })

      const result = await limiter.check('user:123')
      expect(result.allowed).toBe(true)
    })

    it('should support fail-closed in sliding window limiter', async () => {
      const failingStorage = new FailingStorage()
      const limiter = new SlidingWindowRateLimiter({
        limit: 10,
        windowMs: 60000,
        storage: failingStorage,
        failMode: 'closed',
      })

      const result = await limiter.check('user:123')
      expect(result.allowed).toBe(false)
      expect(result.error).toBe('Storage unavailable')
    })
  })

  describe('Per-Endpoint Rate Limiting', () => {
    let storage: MockStorage
    let limiter: TokenBucketRateLimiter

    beforeEach(() => {
      storage = new MockStorage()
      limiter = new TokenBucketRateLimiter({
        capacity: 10,
        refillRate: 1,
        refillInterval: 1000,
        storage,
      })
    })

    it('should support composite keys for per-endpoint limits', async () => {
      // Different endpoints for the same user
      const apiResult = await limiter.check('user:123:endpoint:/api/users')
      const dataResult = await limiter.check('user:123:endpoint:/api/data')

      expect(apiResult.allowed).toBe(true)
      expect(dataResult.allowed).toBe(true)
      expect(apiResult.remaining).toBe(9)
      expect(dataResult.remaining).toBe(9)
    })

    it('should rate limit endpoints independently', async () => {
      // Exhaust /api/users endpoint
      for (let i = 0; i < 10; i++) {
        await limiter.check('user:123:endpoint:/api/users')
      }

      // /api/users should be denied
      const apiResult = await limiter.check('user:123:endpoint:/api/users')
      expect(apiResult.allowed).toBe(false)

      // /api/data should still be allowed
      const dataResult = await limiter.check('user:123:endpoint:/api/data')
      expect(dataResult.allowed).toBe(true)
    })
  })

  describe('RateLimiter Factory', () => {
    let storage: MockStorage

    beforeEach(() => {
      storage = new MockStorage()
    })

    it('should create token bucket limiter via factory', () => {
      const limiter = RateLimiter.tokenBucket({
        capacity: 100,
        refillRate: 10,
        refillInterval: 1000,
        storage,
      })

      expect(limiter).toBeInstanceOf(TokenBucketRateLimiter)
    })

    it('should create sliding window limiter via factory', () => {
      const limiter = RateLimiter.slidingWindow({
        limit: 100,
        windowMs: 60000,
        storage,
      })

      expect(limiter).toBeInstanceOf(SlidingWindowRateLimiter)
    })
  })

  describe('Rate Limit Headers', () => {
    let storage: MockStorage
    let limiter: TokenBucketRateLimiter

    beforeEach(() => {
      storage = new MockStorage()
      limiter = new TokenBucketRateLimiter({
        capacity: 10,
        refillRate: 1,
        refillInterval: 1000,
        storage,
      })
    })

    it('should return headers for HTTP responses', async () => {
      const result = await limiter.check('user:123')
      const headers = limiter.getHeaders(result)

      expect(headers['X-RateLimit-Limit']).toBe('10')
      expect(headers['X-RateLimit-Remaining']).toBe('9')
      expect(headers['X-RateLimit-Reset']).toBeDefined()
    })

    it('should include Retry-After header when rate limited', async () => {
      // Exhaust all tokens
      for (let i = 0; i < 10; i++) {
        await limiter.check('user:123')
      }

      const result = await limiter.check('user:123')
      const headers = limiter.getHeaders(result)

      expect(headers['Retry-After']).toBeDefined()
      expect(Number(headers['Retry-After'])).toBeGreaterThan(0)
    })
  })

  describe('Consume Multiple Tokens', () => {
    let storage: MockStorage
    let limiter: TokenBucketRateLimiter

    beforeEach(() => {
      storage = new MockStorage()
      limiter = new TokenBucketRateLimiter({
        capacity: 10,
        refillRate: 1,
        refillInterval: 1000,
        storage,
      })
    })

    it('should consume multiple tokens in one request', async () => {
      const result = await limiter.check('user:123', { cost: 3 })
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(7)
    })

    it('should deny if not enough tokens for the cost', async () => {
      // Use 8 tokens
      for (let i = 0; i < 8; i++) {
        await limiter.check('user:123')
      }

      // Try to use 3 more (only 2 remaining)
      const result = await limiter.check('user:123', { cost: 3 })
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(2)
    })

    it('should default cost to 1', async () => {
      const result1 = await limiter.check('user:123')
      const result2 = await limiter.check('user:123', {})
      const result3 = await limiter.check('user:123', { cost: 1 })

      expect(result1.remaining).toBe(9)
      expect(result2.remaining).toBe(8)
      expect(result3.remaining).toBe(7)
    })
  })
})
