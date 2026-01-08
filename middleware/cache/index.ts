import { createMiddleware } from 'hono/factory'
import type { Context, MiddlewareHandler } from 'hono'

export interface CacheOptions {
  cacheName?: string
  cacheControl?: string
  vary?: string[]
  methods?: string[]
  keyGenerator?: (c: Context) => string
  shouldCache?: (c: Context) => boolean
}

/**
 * Caching middleware using Cloudflare Cache API
 */
export function cache(options: CacheOptions = {}): MiddlewareHandler {
  const {
    cacheName = 'default',
    cacheControl = 'max-age=60',
    vary = ['Accept-Encoding'],
    methods = ['GET', 'HEAD'],
    keyGenerator = defaultKeyGenerator,
    shouldCache = () => true,
  } = options

  return createMiddleware(async (c, next) => {
    // Only cache specified methods
    if (!methods.includes(c.req.method)) {
      await next()
      return
    }

    // Check if should cache
    if (!shouldCache(c)) {
      await next()
      return
    }

    // Get cache instance
    const cacheApi = caches.default || (await caches.open(cacheName))

    // Generate cache key
    const cacheKey = keyGenerator(c)
    const cacheUrl = new URL(cacheKey, 'https://cache.local')

    // Create request for cache lookup
    const cacheRequest = new Request(cacheUrl.toString(), {
      method: c.req.method,
      headers: c.req.raw.headers,
    })

    // Try to get from cache
    const cachedResponse = await cacheApi.match(cacheRequest)

    if (cachedResponse) {
      // Clone the response so we can modify headers
      const response = new Response(cachedResponse.body, cachedResponse)
      response.headers.set('CF-Cache-Status', 'HIT')

      // Calculate age
      const date = response.headers.get('Date')
      if (date) {
        const age = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
        response.headers.set('Age', age.toString())
      }

      return response
    }

    // Not in cache, execute handler
    await next()

    // Get the response
    const response = c.res

    // Only cache successful responses
    if (response.status >= 200 && response.status < 300) {
      // Clone response for caching
      const responseToCache = response.clone()

      // Set cache headers
      const headers = new Headers(responseToCache.headers)
      headers.set('Cache-Control', cacheControl)
      headers.set('CF-Cache-Status', 'MISS')

      // Add Vary headers
      if (vary.length > 0) {
        const existingVary = headers.get('Vary')
        const varyHeaders = existingVary
          ? [...new Set([...existingVary.split(',').map(h => h.trim()), ...vary])]
          : vary
        headers.set('Vary', varyHeaders.join(', '))
      }

      // Create response with updated headers
      const cachedResponseToStore = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers,
      })

      // Store in cache (don't await)
      // Check if executionCtx is available (not in test environment)
      try {
        const ctx = c.executionCtx
        if (ctx) {
          ctx.waitUntil(
            cacheApi.put(cacheRequest, cachedResponseToStore)
          )
        }
      } catch (e) {
        // In test environment or when executionCtx is not available, await the cache put
        await cacheApi.put(cacheRequest, cachedResponseToStore)
      }

      // Update response headers
      c.header('Cache-Control', cacheControl)
      c.header('CF-Cache-Status', 'MISS')
      if (vary.length > 0) {
        c.header('Vary', vary.join(', '))
      }
    }
  })
}

/**
 * Default cache key generator
 */
function defaultKeyGenerator(c: Context): string {
  return c.req.url
}

/**
 * Cache key generator that includes query parameters
 */
export function queryKeyGenerator(c: Context): string {
  const url = new URL(c.req.url)
  return `${url.pathname}?${url.searchParams.toString()}`
}

/**
 * Cache key generator that includes specific headers
 */
export function headerKeyGenerator(...headers: string[]) {
  return (c: Context): string => {
    const url = new URL(c.req.url)
    const headerValues = headers
      .map(h => c.req.header(h) || '')
      .filter(Boolean)
      .join(':')
    return `${url.pathname}${headerValues ? `#${headerValues}` : ''}`
  }
}
