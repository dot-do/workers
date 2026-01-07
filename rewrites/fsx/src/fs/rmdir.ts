/**
 * rmdir operation - Remove directories from the virtual filesystem
 */

import { ENOENT, ENOTDIR, ENOTEMPTY, EINVAL } from '../core/errors'
import { normalize } from '../core/path'

/**
 * Options for rmdir operation
 */
export interface RmdirOptions {
  /**
   * Remove directory and all contents recursively (like rm -rf)
   * @default false
   */
  recursive?: boolean
}

/**
 * Filesystem context interface (to be implemented)
 */
interface FSContext {
  entries: Map<string, { type: 'file' | 'directory'; mode: number }>
}

/**
 * Check if a directory has any children in the filesystem
 */
function hasChildren(entries: Map<string, { type: 'file' | 'directory'; mode: number }>, dirPath: string): boolean {
  const prefix = dirPath === '/' ? '/' : dirPath + '/'
  for (const key of entries.keys()) {
    if (key !== dirPath && key.startsWith(prefix)) {
      return true
    }
  }
  return false
}

/**
 * Get all entries that are children of a directory (for recursive removal)
 */
function getChildren(entries: Map<string, { type: 'file' | 'directory'; mode: number }>, dirPath: string): string[] {
  const prefix = dirPath === '/' ? '/' : dirPath + '/'
  const children: string[] = []
  for (const key of entries.keys()) {
    if (key !== dirPath && key.startsWith(prefix)) {
      children.push(key)
    }
  }
  return children
}

/**
 * Remove a directory
 *
 * @param ctx - Filesystem context
 * @param path - Directory path to remove
 * @param options - Optional configuration (recursive)
 * @returns undefined on success
 * @throws {ENOENT} If directory doesn't exist
 * @throws {ENOTDIR} If path is not a directory
 * @throws {ENOTEMPTY} If directory is not empty and recursive is false
 * @throws {EINVAL} If path is invalid
 */
export async function rmdir(
  ctx: FSContext,
  path: string,
  options?: RmdirOptions
): Promise<undefined> {
  // Validate path - empty or whitespace-only is invalid
  if (!path || path.trim() === '') {
    throw new EINVAL('rmdir', path)
  }

  const normalizedPath = normalize(path)

  // Cannot remove root directory
  if (normalizedPath === '/') {
    throw new EINVAL('rmdir', normalizedPath)
  }

  const recursive = options?.recursive ?? false

  // Check if path exists
  const entry = ctx.entries.get(normalizedPath)
  if (!entry) {
    throw new ENOENT('rmdir', normalizedPath)
  }

  // Check if path is a directory
  if (entry.type !== 'directory') {
    throw new ENOTDIR('rmdir', normalizedPath)
  }

  // Check if directory is empty (unless recursive)
  if (!recursive && hasChildren(ctx.entries, normalizedPath)) {
    throw new ENOTEMPTY('rmdir', normalizedPath)
  }

  // If recursive, remove all children first
  if (recursive) {
    const children = getChildren(ctx.entries, normalizedPath)
    for (const child of children) {
      ctx.entries.delete(child)
    }
  }

  // Remove the directory itself
  ctx.entries.delete(normalizedPath)

  return undefined
}
