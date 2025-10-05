import type { Env, TokenInfo, SessionData } from './types'

/**
 * OAuth Authentication Middleware
 * Validates OAuth tokens via OAUTH_SERVICE and AUTH_SERVICE
 */

/**
 * Extract bearer token from Authorization header
 */
export function extractToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return null

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null

  return parts[1]
}

/**
 * Validate OAuth token via OAUTH_SERVICE
 */
export async function validateToken(token: string, env: Env): Promise<TokenInfo | null> {
  try {
    // Call OAUTH_SERVICE to validate token
    const result = await env.OAUTH_SERVICE.validateToken(token)

    if (!result || !result.valid) {
      return null
    }

    return {
      userId: result.userId,
      email: result.email,
      name: result.name,
      organizationId: result.organizationId,
      permissions: result.permissions || [],
      expiresAt: result.expiresAt,
    }
  } catch (error) {
    console.error('Token validation error:', error)
    return null
  }
}

/**
 * Get or create session for authenticated user
 */
export async function getOrCreateSession(
  tokenInfo: TokenInfo,
  token: string,
  env: Env
): Promise<string> {
  // Generate session ID
  const sessionId = `session:${tokenInfo.userId}:${Date.now()}`

  // Store session in KV
  const sessionData: SessionData = {
    userId: tokenInfo.userId,
    token,
    createdAt: Date.now(),
    expiresAt: tokenInfo.expiresAt,
  }

  const ttl = Math.max(0, Math.floor((tokenInfo.expiresAt - Date.now()) / 1000))
  await env.SESSIONS.put(sessionId, JSON.stringify(sessionData), {
    expirationTtl: ttl,
  })

  return sessionId
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string, env: Env): Promise<SessionData | null> {
  try {
    const data = await env.SESSIONS.get(sessionId)
    if (!data) return null

    const session: SessionData = JSON.parse(data)

    // Check expiration
    if (session.expiresAt < Date.now()) {
      await env.SESSIONS.delete(sessionId)
      return null
    }

    return session
  } catch (error) {
    console.error('Session retrieval error:', error)
    return null
  }
}

/**
 * Delete session
 */
export async function deleteSession(sessionId: string, env: Env): Promise<void> {
  await env.SESSIONS.delete(sessionId)
}

/**
 * Authenticate request and return token info
 */
export async function authenticate(request: Request, env: Env): Promise<TokenInfo | null> {
  // Try bearer token first
  const token = extractToken(request)
  if (token) {
    return await validateToken(token, env)
  }

  // Try session ID from cookie
  const cookies = request.headers.get('Cookie')
  if (cookies) {
    const sessionMatch = cookies.match(/sessionId=([^;]+)/)
    if (sessionMatch) {
      const session = await getSession(sessionMatch[1], env)
      if (session) {
        return await validateToken(session.token, env)
      }
    }
  }

  return null
}
