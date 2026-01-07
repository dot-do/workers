/**
 * lstat - get file/directory metadata without following symlinks
 *
 * Unlike stat(), lstat() returns information about the symlink itself,
 * not the file it points to.
 */

import { Stats } from '../core/types'
import { ENOENT } from '../core/errors'
import { normalize } from '../core/path'
import { constants } from '../core/constants'

/**
 * Entry type in mock filesystem
 */
type EntryType = 'file' | 'directory' | 'symlink'

/**
 * Mock filesystem entry
 */
interface FSEntry {
  type: EntryType
  /** Content for files (as Uint8Array) */
  content?: Uint8Array
  /** For symlinks, this is the target path */
  target?: string
  /** Inode number */
  ino?: number
  /** File mode (permissions) */
  mode?: number
  /** Number of hard links */
  nlink?: number
  /** User ID */
  uid?: number
  /** Group ID */
  gid?: number
  /** Access time in ms */
  atime?: number
  /** Modification time in ms */
  mtime?: number
  /** Change time in ms */
  ctime?: number
  /** Birth time in ms */
  birthtime?: number
}

// Default timestamps (some time in the past)
const DEFAULT_TIME = Date.now() - 86400000 // 24 hours ago

// Inode counter for generating unique inodes
let inodeCounter = 1000

/**
 * Generate a unique inode number
 */
function nextInode(): number {
  return ++inodeCounter
}

/**
 * Mock filesystem for testing
 * Maps paths to their entries (type, content, symlink target, etc.)
 */
const mockFS: Map<string, FSEntry> = new Map([
  // Root directory
  ['/', { type: 'directory', ino: 1, mode: 0o755, nlink: 2 }],

  // Home directory structure
  ['/home', { type: 'directory', ino: nextInode(), mode: 0o755, nlink: 3 }],
  ['/home/user', { type: 'directory', ino: nextInode(), mode: 0o755, nlink: 4 }],
  ['/home/user/file.txt', { type: 'file', ino: nextInode(), mode: 0o644, content: new TextEncoder().encode('Hello, World!'), nlink: 1 }],
  ['/home/user/document.txt', { type: 'file', ino: nextInode(), mode: 0o644, content: new TextEncoder().encode('Document content'), nlink: 1 }],
  ['/home/user/hello.txt', { type: 'file', ino: nextInode(), mode: 0o644, content: new TextEncoder().encode('Hello'), nlink: 1 }],
  ['/home/user/empty.txt', { type: 'file', ino: nextInode(), mode: 0o644, content: new Uint8Array(0), nlink: 1 }],
  ['/home/user/documents', { type: 'directory', ino: nextInode(), mode: 0o755, nlink: 2 }],
  ['/home/user/link', { type: 'symlink', ino: nextInode(), mode: 0o777, target: '/home/user/target.txt', nlink: 1 }],
  ['/home/user/target.txt', { type: 'file', ino: nextInode(), mode: 0o644, content: new TextEncoder().encode('Target content'), nlink: 1 }],
  ['/home/user/my documents', { type: 'directory', ino: nextInode(), mode: 0o755, nlink: 2 }],
  ['/home/user/my documents/file.txt', { type: 'file', ino: nextInode(), mode: 0o644, content: new TextEncoder().encode('Spaced file'), nlink: 1 }],
  ['/home/user/archivo.txt', { type: 'file', ino: nextInode(), mode: 0o644, content: new TextEncoder().encode('Unicode content'), nlink: 1 }],
  ['/home/user/regular-file.txt', { type: 'file', ino: nextInode(), mode: 0o644, content: new TextEncoder().encode('Regular file'), nlink: 1 }],
  ['/home/user/directory', { type: 'directory', ino: nextInode(), mode: 0o755, nlink: 2 }],

  // Links directory with various symlink scenarios
  ['/links', { type: 'directory', ino: nextInode(), mode: 0o755, nlink: 2 }],
  ['/links/mylink', { type: 'symlink', ino: nextInode(), mode: 0o777, target: '/data/largefile.bin', nlink: 1 }],
  ['/links/file-link', { type: 'symlink', ino: nextInode(), mode: 0o777, target: '/data/file.txt', nlink: 1 }],
  ['/links/dir-link', { type: 'symlink', ino: nextInode(), mode: 0o777, target: '/data/directory', nlink: 1 }],
  ['/links/link', { type: 'symlink', ino: nextInode(), mode: 0o777, target: '/path/to/target', nlink: 1 }],
  ['/links/broken', { type: 'symlink', ino: nextInode(), mode: 0o777, target: '/nonexistent/target', nlink: 1 }],
  ['/links/broken-symlink', { type: 'symlink', ino: nextInode(), mode: 0o777, target: '/does/not/exist', nlink: 1 }],
  ['/links/long-target-link', { type: 'symlink', ino: nextInode(), mode: 0o777, target: '/very/long/path/that/goes/on/and/on/and/on/to/simulate/a/really/long/symlink/target/path/that/exceeds/one/hundred/characters', nlink: 1 }],
  ['/links/dot', { type: 'symlink', ino: nextInode(), mode: 0o777, target: '.', nlink: 1 }],
  ['/links/dotdot', { type: 'symlink', ino: nextInode(), mode: 0o777, target: '..', nlink: 1 }],

  // Data directory with targets
  ['/data', { type: 'directory', ino: nextInode(), mode: 0o755, nlink: 3 }],
  ['/data/largefile.bin', { type: 'file', ino: nextInode(), mode: 0o644, content: new Uint8Array(1024 * 1024), nlink: 1 }], // 1MB file
  ['/data/file.txt', { type: 'file', ino: nextInode(), mode: 0o644, content: new TextEncoder().encode('Data file'), nlink: 1 }],
  ['/data/directory', { type: 'directory', ino: nextInode(), mode: 0o755, nlink: 2 }],
  ['/data/target', { type: 'file', ino: nextInode(), mode: 0o644, content: new TextEncoder().encode('Target'), nlink: 1 }],

  // Symlink chain: /link -> /target
  ['/link', { type: 'symlink', ino: nextInode(), mode: 0o777, target: '/target', nlink: 1 }],
  ['/target', { type: 'file', ino: nextInode(), mode: 0o644, content: new TextEncoder().encode('Target file'), nlink: 1 }],

  // Symlink to symlink: /link1 -> /link2 -> /target
  ['/link1', { type: 'symlink', ino: nextInode(), mode: 0o777, target: '/link2', nlink: 1 }],
  ['/link2', { type: 'symlink', ino: nextInode(), mode: 0o777, target: '/final-target', nlink: 1 }],
  ['/final-target', { type: 'file', ino: nextInode(), mode: 0o644, content: new TextEncoder().encode('Final'), nlink: 1 }],

  // Circular symlinks: /circular/a -> /circular/b and /circular/b -> /circular/a
  ['/circular', { type: 'directory', ino: nextInode(), mode: 0o755, nlink: 2 }],
  ['/circular/a', { type: 'symlink', ino: nextInode(), mode: 0o777, target: '/circular/b', nlink: 1 }],
  ['/circular/b', { type: 'symlink', ino: nextInode(), mode: 0o777, target: '/circular/a', nlink: 1 }],

  // Absolute path test
  ['/absolute', { type: 'directory', ino: nextInode(), mode: 0o755, nlink: 2 }],
  ['/absolute/path', { type: 'directory', ino: nextInode(), mode: 0o755, nlink: 2 }],
  ['/absolute/path/to', { type: 'directory', ino: nextInode(), mode: 0o755, nlink: 2 }],
  ['/absolute/path/to/file.txt', { type: 'file', ino: nextInode(), mode: 0o644, content: new TextEncoder().encode('Absolute'), nlink: 1 }],

  // Path test
  ['/path', { type: 'directory', ino: nextInode(), mode: 0o755, nlink: 2 }],
  ['/path/to', { type: 'directory', ino: nextInode(), mode: 0o755, nlink: 2 }],
  ['/path/to/target', { type: 'file', ino: nextInode(), mode: 0o644, content: new TextEncoder().encode('Path target'), nlink: 1 }],
])

/**
 * Build mode value from entry type and permissions
 */
function buildMode(entry: FSEntry): number {
  let typeFlag: number
  switch (entry.type) {
    case 'file':
      typeFlag = constants.S_IFREG
      break
    case 'directory':
      typeFlag = constants.S_IFDIR
      break
    case 'symlink':
      typeFlag = constants.S_IFLNK
      break
    default:
      typeFlag = constants.S_IFREG
  }

  // Combine type flag with permissions
  const perms = entry.mode ?? 0o644
  return typeFlag | (perms & 0o777)
}

/**
 * Get the size of an entry
 * For files: content length
 * For directories: 4096 (typical block size)
 * For symlinks: length of target path string
 */
function getSize(entry: FSEntry): number {
  switch (entry.type) {
    case 'file':
      return entry.content?.length ?? 0
    case 'directory':
      return 4096
    case 'symlink':
      return entry.target?.length ?? 0
    default:
      return 0
  }
}

/**
 * Get file/directory statistics without following symbolic links.
 *
 * @param path - Path to the file, directory, or symlink
 * @returns Stats object with file metadata
 * @throws ENOENT if path does not exist
 */
export async function lstat(path: string): Promise<Stats> {
  const syscall = 'lstat'

  // Normalize the input path (removes trailing slashes, resolves . and ..)
  const normalizedPath = normalize(path)

  // Look up the entry in the mock filesystem (DO NOT follow symlinks)
  const entry = mockFS.get(normalizedPath)

  // If path doesn't exist, throw ENOENT
  if (!entry) {
    throw new ENOENT(syscall, normalizedPath)
  }

  // Build mode with file type and permissions
  const mode = buildMode(entry)

  // Get size based on entry type
  const size = getSize(entry)

  // Use stored timestamps or defaults
  const now = DEFAULT_TIME
  const atimeMs = entry.atime ?? now
  const mtimeMs = entry.mtime ?? now
  const ctimeMs = entry.ctime ?? now
  const birthtimeMs = entry.birthtime ?? now

  // Create and return Stats object
  return new Stats({
    dev: 1, // Device ID (constant for mock FS)
    ino: entry.ino ?? nextInode(),
    mode,
    nlink: entry.nlink ?? 1,
    uid: entry.uid ?? 0,
    gid: entry.gid ?? 0,
    rdev: 0, // Not a device
    size,
    blksize: 4096,
    blocks: Math.ceil(size / 512),
    atimeMs,
    mtimeMs,
    ctimeMs,
    birthtimeMs,
  })
}
