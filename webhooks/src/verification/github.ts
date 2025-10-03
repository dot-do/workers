/**
 * Verify GitHub webhook signature using Web Crypto API
 * GitHub uses HMAC-SHA256 signature verification
 *
 * @see https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
 */
export async function verifyGitHubSignature(payload: string, signatureHeader: string, secret: string): Promise<void> {
  // GitHub signature format: sha256=<hex>
  if (!signatureHeader.startsWith('sha256=')) {
    throw new Error('Invalid signature header format')
  }

  const signature = signatureHeader.slice(7) // Remove "sha256=" prefix

  // Generate expected signature using Web Crypto API
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])

  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload))

  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  // Compare signatures (constant time comparison)
  if (!constantTimeCompare(expectedSignature, signature)) {
    throw new Error('Invalid signature')
  }
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
