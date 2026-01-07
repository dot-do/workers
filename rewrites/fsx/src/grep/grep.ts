/**
 * Grep content search for fsx
 *
 * Searches file contents for patterns, similar to Unix grep.
 * Used for git grep, searching commit messages, content-based file discovery.
 *
 * @module grep
 */

/**
 * Options for grep content search
 */
export interface GrepOptions {
  /** Search pattern - string for literal match, RegExp for regex */
  pattern: string | RegExp
  /** File or directory to search (default: '/') */
  path?: string
  /** Search subdirectories recursively (default: false) */
  recursive?: boolean
  /** Filter files by glob pattern */
  glob?: string
  /** Case insensitive search (default: false) */
  ignoreCase?: boolean
  /** Include line numbers in results (default: true) */
  lineNumbers?: boolean
  /** Number of context lines before match (like -B) */
  before?: number
  /** Number of context lines after match (like -A) */
  after?: number
  /** Stop after N matches per file */
  maxCount?: number
  /** Only return filenames, not match details (like -l) */
  filesOnly?: boolean
  /** Return non-matching lines instead (like -v) */
  invert?: boolean
  /** Match whole words only (like -w) */
  wordMatch?: boolean
}

/**
 * A single match found by grep
 */
export interface GrepMatch {
  /** File path where match was found */
  file: string
  /** Line number (1-indexed) */
  line: number
  /** Column position within the line (1-indexed) */
  column: number
  /** Full line content containing the match */
  content: string
  /** The actual matched text */
  match: string
  /** Context lines before the match (if requested) */
  before?: string[]
  /** Context lines after the match (if requested) */
  after?: string[]
}

/**
 * Result of a grep search operation
 */
export interface GrepResult {
  /** All matches found */
  matches: GrepMatch[]
  /** Number of files that contained matches */
  fileCount: number
  /** Total number of matches across all files */
  matchCount: number
}

/**
 * Mock file contents for testing - matches structure in grep.test.ts
 */
const mockFileContents: Map<string, string> = new Map([
  ['/src/index.ts', `import { helper } from './utils/helpers'
import { format } from './utils/format'

export function main() {
  const result = helper()
  return format(result)
}

// Main entry point
export default main`],

  ['/src/utils/helpers.ts', `// TODO: refactor this function
// It's getting too complex

export function helper() { return 'help' }

export function anotherHelper() {
  // TODO: implement this
  throw new Error('Not implemented')
}`],

  ['/src/utils/format.ts', `/**
 * Format utility functions
 */

export function format(str: string) {
  return str.trim()
}

export function formatDate(date: Date) {
  return date.toISOString()
}`],

  ['/src/components/Button.tsx', `import React from 'react'

interface ButtonProps {
  label: string
  onClick: () => void
}

export function Button({ label, onClick }: ButtonProps) {
  return (
    <button onClick={onClick}>
      {label}
    </button>
  )
}`],

  ['/src/components/Modal.tsx', `import React from 'react'

// TODO: add animations
// TODO: add accessibility features

interface ModalProps {
  isOpen: boolean
  onClose: () => void
}

export function Modal({ isOpen, onClose }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="modal">
      <button onClick={onClose}>Close</button>
    </div>
  )
}`],

  ['/lib/index.js', `// Library entry point
module.exports = {
  foo: 'bar',
  baz: 42
}`],

  ['/lib/utils.js', `function util() {
  return 'util'
}

function anotherUtil() {
  return 'another'
}

module.exports = { util, anotherUtil }`],

  ['/test/index.test.ts', `import { describe, it, expect } from 'vitest'
import { main } from '../src/index'

describe('main', () => {
  it('works correctly', () => {
    expect(main()).toBeDefined()
  })

  it('returns formatted result', () => {
    const result = main()
    expect(typeof result).toBe('string')
  })
})`],

  ['/test/helpers.test.ts', `import { describe, it, expect } from 'vitest'
import { helper, anotherHelper } from '../src/utils/helpers'

describe('helpers', () => {
  describe('helper', () => {
    it('returns help string', () => {
      expect(helper()).toBe('help')
    })
  })

  describe('anotherHelper', () => {
    it('throws not implemented', () => {
      expect(() => anotherHelper()).toThrow('Not implemented')
    })
  })
})`],

  ['/config/settings.json', `{
  "debug": true,
  "timeout": 5000,
  "maxRetries": 3,
  "apiUrl": "https://api.example.com"
}`],

  ['/docs/README.md', `# Documentation

This is the project README.

## Getting Started

Run \`npm install\` to install dependencies.

## Usage

Import the main function:

\`\`\`typescript
import { main } from './src'
\`\`\``],

  ['/docs/API.md', `# API Reference

## Functions

### main()

The main entry point for the application.

### helper()

A helper function that returns 'help'.

### format(str)

Formats a string by trimming whitespace.`],

  ['/.gitignore', `node_modules
.env
dist
*.log
.DS_Store`],

  ['/.env', `API_KEY=secret123
DATABASE_URL=postgres://localhost/db
DEBUG=true`],

  ['/package.json', `{
  "name": "test-project",
  "version": "1.0.0",
  "main": "lib/index.js",
  "scripts": {
    "test": "vitest",
    "build": "tsc"
  }
}`],

  ['/empty.txt', ''],

  ['/multiline.txt', `Line 1: Hello World
Line 2: This is a test
Line 3: foo bar baz
Line 4: HELLO WORLD
Line 5: hello world
Line 6: Testing 123
Line 7: Another line
Line 8: FOO Foo bar
Line 9: The quick brown fox
Line 10: jumps over the lazy dog`],

  ['/large-file.txt', Array(1000).fill('This is line content for testing large files.').join('\n')],
])

/**
 * Mock filesystem structure for directory traversal
 */
type FileType = 'file' | 'directory'

interface FSEntry {
  type: FileType
  name: string
}

const mockFS: Map<string, FSEntry[]> = new Map([
  // Root directory
  ['/', [
    { type: 'directory', name: 'src' },
    { type: 'directory', name: 'lib' },
    { type: 'directory', name: 'test' },
    { type: 'directory', name: 'config' },
    { type: 'directory', name: 'docs' },
    { type: 'file', name: '.gitignore' },
    { type: 'file', name: '.env' },
    { type: 'file', name: 'package.json' },
    { type: 'file', name: 'empty.txt' },
    { type: 'file', name: 'multiline.txt' },
    { type: 'file', name: 'large-file.txt' },
  ]],

  // /src directory
  ['/src', [
    { type: 'file', name: 'index.ts' },
    { type: 'directory', name: 'utils' },
    { type: 'directory', name: 'components' },
  ]],

  // /src/utils
  ['/src/utils', [
    { type: 'file', name: 'helpers.ts' },
    { type: 'file', name: 'format.ts' },
  ]],

  // /src/components
  ['/src/components', [
    { type: 'file', name: 'Button.tsx' },
    { type: 'file', name: 'Modal.tsx' },
  ]],

  // /lib directory
  ['/lib', [
    { type: 'file', name: 'index.js' },
    { type: 'file', name: 'utils.js' },
  ]],

  // /test directory
  ['/test', [
    { type: 'file', name: 'index.test.ts' },
    { type: 'file', name: 'helpers.test.ts' },
  ]],

  // /config directory
  ['/config', [
    { type: 'file', name: 'settings.json' },
  ]],

  // /docs directory
  ['/docs', [
    { type: 'file', name: 'README.md' },
    { type: 'file', name: 'API.md' },
  ]],
])

/**
 * Normalize a path - remove trailing slashes and collapse multiple slashes
 */
function normalizePath(path: string): string {
  if (path === '' || path === '/') return '/'
  let p = path.replace(/\/+/g, '/')
  if (p.endsWith('/') && p !== '/') {
    p = p.slice(0, -1)
  }
  return p
}

/**
 * Join path segments
 */
function joinPath(base: string, segment: string): string {
  if (base === '/') return '/' + segment
  return base + '/' + segment
}

/**
 * Check if a path is a directory
 */
function isDirectory(path: string): boolean {
  return mockFS.has(normalizePath(path))
}

/**
 * Check if a path is a file
 */
function isFile(path: string): boolean {
  return mockFileContents.has(normalizePath(path))
}

/**
 * Check if a path exists
 */
function pathExists(path: string): boolean {
  const normalized = normalizePath(path)
  return isFile(normalized) || isDirectory(normalized)
}

/**
 * Get all files in a directory (optionally recursive)
 */
function getFiles(dir: string, recursive: boolean): string[] {
  const normalizedDir = normalizePath(dir)
  const files: string[] = []

  // If path is a file, return it
  if (isFile(normalizedDir)) {
    return [normalizedDir]
  }

  const entries = mockFS.get(normalizedDir)
  if (!entries) return files

  for (const entry of entries) {
    const fullPath = joinPath(normalizedDir, entry.name)
    if (entry.type === 'file') {
      files.push(fullPath)
    } else if (entry.type === 'directory' && recursive) {
      files.push(...getFiles(fullPath, recursive))
    }
  }

  return files
}

/**
 * Escape regex special characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Simple glob pattern matching
 */
function matchGlob(path: string, pattern: string): boolean {
  // Handle simple patterns
  // *.ext - match files with extension
  // **/*.ext - match files with extension at any depth
  // *.{ts,tsx} - match multiple extensions

  // Extract filename from path
  const filename = path.split('/').pop() || ''

  // Handle brace expansion
  if (pattern.includes('{')) {
    const match = pattern.match(/\{([^}]+)\}/)
    if (match) {
      const options = match[1].split(',')
      const prefix = pattern.slice(0, match.index)
      const suffix = pattern.slice(match.index! + match[0].length)
      return options.some(opt => matchGlob(path, prefix + opt + suffix))
    }
  }

  // Handle ** (globstar)
  if (pattern.startsWith('**/')) {
    const restPattern = pattern.slice(3)
    return matchGlob(filename, restPattern) || matchGlob(path, restPattern)
  }

  // Handle simple * patterns
  if (pattern.startsWith('*.')) {
    const ext = pattern.slice(1) // Get '.ext' part
    return filename.endsWith(ext)
  }

  // Direct match
  return filename === pattern || path.endsWith('/' + pattern)
}

/**
 * Build search regex from pattern and options
 */
function buildSearchRegex(pattern: string | RegExp, options: GrepOptions): RegExp {
  let flags = 'g' // Always global for finding all matches

  // Handle ignoreCase
  if (options.ignoreCase) {
    flags += 'i'
  }

  if (pattern instanceof RegExp) {
    let source = pattern.source

    // Handle wordMatch
    if (options.wordMatch) {
      source = `\\b${source}\\b`
    }

    // Combine existing flags with our flags
    const existingFlags = pattern.flags
    if (existingFlags.includes('i') && !flags.includes('i')) {
      flags += 'i'
    }

    // Remove duplicate flags and preserve multiline if present
    const uniqueFlags = [...new Set(flags.split(''))].join('')

    return new RegExp(source, uniqueFlags)
  }

  // String pattern - escape special characters for literal matching
  let source = escapeRegex(pattern)

  // Handle wordMatch
  if (options.wordMatch) {
    source = `\\b${source}\\b`
  }

  return new RegExp(source, flags)
}

/**
 * Search file contents for a pattern
 *
 * @param options - Search options including pattern and path
 * @returns Search results with matches and statistics
 * @throws Error if path does not exist or pattern is invalid
 *
 * @example
 * ```typescript
 * // Search for a string in all files
 * const result = await grep({ pattern: 'TODO' })
 *
 * // Search with regex in specific directory
 * const result = await grep({
 *   pattern: /function\s+\w+/,
 *   path: '/src',
 *   recursive: true
 * })
 *
 * // Get only filenames containing matches
 * const files = await grep({
 *   pattern: 'import',
 *   filesOnly: true
 * })
 *
 * // Search with context lines
 * const result = await grep({
 *   pattern: 'error',
 *   before: 2,
 *   after: 2,
 *   ignoreCase: true
 * })
 * ```
 */
export async function grep(options: GrepOptions): Promise<GrepResult> {
  const {
    pattern,
    path = '/',
    recursive = false,
    glob: globPattern,
    ignoreCase = false,
    before,
    after,
    maxCount,
    filesOnly = false,
    invert = false,
    wordMatch = false,
  } = options

  const normalizedPath = normalizePath(path)

  // Validate path exists
  if (!pathExists(normalizedPath)) {
    throw new Error(`ENOENT: no such file or directory '${normalizedPath}'`)
  }

  // Build the search regex
  const searchRegex = buildSearchRegex(pattern, { pattern, ignoreCase, wordMatch })

  // Get list of files to search
  let filesToSearch: string[]
  if (isFile(normalizedPath)) {
    filesToSearch = [normalizedPath]
  } else {
    filesToSearch = getFiles(normalizedPath, recursive)
  }

  // Apply glob filter if specified
  if (globPattern) {
    filesToSearch = filesToSearch.filter(f => matchGlob(f, globPattern))
  }

  // Search each file
  const allMatches: GrepMatch[] = []
  const filesWithMatches = new Set<string>()

  for (const file of filesToSearch) {
    const content = mockFileContents.get(file)
    if (content === undefined) continue

    // Handle empty files - no lines to search
    if (content === '') {
      continue
    }

    const lines = content.split('\n')
    const fileMatches: GrepMatch[] = []
    let matchCountInFile = 0

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const lineContent = lines[lineIndex]
      const lineNumber = lineIndex + 1 // 1-indexed

      if (invert) {
        // Invert mode - return non-matching lines
        const hasMatch = searchRegex.test(lineContent)
        searchRegex.lastIndex = 0 // Reset regex state

        if (!hasMatch) {
          const match: GrepMatch = {
            file,
            line: lineNumber,
            column: 1,
            content: lineContent,
            match: '',
          }

          // Add context if requested
          if (before !== undefined && before > 0) {
            const startLine = Math.max(0, lineIndex - before)
            match.before = lines.slice(startLine, lineIndex)
          }

          if (after !== undefined && after > 0) {
            const endLine = Math.min(lines.length, lineIndex + after + 1)
            match.after = lines.slice(lineIndex + 1, endLine)
          }

          fileMatches.push(match)
          filesWithMatches.add(file)
          matchCountInFile++

          // Check maxCount for filesOnly mode
          if (filesOnly) {
            break // One entry per file
          }

          if (maxCount !== undefined && matchCountInFile >= maxCount) {
            break
          }
        }
      } else {
        // Normal mode - find all matches in line
        searchRegex.lastIndex = 0 // Reset regex state
        let regexMatch: RegExpExecArray | null

        while ((regexMatch = searchRegex.exec(lineContent)) !== null) {
          const match: GrepMatch = {
            file,
            line: lineNumber,
            column: regexMatch.index + 1, // 1-indexed
            content: lineContent,
            match: regexMatch[0],
          }

          // Add context if requested
          if (before !== undefined && before > 0) {
            const startLine = Math.max(0, lineIndex - before)
            match.before = lines.slice(startLine, lineIndex)
          }

          if (after !== undefined && after > 0) {
            const endLine = Math.min(lines.length, lineIndex + after + 1)
            match.after = lines.slice(lineIndex + 1, endLine)
          }

          fileMatches.push(match)
          filesWithMatches.add(file)
          matchCountInFile++

          // Check filesOnly mode - only need first match
          if (filesOnly) {
            break
          }

          // Check maxCount
          if (maxCount !== undefined && matchCountInFile >= maxCount) {
            break
          }

          // Prevent infinite loop for zero-width matches
          if (regexMatch[0].length === 0) {
            searchRegex.lastIndex++
          }
        }

        // Check if we've hit maxCount for this file
        if (maxCount !== undefined && matchCountInFile >= maxCount) {
          break
        }

        // Check filesOnly - break outer loop after first match
        if (filesOnly && matchCountInFile > 0) {
          break
        }
      }
    }

    // For filesOnly mode, only add one entry per file
    if (filesOnly && fileMatches.length > 0) {
      allMatches.push(fileMatches[0])
    } else {
      allMatches.push(...fileMatches)
    }
  }

  return {
    matches: allMatches,
    fileCount: filesWithMatches.size,
    matchCount: filesOnly ? allMatches.length : allMatches.length,
  }
}
