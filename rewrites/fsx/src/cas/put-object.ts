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
  // TODO: Implement
  throw new Error('Not implemented')
}
