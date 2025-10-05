/**
 * OAuth HTTP Endpoints
 *
 * Provides /login, /logout, /callback endpoints for OAuth flow
 */

import type { Context } from 'hono'
import type { AuthServiceEnv, WorkOSAuthResponse } from './types'
import * as workos from './workos'
import * as sessions from './sessions'
import { success, error } from './utils'

/**
 * Start OAuth login flow
 *
 * GET /login?redirect_uri=<url>&provider=<authkit|google|github>
 *
 * Redirects to WorkOS authorization URL
 */
export async function handleLogin(c: Context<{ Bindings: AuthServiceEnv }>): Promise<Response> {
  try {
    // Get redirect URI from query params or use default
    const redirectUri = c.req.query('redirect_uri') || `${new URL(c.req.url).origin}/callback`
    const provider = c.req.query('provider') || 'authkit'
    const state = c.req.query('state') || crypto.randomUUID()

    // Get authorization URL from WorkOS
    const authorizationUrl = await workos.getAuthorizationURL(c.env, {
      redirectUri,
      state,
      provider,
    })

    // Store state in session for CSRF protection
    // We'll validate this when handling the callback
    const stateKey = `oauth:state:${state}`
    await c.env.SESSIONS_KV.put(stateKey, redirectUri, {
      expirationTtl: 600, // 10 minutes
    })

    // Redirect to WorkOS
    return c.redirect(authorizationUrl)
  } catch (err: any) {
    console.error('Login error:', err)
    return c.json(error('LOGIN_ERROR', err.message || 'Failed to initiate login'), 500)
  }
}

/**
 * Handle OAuth callback
 *
 * GET /callback?code=<code>&state=<state>
 *
 * Exchanges code for tokens, creates session, redirects to app
 */
export async function handleCallback(c: Context<{ Bindings: AuthServiceEnv }>): Promise<Response> {
  try {
    const code = c.req.query('code')
    const state = c.req.query('state')

    if (!code) {
      return c.json(error('MISSING_CODE', 'Authorization code is required'), 400)
    }

    if (!state) {
      return c.json(error('MISSING_STATE', 'State parameter is required'), 400)
    }

    // Validate state (CSRF protection)
    const stateKey = `oauth:state:${state}`
    const storedRedirectUri = await c.env.SESSIONS_KV.get(stateKey)

    if (!storedRedirectUri) {
      return c.json(error('INVALID_STATE', 'Invalid or expired state parameter'), 400)
    }

    // Delete state (one-time use)
    await c.env.SESSIONS_KV.delete(stateKey)

    // Exchange code for tokens
    const authResponse: WorkOSAuthResponse = await workos.exchangeCodeForToken(c.env, code)

    // Get or create user in database
    const user = await getOrCreateUser(c.env, authResponse)

    // Create session
    const { session, token, refreshToken } = await sessions.createSession(c.env, user, {
      userId: user.id,
      device: c.req.header('user-agent'),
      ipAddress: c.req.header('cf-connecting-ip'),
      userAgent: c.req.header('user-agent'),
    })

    // Set session cookie
    const cookieOptions = [
      `sessionId=${session.id}`,
      'Path=/',
      'HttpOnly',
      'Secure',
      'SameSite=Lax',
      `Max-Age=${7 * 24 * 60 * 60}`, // 7 days
    ]

    // Construct redirect URL with tokens
    const redirectUrl = new URL(storedRedirectUri)
    redirectUrl.searchParams.set('token', token)
    redirectUrl.searchParams.set('session', session.id)

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirectUrl.toString(),
        'Set-Cookie': cookieOptions.join('; '),
      },
    })
  } catch (err: any) {
    console.error('Callback error:', err)
    return c.json(error('CALLBACK_ERROR', err.message || 'Failed to complete login'), 500)
  }
}

/**
 * Handle logout
 *
 * POST /logout
 *
 * Revokes session and clears cookies
 */
export async function handleLogout(c: Context<{ Bindings: AuthServiceEnv }>): Promise<Response> {
  try {
    // Get session ID from cookie or Authorization header
    let sessionId = c.req.header('cookie')
      ?.split(';')
      .find((c) => c.trim().startsWith('sessionId='))
      ?.split('=')[1]

    // Try Authorization header if no cookie
    if (!sessionId) {
      const authHeader = c.req.header('Authorization')
      if (authHeader?.startsWith('Bearer ')) {
        sessionId = authHeader.substring(7)
      }
    }

    if (!sessionId) {
      return c.json(error('NO_SESSION', 'No session to logout'), 400)
    }

    // Revoke session
    const revoked = await sessions.revokeSession(c.env, sessionId)

    if (!revoked) {
      return c.json(error('SESSION_NOT_FOUND', 'Session not found'), 404)
    }

    // Clear session cookie
    const cookieOptions = [
      'sessionId=',
      'Path=/',
      'HttpOnly',
      'Secure',
      'SameSite=Lax',
      'Max-Age=0', // Expire immediately
    ]

    return new Response(
      JSON.stringify(
        success({
          message: 'Logged out successfully',
          sessionId,
        })
      ),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieOptions.join('; '),
        },
      }
    )
  } catch (err: any) {
    console.error('Logout error:', err)
    return c.json(error('LOGOUT_ERROR', err.message || 'Failed to logout'), 500)
  }
}

/**
 * Refresh access token
 *
 * POST /refresh
 * Body: { refresh_token: string }
 *
 * Returns new access token and optional new refresh token
 */
export async function handleRefresh(c: Context<{ Bindings: AuthServiceEnv }>): Promise<Response> {
  try {
    const body = await c.req.json().catch(() => ({}))
    const refreshToken = body.refresh_token

    if (!refreshToken) {
      return c.json(error('MISSING_REFRESH_TOKEN', 'Refresh token is required'), 400)
    }

    // Refresh access token via WorkOS
    const { accessToken, refreshToken: newRefreshToken } = await workos.refreshAccessToken(c.env, refreshToken)

    return c.json(
      success({
        access_token: accessToken,
        refresh_token: newRefreshToken || refreshToken,
        token_type: 'Bearer',
        expires_in: 3600, // 1 hour
      })
    )
  } catch (err: any) {
    console.error('Refresh error:', err)
    return c.json(error('REFRESH_ERROR', err.message || 'Failed to refresh token'), 500)
  }
}

/**
 * Get or create user in database from WorkOS auth response
 */
async function getOrCreateUser(env: AuthServiceEnv, authResponse: WorkOSAuthResponse): Promise<any> {
  const workosUser = authResponse.user

  // Check if user exists
  const existingUserResult = await env.DB.query({
    sql: 'SELECT * FROM users WHERE workos_id = ? LIMIT 1',
    params: [workosUser.id],
  })

  if (existingUserResult?.rows && existingUserResult.rows.length > 0) {
    // User exists - update and return
    const row = existingUserResult.rows[0]

    // Update user info
    await env.DB.query({
      sql: `
        UPDATE users
        SET
          email = ?,
          name = ?,
          email_verified = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      params: [workosUser.email, workosUser.firstName + ' ' + workosUser.lastName, workosUser.emailVerified, row.id],
    })

    return {
      id: row.id,
      email: workosUser.email,
      name: workosUser.firstName + ' ' + workosUser.lastName,
      emailVerified: workosUser.emailVerified,
      workosId: workosUser.id,
      organizationId: authResponse.organizationId,
      role: row.role || 'user',
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(),
    }
  }

  // User doesn't exist - create new
  const userId = crypto.randomUUID()

  await env.DB.query({
    sql: `
      INSERT INTO users (id, email, name, email_verified, workos_id, organization_id, role, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `,
    params: [userId, workosUser.email, workosUser.firstName + ' ' + workosUser.lastName, workosUser.emailVerified, workosUser.id, authResponse.organizationId, 'user'],
  })

  return {
    id: userId,
    email: workosUser.email,
    name: workosUser.firstName + ' ' + workosUser.lastName,
    emailVerified: workosUser.emailVerified,
    workosId: workosUser.id,
    organizationId: authResponse.organizationId,
    role: 'user',
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}
