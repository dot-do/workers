/**
 * Store a git object in content-addressable storage
 *
 * This function:
 * 1. Creates a git object: `<type> <content.length>\0<content>`
 * 2. Computes SHA-1 hash of the uncompressed git object
 * 3. Compresses the git object with zlib
 * 4. Writes to `objects/xx/yyyy...` path (first 2 chars as directory)
 * 5. Returns the 40-character hex hash
 */

import type { GitObjectType } from './git-object'
import { createGitObject } from './git-object'
import { sha1 } from './hash'
import { compress } from './compression'
import { hashToPath } from './path-mapping'

const VALID_TYPES = ['blob', 'tree', 'commit', 'tag'] as const

/**
 * Storage interface for writing objects
 */
export interface ObjectStorage {
  write(path: string, data: Uint8Array): Promise<void>
}

/**
 * Store a git object and return its content hash
 *
 * @param storage - Storage backend to write to
 * @param type - Object type: 'blob', 'tree', 'commit', or 'tag'
 * @param content - Object content as Uint8Array
 * @returns 40-character lowercase hex SHA-1 hash
 */
export async function putObject(
  storage: ObjectStorage,
  type: string,
  content: Uint8Array
): Promise<string> {
  // Validate type: non-empty, no spaces, no null bytes, must be valid git type
  if (!type || type.includes(' ') || type.includes('\0')) {
    throw new Error('Invalid type: type must be non-empty and not contain spaces or null bytes')
  }

  if (!VALID_TYPES.includes(type as GitObjectType)) {
    throw new Error(`Invalid type: must be one of ${VALID_TYPES.join(', ')}`)
  }

  // Create the git object (header + content)
  const gitObject = createGitObject(type, content)

  // Compute SHA-1 hash of the uncompressed git object
  const hash = await sha1(gitObject)

  // Compress the git object with zlib
  const compressedData = await compress(gitObject)

  // Get the storage path from the hash
  const path = hashToPath(hash)

  // Write the compressed data to storage
  await storage.write(path, compressedData)

  // Return the 40-character hex hash
  return hash
}
