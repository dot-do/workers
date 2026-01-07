/**
 * Hash computation functions using the Web Crypto API (crypto.subtle)
 *
 * These functions compute cryptographic hashes for content-addressable storage.
 * They return lowercase hex-encoded strings.
 */

/**
 * Pre-computed lookup table for byte-to-hex conversion.
 * Contains hex strings '00' through 'ff' for O(1) lookup.
 * @internal
 */
const HEX_LOOKUP: string[] = (() => {
  const table: string[] = new Array(256)
  for (let i = 0; i < 256; i++) {
    table[i] = i.toString(16).padStart(2, '0')
  }
  return table
})()

/**
 * Convert a Uint8Array to a hexadecimal string.
 *
 * Uses a pre-computed lookup table for O(1) byte-to-hex conversion,
 * making this significantly faster than string formatting approaches.
 *
 * @param bytes - Binary data to convert
 * @returns Lowercase hexadecimal string
 *
 * @example
 * ```typescript
 * const hello = new TextEncoder().encode('Hello')
 * const hex = bytesToHex(hello)
 * console.log(hex) // '48656c6c6f'
 * ```
 */
export function bytesToHex(bytes: Uint8Array): string {
  if (bytes.length === 0) return ''
  let result = ''
  for (let i = 0; i < bytes.length; i++) {
    result += HEX_LOOKUP[bytes[i]]
  }
  return result
}

/**
 * Convert a hexadecimal string to a Uint8Array.
 *
 * @param hex - Hexadecimal string (case-insensitive)
 * @returns Binary data as Uint8Array
 *
 * @example
 * ```typescript
 * const bytes = hexToBytes('48656c6c6f')
 * console.log(new TextDecoder().decode(bytes)) // 'Hello'
 * ```
 */
export function hexToBytes(hex: string): Uint8Array {
  if (hex.length === 0) return new Uint8Array(0)
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

/**
 * Compute SHA-1 hash of data
 * @param data - Input data as Uint8Array or string (UTF-8 encoded)
 * @returns 40-character lowercase hex string
 */
export async function sha1(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const hashBuffer = await crypto.subtle.digest('SHA-1', bytes)
  return bytesToHex(new Uint8Array(hashBuffer))
}

/**
 * Compute SHA-256 hash of data
 * @param data - Input data as Uint8Array or string (UTF-8 encoded)
 * @returns 64-character lowercase hex string
 */
export async function sha256(data: Uint8Array | string): Promise<string> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const hashBuffer = await crypto.subtle.digest('SHA-256', bytes)
  return bytesToHex(new Uint8Array(hashBuffer))
}
