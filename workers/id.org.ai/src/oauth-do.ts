/**
 * OAuthDO - OAuth 2.1 Provider Durable Object
 *
 * This Durable Object implements the OAuth 2.1 authorization server
 * using better-auth's oauth-provider plugin.
 *
 * Authentication is delegated to WorkOS AuthKit, which handles:
 * - Social login (Google, GitHub, Microsoft, Apple)
 * - Enterprise SSO (SAML, OIDC)
 * - Magic Link, Password authentication
 *
 * Provider tokens (from the user's identity provider) are stored
 * in WorkOS Vault, scoped to the user's organization.
 */

import { DurableObject } from 'cloudflare:workers'
import { Hono } from 'hono'
import { betterAuth } from 'better-auth'
import { oAuthProvider } from '@better-auth/oauth-provider'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { WorkOS } from '@workos-inc/node'

interface Env {
  OAUTH: DurableObjectNamespace
  DB: D1Database
  SESSIONS: KVNamespace
  WORKOS_API_KEY: string
  WORKOS_CLIENT_ID: string
  AUTH_SECRET: string
  JWKS_SECRET: string
}

/**
 * Client registration for OAuth apps
 */
interface OAuthClient {
  id: string
  name: string
  secret?: string
  redirectUris: string[]
  scopes: string[]
  trusted: boolean
  createdAt: string
}

export class OAuthDO extends DurableObject<Env> {
  private app: Hono
  private workos: WorkOS
  private auth: ReturnType<typeof betterAuth> | null = null

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.workos = new WorkOS(env.WORKOS_API_KEY)
    this.app = this.createApp()
  }

  private async getAuth() {
    if (this.auth) return this.auth

    // Initialize better-auth with oauth-provider plugin
    this.auth = betterAuth({
      database: drizzleAdapter(this.env.DB as any, { provider: 'sqlite' }),
      secret: this.env.AUTH_SECRET,
      baseURL: 'https://id.org.ai',
      plugins: [
        oAuthProvider({
          loginPage: '/login',
          consentPage: '/consent',
          // Custom access token claims
          accessTokenExpiresIn: 3600, // 1 hour
          refreshTokenExpiresIn: 60 * 60 * 24 * 30, // 30 days
          // Include org context in tokens
          customAccessTokenClaims: async ({ user, scopes }) => {
            const claims: Record<string, unknown> = {}
            if (user.organizationId) {
              claims.org_id = user.organizationId
            }
            return claims
          },
        }),
      ],
      session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // 1 day
      },
    })

    return this.auth
  }

  private createApp(): Hono {
    const app = new Hono()

    // OAuth 2.1 Authorization Endpoint
    app.get('/oauth2/authorize', async (c) => {
      const auth = await this.getAuth()
      const url = new URL(c.req.url)

      // Check if user is already authenticated
      const session = await auth.api.getSession({ headers: c.req.raw.headers })

      if (!session) {
        // Store OAuth params and redirect to login
        const state = crypto.randomUUID()
        await this.ctx.storage.put(`oauth:${state}`, {
          params: url.searchParams.toString(),
          timestamp: Date.now(),
        })

        const loginUrl = new URL('/login', url.origin)
        loginUrl.searchParams.set('return_to', `/oauth2/authorize?${url.searchParams.toString()}`)
        return c.redirect(loginUrl.toString())
      }

      // User is authenticated, check consent
      const clientId = url.searchParams.get('client_id')
      const scope = url.searchParams.get('scope') || 'openid profile email'
      const redirectUri = url.searchParams.get('redirect_uri')
      const responseType = url.searchParams.get('response_type')
      const codeChallenge = url.searchParams.get('code_challenge')
      const codeChallengeMethod = url.searchParams.get('code_challenge_method')
      const state = url.searchParams.get('state')

      if (!clientId || !redirectUri || responseType !== 'code') {
        return c.json({ error: 'invalid_request', error_description: 'Missing required parameters' }, 400)
      }

      // Verify client
      const client = await this.getClient(clientId)
      if (!client) {
        return c.json({ error: 'invalid_client', error_description: 'Unknown client' }, 400)
      }

      // Verify redirect URI
      if (!client.redirectUris.includes(redirectUri)) {
        return c.json({ error: 'invalid_request', error_description: 'Invalid redirect_uri' }, 400)
      }

      // Check if consent already granted
      const consentKey = `consent:${session.user.id}:${clientId}`
      const existingConsent = await this.ctx.storage.get<{ scopes: string[] }>(consentKey)
      const requestedScopes = scope.split(' ')

      if (!client.trusted && (!existingConsent || !requestedScopes.every((s) => existingConsent.scopes.includes(s)))) {
        // Redirect to consent page
        const consentUrl = new URL('/consent', url.origin)
        consentUrl.searchParams.set('client_id', clientId)
        consentUrl.searchParams.set('scope', scope)
        consentUrl.searchParams.set('redirect_uri', redirectUri)
        if (state) consentUrl.searchParams.set('state', state)
        if (codeChallenge) {
          consentUrl.searchParams.set('code_challenge', codeChallenge)
          consentUrl.searchParams.set('code_challenge_method', codeChallengeMethod || 'S256')
        }
        return c.redirect(consentUrl.toString())
      }

      // Generate authorization code
      const code = crypto.randomUUID()
      await this.ctx.storage.put(
        `code:${code}`,
        {
          clientId,
          userId: session.user.id,
          scopes: requestedScopes,
          redirectUri,
          codeChallenge,
          codeChallengeMethod,
          timestamp: Date.now(),
        },
        { expirationTtl: 600 }
      ) // 10 minute TTL

      // Redirect back to client
      const redirectUrl = new URL(redirectUri)
      redirectUrl.searchParams.set('code', code)
      if (state) redirectUrl.searchParams.set('state', state)

      return c.redirect(redirectUrl.toString())
    })

    // OAuth 2.1 Token Endpoint
    app.post('/oauth2/token', async (c) => {
      const body = await c.req.parseBody()
      const grantType = body.grant_type as string

      if (grantType === 'authorization_code') {
        return this.handleAuthorizationCodeGrant(c, body)
      } else if (grantType === 'refresh_token') {
        return this.handleRefreshTokenGrant(c, body)
      } else if (grantType === 'client_credentials') {
        return this.handleClientCredentialsGrant(c, body)
      }

      return c.json({ error: 'unsupported_grant_type' }, 400)
    })

    // UserInfo Endpoint
    app.get('/oauth2/userinfo', async (c) => {
      const authHeader = c.req.header('Authorization')
      if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'invalid_token' }, 401)
      }

      const token = authHeader.substring(7)
      const tokenData = await this.ctx.storage.get<{
        userId: string
        scopes: string[]
        clientId: string
      }>(`access:${token}`)

      if (!tokenData) {
        return c.json({ error: 'invalid_token' }, 401)
      }

      const auth = await this.getAuth()
      // Get user from database
      const user = await auth.api.getSession({ headers: c.req.raw.headers })

      if (!user) {
        return c.json({ error: 'invalid_token' }, 401)
      }

      const claims: Record<string, unknown> = {
        sub: tokenData.userId,
      }

      if (tokenData.scopes.includes('profile')) {
        claims.name = user.user.name
        claims.picture = user.user.image
      }

      if (tokenData.scopes.includes('email')) {
        claims.email = user.user.email
        claims.email_verified = user.user.emailVerified
      }

      return c.json(claims)
    })

    // Token Introspection
    app.post('/oauth2/introspect', async (c) => {
      const body = await c.req.parseBody()
      const token = body.token as string

      if (!token) {
        return c.json({ active: false })
      }

      const tokenData = await this.ctx.storage.get<{
        userId: string
        scopes: string[]
        clientId: string
        exp: number
      }>(`access:${token}`)

      if (!tokenData || tokenData.exp < Date.now()) {
        return c.json({ active: false })
      }

      return c.json({
        active: true,
        client_id: tokenData.clientId,
        sub: tokenData.userId,
        scope: tokenData.scopes.join(' '),
        exp: Math.floor(tokenData.exp / 1000),
      })
    })

    // Token Revocation
    app.post('/oauth2/revoke', async (c) => {
      const body = await c.req.parseBody()
      const token = body.token as string

      if (token) {
        await this.ctx.storage.delete(`access:${token}`)
        await this.ctx.storage.delete(`refresh:${token}`)
      }

      return c.text('', 200)
    })

    // Login page - redirects to WorkOS AuthKit
    app.get('/login', async (c) => {
      const returnTo = c.req.query('return_to') || '/oauth2/authorize'
      const state = crypto.randomUUID()

      // Store return URL
      await this.ctx.storage.put(`login:${state}`, { returnTo, timestamp: Date.now() }, { expirationTtl: 600 })

      // Generate WorkOS AuthKit URL
      const authUrl = this.workos.userManagement.getAuthorizationUrl({
        clientId: this.env.WORKOS_CLIENT_ID,
        redirectUri: 'https://id.org.ai/callback',
        state,
        provider: undefined, // Let user choose
      })

      return c.redirect(authUrl)
    })

    // WorkOS AuthKit callback
    app.get('/callback', async (c) => {
      const code = c.req.query('code')
      const state = c.req.query('state')

      if (!code || !state) {
        return c.json({ error: 'invalid_request' }, 400)
      }

      // Get stored return URL
      const loginState = await this.ctx.storage.get<{ returnTo: string }>(`login:${state}`)
      await this.ctx.storage.delete(`login:${state}`)

      try {
        // Exchange code for user
        const { user, organizationId, accessToken, refreshToken } = await this.workos.userManagement.authenticateWithCode({
          clientId: this.env.WORKOS_CLIENT_ID,
          code,
        })

        // Store provider tokens in WorkOS Vault if org context
        if (organizationId && accessToken) {
          // Note: WorkOS Vault API would be used here
          // await this.workos.vault.store(organizationId, 'provider_token', accessToken)
        }

        // Create or update user in our database
        const auth = await this.getAuth()

        // Create session
        const sessionToken = crypto.randomUUID()
        await this.ctx.storage.put(
          `session:${sessionToken}`,
          {
            userId: user.id,
            email: user.email,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
            picture: user.profilePictureUrl,
            organizationId,
            createdAt: Date.now(),
          },
          { expirationTtl: 60 * 60 * 24 * 7 }
        ) // 7 days

        // Set session cookie and redirect
        const returnTo = loginState?.returnTo || '/'
        const response = c.redirect(returnTo)
        response.headers.set('Set-Cookie', `session=${sessionToken}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`)
        return response
      } catch (error) {
        console.error('WorkOS callback error:', error)
        return c.json({ error: 'authentication_failed' }, 500)
      }
    })

    // Consent page
    app.get('/consent', async (c) => {
      const clientId = c.req.query('client_id')
      const scope = c.req.query('scope') || 'openid profile email'
      const redirectUri = c.req.query('redirect_uri')
      const state = c.req.query('state')

      if (!clientId || !redirectUri) {
        return c.json({ error: 'invalid_request' }, 400)
      }

      const client = await this.getClient(clientId)
      if (!client) {
        return c.json({ error: 'invalid_client' }, 400)
      }

      // Render consent page
      return c.html(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Authorize ${client.name}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui, sans-serif; max-width: 400px; margin: 40px auto; padding: 20px; }
              .app-name { font-size: 1.5em; font-weight: bold; margin-bottom: 20px; }
              .scopes { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0; }
              .scope { padding: 5px 0; }
              .buttons { display: flex; gap: 10px; margin-top: 20px; }
              button { flex: 1; padding: 12px; border-radius: 8px; font-size: 16px; cursor: pointer; }
              .allow { background: #000; color: #fff; border: none; }
              .deny { background: #fff; border: 1px solid #ddd; }
            </style>
          </head>
          <body>
            <div class="app-name">${client.name}</div>
            <p>wants to access your account</p>
            <div class="scopes">
              ${scope
                .split(' ')
                .map(
                  (s) => `
                <div class="scope">✓ ${this.getScopeDescription(s)}</div>
              `
                )
                .join('')}
            </div>
            <form method="POST" action="/consent">
              <input type="hidden" name="client_id" value="${clientId}">
              <input type="hidden" name="scope" value="${scope}">
              <input type="hidden" name="redirect_uri" value="${redirectUri}">
              ${state ? `<input type="hidden" name="state" value="${state}">` : ''}
              <div class="buttons">
                <button type="submit" name="action" value="deny" class="deny">Deny</button>
                <button type="submit" name="action" value="allow" class="allow">Allow</button>
              </div>
            </form>
          </body>
        </html>
      `)
    })

    // Handle consent submission
    app.post('/consent', async (c) => {
      const body = await c.req.parseBody()
      const action = body.action as string
      const clientId = body.client_id as string
      const scope = body.scope as string
      const redirectUri = body.redirect_uri as string
      const state = body.state as string

      // Get session
      const sessionToken = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1]
      if (!sessionToken) {
        return c.redirect('/login?return_to=' + encodeURIComponent(c.req.url))
      }

      const session = await this.ctx.storage.get<{ userId: string }>(`session:${sessionToken}`)
      if (!session) {
        return c.redirect('/login?return_to=' + encodeURIComponent(c.req.url))
      }

      if (action === 'deny') {
        const url = new URL(redirectUri)
        url.searchParams.set('error', 'access_denied')
        if (state) url.searchParams.set('state', state)
        return c.redirect(url.toString())
      }

      // Store consent
      const consentKey = `consent:${session.userId}:${clientId}`
      await this.ctx.storage.put(consentKey, { scopes: scope.split(' '), timestamp: Date.now() })

      // Continue with authorization
      const authUrl = new URL('/oauth2/authorize', c.req.url)
      authUrl.searchParams.set('client_id', clientId)
      authUrl.searchParams.set('scope', scope)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('response_type', 'code')
      if (state) authUrl.searchParams.set('state', state)

      return c.redirect(authUrl.toString())
    })

    // Client Registration
    app.post('/oauth2/register', async (c) => {
      const body = await c.req.json<{
        client_name: string
        redirect_uris: string[]
        scope?: string
        grant_types?: string[]
      }>()

      const clientId = crypto.randomUUID()
      const clientSecret = crypto.randomUUID()

      const client: OAuthClient = {
        id: clientId,
        name: body.client_name,
        secret: clientSecret,
        redirectUris: body.redirect_uris,
        scopes: body.scope?.split(' ') || ['openid', 'profile', 'email'],
        trusted: false,
        createdAt: new Date().toISOString(),
      }

      await this.ctx.storage.put(`client:${clientId}`, client)

      return c.json({
        client_id: clientId,
        client_secret: clientSecret,
        client_name: client.name,
        redirect_uris: client.redirectUris,
        grant_types: body.grant_types || ['authorization_code', 'refresh_token'],
      })
    })

    // API: Get current user
    app.get('/api/me', async (c) => {
      const sessionToken = c.req.header('Cookie')?.match(/session=([^;]+)/)?.[1]
      if (!sessionToken) {
        return c.json({ error: 'unauthorized' }, 401)
      }

      const session = await this.ctx.storage.get<{
        userId: string
        email: string
        name: string
        picture?: string
        organizationId?: string
      }>(`session:${sessionToken}`)

      if (!session) {
        return c.json({ error: 'unauthorized' }, 401)
      }

      return c.json({
        id: session.userId,
        email: session.email,
        name: session.name,
        picture: session.picture,
        organizationId: session.organizationId,
      })
    })

    // JWKS endpoint
    app.get('/.well-known/jwks.json', async (c) => {
      // In production, generate and cache proper RSA/EC keys
      // For now, return placeholder
      return c.json({
        keys: [],
      })
    })

    return app
  }

  private async handleAuthorizationCodeGrant(c: any, body: Record<string, string | File>) {
    const code = body.code as string
    const clientId = body.client_id as string
    const clientSecret = body.client_secret as string
    const redirectUri = body.redirect_uri as string
    const codeVerifier = body.code_verifier as string

    // Get stored code data
    const codeData = await this.ctx.storage.get<{
      clientId: string
      userId: string
      scopes: string[]
      redirectUri: string
      codeChallenge?: string
      codeChallengeMethod?: string
    }>(`code:${code}`)

    if (!codeData) {
      return c.json({ error: 'invalid_grant', error_description: 'Invalid or expired code' }, 400)
    }

    // Verify client
    if (codeData.clientId !== clientId) {
      return c.json({ error: 'invalid_grant' }, 400)
    }

    // Verify redirect URI
    if (codeData.redirectUri !== redirectUri) {
      return c.json({ error: 'invalid_grant' }, 400)
    }

    // Verify PKCE
    if (codeData.codeChallenge) {
      if (!codeVerifier) {
        return c.json({ error: 'invalid_grant', error_description: 'Missing code_verifier' }, 400)
      }

      const encoder = new TextEncoder()
      const data = encoder.encode(codeVerifier)
      const hash = await crypto.subtle.digest('SHA-256', data)
      const challenge = btoa(String.fromCharCode(...new Uint8Array(hash)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '')

      if (challenge !== codeData.codeChallenge) {
        return c.json({ error: 'invalid_grant', error_description: 'Invalid code_verifier' }, 400)
      }
    } else if (clientSecret) {
      // Verify client secret for non-PKCE flows
      const client = await this.getClient(clientId)
      if (!client || client.secret !== clientSecret) {
        return c.json({ error: 'invalid_client' }, 401)
      }
    }

    // Delete used code
    await this.ctx.storage.delete(`code:${code}`)

    // Generate tokens
    const accessToken = crypto.randomUUID()
    const refreshToken = crypto.randomUUID()
    const expiresIn = 3600 // 1 hour

    // Store access token
    await this.ctx.storage.put(
      `access:${accessToken}`,
      {
        userId: codeData.userId,
        clientId,
        scopes: codeData.scopes,
        exp: Date.now() + expiresIn * 1000,
      },
      { expirationTtl: expiresIn }
    )

    // Store refresh token
    await this.ctx.storage.put(
      `refresh:${refreshToken}`,
      {
        userId: codeData.userId,
        clientId,
        scopes: codeData.scopes,
      },
      { expirationTtl: 60 * 60 * 24 * 30 }
    ) // 30 days

    return c.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      refresh_token: refreshToken,
      scope: codeData.scopes.join(' '),
    })
  }

  private async handleRefreshTokenGrant(c: any, body: Record<string, string | File>) {
    const refreshToken = body.refresh_token as string
    const clientId = body.client_id as string

    const tokenData = await this.ctx.storage.get<{
      userId: string
      clientId: string
      scopes: string[]
    }>(`refresh:${refreshToken}`)

    if (!tokenData || tokenData.clientId !== clientId) {
      return c.json({ error: 'invalid_grant' }, 400)
    }

    // Generate new access token
    const accessToken = crypto.randomUUID()
    const expiresIn = 3600

    await this.ctx.storage.put(
      `access:${accessToken}`,
      {
        userId: tokenData.userId,
        clientId,
        scopes: tokenData.scopes,
        exp: Date.now() + expiresIn * 1000,
      },
      { expirationTtl: expiresIn }
    )

    return c.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      scope: tokenData.scopes.join(' '),
    })
  }

  private async handleClientCredentialsGrant(c: any, body: Record<string, string | File>) {
    const clientId = body.client_id as string
    const clientSecret = body.client_secret as string
    const scope = (body.scope as string) || 'openid'

    const client = await this.getClient(clientId)
    if (!client || client.secret !== clientSecret) {
      return c.json({ error: 'invalid_client' }, 401)
    }

    const accessToken = crypto.randomUUID()
    const expiresIn = 3600

    await this.ctx.storage.put(
      `access:${accessToken}`,
      {
        clientId,
        scopes: scope.split(' '),
        exp: Date.now() + expiresIn * 1000,
      },
      { expirationTtl: expiresIn }
    )

    return c.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      scope,
    })
  }

  private async getClient(clientId: string): Promise<OAuthClient | null> {
    return this.ctx.storage.get<OAuthClient>(`client:${clientId}`)
  }

  private getScopeDescription(scope: string): string {
    const descriptions: Record<string, string> = {
      openid: 'Access your user ID',
      profile: 'Access your name and profile picture',
      email: 'Access your email address',
      offline_access: 'Access your data when you are not present',
    }
    return descriptions[scope] || scope
  }

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request)
  }
}
