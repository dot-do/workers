/**
 * @dotdo/middleware/auth - Auth Middleware
 *
 * Provides authentication middleware using WorkOS AuthKit.
 */

import type { Context, Next } from 'hono'

/**
 * Auth context added to requests
 */
export interface AuthContext {
  userId?: string
  organizationId?: string
  permissions?: string[]
  token?: string
  metadata?: Record<string, unknown>
}

/**
 * Auth middleware options
 */
export interface AuthMiddlewareOptions {
  /**
   * WorkOS API key
   */
  apiKey?: string

  /**
   * Paths that don't require authentication
   */
  publicPaths?: string[]

  /**
   * Custom token extractor
   */
  tokenExtractor?: (request: Request) => string | null
}

/**
 * Default token extractor - Bearer token from Authorization header
 */
function defaultTokenExtractor(request: Request): string | null {
  const auth = request.headers.get('Authorization')
  if (auth?.startsWith('Bearer ')) {
    return auth.slice(7)
  }
  return null
}

/**
 * Create auth middleware
 */
export function authMiddleware(options: AuthMiddlewareOptions = {}) {
  const { publicPaths = [], tokenExtractor = defaultTokenExtractor } = options

  return async (c: Context, next: Next) => {
    const path = new URL(c.req.url).pathname

    // Skip auth for public paths
    if (publicPaths.some((p) => path.startsWith(p))) {
      return next()
    }

    const token = tokenExtractor(c.req.raw)

    if (!token) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // TODO: Validate token with WorkOS
    // For now, just extract basic info
    try {
      const authContext: AuthContext = {
        token,
        // TODO: Decode and validate JWT, extract user info
      }

      c.set('auth', authContext)
      return next()
    } catch (error) {
      return c.json({ error: 'Invalid token' }, 401)
    }
  }
}

/**
 * Get auth context from request
 */
export function getAuth(c: Context): AuthContext | null {
  return c.get('auth') ?? null
}

/**
 * Require specific permissions
 */
export function requirePermissions(...permissions: string[]) {
  return async (c: Context, next: Next) => {
    const auth = getAuth(c)

    if (!auth) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const hasPermissions = permissions.every((p) => auth.permissions?.includes(p))

    if (!hasPermissions) {
      return c.json({ error: 'Forbidden' }, 403)
    }

    return next()
  }
}
