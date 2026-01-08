import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { rateLimit, KVStore } from './index'

describe('Rate Limit Middleware', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
  })

  describe('rateLimit()', () => {
    it('should allow requests under the limit', async () => {
      app.use('*', rateLimit({ limit: 5, window: 60 }))
      app.get('/', (c) => c.json({ ok: true }))

      for (let i = 0; i < 5; i++) {
        const res = await app.request('/')
        expect(res.status).toBe(200)
      }
    })

    it('should block requests over the limit', async () => {
      app.use('*', rateLimit({ limit: 3, window: 60 }))
      app.get('/', (c) => c.json({ ok: true }))

      // First 3 requests should succeed
      for (let i = 0; i < 3; i++) {
        const res = await app.request('/')
        expect(res.status).toBe(200)
      }

      // 4th request should be rate limited
      const res = await app.request('/')
      expect(res.status).toBe(429)
      const data = await res.json()
      expect(data.error).toBe('Too many requests')
    })

    it('should set rate limit headers', async () => {
      app.use('*', rateLimit({ limit: 10, window: 60 }))
      app.get('/', (c) => c.json({ ok: true }))

      const res = await app.request('/')
      expect(res.status).toBe(200)
      expect(res.headers.get('X-RateLimit-Limit')).toBe('10')
      expect(res.headers.get('X-RateLimit-Remaining')).toBe('9')
      expect(res.headers.get('X-RateLimit-Reset')).toBeTruthy()
    })

    it('should set context variables', async () => {
      app.use('*', rateLimit({ limit: 10, window: 60 }))
      app.get('/', (c) => {
        return c.json({
          rateLimit: c.get('rateLimit'),
          rateLimitRemaining: c.get('rateLimitRemaining'),
          rateLimitReset: c.get('rateLimitReset'),
        })
      })

      const res = await app.request('/')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.rateLimit).toBe(1)
      expect(data.rateLimitRemaining).toBe(9)
      expect(data.rateLimitReset).toBeGreaterThan(Date.now())
    })

    it('should use custom key generator', async () => {
      app.use(
        '*',
        rateLimit({
          limit: 2,
          window: 60,
          keyGenerator: (c) => c.req.header('X-User-ID') || 'anonymous',
        })
      )
      app.get('/', (c) => c.json({ ok: true }))

      // User 1 can make 2 requests
      for (let i = 0; i < 2; i++) {
        const res = await app.request('/', {
          headers: { 'X-User-ID': 'user-1' },
        })
        expect(res.status).toBe(200)
      }

      // User 1's 3rd request should be blocked
      const res1 = await app.request('/', {
        headers: { 'X-User-ID': 'user-1' },
      })
      expect(res1.status).toBe(429)

      // User 2 should still be able to make requests
      const res2 = await app.request('/', {
        headers: { 'X-User-ID': 'user-2' },
      })
      expect(res2.status).toBe(200)
    })

    it('should use custom handler', async () => {
      app.use(
        '*',
        rateLimit({
          limit: 1,
          window: 60,
          handler: (c) => {
            return c.json(
              {
                message: 'Custom rate limit message',
                reset: c.get('rateLimitReset'),
              },
              429
            )
          },
        })
      )
      app.get('/', (c) => c.json({ ok: true }))

      // First request succeeds
      const res1 = await app.request('/')
      expect(res1.status).toBe(200)

      // Second request uses custom handler
      const res2 = await app.request('/')
      expect(res2.status).toBe(429)
      const data = await res2.json()
      expect(data.message).toBe('Custom rate limit message')
      expect(data.reset).toBeGreaterThan(Date.now())
    })

    it('should not include headers when headers=false', async () => {
      app.use('*', rateLimit({ limit: 10, window: 60, headers: false }))
      app.get('/', (c) => c.json({ ok: true }))

      const res = await app.request('/')
      expect(res.status).toBe(200)
      expect(res.headers.get('X-RateLimit-Limit')).toBeNull()
      expect(res.headers.get('X-RateLimit-Remaining')).toBeNull()
      expect(res.headers.get('X-RateLimit-Reset')).toBeNull()
    })
  })
})
