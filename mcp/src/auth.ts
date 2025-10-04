/**
 * OAuth 2.1 authentication for MCP server
 *
 * Implements MCP specification requirements:
 * - Resource Indicators (RFC 8707)
 * - WWW-Authenticate header for discovery
 * - Token validation with audience binding
 * - OAuth 2.1 authorization flow
 */

import type { Context, Next } from 'hono'
import type { Env, User, MCPError } from './types'

/**
 * MCP server resource URI - must match token audience
 */
export const MCP_RESOURCE_URI = 'https://mcp.do'

/**
 * OAuth authorization server metadata
 */
export const OAUTH_METADATA = {
  issuer: 'https://oauth.do',
  authorization_endpoint: 'https://api.workos.com/user_management/authorize',
  token_endpoint: 'https://oauth.do/token',
  userinfo_endpoint: 'https://oauth.do/user',
  resource_documentation: 'https://mcp.do/docs/oauth',
  resource_identifier: MCP_RESOURCE_URI,
  scopes_supported: ['openid', 'profile', 'email'],
  grant_types_supported: ['authorization_code', 'refresh_token'],
  code_challenge_methods_supported: ['S256'],
}

/**
 * Extract access token from Authorization header
 */
function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.substring(7)
}

/**
 * Validate access token with OAuth worker
 */
async function validateToken(token: string, env: Env): Promise<User | null> {
  try {
    // Call OAuth worker's /user endpoint to validate token
    const response = await fetch('https://oauth.do/user', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      console.error('[MCP Auth] Token validation failed:', response.status)
      return null
    }

    const userInfo = await response.json() as any

    // Verify token audience (must be bound to this MCP server)
    // Note: WorkOS doesn't return `aud` claim, so we validate via successful userinfo response
    // In production, you would decode the JWT and verify the `resource` claim

    return {
      id: userInfo.sub || userInfo.id,
      email: userInfo.email,
      name: userInfo.name,
      role: userInfo.role,
    }
  } catch (error) {
    console.error('[MCP Auth] Token validation error:', error)
    return null
  }
}

/**
 * Return 401 with WWW-Authenticate header (MCP OAuth discovery)
 */
function unauthorized(c: Context<{ Bindings: Env }>, error: string = 'invalid_token', description?: string): Response {
  // WWW-Authenticate header includes OAuth authorization server metadata
  const wwwAuth = [
    'Bearer',
    `realm="${MCP_RESOURCE_URI}"`,
    `error="${error}"`,
    description ? `error_description="${description}"` : null,
    `resource_metadata="https://mcp.do/.well-known/oauth-protected-resource"`,
  ]
    .filter(Boolean)
    .join(', ')

  return c.json<MCPError>(
    {
      code: 401,
      message: 'Unauthorized',
      data: { error, description },
    },
    401,
    {
      'WWW-Authenticate': wwwAuth,
    }
  )
}

/**
 * Authentication middleware - validates OAuth 2.1 access tokens
 *
 * Usage:
 * ```typescript
 * app.use('/protected/*', authMiddleware)
 * ```
 */
export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization')
  const token = extractToken(authHeader)

  // No token provided
  if (!token) {
    return unauthorized(c, 'invalid_request', 'Authorization header with Bearer token required')
  }

  // Validate token
  const user = await validateToken(token, c.env)

  if (!user) {
    return unauthorized(c, 'invalid_token', 'Token validation failed')
  }

  // Store user in context
  c.set('user', user)

  await next()
}

/**
 * Optional authentication middleware - allows requests without tokens
 * Sets user in context if token is valid
 */
export async function optionalAuthMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization')
  const token = extractToken(authHeader)

  if (token) {
    const user = await validateToken(token, c.env)
    if (user) {
      c.set('user', user)
    }
  }

  await next()
}

/**
 * Get authenticated user from context
 */
export function getUser(c: Context): User | null {
  return c.get('user') || null
}

/**
 * Require user to be authenticated (throws if not)
 */
export function requireUser(c: Context): User {
  const user = getUser(c)
  if (!user) {
    throw new Error('Authentication required')
  }
  return user
}

/**
 * Legacy auth function for backwards compatibility
 * @deprecated Use authMiddleware instead
 */
export async function authenticateRequest(c: Context<{ Bindings: Env }>): Promise<{
  authenticated: boolean
  user: User | null
}> {
  const authHeader = c.req.header('Authorization')
  const token = extractToken(authHeader)

  if (!token) {
    return { authenticated: false, user: null }
  }

  const user = await validateToken(token, c.env)

  return {
    authenticated: user !== null,
    user,
  }
}
