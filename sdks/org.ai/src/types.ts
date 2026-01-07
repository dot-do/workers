/**
 * org.ai - Core types for Auth for AI and Humans
 */

/**
 * OAuth configuration options
 */
export interface OrgConfig {
  /**
   * Base URL for API endpoints
   * @default 'https://id.org.ai'
   */
  apiUrl?: string

  /**
   * Client ID for OAuth flow
   */
  clientId?: string

  /**
   * AuthKit domain for device authorization
   * @default 'login.org.ai'
   */
  authKitDomain?: string

  /**
   * Custom fetch implementation
   */
  fetch?: typeof fetch

  /**
   * Custom path for token storage
   * Supports ~ for home directory (e.g., '~/.org.ai/tokens.json')
   * @default '~/.org.ai/token'
   */
  storagePath?: string
}

/**
 * User information returned from auth endpoints
 */
export interface User {
  id: string
  email?: string
  name?: string
  firstName?: string
  lastName?: string
  organizationId?: string
  roles?: string[]
  [key: string]: unknown
}

/**
 * Organization information
 */
export interface Organization {
  id: string
  name: string
  slug?: string
  domains?: string[]
  createdAt?: Date
}

/**
 * Authentication result
 */
export interface AuthResult {
  user: User | null
  token?: string
}

/**
 * Device authorization response
 */
export interface DeviceAuthorizationResponse {
  device_code: string
  user_code: string
  verification_uri: string
  verification_uri_complete: string
  expires_in: number
  interval: number
}

/**
 * Token response
 */
export interface TokenResponse {
  access_token: string
  refresh_token?: string
  token_type: string
  expires_in?: number
  user?: User
}

/**
 * Token polling error types
 */
export type TokenError =
  | 'authorization_pending'
  | 'slow_down'
  | 'access_denied'
  | 'expired_token'
  | 'unknown'

/**
 * Stored token data including refresh token and expiration
 */
export interface StoredTokenData {
  accessToken: string
  refreshToken?: string
  expiresAt?: number // Unix timestamp in milliseconds
}

/**
 * Token storage interface
 */
export interface TokenStorage {
  getToken(): Promise<string | null>
  setToken(token: string): Promise<void>
  removeToken(): Promise<void>
  // Extended methods for full token data
  getTokenData?(): Promise<StoredTokenData | null>
  setTokenData?(data: StoredTokenData): Promise<void>
}

/**
 * SSO options for enterprise authentication
 */
export interface SSOOptions {
  organization: string
  redirectUri?: string
  state?: string
  provider?: string
}

/**
 * SSO profile from identity provider
 */
export interface SSOProfile {
  id: string
  email: string
  firstName?: string
  lastName?: string
  organizationId: string
  idpId?: string
  connectionType?: 'SAML' | 'OIDC' | 'OAuth'
}
