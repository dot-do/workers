/**
 * Rate limiting middleware
 */

import type { ApiContext, RateLimitConfig } from '../types'
import { getClientIp } from '../utils'

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  maxRequests: 100,
  windowMs: 60000, // 1 minute
  keyPrefix: 'ratelimit',
}

/**
 * Check rate limit for request
 * Returns Response if rate limit exceeded, null otherwise
 */
export async function rateLimitCheck(request: Request, ctx: ApiContext): Promise<Response | null> {
  const config = DEFAULT_RATE_LIMIT

  // Determine rate limit key (by user ID or IP)
  const key = ctx.auth ? `user:${ctx.auth.userId}` : `ip:${getClientIp(request)}`
  const rateLimitKey = `${config.keyPrefix}:${key}`

  try {
    // Get current count from KV
    const currentValue = await ctx.env.KV.get(rateLimitKey)
    const current = currentValue ? parseInt(currentValue, 10) : 0

    if (current >= config.maxRequests) {
      // Rate limit exceeded
      const ttl = await ctx.env.KV.getWithMetadata(rateLimitKey)
      const resetTime = ttl.metadata?.resetTime || Date.now() + config.windowMs

      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: `Too many requests. Please try again later.`,
          limit: config.maxRequests,
          resetTime: new Date(resetTime).toISOString(),
          requestId: ctx.requestId,
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(resetTime).toISOString(),
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    // Increment counter
    const newCount = current + 1
    const resetTime = Date.now() + config.windowMs
    await ctx.env.KV.put(rateLimitKey, newCount.toString(), {
      expirationTtl: Math.ceil(config.windowMs / 1000),
      metadata: { resetTime },
    })

    // Add rate limit headers to context for later use
    ctx.rateLimitInfo = {
      limit: config.maxRequests,
      remaining: config.maxRequests - newCount,
      reset: resetTime,
    }

    return null
  } catch (error) {
    console.error('[RateLimit] Error:', error)
    // Don't block requests on rate limit errors
    return null
  }
}
