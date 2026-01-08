import { createMiddleware } from 'hono/factory'
import type { Context, MiddlewareHandler } from 'hono'
import { getCookie } from 'hono/cookie'

// Type augmentation for Hono context variables
declare module 'hono' {
  interface ContextVariableMap {
    user?: User
    session?: Session
    userId?: string
    isAuth: boolean
  }
}

export interface User {
  id: string
  email?: string
  name?: string
  roles?: string[]
  [key: string]: any
}

export interface Session {
  id: string
  userId: string
  expiresAt?: number
  [key: string]: any
}

export interface AuthOptions {
  cookieName?: string
  headerName?: string
  jwtSecret?: string
  optional?: boolean
}

export interface RequireAuthOptions {
  redirect?: string
  message?: string
  roles?: string[]
}

export interface ApiKeyOptions {
  headerName?: string
  queryParam?: string
  optional?: boolean
  validate?: (key: string) => Promise<User | null>
}

/**
 * Authentication middleware that parses JWT from cookie or header
 * and sets user context variables
 */
export function auth(options: AuthOptions = {}): MiddlewareHandler {
  const {
    cookieName = 'auth',
    headerName = 'Authorization',
    jwtSecret,
    optional = true,
  } = options

  return createMiddleware(async (c, next) => {
    try {
      // Initialize auth status
      c.set('isAuth', false)

      // Try to get JWT from cookie
      let token = getCookie(c, cookieName)

      // Try to get JWT from Authorization header
      if (!token) {
        const authHeader = c.req.header(headerName)
        if (authHeader?.startsWith('Bearer ')) {
          token = authHeader.substring(7)
        }
      }

      if (token) {
        try {
          // Get JWT secret from options or environment
          const secret = jwtSecret || c.env?.JWT_SECRET

          if (!secret) {
            throw new Error('JWT_SECRET not configured')
          }

          // Verify and decode JWT
          const payload = await verifyJWT(token, secret)

          // Set user context variables
          c.set('user', payload.user)
          c.set('session', payload.session)
          c.set('userId', payload.user?.id || payload.sub)
          c.set('isAuth', true)
        } catch (error) {
          // Invalid token - continue without auth if optional
          if (!optional) {
            return c.json({ error: 'Invalid authentication token' }, 401)
          }
        }
      } else if (!optional) {
        return c.json({ error: 'Authentication required' }, 401)
      }

      await next()
    } catch (error) {
      // Catch any unexpected errors
      console.error('Auth middleware error:', error)
      return c.json({ error: 'Internal server error' }, 500)
    }
  })
}

/**
 * Middleware that requires authentication
 */
export function requireAuth(options: RequireAuthOptions = {}): MiddlewareHandler {
  const {
    redirect,
    message = 'Unauthorized',
    roles = [],
  } = options

  return createMiddleware(async (c, next) => {
    const isAuth = c.get('isAuth')

    if (!isAuth) {
      if (redirect) {
        return c.redirect(redirect)
      }
      return c.json({ error: message }, 401)
    }

    const user = c.get('user')

    // Check roles if specified
    if (roles.length > 0) {
      const userRoles = user.roles || []
      const hasRole = roles.some(role => userRoles.includes(role))

      if (!hasRole) {
        return c.json({ error: 'Insufficient permissions' }, 403)
      }
    }

    await next()
  })
}

/**
 * API Key authentication middleware
 */
export function apiKey(options: ApiKeyOptions = {}): MiddlewareHandler {
  const {
    headerName = 'X-API-Key',
    queryParam = 'api_key',
    optional = false,
    validate,
  } = options

  return createMiddleware(async (c, next) => {
    // Skip if already authenticated
    if (c.get('isAuth')) {
      await next()
      return
    }

    // Try to get API key from header or query param
    let key = c.req.header(headerName)
    if (!key) {
      key = c.req.query(queryParam)
    }

    if (key) {
      try {
        // Use custom validation if provided
        if (validate) {
          const user = await validate(key)
          if (user) {
            c.set('user', user)
            c.set('userId', user.id)
            c.set('isAuth', true)
          } else if (!optional) {
            return c.json({ error: 'Invalid API key' }, 401)
          }
        } else {
          // Default validation - just check if key exists
          // In production, you'd validate against a database
          c.set('isAuth', true)
        }
      } catch (error) {
        if (!optional) {
          return c.json({ error: 'Invalid API key' }, 401)
        }
      }
    } else if (!optional) {
      return c.json({ error: 'API key required' }, 401)
    }

    await next()
  })
}

/**
 * Simple JWT verification (using Web Crypto API)
 */
async function verifyJWT(token: string, secret: string): Promise<any> {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format')
  }

  const [headerB64, payloadB64, signatureB64] = parts

  // Verify signature
  const encoder = new TextEncoder()
  const data = encoder.encode(`${headerB64}.${payloadB64}`)
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  )

  const signature = base64UrlDecode(signatureB64)
  const valid = await crypto.subtle.verify('HMAC', key, signature, data)

  if (!valid) {
    throw new Error('Invalid JWT signature')
  }

  // Decode payload
  const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))

  // Check expiration
  if (payload.exp && payload.exp < Date.now() / 1000) {
    throw new Error('JWT expired')
  }

  return payload
}

function base64UrlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}
