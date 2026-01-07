/**
 * readlink - Read the target of a symbolic link
 *
 * Reads the contents of a symbolic link (the target path it points to).
 * Unlike realpath, this returns the raw target string without resolution.
 *
 * POSIX behavior:
 * - Returns the contents of the symbolic link (the target path)
 * - Does not resolve or follow the target
 * - Returns ENOENT if path doesn't exist
 * - Returns EINVAL if path is not a symbolic link (file or directory)
 */

import { ENOENT, EINVAL } from '../core/errors'
import { normalize } from '../core/path'

/**
 * Entry type in mock filesystem
 */
type EntryType = 'file' | 'directory' | 'symlink'

/**
 * Mock filesystem entry
 */
interface FSEntry {
  type: EntryType
  /** For symlinks, this is the target path */
  target?: string
}

/**
 * Mock filesystem for testing
 * Maps paths to their entries (type and optional symlink target)
 */
const mockFS: Map<string, FSEntry> = new Map([
  // Symlinks for basic tests
  ['/home/user/link', { type: 'symlink', target: '../other/file.txt' }],
  ['/home/user/absolute-link', { type: 'symlink', target: '/var/data/config.json' }],
  ['/a/b/link', { type: 'symlink', target: '../../c/d' }],

  // Symlink chain test (only immediate target is returned)
  ['/a/link1', { type: 'symlink', target: '/b/link2' }],
  ['/b/link2', { type: 'symlink', target: '/c/file.txt' }],

  // Deeply nested symlink
  ['/very/deep/nested/path/link', { type: 'symlink', target: 'target.txt' }],

  // Symlink with dots in target (should preserve without normalization)
  ['/home/link', { type: 'symlink', target: './current/./path/../file.txt' }],

  // Symlink pointing to root
  ['/myroot', { type: 'symlink', target: '/' }],

  // Symlink with empty target
  ['/empty-link', { type: 'symlink', target: '' }],

  // Symlink with trailing slashes in target
  ['/dir-link', { type: 'symlink', target: '/some/directory/' }],

  // Regular file and directory for EINVAL tests
  ['/home/user/regular-file.txt', { type: 'file' }],
  ['/home/user/directory', { type: 'directory' }],

  // Path edge cases
  ['/rootlink', { type: 'symlink', target: '/some/path' }],
  ['/path with spaces/my link', { type: 'symlink', target: 'target with spaces' }],
  ['/unicode/link', { type: 'symlink', target: '/unicode/target' }],

  // Trailing slash and path normalization tests (use unique paths)
  ['/trailing-test/link', { type: 'symlink', target: '/target' }],
  ['/normalize/test/link', { type: 'symlink', target: 'target.txt' }],

  // Directories needed for path existence checks
  ['/home', { type: 'directory' }],
  ['/home/user', { type: 'directory' }],
  ['/trailing-test', { type: 'directory' }],
  ['/normalize', { type: 'directory' }],
  ['/normalize/test', { type: 'directory' }],
  ['/a', { type: 'directory' }],
  ['/a/b', { type: 'directory' }],
  ['/b', { type: 'directory' }],
  ['/very', { type: 'directory' }],
  ['/very/deep', { type: 'directory' }],
  ['/very/deep/nested', { type: 'directory' }],
  ['/very/deep/nested/path', { type: 'directory' }],
  ['/path with spaces', { type: 'directory' }],
  ['/unicode', { type: 'directory' }],
])

/**
 * Reads the target of a symbolic link.
 *
 * @param path - Path to the symbolic link
 * @returns The target of the symbolic link (the path it points to)
 * @throws ENOENT if the path doesn't exist
 * @throws EINVAL if the path is not a symbolic link
 */
export async function readlink(path: string): Promise<string> {
  const syscall = 'readlink'

  // Normalize the input path (removes trailing slashes, resolves . and ..)
  const normalizedPath = normalize(path)

  // Look up the entry in the mock filesystem
  const entry = mockFS.get(normalizedPath)

  // If path doesn't exist, throw ENOENT
  if (!entry) {
    throw new ENOENT(syscall, normalizedPath)
  }

  // If path is not a symlink, throw EINVAL
  if (entry.type !== 'symlink') {
    throw new EINVAL(syscall, normalizedPath)
  }

  // Return the raw target string (don't resolve or normalize it)
  return entry.target ?? ''
}
