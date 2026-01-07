/**
 * oauth.do - Reusable OAuth 2.1 Provider
 *
 * This worker provides a reusable OAuth 2.1 authorization server
 * powered by a Durable Object. Use it as a standalone service or
 * import the DO class into your own worker.
 *
 * Usage as standalone:
 *   Deploy this worker and use the OAuth endpoints directly
 *
 * Usage as library:
 *   import { OAuthProviderDO } from '@dotdo/oauth.do/do'
 *   // Add to your wrangler.jsonc durable_objects bindings
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { OAuthProviderDO, type OAuthProviderEnv, type OAuthProviderConfig, type OAuthClient } from './oauth-provider-do'

export { OAuthProviderDO }
export type { OAuthProviderEnv, OAuthProviderConfig, OAuthClient }

const app = new Hono<{ Bindings: OAuthProviderEnv }>()

// CORS for OAuth flows
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['X-Request-Id'],
    credentials: true,
  })
)

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'oauth.do' }))

// Proxy all OAuth routes to the Durable Object
app.all('/.well-known/*', async (c) => {
  const id = c.env.OAUTH_PROVIDER.idFromName('global')
  const stub = c.env.OAUTH_PROVIDER.get(id)
  return stub.fetch(c.req.raw)
})

app.all('/oauth2/*', async (c) => {
  const id = c.env.OAUTH_PROVIDER.idFromName('global')
  const stub = c.env.OAUTH_PROVIDER.get(id)
  return stub.fetch(c.req.raw)
})

// Documentation / landing page
app.get('/', (c) => {
  return c.json({
    name: 'oauth.do',
    description: 'Reusable OAuth 2.1 Provider',
    version: '0.1.0',
    endpoints: {
      discovery: '/.well-known/openid-configuration',
      authorize: '/oauth2/authorize',
      token: '/oauth2/token',
      userinfo: '/oauth2/userinfo',
      register: '/oauth2/register',
      introspect: '/oauth2/introspect',
      revoke: '/oauth2/revoke',
    },
    docs: 'https://workers.do/docs/oauth',
  })
})

// Fallback
app.all('*', (c) => {
  return c.json(
    {
      error: 'not_found',
      message: 'oauth.do - Reusable OAuth 2.1 Provider',
      docs: 'https://workers.do/docs/oauth',
    },
    404
  )
})

export default app
