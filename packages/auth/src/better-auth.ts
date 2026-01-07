// Better Auth integration with Drizzle for Cloudflare DO SQLite
// Re-exports better-auth with workers.do-specific defaults
//
// Default behavior: Uses id.org.ai as the OAuth provider (federated auth)
// Override: Provide your own socialProviders config to use direct OAuth

import { betterAuth, type BetterAuthOptions } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { genericOAuth } from 'better-auth/plugins'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'

export type { BetterAuthOptions }
export { betterAuth }

/**
 * id.org.ai OAuth 2.1 Provider configuration
 *
 * When no custom socialProviders are configured, authentication is federated
 * through id.org.ai which provides:
 * - Enterprise SSO (SAML, OIDC) via WorkOS
 * - Social login (Google, GitHub, Microsoft, Apple)
 * - Magic link / passwordless auth
 * - Organization-scoped tokens stored in WorkOS Vault
 */
export const ID_ORG_AI_PROVIDER = {
  providerId: 'org.ai',
  discoveryUrl: 'https://id.org.ai/.well-known/openid-configuration',
  scopes: ['openid', 'profile', 'email'],
  pkce: true,
} as const

/**
 * Workers.do-specific auth configuration options
 */
export interface WorkersAuthOptions extends Omit<BetterAuthOptions, 'database'> {
  /** Drizzle database instance (SQLite/D1) */
  database: BaseSQLiteDatabase<'sync' | 'async', unknown>
  /** Secret for signing tokens (required) */
  secret: string
  /** Base URL for OAuth callbacks */
  baseURL?: string

  /**
   * Client ID for id.org.ai OAuth (required if using federated auth)
   * Register your app at https://id.org.ai to get credentials
   * @env ORG_AI_CLIENT_ID
   */
  orgAiClientId?: string

  /**
   * Client secret for id.org.ai OAuth
   * Store in WorkOS Vault or environment variable
   * @env ORG_AI_CLIENT_SECRET
   */
  orgAiClientSecret?: string

  /**
   * Disable federated auth through id.org.ai
   * Set to true if you only want to use your own socialProviders
   * @default false
   */
  disableFederatedAuth?: boolean
}

/**
 * Get environment variable safely (works in Workers, Node, browser)
 */
function getEnv(key: string): string | undefined {
  if ((globalThis as any)[key]) return (globalThis as any)[key]
  if (typeof process !== 'undefined' && process.env?.[key]) return process.env[key]
  return undefined
}

/**
 * Create a Better Auth instance configured for workers.do
 *
 * ## Default Behavior: Federated Auth via id.org.ai
 *
 * If no `socialProviders` are configured, authentication is automatically
 * federated through id.org.ai, which provides:
 * - Enterprise SSO (Okta, Azure AD, Google Workspace) via WorkOS
 * - Social login (Google, GitHub, Microsoft, Apple)
 * - Magic link authentication
 * - Per-organization token storage in WorkOS Vault
 *
 * ## Override: Direct OAuth
 *
 * To use your own OAuth credentials instead:
 * ```ts
 * createAuth({
 *   database: db,
 *   secret: env.AUTH_SECRET,
 *   socialProviders: {
 *     github: {
 *       clientId: env.GITHUB_CLIENT_ID,
 *       clientSecret: env.GITHUB_CLIENT_SECRET,
 *     }
 *   }
 * })
 * ```
 *
 * @example Default (federated through id.org.ai)
 * ```ts
 * import { createAuth } from '@dotdo/auth/better-auth'
 *
 * const auth = createAuth({
 *   database: this.db,
 *   secret: this.env.AUTH_SECRET,
 *   baseURL: this.env.BASE_URL,
 *   // Automatically uses id.org.ai for authentication
 * })
 * ```
 *
 * @example With custom providers (direct OAuth)
 * ```ts
 * const auth = createAuth({
 *   database: this.db,
 *   secret: this.env.AUTH_SECRET,
 *   disableFederatedAuth: true, // Don't use id.org.ai
 *   socialProviders: {
 *     github: {
 *       clientId: env.GITHUB_CLIENT_ID,
 *       clientSecret: env.GITHUB_CLIENT_SECRET,
 *     }
 *   }
 * })
 * ```
 */
export function createAuth(options: WorkersAuthOptions) {
  const {
    database,
    secret,
    baseURL,
    orgAiClientId,
    orgAiClientSecret,
    disableFederatedAuth = false,
    plugins = [],
    socialProviders,
    ...rest
  } = options

  // Determine if we should use federated auth via id.org.ai
  const hasCustomProviders = socialProviders && Object.keys(socialProviders).length > 0
  const useFederatedAuth = !disableFederatedAuth && !hasCustomProviders

  // Build plugins array
  const authPlugins = [...plugins]

  if (useFederatedAuth) {
    // Get id.org.ai credentials from options or environment
    const clientId = orgAiClientId || getEnv('ORG_AI_CLIENT_ID')
    const clientSecret = orgAiClientSecret || getEnv('ORG_AI_CLIENT_SECRET')

    if (!clientId) {
      console.warn(
        '[@dotdo/auth] No ORG_AI_CLIENT_ID configured. ' +
          'Register your app at https://id.org.ai to enable federated auth, ' +
          'or provide your own socialProviders config.'
      )
    } else {
      // Add id.org.ai as a Generic OAuth provider
      authPlugins.push(
        genericOAuth({
          config: [
            {
              ...ID_ORG_AI_PROVIDER,
              clientId,
              clientSecret: clientSecret || '',
              // Custom user mapping from id.org.ai profile
              mapProfileToUser: (profile) => ({
                id: profile.sub,
                email: profile.email,
                name: profile.name,
                image: profile.picture,
                emailVerified: profile.email_verified,
                // Organization context from id.org.ai
                ...(profile.org_id && { organizationId: profile.org_id }),
              }),
            },
          ],
        })
      )
    }
  }

  return betterAuth({
    database: drizzleAdapter(database, {
      provider: 'sqlite',
    }),
    secret,
    baseURL,
    socialProviders: hasCustomProviders ? socialProviders : undefined,
    plugins: authPlugins,
    session: {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // Update session every 24h
      ...rest.session,
    },
    ...rest,
  })
}

/**
 * Cookie names used by workers.do auth
 */
export const COOKIE_NAMES = {
  /** JWT auth cookie - signed, verified, contains user identity */
  AUTH: 'auth',
  /** Settings cookie (sqid) - anonymous ID + user preferences */
  SETTINGS: 'settings',
  /** Session cookie (sqid) - session tracking and analytics */
  SESSION: 'session',
} as const

/**
 * Create auth configured as an OAuth 2.1 Provider
 *
 * Use this when building the id.org.ai service itself, or when you want
 * your own app to act as an OAuth provider for other applications.
 *
 * @example
 * ```ts
 * import { createAuthProvider } from '@dotdo/auth/better-auth'
 *
 * // This instance can issue OAuth tokens to other apps
 * const auth = createAuthProvider({
 *   database: db,
 *   secret: env.AUTH_SECRET,
 *   baseURL: 'https://id.org.ai',
 *   loginPage: '/login',
 *   consentPage: '/consent',
 * })
 * ```
 */
export interface AuthProviderOptions extends WorkersAuthOptions {
  /** Page to redirect unauthenticated users */
  loginPage?: string
  /** Page to show OAuth consent screen */
  consentPage?: string
  /** Custom access token claims */
  customAccessTokenClaims?: (context: { user: any; scopes: string[]; referenceId?: string }) => Record<string, unknown>
  /** Custom ID token claims */
  customIdTokenClaims?: (context: { user: any; scopes: string[] }) => Record<string, unknown>
}

export async function createAuthProvider(options: AuthProviderOptions) {
  const { loginPage = '/login', consentPage = '/consent', customAccessTokenClaims, customIdTokenClaims, plugins = [], ...rest } = options

  // Dynamically import oauth-provider plugin (it's a separate package)
  const { oauthProvider } = await import('better-auth/plugins')
  const { jwt } = await import('better-auth/plugins')

  const authPlugins = [
    // JWT plugin required for oauth-provider
    jwt({ disableSettingJwtHeader: true }),
    // OAuth Provider plugin - makes this instance an OAuth 2.1 server
    oauthProvider({
      loginPage,
      consentPage,
      accessTokenExpiresIn: '1h',
      idTokenExpiresIn: '10h',
      refreshTokenExpiresIn: '30d',
      customAccessTokenClaims,
      customIdTokenClaims,
    }),
    ...plugins,
  ]

  return createAuth({
    ...rest,
    disableFederatedAuth: true, // Provider doesn't federate to itself
    plugins: authPlugins,
  })
}
