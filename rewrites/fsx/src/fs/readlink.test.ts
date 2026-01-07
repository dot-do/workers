/**
 * Tests for readlink operation (RED phase - should fail)
 *
 * readlink reads the target of a symbolic link without following it.
 * Unlike realpath, it returns the exact target string stored in the symlink,
 * whether relative or absolute.
 *
 * POSIX behavior:
 * - Returns the contents of the symbolic link (the target path)
 * - Does not resolve or follow the target
 * - Returns ENOENT if path doesn't exist
 * - Returns EINVAL if path is not a symbolic link (file or directory)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { readlink } from './readlink'
import { ENOENT, EINVAL } from '../core/errors'

describe('readlink', () => {
  describe('reading symlink targets', () => {
    it('should read target of symlink with relative path', async () => {
      // Setup: Create a symlink pointing to a relative path
      // symlink: /home/user/link -> ../other/file.txt

      const target = await readlink('/home/user/link')

      expect(target).toBe('../other/file.txt')
    })

    it('should read target of symlink with absolute path', async () => {
      // Setup: Create a symlink pointing to an absolute path
      // symlink: /home/user/absolute-link -> /var/data/config.json

      const target = await readlink('/home/user/absolute-link')

      expect(target).toBe('/var/data/config.json')
    })

    it('should return exact target string without resolving', async () => {
      // The key difference from realpath: readlink returns the raw target,
      // not a resolved absolute path
      // symlink: /a/b/link -> ../../c/d

      const target = await readlink('/a/b/link')

      // Should return the raw symlink target, not resolved path
      expect(target).toBe('../../c/d')
    })

    it('should handle symlink pointing to symlink (returns immediate target only)', async () => {
      // Given: /a/link1 -> /b/link2 -> /c/file.txt
      // readlink should return only the immediate target, not follow the chain

      const target = await readlink('/a/link1')

      // Should return the immediate target, not the final resolved target
      expect(target).toBe('/b/link2')
    })

    it('should handle deeply nested symlink path', async () => {
      // The symlink itself is at a deeply nested path
      // symlink: /very/deep/nested/path/link -> target.txt

      const target = await readlink('/very/deep/nested/path/link')

      expect(target).toBe('target.txt')
    })

    it('should handle symlink with dots in target', async () => {
      // symlink: /home/link -> ./current/./path/../file.txt
      // readlink should return the target as-is without normalization

      const target = await readlink('/home/link')

      expect(target).toBe('./current/./path/../file.txt')
    })

    it('should handle symlink pointing to root', async () => {
      // symlink: /myroot -> /

      const target = await readlink('/myroot')

      expect(target).toBe('/')
    })

    it('should handle symlink with empty target', async () => {
      // Edge case: symlink with empty target (unusual but valid)
      // symlink: /empty-link -> ""

      const target = await readlink('/empty-link')

      expect(target).toBe('')
    })

    it('should handle symlink with trailing slashes in target', async () => {
      // symlink: /dir-link -> /some/directory/

      const target = await readlink('/dir-link')

      expect(target).toBe('/some/directory/')
    })
  })

  describe('error handling - ENOENT', () => {
    it('should throw ENOENT when path does not exist', async () => {
      await expect(readlink('/nonexistent/path')).rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT when path is in nonexistent directory', async () => {
      await expect(readlink('/nonexistent/dir/link')).rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT with correct syscall and path', async () => {
      try {
        await readlink('/does/not/exist')
        expect.fail('Should have thrown ENOENT')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOENT)
        expect((error as ENOENT).syscall).toBe('readlink')
        expect((error as ENOENT).path).toBe('/does/not/exist')
      }
    })
  })

  describe('error handling - EINVAL', () => {
    it('should throw EINVAL when path is a regular file', async () => {
      // Path exists but is a regular file, not a symlink
      await expect(readlink('/home/user/regular-file.txt')).rejects.toThrow(EINVAL)
    })

    it('should throw EINVAL when path is a directory', async () => {
      // Path exists but is a directory, not a symlink
      await expect(readlink('/home/user/directory')).rejects.toThrow(EINVAL)
    })

    it('should throw EINVAL with correct syscall and path for file', async () => {
      try {
        await readlink('/home/user/regular-file.txt')
        expect.fail('Should have thrown EINVAL')
      } catch (error) {
        expect(error).toBeInstanceOf(EINVAL)
        expect((error as EINVAL).syscall).toBe('readlink')
        expect((error as EINVAL).path).toBe('/home/user/regular-file.txt')
      }
    })

    it('should throw EINVAL with correct syscall and path for directory', async () => {
      try {
        await readlink('/home/user/directory')
        expect.fail('Should have thrown EINVAL')
      } catch (error) {
        expect(error).toBeInstanceOf(EINVAL)
        expect((error as EINVAL).syscall).toBe('readlink')
        expect((error as EINVAL).path).toBe('/home/user/directory')
      }
    })
  })

  describe('path edge cases', () => {
    it('should handle path with trailing slash for symlink', async () => {
      // When querying symlink with trailing slash, should still read target
      // symlink: /trailing-test/link -> /target

      const target = await readlink('/trailing-test/link/')

      expect(target).toBe('/target')
    })

    it('should normalize path before resolving', async () => {
      // Path like /normalize/./test/../test/link should work
      // symlink: /normalize/test/link -> target.txt

      const target = await readlink('/normalize/./test/../test/link')

      expect(target).toBe('target.txt')
    })

    it('should handle symlink in root directory', async () => {
      // symlink: /rootlink -> /some/path

      const target = await readlink('/rootlink')

      expect(target).toBe('/some/path')
    })

    it('should handle path with spaces', async () => {
      // symlink: /path with spaces/my link -> target with spaces

      const target = await readlink('/path with spaces/my link')

      expect(target).toBe('target with spaces')
    })

    it('should handle path with unicode characters', async () => {
      // symlink: /unicode/link -> target

      const target = await readlink('/unicode/link')

      expect(target).toBe('/unicode/target')
    })
  })

  describe('synchronous variant', () => {
    it('should support synchronous readlinkSync if provided', async () => {
      // This test is for when we implement readlinkSync
      // For now, we're focusing on the async version
      // This test documents the expected API

      // const { readlinkSync } = await import('./readlink')
      // const target = readlinkSync('/home/user/link')
      // expect(target).toBe('target.txt')

      // Placeholder - skip for now
      expect(true).toBe(true)
    })
  })
})
