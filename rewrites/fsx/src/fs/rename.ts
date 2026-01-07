/**
 * rename - Move/rename a file or directory
 *
 * Atomically renames/moves a file or directory from oldPath to newPath.
 * If newPath exists, it will be atomically replaced (with some exceptions).
 */

import { ENOENT, EISDIR, ENOTDIR, ENOTEMPTY, EINVAL } from '../core/errors'
import { normalize, dirname, basename } from '../core/path'

/**
 * File entry in the virtual filesystem
 */
export interface FileEntry {
  type: 'file' | 'directory' | 'symlink'
  content?: Uint8Array
  target?: string // for symlinks
  blobId?: string
  mode?: number
  mtime?: number
  ctime?: number
}

/**
 * Filesystem context for rename operation
 */
export interface RenameContext {
  files: Map<string, FileEntry>
  blobs?: Map<string, Uint8Array>
}

/**
 * Global filesystem context (set during testing or initialization)
 */
let globalContext: RenameContext | null = null

/**
 * Set the global filesystem context
 * Used for testing or when a single filesystem instance is shared
 */
export function setContext(ctx: RenameContext | null): void {
  globalContext = ctx
}

/**
 * Get the current filesystem context
 */
export function getContext(): RenameContext | null {
  return globalContext
}

/**
 * Renames/moves a file or directory from oldPath to newPath.
 *
 * @param oldPath - The current path of the file or directory
 * @param newPath - The new path for the file or directory
 * @throws {ENOENT} If oldPath does not exist, or newPath parent does not exist
 * @throws {EISDIR} If oldPath is a file but newPath is a directory
 * @throws {ENOTDIR} If oldPath is a directory but newPath is a file
 * @throws {ENOTEMPTY} If newPath is a non-empty directory
 * @throws {EINVAL} If newPath is inside oldPath (cannot move directory into itself)
 */
export async function rename(oldPath: string, newPath: string): Promise<void> {
  // Stub implementation - always throws ENOENT
  // This will cause all tests to fail until properly implemented
  throw new ENOENT('rename', oldPath)
}
