/**
 * Auth Middleware Helpers
 * Reusable middleware for authentication and authorization
 */

import type { Context } from 'hono'
import type { AuthServiceEnv, User, Session, RateLimitConfig, RateLimitResult } from './types'
import { UnauthorizedError, ForbiddenError, RateLimitError } from './types'
import { validateApiKeyAndGetUser } from './apikeys'
import { validateToken } from './sessions'
import { checkPermission, hasRole } from './rbac'
import { parseBearerToken, parseSessionCookie, getClientIP } from './utils'

/**
 * Authenticate request (try session cookie, then bearer token)
 */
export async function authenticate(c: Context<{ Bindings: AuthServiceEnv; Variables: { user?: User; session?: Session } }>): Promise<{ user: User; session?: Session } | null> {
  const env = c.env

  // Try session cookie first
  const sessionCookie = parseSessionCookie(c.req.header('cookie') || null)
  if (sessionCookie) {
    try {
      const { user, session } = await validateToken(env, sessionCookie)
      return { user, session }
    } catch {
      // Session invalid, try bearer token
    }
  }

  // Try bearer token (API key or JWT)
  const bearerToken = parseBearerToken(c.req.header('authorization') || null)
  if (bearerToken) {
    // Check if it's an API key
    if (bearerToken.startsWith('sk_')) {
      const user = await validateApiKeyAndGetUser(env, bearerToken)
      if (user) {
        return { user }
      }
    } else {
      // Try as JWT
      try {
        const { user, session } = await validateToken(env, bearerToken)
        return { user, session }
      } catch {
        // JWT invalid
      }
    }
  }

  return null
}

/**
 * Require authentication middleware
 */
export async function requireAuth(c: Context<{ Bindings: AuthServiceEnv; Variables: { user?: User; session?: Session } }>): Promise<void> {
  const auth = await authenticate(c)

  if (!auth) {
    throw new UnauthorizedError('Authentication required')
  }

  // Set user and session in context
  c.set('user', auth.user)
  if (auth.session) {
    c.set('session', auth.session)
  }
}

/**
 * Require admin role middleware
 */
export async function requireAdminRole(c: Context<{ Bindings: AuthServiceEnv; Variables: { user?: User } }>): Promise<void> {
  const user = c.get('user')

  if (!user) {
    throw new UnauthorizedError('Authentication required')
  }

  if (user.role !== 'admin') {
    throw new ForbiddenError('Admin access required')
  }
}

/**
 * Require specific permission middleware
 */
export function requirePermission(resource: string, action: string) {
  return async (c: Context<{ Bindings: AuthServiceEnv; Variables: { user?: User } }>): Promise<void> => {
    const user = c.get('user')

    if (!user) {
      throw new UnauthorizedError('Authentication required')
    }

    const hasPermission = await checkPermission(c.env, {
      userId: user.id,
      resource,
      action,
      organizationId: user.organizationId,
    })

    if (!hasPermission) {
      throw new ForbiddenError(`Permission denied: ${resource}:${action}`)
    }
  }
}

/**
 * Require mutation permission (for POST, PUT, PATCH, DELETE)
 */
export async function requireMutationAuth(c: Context<{ Bindings: AuthServiceEnv; Variables: { user?: User } }>): Promise<void> {
  const method = c.req.method

  // GET, HEAD, OPTIONS are read-only
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return
  }

  // Mutations require admin
  const user = c.get('user')

  if (!user) {
    throw new UnauthorizedError('Authentication required for mutations')
  }

  if (user.role !== 'admin') {
    throw new ForbiddenError('Admin access required for mutations')
  }
}

/**
 * Rate limiting middleware
 */
export function rateLimit(config: RateLimitConfig) {
  const { windowMs, maxRequests, keyPrefix = 'rate-limit' } = config

  return async (c: Context<{ Bindings: AuthServiceEnv }>): Promise<void> => {
    const env = c.env

    // Use KV if available, otherwise skip rate limiting
    if (!env.RATE_LIMIT_KV) {
      console.warn('RATE_LIMIT_KV not configured, skipping rate limiting')
      return
    }

    const ip = getClientIP(c.req.raw)
    const key = `${keyPrefix}:${ip}`

    // Get current count
    const data = await env.RATE_LIMIT_KV.get(key, 'json')
    const now = Date.now()

    if (!data) {
      // First request in window
      const resetAt = now + windowMs
      await env.RATE_LIMIT_KV.put(key, JSON.stringify({ count: 1, resetAt }), {
        expirationTtl: Math.ceil(windowMs / 1000),
      })
      return
    }

    const { count, resetAt } = data as { count: number; resetAt: number }

    if (resetAt < now) {
      // Window expired, reset
      const newResetAt = now + windowMs
      await env.RATE_LIMIT_KV.put(key, JSON.stringify({ count: 1, resetAt: newResetAt }), {
        expirationTtl: Math.ceil(windowMs / 1000),
      })
      return
    }

    if (count >= maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((resetAt - now) / 1000)
      throw new RateLimitError(retryAfter)
    }

    // Increment count
    await env.RATE_LIMIT_KV.put(key, JSON.stringify({ count: count + 1, resetAt }), {
      expirationTtl: Math.ceil((resetAt - now) / 1000),
    })
  }
}

/**
 * Auth rate limiting (stricter for auth endpoints)
 */
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 requests per minute
  keyPrefix: 'auth-rate-limit',
})

/**
 * API rate limiting (general)
 */
export const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  keyPrefix: 'api-rate-limit',
})

/**
 * Optional authentication (sets user if authenticated, but doesn't require it)
 */
export async function optionalAuth(c: Context<{ Bindings: AuthServiceEnv; Variables: { user?: User; session?: Session } }>): Promise<void> {
  const auth = await authenticate(c)

  if (auth) {
    c.set('user', auth.user)
    if (auth.session) {
      c.set('session', auth.session)
    }
  }
}

/**
 * CORS middleware for auth endpoints
 */
export function cors(c: Context): void {
  c.header('Access-Control-Allow-Origin', '*')
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  c.header('Access-Control-Max-Age', '86400')
}
