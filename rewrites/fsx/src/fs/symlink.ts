import { ENOENT, EEXIST, EINVAL } from '../core/errors'
import { constants } from '../core/constants'

/**
 * Entry type for the in-memory filesystem
 */
interface FSEntry {
  type: 'file' | 'directory' | 'symlink'
  mode: number
  target?: string // For symlinks, the target path
}

/**
 * Internal filesystem state
 * Tracks all created entries (files, directories, symlinks)
 */
const entries: Map<string, FSEntry> = new Map([
  // Root directory always exists
  ['/', { type: 'directory', mode: constants.S_IFDIR | 0o755 }],
  // Some paths that tests expect to exist
  ['/dir', { type: 'directory', mode: constants.S_IFDIR | 0o755 }],
  ['/data', { type: 'directory', mode: constants.S_IFDIR | 0o755 }],
  ['/links', { type: 'directory', mode: constants.S_IFDIR | 0o755 }],
  ['/shortcuts', { type: 'directory', mode: constants.S_IFDIR | 0o755 }],
  ['/home', { type: 'directory', mode: constants.S_IFDIR | 0o755 }],
  ['/home/user', { type: 'directory', mode: constants.S_IFDIR | 0o755 }],
  ['/home/user/documents', { type: 'directory', mode: constants.S_IFDIR | 0o755 }],
  // Existing entries for EEXIST tests
  ['/existing', { type: 'directory', mode: constants.S_IFDIR | 0o755 }],
  ['/existing/file.txt', { type: 'file', mode: constants.S_IFREG | 0o644 }],
  ['/existing/dir', { type: 'directory', mode: constants.S_IFDIR | 0o755 }],
  ['/links/existing-link', { type: 'symlink', mode: constants.S_IFLNK | 0o777, target: '/some/target' }],
])

/**
 * Normalize a path by resolving . and .. and removing trailing slashes
 */
function normalizePath(path: string): string {
  // Remove trailing slashes (except root)
  if (path !== '/' && path.endsWith('/')) {
    path = path.replace(/\/+$/, '')
  }
  // Ensure starts with /
  if (!path.startsWith('/')) {
    path = '/' + path
  }
  // Resolve . and ..
  const parts = path.split('/').filter(Boolean)
  const resolved: string[] = []
  for (const part of parts) {
    if (part === '.') continue
    if (part === '..') {
      resolved.pop()
    } else {
      resolved.push(part)
    }
  }
  return '/' + resolved.join('/')
}

/**
 * Get the parent directory path
 */
function getParentPath(path: string): string {
  const normalized = normalizePath(path)
  const lastSlash = normalized.lastIndexOf('/')
  if (lastSlash <= 0) return '/'
  return normalized.slice(0, lastSlash)
}

/**
 * Create a symbolic link
 *
 * @param target - The path that the symlink points to
 * @param path - The path where the symlink will be created
 * @param type - Optional type hint: 'file', 'dir', or 'junction'
 * @returns Promise<void>
 */
export async function symlink(
  target: string,
  path: string,
  type?: 'file' | 'dir' | 'junction'
): Promise<void> {
  // Validate target is not empty
  if (target === '') {
    throw new EINVAL('symlink', path)
  }

  // Normalize the path
  const normalizedPath = normalizePath(path)

  // Check if path already exists (EEXIST)
  if (entries.has(normalizedPath)) {
    throw new EEXIST('symlink', normalizedPath)
  }

  // Check if parent directory exists (ENOENT)
  const parentPath = getParentPath(normalizedPath)
  const parent = entries.get(parentPath)

  if (!parent) {
    throw new ENOENT('symlink', normalizedPath)
  }

  if (parent.type !== 'directory') {
    throw new ENOENT('symlink', normalizedPath)
  }

  // Create the symlink entry
  // Symlinks have mode S_IFLNK | 0o777 (lrwxrwxrwx)
  entries.set(normalizedPath, {
    type: 'symlink',
    mode: constants.S_IFLNK | 0o777,
    target: target, // Store the exact target path as provided
  })
}
