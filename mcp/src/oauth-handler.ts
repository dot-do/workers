import type { AuthRequest, OAuthHelpers } from '@cloudflare/workers-oauth-provider'
import { Hono } from 'hono'
import * as jose from 'jose'
import { type AccessToken, type AuthenticationResponse, WorkOS } from '@workos-inc/node'
import type { Env } from './types'

/**
 * OAuth Props passed to McpAgent instances
 * Contains user info, permissions, and tokens
 */
export interface OAuthProps {
  accessToken: string
  organizationId: string | null
  permissions: string[]
  refreshToken: string | null
  user: {
    id: string
    email: string
    firstName?: string | null
    lastName?: string | null
  }
}

const app = new Hono<{
  Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers }
  Variables: { workOS: WorkOS }
}>()

// Initialize WorkOS client
app.use(async (c, next) => {
  const clientSecret = c.env.WORKOS_CLIENT_SECRET
  if (!clientSecret) {
    throw new Error('WORKOS_CLIENT_SECRET environment variable is required')
  }
  c.set('workOS', new WorkOS(clientSecret))
  await next()
})

/**
 * OAuth authorize endpoint
 * Redirects user to WorkOS AuthKit for authentication
 */
app.get('/authorize', async (c) => {
  const oauthReqInfo = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw)
  if (!oauthReqInfo.clientId) {
    return c.text('Invalid request', 400)
  }

  const clientId = c.env.WORKOS_CLIENT_ID
  if (!clientId) {
    return c.text('WORKOS_CLIENT_ID not configured', 500)
  }

  return Response.redirect(
    c.get('workOS').userManagement.getAuthorizationUrl({
      provider: 'authkit',
      clientId,
      redirectUri: 'https://oauth.do/callback',
      state: btoa(JSON.stringify(oauthReqInfo)),
    })
  )
})

/**
 * OAuth callback endpoint
 * Handles WorkOS authentication response and completes OAuth flow
 */
app.get('/callback', async (c) => {
  const workOS = c.get('workOS')

  // Get the oauthReqInfo out of state
  const stateParam = c.req.query('state')
  if (!stateParam) {
    return c.text('Missing state parameter', 400)
  }

  let oauthReqInfo: AuthRequest
  try {
    oauthReqInfo = JSON.parse(atob(stateParam))
  } catch (error) {
    return c.text('Invalid state', 400)
  }

  if (!oauthReqInfo.clientId) {
    return c.text('Invalid state', 400)
  }

  const code = c.req.query('code')
  if (!code) {
    return c.text('Missing code', 400)
  }

  const clientId = c.env.WORKOS_CLIENT_ID
  if (!clientId) {
    return c.text('WORKOS_CLIENT_ID not configured', 500)
  }

  let response: AuthenticationResponse
  try {
    response = await workOS.userManagement.authenticateWithCode({
      clientId,
      code,
    })
  } catch (error) {
    console.error('Authentication error:', error)
    return c.text('Invalid authorization code', 400)
  }

  const { accessToken, organizationId, refreshToken, user } = response
  const { permissions = [] } = jose.decodeJwt<AccessToken>(accessToken)

  const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
    request: oauthReqInfo,
    userId: user.id,
    metadata: {},
    scope: permissions,

    // This will be available on this.props inside DoMCPAgent
    props: {
      accessToken,
      organizationId,
      permissions,
      refreshToken,
      user,
    } satisfies OAuthProps,
  })

  return Response.redirect(redirectTo)
})

export const OAuthHandler = app
