/**
 * Hard link creation (POSIX link syscall)
 *
 * Creates a hard link to an existing file. Both paths will refer to the same
 * inode, sharing the same content and metadata.
 *
 * Constraints:
 * - Cannot hard link directories (EPERM)
 * - Source must exist (ENOENT)
 * - Destination must not exist (EEXIST)
 * - Destination parent directory must exist (ENOENT)
 */

import { ENOENT, EEXIST, EPERM } from '../core/errors'

/**
 * Filesystem context interface for link operations
 */
export interface LinkFS {
  files: Map<string, { ino: number; content: Uint8Array; nlink: number; isDirectory: boolean }>
  inodes: Map<number, { content: Uint8Array; nlink: number; isDirectory: boolean }>
  exists(path: string): boolean
}

/**
 * Create a hard link
 *
 * @param fs - Filesystem context
 * @param existingPath - Path to the existing file
 * @param newPath - Path for the new hard link
 * @throws {ENOENT} If existingPath does not exist or newPath parent does not exist
 * @throws {EEXIST} If newPath already exists
 * @throws {EPERM} If existingPath is a directory
 */
export async function link(
  fs: LinkFS,
  existingPath: string,
  newPath: string
): Promise<void> {
  const syscall = 'link'

  // Check for special paths that cannot be hard linked (. and ..)
  const existingBasename = existingPath.split('/').pop() || ''
  if (existingBasename === '.' || existingBasename === '..' || existingPath === '/') {
    throw new EPERM(syscall, existingPath)
  }

  // Check if source exists
  if (!fs.exists(existingPath)) {
    throw new ENOENT(syscall, existingPath)
  }

  // Get the source entry
  const sourceEntry = fs.files.get(existingPath)
  if (!sourceEntry) {
    throw new ENOENT(syscall, existingPath)
  }

  // Check if source is a directory (cannot hard link directories)
  if (sourceEntry.isDirectory) {
    throw new EPERM(syscall, existingPath)
  }

  // Check if destination already exists
  if (fs.exists(newPath)) {
    throw new EEXIST(syscall, newPath)
  }

  // Check if destination parent directory exists
  const destParent = newPath.substring(0, newPath.lastIndexOf('/')) || '/'
  if (destParent !== '/' && !fs.exists(destParent)) {
    throw new ENOENT(syscall, newPath)
  }

  // Create the hard link - add a new directory entry pointing to the same inode
  // Both entries share the same underlying data object
  fs.files.set(newPath, sourceEntry)

  // Increment nlink count (since both entries share the same object, this updates everywhere)
  sourceEntry.nlink++
}
