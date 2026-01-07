/**
 * Object Existence Check for Content-Addressable Storage
 *
 * Checks if a git object exists in the CAS by verifying file existence
 * at the path derived from the hash. This is a fast operation that
 * only checks file existence without reading or decompressing content.
 */

import { hashToPath } from './path-mapping'

/**
 * Storage interface for checking object existence
 */
export interface HasObjectStorage {
  /**
   * Check if a file exists at the given path
   */
  exists(path: string): Promise<boolean>
}

// Module-level storage that can be set for testing
let storage: HasObjectStorage | null = null

/**
 * Set the storage backend for hasObject
 * Used primarily for testing
 */
export function setStorage(s: HasObjectStorage | null): void {
  storage = s
}

/**
 * Get the current storage backend
 */
export function getStorage(): HasObjectStorage | null {
  return storage
}

/**
 * Validate that a string is a valid hash format
 * Must be exactly 40 (SHA-1) or 64 (SHA-256) hex characters
 */
function validateHash(hash: string): void {
  // Check for empty string
  if (!hash) {
    throw new Error('Invalid hash: hash cannot be empty')
  }

  // Check length (must be exactly 40 or 64)
  if (hash.length !== 40 && hash.length !== 64) {
    throw new Error(`Invalid hash length: expected 40 (SHA-1) or 64 (SHA-256), got ${hash.length}`)
  }

  // Check for valid hex characters only (0-9, a-f, A-F)
  if (!/^[0-9a-fA-F]+$/.test(hash)) {
    throw new Error('Invalid hash: contains non-hex characters')
  }
}

/**
 * Check if an object exists in the content-addressable storage
 *
 * @param hash - 40 or 64 character hex string (SHA-1 or SHA-256)
 * @returns true if the object exists, false otherwise
 * @throws Error if the hash format is invalid
 */
export async function hasObject(hash: string): Promise<boolean> {
  // Validate hash format (will throw on invalid)
  validateHash(hash)

  // Normalize to lowercase
  const normalizedHash = hash.toLowerCase()

  // Convert hash to storage path
  const path = hashToPath(normalizedHash)

  // If no storage is configured, return false (no objects exist)
  if (!storage) {
    return false
  }

  // Check if the object exists at the path
  const exists = await storage.exists(path)

  // Return a strict boolean (not truthy/falsy)
  return exists === true
}
