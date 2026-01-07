/**
 * copyFile operation
 *
 * Copies a file from source to destination.
 * Follows Node.js fs.promises.copyFile semantics.
 */

import { constants } from '../core/constants'
import { ENOENT, EEXIST, EISDIR } from '../core/errors'

/**
 * Storage interface that copyFile operates on
 */
export interface CopyFileStorage {
  getFile(path: string): { content: Uint8Array; metadata: { mode: number; mtime: number; birthtime: number; ctime: number } } | undefined
  addFile(path: string, content: Uint8Array, metadata?: { mode?: number; birthtime?: number }): void
  isDirectory(path: string): boolean
  isSymlink?(path: string): boolean
  getSymlinkTarget?(path: string): string | undefined
  parentExists(path: string): boolean
}

// Re-export copy flags for convenience
export const COPYFILE_EXCL = constants.COPYFILE_EXCL
export const COPYFILE_FICLONE = constants.COPYFILE_FICLONE
export const COPYFILE_FICLONE_FORCE = constants.COPYFILE_FICLONE_FORCE

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
 * Resolve symlink to get the target path
 */
function resolveSymlink(storage: CopyFileStorage, path: string): string {
  if (storage.isSymlink && storage.getSymlinkTarget) {
    if (storage.isSymlink(path)) {
      const target = storage.getSymlinkTarget(path)
      if (target) {
        return normalizePath(target)
      }
    }
  }
  return path
}

/**
 * Copy a file from source to destination
 *
 * @param storage - Storage backend
 * @param src - Source file path
 * @param dest - Destination file path
 * @param mode - Copy mode flags (optional)
 * @throws ENOENT if source file does not exist
 * @throws EEXIST if dest exists and COPYFILE_EXCL flag is set
 * @throws EISDIR if source or dest is a directory
 * @returns Promise<void>
 */
export async function copyFile(
  storage: CopyFileStorage,
  src: string,
  dest: string,
  mode?: number
): Promise<void> {
  // Normalize paths
  const normalizedSrc = normalizePath(src)
  const normalizedDest = normalizePath(dest)

  // Resolve symlinks for source
  const resolvedSrc = resolveSymlink(storage, normalizedSrc)

  // Check if source is root directory
  if (resolvedSrc === '/') {
    throw new EISDIR('copyfile', normalizedSrc)
  }

  // Check if source is a directory
  if (storage.isDirectory(resolvedSrc)) {
    throw new EISDIR('copyfile', normalizedSrc)
  }

  // Check if source exists (get the file)
  const sourceFile = storage.getFile(resolvedSrc)
  if (sourceFile === undefined) {
    throw new ENOENT('copyfile', normalizedSrc)
  }

  // Check if destination is root directory
  if (normalizedDest === '/') {
    throw new EISDIR('copyfile', normalizedDest)
  }

  // Check if destination is a directory
  if (storage.isDirectory(normalizedDest)) {
    throw new EISDIR('copyfile', normalizedDest)
  }

  // Check if destination parent directory exists
  const destParent = getParentPath(normalizedDest)
  if (destParent !== '/' && !storage.parentExists(normalizedDest)) {
    throw new ENOENT('copyfile', normalizedDest)
  }

  // Also check if parent exists but is a file (not a directory)
  if (destParent !== '/' && !storage.isDirectory(destParent)) {
    const parentFile = storage.getFile(destParent)
    if (parentFile !== undefined) {
      // Parent is a file, not a directory
      throw new ENOENT('copyfile', normalizedDest)
    }
    // Parent doesn't exist at all
    throw new ENOENT('copyfile', normalizedDest)
  }

  // Check for COPYFILE_EXCL flag - fail if destination exists
  const copyMode = mode ?? 0
  if ((copyMode & COPYFILE_EXCL) !== 0) {
    const destFile = storage.getFile(normalizedDest)
    if (destFile !== undefined) {
      throw new EEXIST('copyfile', normalizedDest)
    }
  }

  // Copy the file content and preserve the source mode
  // Note: We copy the content exactly as-is (binary safe)
  // The destination gets a new birthtime but preserves the source mode
  storage.addFile(normalizedDest, sourceFile.content, { mode: sourceFile.metadata.mode })
}
