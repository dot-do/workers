/**
 * id.org.ai - OAuth 2.1 Provider Types
 *
 * Types for interacting with id.org.ai as an OAuth 2.1 authorization server.
 * id.org.ai provides authentication via WorkOS AuthKit with:
 * - Social login (Google, GitHub, Microsoft, Apple)
 * - Enterprise SSO (SAML, OIDC)
 * - Magic link and password authentication
 */

/**
 * OAuth 2.1 client registration request
 */
export interface OAuthClientRegistration {
  client_name: string
  redirect_uris: string[]
  scope?: string
  grant_types?: ('authorization_code' | 'refresh_token' | 'client_credentials')[]
  token_endpoint_auth_method?: 'client_secret_basic' | 'client_secret_post' | 'none'
  logo_uri?: string
  policy_uri?: string
  tos_uri?: string
}

/**
 * OAuth 2.1 client registration response
 */
export interface OAuthClientResponse {
  client_id: string
  client_secret?: string
  client_name: string
  redirect_uris: string[]
  grant_types: string[]
  token_endpoint_auth_method: string
  client_id_issued_at?: number
  client_secret_expires_at?: number
}

/**
 * OIDC Discovery document
 */
export interface OIDCDiscovery {
  issuer: string
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
  jwks_uri: string
  registration_endpoint: string
  scopes_supported: string[]
  response_types_supported: string[]
  response_modes_supported: string[]
  grant_types_supported: string[]
  token_endpoint_auth_methods_supported: string[]
  subject_types_supported: string[]
  id_token_signing_alg_values_supported: string[]
  code_challenge_methods_supported: string[]
  introspection_endpoint: string
  revocation_endpoint: string
  end_session_endpoint?: string
}

/**
 * OAuth authorization request parameters
 */
export interface AuthorizationRequest {
  client_id: string
  redirect_uri: string
  response_type: 'code'
  scope?: string
  state?: string
  code_challenge?: string
  code_challenge_method?: 'S256'
  nonce?: string
  prompt?: 'none' | 'login' | 'consent' | 'select_account'
  login_hint?: string
  organization?: string
}

/**
 * OAuth token request (authorization code grant)
 */
export interface TokenRequest {
  grant_type: 'authorization_code' | 'refresh_token' | 'client_credentials'
  client_id: string
  client_secret?: string
  code?: string
  redirect_uri?: string
  code_verifier?: string
  refresh_token?: string
  scope?: string
}

/**
 * OAuth token response
 */
export interface OAuthTokenResponse {
  access_token: string
  token_type: 'Bearer'
  expires_in: number
  refresh_token?: string
  scope?: string
  id_token?: string
}

/**
 * OAuth error response
 */
export interface OAuthError {
  error: 'invalid_request' | 'invalid_client' | 'invalid_grant' | 'unauthorized_client' | 'unsupported_grant_type' | 'invalid_scope' | 'access_denied' | 'server_error'
  error_description?: string
  error_uri?: string
}

/**
 * Token introspection response
 */
export interface TokenIntrospection {
  active: boolean
  client_id?: string
  sub?: string
  scope?: string
  exp?: number
  iat?: number
  iss?: string
  aud?: string
  token_type?: string
  org_id?: string
}

/**
 * UserInfo response (OIDC)
 */
export interface UserInfo {
  sub: string
  name?: string
  given_name?: string
  family_name?: string
  picture?: string
  email?: string
  email_verified?: boolean
  org_id?: string
  roles?: string[]
}

/**
 * PKCE utilities
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(hash))
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = ''
  for (const byte of buffer) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Build authorization URL for id.org.ai
 */
export function buildIdOrgAuthUrl(params: AuthorizationRequest): string {
  const url = new URL('https://id.org.ai/oauth2/authorize')

  url.searchParams.set('client_id', params.client_id)
  url.searchParams.set('redirect_uri', params.redirect_uri)
  url.searchParams.set('response_type', params.response_type)

  if (params.scope) url.searchParams.set('scope', params.scope)
  if (params.state) url.searchParams.set('state', params.state)
  if (params.code_challenge) {
    url.searchParams.set('code_challenge', params.code_challenge)
    url.searchParams.set('code_challenge_method', params.code_challenge_method || 'S256')
  }
  if (params.nonce) url.searchParams.set('nonce', params.nonce)
  if (params.prompt) url.searchParams.set('prompt', params.prompt)
  if (params.login_hint) url.searchParams.set('login_hint', params.login_hint)
  if (params.organization) url.searchParams.set('organization', params.organization)

  return url.toString()
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(params: {
  code: string
  clientId: string
  clientSecret?: string
  redirectUri: string
  codeVerifier?: string
}): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code: params.code,
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
  })

  if (params.clientSecret) {
    body.set('client_secret', params.clientSecret)
  }
  if (params.codeVerifier) {
    body.set('code_verifier', params.codeVerifier)
  }

  const response = await fetch('https://id.org.ai/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    const error = (await response.json()) as OAuthError
    throw new Error(error.error_description || error.error)
  }

  return response.json()
}

/**
 * Refresh access token
 */
export async function refreshIdOrgToken(params: { refreshToken: string; clientId: string; clientSecret?: string }): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: params.refreshToken,
    client_id: params.clientId,
  })

  if (params.clientSecret) {
    body.set('client_secret', params.clientSecret)
  }

  const response = await fetch('https://id.org.ai/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  if (!response.ok) {
    const error = (await response.json()) as OAuthError
    throw new Error(error.error_description || error.error)
  }

  return response.json()
}

/**
 * Get user info from id.org.ai
 */
export async function getIdOrgUserInfo(accessToken: string): Promise<UserInfo> {
  const response = await fetch('https://id.org.ai/oauth2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error('Failed to get user info')
  }

  return response.json()
}

/**
 * Introspect a token
 */
export async function introspectToken(params: { token: string; clientId: string; clientSecret?: string }): Promise<TokenIntrospection> {
  const body = new URLSearchParams({
    token: params.token,
    client_id: params.clientId,
  })

  if (params.clientSecret) {
    body.set('client_secret', params.clientSecret)
  }

  const response = await fetch('https://id.org.ai/oauth2/introspect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  return response.json()
}

/**
 * Revoke a token
 */
export async function revokeToken(params: { token: string; clientId: string; clientSecret?: string }): Promise<void> {
  const body = new URLSearchParams({
    token: params.token,
    client_id: params.clientId,
  })

  if (params.clientSecret) {
    body.set('client_secret', params.clientSecret)
  }

  await fetch('https://id.org.ai/oauth2/revoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
}

/**
 * Register a new OAuth client
 */
export async function registerClient(registration: OAuthClientRegistration): Promise<OAuthClientResponse> {
  const response = await fetch('https://id.org.ai/oauth2/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registration),
  })

  if (!response.ok) {
    const error = (await response.json()) as OAuthError
    throw new Error(error.error_description || error.error)
  }

  return response.json()
}

/**
 * Fetch OIDC discovery document
 */
export async function getDiscovery(): Promise<OIDCDiscovery> {
  const response = await fetch('https://id.org.ai/.well-known/openid-configuration')
  return response.json()
}
