// Better Auth OAuth proxy plugin for OAuth flow handling
// Custom plugin for proxying OAuth flows

import type { BetterAuthPlugin } from 'better-auth'

/**
 * OAuth provider configuration
 */
export interface OAuthProviderConfig {
  clientId: string
  clientSecret: string
  scopes?: string[]
}

/**
 * OAuth proxy plugin options
 */
export interface OAuthProxyOptions {
  /** Configured OAuth providers */
  providers?: {
    github?: OAuthProviderConfig
    google?: OAuthProviderConfig
    workos?: OAuthProviderConfig
    [key: string]: OAuthProviderConfig | undefined
  }
  /** Allowed redirect URIs (supports wildcards) */
  allowedRedirectUris?: string[]
  /** Enable PKCE for public clients (default: true) */
  enablePkce?: boolean
}

/**
 * OAuth proxy plugin for handling OAuth flows
 *
 * Provides OAuth proxy functionality for handling OAuth flows on behalf
 * of client applications. Enables secure OAuth authentication without
 * exposing client secrets to frontend applications.
 *
 * @example
 * ```ts
 * import { createAuth } from '@dotdo/auth/better-auth'
 * import { oauthProxy } from '@dotdo/auth/plugins/oauth-proxy'
 *
 * const auth = createAuth({
 *   database: db,
 *   secret: env.AUTH_SECRET,
 *   plugins: [
 *     oauthProxy({
 *       providers: {
 *         github: {
 *           clientId: env.GITHUB_CLIENT_ID,
 *           clientSecret: env.GITHUB_CLIENT_SECRET
 *         },
 *         google: {
 *           clientId: env.GOOGLE_CLIENT_ID,
 *           clientSecret: env.GOOGLE_CLIENT_SECRET
 *         }
 *       },
 *       allowedRedirectUris: [
 *         'http://localhost:*',
 *         'https://*.workers.do'
 *       ]
 *     })
 *   ]
 * })
 *
 * // Initiate OAuth flow
 * const authUrl = await auth.api.oauthProxy.authorize({
 *   provider: 'github',
 *   redirectUri: 'https://my-app.workers.do/callback',
 *   state: 'random_state_value'
 * })
 * ```
 */
export function oauthProxy(options: OAuthProxyOptions = {}): BetterAuthPlugin {
  const { providers = {}, allowedRedirectUris = [], enablePkce = true } = options

  return {
    id: 'oauth-proxy',
    endpoints: {
      authorize: {
        method: 'GET',
        path: '/oauth/authorize',
        handler: async (ctx) => {
          // Implementation would initiate OAuth flow
          return ctx.json({ error: 'Not implemented' }, 501)
        },
      },
      callback: {
        method: 'GET',
        path: '/oauth/callback',
        handler: async (ctx) => {
          // Implementation would handle OAuth callback
          return ctx.json({ error: 'Not implemented' }, 501)
        },
      },
      token: {
        method: 'POST',
        path: '/oauth/token',
        handler: async (ctx) => {
          // Implementation would exchange code for tokens
          return ctx.json({ error: 'Not implemented' }, 501)
        },
      },
      refresh: {
        method: 'POST',
        path: '/oauth/refresh',
        handler: async (ctx) => {
          // Implementation would refresh tokens
          return ctx.json({ error: 'Not implemented' }, 501)
        },
      },
      revoke: {
        method: 'POST',
        path: '/oauth/revoke',
        handler: async (ctx) => {
          // Implementation would revoke tokens
          return ctx.json({ error: 'Not implemented' }, 501)
        },
      },
    },
  }
}

export default oauthProxy
