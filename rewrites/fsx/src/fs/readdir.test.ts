/**
 * Tests for readdir operation (RED phase - should fail)
 * These tests drive the implementation of the readdir function
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { readdir } from './readdir'
import { Dirent } from '../core/types'
import { ENOENT, ENOTDIR } from '../core/errors'

describe('readdir', () => {
  describe('basic directory listing', () => {
    it('should return an array of strings by default', async () => {
      const result = await readdir('/test/dir')

      expect(Array.isArray(result)).toBe(true)
      expect(result.every(item => typeof item === 'string')).toBe(true)
    })

    it('should list files in a directory', async () => {
      const result = await readdir('/test/dir-with-files')

      expect(result).toContain('file1.txt')
      expect(result).toContain('file2.txt')
    })

    it('should list subdirectories in a directory', async () => {
      const result = await readdir('/test/dir-with-subdirs')

      expect(result).toContain('subdir1')
      expect(result).toContain('subdir2')
    })

    it('should list both files and subdirectories', async () => {
      const result = await readdir('/test/mixed-dir')

      expect(result).toContain('file.txt')
      expect(result).toContain('subdir')
    })

    it('should not include . and .. entries', async () => {
      const result = await readdir('/test/dir')

      expect(result).not.toContain('.')
      expect(result).not.toContain('..')
    })
  })

  describe('empty directory', () => {
    it('should return empty array for empty directory', async () => {
      const result = await readdir('/test/empty-dir')

      expect(result).toEqual([])
    })
  })

  describe('withFileTypes option', () => {
    it('should return Dirent objects when withFileTypes is true', async () => {
      const result = await readdir('/test/dir', { withFileTypes: true })

      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toBeInstanceOf(Dirent)
    })

    it('should return Dirent with correct name property', async () => {
      const result = await readdir('/test/dir-with-files', { withFileTypes: true })

      const names = result.map(dirent => dirent.name)
      expect(names).toContain('file1.txt')
    })

    it('should return Dirent with correct parentPath property', async () => {
      const result = await readdir('/test/dir', { withFileTypes: true })

      expect(result[0].parentPath).toBe('/test/dir')
    })

    it('should identify files correctly via Dirent.isFile()', async () => {
      const result = await readdir('/test/dir-with-files', { withFileTypes: true })

      const fileDirent = result.find(d => d.name === 'file1.txt')
      expect(fileDirent).toBeDefined()
      expect(fileDirent!.isFile()).toBe(true)
      expect(fileDirent!.isDirectory()).toBe(false)
    })

    it('should identify directories correctly via Dirent.isDirectory()', async () => {
      const result = await readdir('/test/dir-with-subdirs', { withFileTypes: true })

      const dirDirent = result.find(d => d.name === 'subdir1')
      expect(dirDirent).toBeDefined()
      expect(dirDirent!.isDirectory()).toBe(true)
      expect(dirDirent!.isFile()).toBe(false)
    })

    it('should identify symlinks correctly via Dirent.isSymbolicLink()', async () => {
      const result = await readdir('/test/dir-with-symlinks', { withFileTypes: true })

      const linkDirent = result.find(d => d.name === 'mylink')
      expect(linkDirent).toBeDefined()
      expect(linkDirent!.isSymbolicLink()).toBe(true)
      expect(linkDirent!.isFile()).toBe(false)
      expect(linkDirent!.isDirectory()).toBe(false)
    })
  })

  describe('recursive option', () => {
    it('should list only immediate children when recursive is false', async () => {
      const result = await readdir('/test/nested-dir', { recursive: false })

      expect(result).toContain('child')
      expect(result).not.toContain('grandchild')
    })

    it('should list all descendants when recursive is true', async () => {
      const result = await readdir('/test/nested-dir', { recursive: true })

      expect(result).toContain('child')
      expect(result.some(name => name.includes('grandchild'))).toBe(true)
    })

    it('should return relative paths for recursive listing', async () => {
      const result = await readdir('/test/nested-dir', { recursive: true })

      // Should include paths like 'child/grandchild'
      expect(result.some(name => name.includes('/'))).toBe(true)
    })

    it('should work with both recursive and withFileTypes options', async () => {
      const result = await readdir('/test/nested-dir', {
        recursive: true,
        withFileTypes: true
      })

      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toBeInstanceOf(Dirent)
    })

    it('should list deeply nested files when recursive is true', async () => {
      const result = await readdir('/test/deep-nested', { recursive: true })

      // Should find files at multiple levels
      expect(result.length).toBeGreaterThan(1)
    })

    it('should return empty array for empty directory with recursive option', async () => {
      const result = await readdir('/test/empty-dir', { recursive: true })

      expect(result).toEqual([])
    })
  })

  describe('error handling', () => {
    describe('ENOENT - path does not exist', () => {
      it('should throw ENOENT when directory does not exist', async () => {
        await expect(readdir('/nonexistent/path')).rejects.toThrow()
      })

      it('should throw ENOENT with correct error code', async () => {
        try {
          await readdir('/nonexistent/path')
          expect.fail('Should have thrown an error')
        } catch (error) {
          expect(error).toBeInstanceOf(ENOENT)
          expect((error as ENOENT).code).toBe('ENOENT')
          expect((error as ENOENT).errno).toBe(-2)
        }
      })

      it('should throw ENOENT with correct syscall', async () => {
        try {
          await readdir('/nonexistent/path')
          expect.fail('Should have thrown an error')
        } catch (error) {
          expect((error as ENOENT).syscall).toBe('scandir')
        }
      })

      it('should throw ENOENT with correct path', async () => {
        const testPath = '/nonexistent/specific/path'
        try {
          await readdir(testPath)
          expect.fail('Should have thrown an error')
        } catch (error) {
          expect((error as ENOENT).path).toBe(testPath)
        }
      })
    })

    describe('ENOTDIR - path is not a directory', () => {
      it('should throw ENOTDIR when path is a file', async () => {
        await expect(readdir('/test/file.txt')).rejects.toThrow()
      })

      it('should throw ENOTDIR with correct error code', async () => {
        try {
          await readdir('/test/file.txt')
          expect.fail('Should have thrown an error')
        } catch (error) {
          expect(error).toBeInstanceOf(ENOTDIR)
          expect((error as ENOTDIR).code).toBe('ENOTDIR')
          expect((error as ENOTDIR).errno).toBe(-20)
        }
      })

      it('should throw ENOTDIR with correct syscall', async () => {
        try {
          await readdir('/test/file.txt')
          expect.fail('Should have thrown an error')
        } catch (error) {
          expect((error as ENOTDIR).syscall).toBe('scandir')
        }
      })

      it('should throw ENOTDIR with correct path', async () => {
        const testPath = '/test/specific-file.txt'
        try {
          await readdir(testPath)
          expect.fail('Should have thrown an error')
        } catch (error) {
          expect((error as ENOTDIR).path).toBe(testPath)
        }
      })
    })
  })

  describe('hidden files', () => {
    it('should include hidden files (starting with dot)', async () => {
      const result = await readdir('/test/dir-with-hidden')

      expect(result).toContain('.hidden')
      expect(result).toContain('.gitignore')
    })

    it('should include hidden directories', async () => {
      const result = await readdir('/test/dir-with-hidden')

      expect(result).toContain('.hidden-dir')
    })
  })

  describe('special entries', () => {
    it('should handle files with special characters in names', async () => {
      const result = await readdir('/test/dir-with-special')

      expect(result).toContain('file with spaces.txt')
      expect(result).toContain('file-with-dashes.txt')
      expect(result).toContain('file_with_underscores.txt')
    })

    it('should handle unicode filenames', async () => {
      const result = await readdir('/test/dir-with-unicode')

      expect(result.some(name => /[\u4e00-\u9fa5]/.test(name))).toBe(true) // Chinese characters
    })
  })

  describe('sorting behavior', () => {
    it('should return entries in a consistent order', async () => {
      const result1 = await readdir('/test/dir')
      const result2 = await readdir('/test/dir')

      expect(result1).toEqual(result2)
    })
  })

  describe('path normalization', () => {
    it('should handle paths with trailing slash', async () => {
      const result1 = await readdir('/test/dir')
      const result2 = await readdir('/test/dir/')

      expect(result1).toEqual(result2)
    })

    it('should handle paths with multiple slashes', async () => {
      const result = await readdir('/test//dir')

      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('return type inference', () => {
    it('should return string[] when no options provided', async () => {
      const result = await readdir('/test/dir')

      // TypeScript should infer this as string[]
      const firstItem: string = result[0]
      expect(typeof firstItem).toBe('string')
    })

    it('should return string[] when withFileTypes is false', async () => {
      const result = await readdir('/test/dir', { withFileTypes: false })

      const firstItem: string = result[0]
      expect(typeof firstItem).toBe('string')
    })

    it('should return Dirent[] when withFileTypes is true', async () => {
      const result = await readdir('/test/dir', { withFileTypes: true })

      const firstItem: Dirent = result[0]
      expect(firstItem).toBeInstanceOf(Dirent)
    })
  })
})
