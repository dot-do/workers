/**
 * JWT Utilities for @dotdo/auth
 *
 * Provides JWT parsing and validation utilities that work in Workers/Edge environments.
 * For full JWT verification with signatures, use the better-auth session API or
 * the JWKS cache for remote key validation.
 */

// ============================================================================
// Types
// ============================================================================

/**
 * JWT algorithm types supported
 */
export type JwtAlgorithm = 'HS256' | 'HS384' | 'HS512' | 'RS256' | 'RS384' | 'RS512' | 'ES256' | 'ES384' | 'ES512'

/**
 * JWT header
 */
export interface JwtHeader {
  alg: JwtAlgorithm
  typ?: string
  kid?: string
}

/**
 * Standard JWT claims
 */
export interface JwtClaims {
  /** Subject (user ID) */
  sub?: string
  /** Issuer */
  iss?: string
  /** Audience */
  aud?: string | string[]
  /** Expiration time (Unix timestamp) */
  exp?: number
  /** Not before (Unix timestamp) */
  nbf?: number
  /** Issued at (Unix timestamp) */
  iat?: number
  /** JWT ID */
  jti?: string
  /** Additional claims */
  [key: string]: unknown
}

/**
 * Parsed JWT structure
 */
export interface ParsedJwt {
  header: JwtHeader
  payload: JwtClaims
  signature: string
  raw: {
    header: string
    payload: string
    signature: string
  }
}

/**
 * JWT validation result
 */
export interface JwtValidationResult {
  valid: boolean
  error?: string
  payload?: JwtClaims
}

/**
 * JWT validation options
 */
export interface JwtValidationOptions {
  /** Expected issuer */
  issuer?: string
  /** Expected audience */
  audience?: string | string[]
  /** Clock tolerance in seconds (default: 0) */
  clockTolerance?: number
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Base64 URL encode
 */
export function base64UrlEncode(data: string | Uint8Array): string {
  const str = typeof data === 'string' ? data : new TextDecoder().decode(data)
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Base64 URL decode
 */
export function base64UrlDecode(data: string): string {
  const padded = data.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice(0, (4 - (data.length % 4)) % 4)
  return atob(padded)
}

/**
 * Base64 URL decode to Uint8Array
 */
export function base64UrlDecodeBytes(data: string): Uint8Array {
  const str = base64UrlDecode(data)
  const bytes = new Uint8Array(str.length)
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i)
  }
  return bytes
}

// ============================================================================
// JWT Parsing (no verification)
// ============================================================================

/**
 * Parse a JWT without verification
 *
 * This function only parses the JWT structure. It does NOT verify the signature.
 * Use this for extracting claims when you'll verify through other means (e.g., Better Auth session).
 *
 * @example
 * ```ts
 * import { parseJwt } from '@dotdo/auth/jwt'
 *
 * const token = request.headers.get('Authorization')?.slice(7)
 * const parsed = parseJwt(token)
 *
 * if (parsed) {
 *   console.log('User ID:', parsed.payload.sub)
 * }
 * ```
 */
export function parseJwt(token: string): ParsedJwt | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const [headerB64, payloadB64, signatureB64] = parts

    const headerJson = base64UrlDecode(headerB64)
    const payloadJson = base64UrlDecode(payloadB64)

    const header = JSON.parse(headerJson) as JwtHeader
    const payload = JSON.parse(payloadJson) as JwtClaims

    return {
      header,
      payload,
      signature: signatureB64,
      raw: {
        header: headerB64,
        payload: payloadB64,
        signature: signatureB64,
      },
    }
  } catch {
    return null
  }
}

/**
 * Check if a JWT is expired
 */
export function isJwtExpired(payload: JwtClaims, clockToleranceSeconds = 0): boolean {
  if (!payload.exp) return false

  const now = Math.floor(Date.now() / 1000)
  return payload.exp < now - clockToleranceSeconds
}

/**
 * Check if a JWT is not yet valid (nbf claim)
 */
export function isJwtNotYetValid(payload: JwtClaims, clockToleranceSeconds = 0): boolean {
  if (!payload.nbf) return false

  const now = Math.floor(Date.now() / 1000)
  return payload.nbf > now + clockToleranceSeconds
}

/**
 * Validate JWT claims (expiration, issuer, audience)
 *
 * This validates the claims only, not the signature.
 *
 * @example
 * ```ts
 * import { parseJwt, validateJwtClaims } from '@dotdo/auth/jwt'
 *
 * const parsed = parseJwt(token)
 * if (parsed) {
 *   const result = validateJwtClaims(parsed.payload, {
 *     issuer: 'https://id.org.ai',
 *     audience: 'my-app',
 *   })
 *
 *   if (!result.valid) {
 *     console.error('Invalid JWT:', result.error)
 *   }
 * }
 * ```
 */
export function validateJwtClaims(payload: JwtClaims, options: JwtValidationOptions = {}): JwtValidationResult {
  const { issuer, audience, clockTolerance = 0 } = options

  // Check expiration
  if (isJwtExpired(payload, clockTolerance)) {
    return { valid: false, error: 'Token expired' }
  }

  // Check not before
  if (isJwtNotYetValid(payload, clockTolerance)) {
    return { valid: false, error: 'Token not yet valid' }
  }

  // Check issuer
  if (issuer && payload.iss !== issuer) {
    return { valid: false, error: `Invalid issuer: expected ${issuer}, got ${payload.iss}` }
  }

  // Check audience
  if (audience) {
    const expectedAudiences = Array.isArray(audience) ? audience : [audience]
    const tokenAudiences = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : []

    const hasMatchingAudience = expectedAudiences.some((exp) => tokenAudiences.includes(exp))
    if (!hasMatchingAudience) {
      return { valid: false, error: `Invalid audience: expected one of ${expectedAudiences.join(', ')}` }
    }
  }

  return { valid: true, payload }
}

// ============================================================================
// Token Creation (for testing)
// ============================================================================

/**
 * Create a simple test JWT (HMAC-SHA256)
 *
 * WARNING: This uses a simple hash for testing purposes only.
 * In production, use proper crypto (WebCrypto API) for signing.
 *
 * @example
 * ```ts
 * import { createTestJwt } from '@dotdo/auth/jwt'
 *
 * const token = createTestJwt(
 *   { sub: 'user-123', email: 'test@example.com' },
 *   'test-secret'
 * )
 * ```
 */
export function createTestJwt(payload: JwtClaims, secret: string): string {
  const header: JwtHeader = { alg: 'HS256', typ: 'JWT' }

  // Add default claims if not present
  const fullPayload: JwtClaims = {
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour
    ...payload,
  }

  const headerB64 = base64UrlEncode(JSON.stringify(header))
  const payloadB64 = base64UrlEncode(JSON.stringify(fullPayload))
  const message = `${headerB64}.${payloadB64}`

  // Simple deterministic hash for testing (NOT cryptographically secure)
  const signature = base64UrlEncode(simpleTestHash(secret + message))

  return `${headerB64}.${payloadB64}.${signature}`
}

/**
 * Simple hash for testing purposes only
 * NOT cryptographically secure - use WebCrypto for production
 */
function simpleTestHash(input: string): string {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }

  const chars: string[] = []
  let h = Math.abs(hash)
  for (let i = 0; i < 32; i++) {
    chars.push(String.fromCharCode(65 + (h % 26)))
    h = Math.floor(h / 26) || i + 1
  }
  return chars.join('')
}

/**
 * Verify a test JWT created with createTestJwt
 *
 * WARNING: This is for testing only. Use proper crypto verification in production.
 */
export function verifyTestJwt(token: string, secret: string, options?: JwtValidationOptions): JwtValidationResult {
  const parsed = parseJwt(token)
  if (!parsed) {
    return { valid: false, error: 'Invalid token format' }
  }

  // Verify signature
  const message = `${parsed.raw.header}.${parsed.raw.payload}`
  const expectedSignature = base64UrlEncode(simpleTestHash(secret + message))

  if (parsed.signature !== expectedSignature) {
    return { valid: false, error: 'Invalid signature' }
  }

  // Validate claims
  return validateJwtClaims(parsed.payload, options)
}
