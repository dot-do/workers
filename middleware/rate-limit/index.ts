import { createMiddleware } from 'hono/factory'
import type { Context, MiddlewareHandler } from 'hono'

// Type augmentation for Hono context variables
declare module 'hono' {
  interface ContextVariableMap {
    rateLimit?: number
    rateLimitRemaining?: number
    rateLimitReset?: number
  }
}

export interface RateLimitOptions {
  limit?: number
  window?: number
  keyGenerator?: (c: Context) => string
  handler?: (c: Context) => Response
  headers?: boolean
  store?: RateLimitStore
}

export interface RateLimitStore {
  get(key: string): Promise<RateLimitData | null>
  set(key: string, data: RateLimitData): Promise<void>
}

export interface RateLimitData {
  count: number
  resetAt: number
}

/**
 * In-memory rate limit store (not suitable for distributed systems)
 */
class MemoryStore implements RateLimitStore {
  private data = new Map<string, RateLimitData>()

  async get(key: string): Promise<RateLimitData | null> {
    const data = this.data.get(key)
    if (!data) return null

    // Clean up expired entries
    if (data.resetAt < Date.now()) {
      this.data.delete(key)
      return null
    }

    return data
  }

  async set(key: string, data: RateLimitData): Promise<void> {
    this.data.set(key, data)
  }
}

/**
 * KV-based rate limit store
 */
export class KVStore implements RateLimitStore {
  constructor(private kv: KVNamespace) {}

  async get(key: string): Promise<RateLimitData | null> {
    const value = await this.kv.get(key, 'json')
    if (!value) return null

    const data = value as RateLimitData
    if (data.resetAt < Date.now()) {
      return null
    }

    return data
  }

  async set(key: string, data: RateLimitData): Promise<void> {
    const ttl = Math.ceil((data.resetAt - Date.now()) / 1000)
    await this.kv.put(key, JSON.stringify(data), {
      expirationTtl: ttl,
    })
  }
}

/**
 * Durable Object-based rate limit store
 */
export class DurableObjectStore implements RateLimitStore {
  constructor(private namespace: DurableObjectNamespace) {}

  async get(key: string): Promise<RateLimitData | null> {
    const id = this.namespace.idFromName(key)
    const stub = this.namespace.get(id)
    const response = await stub.fetch('https://rate-limit/get')
    if (!response.ok) return null
    return await response.json()
  }

  async set(key: string, data: RateLimitData): Promise<void> {
    const id = this.namespace.idFromName(key)
    const stub = this.namespace.get(id)
    await stub.fetch('https://rate-limit/set', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }
}

/**
 * Rate limiting middleware
 */
export function rateLimit(options: RateLimitOptions = {}): MiddlewareHandler {
  const {
    limit = 100,
    window = 60,
    keyGenerator = defaultKeyGenerator,
    handler,
    headers = true,
    store = new MemoryStore(),
  } = options

  return createMiddleware(async (c, next) => {
    const key = keyGenerator(c)
    const now = Date.now()
    const windowMs = window * 1000

    // Get current rate limit data
    let data = await store.get(key)

    if (!data || data.resetAt < now) {
      // Start new window
      data = {
        count: 0,
        resetAt: now + windowMs,
      }
    }

    // Increment count
    data.count++

    // Set context variables
    const remaining = Math.max(0, limit - data.count)
    c.set('rateLimit', data.count)
    c.set('rateLimitRemaining', remaining)
    c.set('rateLimitReset', data.resetAt)

    // Check if rate limit exceeded
    if (data.count > limit) {
      const retryAfter = Math.ceil((data.resetAt - now) / 1000)

      if (handler) {
        return handler(c)
      }

      const response = c.json(
        { error: 'Too many requests', retryAfter },
        429
      )

      if (headers) {
        response.headers.set('X-RateLimit-Limit', limit.toString())
        response.headers.set('X-RateLimit-Remaining', '0')
        response.headers.set('X-RateLimit-Reset', Math.floor(data.resetAt / 1000).toString())
        response.headers.set('Retry-After', retryAfter.toString())
      }

      return response
    }

    // Save updated data
    await store.set(key, data)

    // Add rate limit headers
    if (headers) {
      c.header('X-RateLimit-Limit', limit.toString())
      c.header('X-RateLimit-Remaining', remaining.toString())
      c.header('X-RateLimit-Reset', Math.floor(data.resetAt / 1000).toString())
    }

    await next()
  })
}

/**
 * Default key generator - uses IP address
 */
function defaultKeyGenerator(c: Context): string {
  return (
    c.req.header('CF-Connecting-IP') ||
    c.req.header('X-Forwarded-For')?.split(',')[0] ||
    c.req.header('X-Real-IP') ||
    'unknown'
  )
}
