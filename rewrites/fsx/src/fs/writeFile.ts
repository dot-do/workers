/**
 * writeFile operation
 *
 * Write data to a file, creating the file if it does not exist,
 * or overwriting it if it does.
 */

import type { BufferEncoding } from '../core/types'
import { ENOENT, EISDIR, EEXIST } from '../core/errors'

/**
 * Options for writeFile
 */
export interface WriteFileOptions {
  /** File encoding (for string data) */
  encoding?: BufferEncoding
  /** File mode (permissions) */
  mode?: number
  /** File system flag (w, a, wx, etc.) */
  flag?: string
}

/**
 * Storage interface that writeFile operates on
 */
export interface WriteFileStorage {
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
 * Write data to a file
 *
 * @param storage - Storage backend
 * @param path - File path
 * @param data - Data to write (string or Uint8Array)
 * @param options - Write options
 * @throws ENOENT if parent directory does not exist
 * @throws EISDIR if path is a directory
 * @throws EEXIST if flag is 'wx' and file already exists
 */
export async function writeFile(
  storage: WriteFileStorage,
  path: string,
  data: string | Uint8Array,
  options?: WriteFileOptions
): Promise<void> {
  const normalizedPath = normalizePath(path)
  const flag = options?.flag ?? 'w'
  const mode = options?.mode ?? 0o644
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
  // parentExists returns true if parent is a directory OR a file
  // but we need to check if there's a file in the path (intermediate component is a file)
  if (parentPath !== '/' && !storage.parentExists(normalizedPath)) {
    throw new ENOENT('open', parentPath)
  }

  // Also check if parent exists but is a file (not a directory)
  // In this case we should throw ENOENT because you can't create a file inside a file
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

  // Check for exclusive write flag
  const existingFile = storage.getFile(normalizedPath)
  if (flag === 'wx' && existingFile !== undefined) {
    throw new EEXIST('open', normalizedPath)
  }

  // Convert data to Uint8Array
  let bytes: Uint8Array
  if (typeof data === 'string') {
    bytes = encodeData(data, encoding)
  } else {
    bytes = data
  }

  // Handle append flag
  if (flag === 'a' && existingFile !== undefined) {
    // Append to existing file
    const newContent = new Uint8Array(existingFile.content.length + bytes.length)
    newContent.set(existingFile.content)
    newContent.set(bytes, existingFile.content.length)
    bytes = newContent
  }

  // Write the file with metadata
  // Preserve birthtime if file exists (overwrite), otherwise use current time
  const now = Date.now()
  const birthtime = existingFile?.metadata.birthtime ?? now

  storage.addFile(normalizedPath, bytes, { mode, birthtime })
}
