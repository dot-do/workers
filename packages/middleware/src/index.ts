/**
 * Shared middleware for all Workers services
 * @module @dot-do/worker-middleware
 */

import type { Context, Next } from 'hono'
import { error } from '@dot-do/worker-utils'

/**
 * CORS middleware
 */
export function cors(options: { origins?: string[]; methods?: string[]; headers?: string[] } = {}) {
  const { origins = ['*'], methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], headers = ['Content-Type', 'Authorization'] } = options

  return async (c: Context, next: Next) => {
    // Handle preflight
    if (c.req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origins.join(', '),
          'Access-Control-Allow-Methods': methods.join(', '),
          'Access-Control-Allow-Headers': headers.join(', '),
          'Access-Control-Max-Age': '86400',
        },
      })
    }

    // Process request
    await next()

    // Add CORS headers to response
    c.res.headers.set('Access-Control-Allow-Origin', origins.join(', '))
    c.res.headers.set('Access-Control-Allow-Methods', methods.join(', '))
    c.res.headers.set('Access-Control-Allow-Headers', headers.join(', '))
  }
}

/**
 * Authentication middleware
 */
export function auth(options: { required?: boolean; headerName?: string } = {}) {
  const { required = true, headerName = 'Authorization' } = options

  return async (c: Context, next: Next) => {
    const token = c.req.header(headerName)

    if (!token) {
      if (required) {
        return error('UNAUTHORIZED', 'Missing authentication token', undefined, 401)
      }
      c.set('user', null)
      await next()
      return
    }

    // TODO: Validate token with auth service
    // For now, just extract from Bearer token
    const userId = token.replace('Bearer ', '')

    c.set('user', { id: userId })
    await next()
  }
}

/**
 * Rate limiting middleware (simple in-memory implementation)
 */
export function rateLimit(options: { maxRequests?: number; windowMs?: number } = {}) {
  const { maxRequests = 100, windowMs = 60000 } = options
  const requests = new Map<string, number[]>()

  return async (c: Context, next: Next) => {
    const key = c.req.header('CF-Connecting-IP') || 'unknown'
    const now = Date.now()

    // Get request timestamps for this key
    let timestamps = requests.get(key) || []

    // Filter out old timestamps
    timestamps = timestamps.filter((ts) => now - ts < windowMs)

    // Check if rate limit exceeded
    if (timestamps.length >= maxRequests) {
      return error('RATE_LIMIT_EXCEEDED', 'Too many requests', { retryAfter: Math.ceil(windowMs / 1000) }, 429)
    }

    // Add current timestamp
    timestamps.push(now)
    requests.set(key, timestamps)

    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      for (const [k, ts] of requests.entries()) {
        if (ts.every((t) => now - t > windowMs)) {
          requests.delete(k)
        }
      }
    }

    await next()
  }
}

/**
 * Request ID middleware
 */
export function requestId() {
  return async (c: Context, next: Next) => {
    const requestId = c.req.header('X-Request-ID') || crypto.randomUUID()
    c.set('requestId', requestId)
    await next()
    c.res.headers.set('X-Request-ID', requestId)
  }
}

/**
 * Logging middleware
 */
export function logger() {
  return async (c: Context, next: Next) => {
    const start = Date.now()
    const method = c.req.method
    const path = c.req.path
    const requestId = c.get('requestId') || 'unknown'

    console.log(`[${requestId}] → ${method} ${path}`)

    await next()

    const duration = Date.now() - start
    const status = c.res.status

    console.log(`[${requestId}] ← ${method} ${path} ${status} (${duration}ms)`)
  }
}

/**
 * Error handling middleware
 */
export function errorHandler() {
  return async (c: Context, next: Next) => {
    try {
      await next()
    } catch (err) {
      console.error('Request error:', err)

      if (err instanceof Error) {
        return error('INTERNAL_ERROR', err.message, { stack: err.stack }, 500)
      }

      return error('INTERNAL_ERROR', 'Unknown error', err, 500)
    }
  }
}

/**
 * Cache middleware
 */
export function cache(options: { ttl?: number; cacheControl?: string } = {}) {
  const { ttl = 300, cacheControl = `public, max-age=${ttl}` } = options

  return async (c: Context, next: Next) => {
    const cache = caches.default
    const cacheKey = new Request(c.req.url, { method: 'GET' })

    // Try to get from cache
    const cached = await cache.match(cacheKey)
    if (cached) {
      return new Response(cached.body, {
        status: cached.status,
        headers: {
          ...Object.fromEntries(cached.headers.entries()),
          'X-Cache': 'HIT',
        },
      })
    }

    // Process request
    await next()

    // Cache response if successful
    if (c.res.status === 200) {
      const response = c.res.clone()
      response.headers.set('Cache-Control', cacheControl)
      response.headers.set('X-Cache', 'MISS')
      c.executionCtx?.waitUntil(cache.put(cacheKey, response))
    }
  }
}

/**
 * JSON validation middleware
 */
export function validateJson<T = any>(schema?: (data: any) => T) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json()

      if (schema) {
        const validated = schema(body)
        c.set('body', validated)
      } else {
        c.set('body', body)
      }

      await next()
    } catch (err) {
      return error('INVALID_JSON', err instanceof Error ? err.message : 'Invalid JSON body', err, 400)
    }
  }
}
