/**
 * appendFile operation
 *
 * Append data to a file, creating the file if it does not exist.
 * Unlike writeFile, this preserves existing content and adds to the end.
 */

import type { BufferEncoding } from '../core/types'
import { ENOENT, EISDIR } from '../core/errors'

/**
 * Options for appendFile
 */
export interface AppendFileOptions {
  /** File encoding (for string data). Default: 'utf-8' */
  encoding?: BufferEncoding | null
  /** File mode if creating the file. Default: 0o666 */
  mode?: number
  /** File system flag. Default: 'a' (append) */
  flag?: string
}

/**
 * Storage interface that appendFile operates on
 */
export interface AppendFileStorage {
  getFile(path: string): { content: Uint8Array; metadata: { mode: number; mtime: number; birthtime: number; ctime: number } } | undefined
  addDirectory(path: string): void
  addFile(path: string, content: Uint8Array, metadata?: { mode?: number; birthtime?: number }): void
  isDirectory(path: string): boolean
  parentExists(path: string): boolean
}

/**
 * Normalize a path: remove double slashes, resolve . and ..
 */
function normalizePath(path: string): string {
  // Split path into segments and filter out empty ones and '.'
  const segments = path.split('/').filter(s => s !== '' && s !== '.')

  // Process '..' segments
  const result: string[] = []
  for (const segment of segments) {
    if (segment === '..') {
      result.pop()
    } else {
      result.push(segment)
    }
  }

  return '/' + result.join('/')
}

/**
 * Get parent path from a path
 */
function getParentPath(path: string): string {
  const lastSlash = path.lastIndexOf('/')
  if (lastSlash <= 0) return '/'
  return path.substring(0, lastSlash)
}

/**
 * Encode string data to Uint8Array based on encoding
 */
function encodeData(data: string, encoding: BufferEncoding = 'utf-8'): Uint8Array {
  switch (encoding) {
    case 'utf-8':
    case 'utf8':
      return new TextEncoder().encode(data)

    case 'base64': {
      // Decode base64 to binary
      const binaryString = atob(data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      return bytes
    }

    case 'hex': {
      // Decode hex to binary
      const length = data.length / 2
      const bytes = new Uint8Array(length)
      for (let i = 0; i < length; i++) {
        bytes[i] = parseInt(data.substr(i * 2, 2), 16)
      }
      return bytes
    }

    case 'ascii':
    case 'latin1':
    case 'binary': {
      const bytes = new Uint8Array(data.length)
      for (let i = 0; i < data.length; i++) {
        bytes[i] = data.charCodeAt(i) & 0xff
      }
      return bytes
    }

    default:
      return new TextEncoder().encode(data)
  }
}

/**
 * Append data to a file
 *
 * @param storage - Storage backend
 * @param path - File path
 * @param data - Data to append (string or Uint8Array)
 * @param options - Append options
 * @returns undefined on success
 * @throws ENOENT if parent directory does not exist
 * @throws EISDIR if path is a directory
 */
export async function appendFile(
  storage: AppendFileStorage,
  path: string,
  data: string | Uint8Array,
  options?: AppendFileOptions
): Promise<void> {
  const normalizedPath = normalizePath(path)
  const mode = options?.mode ?? 0o666
  const encoding = options?.encoding ?? 'utf-8'

  // Check if path is root directory
  if (normalizedPath === '/') {
    throw new EISDIR('open', normalizedPath)
  }

  // Check if path is a directory
  if (storage.isDirectory(normalizedPath)) {
    throw new EISDIR('open', normalizedPath)
  }

  // Get the parent path
  const parentPath = getParentPath(normalizedPath)

  // Check if parent exists - need to check parent directory specifically
  if (parentPath !== '/' && !storage.parentExists(normalizedPath)) {
    throw new ENOENT('open', parentPath)
  }

  // Also check if parent exists but is a file (not a directory)
  if (parentPath !== '/' && !storage.isDirectory(parentPath)) {
    // If parent path has a file there instead of a directory, it's ENOENT
    const parentFile = storage.getFile(parentPath)
    if (parentFile !== undefined) {
      // Parent is a file, not a directory
      throw new ENOENT('open', parentPath)
    }
    // Parent doesn't exist at all
    throw new ENOENT('open', parentPath)
  }

  // Get existing file (if any)
  const existingFile = storage.getFile(normalizedPath)

  // Convert data to Uint8Array
  let bytes: Uint8Array
  if (typeof data === 'string') {
    // Use encoding or default to utf-8 if null
    bytes = encodeData(data, encoding ?? 'utf-8')
  } else {
    bytes = data
  }

  // Concatenate existing content with new data
  let finalContent: Uint8Array
  if (existingFile !== undefined) {
    // Append to existing file - preserve existing content
    finalContent = new Uint8Array(existingFile.content.length + bytes.length)
    finalContent.set(existingFile.content)
    finalContent.set(bytes, existingFile.content.length)
  } else {
    // Create new file with the data
    finalContent = bytes
  }

  // Write the file with metadata
  // Preserve birthtime if file exists (append), otherwise use current time
  const birthtime = existingFile?.metadata.birthtime

  // For existing files, preserve the original mode; for new files, use the provided mode
  const fileMode = existingFile?.metadata.mode ?? mode

  storage.addFile(normalizedPath, finalContent, { mode: fileMode, birthtime })
}
