/**
 * Tests for rmdir operation (RED phase - should fail)
 *
 * These tests drive the implementation of the rmdir function for removing directories
 * from the virtual filesystem.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { rmdir } from './rmdir'
import { ENOENT, ENOTDIR, ENOTEMPTY, EINVAL } from '../core/errors'

/**
 * Mock filesystem context for testing
 * This will be replaced with actual implementation during GREEN phase
 */
interface MockFSContext {
  entries: Map<string, { type: 'file' | 'directory'; mode: number }>
}

describe('rmdir', () => {
  let ctx: MockFSContext

  beforeEach(() => {
    // Set up a mock filesystem context with some initial structure
    ctx = {
      entries: new Map([
        ['/', { type: 'directory', mode: 0o755 }],
        ['/home', { type: 'directory', mode: 0o755 }],
        ['/home/user', { type: 'directory', mode: 0o755 }],
        ['/home/user/empty', { type: 'directory', mode: 0o755 }],
        ['/home/user/nonempty', { type: 'directory', mode: 0o755 }],
        ['/home/user/nonempty/child', { type: 'directory', mode: 0o755 }],
        ['/home/user/nonempty/file.txt', { type: 'file', mode: 0o644 }],
        ['/home/user/file.txt', { type: 'file', mode: 0o644 }],
        ['/home/user/deeply', { type: 'directory', mode: 0o755 }],
        ['/home/user/deeply/nested', { type: 'directory', mode: 0o755 }],
        ['/home/user/deeply/nested/dir', { type: 'directory', mode: 0o755 }],
        ['/home/user/deeply/nested/dir/file.txt', { type: 'file', mode: 0o644 }],
      ]),
    }
  })

  describe('basic directory removal', () => {
    it('should remove an empty directory', async () => {
      await rmdir(ctx, '/home/user/empty')

      expect(ctx.entries.has('/home/user/empty')).toBe(false)
    })

    it('should return undefined on success (like Node.js fs.promises.rmdir)', async () => {
      const result = await rmdir(ctx, '/home/user/empty')

      expect(result).toBeUndefined()
    })

    it('should remove a deeply nested empty directory', async () => {
      // First remove the file to make it empty
      ctx.entries.delete('/home/user/deeply/nested/dir/file.txt')

      await rmdir(ctx, '/home/user/deeply/nested/dir')

      expect(ctx.entries.has('/home/user/deeply/nested/dir')).toBe(false)
    })

    it('should not affect parent directories', async () => {
      await rmdir(ctx, '/home/user/empty')

      expect(ctx.entries.has('/home/user')).toBe(true)
      expect(ctx.entries.has('/home')).toBe(true)
    })

    it('should not affect sibling directories', async () => {
      await rmdir(ctx, '/home/user/empty')

      expect(ctx.entries.has('/home/user/nonempty')).toBe(true)
      expect(ctx.entries.has('/home/user/deeply')).toBe(true)
    })
  })

  describe('error: ENOENT - directory does not exist', () => {
    it('should throw ENOENT when directory does not exist', async () => {
      await expect(rmdir(ctx, '/home/user/nonexistent')).rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT for deeply nested nonexistent path', async () => {
      await expect(rmdir(ctx, '/home/user/a/b/c/d')).rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT for path under nonexistent parent', async () => {
      await expect(rmdir(ctx, '/nonexistent/dir')).rejects.toThrow(ENOENT)
    })

    it('should have correct error properties for ENOENT', async () => {
      try {
        await rmdir(ctx, '/home/user/nonexistent')
        expect.fail('Should have thrown ENOENT')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOENT)
        expect((error as ENOENT).code).toBe('ENOENT')
        expect((error as ENOENT).syscall).toBe('rmdir')
        expect((error as ENOENT).path).toBe('/home/user/nonexistent')
      }
    })
  })

  describe('error: ENOTDIR - path is not a directory', () => {
    it('should throw ENOTDIR when path is a file', async () => {
      await expect(rmdir(ctx, '/home/user/file.txt')).rejects.toThrow(ENOTDIR)
    })

    it('should throw ENOTDIR for file in nested path', async () => {
      await expect(rmdir(ctx, '/home/user/nonempty/file.txt')).rejects.toThrow(ENOTDIR)
    })

    it('should have correct error properties for ENOTDIR', async () => {
      try {
        await rmdir(ctx, '/home/user/file.txt')
        expect.fail('Should have thrown ENOTDIR')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOTDIR)
        expect((error as ENOTDIR).code).toBe('ENOTDIR')
        expect((error as ENOTDIR).syscall).toBe('rmdir')
        expect((error as ENOTDIR).path).toBe('/home/user/file.txt')
      }
    })
  })

  describe('error: ENOTEMPTY - directory is not empty', () => {
    it('should throw ENOTEMPTY when directory contains files', async () => {
      await expect(rmdir(ctx, '/home/user/nonempty')).rejects.toThrow(ENOTEMPTY)
    })

    it('should throw ENOTEMPTY when directory contains subdirectories', async () => {
      // nonempty has both child dir and file.txt
      await expect(rmdir(ctx, '/home/user/nonempty')).rejects.toThrow(ENOTEMPTY)
    })

    it('should throw ENOTEMPTY when directory has only one child', async () => {
      // Create a directory with just one child
      ctx.entries.set('/home/user/oneitem', { type: 'directory', mode: 0o755 })
      ctx.entries.set('/home/user/oneitem/single', { type: 'file', mode: 0o644 })

      await expect(rmdir(ctx, '/home/user/oneitem')).rejects.toThrow(ENOTEMPTY)
    })

    it('should have correct error properties for ENOTEMPTY', async () => {
      try {
        await rmdir(ctx, '/home/user/nonempty')
        expect.fail('Should have thrown ENOTEMPTY')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOTEMPTY)
        expect((error as ENOTEMPTY).code).toBe('ENOTEMPTY')
        expect((error as ENOTEMPTY).syscall).toBe('rmdir')
        expect((error as ENOTEMPTY).path).toBe('/home/user/nonempty')
      }
    })

    it('should throw ENOTEMPTY for deeply nested non-empty directory', async () => {
      await expect(rmdir(ctx, '/home/user/deeply/nested/dir')).rejects.toThrow(ENOTEMPTY)
    })
  })

  describe('recursive option - removes directory and contents', () => {
    it('should remove non-empty directory with recursive option', async () => {
      await rmdir(ctx, '/home/user/nonempty', { recursive: true })

      expect(ctx.entries.has('/home/user/nonempty')).toBe(false)
    })

    it('should remove all children with recursive option', async () => {
      await rmdir(ctx, '/home/user/nonempty', { recursive: true })

      expect(ctx.entries.has('/home/user/nonempty/child')).toBe(false)
      expect(ctx.entries.has('/home/user/nonempty/file.txt')).toBe(false)
    })

    it('should remove deeply nested structure with recursive option', async () => {
      await rmdir(ctx, '/home/user/deeply', { recursive: true })

      expect(ctx.entries.has('/home/user/deeply')).toBe(false)
      expect(ctx.entries.has('/home/user/deeply/nested')).toBe(false)
      expect(ctx.entries.has('/home/user/deeply/nested/dir')).toBe(false)
      expect(ctx.entries.has('/home/user/deeply/nested/dir/file.txt')).toBe(false)
    })

    it('should work on empty directory with recursive option', async () => {
      await rmdir(ctx, '/home/user/empty', { recursive: true })

      expect(ctx.entries.has('/home/user/empty')).toBe(false)
    })

    it('should return undefined on successful recursive removal', async () => {
      const result = await rmdir(ctx, '/home/user/nonempty', { recursive: true })

      expect(result).toBeUndefined()
    })

    it('should not affect parent directories when recursive', async () => {
      await rmdir(ctx, '/home/user/deeply', { recursive: true })

      expect(ctx.entries.has('/home/user')).toBe(true)
      expect(ctx.entries.has('/home')).toBe(true)
      expect(ctx.entries.has('/')).toBe(true)
    })

    it('should not affect sibling entries when recursive', async () => {
      await rmdir(ctx, '/home/user/deeply', { recursive: true })

      expect(ctx.entries.has('/home/user/empty')).toBe(true)
      expect(ctx.entries.has('/home/user/nonempty')).toBe(true)
      expect(ctx.entries.has('/home/user/file.txt')).toBe(true)
    })

    it('should throw ENOENT with recursive when directory does not exist', async () => {
      await expect(rmdir(ctx, '/home/user/nonexistent', { recursive: true })).rejects.toThrow(ENOENT)
    })

    it('should throw ENOTDIR with recursive when path is a file', async () => {
      await expect(rmdir(ctx, '/home/user/file.txt', { recursive: true })).rejects.toThrow(ENOTDIR)
    })
  })

  describe('edge cases: path handling', () => {
    it('should handle trailing slash', async () => {
      await rmdir(ctx, '/home/user/empty/')

      expect(ctx.entries.has('/home/user/empty')).toBe(false)
    })

    it('should handle multiple trailing slashes', async () => {
      await rmdir(ctx, '/home/user/empty///')

      expect(ctx.entries.has('/home/user/empty')).toBe(false)
    })

    it('should handle paths with double slashes', async () => {
      await rmdir(ctx, '/home//user//empty')

      expect(ctx.entries.has('/home/user/empty')).toBe(false)
    })

    it('should throw EINVAL for empty path', async () => {
      await expect(rmdir(ctx, '')).rejects.toThrow(EINVAL)
    })

    it('should throw EINVAL for whitespace-only path', async () => {
      await expect(rmdir(ctx, '   ')).rejects.toThrow(EINVAL)
    })

    it('should handle path with dots', async () => {
      await rmdir(ctx, '/home/user/./empty')

      expect(ctx.entries.has('/home/user/empty')).toBe(false)
    })

    it('should handle path with parent references', async () => {
      await rmdir(ctx, '/home/user/../user/empty')

      expect(ctx.entries.has('/home/user/empty')).toBe(false)
    })

    it('should normalize path before removal', async () => {
      await rmdir(ctx, '/home/user/./foo/../empty')

      expect(ctx.entries.has('/home/user/empty')).toBe(false)
    })
  })

  describe('edge cases: special directories', () => {
    it('should throw EINVAL when trying to remove root', async () => {
      await expect(rmdir(ctx, '/')).rejects.toThrow(EINVAL)
    })

    it('should handle directory names with special characters', async () => {
      ctx.entries.set('/home/user/my-project_v2', { type: 'directory', mode: 0o755 })

      await rmdir(ctx, '/home/user/my-project_v2')

      expect(ctx.entries.has('/home/user/my-project_v2')).toBe(false)
    })

    it('should handle hidden directories (starting with dot)', async () => {
      ctx.entries.set('/home/user/.config', { type: 'directory', mode: 0o755 })

      await rmdir(ctx, '/home/user/.config')

      expect(ctx.entries.has('/home/user/.config')).toBe(false)
    })

    it('should handle directory names with spaces', async () => {
      ctx.entries.set('/home/user/my folder', { type: 'directory', mode: 0o755 })

      await rmdir(ctx, '/home/user/my folder')

      expect(ctx.entries.has('/home/user/my folder')).toBe(false)
    })

    it('should handle directory names with unicode characters', async () => {
      ctx.entries.set('/home/user/folder', { type: 'directory', mode: 0o755 })

      await rmdir(ctx, '/home/user/folder')

      expect(ctx.entries.has('/home/user/folder')).toBe(false)
    })

    it('should handle very long directory names', async () => {
      const longName = 'a'.repeat(255)
      ctx.entries.set(`/home/user/${longName}`, { type: 'directory', mode: 0o755 })

      await rmdir(ctx, `/home/user/${longName}`)

      expect(ctx.entries.has(`/home/user/${longName}`)).toBe(false)
    })
  })

  describe('options parameter variations', () => {
    it('should accept empty options object', async () => {
      await rmdir(ctx, '/home/user/empty', {})

      expect(ctx.entries.has('/home/user/empty')).toBe(false)
    })

    it('should accept undefined options', async () => {
      await rmdir(ctx, '/home/user/empty', undefined)

      expect(ctx.entries.has('/home/user/empty')).toBe(false)
    })

    it('should accept recursive: false explicitly', async () => {
      await expect(rmdir(ctx, '/home/user/nonempty', { recursive: false })).rejects.toThrow(ENOTEMPTY)
    })

    it('should ignore unknown options gracefully', async () => {
      // @ts-expect-error Testing unknown options
      await rmdir(ctx, '/home/user/empty', { unknownOption: true })

      expect(ctx.entries.has('/home/user/empty')).toBe(false)
    })
  })

  describe('concurrent operations', () => {
    it('should handle concurrent rmdir calls to different empty directories', async () => {
      ctx.entries.set('/home/user/empty2', { type: 'directory', mode: 0o755 })
      ctx.entries.set('/home/user/empty3', { type: 'directory', mode: 0o755 })

      const promises = [
        rmdir(ctx, '/home/user/empty'),
        rmdir(ctx, '/home/user/empty2'),
        rmdir(ctx, '/home/user/empty3'),
      ]

      await Promise.all(promises)

      expect(ctx.entries.has('/home/user/empty')).toBe(false)
      expect(ctx.entries.has('/home/user/empty2')).toBe(false)
      expect(ctx.entries.has('/home/user/empty3')).toBe(false)
    })

    it('should handle concurrent recursive rmdir to non-overlapping paths', async () => {
      // Create separate trees
      ctx.entries.set('/home/user/tree1', { type: 'directory', mode: 0o755 })
      ctx.entries.set('/home/user/tree1/a', { type: 'file', mode: 0o644 })
      ctx.entries.set('/home/user/tree2', { type: 'directory', mode: 0o755 })
      ctx.entries.set('/home/user/tree2/b', { type: 'file', mode: 0o644 })

      const promises = [
        rmdir(ctx, '/home/user/tree1', { recursive: true }),
        rmdir(ctx, '/home/user/tree2', { recursive: true }),
      ]

      await Promise.all(promises)

      expect(ctx.entries.has('/home/user/tree1')).toBe(false)
      expect(ctx.entries.has('/home/user/tree1/a')).toBe(false)
      expect(ctx.entries.has('/home/user/tree2')).toBe(false)
      expect(ctx.entries.has('/home/user/tree2/b')).toBe(false)
    })
  })

  describe('consistency with mkdir', () => {
    it('should remove directory that was just created', async () => {
      // This tests that mkdir and rmdir are compatible
      const testPath = '/home/user/temp'
      ctx.entries.set(testPath, { type: 'directory', mode: 0o777 })

      await rmdir(ctx, testPath)

      expect(ctx.entries.has(testPath)).toBe(false)
    })

    it('should allow creating directory after removal', async () => {
      await rmdir(ctx, '/home/user/empty')

      // Now we should be able to create it again
      ctx.entries.set('/home/user/empty', { type: 'directory', mode: 0o777 })

      expect(ctx.entries.has('/home/user/empty')).toBe(true)
    })
  })
})
