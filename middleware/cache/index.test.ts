import { describe, it, expect, beforeEach, vi } from 'vitest'
import { Hono } from 'hono'
import { cache, queryKeyGenerator, headerKeyGenerator } from './index'

// Mock the global caches API
const mockCache = new Map<string, Response>()

globalThis.caches = {
  default: {
    match: async (request: Request) => {
      const key = request.url
      const cached = mockCache.get(key)
      if (cached) {
        return cached.clone()
      }
      return undefined
    },
    put: async (request: Request, response: Response) => {
      const key = request.url
      mockCache.set(key, response.clone())
    },
  } as any,
  open: async () => globalThis.caches.default,
} as any

describe('Cache Middleware', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
    mockCache.clear()
  })

  describe('cache()', () => {
    it('should cache GET requests', async () => {
      let callCount = 0
      app.use('*', cache())
      app.get('/', (c) => {
        callCount++
        return c.json({ count: callCount })
      })

      // First request should miss cache
      const res1 = await app.request('/')
      expect(res1.status).toBe(200)
      const data1 = await res1.json()
      expect(data1.count).toBe(1)
      expect(res1.headers.get('CF-Cache-Status')).toBe('MISS')

      // Second request should hit cache
      const res2 = await app.request('/')
      expect(res2.status).toBe(200)
      const data2 = await res2.json()
      expect(data2.count).toBe(1) // Same response from cache
      expect(res2.headers.get('CF-Cache-Status')).toBe('HIT')
    })

    it('should not cache POST requests by default', async () => {
      let callCount = 0
      app.use('*', cache())
      app.post('/', (c) => {
        callCount++
        return c.json({ count: callCount })
      })

      // First request
      const res1 = await app.request('/', { method: 'POST' })
      expect(res1.status).toBe(200)
      const data1 = await res1.json()
      expect(data1.count).toBe(1)
      expect(res1.headers.get('CF-Cache-Status')).toBeNull()

      // Second request should not be cached
      const res2 = await app.request('/', { method: 'POST' })
      expect(res2.status).toBe(200)
      const data2 = await res2.json()
      expect(data2.count).toBe(2) // New response, not cached
    })

    it('should cache POST requests when specified', async () => {
      let callCount = 0
      app.use('*', cache({ methods: ['GET', 'POST'] }))
      app.post('/', (c) => {
        callCount++
        return c.json({ count: callCount })
      })

      // First request should miss cache
      const res1 = await app.request('/', { method: 'POST' })
      expect(res1.status).toBe(200)
      const data1 = await res1.json()
      expect(data1.count).toBe(1)

      // Second request should hit cache
      const res2 = await app.request('/', { method: 'POST' })
      expect(res2.status).toBe(200)
      const data2 = await res2.json()
      expect(data2.count).toBe(1) // Same response from cache
    })

    it('should set cache control headers', async () => {
      app.use('*', cache({ cacheControl: 'max-age=3600, public' }))
      app.get('/', (c) => c.json({ ok: true }))

      const res = await app.request('/')
      expect(res.status).toBe(200)
      expect(res.headers.get('Cache-Control')).toBe('max-age=3600, public')
    })

    it('should set vary headers', async () => {
      app.use('*', cache({ vary: ['Accept-Language', 'Authorization'] }))
      app.get('/', (c) => c.json({ ok: true }))

      const res = await app.request('/')
      expect(res.status).toBe(200)
      expect(res.headers.get('Vary')).toContain('Accept-Language')
      expect(res.headers.get('Vary')).toContain('Authorization')
    })

    it('should use custom cache key generator', async () => {
      let callCount = 0
      app.use(
        '*',
        cache({
          keyGenerator: (c) => {
            const url = new URL(c.req.url)
            return url.pathname // Ignore query params
          },
        })
      )
      app.get('/', (c) => {
        callCount++
        return c.json({ count: callCount })
      })

      // First request
      const res1 = await app.request('/?v=1')
      expect(res1.status).toBe(200)
      const data1 = await res1.json()
      expect(data1.count).toBe(1)

      // Second request with different query param should hit same cache
      const res2 = await app.request('/?v=2')
      expect(res2.status).toBe(200)
      const data2 = await res2.json()
      expect(data2.count).toBe(1) // Same cached response
    })

    it('should respect shouldCache function', async () => {
      let callCount = 0
      app.use(
        '*',
        cache({
          shouldCache: (c) => {
            // Don't cache if query param present
            return !c.req.query('nocache')
          },
        })
      )
      app.get('/', (c) => {
        callCount++
        return c.json({ count: callCount })
      })

      // First request without nocache - should cache
      const res1 = await app.request('/')
      expect(res1.status).toBe(200)
      const data1 = await res1.json()
      expect(data1.count).toBe(1)

      // Second request without nocache - should hit cache
      const res2 = await app.request('/')
      expect(res2.status).toBe(200)
      const data2 = await res2.json()
      expect(data2.count).toBe(1)

      // Request with nocache - should not cache
      const res3 = await app.request('/?nocache=1')
      expect(res3.status).toBe(200)
      const data3 = await res3.json()
      expect(data3.count).toBe(2)
      expect(res3.headers.get('CF-Cache-Status')).toBeNull()
    })

    it('should not cache error responses', async () => {
      let callCount = 0
      app.use('*', cache())
      app.get('/', (c) => {
        callCount++
        return c.json({ error: 'Not found' }, 404)
      })

      // First request
      const res1 = await app.request('/')
      expect(res1.status).toBe(404)

      // Second request should not be cached
      const res2 = await app.request('/')
      expect(res2.status).toBe(404)
      expect(res2.headers.get('CF-Cache-Status')).toBeNull()
    })
  })

  describe('queryKeyGenerator', () => {
    it('should include query parameters in cache key', async () => {
      let callCount = 0
      app.use('*', cache({ keyGenerator: queryKeyGenerator }))
      app.get('/', (c) => {
        callCount++
        return c.json({ count: callCount, query: c.req.query() })
      })

      // First request with query params
      const res1 = await app.request('/?page=1&sort=date')
      const data1 = await res1.json()
      expect(data1.count).toBe(1)

      // Same query params should hit cache
      const res2 = await app.request('/?page=1&sort=date')
      const data2 = await res2.json()
      expect(data2.count).toBe(1)

      // Different query params should miss cache
      const res3 = await app.request('/?page=2&sort=date')
      const data3 = await res3.json()
      expect(data3.count).toBe(2)
    })
  })

  describe('headerKeyGenerator', () => {
    it('should include specified headers in cache key', async () => {
      let callCount = 0
      app.use('*', cache({ keyGenerator: headerKeyGenerator('Accept-Language') }))
      app.get('/', (c) => {
        callCount++
        return c.json({ count: callCount })
      })

      // First request with header
      const res1 = await app.request('/', {
        headers: { 'Accept-Language': 'en-US' },
      })
      const data1 = await res1.json()
      expect(data1.count).toBe(1)

      // Same header should hit cache
      const res2 = await app.request('/', {
        headers: { 'Accept-Language': 'en-US' },
      })
      const data2 = await res2.json()
      expect(data2.count).toBe(1)

      // Different header should miss cache
      const res3 = await app.request('/', {
        headers: { 'Accept-Language': 'fr-FR' },
      })
      const data3 = await res3.json()
      expect(data3.count).toBe(2)
    })
  })
})
