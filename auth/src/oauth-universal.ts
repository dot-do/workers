/**
 * OAuth Flow for Universal API - Phase 7
 *
 * Provides OAuth 2.0 authentication flow for external API providers:
 * - Stripe (payments)
 * - GitHub (code hosting)
 * - OpenWeather (API key-based)
 *
 * Key Features:
 * - OAuth 2.0 authorization code flow
 * - Encrypted token storage (AES-GCM)
 * - Automatic token refresh
 * - Multiple provider support
 */

import { encryptTokenWithSecret, decryptTokenWithSecret } from './encryption'

/**
 * OAuth provider configuration
 */
export interface OAuthProvider {
  provider: string
  name: string
  authUrl: string
  tokenUrl: string
  clientId: string
  clientSecret: string
  scopes: string[]
  authType: 'oauth' | 'api_key'
}

/**
 * OAuth token data (before encryption)
 */
export interface OAuthToken {
  userId: string
  provider: string
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  scopes: string[]
}

/**
 * OAuth provider configurations
 */
const PROVIDERS: Record<string, Omit<OAuthProvider, 'clientId' | 'clientSecret'>> = {
  stripe: {
    provider: 'stripe',
    name: 'Stripe',
    authUrl: 'https://connect.stripe.com/oauth/authorize',
    tokenUrl: 'https://connect.stripe.com/oauth/token',
    scopes: ['read_write'],
    authType: 'oauth',
  },
  github: {
    provider: 'github',
    name: 'GitHub',
    authUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scopes: ['repo', 'user', 'gist'],
    authType: 'oauth',
  },
  openweather: {
    provider: 'openweather',
    name: 'OpenWeather',
    authUrl: '',
    tokenUrl: '',
    scopes: [],
    authType: 'api_key',
  },
}

/**
 * Get OAuth provider configuration with secrets from environment
 *
 * @param provider - Provider name (stripe, github, openweather)
 * @param env - Worker environment with secrets
 * @returns Full provider configuration
 *
 * @example
 * const stripeConfig = getProviderConfig('stripe', env)
 */
export function getProviderConfig(provider: string, env: any): OAuthProvider | null {
  const config = PROVIDERS[provider.toLowerCase()]
  if (!config) return null

  const clientId = env[`${provider.toUpperCase()}_CLIENT_ID`]
  const clientSecret = env[`${provider.toUpperCase()}_CLIENT_SECRET`]

  if (!clientId || !clientSecret) {
    console.error(`Missing OAuth credentials for ${provider}`)
    return null
  }

  return {
    ...config,
    clientId,
    clientSecret,
  }
}

/**
 * Generate OAuth authorization URL for user to visit
 *
 * This is step 1 of OAuth flow: redirect user to provider's authorization page
 *
 * @param provider - Provider name (stripe, github, openweather)
 * @param redirectUri - Callback URL after authorization
 * @param state - Random state parameter for CSRF protection
 * @param env - Worker environment
 * @returns Authorization URL to redirect user to
 *
 * @example
 * const url = getOAuthUrl('stripe', 'https://api.do/oauth/callback', randomState, env)
 * // Returns: "https://connect.stripe.com/oauth/authorize?client_id=...&redirect_uri=...&scope=read_write&state=..."
 */
export function getOAuthUrl(provider: string, redirectUri: string, state: string, env: any): string | null {
  const config = getProviderConfig(provider, env)
  if (!config) return null

  if (config.authType === 'api_key') {
    // OpenWeather uses API key, not OAuth
    return null
  }

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: config.scopes.join(' '),
    state: state,
    response_type: 'code',
  })

  return `${config.authUrl}?${params.toString()}`
}

/**
 * Exchange authorization code for access token
 *
 * This is step 2 of OAuth flow: exchange code from callback for tokens
 *
 * @param provider - Provider name
 * @param code - Authorization code from callback
 * @param redirectUri - Must match redirect URI from step 1
 * @param env - Worker environment
 * @returns Token response from provider
 *
 * @example
 * const tokens = await exchangeOAuthCode('stripe', 'auth_code_xyz', 'https://api.do/oauth/callback', env)
 * // Returns: { access_token: 'sk_...', refresh_token: 'rt_...', expires_in: 3600, scope: 'read_write' }
 */
export async function exchangeOAuthCode(
  provider: string,
  code: string,
  redirectUri: string,
  env: any
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number; scope?: string } | null> {
  const config = getProviderConfig(provider, env)
  if (!config) return null

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })

  try {
    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      console.error(`OAuth token exchange failed: ${response.status} ${response.statusText}`)
      const errorText = await response.text()
      console.error('Error response:', errorText)
      return null
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('OAuth token exchange error:', error)
    return null
  }
}

/**
 * Store OAuth token in database (encrypted)
 *
 * This is step 3 of OAuth flow: save tokens for future use
 *
 * @param token - Token data to store
 * @param env - Worker environment
 * @returns Success status
 *
 * @example
 * await storeOAuthToken({
 *   userId: 'user_123',
 *   provider: 'stripe',
 *   accessToken: 'sk_test_...',
 *   refreshToken: 'rt_...',
 *   expiresAt: new Date(Date.now() + 3600 * 1000),
 *   scopes: ['read_write']
 * }, env)
 */
export async function storeOAuthToken(token: OAuthToken, env: any): Promise<boolean> {
  try {
    const encryptionSecret = env.ENCRYPTION_SECRET
    if (!encryptionSecret) {
      throw new Error('ENCRYPTION_SECRET not configured')
    }

    // Encrypt access token and refresh token
    const encryptedAccessToken = await encryptTokenWithSecret(token.accessToken, encryptionSecret)
    const encryptedRefreshToken = token.refreshToken ? await encryptTokenWithSecret(token.refreshToken, encryptionSecret) : undefined

    // Store in database via DB service
    const result = await env.DB.saveOAuthToken({
      userId: token.userId,
      provider: token.provider,
      encryptedAccessToken,
      encryptedRefreshToken,
      expiresAt: token.expiresAt,
      scopes: token.scopes,
    })

    return result.success
  } catch (error) {
    console.error('Failed to store OAuth token:', error)
    return false
  }
}

/**
 * Get OAuth token for user and provider (decrypted)
 *
 * Retrieves encrypted token from database and decrypts it
 *
 * @param userId - User ID
 * @param provider - Provider name
 * @param env - Worker environment
 * @returns Decrypted token data or null if not found
 *
 * @example
 * const token = await getOAuthToken('user_123', 'stripe', env)
 * if (token) {
 *   console.log('Access token:', token.accessToken)
 *   console.log('Expires:', token.expiresAt)
 * }
 */
export async function getOAuthToken(userId: string, provider: string, env: any): Promise<OAuthToken | null> {
  try {
    const encryptionSecret = env.ENCRYPTION_SECRET
    if (!encryptionSecret) {
      throw new Error('ENCRYPTION_SECRET not configured')
    }

    // Get encrypted token from database
    const storedToken = await env.DB.getOAuthToken(userId, provider)
    if (!storedToken) return null

    // Decrypt tokens
    const accessToken = await decryptTokenWithSecret(storedToken.encrypted_access_token, encryptionSecret)
    const refreshToken = storedToken.encrypted_refresh_token
      ? await decryptTokenWithSecret(storedToken.encrypted_refresh_token, encryptionSecret)
      : undefined

    return {
      userId,
      provider,
      accessToken,
      refreshToken,
      expiresAt: storedToken.expires_at ? new Date(storedToken.expires_at) : undefined,
      scopes: JSON.parse(storedToken.scopes || '[]'),
    }
  } catch (error) {
    console.error('Failed to get OAuth token:', error)
    return null
  }
}

/**
 * Refresh expired OAuth token
 *
 * Uses refresh token to obtain new access token
 *
 * @param userId - User ID
 * @param provider - Provider name
 * @param env - Worker environment
 * @returns Success status
 *
 * @example
 * const refreshed = await refreshOAuthToken('user_123', 'stripe', env)
 * if (refreshed) {
 *   console.log('Token refreshed successfully')
 * }
 */
export async function refreshOAuthToken(userId: string, provider: string, env: any): Promise<boolean> {
  try {
    // Get current token (to get refresh token)
    const currentToken = await getOAuthToken(userId, provider, env)
    if (!currentToken || !currentToken.refreshToken) {
      console.error('No refresh token available')
      return false
    }

    // Get provider config
    const config = getProviderConfig(provider, env)
    if (!config) return false

    // Exchange refresh token for new access token
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: currentToken.refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    })

    const response = await fetch(config.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
    })

    if (!response.ok) {
      console.error(`Token refresh failed: ${response.status} ${response.statusText}`)
      return false
    }

    const data = await response.json()

    // Store new token
    const newToken: OAuthToken = {
      userId,
      provider,
      accessToken: data.access_token,
      refreshToken: data.refresh_token || currentToken.refreshToken, // Some providers don't return new refresh token
      expiresAt: data.expires_in ? new Date(Date.now() + data.expires_in * 1000) : undefined,
      scopes: currentToken.scopes,
    }

    return await storeOAuthToken(newToken, env)
  } catch (error) {
    console.error('Failed to refresh OAuth token:', error)
    return false
  }
}

/**
 * Check if OAuth token is expired or about to expire
 *
 * @param token - OAuth token data
 * @param bufferSeconds - Consider token expired if it expires within this many seconds (default: 300 = 5 minutes)
 * @returns True if token is expired or about to expire
 *
 * @example
 * if (isTokenExpired(token)) {
 *   await refreshOAuthToken(userId, provider, env)
 * }
 */
export function isTokenExpired(token: OAuthToken, bufferSeconds: number = 300): boolean {
  if (!token.expiresAt) return false
  const bufferMs = bufferSeconds * 1000
  return token.expiresAt.getTime() - bufferMs < Date.now()
}
