/**
 * Tests for glob pattern matching (RED phase - should fail)
 *
 * The match() function tests if a path matches a glob pattern.
 * Supports standard glob syntax:
 * - * matches any characters except path separator
 * - ** matches any characters including path separators (globstar)
 * - ? matches exactly one character (not path separator)
 * - [abc] matches any character in the set
 * - [a-z] matches any character in the range
 * - [!abc] or [^abc] matches any character NOT in the set
 * - {a,b,c} matches any of the alternatives
 * - ! at start negates the entire pattern
 */

import { describe, it, expect } from 'vitest'
import { match, createMatcher } from './match'

describe('match', () => {
  // ========================================
  // 1. Literal matching (5 tests)
  // ========================================
  describe('literal matching', () => {
    it('should match exact path', () => {
      // Given: exact pattern and matching path
      // When: matching
      // Then: should return true

      expect(match('foo.ts', 'foo.ts')).toBe(true)
    })

    it('should be case sensitive by default', () => {
      // Given: pattern with different case than path
      // When: matching without nocase option
      // Then: should return false

      expect(match('Foo.ts', 'foo.ts')).toBe(false)
      expect(match('foo.ts', 'FOO.TS')).toBe(false)
    })

    it('should not match partial path', () => {
      // Given: pattern that is substring of path
      // When: matching
      // Then: should return false (must match entire path)

      expect(match('foo', 'foobar')).toBe(false)
      expect(match('bar', 'foobar')).toBe(false)
    })

    it('should match paths with separators', () => {
      // Given: pattern with path separators
      // When: matching identical path
      // Then: should return true

      expect(match('src/foo.ts', 'src/foo.ts')).toBe(true)
      expect(match('a/b/c/d.ts', 'a/b/c/d.ts')).toBe(true)
    })

    it('should not match different paths', () => {
      // Given: pattern with different directory than path
      // When: matching
      // Then: should return false

      expect(match('src/foo.ts', 'lib/foo.ts')).toBe(false)
      expect(match('a/b.ts', 'x/b.ts')).toBe(false)
    })
  })

  // ========================================
  // 2. Wildcard * (8 tests)
  // ========================================
  describe('wildcard *', () => {
    it('should match any characters in filename', () => {
      // Given: pattern with * wildcard
      // When: matching files with any name
      // Then: should return true

      expect(match('*.ts', 'foo.ts')).toBe(true)
      expect(match('*.ts', 'bar.ts')).toBe(true)
      expect(match('*.ts', 'a.ts')).toBe(true)
      expect(match('*.ts', 'my-file.ts')).toBe(true)
    })

    it('should NOT cross directory boundaries', () => {
      // Given: pattern with * wildcard
      // When: path contains directory separator
      // Then: * should NOT match the separator

      expect(match('*.ts', 'src/foo.ts')).toBe(false)
      expect(match('*.ts', 'a/b/c.ts')).toBe(false)
    })

    it('should match empty string', () => {
      // Given: pattern like foo* or *bar
      // When: the wildcard part is empty
      // Then: should still match

      expect(match('foo*', 'foo')).toBe(true)
      expect(match('*bar', 'bar')).toBe(true)
    })

    it('should match single character', () => {
      // Given: pattern with *
      // When: wildcard matches single char
      // Then: should return true

      expect(match('f*o', 'foo')).toBe(true)
      expect(match('*.ts', 'x.ts')).toBe(true)
    })

    it('should match multiple characters', () => {
      // Given: pattern with *
      // When: wildcard needs to match many chars
      // Then: should return true

      expect(match('f*o', 'faaaao')).toBe(true)
      expect(match('f*o', 'fxyzabc123o')).toBe(true)
    })

    it('should handle multiple wildcards', () => {
      // Given: pattern with multiple * wildcards
      // When: matching
      // Then: each * matches independently

      expect(match('*.*', 'foo.ts')).toBe(true)
      expect(match('*.*', 'a.b')).toBe(true)
      expect(match('*-*-*', 'a-b-c')).toBe(true)
    })

    it('should work with wildcard in directory position', () => {
      // Given: pattern with * in directory name
      // When: matching
      // Then: * matches directory name (not separator)

      expect(match('src/*.ts', 'src/foo.ts')).toBe(true)
      expect(match('src/*.ts', 'src/bar.ts')).toBe(true)
      expect(match('*/foo.ts', 'src/foo.ts')).toBe(true)
    })

    it('should not match when extension differs', () => {
      // Given: pattern with specific extension
      // When: path has different extension
      // Then: should return false

      expect(match('*.ts', 'foo.js')).toBe(false)
      expect(match('*.ts', 'foo.tsx')).toBe(false)
    })
  })

  // ========================================
  // 3. Globstar ** (12 tests)
  // ========================================
  describe('globstar **', () => {
    it('should match zero directories', () => {
      // Given: pattern with **/ prefix
      // When: path has no directories
      // Then: ** matches nothing

      expect(match('**/*.ts', 'foo.ts')).toBe(true)
      expect(match('**/package.json', 'package.json')).toBe(true)
    })

    it('should match one directory level', () => {
      // Given: pattern with **
      // When: path has one directory
      // Then: should match

      expect(match('**/*.ts', 'src/foo.ts')).toBe(true)
      expect(match('**/foo.ts', 'src/foo.ts')).toBe(true)
    })

    it('should match many directory levels', () => {
      // Given: pattern with **
      // When: path has multiple directory levels
      // Then: should match all

      expect(match('**/*.ts', 'a/b/c/foo.ts')).toBe(true)
      expect(match('**/*.ts', 'src/components/ui/button.ts')).toBe(true)
      expect(match('**/foo.ts', 'a/b/c/d/e/foo.ts')).toBe(true)
    })

    it('should match at start of pattern', () => {
      // Given: pattern starting with **
      // When: matching paths with various depths
      // Then: should match all

      expect(match('**/foo.ts', 'foo.ts')).toBe(true)
      expect(match('**/foo.ts', 'a/foo.ts')).toBe(true)
      expect(match('**/foo.ts', 'a/b/foo.ts')).toBe(true)
    })

    it('should match at end of pattern', () => {
      // Given: pattern ending with **
      // When: matching paths under that prefix
      // Then: should match all

      expect(match('src/**', 'src/a')).toBe(true)
      expect(match('src/**', 'src/a/b')).toBe(true)
      expect(match('src/**', 'src/a/b/c')).toBe(true)
      expect(match('src/**', 'src/a/b/c/d.ts')).toBe(true)
    })

    it('should match in middle of pattern', () => {
      // Given: pattern with ** in middle
      // When: matching paths with varying middle sections
      // Then: should match

      expect(match('src/**/foo.ts', 'src/foo.ts')).toBe(true)
      expect(match('src/**/foo.ts', 'src/a/foo.ts')).toBe(true)
      expect(match('src/**/foo.ts', 'src/a/b/foo.ts')).toBe(true)
      expect(match('src/**/foo.ts', 'src/a/b/c/d/foo.ts')).toBe(true)
    })

    it('should match standalone **', () => {
      // Given: pattern is just **
      // When: matching any path
      // Then: should match everything

      expect(match('**', 'foo.ts')).toBe(true)
      expect(match('**', 'src/foo.ts')).toBe(true)
      expect(match('**', 'a/b/c/d/e/f')).toBe(true)
    })

    it('should work adjacent to single star', () => {
      // Given: pattern like **/*.ts
      // When: matching
      // Then: both ** and * work independently

      expect(match('**/*.ts', 'foo.ts')).toBe(true)
      expect(match('**/*.ts', 'src/bar.ts')).toBe(true)
      expect(match('**/src/*.ts', 'src/foo.ts')).toBe(true)
      expect(match('**/src/*.ts', 'a/b/src/foo.ts')).toBe(true)
    })

    it('should not match if final segment differs', () => {
      // Given: pattern with specific filename
      // When: filename doesn't match
      // Then: should return false

      expect(match('**/foo.ts', 'bar.ts')).toBe(false)
      expect(match('**/foo.ts', 'src/bar.ts')).toBe(false)
    })

    it('should not match partial directory names', () => {
      // Given: pattern with ** and specific directory
      // When: directory name is substring
      // Then: should return false

      expect(match('src/**', 'srcfoo/a.ts')).toBe(false)
      expect(match('**/src/**', 'mysrc/a.ts')).toBe(false)
    })

    it('should handle multiple ** in pattern', () => {
      // Given: pattern with multiple **
      // When: matching complex paths
      // Then: should work correctly

      expect(match('**/src/**/*.ts', 'src/foo.ts')).toBe(true)
      expect(match('**/src/**/*.ts', 'a/src/b/c.ts')).toBe(true)
      expect(match('**/src/**/*.ts', 'x/y/src/z/w/file.ts')).toBe(true)
    })

    it('should handle ** followed by **', () => {
      // Given: pattern with consecutive **/**
      // When: matching
      // Then: should work (though redundant)

      expect(match('**/**/*.ts', 'foo.ts')).toBe(true)
      expect(match('**/**/*.ts', 'a/b/c.ts')).toBe(true)
    })
  })

  // ========================================
  // 4. Single char ? (5 tests)
  // ========================================
  describe('single char ?', () => {
    it('should match exactly one character', () => {
      // Given: pattern with ?
      // When: position has exactly one char
      // Then: should match

      expect(match('fo?.ts', 'foo.ts')).toBe(true)
      expect(match('fo?.ts', 'fox.ts')).toBe(true)
      expect(match('?oo.ts', 'foo.ts')).toBe(true)
    })

    it('should NOT match zero characters', () => {
      // Given: pattern with ?
      // When: position has no char (would need to skip ?)
      // Then: should return false

      expect(match('fo?.ts', 'fo.ts')).toBe(false)
      expect(match('?foo.ts', 'foo.ts')).toBe(false)
    })

    it('should NOT match multiple characters', () => {
      // Given: pattern with single ?
      // When: position has multiple chars
      // Then: should return false

      expect(match('fo?.ts', 'fooo.ts')).toBe(false)
      expect(match('fo?.ts', 'foab.ts')).toBe(false)
    })

    it('should handle multiple ? in sequence', () => {
      // Given: pattern with multiple ?
      // When: matching
      // Then: each ? matches exactly one char

      expect(match('f??.ts', 'foo.ts')).toBe(true)
      expect(match('f??.ts', 'fab.ts')).toBe(true)
      expect(match('???.ts', 'abc.ts')).toBe(true)
      expect(match('f??.ts', 'fo.ts')).toBe(false)
      expect(match('f??.ts', 'fooo.ts')).toBe(false)
    })

    it('should NOT match path separator', () => {
      // Given: pattern with ? where separator might be
      // When: path has separator at that position
      // Then: should return false

      expect(match('src?foo', 'src/foo')).toBe(false)
      expect(match('a?b?c', 'a/b/c')).toBe(false)
    })
  })

  // ========================================
  // 5. Character classes [abc] (8 tests)
  // ========================================
  describe('character classes [abc]', () => {
    it('should match any character in set', () => {
      // Given: pattern with character class
      // When: path has a char from the set
      // Then: should match

      expect(match('[abc].ts', 'a.ts')).toBe(true)
      expect(match('[abc].ts', 'b.ts')).toBe(true)
      expect(match('[abc].ts', 'c.ts')).toBe(true)
    })

    it('should NOT match characters outside set', () => {
      // Given: pattern with character class
      // When: path has a char NOT in the set
      // Then: should return false

      expect(match('[abc].ts', 'd.ts')).toBe(false)
      expect(match('[abc].ts', 'x.ts')).toBe(false)
    })

    it('should handle character ranges', () => {
      // Given: pattern with range like [a-z]
      // When: path has char in range
      // Then: should match

      expect(match('[a-z].ts', 'a.ts')).toBe(true)
      expect(match('[a-z].ts', 'x.ts')).toBe(true)
      expect(match('[a-z].ts', 'z.ts')).toBe(true)
      expect(match('[0-9].ts', '5.ts')).toBe(true)
      expect(match('[A-Z].ts', 'M.ts')).toBe(true)
    })

    it('should handle negation with !', () => {
      // Given: pattern with [!abc]
      // When: path has char NOT in set
      // Then: should match

      expect(match('[!abc].ts', 'd.ts')).toBe(true)
      expect(match('[!abc].ts', 'x.ts')).toBe(true)
      expect(match('[!abc].ts', 'a.ts')).toBe(false)
    })

    it('should handle negation with ^', () => {
      // Given: pattern with [^abc]
      // When: path has char NOT in set
      // Then: should match

      expect(match('[^abc].ts', 'd.ts')).toBe(true)
      expect(match('[^abc].ts', 'x.ts')).toBe(true)
      expect(match('[^abc].ts', 'b.ts')).toBe(false)
    })

    it('should handle multiple character classes', () => {
      // Given: pattern with multiple []
      // When: matching
      // Then: each class matches independently

      expect(match('[abc][def].ts', 'ad.ts')).toBe(true)
      expect(match('[abc][def].ts', 'bf.ts')).toBe(true)
      expect(match('[abc][def].ts', 'ce.ts')).toBe(true)
      expect(match('[abc][def].ts', 'ax.ts')).toBe(false)
    })

    it('should match special glob chars inside class literally', () => {
      // Given: pattern with special chars in []
      // When: those chars appear in path
      // Then: should match literally

      expect(match('[*?].ts', '*.ts')).toBe(true)
      expect(match('[*?].ts', '?.ts')).toBe(true)
      expect(match('[*?].ts', 'a.ts')).toBe(false)
    })

    it('should handle hyphen at start or end as literal', () => {
      // Given: pattern with hyphen at boundary
      // When: path has hyphen
      // Then: should match

      expect(match('[-abc].ts', '-.ts')).toBe(true)
      expect(match('[abc-].ts', '-.ts')).toBe(true)
    })
  })

  // ========================================
  // 6. Alternatives {a,b} (7 tests)
  // ========================================
  describe('alternatives {a,b}', () => {
    it('should match first alternative', () => {
      // Given: pattern with {a,b}
      // When: path matches first option
      // Then: should match

      expect(match('*.{ts,js}', 'foo.ts')).toBe(true)
    })

    it('should match second alternative', () => {
      // Given: pattern with {a,b}
      // When: path matches second option
      // Then: should match

      expect(match('*.{ts,js}', 'foo.js')).toBe(true)
    })

    it('should NOT match non-alternatives', () => {
      // Given: pattern with {a,b}
      // When: path matches neither
      // Then: should return false

      expect(match('*.{ts,js}', 'foo.py')).toBe(false)
    })

    it('should handle three or more alternatives', () => {
      // Given: pattern with {a,b,c}
      // When: path matches any
      // Then: should match

      expect(match('*.{ts,tsx,js}', 'foo.ts')).toBe(true)
      expect(match('*.{ts,tsx,js}', 'foo.tsx')).toBe(true)
      expect(match('*.{ts,tsx,js}', 'foo.js')).toBe(true)
      expect(match('*.{ts,tsx,js}', 'foo.jsx')).toBe(false)
    })

    it('should handle alternatives in path segment', () => {
      // Given: pattern with {a,b} in directory
      // When: path matches one directory
      // Then: should match

      expect(match('{src,lib}/*.ts', 'src/foo.ts')).toBe(true)
      expect(match('{src,lib}/*.ts', 'lib/foo.ts')).toBe(true)
      expect(match('{src,lib}/*.ts', 'test/foo.ts')).toBe(false)
    })

    it('should handle empty alternative', () => {
      // Given: pattern with empty option like {,txt}
      // When: matching
      // Then: empty option matches nothing

      expect(match('foo{,.txt}', 'foo')).toBe(true)
      expect(match('foo{,.txt}', 'foo.txt')).toBe(true)
      expect(match('foo{,.txt}', 'foo.js')).toBe(false)
    })

    it('should handle nested alternatives', () => {
      // Given: pattern with multiple {} groups
      // When: matching combination
      // Then: should match valid combinations

      expect(match('{src,lib}/{a,b}.ts', 'src/a.ts')).toBe(true)
      expect(match('{src,lib}/{a,b}.ts', 'src/b.ts')).toBe(true)
      expect(match('{src,lib}/{a,b}.ts', 'lib/a.ts')).toBe(true)
      expect(match('{src,lib}/{a,b}.ts', 'lib/b.ts')).toBe(true)
      expect(match('{src,lib}/{a,b}.ts', 'test/a.ts')).toBe(false)
    })
  })

  // ========================================
  // 7. Negation (4 tests)
  // ========================================
  describe('negation', () => {
    it('should invert match result with ! prefix', () => {
      // Given: pattern starting with !
      // When: path would normally match
      // Then: should return false

      expect(match('!*.ts', 'foo.ts')).toBe(false)
      expect(match('!src/**', 'src/foo.ts')).toBe(false)
    })

    it('should return true when negated pattern does not match', () => {
      // Given: pattern starting with !
      // When: path would NOT normally match
      // Then: should return true

      expect(match('!*.ts', 'foo.js')).toBe(true)
      expect(match('!*.ts', 'readme.md')).toBe(true)
      expect(match('!src/**', 'lib/foo.ts')).toBe(true)
    })

    it('should handle double negation', () => {
      // Given: pattern starting with !!
      // When: matching
      // Then: double negation = positive match

      expect(match('!!*.ts', 'foo.ts')).toBe(true)
      expect(match('!!*.ts', 'foo.js')).toBe(false)
    })

    it('should not treat ! in middle as negation', () => {
      // Given: pattern with ! not at start
      // When: matching
      // Then: ! is treated literally

      expect(match('foo!bar', 'foo!bar')).toBe(true)
      expect(match('*!*', 'a!b')).toBe(true)
    })
  })

  // ========================================
  // 8. Edge cases (6 tests)
  // ========================================
  describe('edge cases', () => {
    it('should throw on empty pattern', () => {
      // Given: empty pattern
      // When: calling match
      // Then: should throw

      expect(() => match('', 'foo.ts')).toThrow()
    })

    it('should return false for empty path', () => {
      // Given: non-empty pattern and empty path
      // When: matching
      // Then: should return false

      expect(match('*', '')).toBe(false)
      expect(match('**', '')).toBe(false)
      expect(match('foo', '')).toBe(false)
    })

    it('should match root path', () => {
      // Given: pattern that is just /
      // When: matching /
      // Then: should match

      expect(match('/', '/')).toBe(true)
    })

    it('should handle trailing slash in directory pattern', () => {
      // Given: pattern with trailing slash
      // When: matching path with trailing slash
      // Then: should match

      expect(match('src/', 'src/')).toBe(true)
      expect(match('src/lib/', 'src/lib/')).toBe(true)
    })

    it('should NOT match dotfiles by default', () => {
      // Given: pattern with * at start
      // When: path starts with .
      // Then: should NOT match by default

      expect(match('*', '.hidden')).toBe(false)
      expect(match('*', '.gitignore')).toBe(false)
      expect(match('**/*', '.env')).toBe(false)
    })

    it('should match dotfiles with dot option', () => {
      // Given: pattern with * and dot: true option
      // When: path starts with .
      // Then: should match

      expect(match('*', '.hidden', { dot: true })).toBe(true)
      expect(match('*', '.gitignore', { dot: true })).toBe(true)
      expect(match('**/*', 'src/.env', { dot: true })).toBe(true)
    })
  })

  // ========================================
  // Options tests
  // ========================================
  describe('options', () => {
    describe('nocase option', () => {
      it('should match case-insensitively when nocase is true', () => {
        // Given: nocase: true option
        // When: cases differ
        // Then: should still match

        expect(match('foo.ts', 'FOO.TS', { nocase: true })).toBe(true)
        expect(match('FOO.ts', 'foo.ts', { nocase: true })).toBe(true)
        expect(match('*.TS', 'file.ts', { nocase: true })).toBe(true)
      })
    })

    describe('combined options', () => {
      it('should support multiple options together', () => {
        // Given: both dot and nocase options
        // When: matching
        // Then: both should apply

        expect(match('*.ts', '.CONFIG.TS', { dot: true, nocase: true })).toBe(true)
      })
    })
  })

  // ========================================
  // createMatcher tests
  // ========================================
  describe('createMatcher', () => {
    it('should create a reusable matcher function', () => {
      // Given: a pattern
      // When: creating a matcher
      // Then: should return a function

      const matcher = createMatcher('*.ts')

      expect(typeof matcher).toBe('function')
    })

    it('should match correctly with created matcher', () => {
      // Given: a matcher created from a pattern
      // When: testing paths
      // Then: should return correct results

      const isTypeScript = createMatcher('**/*.ts')

      expect(isTypeScript('src/index.ts')).toBe(true)
      expect(isTypeScript('foo.ts')).toBe(true)
      expect(isTypeScript('readme.md')).toBe(false)
    })

    it('should support options in createMatcher', () => {
      // Given: options passed to createMatcher
      // When: matching
      // Then: options should be applied

      const matcher = createMatcher('*.ts', { nocase: true })

      expect(matcher('FOO.TS')).toBe(true)
    })

    it('should throw on empty pattern', () => {
      // Given: empty pattern
      // When: creating matcher
      // Then: should throw

      expect(() => createMatcher('')).toThrow()
    })
  })

  // ========================================
  // Complex patterns (integration)
  // ========================================
  describe('complex patterns', () => {
    it('should handle typical gitignore-style patterns', () => {
      // Given: common gitignore patterns
      // When: matching typical paths
      // Then: should work correctly

      // node_modules anywhere
      expect(match('**/node_modules/**', 'node_modules/foo')).toBe(true)
      expect(match('**/node_modules/**', 'packages/core/node_modules/lodash')).toBe(true)

      // Build directories
      expect(match('**/dist/**', 'dist/index.js')).toBe(true)
      expect(match('**/dist/**', 'packages/ui/dist/bundle.js')).toBe(true)
    })

    it('should handle TypeScript project patterns', () => {
      // Given: typical TS project patterns
      // When: matching
      // Then: should work

      const srcTs = createMatcher('src/**/*.{ts,tsx}')

      expect(srcTs('src/index.ts')).toBe(true)
      expect(srcTs('src/components/Button.tsx')).toBe(true)
      expect(srcTs('src/utils/helpers.ts')).toBe(true)
      expect(srcTs('test/foo.ts')).toBe(false)
      expect(srcTs('src/index.js')).toBe(false)
    })

    it('should handle patterns with multiple features', () => {
      // Given: pattern combining multiple glob features
      // When: matching
      // Then: all features work together

      // src/**/test/**/*.{spec,test}.ts
      expect(match('src/**/test/**/*.{spec,test}.ts', 'src/test/foo.spec.ts')).toBe(true)
      expect(match('src/**/test/**/*.{spec,test}.ts', 'src/components/test/button.test.ts')).toBe(true)
      expect(match('src/**/test/**/*.{spec,test}.ts', 'src/utils/test/a/b/c.spec.ts')).toBe(true)
      expect(match('src/**/test/**/*.{spec,test}.ts', 'src/foo.ts')).toBe(false)
    })
  })
})
