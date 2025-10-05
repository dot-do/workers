/**
 * OAuth Provider Configurations for Universal Cloud Platform Integration
 *
 * Supports OAuth 2.0 flows for:
 * - Vercel (deployment platform)
 * - Netlify (deployment platform)
 * - AWS Cognito (cloud provider)
 * - GCP Google OAuth (cloud provider)
 * - Azure Entra ID (cloud provider)
 *
 * Based on master plan: /notes/2025-10-04-master-oauth-integration-plan.md
 */

import { encryptTokenWithSecret, decryptTokenWithSecret } from './encryption'

// ============================================================================
// Provider Configurations
// ============================================================================

export interface OAuthProvider {
  provider: string
  name: string
  authUrl: string
  tokenUrl: string
  userInfoUrl?: string
  scopes: string[]
  authType: 'oauth'
  tokenType?: 'bearer' | 'mac' // Default: bearer
  pkceRequired?: boolean // PKCE for public clients
}

/**
 * OAuth provider registry
 *
 * Environment variables required:
 * - VERCEL_CLIENT_ID / VERCEL_CLIENT_SECRET
 * - NETLIFY_CLIENT_ID / NETLIFY_CLIENT_SECRET
 * - AWS_COGNITO_CLIENT_ID / AWS_COGNITO_CLIENT_SECRET / AWS_COGNITO_DOMAIN / AWS_REGION
 * - GCP_CLIENT_ID / GCP_CLIENT_SECRET
 * - AZURE_CLIENT_ID / AZURE_CLIENT_SECRET / AZURE_TENANT_ID
 */
export const OAUTH_PROVIDERS: Record<string, Omit<OAuthProvider, 'authUrl' | 'tokenUrl' | 'userInfoUrl'>> = {
  // Vercel - Deployment platform
  vercel: {
    provider: 'vercel',
    name: 'Vercel',
    scopes: [], // Vercel gives full user access by default (no granular scopes)
    authType: 'oauth',
  },

  // Netlify - Deployment platform
  netlify: {
    provider: 'netlify',
    name: 'Netlify',
    scopes: [], // Netlify doesn't support granular scopes (full user access)
    authType: 'oauth',
  },

  // AWS Cognito - Cloud provider auth
  aws: {
    provider: 'aws',
    name: 'AWS Cognito',
    scopes: ['openid', 'email', 'profile', 'aws.cognito.signin.user.admin'],
    authType: 'oauth',
  },

  // GCP Google OAuth - Cloud provider auth
  gcp: {
    provider: 'gcp',
    name: 'Google Cloud Platform',
    scopes: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/cloud-platform', // Full GCP access
    ],
    authType: 'oauth',
  },

  // Azure Entra ID - Cloud provider auth
  azure: {
    provider: 'azure',
    name: 'Microsoft Azure',
    scopes: [
      'openid',
      'profile',
      'email',
      'offline_access', // For refresh tokens
      'https://management.azure.com/user_impersonation', // Azure Resource Manager
    ],
    authType: 'oauth',
  },
}

// ============================================================================
// Provider URL Builders
// ============================================================================

/**
 * Get dynamic OAuth URLs for providers that need runtime configuration
 *
 * @param provider - Provider name
 * @param env - Worker environment with secrets
 * @returns Provider URLs or null if provider not supported
 */
function getProviderUrls(
  provider: string,
  env: any
): { authUrl: string; tokenUrl: string; userInfoUrl?: string } | null {
  switch (provider.toLowerCase()) {
    case 'vercel':
      return {
        authUrl: 'https://api.vercel.com/v2/oauth/authorize',
        tokenUrl: 'https://api.vercel.com/v2/oauth/access_token',
        userInfoUrl: 'https://api.vercel.com/v2/user',
      }

    case 'netlify':
      return {
        authUrl: 'https://app.netlify.com/authorize',
        tokenUrl: 'https://api.netlify.com/oauth/token',
        userInfoUrl: 'https://api.netlify.com/api/v1/user',
      }

    case 'aws':
      // AWS Cognito requires domain and region
      const cognitoDomain = env.AWS_COGNITO_DOMAIN
      const cognitoRegion = env.AWS_REGION || 'us-east-1'

      if (!cognitoDomain) {
        console.error('AWS_COGNITO_DOMAIN not configured')
        return null
      }

      return {
        authUrl: `https://${cognitoDomain}.auth.${cognitoRegion}.amazoncognito.com/oauth2/authorize`,
        tokenUrl: `https://${cognitoDomain}.auth.${cognitoRegion}.amazoncognito.com/oauth2/token`,
        userInfoUrl: `https://${cognitoDomain}.auth.${cognitoRegion}.amazoncognito.com/oauth2/userInfo`,
      }

    case 'gcp':
      return {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
      }

    case 'azure':
      // Azure requires tenant ID
      const tenantId = env.AZURE_TENANT_ID || 'common' // 'common' for multi-tenant

      return {
        authUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
        tokenUrl: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        userInfoUrl: 'https://graph.microsoft.com/oidc/userinfo',
      }

    default:
      return null
  }
}

/**
 * Get full OAuth provider configuration with secrets from environment
 *
 * @param provider - Provider name (vercel, netlify, aws, gcp, azure)
 * @param env - Worker environment with secrets
 * @returns Full provider configuration with URLs and credentials
 *
 * @example
 * const config = getProviderConfig('vercel', env)
 * if (config) {
 *   console.log(config.authUrl) // https://api.vercel.com/v2/oauth/authorize
 *   console.log(config.clientId) // from env.VERCEL_CLIENT_ID
 * }
 */
export function getProviderConfig(provider: string, env: any): (OAuthProvider & { clientId: string; clientSecret: string }) | null {
  const baseConfig = OAUTH_PROVIDERS[provider.toLowerCase()]
  if (!baseConfig) {
    console.error(`Unknown OAuth provider: ${provider}`)
    return null
  }

  const urls = getProviderUrls(provider, env)
  if (!urls) {
    console.error(`Failed to get URLs for provider: ${provider}`)
    return null
  }

  // Get credentials from environment
  const clientId = env[`${provider.toUpperCase()}_CLIENT_ID`]
  const clientSecret = env[`${provider.toUpperCase()}_CLIENT_SECRET`]

  if (!clientId || !clientSecret) {
    console.error(`Missing OAuth credentials for ${provider}: ${provider.toUpperCase()}_CLIENT_ID and/or ${provider.toUpperCase()}_CLIENT_SECRET`)
    return null
  }

  return {
    ...baseConfig,
    ...urls,
    clientId,
    clientSecret,
  }
}

// ============================================================================
// OAuth Flow Implementation
// ============================================================================

export interface OAuthToken {
  userId: string
  provider: string
  accessToken: string
  refreshToken?: string
  expiresAt?: Date
  scopes: string[]
  tokenType: string // 'bearer' or 'mac'
}

/**
 * Generate OAuth authorization URL for user to visit
 *
 * This is step 1 of OAuth flow: redirect user to provider's authorization page
 *
 * @param provider - Provider name (vercel, netlify, aws, gcp, azure)
 * @param redirectUri - Callback URL after authorization
 * @param state - Random state parameter for CSRF protection
 * @param env - Worker environment
 * @returns Authorization URL to redirect user to
 *
 * @example
 * const url = await getOAuthAuthUrl('vercel', 'https://auth.do/oauth/callback', randomState, env)
 * // Returns: "https://api.vercel.com/v2/oauth/authorize?client_id=...&redirect_uri=...&state=..."
 */
export async function getOAuthAuthUrl(provider: string, redirectUri: string, state: string, env: any): Promise<string | null> {
  const config = getProviderConfig(provider, env)
  if (!config) return null

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: redirectUri,
    state: state,
    response_type: 'code',
  })

  // Add scopes if provider supports them
  if (config.scopes.length > 0) {
    params.set('scope', config.scopes.join(' '))
  }

  // Provider-specific parameters
  if (provider === 'azure') {
    params.set('response_mode', 'query')
  }

  if (provider === 'gcp') {
    params.set('access_type', 'offline') // Request refresh token
    params.set('prompt', 'consent') // Force consent screen to get refresh token
  }

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
 * const tokens = await exchangeOAuthCode('vercel', 'auth_code_xyz', 'https://auth.do/oauth/callback', env)
 * // Returns: { access_token: 'xxx', refresh_token: 'yyy', expires_in: 3600, token_type: 'bearer' }
 */
export async function exchangeOAuthCode(
  provider: string,
  code: string,
  redirectUri: string,
  env: any
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number; token_type?: string; scope?: string } | null> {
  const config = getProviderConfig(provider, env)
  if (!config) return null

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  })

  // Provider-specific parameters
  if (provider === 'gcp') {
    body.set('access_type', 'offline')
  }

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
      const errorText = await response.text()
      console.error(`OAuth token exchange failed for ${provider}: ${response.status} ${response.statusText}`)
      console.error('Error response:', errorText)
      return null
    }

    const data = await response.json()

    // Normalize response
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type || 'bearer',
      scope: data.scope,
    }
  } catch (error) {
    console.error(`OAuth token exchange error for ${provider}:`, error)
    return null
  }
}

/**
 * Refresh expired OAuth token
 *
 * Uses refresh token to obtain new access token
 *
 * @param provider - Provider name
 * @param refreshToken - Refresh token from previous exchange
 * @param env - Worker environment
 * @returns New token response or null on failure
 *
 * @example
 * const newTokens = await refreshOAuthToken('vercel', 'refresh_token_xyz', env)
 * if (newTokens) {
 *   console.log('New access token:', newTokens.access_token)
 * }
 */
export async function refreshOAuthToken(
  provider: string,
  refreshToken: string,
  env: any
): Promise<{ access_token: string; refresh_token?: string; expires_in?: number; token_type?: string } | null> {
  const config = getProviderConfig(provider, env)
  if (!config) return null

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
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
      const errorText = await response.text()
      console.error(`OAuth token refresh failed for ${provider}: ${response.status} ${response.statusText}`)
      console.error('Error response:', errorText)
      return null
    }

    const data = await response.json()

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token, // Some providers return new refresh token
      expires_in: data.expires_in,
      token_type: data.token_type || 'bearer',
    }
  } catch (error) {
    console.error(`OAuth token refresh error for ${provider}:`, error)
    return null
  }
}

/**
 * Validate OAuth token by calling provider's userinfo endpoint
 *
 * @param provider - Provider name
 * @param accessToken - Access token to validate
 * @param env - Worker environment
 * @returns User info or null if invalid
 *
 * @example
 * const userInfo = await validateOAuthToken('vercel', 'access_token_xyz', env)
 * if (userInfo) {
 *   console.log('Token is valid for user:', userInfo.email)
 * }
 */
export async function validateOAuthToken(
  provider: string,
  accessToken: string,
  env: any
): Promise<{ id: string; email?: string; name?: string; [key: string]: any } | null> {
  const config = getProviderConfig(provider, env)
  if (!config || !config.userInfoUrl) {
    console.error(`Provider ${provider} does not support token validation`)
    return null
  }

  try {
    const response = await fetch(config.userInfoUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`OAuth token validation failed for ${provider}: ${response.status} ${response.statusText}`)
      return null
    }

    const data = await response.json()

    // Normalize response across providers
    switch (provider) {
      case 'vercel':
        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          username: data.user.username,
        }

      case 'netlify':
        return {
          id: data.id,
          email: data.email,
          name: data.full_name,
        }

      case 'aws':
        return {
          id: data.sub,
          email: data.email,
          name: data.name,
        }

      case 'gcp':
        return {
          id: data.sub,
          email: data.email,
          name: data.name,
          picture: data.picture,
        }

      case 'azure':
        return {
          id: data.sub,
          email: data.email,
          name: data.name,
        }

      default:
        return data
    }
  } catch (error) {
    console.error(`OAuth token validation error for ${provider}:`, error)
    return null
  }
}

// ============================================================================
// Token Storage (Database Integration)
// ============================================================================

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
 *   provider: 'vercel',
 *   accessToken: 'xxx',
 *   refreshToken: 'yyy',
 *   expiresAt: new Date(Date.now() + 3600 * 1000),
 *   scopes: [],
 *   tokenType: 'bearer'
 * }, env)
 */
export async function storeOAuthToken(token: OAuthToken, env: any): Promise<boolean> {
  try {
    const encryptionSecret = env.ENCRYPTION_SECRET
    if (!encryptionSecret) {
      throw new Error('ENCRYPTION_SECRET not configured')
    }

    // Encrypt tokens
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
      tokenType: token.tokenType,
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
 * const token = await getOAuthToken('user_123', 'vercel', env)
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
    const refreshToken = storedToken.encrypted_refresh_token ? await decryptTokenWithSecret(storedToken.encrypted_refresh_token, encryptionSecret) : undefined

    return {
      userId,
      provider,
      accessToken,
      refreshToken,
      expiresAt: storedToken.expires_at ? new Date(storedToken.expires_at) : undefined,
      scopes: JSON.parse(storedToken.scopes || '[]'),
      tokenType: storedToken.token_type || 'bearer',
    }
  } catch (error) {
    console.error('Failed to get OAuth token:', error)
    return null
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
 *   await refreshOAuthToken('vercel', token.refreshToken, env)
 * }
 */
export function isTokenExpired(token: OAuthToken, bufferSeconds: number = 300): boolean {
  if (!token.expiresAt) return false
  const bufferMs = bufferSeconds * 1000
  return token.expiresAt.getTime() - bufferMs < Date.now()
}

/**
 * Get OAuth token with automatic refresh if expired
 *
 * Convenience method that handles token refresh automatically
 *
 * @param userId - User ID
 * @param provider - Provider name
 * @param env - Worker environment
 * @returns Valid token or null
 *
 * @example
 * const token = await getValidOAuthToken('user_123', 'vercel', env)
 * if (token) {
 *   // Token is guaranteed to be valid
 *   await fetch('https://api.vercel.com/v2/user', {
 *     headers: { Authorization: `Bearer ${token.accessToken}` }
 *   })
 * }
 */
export async function getValidOAuthToken(userId: string, provider: string, env: any): Promise<OAuthToken | null> {
  let token = await getOAuthToken(userId, provider, env)
  if (!token) return null

  // Check if token is expired
  if (isTokenExpired(token) && token.refreshToken) {
    console.log(`Token expired for ${provider}, refreshing...`)

    // Refresh token
    const newTokens = await refreshOAuthToken(provider, token.refreshToken, env)
    if (!newTokens) {
      console.error(`Failed to refresh token for ${provider}`)
      return null
    }

    // Store new token
    token = {
      userId,
      provider,
      accessToken: newTokens.access_token,
      refreshToken: newTokens.refresh_token || token.refreshToken,
      expiresAt: newTokens.expires_in ? new Date(Date.now() + newTokens.expires_in * 1000) : undefined,
      scopes: token.scopes,
      tokenType: newTokens.token_type || 'bearer',
    }

    await storeOAuthToken(token, env)
  }

  return token
}
