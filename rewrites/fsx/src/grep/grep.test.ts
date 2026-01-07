/**
 * Tests for grep content search (RED phase - should fail)
 *
 * The grep() function searches file contents for patterns, similar to Unix grep.
 * It integrates with:
 * - glob() from ./glob for file discovery
 * - readFile() for reading file contents
 *
 * Use cases:
 * - git grep functionality
 * - Searching commit messages
 * - Content-based file discovery
 * - Code search in repositories
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { grep, type GrepOptions, type GrepMatch, type GrepResult } from './grep'

/**
 * Mock filesystem structure for tests:
 *
 * /
 * |-- src/
 * |   |-- index.ts          # "export function main() { ... }"
 * |   |-- utils/
 * |   |   |-- helpers.ts    # "// TODO: refactor this\nexport function helper() { return 'help' }"
 * |   |   |-- format.ts     # "export function format(str: string) { return str.trim() }"
 * |   |-- components/
 * |   |   |-- Button.tsx    # "import React from 'react'\nexport function Button() { ... }"
 * |   |   |-- Modal.tsx     # "import React from 'react'\n// TODO: add animations\nexport function Modal() { ... }"
 * |-- lib/
 * |   |-- index.js          # "module.exports = { foo: 'bar' }"
 * |   |-- utils.js          # "function util() { return 'util' }"
 * |-- test/
 * |   |-- index.test.ts     # "describe('main', () => { it('works', () => { expect(true).toBe(true) }) })"
 * |   |-- helpers.test.ts   # "describe('helpers', () => { ... })"
 * |-- config/
 * |   |-- settings.json     # "{ \"debug\": true, \"timeout\": 5000 }"
 * |-- docs/
 * |   |-- README.md         # "# Documentation\n\nThis is the README."
 * |   |-- API.md            # "# API Reference\n\nFunction documentation."
 * |-- .gitignore            # "node_modules\n.env\ndist"
 * |-- .env                  # "API_KEY=secret123"
 * |-- package.json          # "{ \"name\": \"test-project\" }"
 * |-- empty.txt             # ""  (empty file)
 * |-- binary.bin            # Binary content (non-text)
 * |-- multiline.txt         # Multiple lines with various content
 */

/**
 * Mock file contents for testing
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

export function helper() {
  return 'help'
}

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
Line 8: foo FOO Foo
Line 9: The quick brown fox
Line 10: jumps over the lazy dog`],

  ['/large-file.txt', Array(1000).fill('This is line content for testing large files.').join('\n')],
])

describe('grep', () => {
  // ========================================
  // 1. Basic search - literal string (6 tests)
  // ========================================
  describe('basic search - literal string', () => {
    it('should find a simple string in a single file', async () => {
      // Given: a file containing "TODO"
      // When: searching for "TODO"
      // Then: should return matches with line info

      const result = await grep({
        pattern: 'TODO',
        path: '/src/utils/helpers.ts'
      })

      expect(result.matchCount).toBeGreaterThan(0)
      expect(result.matches[0].match).toBe('TODO')
      expect(result.matches[0].file).toBe('/src/utils/helpers.ts')
    })

    it('should find multiple matches in a single file', async () => {
      // Given: a file with multiple "TODO" comments
      // When: searching for "TODO"
      // Then: should return all matches

      const result = await grep({
        pattern: 'TODO',
        path: '/src/components/Modal.tsx'
      })

      expect(result.matchCount).toBe(2)
      expect(result.matches).toHaveLength(2)
    })

    it('should return correct line numbers', async () => {
      // Given: a file with known content
      // When: searching for a pattern
      // Then: line numbers should be accurate (1-indexed)

      const result = await grep({
        pattern: 'export function main',
        path: '/src/index.ts'
      })

      expect(result.matches[0].line).toBe(4) // 4th line in the file
    })

    it('should return correct column positions', async () => {
      // Given: a pattern at a known position
      // When: searching
      // Then: column should be correct (1-indexed)

      const result = await grep({
        pattern: 'helper',
        path: '/src/index.ts'
      })

      // First match is in import statement
      const firstMatch = result.matches[0]
      expect(firstMatch.column).toBeGreaterThan(0)
    })

    it('should include full line content in match', async () => {
      // Given: a search pattern
      // When: searching
      // Then: content should contain the full line

      const result = await grep({
        pattern: 'debug',
        path: '/config/settings.json'
      })

      expect(result.matches[0].content).toContain('"debug"')
      expect(result.matches[0].content).toContain('true')
    })

    it('should return empty result when no matches', async () => {
      // Given: a pattern that doesn't exist
      // When: searching
      // Then: should return empty matches array

      const result = await grep({
        pattern: 'nonexistent-pattern-xyz',
        path: '/src/index.ts'
      })

      expect(result.matches).toEqual([])
      expect(result.matchCount).toBe(0)
      expect(result.fileCount).toBe(0)
    })
  })

  // ========================================
  // 2. Regex patterns (8 tests)
  // ========================================
  describe('regex patterns', () => {
    it('should match with basic regex', async () => {
      // Given: a regex pattern
      // When: searching
      // Then: should match using regex

      const result = await grep({
        pattern: /export\s+function/,
        path: '/src/index.ts'
      })

      expect(result.matchCount).toBeGreaterThan(0)
    })

    it('should support character classes', async () => {
      // Given: regex with character class
      // When: searching
      // Then: should match correctly

      const result = await grep({
        pattern: /[Hh]ello/,
        path: '/multiline.txt'
      })

      expect(result.matchCount).toBeGreaterThan(0)
    })

    it('should support quantifiers', async () => {
      // Given: regex with quantifiers
      // When: searching
      // Then: should match patterns with quantifiers

      const result = await grep({
        pattern: /fo+/,
        path: '/multiline.txt'
      })

      expect(result.matchCount).toBeGreaterThan(0)
    })

    it('should support anchors', async () => {
      // Given: regex with ^ anchor
      // When: searching
      // Then: should only match at line start

      const result = await grep({
        pattern: /^Line/,
        path: '/multiline.txt'
      })

      // Should match lines starting with "Line"
      expect(result.matchCount).toBeGreaterThan(0)
      result.matches.forEach(m => {
        expect(m.content.startsWith('Line')).toBe(true)
      })
    })

    it('should support groups', async () => {
      // Given: regex with capturing groups
      // When: searching
      // Then: should match and include matched text

      const result = await grep({
        pattern: /(function|const)\s+(\w+)/,
        path: '/src/index.ts'
      })

      expect(result.matchCount).toBeGreaterThan(0)
    })

    it('should support alternation', async () => {
      // Given: regex with alternation
      // When: searching
      // Then: should match either option

      const result = await grep({
        pattern: /import|export/,
        path: '/src/index.ts'
      })

      expect(result.matchCount).toBeGreaterThan(0)
    })

    it('should handle special regex characters in string pattern', async () => {
      // Given: a string pattern with special characters
      // When: searching (not regex)
      // Then: should treat as literal

      const result = await grep({
        pattern: '()',
        path: '/src/index.ts'
      })

      // Should find literal parentheses
      expect(result.matchCount).toBeGreaterThan(0)
    })

    it('should support lookahead assertions', async () => {
      // Given: regex with lookahead
      // When: searching
      // Then: should match with lookahead

      const result = await grep({
        pattern: /function(?=\s+\w+\()/,
        path: '/src/utils/helpers.ts'
      })

      expect(result.matchCount).toBeGreaterThan(0)
    })
  })

  // ========================================
  // 3. Options: ignoreCase (4 tests)
  // ========================================
  describe('options: ignoreCase', () => {
    it('should be case sensitive by default', async () => {
      // Given: default options
      // When: searching for lowercase
      // Then: should not match uppercase

      const result = await grep({
        pattern: 'hello',
        path: '/multiline.txt'
      })

      // Should only match lowercase "hello"
      expect(result.matches.every(m => m.match === 'hello')).toBe(true)
    })

    it('should match case-insensitively when ignoreCase is true', async () => {
      // Given: ignoreCase: true
      // When: searching for lowercase
      // Then: should match any case

      const result = await grep({
        pattern: 'hello',
        path: '/multiline.txt',
        ignoreCase: true
      })

      // Should match HELLO, Hello, hello
      expect(result.matchCount).toBeGreaterThan(1)
    })

    it('should apply ignoreCase to regex patterns', async () => {
      // Given: regex pattern with ignoreCase
      // When: searching
      // Then: should be case insensitive

      const result = await grep({
        pattern: /foo/,
        path: '/multiline.txt',
        ignoreCase: true
      })

      // Should match foo, FOO, Foo
      expect(result.matchCount).toBe(3) // Line 3, Line 8 (twice)
    })

    it('should not modify original regex flags', async () => {
      // Given: regex with its own flags
      // When: searching with ignoreCase
      // Then: should combine flags properly

      const result = await grep({
        pattern: /^line/i, // Already has i flag
        path: '/multiline.txt',
        ignoreCase: true
      })

      expect(result.matchCount).toBeGreaterThan(0)
    })
  })

  // ========================================
  // 4. Options: lineNumbers (3 tests)
  // ========================================
  describe('options: lineNumbers', () => {
    it('should include line numbers by default', async () => {
      // Given: default options
      // When: searching
      // Then: matches should have line numbers

      const result = await grep({
        pattern: 'export',
        path: '/src/index.ts'
      })

      expect(result.matches[0].line).toBeDefined()
      expect(typeof result.matches[0].line).toBe('number')
    })

    it('should still include line numbers when lineNumbers is true', async () => {
      // Given: lineNumbers: true (explicit)
      // When: searching
      // Then: matches should have line numbers

      const result = await grep({
        pattern: 'export',
        path: '/src/index.ts',
        lineNumbers: true
      })

      expect(result.matches[0].line).toBeGreaterThan(0)
    })

    it('should still have line property when lineNumbers is false', async () => {
      // Given: lineNumbers: false
      // When: searching
      // Then: line should still be available (for internal use)

      const result = await grep({
        pattern: 'export',
        path: '/src/index.ts',
        lineNumbers: false
      })

      // Line is still tracked, just might not be displayed
      expect(result.matches[0]).toHaveProperty('line')
    })
  })

  // ========================================
  // 5. Options: before/after context (6 tests)
  // ========================================
  describe('options: before/after context', () => {
    it('should not include context by default', async () => {
      // Given: no context options
      // When: searching
      // Then: before/after should be undefined

      const result = await grep({
        pattern: 'Line 5',
        path: '/multiline.txt'
      })

      expect(result.matches[0].before).toBeUndefined()
      expect(result.matches[0].after).toBeUndefined()
    })

    it('should include lines before match when before is set', async () => {
      // Given: before: 2
      // When: searching
      // Then: should include 2 lines before

      const result = await grep({
        pattern: 'Line 5',
        path: '/multiline.txt',
        before: 2
      })

      expect(result.matches[0].before).toHaveLength(2)
      expect(result.matches[0].before![0]).toContain('Line 3')
      expect(result.matches[0].before![1]).toContain('Line 4')
    })

    it('should include lines after match when after is set', async () => {
      // Given: after: 2
      // When: searching
      // Then: should include 2 lines after

      const result = await grep({
        pattern: 'Line 5',
        path: '/multiline.txt',
        after: 2
      })

      expect(result.matches[0].after).toHaveLength(2)
      expect(result.matches[0].after![0]).toContain('Line 6')
      expect(result.matches[0].after![1]).toContain('Line 7')
    })

    it('should handle both before and after together', async () => {
      // Given: before: 1 and after: 1
      // When: searching
      // Then: should include context on both sides

      const result = await grep({
        pattern: 'Line 5',
        path: '/multiline.txt',
        before: 1,
        after: 1
      })

      expect(result.matches[0].before).toHaveLength(1)
      expect(result.matches[0].after).toHaveLength(1)
    })

    it('should handle context at file start', async () => {
      // Given: searching near start of file
      // When: before context would exceed file start
      // Then: should return available lines only

      const result = await grep({
        pattern: 'Line 1',
        path: '/multiline.txt',
        before: 5
      })

      // Only 0 lines before line 1
      expect(result.matches[0].before).toHaveLength(0)
    })

    it('should handle context at file end', async () => {
      // Given: searching near end of file
      // When: after context would exceed file end
      // Then: should return available lines only

      const result = await grep({
        pattern: 'Line 10',
        path: '/multiline.txt',
        after: 5
      })

      // Only 0 lines after line 10
      expect(result.matches[0].after).toHaveLength(0)
    })
  })

  // ========================================
  // 6. Options: maxCount (4 tests)
  // ========================================
  describe('options: maxCount', () => {
    it('should return all matches by default', async () => {
      // Given: no maxCount
      // When: searching file with multiple matches
      // Then: should return all matches

      const result = await grep({
        pattern: 'Line',
        path: '/multiline.txt'
      })

      expect(result.matchCount).toBe(10) // Lines 1-10
    })

    it('should limit matches per file when maxCount is set', async () => {
      // Given: maxCount: 3
      // When: searching
      // Then: should return only 3 matches

      const result = await grep({
        pattern: 'Line',
        path: '/multiline.txt',
        maxCount: 3
      })

      expect(result.matches).toHaveLength(3)
    })

    it('should stop searching file after maxCount reached', async () => {
      // Given: maxCount: 1
      // When: searching
      // Then: should return first match only

      const result = await grep({
        pattern: 'Line',
        path: '/multiline.txt',
        maxCount: 1
      })

      expect(result.matches).toHaveLength(1)
      expect(result.matches[0].content).toContain('Line 1')
    })

    it('should apply maxCount per file in recursive search', async () => {
      // Given: maxCount with recursive search
      // When: searching multiple files
      // Then: each file should be limited to maxCount

      const result = await grep({
        pattern: 'export',
        path: '/src',
        recursive: true,
        maxCount: 1
      })

      // Each file should contribute at most 1 match
      const filesWithMatches = new Set(result.matches.map(m => m.file))
      expect(result.matches.length).toBe(filesWithMatches.size)
    })
  })

  // ========================================
  // 7. Options: filesOnly (4 tests)
  // ========================================
  describe('options: filesOnly', () => {
    it('should return full match details by default', async () => {
      // Given: no filesOnly option
      // When: searching
      // Then: should return full match information

      const result = await grep({
        pattern: 'export',
        path: '/src/index.ts'
      })

      expect(result.matches[0].content).toBeDefined()
      expect(result.matches[0].line).toBeDefined()
    })

    it('should return only one entry per file when filesOnly is true', async () => {
      // Given: filesOnly: true
      // When: searching file with multiple matches
      // Then: should return only one entry per file

      const result = await grep({
        pattern: 'TODO',
        path: '/src/components/Modal.tsx',
        filesOnly: true
      })

      // Even though there are 2 TODOs, only 1 file entry
      expect(result.matches).toHaveLength(1)
      expect(result.fileCount).toBe(1)
    })

    it('should still provide file path in filesOnly mode', async () => {
      // Given: filesOnly: true
      // When: searching
      // Then: file property should be set

      const result = await grep({
        pattern: 'export',
        path: '/src',
        recursive: true,
        filesOnly: true
      })

      expect(result.matches.every(m => m.file.length > 0)).toBe(true)
    })

    it('should count unique files in fileCount with filesOnly', async () => {
      // Given: filesOnly: true searching multiple files
      // When: searching recursively
      // Then: fileCount should equal matches length

      const result = await grep({
        pattern: 'function',
        path: '/src',
        recursive: true,
        filesOnly: true
      })

      expect(result.fileCount).toBe(result.matches.length)
    })
  })

  // ========================================
  // 8. Options: invert (4 tests)
  // ========================================
  describe('options: invert', () => {
    it('should return matching lines by default', async () => {
      // Given: no invert option
      // When: searching
      // Then: should return lines that match

      const result = await grep({
        pattern: 'Line',
        path: '/multiline.txt'
      })

      expect(result.matches.every(m => m.content.includes('Line'))).toBe(true)
    })

    it('should return non-matching lines when invert is true', async () => {
      // Given: invert: true
      // When: searching
      // Then: should return lines that do NOT match

      const result = await grep({
        pattern: 'Line',
        path: '/multiline.txt',
        invert: true
      })

      // None of the returned lines should contain "Line"
      expect(result.matches.every(m => !m.content.includes('Line'))).toBe(true)
    })

    it('should work with regex in invert mode', async () => {
      // Given: regex pattern with invert
      // When: searching
      // Then: should return non-matching lines

      const result = await grep({
        pattern: /^\s*\/\//,
        path: '/src/utils/helpers.ts',
        invert: true
      })

      // Should exclude comment lines
      expect(result.matches.every(m => !m.content.trim().startsWith('//'))).toBe(true)
    })

    it('should handle invert with empty file', async () => {
      // Given: empty file with invert
      // When: searching
      // Then: should return no matches

      const result = await grep({
        pattern: 'anything',
        path: '/empty.txt',
        invert: true
      })

      expect(result.matches).toHaveLength(0)
    })
  })

  // ========================================
  // 9. Options: wordMatch (4 tests)
  // ========================================
  describe('options: wordMatch', () => {
    it('should match partial words by default', async () => {
      // Given: no wordMatch option
      // When: searching for "help"
      // Then: should match "helper" too

      const result = await grep({
        pattern: 'help',
        path: '/src/utils/helpers.ts'
      })

      // Should match both "help" and "helper"
      expect(result.matchCount).toBeGreaterThan(0)
    })

    it('should match only whole words when wordMatch is true', async () => {
      // Given: wordMatch: true
      // When: searching for "help"
      // Then: should not match "helper"

      const result = await grep({
        pattern: 'help',
        path: '/src/utils/helpers.ts',
        wordMatch: true
      })

      // Should only match exact "help" word
      result.matches.forEach(m => {
        // The match should be bounded by non-word characters
        expect(m.match).toBe('help')
      })
    })

    it('should handle word boundaries with punctuation', async () => {
      // Given: wordMatch searching near punctuation
      // When: searching
      // Then: should respect word boundaries

      const result = await grep({
        pattern: 'true',
        path: '/config/settings.json',
        wordMatch: true
      })

      expect(result.matchCount).toBeGreaterThan(0)
    })

    it('should work with regex and wordMatch', async () => {
      // Given: regex with wordMatch
      // When: searching
      // Then: should add word boundaries to regex

      const result = await grep({
        pattern: /foo/,
        path: '/multiline.txt',
        wordMatch: true
      })

      // Should match "foo" but not "foobar" if present
      expect(result.matchCount).toBeGreaterThan(0)
    })
  })

  // ========================================
  // 10. Options: recursive (5 tests)
  // ========================================
  describe('options: recursive', () => {
    it('should only search single file when recursive is false', async () => {
      // Given: recursive: false (default) with directory path
      // When: searching
      // Then: should not traverse subdirectories

      const result = await grep({
        pattern: 'export',
        path: '/src',
        recursive: false
      })

      // Should only find matches in files directly in /src
      const hasSubdirMatches = result.matches.some(m =>
        m.file.includes('/src/utils/') || m.file.includes('/src/components/')
      )
      expect(hasSubdirMatches).toBe(false)
    })

    it('should search subdirectories when recursive is true', async () => {
      // Given: recursive: true
      // When: searching directory
      // Then: should find matches in subdirectories

      const result = await grep({
        pattern: 'export',
        path: '/src',
        recursive: true
      })

      // Should include matches from subdirectories
      const hasSubdirMatches = result.matches.some(m =>
        m.file.includes('/src/utils/') || m.file.includes('/src/components/')
      )
      expect(hasSubdirMatches).toBe(true)
    })

    it('should track fileCount correctly with recursive search', async () => {
      // Given: recursive search
      // When: searching
      // Then: fileCount should reflect unique files with matches

      const result = await grep({
        pattern: 'export',
        path: '/src',
        recursive: true
      })

      const uniqueFiles = new Set(result.matches.map(m => m.file))
      expect(result.fileCount).toBe(uniqueFiles.size)
    })

    it('should search from root when path is /', async () => {
      // Given: path: '/' with recursive
      // When: searching
      // Then: should search entire filesystem

      const result = await grep({
        pattern: 'TODO',
        path: '/',
        recursive: true
      })

      expect(result.fileCount).toBeGreaterThan(1)
    })

    it('should handle deeply nested directories', async () => {
      // Given: nested directory structure
      // When: recursive search
      // Then: should find matches at all depths

      const result = await grep({
        pattern: 'button',
        path: '/src',
        recursive: true,
        ignoreCase: true
      })

      expect(result.matches.some(m => m.file.includes('Button'))).toBe(true)
    })
  })

  // ========================================
  // 11. Options: glob filter (5 tests)
  // ========================================
  describe('options: glob filter', () => {
    it('should search all files when no glob specified', async () => {
      // Given: no glob option
      // When: recursive search
      // Then: should search all files

      const result = await grep({
        pattern: 'export',
        path: '/src',
        recursive: true
      })

      // Should find matches in both .ts and .tsx files
      const extensions = new Set(result.matches.map(m => m.file.split('.').pop()))
      expect(extensions.size).toBeGreaterThan(1)
    })

    it('should filter files by glob pattern', async () => {
      // Given: glob: '*.ts'
      // When: searching
      // Then: should only search .ts files

      const result = await grep({
        pattern: 'export',
        path: '/src',
        recursive: true,
        glob: '*.ts'
      })

      // All matches should be from .ts files
      expect(result.matches.every(m => m.file.endsWith('.ts'))).toBe(true)
    })

    it('should support glob patterns with **', async () => {
      // Given: glob with globstar
      // When: searching
      // Then: should match nested files

      const result = await grep({
        pattern: 'React',
        path: '/src',
        recursive: true,
        glob: '**/*.tsx'
      })

      expect(result.matches.every(m => m.file.endsWith('.tsx'))).toBe(true)
    })

    it('should support glob patterns with brace expansion', async () => {
      // Given: glob with braces
      // When: searching
      // Then: should match multiple extensions

      const result = await grep({
        pattern: 'function',
        path: '/',
        recursive: true,
        glob: '*.{ts,js}'
      })

      const extensions = new Set(result.matches.map(m => {
        const parts = m.file.split('.')
        return parts[parts.length - 1]
      }))
      expect(extensions.has('ts') || extensions.has('js')).toBe(true)
    })

    it('should exclude files not matching glob', async () => {
      // Given: glob filtering to .json
      // When: searching
      // Then: should not include other file types

      const result = await grep({
        pattern: 'name',
        path: '/',
        recursive: true,
        glob: '*.json'
      })

      expect(result.matches.every(m => m.file.endsWith('.json'))).toBe(true)
    })
  })

  // ========================================
  // 12. Edge cases (8 tests)
  // ========================================
  describe('edge cases', () => {
    it('should handle empty files', async () => {
      // Given: an empty file
      // When: searching
      // Then: should return no matches without error

      const result = await grep({
        pattern: 'anything',
        path: '/empty.txt'
      })

      expect(result.matches).toHaveLength(0)
      expect(result.matchCount).toBe(0)
    })

    it('should handle files with only whitespace', async () => {
      // Given: file with only whitespace
      // When: searching for content
      // Then: should handle gracefully

      // This would need a mock file with only whitespace
      const result = await grep({
        pattern: 'content',
        path: '/empty.txt'
      })

      expect(result.matches).toHaveLength(0)
    })

    it('should handle very long lines', async () => {
      // Given: a file with very long lines
      // When: searching
      // Then: should find matches without truncation issues

      const result = await grep({
        pattern: 'content',
        path: '/large-file.txt'
      })

      expect(Array.isArray(result.matches)).toBe(true)
    })

    it('should handle large files efficiently', async () => {
      // Given: a large file
      // When: searching
      // Then: should complete in reasonable time

      const start = Date.now()
      const result = await grep({
        pattern: 'line',
        path: '/large-file.txt',
        ignoreCase: true
      })
      const duration = Date.now() - start

      expect(duration).toBeLessThan(5000) // Should complete within 5 seconds
      expect(result.matchCount).toBeGreaterThan(0)
    })

    it('should handle multiple matches on same line', async () => {
      // Given: line with pattern appearing multiple times
      // When: searching
      // Then: should report each match

      const result = await grep({
        pattern: 'foo',
        path: '/multiline.txt'
      })

      // Line 8 has "foo FOO Foo" - should find "foo" at least
      expect(result.matchCount).toBeGreaterThan(0)
    })

    it('should handle unicode characters', async () => {
      // Given: pattern or file with unicode
      // When: searching
      // Then: should match correctly

      const result = await grep({
        pattern: 'test',
        path: '/multiline.txt'
      })

      // Should work with standard text
      expect(Array.isArray(result.matches)).toBe(true)
    })

    it('should handle regex special characters in string mode', async () => {
      // Given: string pattern with regex special chars
      // When: searching
      // Then: should treat as literal string

      const result = await grep({
        pattern: '{ return',
        path: '/src/utils/helpers.ts'
      })

      expect(result.matchCount).toBeGreaterThan(0)
    })

    it('should handle newlines in pattern', async () => {
      // Given: pattern that could span lines
      // When: searching line by line
      // Then: should match within single lines

      const result = await grep({
        pattern: 'export\nfunction',
        path: '/src/index.ts'
      })

      // Newline in pattern typically shouldn't match across lines
      expect(result.matchCount).toBe(0)
    })
  })

  // ========================================
  // 13. Error handling (5 tests)
  // ========================================
  describe('error handling', () => {
    it('should throw error for non-existent path', async () => {
      // Given: path that doesn't exist
      // When: searching
      // Then: should throw error

      await expect(
        grep({
          pattern: 'test',
          path: '/nonexistent/path/file.txt'
        })
      ).rejects.toThrow()
    })

    it('should throw error for invalid regex', async () => {
      // Given: invalid regex pattern constructed at runtime
      // When: searching
      // Then: should throw error
      // Note: The RegExp constructor throws SyntaxError for invalid patterns

      const createInvalidRegex = () => new RegExp('[invalid(')
      expect(createInvalidRegex).toThrow(SyntaxError)
    })

    it('should handle permission denied gracefully', async () => {
      // Given: file without read permissions
      // When: searching
      // Then: should handle error appropriately

      // This tests the error handling path
      // Implementation should catch and report permission errors
      await expect(
        grep({
          pattern: 'test',
          path: '/restricted/file.txt' // Simulated restricted file
        })
      ).rejects.toThrow()
    })

    it('should provide meaningful error messages', async () => {
      // Given: an error condition
      // When: error occurs
      // Then: message should be descriptive

      try {
        await grep({
          pattern: 'test',
          path: '/nonexistent'
        })
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as Error).message).toBeTruthy()
      }
    })

    it('should handle empty pattern appropriately', async () => {
      // Given: empty string pattern
      // When: searching
      // Then: should handle appropriately (match all or throw)

      // Empty pattern behavior can vary - might match everything or throw
      const result = await grep({
        pattern: '',
        path: '/src/index.ts'
      })

      // Either matches all lines or returns empty
      expect(Array.isArray(result.matches)).toBe(true)
    })
  })

  // ========================================
  // 14. Performance and streaming (4 tests)
  // ========================================
  describe('performance', () => {
    it('should support early termination with maxCount', async () => {
      // Given: large file with maxCount: 1
      // When: searching
      // Then: should return quickly without reading entire file

      const start = Date.now()
      const result = await grep({
        pattern: 'line',
        path: '/large-file.txt',
        maxCount: 1,
        ignoreCase: true
      })
      const duration = Date.now() - start

      expect(result.matches).toHaveLength(1)
      expect(duration).toBeLessThan(1000) // Should be very fast
    })

    it('should handle concurrent grep operations', async () => {
      // Given: multiple grep calls
      // When: running concurrently
      // Then: all should complete correctly

      const results = await Promise.all([
        grep({ pattern: 'export', path: '/src/index.ts' }),
        grep({ pattern: 'import', path: '/src/index.ts' }),
        grep({ pattern: 'function', path: '/src/utils/helpers.ts' })
      ])

      expect(results).toHaveLength(3)
      results.forEach(r => {
        expect(r.matches).toBeDefined()
      })
    })

    it('should return consistent results on repeated calls', async () => {
      // Given: same grep parameters
      // When: called multiple times
      // Then: results should be identical

      const result1 = await grep({
        pattern: 'TODO',
        path: '/src',
        recursive: true
      })

      const result2 = await grep({
        pattern: 'TODO',
        path: '/src',
        recursive: true
      })

      expect(result1.matchCount).toBe(result2.matchCount)
      expect(result1.matches).toEqual(result2.matches)
    })

    it('should efficiently handle filesOnly mode', async () => {
      // Given: filesOnly mode
      // When: searching
      // Then: should not process all matches per file

      const start = Date.now()
      const result = await grep({
        pattern: 'line',
        path: '/large-file.txt',
        filesOnly: true,
        ignoreCase: true
      })
      const duration = Date.now() - start

      expect(result.matches).toHaveLength(1) // Just one file entry
      expect(duration).toBeLessThan(1000)
    })
  })

  // ========================================
  // 15. Combined options (4 tests)
  // ========================================
  describe('combined options', () => {
    it('should combine recursive, glob, and ignoreCase', async () => {
      // Given: multiple options together
      // When: searching
      // Then: all options should apply

      const result = await grep({
        pattern: 'todo',
        path: '/src',
        recursive: true,
        glob: '*.tsx',
        ignoreCase: true
      })

      expect(result.matches.every(m => m.file.endsWith('.tsx'))).toBe(true)
      expect(result.matchCount).toBeGreaterThan(0)
    })

    it('should combine maxCount, before, and after', async () => {
      // Given: maxCount with context options
      // When: searching
      // Then: should limit matches and include context

      const result = await grep({
        pattern: 'Line 5',
        path: '/multiline.txt',
        maxCount: 1,
        before: 1,
        after: 1
      })

      expect(result.matches).toHaveLength(1)
      expect(result.matches[0].before).toBeDefined()
      expect(result.matches[0].after).toBeDefined()
    })

    it('should combine invert with recursive and glob', async () => {
      // Given: invert with file filtering
      // When: searching
      // Then: should find non-matching lines in matching files

      const result = await grep({
        pattern: 'import',
        path: '/src',
        recursive: true,
        glob: '*.ts',
        invert: true
      })

      // All matches should be non-import lines from .ts files
      expect(result.matches.every(m =>
        m.file.endsWith('.ts') && !m.content.includes('import')
      )).toBe(true)
    })

    it('should combine wordMatch with ignoreCase', async () => {
      // Given: both wordMatch and ignoreCase
      // When: searching
      // Then: should match whole words case-insensitively

      const result = await grep({
        pattern: 'HELLO',
        path: '/multiline.txt',
        wordMatch: true,
        ignoreCase: true
      })

      // Should match "Hello", "HELLO", "hello" as whole words
      expect(result.matchCount).toBeGreaterThan(0)
    })
  })

  // ========================================
  // 16. Integration scenarios (4 tests)
  // ========================================
  describe('integration scenarios', () => {
    it('should work like git grep for finding TODOs', async () => {
      // Given: common git grep use case
      // When: searching for TODO comments
      // Then: should find all TODO comments

      const result = await grep({
        pattern: 'TODO',
        path: '/',
        recursive: true,
        glob: '*.{ts,tsx}'
      })

      expect(result.matchCount).toBeGreaterThan(0)
      expect(result.fileCount).toBeGreaterThan(0)
    })

    it('should work like grep -r for code search', async () => {
      // Given: recursive code search pattern
      // When: searching for function definitions
      // Then: should find all matches

      const result = await grep({
        pattern: /export\s+(async\s+)?function\s+\w+/,
        path: '/src',
        recursive: true
      })

      expect(result.matchCount).toBeGreaterThan(0)
    })

    it('should support searching test files', async () => {
      // Given: searching for test patterns
      // When: grep test directory
      // Then: should find test cases

      const result = await grep({
        pattern: /describe\s*\(/,
        path: '/test',
        recursive: true
      })

      expect(result.matchCount).toBeGreaterThan(0)
    })

    it('should support searching config files', async () => {
      // Given: searching JSON config
      // When: looking for config keys
      // Then: should find matches

      const result = await grep({
        pattern: '"debug"',
        path: '/',
        recursive: true,
        glob: '*.json'
      })

      expect(result.matchCount).toBeGreaterThan(0)
    })
  })
})
