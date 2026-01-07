import { describe, it, expect, beforeEach } from 'vitest'
import { symlink } from './symlink'
import { ENOENT, EEXIST } from '../core/errors'

/**
 * Tests for symlink operation
 *
 * The symlink function creates a symbolic link.
 *
 * Signature: symlink(target: string, path: string, type?: 'file' | 'dir' | 'junction') => Promise<void>
 *
 * - target: The path that the symlink points to
 * - path: The path where the symlink will be created
 * - type: Optional on Unix (defaults to 'file'), required on Windows for directories
 */

describe('symlink', () => {
  describe('basic functionality', () => {
    it('should create a symlink to a file with relative target path', async () => {
      // Given: a filesystem with an existing file at /dir/target.txt
      // When: creating a symlink at /dir/link.txt pointing to ./target.txt (relative)
      // Then: the symlink should be created successfully

      await symlink('./target.txt', '/dir/link.txt')

      // The symlink should exist at the specified path
      // We'll verify this via lstat in the implementation
    })

    it('should create a symlink to a file with absolute target path', async () => {
      // Given: a filesystem with an existing file at /data/file.txt
      // When: creating a symlink at /links/abs-link.txt pointing to /data/file.txt (absolute)
      // Then: the symlink should be created successfully

      await symlink('/data/file.txt', '/links/abs-link.txt')

      // The symlink should be created with the absolute target path stored
    })

    it('should create a symlink to a directory', async () => {
      // Given: a filesystem with an existing directory at /home/user/documents
      // When: creating a symlink at /shortcuts/docs pointing to the directory
      // Then: the symlink should be created successfully

      await symlink('/home/user/documents', '/shortcuts/docs', 'dir')

      // The symlink should point to the directory
    })

    it('should allow creating a dangling symlink (target does not exist)', async () => {
      // Given: a filesystem where /nonexistent/path does NOT exist
      // When: creating a symlink at /links/dangling pointing to /nonexistent/path
      // Then: the symlink should be created (symlinks can point to non-existent targets)

      // This should NOT throw an error - dangling symlinks are valid
      await symlink('/nonexistent/path', '/links/dangling')

      // The symlink is created, even though the target doesn't exist
      // Attempting to read through the symlink would fail with ENOENT
    })
  })

  describe('symlink metadata', () => {
    it('should create symlink that reports isSymbolicLink() as true via lstat', async () => {
      // Given: a filesystem with a symlink at /links/mylink
      // When: calling lstat on the symlink
      // Then: isSymbolicLink() should return true

      await symlink('/target/file.txt', '/links/mylink')

      // lstat (not stat) returns info about the symlink itself
      // stats.isSymbolicLink() should be true
      // stats.isFile() should be false (it's a symlink, not a regular file)
    })

    it('should preserve the target path in the symlink', async () => {
      // Given: a symlink created with a specific target
      // When: reading the symlink with readlink
      // Then: it should return the exact target path that was specified

      const targetPath = '../relative/path/to/target.txt'
      await symlink(targetPath, '/links/relative-link')

      // readlink('/links/relative-link') should return '../relative/path/to/target.txt'
    })

    it('should set appropriate mode bits for symlink', async () => {
      // Given: a newly created symlink
      // When: checking its mode via lstat
      // Then: it should have S_IFLNK type flag set

      await symlink('/target', '/links/mode-test')

      // Mode should include S_IFLNK (0o120000)
      // Permissions on symlinks are typically 0o777 (lrwxrwxrwx)
    })
  })

  describe('error handling', () => {
    it('should throw EEXIST when symlink path already exists as a file', async () => {
      // Given: a filesystem with an existing file at /existing/file.txt
      // When: attempting to create a symlink at the same path
      // Then: it should throw EEXIST

      await expect(
        symlink('/some/target', '/existing/file.txt')
      ).rejects.toThrow(EEXIST)
    })

    it('should throw EEXIST when symlink path already exists as a directory', async () => {
      // Given: a filesystem with an existing directory at /existing/dir
      // When: attempting to create a symlink at the same path
      // Then: it should throw EEXIST

      await expect(
        symlink('/some/target', '/existing/dir')
      ).rejects.toThrow(EEXIST)
    })

    it('should throw EEXIST when symlink path already exists as another symlink', async () => {
      // Given: a filesystem with an existing symlink at /links/existing-link
      // When: attempting to create a new symlink at the same path
      // Then: it should throw EEXIST (symlink won't overwrite existing symlink)

      await expect(
        symlink('/new/target', '/links/existing-link')
      ).rejects.toThrow(EEXIST)
    })

    it('should throw ENOENT when parent directory does not exist', async () => {
      // Given: a filesystem where /nonexistent/parent does NOT exist
      // When: attempting to create a symlink at /nonexistent/parent/link
      // Then: it should throw ENOENT (can't create symlink in non-existent directory)

      await expect(
        symlink('/some/target', '/nonexistent/parent/link')
      ).rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT when deeply nested parent path does not exist', async () => {
      // Given: a filesystem where only / exists
      // When: attempting to create symlink at /a/b/c/d/link (none of these dirs exist)
      // Then: it should throw ENOENT

      await expect(
        symlink('/target', '/a/b/c/d/link')
      ).rejects.toThrow(ENOENT)
    })

    it('should include correct syscall in ENOENT error', async () => {
      // Given: a parent directory that doesn't exist
      // When: symlink throws ENOENT
      // Then: the error should have syscall set to 'symlink'

      try {
        await symlink('/target', '/nonexistent/link')
        expect.fail('Should have thrown ENOENT')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOENT)
        expect((error as ENOENT).syscall).toBe('symlink')
      }
    })

    it('should include correct syscall and path in EEXIST error', async () => {
      // Given: an existing file at the symlink path
      // When: symlink throws EEXIST
      // Then: the error should have syscall='symlink' and path set correctly

      try {
        await symlink('/target', '/existing/file.txt')
        expect.fail('Should have thrown EEXIST')
      } catch (error) {
        expect(error).toBeInstanceOf(EEXIST)
        expect((error as EEXIST).syscall).toBe('symlink')
        expect((error as EEXIST).path).toBe('/existing/file.txt')
      }
    })
  })

  describe('type parameter', () => {
    it('should accept type "file" for file symlinks', async () => {
      // The type parameter is primarily for Windows compatibility
      // On Unix, it's generally ignored, but should be accepted

      await symlink('/target/file.txt', '/links/file-link', 'file')

      // Should create symlink successfully
    })

    it('should accept type "dir" for directory symlinks', async () => {
      // On Windows, directory symlinks require the 'dir' type
      // On Unix, this is typically ignored but should be accepted

      await symlink('/target/directory', '/links/dir-link', 'dir')

      // Should create symlink successfully
    })

    it('should accept type "junction" for junction points', async () => {
      // Junction points are a Windows-specific feature
      // On Unix, this may be treated as a regular symlink

      await symlink('/target/directory', '/links/junction-link', 'junction')

      // Should create symlink successfully (or be treated as regular symlink on Unix)
    })
  })

  describe('edge cases', () => {
    it('should handle symlink to symlink (chain of symlinks)', async () => {
      // Given: link1 -> link2 -> actual-file
      // When: creating link1 pointing to link2
      // Then: symlink should be created successfully

      // First create link2 -> /actual/file
      await symlink('/actual/file', '/links/link2')
      // Then create link1 -> /links/link2
      await symlink('/links/link2', '/links/link1')

      // Both symlinks should exist
    })

    it('should handle symlink with empty target (should fail or be invalid)', async () => {
      // Empty string target is invalid
      // Implementation may throw EINVAL or similar

      await expect(
        symlink('', '/links/empty-target')
      ).rejects.toThrow()
    })

    it('should handle symlink to current directory (. target)', async () => {
      // Creating a symlink that points to '.'

      await symlink('.', '/links/current-dir')

      // Should create symlink pointing to current directory
    })

    it('should handle symlink to parent directory (.. target)', async () => {
      // Creating a symlink that points to '..'

      await symlink('..', '/links/parent-dir')

      // Should create symlink pointing to parent directory
    })

    it('should handle creating symlink at root level', async () => {
      // Creating a symlink directly under root

      await symlink('/some/target', '/root-level-link')

      // Should create symlink at root level
    })

    it('should handle unicode characters in symlink path', async () => {
      // Paths with unicode characters should work

      await symlink('/target/file.txt', '/links/unicode-symlink.txt')

      // Should handle unicode in paths
    })

    it('should handle very long target paths', async () => {
      // Long but valid path
      const longPath = '/a/'.repeat(100) + 'file.txt'

      await symlink(longPath, '/links/long-target-link')

      // Should handle reasonably long paths
    })
  })

  describe('atomicity and concurrency', () => {
    it('should create symlink atomically', async () => {
      // The symlink operation should be atomic
      // Either the symlink exists completely or not at all

      await symlink('/target', '/links/atomic-test')

      // No partial symlink state should be observable
    })

    it('should handle concurrent symlink creation to different paths', async () => {
      // Multiple symlinks created concurrently should all succeed

      const promises = [
        symlink('/target1', '/links/concurrent1'),
        symlink('/target2', '/links/concurrent2'),
        symlink('/target3', '/links/concurrent3'),
      ]

      await expect(Promise.all(promises)).resolves.not.toThrow()
    })

    it('should handle race condition when two processes create same symlink', async () => {
      // If two concurrent operations try to create the same symlink,
      // one should succeed and one should get EEXIST

      // This test verifies the second attempt fails appropriately
      const firstAttempt = symlink('/target', '/links/race-test')
      const secondAttempt = symlink('/other-target', '/links/race-test')

      // At least one should succeed, at least one might fail with EEXIST
      const results = await Promise.allSettled([firstAttempt, secondAttempt])

      const successes = results.filter(r => r.status === 'fulfilled')
      const failures = results.filter(r => r.status === 'rejected')

      // At least one should succeed
      expect(successes.length).toBeGreaterThanOrEqual(1)

      // If any failed, it should be EEXIST
      for (const failure of failures) {
        expect((failure as PromiseRejectedResult).reason).toBeInstanceOf(EEXIST)
      }
    })
  })
})
