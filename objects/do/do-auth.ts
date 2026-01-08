/**
 * DOAuth - Durable Object with Better Auth Integration
 *
 * Extends the full-featured DO with authentication and authorization
 * using Better Auth with Drizzle adapter.
 *
 * Features:
 * - Session-based authentication
 * - Role-based access control (RBAC)
 * - Permission checking
 * - Auth context on all requests
 * - OAuth provider support
 *
 * @example
 * ```typescript
 * import { DO } from 'dotdo/auth'
 *
 * export class ProtectedDatabase extends DO {
 *   async getMyPosts() {
 *     const user = this.auth.requireAuth()
 *     return this.listDocs('posts', { author: user.id })
 *   }
 *
 *   async adminAction() {
 *     if (!this.auth.hasRole('admin')) {
 *       throw new Error('Forbidden')
 *     }
 *     // Admin-only logic
 *   }
 *
 *   async sensitiveAction() {
 *     if (!this.auth.hasPermission('data:delete')) {
 *       throw new Error('Missing permission: data:delete')
 *     }
 *     // Permission-protected logic
 *   }
 * }
 * ```
 */

import { DO as DORPC } from './do-rpc'
import type {
  DOEnvAuth,
  AuthContext,
  AuthUser,
  AuthSession,
} from './types'

// ============================================================================
// Auth Schema Tables (for Drizzle)
// ============================================================================

export { authSchema } from './schema'

// ============================================================================
// DOAuth Class
// ============================================================================

/**
 * Durable Object with Authentication Support
 *
 * Provides authentication context on all requests via the `auth` property.
 */
export class DO<Env extends DOEnvAuth = DOEnvAuth> extends DORPC<Env> {
  /** Cached auth context for current request */
  private _authContext?: AuthContext

  /** Current request (set during fetch) */
  private _currentRequest?: Request

  // ==========================================================================
  // Auth Context
  // ==========================================================================

  /**
   * Get the authentication context for the current request
   *
   * @example
   * ```typescript
   * if (this.auth.isAuthenticated()) {
   *   console.log('Hello', this.auth.user?.name)
   * }
   * ```
   */
  get auth(): AuthContext {
    if (!this._authContext) {
      this._authContext = this.createAuthContext()
    }
    return this._authContext
  }

  /**
   * Create auth context (lazy)
   */
  private createAuthContext(): AuthContext {
    const self = this
    let user: AuthUser | null = null
    let session: AuthSession | null = null
    let resolved = false

    const resolve = async () => {
      if (resolved) return
      resolved = true

      if (self._currentRequest) {
        const result = await self.resolveAuth(self._currentRequest)
        user = result.user
        session = result.session
      }
    }

    return {
      get user() {
        return user
      },
      get session() {
        return session
      },
      isAuthenticated() {
        return user !== null
      },
      requireAuth() {
        if (!user) {
          throw new AuthError('Authentication required', 401)
        }
        return user
      },
      hasPermission(permission: string) {
        if (!user?.permissions) return false
        return user.permissions.includes(permission) || user.permissions.includes('*')
      },
      hasRole(role: string) {
        return user?.role === role
      },
    }
  }

  /**
   * Resolve authentication from request
   *
   * Override this method to customize authentication resolution.
   */
  protected async resolveAuth(request: Request): Promise<{
    user: AuthUser | null
    session: AuthSession | null
  }> {
    // Try to get session from header
    const authHeader = request.headers.get('Authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      return this.resolveFromToken(token)
    }

    // Try to get session from cookie
    const cookies = request.headers.get('Cookie')
    if (cookies) {
      const sessionId = this.extractSessionId(cookies)
      if (sessionId) {
        return this.resolveFromSession(sessionId)
      }
    }

    return { user: null, session: null }
  }

  /**
   * Resolve auth from bearer token
   */
  private async resolveFromToken(token: string): Promise<{
    user: AuthUser | null
    session: AuthSession | null
  }> {
    // If we have JOSE binding, verify JWT
    if (this.hasJose()) {
      try {
        const payload = await this.jose.verify(token)
        const userId = payload.sub as string
        const user = await this.getUser(userId)
        return {
          user,
          session: {
            id: payload.jti as string || crypto.randomUUID(),
            userId,
            expiresAt: new Date((payload.exp as number) * 1000),
            token,
          },
        }
      } catch {
        return { user: null, session: null }
      }
    }

    // Fall back to database session lookup using token
    return this.resolveFromSession(token)
  }

  /**
   * Resolve auth from session ID
   */
  private async resolveFromSession(sessionId: string): Promise<{
    user: AuthUser | null
    session: AuthSession | null
  }> {
    await this.ensureSchema()

    const result = this.ctx.storage.sql.exec<{
      id: string
      user_id: string
      token: string
      expires_at: number
      ip_address: string | null
      user_agent: string | null
      created_at: number
    }>(
      `SELECT * FROM sessions WHERE token = ? AND expires_at > ?`,
      sessionId,
      Date.now()
    ).one()

    if (!result) {
      return { user: null, session: null }
    }

    const user = await this.getUser(result.user_id)
    if (!user) {
      return { user: null, session: null }
    }

    return {
      user,
      session: {
        id: result.id,
        userId: result.user_id,
        expiresAt: new Date(result.expires_at),
        token: result.token,
        ipAddress: result.ip_address ?? undefined,
        userAgent: result.user_agent ?? undefined,
        createdAt: new Date(result.created_at),
      },
    }
  }

  /**
   * Get user by ID from database
   */
  private async getUser(userId: string): Promise<AuthUser | null> {
    await this.ensureSchema()

    const result = this.ctx.storage.sql.exec<{
      id: string
      email: string
      name: string | null
      image: string | null
      role: string | null
      created_at: number
      updated_at: number
    }>(
      `SELECT * FROM users WHERE id = ?`,
      userId
    ).one()

    if (!result) return null

    // Get permissions from role or direct assignment
    const permissions = await this.getUserPermissions(userId, result.role ?? undefined)

    return {
      id: result.id,
      email: result.email,
      name: result.name ?? undefined,
      image: result.image ?? undefined,
      role: result.role ?? undefined,
      permissions,
      createdAt: new Date(result.created_at),
      updatedAt: new Date(result.updated_at),
    }
  }

  /**
   * Get permissions for a user
   *
   * Override this to implement custom permission logic.
   */
  protected async getUserPermissions(
    _userId: string,
    role?: string
  ): Promise<string[]> {
    // Default role-based permissions
    const rolePermissions: Record<string, string[]> = {
      admin: ['*'],
      editor: ['content:*', 'users:read'],
      user: ['content:read', 'content:create'],
    }

    return rolePermissions[role ?? 'user'] ?? []
  }

  /**
   * Extract session ID from cookies
   */
  private extractSessionId(cookies: string): string | null {
    const match = cookies.match(/session=([^;]+)/)
    return match?.[1] ?? null
  }

  // ==========================================================================
  // HTTP Handling with Auth
  // ==========================================================================

  /**
   * Handle requests with authentication context
   */
  async fetch(request: Request): Promise<Response> {
    // Set current request for auth resolution
    this._currentRequest = request
    this._authContext = undefined // Reset auth context

    try {
      return await super.fetch(request)
    } finally {
      // Clean up
      this._currentRequest = undefined
    }
  }

  /**
   * Handle discovery with auth info
   */
  protected handleDiscovery(): Response {
    return this.jsonResponse({
      id: this.id,
      type: this.constructor.name,
      version: this.config?.version ?? '0.0.1',
      api: 'dotdo/auth',
      auth: {
        authenticated: this.auth.isAuthenticated(),
        user: this.auth.user ? {
          id: this.auth.user.id,
          email: this.auth.user.email,
          role: this.auth.user.role,
        } : null,
      },
      endpoints: {
        '/': 'Discovery (this response)',
        '/health': 'Health check',
        '/rpc': 'JSON-RPC endpoint (POST)',
        '/do': 'Agentic endpoint (POST)',
        '/auth/session': 'Get current session',
        '/auth/logout': 'End session (POST)',
      },
    })
  }

  /**
   * Handle custom routes with auth endpoints
   */
  protected async handleRequest(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // Auth endpoints
    if (url.pathname === '/auth/session' && request.method === 'GET') {
      return this.handleGetSession()
    }

    if (url.pathname === '/auth/logout' && request.method === 'POST') {
      return this.handleLogout()
    }

    return super.handleRequest(request)
  }

  /**
   * Handle GET /auth/session
   */
  private handleGetSession(): Response {
    if (!this.auth.isAuthenticated()) {
      return this.jsonResponse({ authenticated: false }, 200)
    }

    return this.jsonResponse({
      authenticated: true,
      user: {
        id: this.auth.user!.id,
        email: this.auth.user!.email,
        name: this.auth.user!.name,
        role: this.auth.user!.role,
      },
      session: {
        expiresAt: this.auth.session!.expiresAt.toISOString(),
      },
    })
  }

  /**
   * Handle POST /auth/logout
   */
  private async handleLogout(): Promise<Response> {
    if (!this.auth.session) {
      return this.jsonResponse({ success: true })
    }

    // Delete session from database
    this.ctx.storage.sql.exec(
      `DELETE FROM sessions WHERE id = ?`,
      this.auth.session.id
    )

    return this.jsonResponse({
      success: true,
    }, 200)
  }

  // ==========================================================================
  // User Management
  // ==========================================================================

  /**
   * Create a new user
   */
  async createUser(data: {
    email: string
    name?: string
    image?: string
    role?: string
  }): Promise<AuthUser> {
    await this.ensureSchema()

    const id = crypto.randomUUID()
    const now = Date.now()

    this.ctx.storage.sql.exec(
      `INSERT INTO users (id, email, name, image, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      data.email,
      data.name ?? null,
      data.image ?? null,
      data.role ?? 'user',
      now,
      now
    )

    return {
      id,
      email: data.email,
      name: data.name,
      image: data.image,
      role: data.role ?? 'user',
      permissions: await this.getUserPermissions(id, data.role),
      createdAt: new Date(now),
      updatedAt: new Date(now),
    }
  }

  /**
   * Create a session for a user
   */
  async createSession(userId: string, options: {
    expiresIn?: number
    ipAddress?: string
    userAgent?: string
  } = {}): Promise<AuthSession> {
    await this.ensureSchema()

    const id = crypto.randomUUID()
    const token = crypto.randomUUID()
    const now = Date.now()
    const expiresIn = options.expiresIn ?? 30 * 24 * 60 * 60 * 1000 // 30 days default
    const expiresAt = now + expiresIn

    this.ctx.storage.sql.exec(
      `INSERT INTO sessions (id, user_id, token, expires_at, ip_address, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      userId,
      token,
      expiresAt,
      options.ipAddress ?? null,
      options.userAgent ?? null,
      now
    )

    return {
      id,
      userId,
      token,
      expiresAt: new Date(expiresAt),
      ipAddress: options.ipAddress,
      userAgent: options.userAgent,
      createdAt: new Date(now),
    }
  }

  /**
   * Get a user by email
   */
  async getUserByEmail(email: string): Promise<AuthUser | null> {
    await this.ensureSchema()

    const result = this.ctx.storage.sql.exec<{ id: string }>(
      `SELECT id FROM users WHERE email = ?`,
      email
    ).one()

    if (!result) return null
    return this.getUser(result.id)
  }

  /**
   * Update user
   */
  async updateUser(userId: string, updates: {
    name?: string
    image?: string
    role?: string
  }): Promise<AuthUser | null> {
    await this.ensureSchema()

    const setClauses: string[] = ['updated_at = ?']
    const values: unknown[] = [Date.now()]

    if (updates.name !== undefined) {
      setClauses.push('name = ?')
      values.push(updates.name)
    }
    if (updates.image !== undefined) {
      setClauses.push('image = ?')
      values.push(updates.image)
    }
    if (updates.role !== undefined) {
      setClauses.push('role = ?')
      values.push(updates.role)
    }

    values.push(userId)

    this.ctx.storage.sql.exec(
      `UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`,
      ...values
    )

    return this.getUser(userId)
  }

  /**
   * Delete user and all sessions
   */
  async deleteUser(userId: string): Promise<void> {
    await this.ensureSchema()

    // Delete sessions first (foreign key)
    this.ctx.storage.sql.exec(`DELETE FROM sessions WHERE user_id = ?`, userId)
    // Delete accounts
    this.ctx.storage.sql.exec(`DELETE FROM accounts WHERE user_id = ?`, userId)
    // Delete user
    this.ctx.storage.sql.exec(`DELETE FROM users WHERE id = ?`, userId)
  }
}

// ============================================================================
// Auth Error
// ============================================================================

/**
 * Authentication/Authorization error
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number = 401
  ) {
    super(message)
    this.name = 'AuthError'
  }
}

// ============================================================================
// Exports
// ============================================================================

export type {
  DOEnvAuth,
  AuthContext,
  AuthUser,
  AuthSession,
}

export default DO
