/**
 * access operation - test file accessibility
 *
 * Tests whether the calling process can access the file at the given path.
 * The mode parameter specifies the accessibility checks to perform.
 *
 * Following Node.js fs.promises.access behavior:
 * - Returns undefined if accessible (resolves with no value)
 * - Throws ENOENT if path doesn't exist
 * - Throws EACCES if permission denied
 */

import type { FileEntry } from '../core/types'
import { ENOENT, EACCES } from '../core/errors'
import { normalize } from '../core/path'
import { constants } from '../core/constants'

// Re-export constants for convenience
export const F_OK = constants.F_OK
export const R_OK = constants.R_OK
export const W_OK = constants.W_OK
export const X_OK = constants.X_OK

/**
 * Storage interface for access
 */
export interface AccessStorage {
  /**
   * Get entry by path
   */
  get(path: string): FileEntry | undefined

  /**
   * Check if path exists
   */
  has(path: string): boolean

  /**
   * Resolve a symlink chain to get the final target entry
   * Returns undefined if the symlink target doesn't exist (broken link)
   */
  resolveSymlink?(path: string, maxDepth?: number): FileEntry | undefined

  /**
   * Get current user ID (for permission checking)
   */
  getUid?(): number

  /**
   * Get current group ID (for permission checking)
   */
  getGid?(): number

  /**
   * Get current user's group memberships (for permission checking)
   */
  getGroups?(): number[]
}

// Module-level storage that can be set for testing
let storage: AccessStorage | null = null

/**
 * Set the storage backend for access
 * Used primarily for testing
 */
export function setStorage(s: AccessStorage | null): void {
  storage = s
}

/**
 * Get the current storage backend
 */
export function getStorage(): AccessStorage | null {
  return storage
}

/**
 * Check if user has the requested permission based on file mode and ownership
 */
function checkPermission(
  entry: FileEntry,
  permissionBit: number,
  uid: number,
  gid: number,
  groups: number[]
): boolean {
  const mode = entry.mode

  // Check owner permissions
  if (entry.uid === uid) {
    // Owner permission bits (shift by 6 for owner: rwx at bits 8-6)
    const ownerBit = permissionBit << 6
    return (mode & ownerBit) !== 0
  }

  // Check group permissions
  if (entry.gid === gid || groups.includes(entry.gid)) {
    // Group permission bits (shift by 3 for group: rwx at bits 5-3)
    const groupBit = permissionBit << 3
    return (mode & groupBit) !== 0
  }

  // Check other permissions (no shift needed: rwx at bits 2-0)
  return (mode & permissionBit) !== 0
}

/**
 * Test file accessibility
 *
 * @param path - Path to file or directory
 * @param mode - Accessibility checks to perform (F_OK, R_OK, W_OK, X_OK or combination)
 * @returns undefined if accessible
 * @throws ENOENT if path does not exist
 * @throws EACCES if permission denied
 */
export async function access(path: string, mode: number = F_OK): Promise<void> {
  // Normalize the path
  const normalizedPath = normalize(path)

  // Check if storage is configured
  if (!storage) {
    throw new ENOENT('access', normalizedPath)
  }

  // Look up the entry
  const entry = storage.get(normalizedPath)

  if (!entry) {
    throw new ENOENT('access', normalizedPath)
  }

  // Resolve symlinks - access follows symlinks
  let targetEntry = entry
  if (entry.type === 'symlink') {
    if (storage.resolveSymlink) {
      const resolved = storage.resolveSymlink(normalizedPath)
      if (!resolved) {
        // Broken symlink - target doesn't exist
        throw new ENOENT('access', normalizedPath)
      }
      targetEntry = resolved
    } else {
      // No resolveSymlink method available, can't follow symlink
      throw new ENOENT('access', normalizedPath)
    }
  }

  // F_OK (0) only checks existence - if we got here, file exists
  if (mode === F_OK) {
    return
  }

  // Get current user context
  const uid = storage.getUid?.() ?? 0
  const gid = storage.getGid?.() ?? 0
  const groups = storage.getGroups?.() ?? []

  // Check each requested permission
  // R_OK = 4, W_OK = 2, X_OK = 1
  if ((mode & R_OK) !== 0) {
    // Check read permission (bit 2 in others, 5 in group, 8 in owner)
    if (!checkPermission(targetEntry, 4, uid, gid, groups)) {
      throw new EACCES('access', normalizedPath)
    }
  }

  if ((mode & W_OK) !== 0) {
    // Check write permission (bit 1 in others, 4 in group, 7 in owner)
    if (!checkPermission(targetEntry, 2, uid, gid, groups)) {
      throw new EACCES('access', normalizedPath)
    }
  }

  if ((mode & X_OK) !== 0) {
    // Check execute permission (bit 0 in others, 3 in group, 6 in owner)
    if (!checkPermission(targetEntry, 1, uid, gid, groups)) {
      throw new EACCES('access', normalizedPath)
    }
  }

  // All requested permissions are granted
  return
}
