/**
 * Path utilities for fsx.do - POSIX-style path manipulation
 */

/**
 * Normalize a path by:
 * - Collapsing multiple consecutive slashes to one
 * - Removing trailing slashes (except for root)
 * - Resolving . (current directory) segments
 * - Resolving .. (parent directory) segments
 */
export function normalize(path: string): string {
  if (path === '') return ''
  if (path === '.') return '.'
  if (path === '..') return '..'

  const isAbs = path.startsWith('/')

  // Split and filter empty segments (handles multiple slashes)
  const segments = path.split('/').filter((s) => s !== '')

  const result: string[] = []

  for (const segment of segments) {
    if (segment === '.') {
      // Current directory - skip
      continue
    } else if (segment === '..') {
      // Parent directory
      if (result.length > 0 && result[result.length - 1] !== '..') {
        result.pop()
      } else if (!isAbs) {
        // For relative paths, keep the .. if we can't go up
        result.push('..')
      }
      // For absolute paths at root, just ignore the ..
    } else {
      result.push(segment)
    }
  }

  // Handle edge cases
  if (isAbs) {
    return '/' + result.join('/')
  }

  // For relative paths
  if (result.length === 0) {
    // If we started with ./ and ended with nothing, return .
    return '.'
  }

  return result.join('/')
}

/**
 * Resolve path segments to an absolute path.
 * Later absolute paths override earlier ones.
 */
export function resolve(...paths: string[]): string {
  if (paths.length === 0) return '/'

  let resolved = ''

  for (const path of paths) {
    if (path.startsWith('/')) {
      // Absolute path - start over
      resolved = path
    } else if (resolved === '') {
      resolved = path
    } else {
      resolved = resolved + '/' + path
    }
  }

  // Make sure the result is absolute
  if (!resolved.startsWith('/')) {
    resolved = '/' + resolved
  }

  return normalize(resolved)
}

/**
 * Get the filename portion of a path.
 * Optionally remove an extension if it matches.
 */
export function basename(path: string, ext?: string): string {
  if (path === '' || path === '/') return ''

  // Remove trailing slashes
  let p = path
  while (p.length > 1 && p.endsWith('/')) {
    p = p.slice(0, -1)
  }

  // Get the last segment
  const lastSlash = p.lastIndexOf('/')
  const name = lastSlash === -1 ? p : p.slice(lastSlash + 1)

  // Remove extension if provided and matches
  if (ext && name.endsWith(ext)) {
    return name.slice(0, -ext.length)
  }

  return name
}

/**
 * Get the directory portion of a path.
 */
export function dirname(path: string): string {
  if (path === '' || path === '/') {
    return path === '' ? '.' : '/'
  }

  // Remove trailing slashes
  let p = path
  while (p.length > 1 && p.endsWith('/')) {
    p = p.slice(0, -1)
  }

  const lastSlash = p.lastIndexOf('/')

  if (lastSlash === -1) {
    // No directory part
    return '.'
  }

  if (lastSlash === 0) {
    // Root directory
    return '/'
  }

  return p.slice(0, lastSlash)
}

/**
 * Join path segments and normalize the result.
 */
export function join(...paths: string[]): string {
  if (paths.length === 0) return '.'

  // Filter out empty segments
  const filtered = paths.filter((p) => p !== '')

  if (filtered.length === 0) return '.'

  // Check if first segment is absolute
  const isAbs = filtered[0].startsWith('/')

  // Join all segments, stripping leading slashes from non-first segments
  let result = filtered[0]
  for (let i = 1; i < filtered.length; i++) {
    let segment = filtered[i]
    // Strip leading slashes from subsequent segments
    while (segment.startsWith('/')) {
      segment = segment.slice(1)
    }
    if (segment) {
      result = result + '/' + segment
    }
  }

  const normalized = normalize(result)

  // If the original was absolute but normalization returned '.', return '/'
  if (isAbs && normalized === '.') {
    return '/'
  }

  return normalized
}

/**
 * Check if a path is absolute (starts with /).
 */
export function isAbsolute(path: string): boolean {
  return path.startsWith('/')
}
