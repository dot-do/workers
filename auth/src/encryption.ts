/**
 * Encryption Utilities - Phase 7 Universal API
 *
 * Provides secure token encryption/decryption using Cloudflare Workers crypto API.
 * Uses AES-GCM with 256-bit keys for maximum security.
 *
 * Key Features:
 * - Authenticated encryption (AES-GCM)
 * - Key derivation from secret (PBKDF2)
 * - Random IV generation per encryption
 * - Base64 encoding for storage
 */

/**
 * Derive a cryptographic key from a secret string
 *
 * Uses PBKDF2 with 100,000 iterations and SHA-256 hashing
 * to derive a secure 256-bit key from a password/secret.
 *
 * @param secret - Secret string (e.g., ENCRYPTION_SECRET env var)
 * @returns CryptoKey for AES-GCM encryption/decryption
 *
 * @example
 * const key = await deriveKey(env.ENCRYPTION_SECRET)
 */
export async function deriveKey(secret: string): Promise<CryptoKey> {
  // Convert secret to bytes
  const encoder = new TextEncoder()
  const secretBytes = encoder.encode(secret)

  // Import secret as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  )

  // Static salt (for deterministic key derivation)
  // In production, you might want to use per-token salts stored with encrypted data
  const salt = encoder.encode('dot-do-universal-api-v1')

  // Derive AES-GCM key using PBKDF2
  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypt a token string using AES-GCM
 *
 * Generates a random 12-byte IV for each encryption operation.
 * Returns base64-encoded string containing IV + ciphertext.
 *
 * @param token - Plain text token to encrypt
 * @param key - Cryptographic key from deriveKey()
 * @returns Base64-encoded encrypted token (format: iv + ciphertext)
 *
 * @example
 * const key = await deriveKey(env.ENCRYPTION_SECRET)
 * const encrypted = await encryptToken('access_token_xyz', key)
 * // Returns: "abc123...def456" (base64)
 */
export async function encryptToken(token: string, key: CryptoKey): Promise<string> {
  // Convert token to bytes
  const encoder = new TextEncoder()
  const tokenBytes = encoder.encode(token)

  // Generate random IV (12 bytes for AES-GCM)
  const iv = crypto.getRandomValues(new Uint8Array(12))

  // Encrypt using AES-GCM
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    tokenBytes
  )

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(ciphertext), iv.length)

  // Encode to base64 for storage
  return btoa(String.fromCharCode(...combined))
}

/**
 * Decrypt an encrypted token string
 *
 * Expects base64-encoded string containing IV + ciphertext.
 * Returns plain text token string.
 *
 * @param encryptedToken - Base64-encoded encrypted token
 * @param key - Cryptographic key from deriveKey()
 * @returns Decrypted plain text token
 * @throws Error if decryption fails (wrong key, corrupted data)
 *
 * @example
 * const key = await deriveKey(env.ENCRYPTION_SECRET)
 * const decrypted = await decryptToken('abc123...def456', key)
 * // Returns: "access_token_xyz"
 */
export async function decryptToken(encryptedToken: string, key: CryptoKey): Promise<string> {
  // Decode from base64
  const combined = Uint8Array.from(atob(encryptedToken), c => c.charCodeAt(0))

  // Extract IV (first 12 bytes)
  const iv = combined.slice(0, 12)

  // Extract ciphertext (remaining bytes)
  const ciphertext = combined.slice(12)

  // Decrypt using AES-GCM
  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    ciphertext
  )

  // Convert bytes to string
  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}

/**
 * Convenience function: Encrypt token with secret string
 *
 * Combines deriveKey + encryptToken in one call.
 *
 * @param token - Plain text token
 * @param secret - Secret string for key derivation
 * @returns Base64-encoded encrypted token
 */
export async function encryptTokenWithSecret(token: string, secret: string): Promise<string> {
  const key = await deriveKey(secret)
  return await encryptToken(token, key)
}

/**
 * Convenience function: Decrypt token with secret string
 *
 * Combines deriveKey + decryptToken in one call.
 *
 * @param encryptedToken - Base64-encoded encrypted token
 * @param secret - Secret string for key derivation
 * @returns Decrypted plain text token
 */
export async function decryptTokenWithSecret(encryptedToken: string, secret: string): Promise<string> {
  const key = await deriveKey(secret)
  return await decryptToken(encryptedToken, key)
}
