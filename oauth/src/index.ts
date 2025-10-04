import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  WORKOS_CLIENT_ID: string
  WORKOS_CLIENT_SECRET: string
  WORKOS_AUTH_URL: string
  WORKOS_TOKEN_URL: string
  WORKOS_DEVICE_AUTH_URL: string
  WORKOS_USERINFO_URL: string
  OAUTH_SESSIONS: KVNamespace // For temporary session storage
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
 * Production OAuth flow - Start authentication
 * Opens browser to this endpoint, which redirects to WorkOS
 */
app.get('/login', async c => {
  // Allow session ID to be provided (for CLI polling), or generate new one
  const sessionId = c.req.query('session_id') || crypto.randomUUID()
  const state = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  // Generate PKCE challenge
  const codeVerifier = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const encoder = new TextEncoder()
  const data = encoder.encode(codeVerifier)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const codeChallenge = btoa(String.fromCharCode(...hashArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')

  // Store session data (expires in 10 minutes)
  await c.env.OAUTH_SESSIONS.put(
    sessionId,
    JSON.stringify({ state, codeVerifier }),
    { expirationTtl: 600 }
  )

  // Redirect to WorkOS
  const redirectUri = `${new URL(c.req.url).origin}/callback`
  const params = new URLSearchParams({
    client_id: c.env.WORKOS_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: `${sessionId}:${state}`,
    provider: 'authkit',
  })

  const authUrl = `${c.env.WORKOS_AUTH_URL}?${params.toString()}`
  return c.redirect(authUrl)
})

/**
 * Production OAuth callback - Handle WorkOS redirect
 */
const handleCallback = async (c: any) => {
  const { code, state: stateParam, error, error_description } = c.req.query()

  if (error) {
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head><title>Authentication Failed</title></head>
      <body style="font-family: sans-serif; padding: 2rem; text-align: center;">
        <h1>❌ Authentication Failed</h1>
        <p>${error_description || error}</p>
        <p>You can close this window and try again.</p>
      </body>
      </html>
    `)
  }

  if (!code || !stateParam) {
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head><title>Invalid Request</title></head>
      <body style="font-family: sans-serif; padding: 2rem; text-align: center;">
        <h1>❌ Invalid Request</h1>
        <p>Missing code or state parameter.</p>
      </body>
      </html>
    `)
  }

  // Parse session ID and state from combined state parameter
  const [sessionId, expectedState] = stateParam.split(':')

  // Get session data
  const sessionData = await c.env.OAUTH_SESSIONS.get(sessionId)
  if (!sessionData) {
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head><title>Session Expired</title></head>
      <body style="font-family: sans-serif; padding: 2rem; text-align: center;">
        <h1>⏱️ Session Expired</h1>
        <p>Your authentication session has expired. Please try again.</p>
      </body>
      </html>
    `)
  }

  const session = JSON.parse(sessionData)

  // Verify state
  if (session.state !== expectedState) {
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head><title>Security Error</title></head>
      <body style="font-family: sans-serif; padding: 2rem; text-align: center;">
        <h1>🔒 Security Error</h1>
        <p>State mismatch detected. Possible CSRF attack.</p>
      </body>
      </html>
    `)
  }

  // Exchange code for tokens
  try {
    const redirectUri = `${new URL(c.req.url).origin}/callback`
    const response = await fetch(c.env.WORKOS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        code_verifier: session.codeVerifier,
        client_id: c.env.WORKOS_CLIENT_ID,
        client_secret: c.env.WORKOS_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(error)
    }

    const tokens = await response.json()

    // Store tokens with session ID (expires in 5 minutes)
    await c.env.OAUTH_SESSIONS.put(
      `tokens:${sessionId}`,
      JSON.stringify(tokens),
      { expirationTtl: 300 }
    )

    // Delete session data
    await c.env.OAUTH_SESSIONS.delete(sessionId)

    return c.html(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          }
          .container {
            background: white;
            padding: 3rem;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            text-align: center;
            max-width: 400px;
          }
          h1 { color: #2d3748; margin: 0 0 1rem 0; }
          p { color: #4a5568; margin: 0; line-height: 1.6; }
          .icon { font-size: 48px; margin-bottom: 1rem; }
          .code {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            padding: 0.5rem 1rem;
            border-radius: 6px;
            font-family: monospace;
            font-size: 0.875rem;
            margin-top: 1rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="icon">✅</div>
          <h1>Authentication Successful!</h1>
          <p>Your CLI will automatically detect the tokens.</p>
          <p>You can close this window and return to your terminal.</p>
          <div class="code">Session ID: ${sessionId}</div>
        </div>
      </body>
      </html>
    `)
  } catch (error) {
    return c.html(`
      <!DOCTYPE html>
      <html>
      <head><title>Token Exchange Failed</title></head>
      <body style="font-family: sans-serif; padding: 2rem; text-align: center;">
        <h1>❌ Token Exchange Failed</h1>
        <p>${error instanceof Error ? error.message : 'Unknown error'}</p>
        <p>Please try again.</p>
      </body>
      </html>
    `)
  }
}

// Register callback handler
app.get('/callback', handleCallback)

/**
 * Poll for tokens - CLI uses this to retrieve tokens
 */
app.get('/poll/:sessionId', async c => {
  const sessionId = c.req.param('sessionId')
  const tokensData = await c.env.OAUTH_SESSIONS.get(`tokens:${sessionId}`)

  if (!tokensData) {
    return c.json({ status: 'pending' }, 202)
  }

  // Delete tokens after retrieval
  await c.env.OAUTH_SESSIONS.delete(`tokens:${sessionId}`)

  const tokens = JSON.parse(tokensData)
  return c.json({ status: 'complete', tokens })
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
    provider: 'authkit',
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
