/**
 * Rate Limiting Middleware
 *
 * Supports:
 * - Per-user rate limits (authenticated)
 * - Per-IP rate limits (anonymous)
 * - Configurable limits per route
 */

import type { GatewayContext, RateLimitConfig } from '../types'

/**
 * Default rate limit configuration
 */
const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
}

/**
 * Route-specific rate limits (stricter for expensive operations)
 */
const ROUTE_LIMITS: Record<string, RateLimitConfig> = {
  '/ai/': { windowMs: 60 * 1000, maxRequests: 20 }, // AI operations
  '/batch/': { windowMs: 60 * 1000, maxRequests: 5 }, // Batch operations
  '/workflows/': { windowMs: 60 * 1000, maxRequests: 30 }, // Workflow operations
  '/auth/': { windowMs: 60 * 1000, maxRequests: 10 }, // Auth operations
}

/**
 * In-memory rate limit store (for development)
 * In production, use KV for distributed rate limiting
 */
const rateLimitStore = new Map<
  string,
  {
    count: number
    resetAt: number
  }
>()

/**
 * Get rate limit configuration for a path
 */
function getRateLimitConfig(pathname: string): RateLimitConfig {
  for (const [prefix, config] of Object.entries(ROUTE_LIMITS)) {
    if (pathname.startsWith(prefix)) {
      return config
    }
  }
  return DEFAULT_CONFIG
}

/**
 * Get rate limit identifier (userId or IP)
 */
function getRateLimitIdentifier(request: Request, ctx: GatewayContext): string {
  // Use userId if authenticated
  if (ctx.auth?.userId) {
    return `user:${ctx.auth.userId}`
  }

  // Use IP address for anonymous users
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown'
  return `ip:${ip}`
}

/**
 * Check rate limit using in-memory store
 */
function checkRateLimitMemory(
  identifier: string,
  config: RateLimitConfig
): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  const now = Date.now()
  const record = rateLimitStore.get(identifier)

  if (!record || record.resetAt < now) {
    // Reset the rate limit
    const resetAt = now + config.windowMs
    rateLimitStore.set(identifier, { count: 1, resetAt })
    return { allowed: true, remaining: config.maxRequests - 1, resetAt }
  }

  if (record.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt }
  }

  record.count++
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: record.resetAt,
  }
}

/**
 * Check rate limit using KV (distributed)
 */
async function checkRateLimitKV(
  identifier: string,
  config: RateLimitConfig,
  kv: KVNamespace
): Promise<{
  allowed: boolean
  remaining: number
  resetAt: number
}> {
  const now = Date.now()
  const key = `ratelimit:${identifier}`

  // Get current count
  const recordStr = await kv.get(key)
  const record = recordStr ? JSON.parse(recordStr) : null

  if (!record || record.resetAt < now) {
    // Reset the rate limit
    const resetAt = now + config.windowMs
    const newRecord = { count: 1, resetAt }

    // Store with TTL
    await kv.put(key, JSON.stringify(newRecord), {
      expirationTtl: Math.ceil(config.windowMs / 1000),
    })

    return { allowed: true, remaining: config.maxRequests - 1, resetAt }
  }

  if (record.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt }
  }

  // Increment count
  record.count++
  await kv.put(key, JSON.stringify(record), {
    expirationTtl: Math.ceil((record.resetAt - now) / 1000),
  })

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: record.resetAt,
  }
}

/**
 * Rate limit middleware
 */
export async function rateLimit(request: Request, ctx: GatewayContext): Promise<Response | null> {
  const url = new URL(request.url)
  const config = getRateLimitConfig(url.pathname)
  const identifier = getRateLimitIdentifier(request, ctx)

  // Use KV if available, otherwise use memory
  const result = ctx.env.GATEWAY_KV
    ? await checkRateLimitKV(identifier, config, ctx.env.GATEWAY_KV)
    : checkRateLimitMemory(identifier, config)

  if (!result.allowed) {
    return Response.json(
      {
        error: 'Too many requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000),
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(Math.ceil((result.resetAt - Date.now()) / 1000)),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': String(result.remaining),
          'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
        },
      }
    )
  }

  // Rate limit passed - can add headers to response later
  return null
}

/**
 * Clear rate limit for an identifier (admin only)
 */
export async function clearRateLimit(identifier: string, ctx: GatewayContext): Promise<void> {
  if (ctx.env.GATEWAY_KV) {
    await ctx.env.GATEWAY_KV.delete(`ratelimit:${identifier}`)
  } else {
    rateLimitStore.delete(identifier)
  }
}
