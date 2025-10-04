import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  WORKOS_CLIENT_ID: string
  WORKOS_CLIENT_SECRET: string
  WORKOS_AUTH_URL: string
  WORKOS_TOKEN_URL: string
  WORKOS_DEVICE_AUTH_URL: string
  WORKOS_USERINFO_URL: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Enable CORS for all routes
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

/**
 * Health check endpoint
 */
app.get('/health', c => {
  return c.json({ status: 'ok', service: 'oauth', timestamp: new Date().toISOString() })
})

/**
 * Get WorkOS authorization URL
 *
 * Query params:
 * - redirect_uri: OAuth callback URL (required)
 * - code_challenge: PKCE code challenge (required)
 * - state: CSRF protection state (required)
 * - scope: OAuth scopes (optional, defaults to 'openai profile email')
 */
app.get('/authorize', c => {
  const { redirect_uri, code_challenge, state, scope } = c.req.query()

  if (!redirect_uri) {
    return c.json({ error: 'missing_redirect_uri' }, 400)
  }

  if (!code_challenge) {
    return c.json({ error: 'missing_code_challenge' }, 400)
  }

  if (!state) {
    return c.json({ error: 'missing_state' }, 400)
  }

  const params = new URLSearchParams({
    client_id: c.env.WORKOS_CLIENT_ID,
    redirect_uri,
    response_type: 'code',
    code_challenge,
    code_challenge_method: 'S256',
    state,
    scope: scope || 'openai profile email',
  })

  const authUrl = `${c.env.WORKOS_AUTH_URL}?${params.toString()}`

  return c.json({ auth_url: authUrl })
})

/**
 * Exchange authorization code for tokens
 *
 * Request body:
 * - code: Authorization code (required)
 * - code_verifier: PKCE code verifier (required)
 * - redirect_uri: Original redirect URI (required)
 */
app.post('/token', async c => {
  const body = await c.req.json()
  const { code, code_verifier, redirect_uri } = body

  if (!code) {
    return c.json({ error: 'missing_code' }, 400)
  }

  if (!code_verifier) {
    return c.json({ error: 'missing_code_verifier' }, 400)
  }

  if (!redirect_uri) {
    return c.json({ error: 'missing_redirect_uri' }, 400)
  }

  try {
    const response = await fetch(c.env.WORKOS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier,
        client_id: c.env.WORKOS_CLIENT_ID,
        client_secret: c.env.WORKOS_CLIENT_SECRET,
        redirect_uri,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Token exchange failed:', error)
      return c.json({ error: 'token_exchange_failed', details: error }, response.status as any)
    }

    const tokens = await response.json()
    return c.json(tokens)
  } catch (error) {
    console.error('Token exchange error:', error)
    return c.json({ error: 'internal_error', message: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

/**
 * Refresh access token
 *
 * Request body:
 * - refresh_token: Refresh token (required)
 */
app.post('/refresh', async c => {
  const body = await c.req.json()
  const { refresh_token } = body

  if (!refresh_token) {
    return c.json({ error: 'missing_refresh_token' }, 400)
  }

  try {
    const response = await fetch(c.env.WORKOS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token,
        client_id: c.env.WORKOS_CLIENT_ID,
        client_secret: c.env.WORKOS_CLIENT_SECRET,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Token refresh failed:', error)
      return c.json({ error: 'refresh_failed', details: error }, response.status as any)
    }

    const tokens = await response.json()
    return c.json(tokens)
  } catch (error) {
    console.error('Token refresh error:', error)
    return c.json({ error: 'internal_error', message: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

/**
 * Request device authorization (device code flow)
 *
 * Request body:
 * - scope: OAuth scopes (optional, defaults to 'openai profile email')
 */
app.post('/device', async c => {
  const body = await c.req.json()
  const { scope } = body

  try {
    const response = await fetch(c.env.WORKOS_DEVICE_AUTH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: c.env.WORKOS_CLIENT_ID,
        scope: scope || 'openai profile email',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Device authorization failed:', error)
      return c.json({ error: 'device_auth_failed', details: error }, response.status as any)
    }

    const deviceAuth = await response.json()
    return c.json(deviceAuth)
  } catch (error) {
    console.error('Device authorization error:', error)
    return c.json({ error: 'internal_error', message: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

/**
 * Poll for device authorization completion
 *
 * Request body:
 * - device_code: Device code (required)
 */
app.post('/device/token', async c => {
  const body = await c.req.json()
  const { device_code } = body

  if (!device_code) {
    return c.json({ error: 'missing_device_code' }, 400)
  }

  try {
    const response = await fetch(c.env.WORKOS_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code,
        client_id: c.env.WORKOS_CLIENT_ID,
        client_secret: c.env.WORKOS_CLIENT_SECRET,
      }),
    })

    // Return response as-is (including errors like authorization_pending)
    const data = await response.json()
    return c.json(data, response.status as any)
  } catch (error) {
    console.error('Device token error:', error)
    return c.json({ error: 'internal_error', message: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

/**
 * Get user information
 *
 * Headers:
 * - Authorization: Bearer <access_token>
 */
app.get('/user', async c => {
  const authHeader = c.req.header('Authorization')

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'missing_authorization' }, 401)
  }

  const accessToken = authHeader.substring(7)

  try {
    const response = await fetch(c.env.WORKOS_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('User info fetch failed:', error)
      return c.json({ error: 'userinfo_failed', details: error }, response.status as any)
    }

    const userInfo = await response.json()
    return c.json(userInfo)
  } catch (error) {
    console.error('User info error:', error)
    return c.json({ error: 'internal_error', message: error instanceof Error ? error.message : 'Unknown error' }, 500)
  }
})

export default app
