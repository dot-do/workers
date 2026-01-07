/**
 * Hash computation functions using the Web Crypto API (crypto.subtle)
 *
 * These functions compute cryptographic hashes for content-addressable storage.
 * They return lowercase hex-encoded strings.
 */

/**
 * Compute SHA-1 hash of data
 * @param data - Input data as Uint8Array
 * @returns 40-character lowercase hex string
 */
export async function sha1(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-1', data)
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Compute SHA-256 hash of data
 * @param data - Input data as Uint8Array
 * @returns 64-character lowercase hex string
 */
export async function sha256(data: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = new Uint8Array(hashBuffer)
  return Array.from(hashArray).map(b => b.toString(16).padStart(2, '0')).join('')
}
