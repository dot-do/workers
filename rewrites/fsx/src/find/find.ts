/**
 * Advanced file discovery for fsx
 *
 * Provides Unix find-like functionality for searching files in the virtual filesystem.
 * Supports filtering by name patterns, file type, size, timestamps, and more.
 *
 * @module find
 */

import { match } from '../glob/match'

/**
 * Options for the find() function
 */
export interface FindOptions {
  /** Starting path for the search (default: '/') */
  path?: string
  /** Filename pattern - glob string or RegExp */
  name?: string | RegExp
  /** File type filter: 'f' for file, 'd' for directory, 'l' for symlink */
  type?: 'f' | 'd' | 'l'
  /** Maximum traversal depth (0 = only starting path, 1 = direct children, etc.) */
  maxdepth?: number
  /** Minimum depth before returning results (0 = include starting path) */
  mindepth?: number
  /** Size filter: '+1M' (larger than), '-100K' (smaller than), '50K' (exactly) */
  size?: string
  /** Modified time filter: '-7d' (within 7 days), '+30d' (older than 30 days) */
  mtime?: string
  /** Created time filter: same format as mtime */
  ctime?: string
  /** Access time filter: same format as mtime */
  atime?: string
  /** Return only empty files/directories */
  empty?: boolean
  /** Directory patterns to skip during traversal */
  prune?: string[]
}

/**
 * Result entry from find()
 */
export interface FindResult {
  /** Full path to the file/directory */
  path: string
  /** Type of the entry */
  type: 'file' | 'directory' | 'symlink'
  /** Size in bytes */
  size: number
  /** Last modification time */
  mtime: Date
}

/**
 * Internal file entry representation
 */
interface MockEntry {
  type: 'file' | 'directory' | 'symlink'
  size: number
  mtime: number // timestamp in ms
  ctime: number // timestamp in ms
  atime: number // timestamp in ms
  target?: string // for symlinks
  children?: string[] // for directories, list of child names
}

// Helper to create date timestamps
function dateToMs(dateStr: string): number {
  return new Date(dateStr).getTime()
}

/**
 * Mock filesystem for testing
 * Matches the structure in the test file comments
 */
const mockFS: Map<string, MockEntry> = new Map([
  // Root directory
  ['/', {
    type: 'directory',
    size: 4096,
    mtime: dateToMs('2024-01-01'),
    ctime: dateToMs('2024-01-01'),
    atime: Date.now(),
    children: ['README.md', 'package.json', '.gitignore', '.env', 'empty.txt', 'src', 'test', 'dist', 'node_modules', 'large-file.bin', 'link-to-readme']
  }],

  // Root level files
  ['/README.md', {
    type: 'file',
    size: 1000,
    mtime: dateToMs('2024-01-15'),
    ctime: dateToMs('2024-01-15'),
    atime: Date.now()
  }],
  ['/package.json', {
    type: 'file',
    size: 500,
    mtime: dateToMs('2024-01-10'),
    ctime: dateToMs('2024-01-10'),
    atime: Date.now()
  }],
  ['/.gitignore', {
    type: 'file',
    size: 50,
    mtime: dateToMs('2024-01-01'),
    ctime: dateToMs('2024-01-01'),
    atime: Date.now()
  }],
  ['/.env', {
    type: 'file',
    size: 100,
    mtime: dateToMs('2024-01-05'),
    ctime: dateToMs('2024-01-05'),
    atime: Date.now()
  }],
  ['/empty.txt', {
    type: 'file',
    size: 0,
    mtime: dateToMs('2024-01-20'),
    ctime: dateToMs('2024-01-20'),
    atime: Date.now()
  }],
  ['/large-file.bin', {
    type: 'file',
    size: 2000000, // 2MB
    mtime: dateToMs('2024-01-19'),
    ctime: dateToMs('2024-01-19'),
    atime: Date.now()
  }],
  ['/link-to-readme', {
    type: 'symlink',
    size: 9, // length of "README.md"
    mtime: dateToMs('2024-01-15'),
    ctime: dateToMs('2024-01-15'),
    atime: Date.now(),
    target: 'README.md'
  }],

  // src directory
  ['/src', {
    type: 'directory',
    size: 4096,
    mtime: dateToMs('2024-01-14'),
    ctime: dateToMs('2024-01-14'),
    atime: Date.now(),
    children: ['index.ts', 'utils', 'components']
  }],
  ['/src/index.ts', {
    type: 'file',
    size: 2000,
    mtime: dateToMs('2024-01-14'),
    ctime: dateToMs('2024-01-14'),
    atime: Date.now()
  }],

  // src/utils directory
  ['/src/utils', {
    type: 'directory',
    size: 4096,
    mtime: dateToMs('2024-01-13'),
    ctime: dateToMs('2024-01-13'),
    atime: Date.now(),
    children: ['helpers.ts', 'format.ts']
  }],
  ['/src/utils/helpers.ts', {
    type: 'file',
    size: 1500,
    mtime: dateToMs('2024-01-12'),
    ctime: dateToMs('2024-01-12'),
    atime: Date.now()
  }],
  ['/src/utils/format.ts', {
    type: 'file',
    size: 800,
    mtime: dateToMs('2024-01-13'),
    ctime: dateToMs('2024-01-13'),
    atime: Date.now()
  }],

  // src/components directory
  ['/src/components', {
    type: 'directory',
    size: 4096,
    mtime: dateToMs('2024-01-16'),
    ctime: dateToMs('2024-01-16'),
    atime: Date.now(),
    children: ['Button.tsx', 'Modal.tsx']
  }],
  ['/src/components/Button.tsx', {
    type: 'file',
    size: 3000,
    mtime: dateToMs('2024-01-11'),
    ctime: dateToMs('2024-01-11'),
    atime: Date.now()
  }],
  ['/src/components/Modal.tsx', {
    type: 'file',
    size: 5000,
    mtime: dateToMs('2024-01-16'),
    ctime: dateToMs('2024-01-16'),
    atime: Date.now()
  }],

  // test directory
  ['/test', {
    type: 'directory',
    size: 4096,
    mtime: dateToMs('2024-01-18'),
    ctime: dateToMs('2024-01-18'),
    atime: Date.now(),
    children: ['index.test.ts', 'helpers.test.ts']
  }],
  ['/test/index.test.ts', {
    type: 'file',
    size: 1200,
    mtime: dateToMs('2024-01-17'),
    ctime: dateToMs('2024-01-17'),
    atime: Date.now()
  }],
  ['/test/helpers.test.ts', {
    type: 'file',
    size: 900,
    mtime: dateToMs('2024-01-18'),
    ctime: dateToMs('2024-01-18'),
    atime: Date.now()
  }],

  // dist directory (empty)
  ['/dist', {
    type: 'directory',
    size: 4096,
    mtime: dateToMs('2024-01-01'),
    ctime: dateToMs('2024-01-01'),
    atime: Date.now(),
    children: []
  }],

  // node_modules directory
  ['/node_modules', {
    type: 'directory',
    size: 4096,
    mtime: dateToMs('2023-12-01'),
    ctime: dateToMs('2023-12-01'),
    atime: Date.now(),
    children: ['lodash']
  }],
  ['/node_modules/lodash', {
    type: 'directory',
    size: 4096,
    mtime: dateToMs('2023-12-01'),
    ctime: dateToMs('2023-12-01'),
    atime: Date.now(),
    children: ['index.js']
  }],
  ['/node_modules/lodash/index.js', {
    type: 'file',
    size: 50000,
    mtime: dateToMs('2023-12-01'),
    ctime: dateToMs('2023-12-01'),
    atime: Date.now()
  }],
])

/**
 * Parse size filter string like '+1M', '-100K', '500B'
 * Returns { op: '+' | '-' | '=', bytes: number }
 */
function parseSize(sizeStr: string): { op: '+' | '-' | '=', bytes: number } {
  let op: '+' | '-' | '=' = '='
  let remaining = sizeStr

  if (sizeStr.startsWith('+')) {
    op = '+'
    remaining = sizeStr.slice(1)
  } else if (sizeStr.startsWith('-')) {
    op = '-'
    remaining = sizeStr.slice(1)
  }

  // Parse number and suffix
  const match = remaining.match(/^(\d+(?:\.\d+)?)\s*([BKMG])?$/i)
  if (!match) {
    return { op, bytes: parseInt(remaining, 10) || 0 }
  }

  const num = parseFloat(match[1])
  const suffix = (match[2] || 'B').toUpperCase()

  let bytes: number
  switch (suffix) {
    case 'K':
      bytes = num * 1024
      break
    case 'M':
      bytes = num * 1024 * 1024
      break
    case 'G':
      bytes = num * 1024 * 1024 * 1024
      break
    case 'B':
    default:
      bytes = num
      break
  }

  return { op, bytes }
}

/**
 * Parse time filter string like '-7d', '+30d', '2w'
 * Returns { op: '+' | '-' | '=', ms: number }
 *
 * '+' means older than (mtime < now - ms)
 * '-' means newer than (mtime > now - ms)
 * '=' means approximately equal
 */
function parseTime(timeStr: string): { op: '+' | '-' | '=', ms: number } {
  let op: '+' | '-' | '=' = '='
  let remaining = timeStr

  if (timeStr.startsWith('+')) {
    op = '+'
    remaining = timeStr.slice(1)
  } else if (timeStr.startsWith('-')) {
    op = '-'
    remaining = timeStr.slice(1)
  }

  // Parse number and suffix
  const matchResult = remaining.match(/^(\d+(?:\.\d+)?)\s*([mhdwM])?$/i)
  if (!matchResult) {
    return { op, ms: parseInt(remaining, 10) || 0 }
  }

  const num = parseFloat(matchResult[1])
  const suffix = matchResult[2] || 'd' // default to days

  let ms: number
  switch (suffix) {
    case 'm':
      // minutes
      ms = num * 60 * 1000
      break
    case 'h':
      ms = num * 60 * 60 * 1000
      break
    case 'd':
      ms = num * 24 * 60 * 60 * 1000
      break
    case 'w':
      ms = num * 7 * 24 * 60 * 60 * 1000
      break
    case 'M':
      // months (approximated as 30 days)
      ms = num * 30 * 24 * 60 * 60 * 1000
      break
    default:
      ms = num * 24 * 60 * 60 * 1000 // default to days
      break
  }

  return { op, ms }
}

/**
 * Check if a size matches the size filter
 */
function matchesSize(size: number, sizeFilter: string): boolean {
  const { op, bytes } = parseSize(sizeFilter)

  switch (op) {
    case '+':
      return size > bytes
    case '-':
      return size < bytes
    case '=':
      return size === bytes
  }
}

/**
 * Check if a time matches the time filter
 * @param timestamp - The file's timestamp in ms
 * @param timeFilter - The filter string like '-7d'
 */
function matchesTime(timestamp: number, timeFilter: string): boolean {
  const { op, ms } = parseTime(timeFilter)
  const now = Date.now()
  const threshold = now - ms

  switch (op) {
    case '+':
      // older than: file time < threshold
      return timestamp < threshold
    case '-':
      // newer than: file time > threshold
      return timestamp > threshold
    case '=':
      // approximately equal (within a day)
      const dayMs = 24 * 60 * 60 * 1000
      return Math.abs(timestamp - threshold) < dayMs
  }
}

/**
 * Check if directory is empty
 */
function isEmptyDirectory(entry: MockEntry): boolean {
  if (entry.type !== 'directory') return false
  return !entry.children || entry.children.length === 0
}

/**
 * Check if a directory name matches any prune pattern
 */
function shouldPrune(name: string, prunePatterns: string[]): boolean {
  for (const pattern of prunePatterns) {
    // Try glob match first
    try {
      if (match(pattern, name, { dot: true })) {
        return true
      }
    } catch {
      // If match fails, try direct comparison
      if (name === pattern) {
        return true
      }
    }
  }
  return false
}

/**
 * Check if filename matches name filter
 */
function matchesName(filename: string, nameFilter: string | RegExp): boolean {
  if (nameFilter instanceof RegExp) {
    return nameFilter.test(filename)
  }

  // Use glob match
  try {
    return match(nameFilter, filename, { dot: true })
  } catch {
    // Fallback to exact match
    return filename === nameFilter
  }
}

/**
 * Normalize a path (remove trailing slash, handle edge cases)
 */
function normalizePath(path: string): string {
  if (path === '/') return '/'
  // Remove trailing slash
  let normalized = path.endsWith('/') ? path.slice(0, -1) : path
  // Ensure starts with /
  if (!normalized.startsWith('/')) {
    normalized = '/' + normalized
  }
  return normalized
}

/**
 * Get the basename (filename) from a path
 */
function basename(path: string): string {
  const parts = path.split('/').filter(Boolean)
  return parts[parts.length - 1] || ''
}

/**
 * Calculate depth of a path relative to a starting path
 */
function getRelativeDepth(path: string, startPath: string): number {
  const normalizedPath = normalizePath(path)
  const normalizedStart = normalizePath(startPath)

  if (normalizedPath === normalizedStart) return 0

  // Count segments after the start path
  const startParts = normalizedStart === '/' ? [] : normalizedStart.split('/').filter(Boolean)
  const pathParts = normalizedPath.split('/').filter(Boolean)

  return pathParts.length - startParts.length
}

/**
 * Find files in the filesystem matching the given criteria
 *
 * @param options - Search criteria
 * @returns Array of matching file entries
 *
 * @example
 * ```typescript
 * // Find all TypeScript files
 * const tsFiles = await find({ name: '*.ts' })
 *
 * // Find large files (> 1MB)
 * const largeFiles = await find({ size: '+1M' })
 *
 * // Find recently modified files (within 7 days)
 * const recent = await find({ mtime: '-7d' })
 *
 * // Find empty directories
 * const emptyDirs = await find({ type: 'd', empty: true })
 *
 * // Complex query: TypeScript files in src, excluding node_modules
 * const srcTs = await find({
 *   path: '/src',
 *   name: '*.ts',
 *   type: 'f',
 *   prune: ['node_modules', '.git']
 * })
 * ```
 */
export async function find(options: FindOptions = {}): Promise<FindResult[]> {
  const startPath = normalizePath(options.path || '/')
  const maxdepth = options.maxdepth ?? Infinity
  const mindepth = options.mindepth ?? 0

  // If mindepth > maxdepth, return empty (impossible range)
  if (mindepth > maxdepth) {
    return []
  }

  // Check if starting path exists
  const startEntry = mockFS.get(startPath)
  if (!startEntry) {
    return []
  }

  const results: FindResult[] = []
  const visited = new Set<string>() // To prevent infinite loops with symlinks

  /**
   * Recursively traverse the filesystem
   */
  function traverse(currentPath: string, depth: number): void {
    // Prevent infinite loops
    if (visited.has(currentPath)) {
      return
    }
    visited.add(currentPath)

    // Check depth limits for traversal
    if (depth > maxdepth) {
      return
    }

    const entry = mockFS.get(currentPath)
    if (!entry) {
      return
    }

    const filename = currentPath === '/' ? '/' : basename(currentPath)

    // Check prune patterns (skip directories and their contents, also skip files matching prune pattern)
    if (options.prune && depth > 0) {
      if (shouldPrune(filename, options.prune)) {
        // If it's a directory, skip traversal entirely
        // If it's a file/symlink, skip this entry
        return
      }
    }

    // Check if this entry should be included in results
    let include = true

    // Check mindepth
    if (depth < mindepth) {
      include = false
    }

    // Check name filter
    if (include && options.name !== undefined) {
      // For root path, don't filter by name (it's the starting point)
      if (currentPath !== startPath || depth > 0) {
        if (!matchesName(filename, options.name)) {
          include = false
        }
      } else if (currentPath === startPath && depth === 0) {
        // At starting path, check if name matches
        if (!matchesName(filename, options.name)) {
          include = false
        }
      }
    }

    // Check type filter
    if (include && options.type !== undefined) {
      const typeMap: Record<string, 'file' | 'directory' | 'symlink'> = {
        'f': 'file',
        'd': 'directory',
        'l': 'symlink'
      }
      if (entry.type !== typeMap[options.type]) {
        include = false
      }
    }

    // Check size filter (typically only for files)
    if (include && options.size !== undefined) {
      if (!matchesSize(entry.size, options.size)) {
        include = false
      }
    }

    // Check time filters
    if (include && options.mtime !== undefined) {
      if (!matchesTime(entry.mtime, options.mtime)) {
        include = false
      }
    }

    if (include && options.ctime !== undefined) {
      if (!matchesTime(entry.ctime, options.ctime)) {
        include = false
      }
    }

    if (include && options.atime !== undefined) {
      if (!matchesTime(entry.atime, options.atime)) {
        include = false
      }
    }

    // Check empty filter
    if (include && options.empty !== undefined) {
      if (options.empty) {
        // Looking for empty files/directories
        if (entry.type === 'file') {
          if (entry.size !== 0) include = false
        } else if (entry.type === 'directory') {
          if (!isEmptyDirectory(entry)) include = false
        } else {
          // Symlinks can't be empty
          include = false
        }
      } else {
        // Looking for non-empty files/directories
        if (entry.type === 'file') {
          if (entry.size === 0) include = false
        } else if (entry.type === 'directory') {
          if (isEmptyDirectory(entry)) include = false
        }
        // Symlinks are always considered non-empty
      }
    }

    // Add to results if all filters pass
    if (include) {
      results.push({
        path: currentPath,
        type: entry.type,
        size: entry.type === 'directory' ? 0 : entry.size,
        mtime: new Date(entry.mtime)
      })
    }

    // Recurse into directories (don't follow symlinks to prevent loops)
    if (entry.type === 'directory' && entry.children && depth < maxdepth) {
      for (const childName of entry.children) {
        const childPath = currentPath === '/' ? '/' + childName : currentPath + '/' + childName
        traverse(childPath, depth + 1)
      }
    }
  }

  traverse(startPath, 0)

  // Sort results by path for stable ordering
  results.sort((a, b) => a.path.localeCompare(b.path))

  return results
}
