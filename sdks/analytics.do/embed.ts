/**
 * analytics.do/embed - SSO Embedding for Analytics Dashboards
 *
 * Secure iframe embedding with signed tokens and row-level security.
 *
 * @example
 * ```typescript
 * import { createEmbedUrl } from 'analytics.do/embed'
 *
 * // Generate signed embed URL for a customer dashboard
 * const embedUrl = await createEmbedUrl({
 *   dashboard: 'customer_analytics',
 *   user: {
 *     external_user_id: customer.id,
 *     first_name: customer.name,
 *     permissions: ['access_data', 'see_dashboards'],
 *     models: ['customer_facing'],
 *     user_attributes: {
 *       customer_id: customer.id,  // Row-level security
 *     },
 *   },
 *   session_length: 3600,
 * })
 *
 * // Embed in your app
 * return <iframe src={embedUrl} width="100%" height="800" />
 * ```
 */

/**
 * User information for embedded analytics session
 */
export interface EmbedUser {
  /** Unique identifier for the user in your system */
  external_user_id: string
  /** User's first name (optional, for personalization) */
  first_name?: string
  /** User's last name (optional, for personalization) */
  last_name?: string
  /** User's email (optional, for audit logs) */
  email?: string
  /** Permissions granted to this user */
  permissions: EmbedPermission[]
  /** Data models the user can access */
  models?: string[]
  /** User attributes for row-level security filters */
  user_attributes?: Record<string, string | number | boolean>
  /** Additional custom metadata */
  metadata?: Record<string, unknown>
}

/**
 * Permissions that can be granted to embedded users
 */
export type EmbedPermission =
  | 'access_data'          // View analytics data
  | 'see_dashboards'       // View dashboards
  | 'see_reports'          // View reports
  | 'explore_data'         // Use explore interface
  | 'download_data'        // Export/download data
  | 'schedule_reports'     // Schedule automated reports
  | 'save_content'         // Save personal content
  | 'create_alerts'        // Create data alerts

/**
 * Options for creating an embedded analytics URL
 */
export interface EmbedUrlOptions {
  /** Dashboard ID or slug to embed */
  dashboard?: string
  /** Report ID to embed */
  report?: string
  /** Explore to embed */
  explore?: string
  /** Custom URL path to embed */
  url?: string
  /** User information for session */
  user: EmbedUser
  /** Session length in seconds (default: 3600) */
  session_length?: number
  /** Force logout on session expiry (default: true) */
  force_logout_on_expiry?: boolean
  /** Initial filters to apply */
  filters?: Record<string, unknown>
  /** Theme to apply */
  theme?: 'light' | 'dark' | 'auto'
  /** Target origin for postMessage security */
  target_origin?: string
  /** Additional query parameters */
  params?: Record<string, string>
}

/**
 * JWT payload for embed tokens
 */
export interface EmbedTokenPayload {
  /** External user ID */
  external_user_id: string
  /** User's first name */
  first_name?: string
  /** User's last name */
  last_name?: string
  /** User's email */
  email?: string
  /** Permissions */
  permissions: EmbedPermission[]
  /** Data models */
  models?: string[]
  /** User attributes for RLS */
  user_attributes?: Record<string, string | number | boolean>
  /** Custom metadata */
  metadata?: Record<string, unknown>
  /** Session length in seconds */
  session_length: number
  /** Force logout on expiry */
  force_logout_on_expiry: boolean
  /** Filters to apply */
  filters?: Record<string, unknown>
  /** Theme */
  theme?: string
  /** Issued at timestamp */
  iat: number
  /** Expiration timestamp */
  exp: number
  /** Nonce for replay protection */
  nonce: string
}

/**
 * Configuration for embed URL generation
 */
export interface EmbedConfig {
  /** Base URL for analytics.do instance */
  baseUrl?: string
  /** Secret key for signing tokens (from env or config) */
  secret?: string
  /** Default session length */
  defaultSessionLength?: number
}

// Module-level config
let embedConfig: EmbedConfig = {
  baseUrl: 'https://analytics.do',
  defaultSessionLength: 3600,
}

/**
 * Configure embed URL generation
 *
 * @example
 * ```typescript
 * configureEmbed({
 *   baseUrl: 'https://custom.analytics.do',
 *   secret: process.env.ANALYTICS_EMBED_SECRET,
 *   defaultSessionLength: 7200,
 * })
 * ```
 */
export function configureEmbed(config: EmbedConfig): void {
  embedConfig = { ...embedConfig, ...config }
}

/**
 * Get the current embed configuration
 */
export function getEmbedConfig(): EmbedConfig {
  return { ...embedConfig }
}

/**
 * Generate a cryptographically secure random nonce
 */
async function generateNonce(): Promise<string> {
  // Use Web Crypto API for secure random generation
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Create HMAC-SHA256 signature
 */
async function createSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(payload)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, messageData)

  // Convert to base64url
  const base64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Generate a signed JWT token for embed authentication
 *
 * @example
 * ```typescript
 * const token = await generateEmbedToken({
 *   external_user_id: 'user_123',
 *   permissions: ['access_data', 'see_dashboards'],
 * }, 'your-secret-key', 3600)
 * ```
 */
export async function generateEmbedToken(
  user: EmbedUser,
  secret: string,
  sessionLength: number = 3600,
  options?: Pick<EmbedUrlOptions, 'force_logout_on_expiry' | 'filters' | 'theme'>
): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const nonce = await generateNonce()

  const payload: EmbedTokenPayload = {
    external_user_id: user.external_user_id,
    first_name: user.first_name,
    last_name: user.last_name,
    email: user.email,
    permissions: user.permissions,
    models: user.models,
    user_attributes: user.user_attributes,
    metadata: user.metadata,
    session_length: sessionLength,
    force_logout_on_expiry: options?.force_logout_on_expiry ?? true,
    filters: options?.filters,
    theme: options?.theme,
    iat: now,
    exp: now + sessionLength,
    nonce,
  }

  // Create JWT manually (header.payload.signature)
  const header = { alg: 'HS256', typ: 'JWT' }

  const encodeBase64Url = (obj: unknown) => {
    const json = JSON.stringify(obj)
    const base64 = btoa(json)
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
  }

  const headerEncoded = encodeBase64Url(header)
  const payloadEncoded = encodeBase64Url(payload)
  const unsignedToken = `${headerEncoded}.${payloadEncoded}`

  const signature = await createSignature(unsignedToken, secret)

  return `${unsignedToken}.${signature}`
}

/**
 * Create a signed embed URL for analytics dashboards, reports, or explores
 *
 * @example
 * ```typescript
 * // Embed a dashboard
 * const url = await createEmbedUrl({
 *   dashboard: 'customer_analytics',
 *   user: {
 *     external_user_id: customer.id,
 *     permissions: ['access_data', 'see_dashboards'],
 *     user_attributes: { customer_id: customer.id },
 *   },
 *   theme: 'light',
 * })
 *
 * // Embed a report
 * const reportUrl = await createEmbedUrl({
 *   report: 'monthly_revenue',
 *   user: { ... },
 *   filters: { period: 'this_month' },
 * })
 *
 * // Embed an explore
 * const exploreUrl = await createEmbedUrl({
 *   explore: 'orders',
 *   user: { ... },
 * })
 * ```
 */
export async function createEmbedUrl(options: EmbedUrlOptions): Promise<string> {
  const config = getEmbedConfig()

  // Validate that we have a secret
  const secret = options.user.metadata?.secret as string | undefined || config.secret
  if (!secret) {
    throw new Error(
      'Embed secret not configured. Set via configureEmbed({ secret }) or ANALYTICS_EMBED_SECRET env var'
    )
  }

  // Determine session length
  const sessionLength = options.session_length ?? config.defaultSessionLength ?? 3600

  // Generate signed token
  const token = await generateEmbedToken(
    options.user,
    secret,
    sessionLength,
    {
      force_logout_on_expiry: options.force_logout_on_expiry,
      filters: options.filters,
      theme: options.theme,
    }
  )

  // Build embed URL
  const baseUrl = config.baseUrl || 'https://analytics.do'
  const url = new URL('/embed', baseUrl)

  // Add content path
  if (options.dashboard) {
    url.searchParams.set('dashboard', options.dashboard)
  } else if (options.report) {
    url.searchParams.set('report', options.report)
  } else if (options.explore) {
    url.searchParams.set('explore', options.explore)
  } else if (options.url) {
    url.searchParams.set('url', options.url)
  } else {
    throw new Error('Must specify one of: dashboard, report, explore, or url')
  }

  // Add token
  url.searchParams.set('token', token)

  // Add optional parameters
  if (options.target_origin) {
    url.searchParams.set('target_origin', options.target_origin)
  }

  // Add custom params
  if (options.params) {
    for (const [key, value] of Object.entries(options.params)) {
      url.searchParams.set(key, value)
    }
  }

  return url.toString()
}

/**
 * Verify an embed token is valid
 *
 * @example
 * ```typescript
 * try {
 *   const payload = await verifyEmbedToken(token, secret)
 *   console.log('User:', payload.external_user_id)
 * } catch (err) {
 *   console.error('Invalid token:', err)
 * }
 * ```
 */
export async function verifyEmbedToken(
  token: string,
  secret: string
): Promise<EmbedTokenPayload> {
  const parts = token.split('.')
  if (parts.length !== 3) {
    throw new Error('Invalid token format')
  }

  const [headerEncoded, payloadEncoded, signature] = parts

  // Verify signature
  const unsignedToken = `${headerEncoded}.${payloadEncoded}`
  const expectedSignature = await createSignature(unsignedToken, secret)

  if (signature !== expectedSignature) {
    throw new Error('Invalid token signature')
  }

  // Decode payload
  const decodeBase64Url = (str: string): unknown => {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/')
    const json = atob(base64)
    return JSON.parse(json)
  }

  const payload = decodeBase64Url(payloadEncoded) as EmbedTokenPayload

  // Verify expiration
  const now = Math.floor(Date.now() / 1000)
  if (payload.exp < now) {
    throw new Error('Token has expired')
  }

  return payload
}
