/**
 * Session Management
 * Handles JWT-based sessions with database storage
 */

import type { AuthServiceEnv, Session, SessionCreateInput, User, JWTPayload } from './types'
import { createJWT, verifyJWT, createRefreshToken, verifyRefreshToken, generateUUID, getExpiryDate, isExpired } from './utils'
import { InvalidTokenError, TokenExpiredError } from './types'

const DEFAULT_SESSION_EXPIRY_DAYS = 7 // 7 days
const DEFAULT_REFRESH_TOKEN_EXPIRY_DAYS = 30 // 30 days
const JWT_EXPIRY_SECONDS = 3600 // 1 hour

/**
 * Create a new session for a user
 */
export async function createSession(env: AuthServiceEnv, user: User, input?: SessionCreateInput): Promise<{ session: Session; token: string; refreshToken: string }> {
  const sessionId = generateUUID()
  const now = new Date()
  const expiresAt = getExpiryDate(input?.expiresInDays || DEFAULT_SESSION_EXPIRY_DAYS)

  // Create JWT token
  const token = await createJWT(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      sessionId,
    },
    env.JWT_SECRET,
    JWT_EXPIRY_SECONDS
  )

  // Create refresh token
  const refreshToken = await createRefreshToken(
    {
      sub: user.id,
      sessionId,
    },
    env.JWT_REFRESH_SECRET,
    DEFAULT_REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 // Convert days to seconds
  )

  // Store session in database
  await env.DB.execute({
    sql: `
      INSERT INTO sessions (id, user_id, token, refresh_token, expires_at, device, ip_address, user_agent, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    params: [
      sessionId,
      user.id,
      token,
      refreshToken,
      expiresAt.toISOString(),
      input?.device || null,
      input?.ipAddress || null,
      input?.userAgent || null,
      now.toISOString(),
      now.toISOString(),
    ],
  })

  const session: Session = {
    id: sessionId,
    userId: user.id,
    token,
    refreshToken,
    expiresAt,
    device: input?.device,
    ipAddress: input?.ipAddress,
    userAgent: input?.userAgent,
    createdAt: now,
    updatedAt: now,
  }

  return { session, token, refreshToken }
}

/**
 * Validate JWT token and return session
 */
export async function validateToken(env: AuthServiceEnv, token: string): Promise<{ user: User; session: Session }> {
  try {
    // Verify JWT
    const payload = await verifyJWT(token, env.JWT_SECRET)

    // Get session from database
    const sessionResult = await env.DB.query({
      sql: 'SELECT * FROM sessions WHERE id = ? LIMIT 1',
      params: [payload.sessionId],
    })

    if (!sessionResult?.rows || sessionResult.rows.length === 0) {
      throw new InvalidTokenError('Session not found')
    }

    const sessionRow = sessionResult.rows[0]

    // Check if session is expired
    if (isExpired(new Date(sessionRow.expires_at as string))) {
      throw new TokenExpiredError('Session expired')
    }

    // Get user
    const userResult = await env.DB.query({
      sql: 'SELECT * FROM users WHERE id = ? LIMIT 1',
      params: [payload.sub],
    })

    if (!userResult?.rows || userResult.rows.length === 0) {
      throw new InvalidTokenError('User not found')
    }

    const userRow = userResult.rows[0]

    const user: User = {
      id: userRow.id as string,
      email: userRow.email as string,
      name: userRow.name as string | null,
      image: userRow.image as string | null,
      role: (userRow.role as 'admin' | 'user' | 'viewer') || 'user',
      emailVerified: userRow.email_verified as boolean,
      workosId: userRow.workos_id as string | undefined,
      organizationId: userRow.organization_id as string | undefined,
      createdAt: new Date(userRow.created_at as string),
      updatedAt: new Date(userRow.updated_at as string),
    }

    const session: Session = {
      id: sessionRow.id as string,
      userId: sessionRow.user_id as string,
      token: sessionRow.token as string,
      refreshToken: sessionRow.refresh_token as string,
      expiresAt: new Date(sessionRow.expires_at as string),
      device: sessionRow.device as string | undefined,
      ipAddress: sessionRow.ip_address as string | undefined,
      userAgent: sessionRow.user_agent as string | undefined,
      createdAt: new Date(sessionRow.created_at as string),
      updatedAt: new Date(sessionRow.updated_at as string),
    }

    return { user, session }
  } catch (error) {
    if (error instanceof InvalidTokenError || error instanceof TokenExpiredError) {
      throw error
    }
    throw new InvalidTokenError('Invalid token')
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshSession(env: AuthServiceEnv, refreshToken: string): Promise<{ token: string; refreshToken: string }> {
  try {
    // Verify refresh token
    const payload = await verifyRefreshToken(refreshToken, env.JWT_REFRESH_SECRET)

    // Get session
    const sessionResult = await env.DB.query({
      sql: 'SELECT * FROM sessions WHERE id = ? LIMIT 1',
      params: [payload.sessionId],
    })

    if (!sessionResult?.rows || sessionResult.rows.length === 0) {
      throw new InvalidTokenError('Session not found')
    }

    const sessionRow = sessionResult.rows[0]

    // Check if session is expired
    if (isExpired(new Date(sessionRow.expires_at as string))) {
      throw new TokenExpiredError('Session expired')
    }

    // Get user
    const userResult = await env.DB.query({
      sql: 'SELECT * FROM users WHERE id = ? LIMIT 1',
      params: [payload.sub],
    })

    if (!userResult?.rows || userResult.rows.length === 0) {
      throw new InvalidTokenError('User not found')
    }

    const userRow = userResult.rows[0]

    // Create new JWT token
    const newToken = await createJWT(
      {
        sub: userRow.id as string,
        email: userRow.email as string,
        role: (userRow.role as string) || 'user',
        sessionId: payload.sessionId,
      },
      env.JWT_SECRET,
      JWT_EXPIRY_SECONDS
    )

    // Create new refresh token
    const newRefreshToken = await createRefreshToken(
      {
        sub: userRow.id as string,
        sessionId: payload.sessionId,
      },
      env.JWT_REFRESH_SECRET,
      DEFAULT_REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60
    )

    // Update session in database
    const now = new Date()
    await env.DB.execute({
      sql: 'UPDATE sessions SET token = ?, refresh_token = ?, updated_at = ? WHERE id = ?',
      params: [newToken, newRefreshToken, now.toISOString(), payload.sessionId],
    })

    return { token: newToken, refreshToken: newRefreshToken }
  } catch (error) {
    if (error instanceof InvalidTokenError || error instanceof TokenExpiredError) {
      throw error
    }
    throw new InvalidTokenError('Invalid refresh token')
  }
}

/**
 * Get session by ID
 */
export async function getSession(env: AuthServiceEnv, sessionId: string): Promise<Session | null> {
  const result = await env.DB.query({
    sql: 'SELECT * FROM sessions WHERE id = ? LIMIT 1',
    params: [sessionId],
  })

  if (!result?.rows || result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]

  return {
    id: row.id as string,
    userId: row.user_id as string,
    token: row.token as string,
    refreshToken: row.refresh_token as string,
    expiresAt: new Date(row.expires_at as string),
    device: row.device as string | undefined,
    ipAddress: row.ip_address as string | undefined,
    userAgent: row.user_agent as string | undefined,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

/**
 * Revoke a session (logout)
 */
export async function revokeSession(env: AuthServiceEnv, sessionId: string): Promise<boolean> {
  const result = await env.DB.execute({
    sql: 'DELETE FROM sessions WHERE id = ?',
    params: [sessionId],
  })

  return result.changes > 0
}

/**
 * Revoke all sessions for a user
 */
export async function revokeAllUserSessions(env: AuthServiceEnv, userId: string): Promise<number> {
  const result = await env.DB.execute({
    sql: 'DELETE FROM sessions WHERE user_id = ?',
    params: [userId],
  })

  return result.changes || 0
}

/**
 * List all sessions for a user
 */
export async function listUserSessions(env: AuthServiceEnv, userId: string): Promise<Session[]> {
  const result = await env.DB.query({
    sql: 'SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC',
    params: [userId],
  })

  if (!result?.rows) {
    return []
  }

  return result.rows.map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    token: row.token,
    refreshToken: row.refresh_token,
    expiresAt: new Date(row.expires_at),
    device: row.device,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  }))
}

/**
 * Clean up expired sessions (for scheduled task)
 */
export async function cleanupExpiredSessions(env: AuthServiceEnv): Promise<number> {
  const now = new Date()

  const result = await env.DB.execute({
    sql: 'DELETE FROM sessions WHERE expires_at < ?',
    params: [now.toISOString()],
  })

  return result.changes || 0
}
