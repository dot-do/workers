/**
 * readdir - Read directory contents
 */

import { Dirent, type ReaddirOptions } from '../core/types'
import { ENOENT, ENOTDIR } from '../core/errors'
import { normalize, join } from '../core/path'

/**
 * File type in mock filesystem
 */
type FileType = 'file' | 'directory' | 'symlink'

/**
 * Mock filesystem entry
 */
interface FSEntry {
  type: FileType
  name: string
}

/**
 * Mock filesystem for testing
 * In production, this will be replaced with actual storage backend integration
 */
const mockFS: Map<string, FSEntry[]> = new Map([
  // Basic directories
  ['/', [
    { type: 'directory', name: 'test' },
  ]],
  ['/test', [
    { type: 'directory', name: 'dir' },
    { type: 'directory', name: 'dir-with-files' },
    { type: 'directory', name: 'dir-with-subdirs' },
    { type: 'directory', name: 'mixed-dir' },
    { type: 'directory', name: 'empty-dir' },
    { type: 'directory', name: 'nested-dir' },
    { type: 'directory', name: 'deep-nested' },
    { type: 'directory', name: 'dir-with-hidden' },
    { type: 'directory', name: 'dir-with-special' },
    { type: 'directory', name: 'dir-with-unicode' },
    { type: 'directory', name: 'dir-with-symlinks' },
    { type: 'file', name: 'file.txt' },
    { type: 'file', name: 'specific-file.txt' },
  ]],

  // /test/dir - generic directory with some content
  ['/test/dir', [
    { type: 'file', name: 'a.txt' },
    { type: 'file', name: 'b.txt' },
    { type: 'directory', name: 'subdir' },
  ]],

  // /test/dir-with-files - directory with files
  ['/test/dir-with-files', [
    { type: 'file', name: 'file1.txt' },
    { type: 'file', name: 'file2.txt' },
  ]],

  // /test/dir-with-subdirs - directory with subdirectories
  ['/test/dir-with-subdirs', [
    { type: 'directory', name: 'subdir1' },
    { type: 'directory', name: 'subdir2' },
  ]],

  // /test/mixed-dir - mixed content
  ['/test/mixed-dir', [
    { type: 'file', name: 'file.txt' },
    { type: 'directory', name: 'subdir' },
  ]],

  // /test/empty-dir - empty directory
  ['/test/empty-dir', []],

  // /test/nested-dir - nested structure for recursive tests
  ['/test/nested-dir', [
    { type: 'directory', name: 'child' },
    { type: 'file', name: 'root-file.txt' },
  ]],
  ['/test/nested-dir/child', [
    { type: 'directory', name: 'grandchild' },
    { type: 'file', name: 'child-file.txt' },
  ]],
  ['/test/nested-dir/child/grandchild', [
    { type: 'file', name: 'deep-file.txt' },
  ]],

  // /test/deep-nested - deeply nested for recursive tests
  ['/test/deep-nested', [
    { type: 'directory', name: 'level1' },
    { type: 'file', name: 'file0.txt' },
  ]],
  ['/test/deep-nested/level1', [
    { type: 'directory', name: 'level2' },
    { type: 'file', name: 'file1.txt' },
  ]],
  ['/test/deep-nested/level1/level2', [
    { type: 'file', name: 'file2.txt' },
  ]],

  // /test/dir-with-hidden - hidden files
  ['/test/dir-with-hidden', [
    { type: 'file', name: '.hidden' },
    { type: 'file', name: '.gitignore' },
    { type: 'directory', name: '.hidden-dir' },
    { type: 'file', name: 'visible.txt' },
  ]],

  // /test/dir-with-special - special characters
  ['/test/dir-with-special', [
    { type: 'file', name: 'file with spaces.txt' },
    { type: 'file', name: 'file-with-dashes.txt' },
    { type: 'file', name: 'file_with_underscores.txt' },
  ]],

  // /test/dir-with-unicode - unicode filenames
  ['/test/dir-with-unicode', [
    { type: 'file', name: '文件.txt' },  // Chinese: "file"
    { type: 'file', name: 'archivo.txt' },
    { type: 'file', name: 'fichier.txt' },
  ]],

  // /test/dir-with-symlinks - symlinks
  ['/test/dir-with-symlinks', [
    { type: 'symlink', name: 'mylink' },
    { type: 'file', name: 'regular.txt' },
  ]],
])

/**
 * Check if a path exists and is a file (not a directory)
 */
function isFile(path: string): boolean {
  const parentPath = getParentPath(path)
  const name = getBasename(path)
  const entries = mockFS.get(parentPath)
  if (!entries) return false
  const entry = entries.find(e => e.name === name)
  return entry?.type === 'file'
}

/**
 * Get parent path
 */
function getParentPath(path: string): string {
  const normalized = normalize(path)
  const lastSlash = normalized.lastIndexOf('/')
  if (lastSlash === 0) return '/'
  if (lastSlash === -1) return '/'
  return normalized.slice(0, lastSlash)
}

/**
 * Get basename
 */
function getBasename(path: string): string {
  const normalized = normalize(path)
  const lastSlash = normalized.lastIndexOf('/')
  return normalized.slice(lastSlash + 1)
}

/**
 * Read the contents of a directory
 *
 * @param path - Path to the directory
 * @param options - Optional settings for the operation
 * @returns Array of filenames or Dirent objects
 */
export async function readdir(path: string): Promise<string[]>
export async function readdir(path: string, options: ReaddirOptions & { withFileTypes: true }): Promise<Dirent[]>
export async function readdir(path: string, options: ReaddirOptions & { withFileTypes?: false }): Promise<string[]>
export async function readdir(path: string, options?: ReaddirOptions): Promise<string[] | Dirent[]>
export async function readdir(
  path: string,
  options?: ReaddirOptions
): Promise<string[] | Dirent[]> {
  const normalizedPath = normalize(path)
  const withFileTypes = options?.withFileTypes ?? false
  const recursive = options?.recursive ?? false

  // Check if path is a file (not a directory)
  if (isFile(normalizedPath)) {
    throw new ENOTDIR('scandir', normalizedPath)
  }

  // Check if directory exists
  const entries = mockFS.get(normalizedPath)
  if (entries === undefined) {
    throw new ENOENT('scandir', normalizedPath)
  }

  // Sort entries for consistent ordering
  const sortedEntries = [...entries].sort((a, b) => a.name.localeCompare(b.name))

  if (recursive) {
    // Recursive listing
    const result: Array<string | Dirent> = []

    async function processDirectory(dirPath: string, prefix: string): Promise<void> {
      const dirEntries = mockFS.get(dirPath)
      if (!dirEntries) return

      const sorted = [...dirEntries].sort((a, b) => a.name.localeCompare(b.name))

      for (const entry of sorted) {
        const relativePath = prefix ? join(prefix, entry.name) : entry.name
        const fullPath = join(dirPath, entry.name)

        if (withFileTypes) {
          result.push(new Dirent(relativePath, normalizedPath, entry.type))
        } else {
          result.push(relativePath)
        }

        // Recurse into subdirectories
        if (entry.type === 'directory') {
          await processDirectory(fullPath, relativePath)
        }
      }
    }

    await processDirectory(normalizedPath, '')
    return result as string[] | Dirent[]
  }

  // Non-recursive listing
  if (withFileTypes) {
    return sortedEntries.map(entry => new Dirent(entry.name, normalizedPath, entry.type))
  }

  return sortedEntries.map(entry => entry.name)
}
