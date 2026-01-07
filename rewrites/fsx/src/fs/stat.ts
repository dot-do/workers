/**
 * stat operation - get file/directory metadata (follows symlinks)
 *
 * Unlike lstat, stat follows symbolic links and returns information
 * about the target file/directory rather than the symlink itself.
 */

import { Stats, type FileEntry } from '../core/types'
import { ENOENT, ENOTDIR } from '../core/errors'
import { normalize } from '../core/path'
import { constants } from '../core/constants'

/**
 * Storage interface for stat
 */
export interface StatStorage {
  /**
   * Get entry by path (does NOT follow symlinks - raw entry lookup)
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
}

// Module-level storage that can be set for testing
let storage: StatStorage | null = null

/**
 * Set the storage backend for stat
 * Used primarily for testing
 */
export function setStorage(s: StatStorage | null): void {
  storage = s
}

/**
 * Get the current storage backend
 */
export function getStorage(): StatStorage | null {
  return storage
}

/**
 * Follow symlink chain and return target entry
 * Internal implementation for resolving symlinks
 */
function resolveSymlinkChain(
  startEntry: FileEntry,
  originalPath: string,
  maxDepth: number = 40
): FileEntry {
  if (!storage) {
    throw new ENOENT('stat', originalPath)
  }

  let current = startEntry
  let depth = 0

  while (current.type === 'symlink' && current.linkTarget) {
    if (depth >= maxDepth) {
      // Too many levels of symbolic links - but for stat we throw ENOENT
      // since we can't reach the target
      throw new ENOENT('stat', originalPath)
    }

    // Resolve the target path
    let targetPath = current.linkTarget
    if (!targetPath.startsWith('/')) {
      // Relative symlink - resolve relative to symlink's parent directory
      const parentDir = current.path.substring(0, current.path.lastIndexOf('/')) || '/'
      targetPath = normalize(parentDir + '/' + targetPath)
    } else {
      targetPath = normalize(targetPath)
    }

    // Use storage's resolveSymlink if available, otherwise do manual lookup
    if (storage.resolveSymlink) {
      const resolved = storage.resolveSymlink(current.path, maxDepth - depth)
      if (!resolved) {
        throw new ENOENT('stat', originalPath)
      }
      return resolved
    }

    // Manual lookup
    const target = storage.get(targetPath)
    if (!target) {
      // Broken symlink
      throw new ENOENT('stat', originalPath)
    }

    current = target
    depth++
  }

  return current
}

/**
 * Build Stats object from FileEntry
 */
function buildStats(entry: FileEntry): Stats {
  // Determine mode based on file type
  let mode = entry.mode

  // Ensure the file type bits are set correctly
  const existingType = mode & constants.S_IFMT
  if (existingType === 0) {
    // No file type set, add it based on entry.type
    switch (entry.type) {
      case 'file':
        mode |= constants.S_IFREG
        break
      case 'directory':
        mode |= constants.S_IFDIR
        break
      case 'symlink':
        mode |= constants.S_IFLNK
        break
      case 'block':
        mode |= constants.S_IFBLK
        break
      case 'character':
        mode |= constants.S_IFCHR
        break
      case 'fifo':
        mode |= constants.S_IFIFO
        break
      case 'socket':
        mode |= constants.S_IFSOCK
        break
    }
  }

  return new Stats({
    dev: 1, // Virtual filesystem device ID
    ino: parseInt(entry.id, 10) || hashCode(entry.id), // Use id as inode
    mode,
    nlink: entry.nlink,
    uid: entry.uid,
    gid: entry.gid,
    rdev: 0,
    size: entry.size,
    blksize: 4096, // Standard block size
    blocks: Math.ceil(entry.size / 512), // Number of 512-byte blocks
    atimeMs: entry.atime,
    mtimeMs: entry.mtime,
    ctimeMs: entry.ctime,
    birthtimeMs: entry.birthtime,
  })
}

/**
 * Simple hash function for string IDs
 */
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

/**
 * Get file status (follows symbolic links)
 *
 * @param path - Path to file, directory, or symlink
 * @returns Stats object with file metadata
 * @throws ENOENT if path does not exist
 * @throws ENOENT if symlink target does not exist (broken symlink)
 */
export async function stat(path: string): Promise<Stats> {
  // Handle trailing slash for files - this should fail for files
  const hadTrailingSlash = path.length > 1 && path.endsWith('/')

  // Normalize the path
  const normalizedPath = normalize(path)

  // Check if storage is configured
  if (!storage) {
    throw new ENOENT('stat', normalizedPath)
  }

  // Look up the entry
  const entry = storage.get(normalizedPath)

  if (!entry) {
    throw new ENOENT('stat', normalizedPath)
  }

  // Follow symlinks
  let targetEntry = entry
  if (entry.type === 'symlink') {
    targetEntry = resolveSymlinkChain(entry, normalizedPath)
  }

  // If original path had trailing slash but target is a file, throw ENOTDIR
  if (hadTrailingSlash && targetEntry.type === 'file') {
    throw new ENOTDIR('stat', normalizedPath)
  }

  return buildStats(targetEntry)
}
