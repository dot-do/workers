/**
 * Get object from Content-Addressable Storage
 *
 * Retrieves a git object by its hash:
 * 1. Converts hash to path using hashToPath()
 * 2. Reads compressed data from storage
 * 3. Decompresses with zlib
 * 4. Parses git object format to extract type and content
 * 5. Returns { type: string, content: Uint8Array }
 */

import type { R2Storage } from '../storage/r2.js'
import { decompress } from './compression.js'
import { parseGitObject } from './git-object.js'
import { hashToPath } from './path-mapping.js'
import { ENOENT } from '../core/errors.js'

export interface GitObject {
  type: string
  content: Uint8Array
}

/**
 * Validate that a hash is properly formatted
 * @param hash - The hash to validate
 * @throws Error if hash is invalid
 */
function validateHash(hash: string): void {
  // Check length (SHA-1 = 40, SHA-256 = 64)
  if (hash.length !== 40 && hash.length !== 64) {
    throw new Error(`Invalid hash length: expected 40 (SHA-1) or 64 (SHA-256), got ${hash.length}`)
  }

  // Check for valid hex characters
  if (!/^[0-9a-fA-F]+$/.test(hash)) {
    throw new Error('Invalid hash: contains non-hex characters')
  }
}

/**
 * Retrieve a git object from storage by its hash
 *
 * @param hash - SHA-1 (40 char) or SHA-256 (64 char) hash
 * @param storage - R2Storage instance
 * @returns The git object with type and content
 * @throws ENOENT if object doesn't exist
 * @throws Error if data is corrupted or invalid format
 */
export async function getObject(hash: string, storage: R2Storage): Promise<GitObject> {
  // Step 1: Validate hash format
  validateHash(hash)

  // Step 2: Normalize hash to lowercase and get storage path
  const normalizedHash = hash.toLowerCase()
  const path = hashToPath(normalizedHash)

  // Step 3: Read compressed data from storage
  const result = await storage.get(path)
  if (!result) {
    throw new ENOENT('open', path)
  }

  // Step 4: Decompress the data
  const decompressed = await decompress(result.data)

  // Step 5: Parse git object format
  const { type, content } = parseGitObject(decompressed)

  // Step 6: Return the object
  return { type, content }
}
