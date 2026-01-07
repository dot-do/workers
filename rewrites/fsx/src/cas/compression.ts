/**
 * Zlib compression utilities for Content-Addressable Storage
 *
 * Uses the zlib format (RFC 1950) which is:
 * - CMF byte (usually 0x78 for deflate with 32K window)
 * - FLG byte (determines compression level)
 * - Compressed data (deflate algorithm)
 * - ADLER-32 checksum (4 bytes)
 *
 * This format is compatible with git's object storage.
 */

import pako from 'pako'

/**
 * Compress data using zlib deflate format
 *
 * @param data - The data to compress
 * @returns Compressed data in zlib format (header + deflate + adler32)
 */
export async function compress(data: Uint8Array): Promise<Uint8Array> {
  // pako.deflate produces zlib format by default (not raw deflate, not gzip)
  // This includes the 0x78 header and ADLER-32 checksum
  return pako.deflate(data)
}

/**
 * Decompress zlib deflate format data
 *
 * @param data - The compressed data in zlib format
 * @returns Decompressed original data
 * @throws Error if data is invalid, corrupted, or truncated
 */
export async function decompress(data: Uint8Array): Promise<Uint8Array> {
  try {
    // pako.inflate expects zlib format and validates the ADLER-32 checksum
    const result = pako.inflate(data)

    // pako returns undefined for invalid/truncated data instead of throwing
    if (result === undefined) {
      throw new Error('Invalid or truncated zlib data')
    }

    return result
  } catch (error) {
    // Re-throw with a more descriptive message
    const message = error instanceof Error ? error.message : 'Unknown error'
    throw new Error(`Decompression failed: ${message}`)
  }
}
