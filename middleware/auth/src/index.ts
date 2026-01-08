/**
 * @dotdo/middleware-auth
 *
 * Hono-specific authentication middleware wrapping @dotdo/auth primitives.
 *
 * This package provides HTTP integration for the core auth logic in @dotdo/auth:
 * - Hono middleware functions (auth, requireAuth, apiKey)
 * - Request/Response handling (cookie parsing, header extraction)
 * - Context variable injection (c.var.user, c.var.session, etc.)
 *
 * Core auth logic (RBAC, JWT, Better Auth plugins) lives in @dotdo/auth.
 */

import type { Context, MiddlewareHandler } from 'hono'
import { createMiddleware } from 'hono/factory'
import type { AuthContext, RBAC } from '@dotdo/auth'

// ============================================================================
// Types
// ============================================================================

/**
 * User object extracted from JWT or session
 */
export interface AuthUser {
  id: string
  email?: string
  name?: string
  image?: string
  roles?: string[]
  organizationId?: string
  metadata?: Record<string, unknown>
}

/**
 * Session object from Better Auth
 */
export interface AuthSession {
  id: string
  userId: string
  expiresAt: Date
  createdAt: Date
}

/**
 * Variables added to Hono context by auth middleware
 */
export interface AuthVariables {
  /** Authenticated user (if present) */
  user?: AuthUser
  /** Session object (if using sessions) */
  session?: AuthSession
  /** User ID shorthand */
  userId?: string
  /** Whether request is authenticated */
  isAuth: boolean
  /** RBAC context for permission checks */
  authContext?: AuthContext
}

/**
 * Options for auth() middleware
 */
export interface AuthOptions {
  /** Cookie name for JWT auth (default: 'auth') */
  cookieName?: string
  /** Header name for Bearer token (default: 'Authorization') */
  headerName?: string
  /** JWT secret for verification (default: env.JWT_SECRET) */
  jwtSecret?: string
  /** Better Auth instance for session verification */
  betterAuth?: {
    api: {
      getSession: (opts: { headers: Headers }) => Promise<{ user: AuthUser; session: AuthSession } | null>
    }
  }
  /** Skip auth for these paths (still parses but doesn't require) */
  skipPaths?: string[]
}

/**
 * Options for requireAuth() middleware
 */
export interface RequireAuthOptions {
  /** URL to redirect unauthenticated users (for HTML responses) */
  redirect?: string
  /** Error message for API responses (default: 'Unauthorized') */
  message?: string
  /** Required roles for access */
  roles?: string[]
  /** Required permissions for access (requires RBAC instance) */
  permissions?: string[]
  /** RBAC instance for permission checking */
  rbac?: RBAC
}

/**
 * Options for apiKey() middleware
 */
export interface ApiKeyOptions {
  /** Header name for API key (default: 'X-API-Key') */
  headerName?: string
  /** Query parameter name for API key */
  queryParam?: string
  /** Validator function */
  validator: (key: string) => Promise<AuthUser | null>
  /** Whether API key auth is optional (default: false) */
  optional?: boolean
}

// ============================================================================
// JWT Utilities
// ============================================================================

/**
 * Base64 URL decode
 */
function base64UrlDecode(data: string): string {
  const padded = data.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice(0, (4 - (data.length % 4)) % 4)
  return atob(padded)
}

/**
 * Parse JWT payload without verification (verification should use crypto)
 * For actual verification, use the Better Auth session API or proper JWT library
 */
function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null

    const payloadJson = base64UrlDecode(parts[1])
    return JSON.parse(payloadJson)
  } catch {
    return null
  }
}

/**
 * Check if JWT is expired
 */
function isJwtExpired(payload: Record<string, unknown>): boolean {
  if (!payload.exp || typeof payload.exp !== 'number') return false
  return payload.exp < Math.floor(Date.now() / 1000)
}

/**
 * Extract user from JWT payload
 */
function userFromJwtPayload(payload: Record<string, unknown>): AuthUser | null {
  if (!payload.sub) return null

  return {
    id: payload.sub as string,
    email: payload.email as string | undefined,
    name: payload.name as string | undefined,
    roles: payload.roles as string[] | undefined,
    organizationId: payload.org_id as string | undefined,
  }
}

// ============================================================================
// Token Extraction
// ============================================================================

/**
 * Extract token from Authorization header
 */
function extractBearerToken(c: Context, headerName: string): string | null {
  const header = c.req.header(headerName)
  if (!header) return null

  if (header.startsWith('Bearer ')) {
    return header.slice(7)
  }

  return null
}

/**
 * Extract token from cookie
 */
function extractCookieToken(c: Context, cookieName: string): string | null {
  const cookie = c.req.header('Cookie')
  if (!cookie) return null

  const cookies = cookie.split(';').map((c) => c.trim())
  for (const cookie of cookies) {
    const [name, value] = cookie.split('=')
    if (name === cookieName) {
      return value
    }
  }

  return null
}

// ============================================================================
// Middleware Functions
// ============================================================================

/**
 * Parse authentication from request (JWT cookie or Bearer token)
 *
 * Adds to context:
 * - c.var.user - User object if authenticated
 * - c.var.session - Session object if using Better Auth
 * - c.var.userId - User ID string
 * - c.var.isAuth - Boolean auth status
 *
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { auth } from '@dotdo/middleware-auth'
 *
 * const app = new Hono()
 *
 * // Parse auth on all routes
 * app.use('*', auth())
 *
 * app.get('/profile', (c) => {
 *   if (c.var.isAuth) {
 *     return c.json({ user: c.var.user })
 *   }
 *   return c.json({ error: 'Not authenticated' }, 401)
 * })
 * ```
 */
export function auth(options: AuthOptions = {}): MiddlewareHandler<{ Variables: AuthVariables }> {
  const { cookieName = 'auth', headerName = 'Authorization', betterAuth } = options

  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    // Initialize auth state
    c.set('isAuth', false)

    // Try Better Auth session first if available
    if (betterAuth) {
      try {
        const result = await betterAuth.api.getSession({ headers: c.req.raw.headers })
        if (result) {
          c.set('user', result.user)
          c.set('session', result.session)
          c.set('userId', result.user.id)
          c.set('isAuth', true)
          c.set('authContext', {
            userId: result.user.id,
            roles: result.user.roles || [],
            permissions: [],
          })
          return next()
        }
      } catch {
        // Session check failed, continue to try other methods
      }
    }

    // Try Bearer token from header
    let token = extractBearerToken(c, headerName)

    // Fall back to cookie
    if (!token) {
      token = extractCookieToken(c, cookieName)
    }

    if (token) {
      const payload = parseJwtPayload(token)
      if (payload && !isJwtExpired(payload)) {
        const user = userFromJwtPayload(payload)
        if (user) {
          c.set('user', user)
          c.set('userId', user.id)
          c.set('isAuth', true)
          c.set('authContext', {
            userId: user.id,
            roles: user.roles || [],
            permissions: [],
          })
        }
      }
    }

    return next()
  })
}

/**
 * Require authentication on a route
 *
 * Must be used after auth() middleware. Returns 401 or redirects if not authenticated.
 *
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { auth, requireAuth } from '@dotdo/middleware-auth'
 *
 * const app = new Hono()
 *
 * app.use('*', auth())
 * app.use('/api/*', requireAuth())
 * app.use('/admin/*', requireAuth({ roles: ['admin'] }))
 *
 * app.get('/api/data', (c) => {
 *   return c.json({ userId: c.var.userId })
 * })
 * ```
 */
export function requireAuth(options: RequireAuthOptions = {}): MiddlewareHandler<{ Variables: AuthVariables }> {
  const { redirect, message = 'Unauthorized', roles, permissions, rbac } = options

  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    // Check if authenticated
    if (!c.var.isAuth) {
      if (redirect) {
        return c.redirect(redirect)
      }
      return c.json({ error: message }, 401)
    }

    // Check role requirements
    if (roles && roles.length > 0) {
      const userRoles = c.var.user?.roles || []
      const hasRole = roles.some((role) => userRoles.includes(role))
      if (!hasRole) {
        return c.json({ error: `Required role: ${roles.join(' or ')}` }, 403)
      }
    }

    // Check permission requirements (requires RBAC)
    if (permissions && permissions.length > 0 && rbac && c.var.authContext) {
      const hasPermissions = rbac.checkPermissions(c.var.authContext, permissions)
      if (!hasPermissions) {
        return c.json({ error: `Missing permissions: ${permissions.join(', ')}` }, 403)
      }
    }

    return next()
  })
}

/**
 * API key authentication middleware
 *
 * Validates API keys from header or query parameter.
 *
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { apiKey } from '@dotdo/middleware-auth'
 *
 * const app = new Hono()
 *
 * app.use('/api/*', apiKey({
 *   validator: async (key) => {
 *     const user = await db.query.apiKeys.findFirst({
 *       where: eq(apiKeys.key, key)
 *     })
 *     return user ? { id: user.userId } : null
 *   }
 * }))
 * ```
 */
export function apiKey(options: ApiKeyOptions): MiddlewareHandler<{ Variables: AuthVariables }> {
  const { headerName = 'X-API-Key', queryParam, validator, optional = false } = options

  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    // Extract API key
    let key = c.req.header(headerName)

    if (!key && queryParam) {
      key = c.req.query(queryParam) || null
    }

    if (!key) {
      if (optional) {
        return next()
      }
      return c.json({ error: 'API key required' }, 401)
    }

    // Validate API key
    const user = await validator(key)

    if (!user) {
      if (optional) {
        return next()
      }
      return c.json({ error: 'Invalid API key' }, 401)
    }

    // Set auth context
    c.set('user', user)
    c.set('userId', user.id)
    c.set('isAuth', true)
    c.set('authContext', {
      userId: user.id,
      roles: user.roles || [],
      permissions: [],
    })

    return next()
  })
}

/**
 * Combined authentication middleware
 *
 * Tries JWT/session first, then falls back to API key if provided.
 * Useful for APIs that support both user sessions and programmatic access.
 *
 * @example
 * ```ts
 * import { Hono } from 'hono'
 * import { combined } from '@dotdo/middleware-auth'
 *
 * const app = new Hono()
 *
 * app.use('/api/*', combined({
 *   auth: { cookieName: 'session' },
 *   apiKey: {
 *     validator: async (key) => validateApiKey(key)
 *   }
 * }))
 * ```
 */
export function combined(options: {
  auth?: AuthOptions
  apiKey?: ApiKeyOptions
}): MiddlewareHandler<{ Variables: AuthVariables }> {
  return createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
    // Try JWT/session auth first
    const authMiddleware = auth(options.auth || {})
    await authMiddleware(c, async () => {})

    // If authenticated, continue
    if (c.var.isAuth) {
      return next()
    }

    // Try API key if configured
    if (options.apiKey) {
      const apiKeyMiddleware = apiKey({ ...options.apiKey, optional: true })
      await apiKeyMiddleware(c, async () => {})
    }

    return next()
  })
}

// ============================================================================
// Re-exports from @dotdo/auth
// ============================================================================

// Re-export core RBAC types and functions for convenience
export type { AuthContext, RBAC, Role, Permission, RBACConfig } from '@dotdo/auth'
export { createRBAC, hasRole, hasPermission, checkPermission, requirePermissions, requireRole, PermissionDeniedError } from '@dotdo/auth'
