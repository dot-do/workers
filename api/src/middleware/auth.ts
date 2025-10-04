/**
 * Authentication middleware
 */

import type { ApiContext, AuthContext } from '../types'

/**
 * Authenticate a request using various methods:
 * 1. Bearer token (Authorization: Bearer <token>)
 * 2. API key (X-API-Key: <key>)
 * 3. Session cookie
 */
export async function authenticateRequest(request: Request, ctx: ApiContext): Promise<AuthContext | null> {
  // Try Bearer token
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const auth = await validateBearerToken(token, ctx)
    if (auth) return auth
  }

  // Try API key
  const apiKey = request.headers.get('x-api-key')
  if (apiKey) {
    const auth = await validateApiKey(apiKey, ctx)
    if (auth) return auth
  }

  // Try session cookie
  const cookie = request.headers.get('cookie')
  if (cookie) {
    const sessionId = extractSessionFromCookie(cookie)
    if (sessionId) {
      const auth = await validateSession(sessionId, ctx)
      if (auth) return auth
    }
  }

  return null
}

/**
 * Validate Bearer token via AUTH_SERVICE
 */
async function validateBearerToken(token: string, ctx: ApiContext): Promise<AuthContext | null> {
  try {
    const result = await ctx.env.AUTH_SERVICE.validateToken(token)
    if (!result || !result.valid) return null

    return {
      userId: result.user.id,
      email: result.user.email,
      isAdmin: result.user.role === 'admin',
      permissions: result.user.permissions || [],
      sessionId: result.sessionId,
    }
  } catch (error) {
    console.error('[Auth] Bearer token validation error:', error)
    return null
  }
}

/**
 * Validate API key via AUTH_SERVICE
 */
async function validateApiKey(apiKey: string, ctx: ApiContext): Promise<AuthContext | null> {
  try {
    const result = await ctx.env.AUTH_SERVICE.validateApiKey(apiKey)
    if (!result || !result.valid) return null

    return {
      userId: result.user.id,
      email: result.user.email,
      isAdmin: result.user.role === 'admin',
      permissions: result.permissions || [],
      apiKey,
    }
  } catch (error) {
    console.error('[Auth] API key validation error:', error)
    return null
  }
}

/**
 * Validate session via AUTH_SERVICE
 */
async function validateSession(sessionId: string, ctx: ApiContext): Promise<AuthContext | null> {
  try {
    const result = await ctx.env.AUTH_SERVICE.validateSession(sessionId)
    if (!result || !result.valid) return null

    return {
      userId: result.user.id,
      email: result.user.email,
      isAdmin: result.user.role === 'admin',
      permissions: result.user.permissions || [],
      sessionId,
    }
  } catch (error) {
    console.error('[Auth] Session validation error:', error)
    return null
  }
}

/**
 * Extract session ID from cookie string
 */
function extractSessionFromCookie(cookie: string): string | null {
  const match = cookie.match(/session=([^;]+)/)
  return match ? match[1] : null
}

/**
 * Check if a route requires authentication
 */
export function requiresAuth(pathname: string, method: string): boolean {
  // Public routes (no auth required)
  const publicRoutes = [
    /^\/health$/,
    /^\/api\/public\//,
    /^\/waitlist/,
  ]

  return !publicRoutes.some(pattern => pattern.test(pathname))
}

/**
 * Check if a route requires admin access
 */
export function requiresAdmin(pathname: string, method: string): boolean {
  // Admin routes
  const adminRoutes = [
    /^\/api\/admin\//,
    /^\/api\/users\/.*\/ban$/,
    /^\/api\/deploy$/,
  ]

  return adminRoutes.some(pattern => pattern.test(pathname))
}
