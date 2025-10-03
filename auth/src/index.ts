/**
 * Auth Service - Authentication & Authorization Microservice
 *
 * Features:
 * - WorkOS integration (OAuth, SSO, SCIM, Directory Sync)
 * - API key management
 * - JWT session management
 * - Role-based access control (RBAC)
 * - Rate limiting
 *
 * Interfaces:
 * - RPC (WorkerEntrypoint) for service-to-service calls
 * - HTTP (Hono) for REST API
 * - MCP (optional) for AI agent integration
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import type { AuthServiceEnv, User, Session, ApiKeyCreateInput, ApiKeyResponse, PermissionCheck, Role, ValidateTokenResponse, CreateApiKeyResponse } from './types'
import { UnauthorizedError, ForbiddenError, InvalidTokenError, TokenExpiredError, RateLimitError, AuthError } from './types'
import { success, error, getClientIP, getUserAgent } from './utils'

// Import modules
import * as workos from './workos'
import * as apikeys from './apikeys'
import * as sessions from './sessions'
import * as rbac from './rbac'
import * as middleware from './middleware'

/**
 * Auth Service RPC Interface
 */
export default class AuthService extends WorkerEntrypoint<AuthServiceEnv> {
  /**
   * Validate bearer token (API key or JWT)
   */
  async validateToken(token: string): Promise<ValidateTokenResponse> {
    try {
      // Check if it's an API key
      if (token.startsWith('sk_')) {
        const user = await apikeys.validateApiKeyAndGetUser(this.env, token)
        if (user) {
          return { valid: true, user }
        }
        return { valid: false, error: 'Invalid API key' }
      }

      // Try as JWT
      try {
        const { user, session } = await sessions.validateToken(this.env, token)
        return { valid: true, user, session }
      } catch (err) {
        return { valid: false, error: err instanceof Error ? err.message : 'Invalid token' }
      }
    } catch (err) {
      return { valid: false, error: err instanceof Error ? err.message : 'Validation failed' }
    }
  }

  /**
   * Validate API key and return user
   */
  async validateApiKey(apiKey: string): Promise<User | null> {
    return await apikeys.validateApiKeyAndGetUser(this.env, apiKey)
  }

  /**
   * Create new API key for user
   */
  async createApiKey(input: ApiKeyCreateInput): Promise<CreateApiKeyResponse> {
    try {
      const { key, apiKey } = await apikeys.createApiKey(this.env, input)
      return { success: true, apiKey: { ...apiKey, key } }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to create API key' }
    }
  }

  /**
   * Revoke API key
   */
  async revokeApiKey(userId: string, keyId: string): Promise<boolean> {
    return await apikeys.revokeApiKey(this.env, userId, keyId)
  }

  /**
   * Check permission for user
   */
  async checkPermission(check: PermissionCheck): Promise<boolean> {
    return await rbac.checkPermission(this.env, check)
  }

  /**
   * Create session for user
   */
  async createSession(userId: string, device?: string, ipAddress?: string, userAgent?: string): Promise<{ session: Session; token: string; refreshToken: string }> {
    // Get user
    const userResult = await this.env.DB.query({
      sql: 'SELECT * FROM users WHERE id = ? LIMIT 1',
      params: [userId],
    })

    if (!userResult?.rows || userResult.rows.length === 0) {
      throw new Error('User not found')
    }

    const userRow = userResult.rows[0]
    const user: User = {
      id: userRow.id as string,
      email: userRow.email as string,
      name: userRow.name as string | null,
      image: userRow.image as string | null,
      role: (userRow.role as Role) || 'user',
      emailVerified: userRow.email_verified as boolean,
      workosId: userRow.workos_id as string | undefined,
      organizationId: userRow.organization_id as string | undefined,
      createdAt: new Date(userRow.created_at as string),
      updatedAt: new Date(userRow.updated_at as string),
    }

    return await sessions.createSession(this.env, user, { device, ipAddress, userAgent })
  }

  /**
   * Get session details
   */
  async getSession(sessionId: string): Promise<Session | null> {
    return await sessions.getSession(this.env, sessionId)
  }

  /**
   * Revoke session (logout)
   */
  async revokeSession(sessionId: string): Promise<boolean> {
    return await sessions.revokeSession(this.env, sessionId)
  }

  /**
   * Refresh session tokens
   */
  async refreshSession(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    return await sessions.refreshSession(this.env, refreshToken)
  }

  /**
   * Grant custom permission to user
   */
  async grantPermission(userId: string, resource: string, action: string, organizationId?: string): Promise<boolean> {
    try {
      await rbac.grantPermission(this.env, userId, resource, action, organizationId)
      return true
    } catch {
      return false
    }
  }

  /**
   * Revoke permission from user
   */
  async revokePermission(userId: string, resource: string, action: string, organizationId?: string): Promise<boolean> {
    return await rbac.revokePermission(this.env, userId, resource, action, organizationId)
  }

  /**
   * Get WorkOS authorization URL
   */
  async getWorkOSAuthURL(redirectUri: string, state?: string): Promise<string> {
    return await workos.getAuthorizationURL(this.env, { redirectUri, state })
  }

  /**
   * Exchange WorkOS code for tokens
   */
  async exchangeWorkOSCode(code: string): Promise<any> {
    return await workos.exchangeCodeForToken(this.env, code)
  }
}

/**
 * HTTP API Interface
 */
const app = new Hono<{ Bindings: AuthServiceEnv; Variables: { user?: User; session?: Session } }>()

// Error handler
app.onError((err, c) => {
  console.error('Auth service error:', err)

  if (err instanceof AuthError) {
    return error(err.code, err.message, err.statusCode, err.details)
  }

  if (err instanceof Error) {
    return error('INTERNAL_ERROR', err.message, 500)
  }

  return error('UNKNOWN_ERROR', 'An unknown error occurred', 500)
})

// CORS for all routes
app.use('*', async (c, next) => {
  middleware.cors(c)
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204)
  }
  await next()
})

// Health check
app.get('/health', c => c.json({ status: 'ok', service: 'auth', timestamp: new Date().toISOString() }))

// WorkOS OAuth routes
app.get('/authorize', async c => {
  const redirectUri = c.req.query('redirect_uri') || `${new URL(c.req.url).origin}/callback`
  const state = c.req.query('state')
  const provider = c.req.query('provider')

  const url = await workos.getAuthorizationURL(c.env, { redirectUri, state, provider })

  return c.redirect(url)
})

app.get('/callback', async c => {
  const code = c.req.query('code')
  const state = c.req.query('state')

  if (!code) {
    return error('MISSING_CODE', 'Authorization code is required', 400)
  }

  try {
    const authResponse = await workos.exchangeCodeForToken(c.env, code)
    const { user: workosUser, accessToken, refreshToken, organizationId, permissions } = authResponse

    // Create or update user in database
    const userResult = await c.env.DB.query({
      sql: 'SELECT * FROM users WHERE workos_id = ? LIMIT 1',
      params: [workosUser.id],
    })

    let userId: string

    if (!userResult?.rows || userResult.rows.length === 0) {
      // Create new user
      const id = crypto.randomUUID()
      const now = new Date()
      await c.env.DB.execute({
        sql: `
          INSERT INTO users (id, email, name, workos_id, organization_id, role, email_verified, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        params: [id, workosUser.email, `${workosUser.firstName || ''} ${workosUser.lastName || ''}`.trim() || null, workosUser.id, organizationId || null, 'user', true, now.toISOString(), now.toISOString()],
      })
      userId = id
    } else {
      userId = userResult.rows[0].id as string
    }

    // Create session
    const service = new AuthService(c.executionCtx, c.env)
    const { token, refreshToken: sessionRefreshToken } = await service.createSession(userId, undefined, getClientIP(c.req.raw), getUserAgent(c.req.raw))

    return success({ token, refreshToken: sessionRefreshToken, user: { id: userId, email: workosUser.email } }, 'Authentication successful')
  } catch (err) {
    console.error('OAuth callback error:', err)
    return error('AUTH_FAILED', err instanceof Error ? err.message : 'Authentication failed', 500)
  }
})

// API key management
app.post('/apikeys', async c => {
  await middleware.requireAuth(c)
  const user = c.get('user')!

  const body = await c.req.json()
  const { name, expiresInDays, environment } = body

  if (!name) {
    return error('MISSING_NAME', 'API key name is required', 400)
  }

  const { key, apiKey } = await apikeys.createApiKey(c.env, {
    userId: user.id,
    name,
    expiresInDays,
    environment,
  })

  return success({ ...apiKey, key }, 'API key created successfully')
})

app.get('/apikeys', async c => {
  await middleware.requireAuth(c)
  const user = c.get('user')!

  const keys = await apikeys.listUserApiKeys(c.env, user.id)

  return success({ keys, total: keys.length })
})

app.delete('/apikeys/:id', async c => {
  await middleware.requireAuth(c)
  const user = c.get('user')!
  const keyId = c.req.param('id')

  const revoked = await apikeys.revokeApiKey(c.env, user.id, keyId)

  if (!revoked) {
    return error('NOT_FOUND', 'API key not found', 404)
  }

  return success(null, 'API key revoked successfully')
})

// Session management
app.get('/session', async c => {
  await middleware.requireAuth(c)
  const user = c.get('user')!
  const session = c.get('session')

  return success({ user, session })
})

app.post('/logout', async c => {
  await middleware.requireAuth(c)
  const session = c.get('session')

  if (session) {
    await sessions.revokeSession(c.env, session.id)
  }

  return success(null, 'Logged out successfully')
})

app.post('/refresh', async c => {
  const body = await c.req.json()
  const { refreshToken } = body

  if (!refreshToken) {
    return error('MISSING_REFRESH_TOKEN', 'Refresh token is required', 400)
  }

  try {
    const { token, refreshToken: newRefreshToken } = await sessions.refreshSession(c.env, refreshToken)
    return success({ token, refreshToken: newRefreshToken }, 'Session refreshed successfully')
  } catch (err) {
    if (err instanceof InvalidTokenError || err instanceof TokenExpiredError) {
      return error(err.code, err.message, err.statusCode)
    }
    return error('REFRESH_FAILED', err instanceof Error ? err.message : 'Failed to refresh session', 500)
  }
})

// Permission checks
app.post('/check-permission', async c => {
  await middleware.requireAuth(c)
  const user = c.get('user')!

  const body = await c.req.json()
  const { resource, action } = body

  if (!resource || !action) {
    return error('MISSING_PARAMS', 'Resource and action are required', 400)
  }

  const hasPermission = await rbac.checkPermission(c.env, {
    userId: user.id,
    resource,
    action,
    organizationId: user.organizationId,
  })

  return success({ hasPermission, resource, action })
})

// Export HTTP handler
export { app }
