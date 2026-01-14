/**
 * Security Middleware for workers.do
 *
 * Provides:
 * - CORS validation with origin whitelisting
 * - Rate limiting (in-memory with DO storage support)
 * - Authorization header parsing and validation
 * - Input validation for deploy requests
 * - Security headers for all responses
 */

import type { Context, Next } from 'hono'

// ============================================================================
// Types
// ============================================================================

export interface RateLimitResult {
  remaining: number
  limit: number
  resetAt: number
  allowed: boolean
}

export interface AuthResult {
  token: string
  userId: string
}

export interface AuthError {
  error: Response
}

export interface ValidationError {
  success: false
  error: string
}

// ============================================================================
// Constants
// ============================================================================

/** Allowed CORS origins (workers.do subdomains) */
export const ALLOWED_ORIGIN_PATTERN = /^https:\/\/([a-z0-9-]+\.)*workers\.do$/

/** Rate limit: requests per window */
export const RATE_LIMIT = 30

/** Rate limit window in seconds */
export const RATE_LIMIT_WINDOW = 60

/** Maximum worker name length */
export const MAX_NAME_LENGTH = 63

/** Maximum code size in bytes (1MB) */
export const MAX_CODE_SIZE = 1024 * 1024

/** Valid language options for deploy */
export const VALID_LANGUAGES = ['ts', 'js', 'mdx'] as const

// ============================================================================
// Security Headers
// ============================================================================

/**
 * Standard security headers to add to all responses
 */
export const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
}

/**
 * HSTS header for HTTPS connections
 * max-age=31536000 = 1 year
 */
export const HSTS_HEADER = 'max-age=31536000; includeSubDomains'

/**
 * Add security headers to a response
 */
export function addSecurityHeaders(response: Response, isHttps = true): Response {
  const newResponse = new Response(response.body, response)

  // Add standard security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    newResponse.headers.set(key, value)
  }

  // Add HSTS for HTTPS connections
  if (isHttps) {
    newResponse.headers.set('Strict-Transport-Security', HSTS_HEADER)
  }

  return newResponse
}

// ============================================================================
// CORS Validation
// ============================================================================

/**
 * Check if an origin is allowed for CORS
 *
 * @param origin - The Origin header value
 * @returns true if the origin is allowed
 */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return false
  return ALLOWED_ORIGIN_PATTERN.test(origin)
}

/**
 * CORS middleware with origin validation
 *
 * Only allows requests from workers.do subdomains.
 * Rejects requests from other origins by not setting CORS headers.
 */
export async function corsMiddleware(c: Context, next: Next): Promise<Response | void> {
  const origin = c.req.header('Origin')
  const isHttps = c.req.url.startsWith('https://')

  // Handle OPTIONS preflight
  if (c.req.method === 'OPTIONS') {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
      ...SECURITY_HEADERS,
    }

    // Only set CORS headers for allowed origins
    if (origin && isAllowedOrigin(origin)) {
      headers['Access-Control-Allow-Origin'] = origin
      headers['Access-Control-Allow-Credentials'] = 'true'
    }

    if (isHttps) {
      headers['Strict-Transport-Security'] = HSTS_HEADER
    }

    return new Response(null, { status: 204, headers })
  }

  await next()

  // Note: Security headers and CORS headers are added by addSecurityHeaders
  // in the main export handler. We skip modifying c.res here because
  // response headers may be immutable (e.g., from DO fetch).
  // However, we can try to add CORS headers if headers are mutable.
  try {
    if (origin && isAllowedOrigin(origin)) {
      c.res.headers.set('Access-Control-Allow-Origin', origin)
      c.res.headers.set('Access-Control-Allow-Credentials', 'true')
    }
  } catch {
    // Headers are immutable - they will be added by addSecurityHeaders in the export handler
  }
}

// ============================================================================
// Rate Limiting
// ============================================================================

/**
 * In-memory rate limit store
 *
 * NOTE: This is per-worker-instance. For distributed rate limiting,
 * use Durable Objects with the RateLimiter class below.
 */
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

/**
 * Check and update rate limit for a user
 *
 * @param userId - User identifier (derived from auth token)
 * @returns Rate limit result with remaining requests
 */
export function checkRateLimit(userId: string): RateLimitResult {
  const now = Math.floor(Date.now() / 1000)
  const windowStart = now - (now % RATE_LIMIT_WINDOW)
  const resetAt = windowStart + RATE_LIMIT_WINDOW

  const key = `${userId}:${windowStart}`
  let entry = rateLimitStore.get(key)

  if (!entry || entry.resetAt !== resetAt) {
    // Clean up old entries
    for (const [k, v] of rateLimitStore) {
      if (v.resetAt < now) rateLimitStore.delete(k)
    }
    entry = { count: 0, resetAt }
    rateLimitStore.set(key, entry)
  }

  entry.count++
  const remaining = Math.max(0, RATE_LIMIT - entry.count)
  const allowed = entry.count <= RATE_LIMIT

  return { remaining, limit: RATE_LIMIT, resetAt, allowed }
}

/**
 * Add rate limit headers to a response
 */
export function addRateLimitHeaders(
  headers: Record<string, string>,
  rateLimit: RateLimitResult
): void {
  headers['X-RateLimit-Limit'] = String(rateLimit.limit)
  headers['X-RateLimit-Remaining'] = String(rateLimit.remaining)
  headers['X-RateLimit-Reset'] = String(rateLimit.resetAt)
}

/**
 * Create rate limit exceeded response
 */
export function rateLimitExceededResponse(rateLimit: RateLimitResult): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  addRateLimitHeaders(headers, rateLimit)

  // Add security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    headers[key] = value
  }

  return new Response(
    JSON.stringify({ error: 'Rate limit exceeded' }),
    { status: 429, headers }
  )
}

// ============================================================================
// Distributed Rate Limiting (DO Storage)
// ============================================================================

/**
 * Distributed rate limiter using Durable Object storage
 *
 * For production use, store rate limit state in DO storage
 * to share state across worker instances.
 *
 * Usage:
 * ```typescript
 * // In your DO class
 * private rateLimiter = new DistributedRateLimiter(this.ctx.storage)
 *
 * // Check rate limit
 * const result = await this.rateLimiter.check(userId)
 * if (!result.allowed) {
 *   return rateLimitExceededResponse(result)
 * }
 * ```
 */
export class DistributedRateLimiter {
  constructor(
    private storage: DurableObjectStorage,
    private limit: number = RATE_LIMIT,
    private windowSeconds: number = RATE_LIMIT_WINDOW
  ) {}

  /**
   * Check and update rate limit for a user
   */
  async check(userId: string): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000)
    const windowStart = now - (now % this.windowSeconds)
    const resetAt = windowStart + this.windowSeconds
    const key = `ratelimit:${userId}:${windowStart}`

    // Get current count
    const current = await this.storage.get<number>(key) || 0
    const newCount = current + 1

    // Update count (with TTL based on window)
    await this.storage.put(key, newCount)

    // Schedule cleanup (delete key after window expires)
    // Note: DO storage doesn't have native TTL, so we clean up on next check

    const remaining = Math.max(0, this.limit - newCount)
    const allowed = newCount <= this.limit

    return { remaining, limit: this.limit, resetAt, allowed }
  }

  /**
   * Clean up expired rate limit entries
   */
  async cleanup(): Promise<void> {
    const now = Math.floor(Date.now() / 1000)
    const keys = await this.storage.list({ prefix: 'ratelimit:' })

    for (const [key] of keys) {
      // Extract timestamp from key
      const parts = key.split(':')
      const windowStart = parseInt(parts[parts.length - 1], 10)
      if (windowStart + this.windowSeconds < now) {
        await this.storage.delete(key)
      }
    }
  }
}

// ============================================================================
// Authorization
// ============================================================================

/**
 * Derive user ID from auth token using cryptographic hash
 *
 * @param token - Bearer token from Authorization header
 * @returns Cryptographically derived user ID
 */
export async function deriveUserId(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return `user_${hashHex}`
}

/**
 * Parse and validate Authorization header
 *
 * @param authHeader - The Authorization header value
 * @returns The token if valid, or an error response
 */
export function parseAuthHeader(authHeader: string | undefined): AuthResult | AuthError {
  if (!authHeader) {
    return {
      error: new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS } }
      )
    }
  }

  if (!authHeader.startsWith('Bearer ')) {
    return {
      error: new Response(
        JSON.stringify({ error: 'Invalid Authorization header format. Expected: Bearer <token>' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS } }
      )
    }
  }

  const token = authHeader.slice(7).trim()
  if (!token) {
    return {
      error: new Response(
        JSON.stringify({ error: 'Authorization token is empty' }),
        { status: 401, headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS } }
      )
    }
  }

  // Note: userId is derived asynchronously, so we return placeholder here
  // Caller should use deriveUserId() to get actual userId
  return { token, userId: '' }
}

/**
 * Validate auth and get user ID with rate limiting
 *
 * Helper function for protected endpoints
 */
export async function validateAuthWithRateLimit(
  authHeader: string | undefined
): Promise<{ userId: string; rateLimit: RateLimitResult } | { error: Response }> {
  const authResult = parseAuthHeader(authHeader)
  if ('error' in authResult) {
    return authResult
  }

  const userId = await deriveUserId(authResult.token)
  const rateLimit = checkRateLimit(userId)

  if (!rateLimit.allowed) {
    return { error: rateLimitExceededResponse(rateLimit) }
  }

  return { userId, rateLimit }
}

// ============================================================================
// Input Validation
// ============================================================================

/** Valid worker name pattern: alphanumeric and hyphens, starts/ends with alphanumeric */
const VALID_NAME_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/i

/**
 * Validate deploy request fields
 *
 * @param body - Request body (parsed JSON)
 * @returns Validation error or null if valid
 */
export function validateDeployRequest(body: unknown): ValidationError | null {
  if (!body || typeof body !== 'object') {
    return { success: false, error: 'Request body must be a JSON object' }
  }

  const { name, code, language } = body as Record<string, unknown>

  // Validate name - required
  if (typeof name !== 'string' || !name.trim()) {
    return { success: false, error: 'name field is required and must be a non-empty string' }
  }

  // Check name length
  if (name.length > MAX_NAME_LENGTH) {
    return { success: false, error: `name exceeds maximum length of ${MAX_NAME_LENGTH} characters` }
  }

  // Check for invalid characters in name
  if (!VALID_NAME_PATTERN.test(name) || name.includes('..') || name.includes('/') || name.includes('<') || name.includes('>')) {
    return { success: false, error: 'name contains invalid characters. Only alphanumeric and hyphens allowed.' }
  }

  // Validate code field - required
  if (code === undefined) {
    return { success: false, error: 'code field is required' }
  }

  if (typeof code !== 'string') {
    return { success: false, error: 'code field must be a string' }
  }

  // Check code size
  if (code.length > MAX_CODE_SIZE) {
    return { success: false, error: `code exceeds maximum size of ${MAX_CODE_SIZE / 1024 / 1024}MB` }
  }

  // Validate language if provided
  if (language !== undefined) {
    if (!VALID_LANGUAGES.includes(language as typeof VALID_LANGUAGES[number])) {
      return { success: false, error: `language must be one of: ${VALID_LANGUAGES.join(', ')}` }
    }
  }

  return null
}

/**
 * Create validation error response
 */
export function validationErrorResponse(error: string, status = 400): Response {
  return new Response(
    JSON.stringify({ success: false, error }),
    {
      status,
      headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS }
    }
  )
}

/**
 * Validate Content-Type header for JSON endpoints
 */
export function validateJsonContentType(contentType: string | undefined): ValidationError | null {
  if (!contentType || !contentType.includes('application/json')) {
    return { success: false, error: 'Content-Type must be application/json' }
  }
  return null
}

// ============================================================================
// HTML Escaping
// ============================================================================

/**
 * Escape HTML entities in a string to prevent XSS
 *
 * This should be used when reflecting user input in error messages,
 * even in JSON responses (for defense in depth).
 *
 * @param str - String to escape
 * @returns Escaped string safe for HTML/JSON inclusion
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Sanitize user input for safe inclusion in error messages
 *
 * This removes potentially dangerous patterns like script tags,
 * event handlers, etc. in addition to HTML escaping.
 * For maximum security, use this for any user input reflected in responses.
 *
 * @param str - User input to sanitize
 * @returns Sanitized string safe for inclusion in error messages
 */
export function sanitizeForErrorMessage(str: string): string {
  // First, check if the input looks malicious
  const suspiciousPatterns = [
    /on\w+=/i,           // onerror=, onclick=, etc.
    /<script/i,          // script tags
    /javascript:/i,      // javascript: URLs
    /data:/i,            // data: URLs (potential XSS)
    /vbscript:/i,        // vbscript: URLs
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(str)) {
      // If suspicious, return a safe truncated version
      const safePart = str.slice(0, 20).replace(/[<>"'&]/g, '')
      return safePart + (str.length > 20 ? '...[sanitized]' : '[sanitized]')
    }
  }

  // If not suspicious, just escape HTML entities
  return escapeHtml(str)
}
