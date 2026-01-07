/**
 * unlink - Remove a file from the filesystem
 *
 * Removes a file or symlink from the filesystem.
 * Does NOT remove directories (use rmdir for that).
 */

import { ENOENT, EISDIR, EINVAL } from '../core/errors'
import { normalize, dirname, basename } from '../core/path'

/**
 * File entry in the virtual filesystem
 */
export interface FileEntry {
  type: 'file' | 'directory' | 'symlink'
  content?: Uint8Array
  target?: string // for symlinks
  blobId?: string
}

/**
 * Filesystem context for unlink operation
 */
export interface UnlinkContext {
  files: Map<string, FileEntry>
  blobs?: Map<string, Uint8Array>
}

/**
 * Global filesystem context (set during testing or initialization)
 */
let globalContext: UnlinkContext | null = null

/**
 * Set the global filesystem context
 * Used for testing or when a single filesystem instance is shared
 */
export function setContext(ctx: UnlinkContext | null): void {
  globalContext = ctx
}

/**
 * Get the current filesystem context
 */
export function getContext(): UnlinkContext | null {
  return globalContext
}

/**
 * Removes a file from the filesystem.
 *
 * @param path - The path to the file to remove
 * @throws {ENOENT} If the file does not exist
 * @throws {EISDIR} If the path is a directory (use rmdir for directories)
 * @throws {EINVAL} If the path is empty
 */
export async function unlink(path: string): Promise<void> {
  // Validate path
  if (!path || path.trim() === '') {
    throw new ENOENT('unlink', path)
  }

  // Normalize the path
  const normalizedPath = normalize(path)

  // Check for root path
  if (normalizedPath === '/') {
    throw new EISDIR('unlink', normalizedPath)
  }

  // Handle trailing slash - indicates directory intent
  if (path !== '/' && path.endsWith('/')) {
    // Path with trailing slash should be treated as invalid for unlink
    // (directories can't be unlinked, and trailing slash typically means directory)
    throw new ENOENT('unlink', path)
  }

  const ctx = globalContext
  if (!ctx) {
    throw new Error('Filesystem context not initialized')
  }

  // Get the file entry
  const entry = ctx.files.get(normalizedPath)

  // Check if file exists
  if (!entry) {
    throw new ENOENT('unlink', normalizedPath)
  }

  // Check if it's a directory
  if (entry.type === 'directory') {
    throw new EISDIR('unlink', normalizedPath)
  }

  // For symlinks, we remove the symlink itself (not the target)
  // This is the correct POSIX behavior

  // If the file has a blob, decrement its reference count or remove it
  if (entry.blobId && ctx.blobs) {
    ctx.blobs.delete(entry.blobId)
  }

  // Remove the file entry
  ctx.files.delete(normalizedPath)

  // Return undefined on success (POSIX behavior)
  return undefined
}
