/**
 * Webhook Security Middleware
 *
 * Implements webhook signature verification using HMAC-SHA1 to validate
 * X-Hub-Signature headers (GitHub-style webhooks). Uses Web Crypto API
 * for cryptographic operations and timing-safe comparison to prevent
 * timing attacks.
 *
 * @module webhook-security
 */

import type { MiddlewareHandler } from 'hono'

/**
 * Configuration options for webhook signature verification
 */
export interface WebhookSecurityOptions {
  /**
   * Secret key for HMAC signature verification
   */
  secret: string

  /**
   * Optional maximum age for webhook events (in milliseconds)
   * If provided, events with timestamps older than this will be rejected
   */
  maxAge?: number

  /**
   * Optional custom header name (default: 'X-Hub-Signature')
   */
  headerName?: string
}

/**
 * Verify webhook signature using HMAC-SHA1
 *
 * This middleware validates the X-Hub-Signature header to ensure webhooks
 * are authentic and haven't been tampered with. It:
 * 1. Parses the X-Hub-Signature header (format: "sha1=<hex>")
 * 2. Computes HMAC-SHA1 of the request body using the secret
 * 3. Performs timing-safe comparison to prevent timing attacks
 * 4. Returns 401 Unauthorized if signature is missing or invalid
 * 5. Allows request to proceed if signature is valid
 *
 * @param options Configuration options
 * @returns Hono middleware handler
 *
 * @example
 * ```typescript
 * import { Hono } from 'hono'
 * import { verifyWebhookSignature } from '@dotdo/middleware-webhook-security'
 *
 * const app = new Hono()
 *
 * app.use('/webhook', verifyWebhookSignature({ secret: 'my-secret' }))
 * app.post('/webhook', (c) => c.json({ received: true }))
 * ```
 */
export function verifyWebhookSignature(options: WebhookSecurityOptions): MiddlewareHandler {
  const { secret, maxAge, headerName = 'X-Hub-Signature' } = options

  return async (c, next) => {
    // Get signature from header
    const signatureHeader = c.req.header(headerName)

    if (!signatureHeader) {
      return c.json(
        { error: 'Webhook signature required' },
        { status: 401 }
      )
    }

    // Parse signature format: "sha1=<hex>"
    if (!signatureHeader.startsWith('sha1=')) {
      return c.json(
        { error: 'Invalid signature format. Expected "sha1=<hex>"' },
        { status: 401 }
      )
    }

    const providedSignature = signatureHeader.slice(5) // Remove 'sha1=' prefix

    // Validate hex format
    if (!/^[0-9a-f]{40}$/i.test(providedSignature)) {
      return c.json(
        { error: 'Invalid signature format. Expected 40-character hex string' },
        { status: 401 }
      )
    }

    // Read and clone the request body
    // We need to clone because the body can only be read once
    let bodyText: string
    try {
      const clonedRequest = c.req.raw.clone()
      bodyText = await clonedRequest.text()
    } catch (error) {
      return c.json(
        { error: 'Failed to read request body' },
        { status: 400 }
      )
    }

    // Optional: Validate timestamp freshness (replay attack prevention)
    if (maxAge !== undefined) {
      try {
        const body = JSON.parse(bodyText)
        if (body.timestamp && typeof body.timestamp === 'number') {
          const age = Date.now() - body.timestamp
          if (age > maxAge) {
            return c.json(
              { error: 'Webhook event too old' },
              { status: 401 }
            )
          }
        }
      } catch {
        // If body is not JSON or doesn't have timestamp, skip validation
        // (timestamp validation is optional)
      }
    }

    // Compute HMAC-SHA1 signature using Web Crypto API
    try {
      const encoder = new TextEncoder()
      const keyData = encoder.encode(secret)
      const messageData = encoder.encode(bodyText)

      // Import the secret as a crypto key
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-1' },
        false,
        ['sign']
      )

      // Compute the signature
      const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData)

      // Convert to hex string
      const computedSignature = Array.from(new Uint8Array(signatureBuffer))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')

      // Timing-safe comparison
      // Convert both signatures to Uint8Array for crypto.subtle.timingSafeEqual
      const providedBytes = hexToUint8Array(providedSignature.toLowerCase())
      const computedBytes = hexToUint8Array(computedSignature)

      // Use timing-safe comparison to prevent timing attacks
      const isValid = await timingSafeEqual(providedBytes, computedBytes)

      if (!isValid) {
        return c.json(
          { error: 'Invalid signature. Signature verification failed' },
          { status: 401 }
        )
      }

      // Signature is valid, proceed to next handler
      await next()
    } catch (error) {
      console.error('Webhook signature verification error:', error)
      return c.json(
        { error: 'Signature verification failed' },
        { status: 401 }
      )
    }
  }
}

/**
 * Convert hex string to Uint8Array
 */
function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

/**
 * Timing-safe comparison of two byte arrays
 *
 * Uses crypto.subtle.timingSafeEqual if available (Cloudflare Workers),
 * otherwise falls back to a manual constant-time comparison.
 *
 * @param a First byte array
 * @param b Second byte array
 * @returns true if arrays are equal, false otherwise
 */
async function timingSafeEqual(a: Uint8Array, b: Uint8Array): Promise<boolean> {
  // Check if crypto.subtle.timingSafeEqual is available
  if (typeof (crypto.subtle as any).timingSafeEqual === 'function') {
    try {
      return (crypto.subtle as any).timingSafeEqual(a, b)
    } catch {
      // Fall through to manual implementation
    }
  }

  // Fallback: Manual constant-time comparison
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i]
  }

  return result === 0
}
