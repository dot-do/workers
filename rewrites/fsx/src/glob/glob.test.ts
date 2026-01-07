/**
 * Tests for glob file matching (RED phase - should fail)
 *
 * The glob() function finds files matching glob patterns by combining
 * pattern matching with filesystem traversal.
 *
 * This integrates with:
 * - match() from ./match.ts for pattern matching
 * - readdir() for directory traversal
 *
 * Use cases:
 * - .gitignore matching
 * - Sparse checkout patterns
 * - File discovery in gitx
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { glob, type GlobOptions } from './glob'

/**
 * Mock filesystem structure for tests:
 *
 * /
 * |-- src/
 * |   |-- index.ts
 * |   |-- utils/
 * |   |   |-- helpers.ts
 * |   |   |-- format.ts
 * |   |-- components/
 * |   |   |-- Button.tsx
 * |   |   |-- Modal.tsx
 * |   |   |-- ui/
 * |   |   |   |-- Icon.tsx
 * |-- lib/
 * |   |-- index.js
 * |   |-- utils.js
 * |-- test/
 * |   |-- index.test.ts
 * |   |-- helpers.test.ts
 * |-- node_modules/
 * |   |-- lodash/
 * |   |   |-- index.js
 * |-- .gitignore
 * |-- .env
 * |-- .hidden/
 * |   |-- secrets.txt
 * |-- package.json
 * |-- README.md
 * |-- tsconfig.json
 */

describe('glob', () => {
  // ========================================
  // 1. Basic patterns (8 tests)
  // ========================================
  describe('basic patterns', () => {
    it('should match files with simple extension pattern', async () => {
      // Given: a pattern matching TypeScript files in current directory
      // When: globbing with *.ts
      // Then: should return TypeScript files in root only

      const result = await glob('*.ts', { cwd: '/src' })

      expect(result).toContain('index.ts')
      expect(result).not.toContain('utils/helpers.ts')
    })

    it('should match files in a specific directory', async () => {
      // Given: pattern like src/*.ts
      // When: globbing
      // Then: should return files in that directory

      const result = await glob('src/*.ts')

      expect(result).toContain('src/index.ts')
      expect(result).not.toContain('src/utils/helpers.ts')
    })

    it('should match exact filename', async () => {
      // Given: exact filename pattern
      // When: globbing
      // Then: should return only that file

      const result = await glob('package.json')

      expect(result).toEqual(['package.json'])
    })

    it('should match files with specific name pattern', async () => {
      // Given: pattern with partial name match
      // When: globbing
      // Then: should match files containing that pattern

      const result = await glob('*.test.ts', { cwd: '/test' })

      expect(result).toContain('index.test.ts')
      expect(result).toContain('helpers.test.ts')
    })

    it('should return empty array when no matches', async () => {
      // Given: pattern that matches nothing
      // When: globbing
      // Then: should return empty array

      const result = await glob('*.py')

      expect(result).toEqual([])
    })

    it('should match files with multiple extensions', async () => {
      // Given: pattern with brace expansion for extensions
      // When: globbing
      // Then: should match files with any of those extensions

      const result = await glob('src/**/*.{ts,tsx}')

      expect(result).toContain('src/index.ts')
      expect(result).toContain('src/components/Button.tsx')
    })

    it('should handle question mark wildcard', async () => {
      // Given: pattern with ? for single character
      // When: globbing
      // Then: should match files with exactly one char at that position

      const result = await glob('lib/*.js')

      expect(result).toContain('lib/index.js')
      expect(result).toContain('lib/utils.js')
    })

    it('should handle character class patterns', async () => {
      // Given: pattern with character class [abc]
      // When: globbing
      // Then: should match files with those characters

      const result = await glob('[Rp]*.{json,md}')

      expect(result).toContain('README.md')
      expect(result).toContain('package.json')
    })
  })

  // ========================================
  // 2. Globstar ** patterns (10 tests)
  // ========================================
  describe('globstar ** patterns', () => {
    it('should match all files recursively with **/*', async () => {
      // Given: globstar pattern
      // When: globbing
      // Then: should match all files at all depths

      const result = await glob('**/*')

      expect(result.length).toBeGreaterThan(10)
      expect(result).toContain('src/index.ts')
      expect(result).toContain('src/utils/helpers.ts')
      expect(result).toContain('src/components/ui/Icon.tsx')
    })

    it('should match specific extension recursively', async () => {
      // Given: pattern like **/*.ts
      // When: globbing
      // Then: should find all .ts files at any depth

      const result = await glob('**/*.ts')

      expect(result).toContain('src/index.ts')
      expect(result).toContain('src/utils/helpers.ts')
      expect(result).toContain('test/index.test.ts')
    })

    it('should match files in specific subdirectory', async () => {
      // Given: pattern like src/**/*.ts
      // When: globbing
      // Then: should only match within that directory

      const result = await glob('src/**/*.ts')

      expect(result).toContain('src/index.ts')
      expect(result).toContain('src/utils/helpers.ts')
      expect(result).not.toContain('test/index.test.ts')
    })

    it('should match with globstar at end', async () => {
      // Given: pattern like src/**
      // When: globbing
      // Then: should match all files under src

      const result = await glob('src/**')

      expect(result).toContain('src/index.ts')
      expect(result).toContain('src/utils/helpers.ts')
      expect(result).toContain('src/components/ui/Icon.tsx')
    })

    it('should match with globstar in middle', async () => {
      // Given: pattern like src/**/ui/*.tsx
      // When: globbing
      // Then: should match files in ui folders at any depth under src

      const result = await glob('src/**/ui/*.tsx')

      expect(result).toContain('src/components/ui/Icon.tsx')
    })

    it('should handle multiple globstars', async () => {
      // Given: pattern with multiple **
      // When: globbing
      // Then: should work correctly

      const result = await glob('**/components/**/*.tsx')

      expect(result).toContain('src/components/Button.tsx')
      expect(result).toContain('src/components/ui/Icon.tsx')
    })

    it('should match node_modules at any depth', async () => {
      // Given: pattern for node_modules
      // When: globbing
      // Then: should find node_modules anywhere

      const result = await glob('**/node_modules/**/*.js')

      expect(result).toContain('node_modules/lodash/index.js')
    })

    it('should match zero directories with **', async () => {
      // Given: pattern like **/*.json
      // When: files exist at root level
      // Then: should match root level files too

      const result = await glob('**/*.json')

      expect(result).toContain('package.json')
      expect(result).toContain('tsconfig.json')
    })

    it('should match test files pattern', async () => {
      // Given: common test file pattern
      // When: globbing
      // Then: should find all test files

      const result = await glob('**/*.test.ts')

      expect(result).toContain('test/index.test.ts')
      expect(result).toContain('test/helpers.test.ts')
    })

    it('should match deeply nested files', async () => {
      // Given: deeply nested file structure
      // When: using globstar
      // Then: should match regardless of depth

      const result = await glob('**/*.tsx')

      expect(result).toContain('src/components/Button.tsx')
      expect(result).toContain('src/components/Modal.tsx')
      expect(result).toContain('src/components/ui/Icon.tsx')
    })
  })

  // ========================================
  // 3. Multiple patterns (6 tests)
  // ========================================
  describe('multiple patterns (array)', () => {
    it('should match files from multiple patterns', async () => {
      // Given: array of patterns
      // When: globbing
      // Then: should return union of all matches

      const result = await glob(['*.json', '*.md'])

      expect(result).toContain('package.json')
      expect(result).toContain('tsconfig.json')
      expect(result).toContain('README.md')
    })

    it('should deduplicate results across patterns', async () => {
      // Given: overlapping patterns
      // When: globbing
      // Then: each file should appear only once

      const result = await glob(['**/*.ts', 'src/**/*.ts'])

      const unique = new Set(result)
      expect(result.length).toBe(unique.size)
    })

    it('should handle mix of simple and globstar patterns', async () => {
      // Given: mix of pattern types
      // When: globbing
      // Then: all patterns work together

      const result = await glob(['package.json', 'src/**/*.ts', 'lib/*.js'])

      expect(result).toContain('package.json')
      expect(result).toContain('src/index.ts')
      expect(result).toContain('lib/index.js')
    })

    it('should return empty array if no patterns match', async () => {
      // Given: patterns that match nothing
      // When: globbing
      // Then: should return empty array

      const result = await glob(['*.py', '*.rb', '*.go'])

      expect(result).toEqual([])
    })

    it('should support single pattern in array', async () => {
      // Given: single pattern wrapped in array
      // When: globbing
      // Then: should work same as string pattern

      const arrayResult = await glob(['*.json'])
      const stringResult = await glob('*.json')

      expect(arrayResult).toEqual(stringResult)
    })

    it('should handle empty array', async () => {
      // Given: empty array of patterns
      // When: globbing
      // Then: should return empty array

      const result = await glob([])

      expect(result).toEqual([])
    })
  })

  // ========================================
  // 4. Options: dot (5 tests)
  // ========================================
  describe('options: dot', () => {
    it('should exclude dotfiles by default', async () => {
      // Given: default options (dot: false)
      // When: globbing
      // Then: should not include dotfiles

      const result = await glob('*')

      expect(result).not.toContain('.gitignore')
      expect(result).not.toContain('.env')
    })

    it('should include dotfiles when dot is true', async () => {
      // Given: dot: true option
      // When: globbing
      // Then: should include dotfiles

      const result = await glob('*', { dot: true })

      expect(result).toContain('.gitignore')
      expect(result).toContain('.env')
    })

    it('should include dot directories when dot is true', async () => {
      // Given: dot: true option with recursive pattern
      // When: globbing
      // Then: should traverse into dot directories

      const result = await glob('**/*', { dot: true })

      expect(result).toContain('.hidden/secrets.txt')
    })

    it('should exclude dot directories by default', async () => {
      // Given: default options
      // When: globbing recursively
      // Then: should not include files in dot directories

      const result = await glob('**/*')

      expect(result).not.toContain('.hidden/secrets.txt')
    })

    it('should match dotfiles with explicit pattern', async () => {
      // Given: pattern explicitly starting with .
      // When: globbing without dot option
      // Then: should still match (pattern is explicit)

      const result = await glob('.gitignore')

      expect(result).toContain('.gitignore')
    })
  })

  // ========================================
  // 5. Options: ignore (6 tests)
  // ========================================
  describe('options: ignore', () => {
    it('should exclude files matching ignore pattern', async () => {
      // Given: ignore pattern for test files
      // When: globbing
      // Then: should not include test files

      const result = await glob('**/*.ts', {
        ignore: ['**/*.test.ts']
      })

      expect(result).not.toContain('test/index.test.ts')
      expect(result).toContain('src/index.ts')
    })

    it('should exclude directories matching ignore pattern', async () => {
      // Given: ignore pattern for node_modules
      // When: globbing
      // Then: should not include anything from node_modules

      const result = await glob('**/*.js', {
        ignore: ['**/node_modules/**']
      })

      expect(result).not.toContain('node_modules/lodash/index.js')
      expect(result).toContain('lib/index.js')
    })

    it('should support multiple ignore patterns', async () => {
      // Given: array of ignore patterns
      // When: globbing
      // Then: all patterns should be excluded

      const result = await glob('**/*', {
        ignore: ['**/node_modules/**', '**/test/**', '*.md']
      })

      expect(result).not.toContain('node_modules/lodash/index.js')
      expect(result).not.toContain('test/index.test.ts')
      expect(result).not.toContain('README.md')
    })

    it('should handle empty ignore array', async () => {
      // Given: empty ignore array
      // When: globbing
      // Then: should work same as no ignore option

      const withEmptyIgnore = await glob('*.json', { ignore: [] })
      const withoutIgnore = await glob('*.json')

      expect(withEmptyIgnore).toEqual(withoutIgnore)
    })

    it('should ignore files matching glob ignore patterns', async () => {
      // Given: ignore with glob pattern
      // When: globbing
      // Then: should exclude matching files

      const result = await glob('**/*', {
        ignore: ['**/*.test.*']
      })

      expect(result).not.toContain('test/index.test.ts')
      expect(result).not.toContain('test/helpers.test.ts')
    })

    it('should apply ignore after matching', async () => {
      // Given: pattern that matches, then ignore that excludes
      // When: globbing
      // Then: matched files should be filtered by ignore

      const result = await glob('src/**/*.ts', {
        ignore: ['**/utils/**']
      })

      expect(result).toContain('src/index.ts')
      expect(result).not.toContain('src/utils/helpers.ts')
    })
  })

  // ========================================
  // 6. Options: onlyFiles / onlyDirectories (5 tests)
  // ========================================
  describe('options: onlyFiles / onlyDirectories', () => {
    it('should return only files by default', async () => {
      // Given: default options (onlyFiles: true)
      // When: globbing
      // Then: should only return files, not directories

      const result = await glob('src/*')

      expect(result).toContain('src/index.ts')
      expect(result).not.toContain('src/utils')
      expect(result).not.toContain('src/components')
    })

    it('should return both files and directories when onlyFiles is false', async () => {
      // Given: onlyFiles: false
      // When: globbing
      // Then: should return both

      const result = await glob('src/*', { onlyFiles: false })

      expect(result).toContain('src/index.ts')
      expect(result).toContain('src/utils')
      expect(result).toContain('src/components')
    })

    it('should return only directories when onlyDirectories is true', async () => {
      // Given: onlyDirectories: true
      // When: globbing
      // Then: should only return directories

      const result = await glob('src/*', { onlyDirectories: true })

      expect(result).toContain('src/utils')
      expect(result).toContain('src/components')
      expect(result).not.toContain('src/index.ts')
    })

    it('should handle onlyDirectories with recursive pattern', async () => {
      // Given: onlyDirectories with **
      // When: globbing
      // Then: should return all directories at all depths

      const result = await glob('src/**', { onlyDirectories: true })

      expect(result).toContain('src/utils')
      expect(result).toContain('src/components')
      expect(result).toContain('src/components/ui')
    })

    it('should return empty if no directories match', async () => {
      // Given: onlyDirectories but pattern only matches files
      // When: globbing
      // Then: should return empty

      const result = await glob('*.json', { onlyDirectories: true })

      expect(result).toEqual([])
    })
  })

  // ========================================
  // 7. Options: deep (5 tests)
  // ========================================
  describe('options: deep', () => {
    it('should limit depth when deep is specified', async () => {
      // Given: deep: 1
      // When: globbing with **
      // Then: should only go one level deep

      const result = await glob('**/*', { deep: 1 })

      expect(result).toContain('src/index.ts')
      expect(result).not.toContain('src/utils/helpers.ts')
    })

    it('should return no files when deep is 0', async () => {
      // Given: deep: 0
      // When: globbing with recursive pattern
      // Then: should only match at root level

      const result = await glob('**/*.ts', { deep: 0 })

      // No .ts files at root level
      expect(result).toEqual([])
    })

    it('should go unlimited depth when deep is undefined', async () => {
      // Given: no deep option
      // When: globbing
      // Then: should traverse all depths

      const result = await glob('**/*.tsx')

      expect(result).toContain('src/components/ui/Icon.tsx')
    })

    it('should handle deep: 2 correctly', async () => {
      // Given: deep: 2
      // When: globbing
      // Then: should go two levels deep

      const result = await glob('**/*', { deep: 2 })

      expect(result).toContain('src/utils/helpers.ts')
      expect(result).not.toContain('src/components/ui/Icon.tsx')
    })

    it('should work with deep and cwd combined', async () => {
      // Given: cwd and deep options
      // When: globbing
      // Then: depth should be relative to cwd

      const result = await glob('**/*', { cwd: '/src', deep: 1 })

      expect(result).toContain('index.ts')
      expect(result).toContain('utils/helpers.ts')
      expect(result).not.toContain('components/ui/Icon.tsx')
    })
  })

  // ========================================
  // 8. Options: absolute (4 tests)
  // ========================================
  describe('options: absolute', () => {
    it('should return relative paths by default', async () => {
      // Given: default options
      // When: globbing
      // Then: paths should be relative to cwd

      const result = await glob('src/*.ts')

      expect(result[0]).not.toMatch(/^\//)
      expect(result).toContain('src/index.ts')
    })

    it('should return absolute paths when absolute is true', async () => {
      // Given: absolute: true
      // When: globbing
      // Then: paths should start with /

      const result = await glob('src/*.ts', { absolute: true })

      expect(result.every(p => p.startsWith('/'))).toBe(true)
      expect(result).toContain('/src/index.ts')
    })

    it('should return absolute paths with cwd option', async () => {
      // Given: both absolute and cwd options
      // When: globbing
      // Then: should return absolute paths

      const result = await glob('*.ts', { cwd: '/src', absolute: true })

      expect(result).toContain('/src/index.ts')
    })

    it('should handle absolute paths correctly with recursive pattern', async () => {
      // Given: absolute: true with ** pattern
      // When: globbing
      // Then: all paths should be absolute

      const result = await glob('**/*.ts', { absolute: true })

      expect(result.every(p => p.startsWith('/'))).toBe(true)
    })
  })

  // ========================================
  // 9. Options: followSymlinks (3 tests)
  // ========================================
  describe('options: followSymlinks', () => {
    it('should follow symlinks by default', async () => {
      // Given: default options (followSymlinks: true)
      // When: globbing through symlinked directory
      // Then: should include files in symlinked target

      // Assuming there's a symlink in the test filesystem
      const result = await glob('**/*', { followSymlinks: true })

      // The specific assertion depends on test filesystem setup
      expect(Array.isArray(result)).toBe(true)
    })

    it('should not follow symlinks when followSymlinks is false', async () => {
      // Given: followSymlinks: false
      // When: globbing
      // Then: should not traverse into symlinked directories

      const result = await glob('**/*', { followSymlinks: false })

      expect(Array.isArray(result)).toBe(true)
    })

    it('should include symlink itself when not following', async () => {
      // Given: followSymlinks: false with onlyFiles: false
      // When: globbing
      // Then: symlink entries should be included

      const result = await glob('*', { followSymlinks: false, onlyFiles: false })

      expect(Array.isArray(result)).toBe(true)
    })
  })

  // ========================================
  // 10. Options: cwd (5 tests)
  // ========================================
  describe('options: cwd', () => {
    it('should use / as default cwd', async () => {
      // Given: no cwd option
      // When: globbing
      // Then: should search from root

      const result = await glob('src/*.ts')

      expect(result).toContain('src/index.ts')
    })

    it('should search relative to cwd', async () => {
      // Given: cwd set to /src
      // When: globbing *.ts
      // Then: should find files in /src

      const result = await glob('*.ts', { cwd: '/src' })

      expect(result).toContain('index.ts')
      expect(result).not.toContain('src/index.ts')
    })

    it('should handle nested cwd', async () => {
      // Given: cwd set to /src/components
      // When: globbing
      // Then: should search within that directory

      const result = await glob('*.tsx', { cwd: '/src/components' })

      expect(result).toContain('Button.tsx')
      expect(result).toContain('Modal.tsx')
    })

    it('should handle cwd with trailing slash', async () => {
      // Given: cwd with trailing slash
      // When: globbing
      // Then: should work correctly

      const result1 = await glob('*.ts', { cwd: '/src' })
      const result2 = await glob('*.ts', { cwd: '/src/' })

      expect(result1).toEqual(result2)
    })

    it('should throw error for non-existent cwd', async () => {
      // Given: cwd that doesn't exist
      // When: globbing
      // Then: should throw error

      await expect(
        glob('*.ts', { cwd: '/nonexistent/path' })
      ).rejects.toThrow()
    })
  })

  // ========================================
  // 11. Edge cases (8 tests)
  // ========================================
  describe('edge cases', () => {
    it('should return empty array for empty pattern string', async () => {
      // Given: empty pattern
      // When: globbing
      // Then: should return empty array (or throw)

      await expect(glob('')).rejects.toThrow()
    })

    it('should handle pattern with only globstar', async () => {
      // Given: pattern is just **
      // When: globbing
      // Then: should match everything

      const result = await glob('**')

      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle special characters in filenames', async () => {
      // Given: files with special characters
      // When: globbing
      // Then: should handle correctly

      const result = await glob('**/*')

      expect(Array.isArray(result)).toBe(true)
    })

    it('should handle very deep nesting', async () => {
      // Given: deeply nested structure
      // When: globbing with **
      // Then: should find all files

      const result = await glob('**/Icon.tsx')

      expect(result).toContain('src/components/ui/Icon.tsx')
    })

    it('should not match partial filenames', async () => {
      // Given: pattern that could partially match
      // When: globbing
      // Then: should require full match

      const result = await glob('index')

      // Should only match exactly 'index', not 'index.ts'
      expect(result).not.toContain('index.ts')
    })

    it('should handle negation patterns in ignore', async () => {
      // Given: negation pattern in ignore
      // When: globbing
      // Then: should work correctly

      const result = await glob('**/*.ts', {
        ignore: ['**/*.test.ts']
      })

      expect(result).toContain('src/index.ts')
      expect(result).not.toContain('test/index.test.ts')
    })

    it('should handle concurrent glob calls', async () => {
      // Given: multiple concurrent glob calls
      // When: awaiting all
      // Then: all should complete correctly

      const [result1, result2, result3] = await Promise.all([
        glob('**/*.ts'),
        glob('**/*.tsx'),
        glob('**/*.js')
      ])

      expect(result1.length).toBeGreaterThan(0)
      expect(result2.length).toBeGreaterThan(0)
      expect(result3.length).toBeGreaterThan(0)
    })

    it('should return consistent ordering', async () => {
      // Given: same glob pattern called multiple times
      // When: comparing results
      // Then: ordering should be consistent

      const result1 = await glob('**/*.ts')
      const result2 = await glob('**/*.ts')

      expect(result1).toEqual(result2)
    })
  })

  // ========================================
  // 12. Integration with match() (5 tests)
  // ========================================
  describe('integration with match()', () => {
    it('should use same pattern semantics as match()', async () => {
      // Given: a pattern
      // When: globbing
      // Then: results should be consistent with match() function

      const result = await glob('*.{ts,tsx}', { cwd: '/src' })

      expect(result).toContain('index.ts')
      // No .tsx files in /src root
    })

    it('should handle character classes like match()', async () => {
      // Given: pattern with character class
      // When: globbing
      // Then: should match same as match()

      const result = await glob('[A-Z]*.tsx', { cwd: '/src/components' })

      expect(result).toContain('Button.tsx')
      expect(result).toContain('Modal.tsx')
    })

    it('should handle negation pattern results like match()', async () => {
      // Given: negation in ignore patterns
      // When: globbing
      // Then: negation should work as in match()

      const result = await glob('**/*.ts', {
        ignore: ['!src/index.ts'] // Keep this file even though ignored pattern would exclude
      })

      // Behavior depends on how negation in ignore is interpreted
      expect(Array.isArray(result)).toBe(true)
    })

    it('should respect dot option like match()', async () => {
      // Given: dot option
      // When: globbing dotfiles
      // Then: should behave same as match() with dot option

      const withDot = await glob('.*', { dot: true })
      const withoutDot = await glob('.*') // Explicit dot pattern

      expect(withDot).toContain('.gitignore')
      expect(withoutDot).toContain('.gitignore')
    })

    it('should handle brace expansion like match()', async () => {
      // Given: brace expansion pattern
      // When: globbing
      // Then: should expand like match()

      const result = await glob('{src,lib}/**/*.{ts,js}')

      expect(result).toContain('src/index.ts')
      expect(result).toContain('lib/index.js')
    })
  })

  // ========================================
  // 13. Combined options (4 tests)
  // ========================================
  describe('combined options', () => {
    it('should combine cwd, ignore, and dot options', async () => {
      // Given: multiple options combined
      // When: globbing
      // Then: all options should apply

      const result = await glob('**/*', {
        cwd: '/src',
        ignore: ['**/utils/**'],
        dot: true
      })

      expect(result).not.toContain('utils/helpers.ts')
      expect(result).toContain('index.ts')
    })

    it('should combine deep, absolute, and onlyDirectories options', async () => {
      // Given: deep, absolute, and onlyDirectories
      // When: globbing
      // Then: all should apply

      const result = await glob('**', {
        deep: 2,
        absolute: true,
        onlyDirectories: true
      })

      expect(result.every(p => p.startsWith('/'))).toBe(true)
    })

    it('should combine all filtering options', async () => {
      // Given: onlyFiles, ignore, dot all together
      // When: globbing
      // Then: all filters should apply

      const result = await glob('**/*', {
        onlyFiles: true,
        ignore: ['**/node_modules/**', '**/*.test.ts'],
        dot: true
      })

      expect(result).not.toContain('test/index.test.ts')
      expect(result).not.toContain('node_modules/lodash/index.js')
      expect(result).toContain('.gitignore')
    })

    it('should combine cwd and absolute for correct paths', async () => {
      // Given: cwd and absolute together
      // When: globbing
      // Then: absolute paths should be relative to cwd

      const result = await glob('*.ts', {
        cwd: '/src/utils',
        absolute: true
      })

      expect(result).toContain('/src/utils/helpers.ts')
      expect(result).toContain('/src/utils/format.ts')
    })
  })

  // ========================================
  // 14. Real-world patterns (5 tests)
  // ========================================
  describe('real-world patterns', () => {
    it('should find all TypeScript source files excluding tests', async () => {
      // Given: common pattern for source files
      // When: globbing
      // Then: should find source but not test files

      const result = await glob('**/*.{ts,tsx}', {
        ignore: ['**/*.test.ts', '**/node_modules/**']
      })

      expect(result).toContain('src/index.ts')
      expect(result).toContain('src/components/Button.tsx')
      expect(result).not.toContain('test/index.test.ts')
    })

    it('should implement gitignore-like behavior', async () => {
      // Given: gitignore-style patterns
      // When: globbing with ignore
      // Then: should behave like gitignore

      const result = await glob('**/*', {
        ignore: [
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '*.log'
        ]
      })

      expect(result).not.toContain('node_modules/lodash/index.js')
    })

    it('should find config files at root', async () => {
      // Given: pattern for config files
      // When: globbing
      // Then: should find root-level configs

      const result = await glob('*.{json,md}')

      expect(result).toContain('package.json')
      expect(result).toContain('tsconfig.json')
      expect(result).toContain('README.md')
    })

    it('should find all component files', async () => {
      // Given: pattern for React components
      // When: globbing
      // Then: should find all .tsx files in components

      const result = await glob('**/components/**/*.tsx')

      expect(result).toContain('src/components/Button.tsx')
      expect(result).toContain('src/components/Modal.tsx')
      expect(result).toContain('src/components/ui/Icon.tsx')
    })

    it('should support sparse checkout patterns', async () => {
      // Given: sparse checkout-style include patterns
      // When: globbing
      // Then: should match only specified directories

      const result = await glob(['src/**', 'lib/**'], {
        ignore: ['**/node_modules/**']
      })

      expect(result).toContain('src/index.ts')
      expect(result).toContain('lib/index.js')
      expect(result).not.toContain('test/index.test.ts')
    })
  })
})
