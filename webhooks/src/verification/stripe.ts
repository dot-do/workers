import type { StripeEvent } from '../types'

/**
 * Verify Stripe webhook signature using Web Crypto API
 * Stripe uses HMAC-SHA256 signature verification
 *
 * @see https://stripe.com/docs/webhooks/signatures
 */
export async function verifyStripeSignature(payload: string, signatureHeader: string, secret: string): Promise<StripeEvent> {
  // Parse signature header
  // Format: t=timestamp,v1=signature
  const parts = signatureHeader.split(',')
  const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2)
  const signature = parts.find((p) => p.startsWith('v1='))?.slice(3)

  if (!timestamp || !signature) {
    throw new Error('Invalid signature header format')
  }

  // Check timestamp tolerance (5 minutes)
  const webhookTimestamp = parseInt(timestamp) * 1000
  const currentTime = Date.now()
  const tolerance = 5 * 60 * 1000 // 5 minutes

  if (Math.abs(currentTime - webhookTimestamp) > tolerance) {
    throw new Error('Webhook timestamp is too old')
  }

  // Construct signed payload
  const signedPayload = `${timestamp}.${payload}`

  // Generate expected signature using Web Crypto API
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload))

  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // Compare signatures (constant time comparison)
  if (!constantTimeCompare(expectedSignature, signature)) {
    throw new Error('Invalid signature')
  }

  // Parse and return event
  return JSON.parse(payload)
}

/**
 * Constant time string comparison to prevent timing attacks
 */
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}
