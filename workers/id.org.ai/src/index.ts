/**
 * id.org.ai - Auth for AI and Humans
 *
 * OAuth 2.1 Provider powered by WorkOS AuthKit
 *
 * This worker serves as the central identity provider for the workers.do platform.
 * It provides:
 * - OAuth 2.1 authorization server (via better-auth oauth-provider)
 * - Enterprise SSO (SAML, OIDC) via WorkOS
 * - Social login (Google, GitHub, Microsoft, Apple) via WorkOS AuthKit
 * - Per-organization token storage in WorkOS Vault
 * - User and organization management
 */

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { OAuthDO } from './oauth-do'

export { OAuthDO }

export interface Env {
  // Durable Objects
  OAUTH: DurableObjectNamespace

  // Database
  DB: D1Database

  // KV
  SESSIONS: KVNamespace

  // Secrets
  WORKOS_API_KEY: string
  WORKOS_CLIENT_ID: string
  AUTH_SECRET: string
  JWKS_SECRET: string
}

const app = new Hono<{ Bindings: Env }>()

// CORS for cross-origin OAuth flows
app.use(
  '*',
  cors({
    origin: '*', // OAuth requires open CORS for redirects
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
    exposeHeaders: ['X-Request-Id'],
    credentials: true,
  })
)

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'id.org.ai' }))

// OIDC Discovery endpoint
app.get('/.well-known/openid-configuration', (c) => {
  const baseUrl = 'https://id.org.ai'
  return c.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth2/authorize`,
    token_endpoint: `${baseUrl}/oauth2/token`,
    userinfo_endpoint: `${baseUrl}/oauth2/userinfo`,
    jwks_uri: `${baseUrl}/.well-known/jwks.json`,
    registration_endpoint: `${baseUrl}/oauth2/register`,
    scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
    response_types_supported: ['code'],
    response_modes_supported: ['query'],
    grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256', 'ES256'],
    code_challenge_methods_supported: ['S256'],
    introspection_endpoint: `${baseUrl}/oauth2/introspect`,
    revocation_endpoint: `${baseUrl}/oauth2/revoke`,
    end_session_endpoint: `${baseUrl}/oauth2/end-session`,
  })
})

// OAuth Authorization Server metadata
app.get('/.well-known/oauth-authorization-server', (c) => {
  const baseUrl = 'https://id.org.ai'
  return c.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/oauth2/authorize`,
    token_endpoint: `${baseUrl}/oauth2/token`,
    registration_endpoint: `${baseUrl}/oauth2/register`,
    scopes_supported: ['openid', 'profile', 'email', 'offline_access'],
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token', 'client_credentials'],
    code_challenge_methods_supported: ['S256'],
  })
})

// All OAuth routes go to the Durable Object
app.all('/oauth2/*', async (c) => {
  const id = c.env.OAUTH.idFromName('global')
  const stub = c.env.OAUTH.get(id)
  return stub.fetch(c.req.raw)
})

// Login page (shows WorkOS AuthKit)
app.get('/login', async (c) => {
  const id = c.env.OAUTH.idFromName('global')
  const stub = c.env.OAUTH.get(id)
  return stub.fetch(c.req.raw)
})

// Consent page
app.get('/consent', async (c) => {
  const id = c.env.OAUTH.idFromName('global')
  const stub = c.env.OAUTH.get(id)
  return stub.fetch(c.req.raw)
})

// WorkOS AuthKit callback
app.get('/callback', async (c) => {
  const id = c.env.OAUTH.idFromName('global')
  const stub = c.env.OAUTH.get(id)
  return stub.fetch(c.req.raw)
})

// API routes for org.ai SDK
app.all('/api/*', async (c) => {
  const id = c.env.OAUTH.idFromName('global')
  const stub = c.env.OAUTH.get(id)
  return stub.fetch(c.req.raw)
})

// Fallback
app.all('*', (c) => {
  return c.json(
    {
      error: 'not_found',
      message: 'id.org.ai - Auth for AI and Humans',
      docs: 'https://org.ai/docs',
    },
    404
  )
})

export default app
