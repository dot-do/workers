/**
 * Tests for mkdir operation (RED phase - should fail)
 *
 * These tests drive the implementation of the mkdir function for creating directories
 * in the virtual filesystem.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { mkdir } from './mkdir'
import { ENOENT, EEXIST, ENOTDIR, EINVAL } from '../core/errors'

/**
 * Mock filesystem context for testing
 * This will be replaced with actual implementation during GREEN phase
 */
interface MockFSContext {
  entries: Map<string, { type: 'file' | 'directory'; mode: number }>
}

describe('mkdir', () => {
  let ctx: MockFSContext

  beforeEach(() => {
    // Set up a mock filesystem context with some initial structure
    ctx = {
      entries: new Map([
        ['/', { type: 'directory', mode: 0o755 }],
        ['/home', { type: 'directory', mode: 0o755 }],
        ['/home/user', { type: 'directory', mode: 0o755 }],
        ['/home/user/file.txt', { type: 'file', mode: 0o644 }],
      ]),
    }
  })

  describe('basic directory creation', () => {
    it('should create a new directory', async () => {
      await mkdir(ctx, '/home/user/newdir')

      expect(ctx.entries.has('/home/user/newdir')).toBe(true)
      expect(ctx.entries.get('/home/user/newdir')?.type).toBe('directory')
    })

    it('should create directory with default mode 0o777', async () => {
      await mkdir(ctx, '/home/user/newdir')

      expect(ctx.entries.get('/home/user/newdir')?.mode).toBe(0o777)
    })

    it('should return undefined on success (like Node.js fs.promises.mkdir)', async () => {
      const result = await mkdir(ctx, '/home/user/newdir')

      expect(result).toBeUndefined()
    })

    it('should create directory at root level', async () => {
      await mkdir(ctx, '/newdir')

      expect(ctx.entries.has('/newdir')).toBe(true)
      expect(ctx.entries.get('/newdir')?.type).toBe('directory')
    })

    it('should create nested directory when parent exists', async () => {
      await mkdir(ctx, '/home/user/projects')

      expect(ctx.entries.has('/home/user/projects')).toBe(true)
    })
  })

  describe('directory creation with custom mode', () => {
    it('should create directory with specified mode', async () => {
      await mkdir(ctx, '/home/user/restricted', { mode: 0o700 })

      expect(ctx.entries.get('/home/user/restricted')?.mode).toBe(0o700)
    })

    it('should accept numeric mode', async () => {
      await mkdir(ctx, '/home/user/shared', { mode: 0o755 })

      expect(ctx.entries.get('/home/user/shared')?.mode).toBe(0o755)
    })

    it('should accept string mode', async () => {
      await mkdir(ctx, '/home/user/octal', { mode: '0755' })

      expect(ctx.entries.get('/home/user/octal')?.mode).toBe(0o755)
    })
  })

  describe('recursive directory creation', () => {
    it('should create nested directories when recursive is true', async () => {
      await mkdir(ctx, '/home/user/a/b/c', { recursive: true })

      expect(ctx.entries.has('/home/user/a')).toBe(true)
      expect(ctx.entries.has('/home/user/a/b')).toBe(true)
      expect(ctx.entries.has('/home/user/a/b/c')).toBe(true)
    })

    it('should return the first created directory path when recursive is true', async () => {
      const result = await mkdir(ctx, '/home/user/a/b/c', { recursive: true })

      expect(result).toBe('/home/user/a')
    })

    it('should return undefined when recursive is true but directory already exists', async () => {
      const result = await mkdir(ctx, '/home/user', { recursive: true })

      expect(result).toBeUndefined()
    })

    it('should not throw when directory already exists and recursive is true', async () => {
      await expect(mkdir(ctx, '/home/user', { recursive: true })).resolves.not.toThrow()
    })

    it('should create intermediate directories with same mode', async () => {
      await mkdir(ctx, '/home/user/a/b/c', { recursive: true, mode: 0o700 })

      expect(ctx.entries.get('/home/user/a')?.mode).toBe(0o700)
      expect(ctx.entries.get('/home/user/a/b')?.mode).toBe(0o700)
      expect(ctx.entries.get('/home/user/a/b/c')?.mode).toBe(0o700)
    })

    it('should handle deeply nested paths', async () => {
      await mkdir(ctx, '/home/user/a/b/c/d/e/f/g', { recursive: true })

      expect(ctx.entries.has('/home/user/a/b/c/d/e/f/g')).toBe(true)
    })

    it('should not modify existing parent directories', async () => {
      const originalMode = ctx.entries.get('/home/user')?.mode

      await mkdir(ctx, '/home/user/newdir/subdir', { recursive: true })

      expect(ctx.entries.get('/home/user')?.mode).toBe(originalMode)
    })
  })

  describe('error: EEXIST - path already exists', () => {
    it('should throw EEXIST when directory already exists', async () => {
      await expect(mkdir(ctx, '/home/user')).rejects.toThrow(EEXIST)
    })

    it('should throw EEXIST when path is an existing file', async () => {
      await expect(mkdir(ctx, '/home/user/file.txt')).rejects.toThrow(EEXIST)
    })

    it('should have correct error properties for EEXIST', async () => {
      try {
        await mkdir(ctx, '/home/user')
        expect.fail('Should have thrown EEXIST')
      } catch (error) {
        expect(error).toBeInstanceOf(EEXIST)
        expect((error as EEXIST).code).toBe('EEXIST')
        expect((error as EEXIST).syscall).toBe('mkdir')
        expect((error as EEXIST).path).toBe('/home/user')
      }
    })
  })

  describe('error: ENOENT - parent directory does not exist', () => {
    it('should throw ENOENT when parent does not exist and recursive is false', async () => {
      await expect(mkdir(ctx, '/nonexistent/newdir')).rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT for nested path without recursive option', async () => {
      await expect(mkdir(ctx, '/home/user/a/b/c')).rejects.toThrow(ENOENT)
    })

    it('should have correct error properties for ENOENT', async () => {
      try {
        await mkdir(ctx, '/nonexistent/newdir')
        expect.fail('Should have thrown ENOENT')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOENT)
        expect((error as ENOENT).code).toBe('ENOENT')
        expect((error as ENOENT).syscall).toBe('mkdir')
        expect((error as ENOENT).path).toBe('/nonexistent/newdir')
      }
    })

    it('should throw ENOENT when any ancestor is missing', async () => {
      await expect(mkdir(ctx, '/home/other/projects')).rejects.toThrow(ENOENT)
    })
  })

  describe('error: ENOTDIR - parent path is not a directory', () => {
    it('should throw ENOTDIR when parent is a file', async () => {
      await expect(mkdir(ctx, '/home/user/file.txt/subdir')).rejects.toThrow(ENOTDIR)
    })

    it('should have correct error properties for ENOTDIR', async () => {
      try {
        await mkdir(ctx, '/home/user/file.txt/subdir')
        expect.fail('Should have thrown ENOTDIR')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOTDIR)
        expect((error as ENOTDIR).code).toBe('ENOTDIR')
        expect((error as ENOTDIR).syscall).toBe('mkdir')
        expect((error as ENOTDIR).path).toBe('/home/user/file.txt')
      }
    })

    it('should throw ENOTDIR even with recursive option when parent is file', async () => {
      await expect(mkdir(ctx, '/home/user/file.txt/a/b', { recursive: true })).rejects.toThrow(ENOTDIR)
    })
  })

  describe('edge cases: path handling', () => {
    it('should handle trailing slash', async () => {
      await mkdir(ctx, '/home/user/newdir/')

      expect(ctx.entries.has('/home/user/newdir')).toBe(true)
    })

    it('should handle multiple trailing slashes', async () => {
      await mkdir(ctx, '/home/user/newdir///')

      expect(ctx.entries.has('/home/user/newdir')).toBe(true)
    })

    it('should handle paths with double slashes', async () => {
      await mkdir(ctx, '/home//user//newdir')

      expect(ctx.entries.has('/home/user/newdir')).toBe(true)
    })

    it('should throw EINVAL for empty path', async () => {
      await expect(mkdir(ctx, '')).rejects.toThrow(EINVAL)
    })

    it('should throw EINVAL for whitespace-only path', async () => {
      await expect(mkdir(ctx, '   ')).rejects.toThrow(EINVAL)
    })

    it('should handle path with dots', async () => {
      await mkdir(ctx, '/home/user/./newdir')

      expect(ctx.entries.has('/home/user/newdir')).toBe(true)
    })

    it('should handle path with parent references', async () => {
      await mkdir(ctx, '/home/user/../user/newdir')

      expect(ctx.entries.has('/home/user/newdir')).toBe(true)
    })

    it('should normalize path before creation', async () => {
      await mkdir(ctx, '/home/user/./foo/../newdir')

      expect(ctx.entries.has('/home/user/newdir')).toBe(true)
    })
  })

  describe('edge cases: special names', () => {
    it('should create directory with special characters in name', async () => {
      await mkdir(ctx, '/home/user/my-project_v2')

      expect(ctx.entries.has('/home/user/my-project_v2')).toBe(true)
    })

    it('should create directory starting with dot (hidden)', async () => {
      await mkdir(ctx, '/home/user/.config')

      expect(ctx.entries.has('/home/user/.config')).toBe(true)
    })

    it('should create directory with spaces in name', async () => {
      await mkdir(ctx, '/home/user/my folder')

      expect(ctx.entries.has('/home/user/my folder')).toBe(true)
    })

    it('should create directory with unicode characters', async () => {
      await mkdir(ctx, '/home/user/folder')

      expect(ctx.entries.has('/home/user/folder')).toBe(true)
    })

    it('should handle very long directory names', async () => {
      const longName = 'a'.repeat(255) // Max filename length on most filesystems
      await mkdir(ctx, `/home/user/${longName}`)

      expect(ctx.entries.has(`/home/user/${longName}`)).toBe(true)
    })
  })

  describe('options parameter variations', () => {
    it('should accept empty options object', async () => {
      await mkdir(ctx, '/home/user/newdir', {})

      expect(ctx.entries.has('/home/user/newdir')).toBe(true)
    })

    it('should accept undefined options', async () => {
      await mkdir(ctx, '/home/user/newdir', undefined)

      expect(ctx.entries.has('/home/user/newdir')).toBe(true)
    })

    it('should accept only mode in options', async () => {
      await mkdir(ctx, '/home/user/newdir', { mode: 0o700 })

      expect(ctx.entries.get('/home/user/newdir')?.mode).toBe(0o700)
    })

    it('should accept only recursive in options', async () => {
      await mkdir(ctx, '/home/user/a/b', { recursive: true })

      expect(ctx.entries.has('/home/user/a/b')).toBe(true)
    })

    it('should ignore unknown options gracefully', async () => {
      // @ts-expect-error Testing unknown options
      await mkdir(ctx, '/home/user/newdir', { unknownOption: true })

      expect(ctx.entries.has('/home/user/newdir')).toBe(true)
    })
  })

  describe('concurrent operations', () => {
    it('should handle concurrent mkdir calls to different paths', async () => {
      const promises = [
        mkdir(ctx, '/home/user/dir1'),
        mkdir(ctx, '/home/user/dir2'),
        mkdir(ctx, '/home/user/dir3'),
      ]

      await Promise.all(promises)

      expect(ctx.entries.has('/home/user/dir1')).toBe(true)
      expect(ctx.entries.has('/home/user/dir2')).toBe(true)
      expect(ctx.entries.has('/home/user/dir3')).toBe(true)
    })

    it('should handle concurrent recursive mkdir to overlapping paths', async () => {
      const promises = [
        mkdir(ctx, '/home/user/shared/a/b', { recursive: true }),
        mkdir(ctx, '/home/user/shared/c/d', { recursive: true }),
      ]

      await Promise.all(promises)

      expect(ctx.entries.has('/home/user/shared/a/b')).toBe(true)
      expect(ctx.entries.has('/home/user/shared/c/d')).toBe(true)
    })
  })
})
