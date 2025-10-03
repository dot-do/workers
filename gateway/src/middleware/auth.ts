/**
 * Authentication Middleware
 *
 * Supports:
 * - Bearer token authentication (API keys)
 * - WorkOS session validation
 * - Public routes (no auth)
 */

import type { GatewayContext, AuthContext } from '../types'

/**
 * Extract bearer token from Authorization header
 */
function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

/**
 * Validate API key format
 */
function isValidApiKeyFormat(token: string): boolean {
  // API keys should start with sk_live_ or sk_test_
  return token.startsWith('sk_live_') || token.startsWith('sk_test_')
}

/**
 * Validate API key via AUTH service
 */
async function validateApiKey(token: string, ctx: GatewayContext): Promise<AuthContext | null> {
  try {
    // Call AUTH service to validate API key
    const result = await ctx.env.AUTH.validateApiKey(token)

    if (!result || !result.valid) {
      return null
    }

    return {
      userId: result.userId,
      userEmail: result.email,
      role: result.role || 'user',
      apiKey: token,
    }
  } catch (error) {
    console.error('[Auth] API key validation failed:', error)
    return null
  }
}

/**
 * Validate WorkOS session via AUTH service
 */
async function validateWorkOSSession(sessionToken: string, ctx: GatewayContext): Promise<AuthContext | null> {
  try {
    // Call AUTH service to validate WorkOS session
    const result = await ctx.env.AUTH.validateSession(sessionToken)

    if (!result || !result.valid) {
      return null
    }

    return {
      userId: result.userId,
      userEmail: result.email,
      role: result.role || 'user',
      organizationId: result.organizationId,
    }
  } catch (error) {
    console.error('[Auth] WorkOS session validation failed:', error)
    return null
  }
}

/**
 * Extract session token from cookie
 */
function getSessionToken(request: Request): string | null {
  const cookieHeader = request.headers.get('Cookie')
  if (!cookieHeader) {
    return null
  }

  // Parse session cookie
  const sessionMatch = cookieHeader.match(/session=([^;]+)/)
  return sessionMatch ? sessionMatch[1] : null
}

/**
 * Authenticate request and populate auth context
 */
export async function authenticate(request: Request, ctx: GatewayContext): Promise<AuthContext | null> {
  // Try bearer token first (API key)
  const bearerToken = getBearerToken(request)
  if (bearerToken && isValidApiKeyFormat(bearerToken)) {
    const auth = await validateApiKey(bearerToken, ctx)
    if (auth) {
      return auth
    }
  }

  // Try session cookie (WorkOS)
  const sessionToken = getSessionToken(request)
  if (sessionToken) {
    const auth = await validateWorkOSSession(sessionToken, ctx)
    if (auth) {
      return auth
    }
  }

  // No valid authentication found
  return null
}

/**
 * Require authentication - return 401 if not authenticated
 */
export function requireAuth(ctx: GatewayContext): Response | null {
  if (!ctx.auth) {
    return Response.json(
      {
        error: 'Authentication required',
        message: 'Please provide a valid API key or session token',
      },
      { status: 401 }
    )
  }
  return null
}

/**
 * Require admin role - return 403 if not admin
 */
export function requireAdmin(ctx: GatewayContext): Response | null {
  if (!ctx.auth) {
    return Response.json(
      {
        error: 'Authentication required',
        message: 'Please provide a valid API key or session token',
      },
      { status: 401 }
    )
  }

  if (ctx.auth.role !== 'admin') {
    return Response.json(
      {
        error: 'Admin access required',
        message: 'This endpoint requires admin privileges',
      },
      { status: 403 }
    )
  }

  return null
}
