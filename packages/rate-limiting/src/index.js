/**
 * @dotdo/rate-limiting
 *
 * Rate limiting middleware for Cloudflare Workers with:
 * - Token bucket algorithm
 * - Sliding window algorithm
 * - Fail-closed option (deny when uncertain)
 * - Configurable limits per endpoint/user
 */
/**
 * Token Bucket Rate Limiter
 *
 * Allows bursts up to capacity, then limits to the refill rate.
 * Good for APIs that want to allow occasional bursts.
 */
export class TokenBucketRateLimiter {
    config;
    constructor(config) {
        this.config = {
            failMode: 'open',
            ...config,
        };
    }
    async check(key, options = {}) {
        const cost = options.cost ?? 1;
        const now = Date.now();
        try {
            // Get current bucket state
            let state = await this.config.storage.get(key);
            if (!state) {
                // Initialize new bucket
                state = {
                    tokens: this.config.capacity,
                    lastRefill: now,
                };
            }
            // Calculate tokens to add based on time elapsed
            const elapsed = now - state.lastRefill;
            const tokensToAdd = Math.floor(elapsed / this.config.refillInterval) * this.config.refillRate;
            state.tokens = Math.min(this.config.capacity, state.tokens + tokensToAdd);
            state.lastRefill = now;
            // Check if we have enough tokens
            const allowed = state.tokens >= cost;
            if (allowed) {
                state.tokens -= cost;
            }
            // Calculate reset time (time until next refill)
            const resetAt = Math.ceil((now + this.config.refillInterval) / 1000);
            // Save state
            await this.config.storage.set(key, state);
            const result = {
                allowed,
                remaining: Math.max(0, state.tokens),
                limit: this.config.capacity,
                resetAt,
            };
            if (!allowed) {
                // Calculate when they'll have enough tokens
                const tokensNeeded = cost - state.tokens;
                const timeUntilTokens = Math.ceil(tokensNeeded / this.config.refillRate) * this.config.refillInterval;
                result.retryAfter = Math.ceil(timeUntilTokens / 1000);
            }
            return result;
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            if (this.config.failMode === 'closed') {
                return {
                    allowed: false,
                    remaining: 0,
                    limit: this.config.capacity,
                    resetAt: Math.ceil(Date.now() / 1000),
                    error: errorMsg,
                };
            }
            // Fail-open: allow the request but log the error
            return {
                allowed: true,
                remaining: this.config.capacity,
                limit: this.config.capacity,
                resetAt: Math.ceil(Date.now() / 1000),
                error: errorMsg,
            };
        }
    }
    /**
     * Get HTTP headers for rate limit response
     */
    getHeaders(result) {
        const headers = {
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(result.resetAt),
        };
        if (result.retryAfter !== undefined) {
            headers['Retry-After'] = String(result.retryAfter);
        }
        return headers;
    }
}
/**
 * Sliding Window Rate Limiter
 *
 * Smoothly limits requests over a rolling time window.
 * Good for strict rate limiting without allowing bursts.
 */
export class SlidingWindowRateLimiter {
    config;
    constructor(config) {
        this.config = {
            failMode: 'open',
            ...config,
        };
    }
    async check(key, options = {}) {
        const cost = options.cost ?? 1;
        const now = Date.now();
        const windowStart = now - this.config.windowMs;
        try {
            // Get current window state
            let state = await this.config.storage.get(key);
            if (!state) {
                state = { requests: [] };
            }
            // Remove requests outside the current window
            state.requests = state.requests.filter((timestamp) => timestamp > windowStart);
            // Check if we're within limits
            const currentCount = state.requests.length;
            const allowed = currentCount + cost <= this.config.limit;
            if (allowed) {
                // Add new requests for the cost
                for (let i = 0; i < cost; i++) {
                    state.requests.push(now);
                }
            }
            // Save state with TTL matching the window
            await this.config.storage.set(key, state, this.config.windowMs);
            const remaining = Math.max(0, this.config.limit - state.requests.length);
            const resetAt = Math.ceil((now + this.config.windowMs) / 1000);
            const result = {
                allowed,
                remaining,
                limit: this.config.limit,
                resetAt,
            };
            if (!allowed && state.requests.length > 0) {
                // Calculate when the oldest request will slide out
                const oldestRequest = Math.min(...state.requests);
                const timeUntilSlideOut = oldestRequest + this.config.windowMs - now;
                result.retryAfter = Math.ceil(Math.max(0, timeUntilSlideOut) / 1000) + 1;
            }
            return result;
        }
        catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            if (this.config.failMode === 'closed') {
                return {
                    allowed: false,
                    remaining: 0,
                    limit: this.config.limit,
                    resetAt: Math.ceil(Date.now() / 1000),
                    error: errorMsg,
                };
            }
            // Fail-open: allow the request
            return {
                allowed: true,
                remaining: this.config.limit,
                limit: this.config.limit,
                resetAt: Math.ceil(Date.now() / 1000),
                error: errorMsg,
            };
        }
    }
    /**
     * Get HTTP headers for rate limit response
     */
    getHeaders(result) {
        const headers = {
            'X-RateLimit-Limit': String(result.limit),
            'X-RateLimit-Remaining': String(result.remaining),
            'X-RateLimit-Reset': String(result.resetAt),
        };
        if (result.retryAfter !== undefined) {
            headers['Retry-After'] = String(result.retryAfter);
        }
        return headers;
    }
}
/**
 * Factory for creating rate limiters
 */
export const RateLimiter = {
    /**
     * Create a token bucket rate limiter
     */
    tokenBucket(config) {
        return new TokenBucketRateLimiter(config);
    },
    /**
     * Create a sliding window rate limiter
     */
    slidingWindow(config) {
        return new SlidingWindowRateLimiter(config);
    },
};
