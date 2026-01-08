import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { cors } from './index'

describe('CORS Middleware', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
  })

  describe('cors()', () => {
    it('should set Access-Control-Allow-Origin to * by default', async () => {
      app.use('*', cors())
      app.get('/', (c) => c.json({ ok: true }))

      const res = await app.request('/', {
        headers: {
          Origin: 'https://example.com',
        },
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    })

    it('should handle preflight requests', async () => {
      app.use('*', cors())
      app.get('/', (c) => c.json({ ok: true }))

      const res = await app.request('/', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      })

      expect(res.status).toBe(204)
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
      expect(res.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type')
    })

    it('should allow specific origin', async () => {
      app.use('*', cors({ origin: 'https://app.example.com' }))
      app.get('/', (c) => c.json({ ok: true }))

      const res = await app.request('/', {
        headers: {
          Origin: 'https://app.example.com',
        },
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://app.example.com'
      )
    })

    it('should allow multiple origins', async () => {
      app.use(
        '*',
        cors({
          origin: ['https://app.example.com', 'https://admin.example.com'],
        })
      )
      app.get('/', (c) => c.json({ ok: true }))

      // First origin should work
      const res1 = await app.request('/', {
        headers: {
          Origin: 'https://app.example.com',
        },
      })
      expect(res1.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://app.example.com'
      )

      // Second origin should work
      const res2 = await app.request('/', {
        headers: {
          Origin: 'https://admin.example.com',
        },
      })
      expect(res2.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://admin.example.com'
      )

      // Other origin should not work
      const res3 = await app.request('/', {
        headers: {
          Origin: 'https://other.example.com',
        },
      })
      expect(res3.headers.get('Access-Control-Allow-Origin')).toBeNull()
    })

    it('should use dynamic origin function', async () => {
      app.use(
        '*',
        cors({
          origin: (origin) => {
            if (origin.endsWith('.example.com')) {
              return origin
            }
            return null
          },
        })
      )
      app.get('/', (c) => c.json({ ok: true }))

      // Matching origin should work
      const res1 = await app.request('/', {
        headers: {
          Origin: 'https://app.example.com',
        },
      })
      expect(res1.headers.get('Access-Control-Allow-Origin')).toBe(
        'https://app.example.com'
      )

      // Non-matching origin should not work
      const res2 = await app.request('/', {
        headers: {
          Origin: 'https://evil.com',
        },
      })
      expect(res2.headers.get('Access-Control-Allow-Origin')).toBeNull()
    })

    it('should set credentials header when enabled', async () => {
      app.use(
        '*',
        cors({
          origin: 'https://app.example.com',
          credentials: true,
        })
      )
      app.get('/', (c) => c.json({ ok: true }))

      const res = await app.request('/', {
        headers: {
          Origin: 'https://app.example.com',
        },
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true')
    })

    it('should not set credentials with wildcard origin', async () => {
      app.use('*', cors({ credentials: true }))
      app.get('/', (c) => c.json({ ok: true }))

      const res = await app.request('/', {
        headers: {
          Origin: 'https://example.com',
        },
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('Access-Control-Allow-Credentials')).toBeNull()
    })

    it('should set max age header', async () => {
      app.use('*', cors({ maxAge: 86400 }))
      app.get('/', (c) => c.json({ ok: true }))

      const res = await app.request('/', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://example.com',
          'Access-Control-Request-Method': 'POST',
        },
      })

      expect(res.status).toBe(204)
      expect(res.headers.get('Access-Control-Max-Age')).toBe('86400')
    })

    it('should set expose headers', async () => {
      app.use(
        '*',
        cors({
          exposeHeaders: ['X-Custom-Header', 'X-Another-Header'],
        })
      )
      app.get('/', (c) => c.json({ ok: true }))

      const res = await app.request('/', {
        headers: {
          Origin: 'https://example.com',
        },
      })

      expect(res.status).toBe(200)
      expect(res.headers.get('Access-Control-Expose-Headers')).toBe(
        'X-Custom-Header, X-Another-Header'
      )
    })

    it('should set allow headers', async () => {
      app.use(
        '*',
        cors({
          allowHeaders: ['Content-Type', 'Authorization'],
        })
      )
      app.get('/', (c) => c.json({ ok: true }))

      const res = await app.request('/', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'X-Custom',
        },
      })

      expect(res.status).toBe(204)
      expect(res.headers.get('Access-Control-Allow-Headers')).toBe(
        'Content-Type, Authorization'
      )
    })

    it('should set allow methods', async () => {
      app.use(
        '*',
        cors({
          allowMethods: ['GET', 'POST'],
        })
      )
      app.get('/', (c) => c.json({ ok: true }))

      const res = await app.request('/', {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://example.com',
          'Access-Control-Request-Method': 'POST',
        },
      })

      expect(res.status).toBe(204)
      expect(res.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST')
    })
  })
})
