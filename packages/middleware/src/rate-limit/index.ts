/**
 * @dotdo/middleware/rate-limit - Rate Limiting Middleware
 *
 * Uses Cloudflare Rate Limiting bindings for efficient rate limiting.
 * https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/
 */

import type { Context, Next } from 'hono'

/**
 * Rate limiter binding interface (from Cloudflare)
 */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>
}

/**
 * Rate limit middleware options
 */
export interface RateLimitOptions {
  /**
   * Rate limiter binding name in env
   */
  bindingName?: string

  /**
   * Custom key generator - defaults to IP address
   */
  keyGenerator?: (c: Context) => string

  /**
   * Paths to exclude from rate limiting
   */
  excludePaths?: string[]

  /**
   * Custom response when rate limited
   */
  onLimit?: (c: Context) => Response | Promise<Response>
}

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(c: Context): string {
  return (
    c.req.header('CF-Connecting-IP') ||
    c.req.header('X-Forwarded-For')?.split(',')[0] ||
    'unknown'
  )
}

/**
 * Create rate limit middleware using Cloudflare Rate Limiting bindings
 *
 * Usage in wrangler.toml:
 * ```toml
 * [[rate_limiting]]
 * binding = "RATE_LIMITER"
 * namespace_id = "your-namespace-id"
 * ```
 *
 * Usage in worker:
 * ```typescript
 * import { rateLimitMiddleware } from '@dotdo/middleware/rate-limit'
 *
 * app.use('*', rateLimitMiddleware({ bindingName: 'RATE_LIMITER' }))
 * ```
 */
export function rateLimitMiddleware(options: RateLimitOptions = {}) {
  const {
    bindingName = 'RATE_LIMITER',
    keyGenerator = defaultKeyGenerator,
    excludePaths = ['/health'],
    onLimit,
  } = options

  return async (c: Context, next: Next) => {
    const path = new URL(c.req.url).pathname

    // Skip rate limiting for excluded paths
    if (excludePaths.some((p) => path.startsWith(p))) {
      return next()
    }

    // Get rate limiter from env bindings
    const rateLimiter = c.env?.[bindingName] as RateLimiter | undefined

    if (!rateLimiter) {
      // If no rate limiter binding, log warning and continue
      console.warn(`Rate limiter binding '${bindingName}' not found, skipping rate limiting`)
      return next()
    }

    const key = keyGenerator(c)

    try {
      const { success } = await rateLimiter.limit({ key })

      if (!success) {
        // Rate limited
        if (onLimit) {
          return onLimit(c)
        }

        return c.json(
          {
            error: 'Too Many Requests',
            message: 'Rate limit exceeded. Please try again later.',
          },
          429,
          {
            'Retry-After': '60',
          }
        )
      }

      return next()
    } catch (error) {
      // On error, allow the request through (fail open)
      console.error('Rate limiting error:', error)
      return next()
    }
  }
}

/**
 * Rate limit with custom key prefix
 */
export function rateLimitByPrefix(prefix: string, options: RateLimitOptions = {}) {
  const originalKeyGenerator = options.keyGenerator ?? defaultKeyGenerator

  return rateLimitMiddleware({
    ...options,
    keyGenerator: (c) => `${prefix}:${originalKeyGenerator(c)}`,
  })
}

/**
 * Rate limit by user ID (requires auth middleware first)
 */
export function rateLimitByUser(options: RateLimitOptions = {}) {
  return rateLimitMiddleware({
    ...options,
    keyGenerator: (c) => {
      const auth = c.get('auth')
      return auth?.userId || defaultKeyGenerator(c)
    },
  })
}

/**
 * Rate limit by organization (requires auth middleware first)
 */
export function rateLimitByOrg(options: RateLimitOptions = {}) {
  return rateLimitMiddleware({
    ...options,
    keyGenerator: (c) => {
      const auth = c.get('auth')
      return auth?.organizationId || auth?.userId || defaultKeyGenerator(c)
    },
  })
}
