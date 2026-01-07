import { describe, it, expect } from 'vitest'
import { normalize, resolve, basename, dirname, join, isAbsolute } from './path'

describe('Path Utilities', () => {
  describe('normalize()', () => {
    describe('empty and edge cases', () => {
      it('should handle empty string', () => {
        expect(normalize('')).toBe('')
      })

      it('should handle single dot', () => {
        expect(normalize('.')).toBe('.')
      })

      it('should handle double dot', () => {
        expect(normalize('..')).toBe('..')
      })

      it('should handle root path', () => {
        expect(normalize('/')).toBe('/')
      })
    })

    describe('multiple consecutive slashes', () => {
      it('should collapse multiple slashes into one', () => {
        expect(normalize('/foo/bar//baz')).toBe('/foo/bar/baz')
      })

      it('should handle many consecutive slashes', () => {
        expect(normalize('/foo///bar////baz')).toBe('/foo/bar/baz')
      })

      it('should collapse slashes in relative paths', () => {
        expect(normalize('foo//bar///baz')).toBe('foo/bar/baz')
      })
    })

    describe('trailing slashes', () => {
      it('should remove trailing slash from absolute path', () => {
        expect(normalize('/foo/bar/')).toBe('/foo/bar')
      })

      it('should remove trailing slash from relative path', () => {
        expect(normalize('foo/bar/')).toBe('foo/bar')
      })

      it('should preserve root when only slashes', () => {
        expect(normalize('///')).toBe('/')
      })
    })

    describe('single dot (.) handling', () => {
      it('should remove single dot in middle of path', () => {
        expect(normalize('/foo/./bar')).toBe('/foo/bar')
      })

      it('should handle multiple dots in path', () => {
        expect(normalize('/foo/./bar/./baz')).toBe('/foo/bar/baz')
      })

      it('should remove leading ./ from relative path', () => {
        expect(normalize('./foo/bar')).toBe('foo/bar')
      })

      it('should handle only ./', () => {
        expect(normalize('./')).toBe('.')
      })
    })

    describe('double dot (..) handling', () => {
      it('should resolve .. in absolute path', () => {
        expect(normalize('/foo/bar/../baz')).toBe('/foo/baz')
      })

      it('should handle multiple .. segments', () => {
        expect(normalize('/foo/bar/baz/../../qux')).toBe('/foo/qux')
      })

      it('should preserve .. at start of relative path', () => {
        expect(normalize('../foo/bar')).toBe('../foo/bar')
      })

      it('should handle .. that go beyond root in absolute path', () => {
        expect(normalize('/foo/../..')).toBe('/')
      })

      it('should accumulate .. in relative paths', () => {
        expect(normalize('foo/../../bar')).toBe('../bar')
      })
    })

    describe('mixed . and .. combinations', () => {
      it('should handle complex path with . and ..', () => {
        expect(normalize('/foo/./bar/../baz/./qux')).toBe('/foo/baz/qux')
      })

      it('should handle relative path with complex dots', () => {
        expect(normalize('foo/./bar/../baz')).toBe('foo/baz')
      })

      it('should handle leading dots', () => {
        expect(normalize('./../foo')).toBe('../foo')
      })
    })

    describe('absolute vs relative paths', () => {
      it('should preserve absolute path marker', () => {
        expect(normalize('/foo/bar')).toBe('/foo/bar')
      })

      it('should preserve relative path nature', () => {
        expect(normalize('foo/bar')).toBe('foo/bar')
      })

      it('should normalize absolute path with dots', () => {
        expect(normalize('/foo/./bar/../baz')).toBe('/foo/baz')
      })

      it('should normalize relative path with dots', () => {
        expect(normalize('foo/./bar/../baz')).toBe('foo/baz')
      })
    })
  })

  describe('resolve()', () => {
    describe('basic resolution', () => {
      it('should resolve single path segment', () => {
        expect(resolve('/foo', 'bar')).toBe('/foo/bar')
      })

      it('should resolve multiple path segments', () => {
        expect(resolve('/foo', 'bar', 'baz')).toBe('/foo/bar/baz')
      })

      it('should resolve with no arguments', () => {
        expect(resolve()).toBe('/')
      })

      it('should resolve single segment', () => {
        expect(resolve('/foo')).toBe('/foo')
      })
    })

    describe('dot (.) resolution', () => {
      it('should resolve . as current directory', () => {
        expect(resolve('/foo', '.', 'bar')).toBe('/foo/bar')
      })

      it('should handle multiple dots', () => {
        expect(resolve('/foo', '.', '.', 'bar')).toBe('/foo/bar')
      })

      it('should resolve mixed . segments', () => {
        expect(resolve('/foo', 'bar', '.', 'baz')).toBe('/foo/bar/baz')
      })
    })

    describe('double dot (..) resolution', () => {
      it('should resolve .. to parent directory', () => {
        expect(resolve('/foo/bar', '..', 'baz')).toBe('/foo/baz')
      })

      it('should handle multiple .. segments', () => {
        expect(resolve('/foo/bar/baz', '..', '..', 'qux')).toBe('/foo/qux')
      })

      it('should stop at root for excessive ..', () => {
        expect(resolve('/foo', '..', '..', 'bar')).toBe('/bar')
      })

      it('should handle .. at root', () => {
        expect(resolve('/', '..', 'foo')).toBe('/foo')
      })
    })

    describe('complex resolution scenarios', () => {
      it('should resolve complex path with . and ..', () => {
        expect(resolve('/foo', 'bar', '.', '..', 'baz')).toBe('/foo/baz')
      })

      it('should resolve nested .. segments', () => {
        expect(resolve('/a/b/c', '../..', 'd/e')).toBe('/a/d/e')
      })

      it('should normalize result', () => {
        expect(resolve('/foo//bar', './/baz')).toBe('/foo/bar/baz')
      })

      it('should handle absolute path in middle', () => {
        expect(resolve('/foo', '/bar', 'baz')).toBe('/bar/baz')
      })
    })

    describe('relative path resolution', () => {
      it('should resolve relative paths', () => {
        expect(resolve('foo', 'bar')).toBe('/foo/bar')
      })

      it('should resolve relative with ..', () => {
        expect(resolve('foo/bar', '..', 'baz')).toBe('/foo/baz')
      })

      it('should handle leading ..', () => {
        expect(resolve('..', 'foo')).toBe('/foo')
      })
    })
  })

  describe('basename()', () => {
    it('should get filename from path', () => {
      expect(basename('/foo/bar/baz.txt')).toBe('baz.txt')
    })

    it('should handle path without directory', () => {
      expect(basename('file.txt')).toBe('file.txt')
    })

    it('should handle directory path', () => {
      expect(basename('/foo/bar/')).toBe('bar')
    })

    it('should handle root path', () => {
      expect(basename('/')).toBe('')
    })

    it('should handle empty path', () => {
      expect(basename('')).toBe('')
    })

    it('should remove extension when provided', () => {
      expect(basename('/foo/bar/baz.txt', '.txt')).toBe('baz')
    })

    it('should not remove non-matching extension', () => {
      expect(basename('/foo/bar/baz.txt', '.md')).toBe('baz.txt')
    })
  })

  describe('dirname()', () => {
    it('should get directory from path', () => {
      expect(dirname('/foo/bar/baz.txt')).toBe('/foo/bar')
    })

    it('should handle path with trailing slash', () => {
      expect(dirname('/foo/bar/')).toBe('/foo')
    })

    it('should handle root path', () => {
      expect(dirname('/')).toBe('/')
    })

    it('should handle filename only', () => {
      expect(dirname('file.txt')).toBe('.')
    })

    it('should handle empty path', () => {
      expect(dirname('')).toBe('.')
    })

    it('should handle relative path', () => {
      expect(dirname('foo/bar/baz')).toBe('foo/bar')
    })

    it('should handle single level relative path', () => {
      expect(dirname('foo/bar')).toBe('foo')
    })
  })

  describe('join()', () => {
    it('should join path segments', () => {
      expect(join('foo', 'bar', 'baz')).toBe('foo/bar/baz')
    })

    it('should join absolute paths', () => {
      expect(join('/foo', 'bar', 'baz')).toBe('/foo/bar/baz')
    })

    it('should handle empty segments', () => {
      expect(join('foo', '', 'bar')).toBe('foo/bar')
    })

    it('should normalize result', () => {
      expect(join('foo', './bar', '../baz')).toBe('foo/baz')
    })

    it('should handle leading slashes', () => {
      expect(join('/foo', '/bar')).toBe('/foo/bar')
    })

    it('should handle trailing slashes', () => {
      expect(join('foo/', 'bar/')).toBe('foo/bar')
    })

    it('should handle no arguments', () => {
      expect(join()).toBe('.')
    })

    it('should handle single argument', () => {
      expect(join('foo')).toBe('foo')
    })

    it('should handle .. in joined path', () => {
      expect(join('foo', 'bar', '..', 'baz')).toBe('foo/baz')
    })
  })

  describe('isAbsolute()', () => {
    it('should return true for absolute path', () => {
      expect(isAbsolute('/foo/bar')).toBe(true)
    })

    it('should return true for root path', () => {
      expect(isAbsolute('/')).toBe(true)
    })

    it('should return false for relative path', () => {
      expect(isAbsolute('foo/bar')).toBe(false)
    })

    it('should return false for dot path', () => {
      expect(isAbsolute('./foo')).toBe(false)
    })

    it('should return false for double dot path', () => {
      expect(isAbsolute('../foo')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isAbsolute('')).toBe(false)
    })
  })
})
