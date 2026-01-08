import { describe, it, expect, beforeEach } from 'vitest'
import { Hono } from 'hono'
import { auth, requireAuth, apiKey } from './index'

describe('Auth Middleware', () => {
  let app: Hono

  beforeEach(() => {
    app = new Hono()
  })

  describe('auth()', () => {
    it('should set isAuth to false when no token provided', async () => {
      app.use('*', auth())
      app.get('/', (c) => {
        return c.json({
          isAuth: c.get('isAuth'),
          user: c.get('user'),
        })
      })

      const res = await app.request('/')
      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.isAuth).toBe(false)
      expect(data.user).toBeUndefined()
    })

    it('should parse user from cookie', async () => {
      app.use('*', auth({ jwtSecret: 'test-secret' }))
      app.get('/', (c) => {
        return c.json({
          isAuth: c.get('isAuth'),
          userId: c.get('userId'),
        })
      })

      // Create a simple JWT token for testing
      const token = await createTestJWT({ sub: 'user-123' }, 'test-secret')

      const res = await app.request('/', {
        headers: {
          Cookie: `auth=${token}`,
        },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.isAuth).toBe(true)
      expect(data.userId).toBe('user-123')
    })

    it('should parse user from Authorization header', async () => {
      app.use('*', auth({ jwtSecret: 'test-secret' }))
      app.get('/', (c) => {
        return c.json({
          isAuth: c.get('isAuth'),
          userId: c.get('userId'),
        })
      })

      const token = await createTestJWT({ sub: 'user-456' }, 'test-secret')

      const res = await app.request('/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.isAuth).toBe(true)
      expect(data.userId).toBe('user-456')
    })

    it('should return 401 when optional=false and no token', async () => {
      app.use('*', auth({ optional: false, jwtSecret: 'test-secret' }))
      app.get('/', (c) => c.json({ ok: true }))

      const res = await app.request('/')
      expect(res.status).toBe(401)
    })
  })

  describe('requireAuth()', () => {
    it('should block unauthenticated requests', async () => {
      app.use('*', auth())
      app.use('*', requireAuth())
      app.get('/', (c) => c.json({ ok: true }))

      const res = await app.request('/')
      expect(res.status).toBe(401)
    })

    it('should allow authenticated requests', async () => {
      app.use('*', auth({ jwtSecret: 'test-secret' }))
      app.use('*', requireAuth())
      app.get('/', (c) => c.json({ ok: true }))

      const token = await createTestJWT({ sub: 'user-123' }, 'test-secret')

      const res = await app.request('/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      expect(res.status).toBe(200)
    })

    it('should check roles when specified', async () => {
      app.use('*', auth({ jwtSecret: 'test-secret' }))
      app.use('/admin/*', requireAuth({ roles: ['admin'] }))
      app.get('/admin/dashboard', (c) => c.json({ ok: true }))

      const token = await createTestJWT(
        { sub: 'user-123', user: { id: 'user-123', roles: ['user'] } },
        'test-secret'
      )

      const res = await app.request('/admin/dashboard', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      expect(res.status).toBe(403)
    })

    it('should allow requests with correct role', async () => {
      app.use('*', auth({ jwtSecret: 'test-secret' }))
      app.use('/admin/*', requireAuth({ roles: ['admin'] }))
      app.get('/admin/dashboard', (c) => c.json({ ok: true }))

      const token = await createTestJWT(
        { sub: 'user-123', user: { id: 'user-123', roles: ['admin'] } },
        'test-secret'
      )

      const res = await app.request('/admin/dashboard', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      expect(res.status).toBe(200)
    })
  })

  describe('apiKey()', () => {
    it('should authenticate with API key in header', async () => {
      app.use(
        '*',
        apiKey({
          validate: async (key) => {
            if (key === 'valid-key') {
              return { id: 'api-user' }
            }
            return null
          },
        })
      )
      app.get('/', (c) => {
        return c.json({
          isAuth: c.get('isAuth'),
          userId: c.get('userId'),
        })
      })

      const res = await app.request('/', {
        headers: {
          'X-API-Key': 'valid-key',
        },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.isAuth).toBe(true)
      expect(data.userId).toBe('api-user')
    })

    it('should authenticate with API key in query param', async () => {
      app.use(
        '*',
        apiKey({
          validate: async (key) => {
            if (key === 'valid-key') {
              return { id: 'api-user' }
            }
            return null
          },
        })
      )
      app.get('/', (c) => {
        return c.json({
          isAuth: c.get('isAuth'),
          userId: c.get('userId'),
        })
      })

      const res = await app.request('/?api_key=valid-key')

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.isAuth).toBe(true)
      expect(data.userId).toBe('api-user')
    })

    it('should skip if already authenticated', async () => {
      app.use('*', auth({ jwtSecret: 'test-secret' }))
      app.use('*', apiKey({ optional: true }))
      app.get('/', (c) => {
        return c.json({
          isAuth: c.get('isAuth'),
          userId: c.get('userId'),
        })
      })

      const token = await createTestJWT({ sub: 'jwt-user' }, 'test-secret')

      const res = await app.request('/', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      expect(res.status).toBe(200)
      const data = await res.json()
      expect(data.isAuth).toBe(true)
      expect(data.userId).toBe('jwt-user')
    })
  })
})

// Helper function to create test JWT tokens
async function createTestJWT(payload: any, secret: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' }
  const headerB64 = base64UrlEncode(JSON.stringify(header))
  const payloadB64 = base64UrlEncode(JSON.stringify(payload))

  const encoder = new TextEncoder()
  const data = encoder.encode(`${headerB64}.${payloadB64}`)
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, data)
  const signatureB64 = base64UrlEncode(signature)

  return `${headerB64}.${payloadB64}.${signatureB64}`
}

function base64UrlEncode(data: string | ArrayBuffer): string {
  let bytes: Uint8Array
  if (typeof data === 'string') {
    bytes = new TextEncoder().encode(data)
  } else {
    bytes = new Uint8Array(data)
  }

  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
