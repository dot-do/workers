/**
 * rm - Remove files and directories
 *
 * Removes files and directories from the filesystem.
 * Unlike unlink (which only removes files), rm can remove directories
 * when the recursive option is set.
 */

import { ENOENT, EISDIR, ENOTEMPTY, EPERM, EINVAL, ENOTDIR } from '../core/errors'
import { normalize } from '../core/path'

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
 * Options for rm operation
 */
export interface RmOptions {
  /** Don't throw on non-existent paths */
  force?: boolean
  /** Remove directories and their contents recursively */
  recursive?: boolean
  /** Number of retries on busy errors (default: 0) */
  maxRetries?: number
  /** Delay between retries in ms (default: 100) */
  retryDelay?: number
}

/**
 * Filesystem context for rm operation
 */
export interface RmContext {
  files: Map<string, FileEntry>
  blobs?: Map<string, Uint8Array>
}

/**
 * Global filesystem context (set during testing or initialization)
 */
let globalContext: RmContext | null = null

/**
 * Set the global filesystem context
 * Used for testing or when a single filesystem instance is shared
 */
export function setContext(ctx: RmContext | null): void {
  globalContext = ctx
}

/**
 * Get the current filesystem context
 */
export function getContext(): RmContext | null {
  return globalContext
}

/**
 * Check if a directory has any children
 */
function hasChildren(ctx: RmContext, dirPath: string): boolean {
  const prefix = dirPath === '/' ? '/' : dirPath + '/'
  for (const [filePath] of ctx.files) {
    if (filePath !== dirPath && filePath.startsWith(prefix)) {
      return true
    }
  }
  return false
}

/**
 * Get all paths that are children of a directory (for recursive removal)
 */
function getChildren(ctx: RmContext, dirPath: string): string[] {
  const prefix = dirPath === '/' ? '/' : dirPath + '/'
  const children: string[] = []
  for (const [filePath] of ctx.files) {
    if (filePath !== dirPath && filePath.startsWith(prefix)) {
      children.push(filePath)
    }
  }
  return children
}

/**
 * Remove a file and its blob
 */
function removeFile(ctx: RmContext, path: string): void {
  const entry = ctx.files.get(path)
  if (entry && entry.blobId && ctx.blobs) {
    ctx.blobs.delete(entry.blobId)
  }
  ctx.files.delete(path)
}

/**
 * Removes files and directories from the filesystem.
 *
 * @param path - The path to remove
 * @param options - Options for removal behavior
 * @throws {ENOENT} If the path does not exist (unless force is true)
 * @throws {EISDIR} If path is a directory without recursive option
 * @throws {ENOTEMPTY} If path is a non-empty directory without recursive option
 * @throws {EPERM} If attempting to remove root directory
 */
export async function rm(path: string, options?: RmOptions): Promise<undefined> {
  const { force = false, recursive = false } = options ?? {}

  // Validate path - empty path is invalid
  if (!path || path.trim() === '') {
    throw new EINVAL('rm', path)
  }

  // Handle trailing slash - indicates directory intent, but for a file path this is invalid
  // A trailing slash on a non-directory should fail
  const hasTrailingSlash = path !== '/' && path.endsWith('/')

  // Normalize the path
  const normalizedPath = normalize(path)

  // Check for root path - cannot remove root
  if (normalizedPath === '/') {
    throw new EPERM('rm', normalizedPath)
  }

  const ctx = globalContext
  if (!ctx) {
    throw new Error('Filesystem context not initialized')
  }

  // Get the entry
  const entry = ctx.files.get(normalizedPath)

  // Check if entry exists
  if (!entry) {
    if (force) {
      return undefined
    }
    throw new ENOENT('rm', normalizedPath)
  }

  // Handle trailing slash on file - trailing slash implies directory
  if (hasTrailingSlash && entry.type === 'file') {
    throw new ENOTDIR('rm', path)
  }

  // Handle files and symlinks - can be removed directly
  if (entry.type === 'file' || entry.type === 'symlink') {
    removeFile(ctx, normalizedPath)
    return undefined
  }

  // Handle directories
  if (entry.type === 'directory') {
    const hasChildEntries = hasChildren(ctx, normalizedPath)

    if (!recursive) {
      // Without recursive, cannot remove directories
      if (hasChildEntries) {
        throw new ENOTEMPTY('rm', normalizedPath)
      }
      // Even empty directories require recursive flag for rm
      throw new EISDIR('rm', normalizedPath)
    }

    // With recursive, remove all children first
    if (hasChildEntries) {
      const children = getChildren(ctx, normalizedPath)
      // Sort by depth (deepest first) to remove leaf nodes first
      children.sort((a, b) => b.split('/').length - a.split('/').length)
      for (const childPath of children) {
        removeFile(ctx, childPath)
      }
    }

    // Remove the directory itself
    ctx.files.delete(normalizedPath)
    return undefined
  }

  return undefined
}
