import type { BufferEncoding } from '../core/types'
import { ENOENT, EISDIR, EINVAL } from '../core/errors'
import { normalize, isAbsolute } from '../core/path'

/**
 * Options for readFile
 */
export interface ReadFileOptions {
  /** File encoding - if null returns Uint8Array, otherwise string */
  encoding?: BufferEncoding | null
  /** File open flag (default: 'r') */
  flag?: string
  /** Abort signal for cancellation */
  signal?: AbortSignal
}

/**
 * Storage interface for readFile
 */
export interface ReadFileStorage {
  get(path: string): { content: Uint8Array; isDirectory: boolean } | undefined
  has(path: string): boolean
}

// Module-level storage that can be set for testing
let storage: ReadFileStorage | null = null

/**
 * Set the storage backend for readFile
 * Used primarily for testing
 */
export function setStorage(s: ReadFileStorage | null): void {
  storage = s
}

/**
 * Get the current storage backend
 */
export function getStorage(): ReadFileStorage | null {
  return storage
}

/**
 * Encode bytes to base64
 */
function toBase64(bytes: Uint8Array): string {
  if (bytes.length === 0) return ''
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Encode bytes to hex
 */
function toHex(bytes: Uint8Array): string {
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0')
  }
  return hex
}

/**
 * Encode bytes to latin1/binary (each byte as char code)
 */
function toLatin1(bytes: Uint8Array): string {
  let result = ''
  for (let i = 0; i < bytes.length; i++) {
    result += String.fromCharCode(bytes[i])
  }
  return result
}

/**
 * Read the entire contents of a file
 *
 * @param path - Path to the file
 * @param options - Encoding or options object
 * @returns File contents as string (with encoding) or Uint8Array (without)
 *
 * @throws {ENOENT} If file does not exist
 * @throws {EISDIR} If path is a directory
 * @throws {EINVAL} If path is not absolute
 */
export async function readFile(
  path: string,
  options?: ReadFileOptions | BufferEncoding | null
): Promise<string | Uint8Array> {
  // Validate path is absolute
  if (!isAbsolute(path)) {
    throw new EINVAL('open', path)
  }

  // Check for trailing slash before normalization
  // In POSIX, a trailing slash means the path must be a directory
  // For readFile on a file path with trailing slash, this is an error
  const hadTrailingSlash = path.length > 1 && path.endsWith('/')

  // Normalize the path (handle //, ., ..)
  const normalizedPath = normalize(path)

  // If original path had trailing slash but points to a file, throw ENOENT
  // (treating "path/" as implying "path must be a directory")
  if (hadTrailingSlash) {
    throw new ENOENT('open', normalizedPath)
  }

  // Parse options
  let encoding: BufferEncoding | null | undefined
  let signal: AbortSignal | undefined

  if (typeof options === 'string') {
    encoding = options
  } else if (options === null) {
    encoding = null
  } else if (options) {
    encoding = options.encoding
    signal = options.signal
  }

  // Default encoding is utf-8 (returns string)
  if (encoding === undefined) {
    encoding = 'utf-8'
  }

  // Check for abort before starting
  if (signal?.aborted) {
    throw new Error('The operation was aborted')
  }

  // Check if storage is configured
  if (!storage) {
    throw new ENOENT('open', normalizedPath)
  }

  // Look up the file
  const entry = storage.get(normalizedPath)

  if (!entry) {
    throw new ENOENT('open', normalizedPath)
  }

  if (entry.isDirectory) {
    throw new EISDIR('read', normalizedPath)
  }

  const content = entry.content

  // Return based on encoding
  if (encoding === null) {
    // Return raw Uint8Array (copy to avoid mutation issues)
    return new Uint8Array(content)
  }

  // Convert to string based on encoding
  switch (encoding) {
    case 'utf-8':
    case 'utf8':
      return new TextDecoder('utf-8').decode(content)

    case 'base64':
      return toBase64(content)

    case 'hex':
      return toHex(content)

    case 'ascii':
      // ASCII is 7-bit, but we treat it same as utf-8 for valid ASCII
      return new TextDecoder('utf-8').decode(content)

    case 'latin1':
    case 'binary':
      // Latin1 is single-byte encoding, each byte maps to same code point
      return toLatin1(content)

    default:
      // Default to utf-8
      return new TextDecoder('utf-8').decode(content)
  }
}
