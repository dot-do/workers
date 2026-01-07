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
  const ctx = getContext()
  if (!ctx) {
    throw new Error('No filesystem context set')
  }

  // Normalize both paths
  const normalizedOldPath = normalize(oldPath)
  const normalizedNewPath = normalize(newPath)

  // Handle empty paths
  if (normalizedOldPath === '' || normalizedOldPath === '.') {
    throw new ENOENT('rename', oldPath)
  }
  if (normalizedNewPath === '' || normalizedNewPath === '.') {
    throw new ENOENT('rename', newPath)
  }

  // Check if oldPath exists
  const oldEntry = ctx.files.get(normalizedOldPath)
  if (!oldEntry) {
    throw new ENOENT('rename', normalizedOldPath)
  }

  // Check for EINVAL: cannot move directory into itself
  // This check must come BEFORE parent directory check, because if we're
  // moving into ourselves, the parent might not exist (e.g. /dir1/subdir/deep/inside)
  // This applies only to directories
  if (oldEntry.type === 'directory') {
    // newPath is inside oldPath if newPath starts with oldPath + '/'
    if (normalizedNewPath.startsWith(normalizedOldPath + '/')) {
      throw new EINVAL('rename', normalizedOldPath)
    }
  }

  // Check if newPath parent directory exists
  const newParentPath = dirname(normalizedNewPath)
  if (newParentPath !== '/') {
    const newParentEntry = ctx.files.get(newParentPath)
    if (!newParentEntry || newParentEntry.type !== 'directory') {
      throw new ENOENT('rename', normalizedNewPath)
    }
  }

  // If renaming to the same path, it's a no-op
  if (normalizedOldPath === normalizedNewPath) {
    return
  }

  // Check if newPath exists and handle overwrite cases
  const newEntry = ctx.files.get(normalizedNewPath)
  if (newEntry) {
    // Handle type conflicts and overwrite rules
    const oldIsDir = oldEntry.type === 'directory'
    const newIsDir = newEntry.type === 'directory'
    const oldIsFile = oldEntry.type === 'file' || oldEntry.type === 'symlink'
    const newIsFile = newEntry.type === 'file' || newEntry.type === 'symlink'

    if (oldIsFile && newIsDir) {
      // Cannot overwrite directory with file
      throw new EISDIR('rename', normalizedNewPath)
    }

    if (oldIsDir && newIsFile) {
      // Cannot overwrite file with directory
      throw new ENOTDIR('rename', normalizedNewPath)
    }

    if (oldIsDir && newIsDir) {
      // Can only overwrite an empty directory
      if (isDirectoryNonEmpty(ctx.files, normalizedNewPath)) {
        throw new ENOTEMPTY('rename', normalizedNewPath)
      }
      // Remove the empty target directory
      ctx.files.delete(normalizedNewPath)
    }

    // For file overwriting file, we'll just replace below
  }

  // Perform the rename
  if (oldEntry.type === 'directory') {
    // Move the directory and all its contents
    const pathsToMove: Array<[string, FileEntry]> = []

    // Collect all paths under oldPath (including oldPath itself)
    for (const [path, entry] of ctx.files) {
      if (path === normalizedOldPath || path.startsWith(normalizedOldPath + '/')) {
        pathsToMove.push([path, entry])
      }
    }

    // Delete old paths
    for (const [path] of pathsToMove) {
      ctx.files.delete(path)
    }

    // Add new paths
    for (const [path, entry] of pathsToMove) {
      const relativePath = path.slice(normalizedOldPath.length)
      const newFullPath = normalizedNewPath + relativePath
      ctx.files.set(newFullPath, entry)
    }
  } else {
    // Move a single file or symlink
    ctx.files.delete(normalizedOldPath)
    ctx.files.set(normalizedNewPath, oldEntry)
  }
}

/**
 * Check if a directory is non-empty (has children)
 */
function isDirectoryNonEmpty(files: Map<string, FileEntry>, dirPath: string): boolean {
  const prefix = dirPath + '/'
  for (const path of files.keys()) {
    if (path.startsWith(prefix)) {
      return true
    }
  }
  return false
}
