/**
 * mkdir operation - Create directories in the virtual filesystem
 */

import { ENOENT, EEXIST, ENOTDIR, EINVAL } from '../core/errors'
import { normalize, dirname } from '../core/path'

/**
 * Options for mkdir operation
 */
export interface MkdirOptions {
  /**
   * File mode (permission bits) for the new directory
   * @default 0o777
   */
  mode?: number | string
  /**
   * Create parent directories as needed (like mkdir -p)
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
 * Parse mode from number or string
 */
function parseMode(mode: number | string | undefined): number {
  if (mode === undefined) {
    return 0o777
  }
  if (typeof mode === 'number') {
    return mode
  }
  // Parse octal string like '0755'
  return parseInt(mode, 8)
}

/**
 * Get all ancestor paths from root to (but not including) the given path
 */
function getAncestors(normalizedPath: string): string[] {
  const ancestors: string[] = []
  let current = dirname(normalizedPath)

  while (current !== normalizedPath) {
    ancestors.unshift(current)
    if (current === '/') break
    normalizedPath = current
    current = dirname(current)
  }

  return ancestors
}

/**
 * Get all paths that need to be created for recursive mkdir
 */
function getPathsToCreate(normalizedPath: string, entries: Map<string, { type: 'file' | 'directory'; mode: number }>): string[] {
  const paths: string[] = []

  // Build the list of paths from root to target
  const segments = normalizedPath.split('/').filter(s => s !== '')
  let current = ''

  for (const segment of segments) {
    current = current + '/' + segment
    if (!entries.has(current)) {
      paths.push(current)
    }
  }

  return paths
}

/**
 * Create a directory
 *
 * @param ctx - Filesystem context
 * @param path - Directory path to create
 * @param options - Optional configuration (mode, recursive)
 * @returns undefined for non-recursive, or first created path for recursive
 * @throws {EEXIST} If path already exists
 * @throws {ENOENT} If parent doesn't exist and recursive is false
 * @throws {ENOTDIR} If a parent component is not a directory
 * @throws {EINVAL} If path is invalid
 */
export async function mkdir(
  ctx: FSContext,
  path: string,
  options?: MkdirOptions
): Promise<string | undefined> {
  // Validate path
  if (!path || path.trim() === '') {
    throw new EINVAL('mkdir', path)
  }

  const normalizedPath = normalize(path)
  const recursive = options?.recursive ?? false
  const mode = parseMode(options?.mode)

  // Check if path already exists
  const existing = ctx.entries.get(normalizedPath)
  if (existing) {
    if (recursive) {
      // Recursive mode: if directory exists, return undefined silently
      return undefined
    }
    // Non-recursive mode: throw EEXIST
    throw new EEXIST('mkdir', normalizedPath)
  }

  // Check ancestors for ENOTDIR errors (a file in the path)
  const ancestors = getAncestors(normalizedPath)
  for (const ancestor of ancestors) {
    const entry = ctx.entries.get(ancestor)
    if (entry && entry.type === 'file') {
      throw new ENOTDIR('mkdir', ancestor)
    }
  }

  if (recursive) {
    // Get all paths that need to be created
    const pathsToCreate = getPathsToCreate(normalizedPath, ctx.entries)

    if (pathsToCreate.length === 0) {
      // Nothing to create (all paths exist)
      return undefined
    }

    // Create all directories
    for (const p of pathsToCreate) {
      ctx.entries.set(p, { type: 'directory', mode })
    }

    // Return the first created path
    return pathsToCreate[0]
  } else {
    // Non-recursive: check that parent exists
    const parent = dirname(normalizedPath)
    const parentEntry = ctx.entries.get(parent)

    if (!parentEntry) {
      throw new ENOENT('mkdir', normalizedPath)
    }

    if (parentEntry.type !== 'directory') {
      throw new ENOTDIR('mkdir', parent)
    }

    // Create the directory
    ctx.entries.set(normalizedPath, { type: 'directory', mode })

    return undefined
  }
}
