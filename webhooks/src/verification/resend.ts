import type { ResendEvent } from '../types'

/**
 * Verify Resend webhook signature using Svix verification
 * Resend uses Svix for webhook delivery with Ed25519 signatures
 *
 * @see https://resend.com/docs/dashboard/webhooks/verification
 * @see https://docs.svix.com/receiving/verifying-payloads/how
 */
export async function verifyResendSignature(payload: string, headers: Record<string, string>, secret: string): Promise<ResendEvent> {
  const svixId = headers['svix-id']
  const svixTimestamp = headers['svix-timestamp']
  const svixSignature = headers['svix-signature']

  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error('Missing Svix signature headers')
  }

  // Check timestamp tolerance (5 minutes)
  const webhookTimestamp = parseInt(svixTimestamp) * 1000
  const currentTime = Date.now()
  const tolerance = 5 * 60 * 1000 // 5 minutes

  if (Math.abs(currentTime - webhookTimestamp) > tolerance) {
    throw new Error('Webhook timestamp is too old')
  }

  // Construct signed content
  // Format: <msg_id>.<timestamp>.<payload>
  const signedContent = `${svixId}.${svixTimestamp}.${payload}`

  // Parse signatures
  // Format: v1,signature1 v1,signature2
  const signatures = svixSignature.split(' ').map((sig) => {
    const [version, signature] = sig.split(',')
    return { version, signature }
  })

  // Find v1 signatures
  const v1Signatures = signatures.filter((s) => s.version === 'v1')

  if (v1Signatures.length === 0) {
    throw new Error('No v1 signatures found')
  }

  // Verify secret format (should be base64)
  const secretBytes = base64ToBytes(secret.startsWith('whsec_') ? secret.slice(6) : secret)

  // Generate expected signature using HMAC-SHA256
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', secretBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(signedContent))

  const expectedSignature = bytesToBase64(new Uint8Array(signatureBuffer))

  // Check if any v1 signature matches
  const isValid = v1Signatures.some((sig) => constantTimeCompare(expectedSignature, sig.signature))

  if (!isValid) {
    throw new Error('Invalid signature')
  }

  // Parse and return event
  return JSON.parse(payload)
}

/**
 * Convert base64 string to Uint8Array
 */
function base64ToBytes(base64: string): Uint8Array {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

/**
 * Convert Uint8Array to base64 string
 */
function bytesToBase64(bytes: Uint8Array): string {
  const binaryString = Array.from(bytes)
    .map((byte) => String.fromCharCode(byte))
    .join('')
  return btoa(binaryString)
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
