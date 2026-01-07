import { getConfig } from './config.js'
import { createSecureStorage } from './storage.js'
import type { User, AuthResult, TokenResponse, StoredTokenData } from './types.js'

/**
 * Resolve a secret that could be a plain string or a secrets store binding
 */
async function resolveSecret(value: unknown): Promise<string | null> {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object' && typeof (value as any).get === 'function') {
    return await (value as any).get()
  }
  return null
}

/**
 * Safe environment variable access (works in Node, browser, and Workers)
 */
function getEnv(key: string): string | undefined {
  if ((globalThis as any)[key]) return (globalThis as any)[key]
  if (typeof process !== 'undefined' && process.env?.[key]) return process.env[key]
  return undefined
}

// Buffer time before expiration to trigger refresh (5 minutes)
const REFRESH_BUFFER_MS = 5 * 60 * 1000

/**
 * Check if token is expired or about to expire
 */
function isTokenExpired(expiresAt?: number): boolean {
  if (!expiresAt) return false
  return Date.now() >= expiresAt - REFRESH_BUFFER_MS
}

/**
 * Get current authenticated user
 */
export async function getUser(token?: string): Promise<AuthResult> {
  const config = getConfig()
  const authToken = token || getEnv('ORG_AI_TOKEN') || getEnv('DO_TOKEN') || ''

  if (!authToken) {
    return { user: null }
  }

  try {
    const response = await config.fetch(`${config.apiUrl}/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      if (response.status === 401) {
        return { user: null }
      }
      throw new Error(`Authentication failed: ${response.statusText}`)
    }

    const user = (await response.json()) as User
    return { user, token: authToken }
  } catch (error) {
    console.error('Auth error:', error)
    return { user: null }
  }
}

/**
 * Get token from environment or stored credentials
 */
export async function getToken(): Promise<string | null> {
  // Check env vars first
  const adminToken = getEnv('ORG_AI_ADMIN_TOKEN') || getEnv('DO_ADMIN_TOKEN')
  if (adminToken) return adminToken
  const orgToken = getEnv('ORG_AI_TOKEN') || getEnv('DO_TOKEN')
  if (orgToken) return orgToken

  // Try cloudflare:workers env import (Workers 2025+)
  try {
    // @ts-ignore - cloudflare:workers only available in Workers runtime
    const { env } = await import('cloudflare:workers')

    const cfAdminToken = await resolveSecret((env as any).ORG_AI_ADMIN_TOKEN || (env as any).DO_ADMIN_TOKEN)
    if (cfAdminToken) return cfAdminToken

    const cfToken = await resolveSecret((env as any).ORG_AI_TOKEN || (env as any).DO_TOKEN)
    if (cfToken) return cfToken
  } catch {
    // Not in Workers environment
  }

  // Try stored token (Node.js only)
  try {
    const config = getConfig()
    const storage = createSecureStorage(config.storagePath)

    const tokenData = storage.getTokenData ? await storage.getTokenData() : null

    if (tokenData) {
      if (!isTokenExpired(tokenData.expiresAt)) {
        return tokenData.accessToken
      }

      if (tokenData.refreshToken) {
        try {
          const newTokens = await refreshAccessToken(tokenData.refreshToken)
          const expiresAt = newTokens.expires_in ? Date.now() + newTokens.expires_in * 1000 : undefined

          const newData: StoredTokenData = {
            accessToken: newTokens.access_token,
            refreshToken: newTokens.refresh_token || tokenData.refreshToken,
            expiresAt,
          }

          if (storage.setTokenData) {
            await storage.setTokenData(newData)
          } else {
            await storage.setToken(newTokens.access_token)
          }

          return newTokens.access_token
        } catch {
          return null
        }
      }

      return null
    }

    return await storage.getToken()
  } catch {
    return null
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(token?: string): Promise<boolean> {
  const result = await getUser(token)
  return result.user !== null
}

/**
 * Auth provider function type for HTTP clients
 */
export type AuthProvider = () => string | null | undefined | Promise<string | null | undefined>

/**
 * Create an auth provider function for HTTP clients
 */
export function auth(): AuthProvider {
  return getToken
}

/**
 * Refresh an access token using a refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const config = getConfig()

  if (!config.clientId) {
    throw new Error('Client ID is required for token refresh')
  }

  const response = await config.fetch(`${config.apiUrl}/user_management/authenticate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
    }).toString(),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Token refresh failed: ${response.status} - ${errorText}`)
  }

  return (await response.json()) as TokenResponse
}

/**
 * Get stored token data
 */
export async function getStoredTokenData(): Promise<StoredTokenData | null> {
  try {
    const config = getConfig()
    const storage = createSecureStorage(config.storagePath)
    if (storage.getTokenData) {
      return await storage.getTokenData()
    }
    const token = await storage.getToken()
    return token ? { accessToken: token } : null
  } catch {
    return null
  }
}

/**
 * Store token data
 */
export async function storeTokenData(data: StoredTokenData): Promise<void> {
  try {
    const config = getConfig()
    const storage = createSecureStorage(config.storagePath)
    if (storage.setTokenData) {
      await storage.setTokenData(data)
    } else {
      await storage.setToken(data.accessToken)
    }
  } catch (error) {
    console.error('Failed to store token data:', error)
    throw error
  }
}

/**
 * Build authorization URL
 */
export function buildAuthUrl(options: {
  redirectUri: string
  scope?: string
  state?: string
  responseType?: string
  clientId?: string
  authDomain?: string
}): string {
  const config = getConfig()
  const clientId = options.clientId || config.clientId
  const authDomain = options.authDomain || config.authKitDomain

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: options.redirectUri,
    response_type: options.responseType || 'code',
    scope: options.scope || 'openid profile email',
  })

  if (options.state) {
    params.set('state', options.state)
  }

  return `https://${authDomain}/authorize?${params.toString()}`
}
