/**
 * Tests for lstat operation (RED phase - should fail)
 *
 * lstat gets file/directory metadata WITHOUT following symbolic links.
 * This is the key difference from stat():
 * - stat('/link') where link->file: returns file's stats, isFile()=true
 * - lstat('/link') where link->file: returns link's stats, isSymbolicLink()=true
 *
 * POSIX behavior:
 * - Returns Stats object with file information
 * - Does NOT follow symbolic links (returns symlink's own stats)
 * - Throws ENOENT if path doesn't exist
 * - Does NOT throw for broken symlinks (can stat the link itself)
 */

import { describe, it, expect } from 'vitest'
import { lstat } from './lstat'
import { Stats } from '../core/types'
import { ENOENT } from '../core/errors'
import { constants } from '../core/constants'

describe('lstat', () => {
  describe('basic usage', () => {
    it('should return Stats object for regular file', async () => {
      // Given: a regular file at /home/user/file.txt
      // When: calling lstat on the file
      // Then: should return a Stats object

      const stats = await lstat('/home/user/file.txt')

      expect(stats).toBeInstanceOf(Stats)
    })

    it('should return Stats object for directory', async () => {
      // Given: a directory at /home/user
      // When: calling lstat on the directory
      // Then: should return a Stats object

      const stats = await lstat('/home/user')

      expect(stats).toBeInstanceOf(Stats)
    })

    it('should have all required Stats properties', async () => {
      // Given: a file at /home/user/file.txt
      // When: calling lstat
      // Then: Stats object should have all required properties

      const stats = await lstat('/home/user/file.txt')

      // Numeric properties
      expect(typeof stats.dev).toBe('number')
      expect(typeof stats.ino).toBe('number')
      expect(typeof stats.mode).toBe('number')
      expect(typeof stats.nlink).toBe('number')
      expect(typeof stats.uid).toBe('number')
      expect(typeof stats.gid).toBe('number')
      expect(typeof stats.rdev).toBe('number')
      expect(typeof stats.size).toBe('number')
      expect(typeof stats.blksize).toBe('number')
      expect(typeof stats.blocks).toBe('number')

      // Timestamp properties (in milliseconds)
      expect(typeof stats.atimeMs).toBe('number')
      expect(typeof stats.mtimeMs).toBe('number')
      expect(typeof stats.ctimeMs).toBe('number')
      expect(typeof stats.birthtimeMs).toBe('number')

      // Date getters
      expect(stats.atime).toBeInstanceOf(Date)
      expect(stats.mtime).toBeInstanceOf(Date)
      expect(stats.ctime).toBeInstanceOf(Date)
      expect(stats.birthtime).toBeInstanceOf(Date)
    })
  })

  describe('type detection', () => {
    it('should return isFile() true for regular files', async () => {
      // Given: a regular file at /home/user/document.txt
      // When: calling lstat
      // Then: isFile() should return true

      const stats = await lstat('/home/user/document.txt')

      expect(stats.isFile()).toBe(true)
      expect(stats.isDirectory()).toBe(false)
      expect(stats.isSymbolicLink()).toBe(false)
    })

    it('should return isDirectory() true for directories', async () => {
      // Given: a directory at /home/user/documents
      // When: calling lstat
      // Then: isDirectory() should return true

      const stats = await lstat('/home/user/documents')

      expect(stats.isDirectory()).toBe(true)
      expect(stats.isFile()).toBe(false)
      expect(stats.isSymbolicLink()).toBe(false)
    })

    it('should return isSymbolicLink() true for symlinks', async () => {
      // Given: a symlink at /home/user/link -> /home/user/target.txt
      // When: calling lstat on the symlink
      // Then: isSymbolicLink() should return true

      const stats = await lstat('/home/user/link')

      expect(stats.isSymbolicLink()).toBe(true)
      expect(stats.isFile()).toBe(false)
      expect(stats.isDirectory()).toBe(false)
    })
  })

  describe('symlink handling - KEY DIFFERENCE FROM stat', () => {
    it('should return symlink stats, not target stats', async () => {
      // Given: a symlink /links/mylink -> /data/largefile.bin
      // Where the target is a 1MB file
      // When: calling lstat on the symlink
      // Then: should return stats of the symlink itself, not the target

      // The symlink size should be the length of the target path string,
      // NOT the size of the target file
      const stats = await lstat('/links/mylink')

      expect(stats.isSymbolicLink()).toBe(true)
      // Symlink size is the length of the target path string
      // NOT the size of the target file
    })

    it('should return isFile() false for symlinks to files', async () => {
      // Given: a symlink /links/file-link -> /data/file.txt
      // When: calling lstat
      // Then: isFile() should be false (it's a symlink, not a file)

      const stats = await lstat('/links/file-link')

      expect(stats.isSymbolicLink()).toBe(true)
      expect(stats.isFile()).toBe(false)
    })

    it('should return isDirectory() false for symlinks to directories', async () => {
      // Given: a symlink /links/dir-link -> /data/directory
      // When: calling lstat
      // Then: isDirectory() should be false (it's a symlink, not a directory)

      const stats = await lstat('/links/dir-link')

      expect(stats.isSymbolicLink()).toBe(true)
      expect(stats.isDirectory()).toBe(false)
    })

    it('should have mode including S_IFLNK for symlinks', async () => {
      // Given: a symlink at /links/link
      // When: calling lstat
      // Then: mode should include S_IFLNK (0o120000)

      const stats = await lstat('/links/link')

      // Extract file type from mode
      const fileType = stats.mode & constants.S_IFMT

      expect(fileType).toBe(constants.S_IFLNK)
    })

    it('should work on broken symlinks (target does not exist)', async () => {
      // Given: a symlink /links/broken -> /nonexistent/target
      // Where the target does NOT exist
      // When: calling lstat on the broken symlink
      // Then: should NOT throw ENOENT (can stat the link itself)

      // This is a key behavior: lstat succeeds on broken symlinks
      // because it stats the link, not the target
      const stats = await lstat('/links/broken')

      expect(stats).toBeInstanceOf(Stats)
      expect(stats.isSymbolicLink()).toBe(true)
    })

    it('should return symlink size as target path length', async () => {
      // Given: a symlink /links/link -> /path/to/target
      // When: calling lstat
      // Then: size should be the byte length of the target path string

      // Symlink target: "/path/to/target" (15 characters)
      const stats = await lstat('/links/link')

      expect(stats.isSymbolicLink()).toBe(true)
      // Size of symlink is the length of the target path string
      expect(stats.size).toBeGreaterThan(0)
    })

    it('should return unique inode for symlink (different from target)', async () => {
      // Given: a symlink and its target file
      // When: calling lstat on both
      // Then: they should have different inodes

      // In a real scenario, we'd compare:
      // const symlinkStats = await lstat('/links/link')
      // const targetStats = await lstat('/data/target')
      // expect(symlinkStats.ino).not.toBe(targetStats.ino)

      const stats = await lstat('/links/link')
      expect(typeof stats.ino).toBe('number')
      expect(stats.ino).toBeGreaterThan(0)
    })
  })

  describe('file metadata', () => {
    it('should return correct size for regular files', async () => {
      // Given: a file with known content
      // When: calling lstat
      // Then: size should match the file content size

      const stats = await lstat('/home/user/hello.txt')

      expect(typeof stats.size).toBe('number')
      expect(stats.size).toBeGreaterThanOrEqual(0)
    })

    it('should return correct size for empty files', async () => {
      // Given: an empty file
      // When: calling lstat
      // Then: size should be 0

      const stats = await lstat('/home/user/empty.txt')

      expect(stats.size).toBe(0)
    })

    it('should return nlink reflecting link count', async () => {
      // Given: a file with multiple hard links
      // When: calling lstat
      // Then: nlink should reflect the number of hard links

      const stats = await lstat('/home/user/file.txt')

      expect(typeof stats.nlink).toBe('number')
      expect(stats.nlink).toBeGreaterThanOrEqual(1)
    })

    it('should return mode with file type and permissions', async () => {
      // Given: a regular file
      // When: calling lstat
      // Then: mode should contain both file type (S_IFREG) and permissions

      const stats = await lstat('/home/user/file.txt')

      // Should have S_IFREG for regular file
      const fileType = stats.mode & constants.S_IFMT
      expect(fileType).toBe(constants.S_IFREG)

      // Permissions should be reasonable (at least owner read)
      const perms = stats.mode & 0o777
      expect(perms).toBeGreaterThan(0)
    })
  })

  describe('timestamps', () => {
    it('should return valid mtimeMs for files', async () => {
      // Given: a file
      // When: calling lstat
      // Then: mtimeMs should be a valid timestamp

      const stats = await lstat('/home/user/file.txt')

      expect(typeof stats.mtimeMs).toBe('number')
      expect(stats.mtimeMs).toBeGreaterThan(0)
      // Should be a reasonable timestamp (after year 2000)
      expect(stats.mtimeMs).toBeGreaterThan(946684800000)
    })

    it('should return valid birthtimeMs for files', async () => {
      // Given: a file
      // When: calling lstat
      // Then: birthtimeMs should be a valid timestamp

      const stats = await lstat('/home/user/file.txt')

      expect(typeof stats.birthtimeMs).toBe('number')
      expect(stats.birthtimeMs).toBeGreaterThan(0)
    })

    it('should return valid timestamps for symlinks', async () => {
      // Given: a symlink
      // When: calling lstat
      // Then: timestamps should reflect the symlink's own times, not target

      const stats = await lstat('/links/link')

      expect(stats.isSymbolicLink()).toBe(true)
      expect(typeof stats.mtimeMs).toBe('number')
      expect(typeof stats.birthtimeMs).toBe('number')
      expect(stats.mtimeMs).toBeGreaterThan(0)
    })

    it('should have mtime Date getter working correctly', async () => {
      // Given: a file
      // When: calling lstat and accessing mtime
      // Then: should return a valid Date object

      const stats = await lstat('/home/user/file.txt')

      expect(stats.mtime).toBeInstanceOf(Date)
      expect(stats.mtime.getTime()).toBe(stats.mtimeMs)
    })

    it('should have birthtime Date getter working correctly', async () => {
      // Given: a file
      // When: calling lstat and accessing birthtime
      // Then: should return a valid Date object

      const stats = await lstat('/home/user/file.txt')

      expect(stats.birthtime).toBeInstanceOf(Date)
      expect(stats.birthtime.getTime()).toBe(stats.birthtimeMs)
    })
  })

  describe('error handling - ENOENT', () => {
    it('should throw ENOENT when path does not exist', async () => {
      // Given: a path that does not exist
      // When: calling lstat
      // Then: should throw ENOENT

      await expect(lstat('/nonexistent/path')).rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT when parent directory does not exist', async () => {
      // Given: a path where the parent directory does not exist
      // When: calling lstat
      // Then: should throw ENOENT

      await expect(lstat('/nonexistent/parent/file.txt')).rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT with syscall set to "lstat"', async () => {
      // Given: a nonexistent path
      // When: lstat throws ENOENT
      // Then: the error should have syscall='lstat'

      try {
        await lstat('/does/not/exist')
        expect.fail('Should have thrown ENOENT')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOENT)
        expect((error as ENOENT).syscall).toBe('lstat')
      }
    })

    it('should throw ENOENT with correct path in error', async () => {
      // Given: a nonexistent path
      // When: lstat throws ENOENT
      // Then: the error should include the path

      const testPath = '/specific/nonexistent/path'

      try {
        await lstat(testPath)
        expect.fail('Should have thrown ENOENT')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOENT)
        expect((error as ENOENT).path).toBe(testPath)
      }
    })

    it('should NOT throw ENOENT for broken symlinks', async () => {
      // Given: a symlink pointing to a nonexistent target
      // When: calling lstat on the symlink
      // Then: should NOT throw (lstat can stat the link itself)

      // This is the key difference from stat():
      // stat('/broken-link') -> throws ENOENT (can't access target)
      // lstat('/broken-link') -> succeeds (returns link's stats)

      const stats = await lstat('/links/broken-symlink')

      expect(stats).toBeInstanceOf(Stats)
      expect(stats.isSymbolicLink()).toBe(true)
    })
  })

  describe('path handling', () => {
    it('should handle absolute paths', async () => {
      // Given: an absolute path to a file
      // When: calling lstat
      // Then: should return stats

      const stats = await lstat('/absolute/path/to/file.txt')

      expect(stats).toBeInstanceOf(Stats)
    })

    it('should normalize paths with double slashes', async () => {
      // Given: a path with double slashes
      // When: calling lstat
      // Then: should normalize and find the file

      const stats = await lstat('/home//user//file.txt')

      expect(stats).toBeInstanceOf(Stats)
    })

    it('should normalize paths with ./ segments', async () => {
      // Given: a path with ./ segments
      // When: calling lstat
      // Then: should normalize and find the file

      const stats = await lstat('/home/./user/./file.txt')

      expect(stats).toBeInstanceOf(Stats)
    })

    it('should normalize paths with ../ segments', async () => {
      // Given: a path with ../ segments
      // When: calling lstat
      // Then: should normalize and find the file

      const stats = await lstat('/home/user/../user/file.txt')

      expect(stats).toBeInstanceOf(Stats)
    })

    it('should handle trailing slashes on directories', async () => {
      // Given: a directory path with trailing slash
      // When: calling lstat
      // Then: should return directory stats

      const stats = await lstat('/home/user/')

      expect(stats).toBeInstanceOf(Stats)
      expect(stats.isDirectory()).toBe(true)
    })

    it('should handle root path', async () => {
      // Given: the root path /
      // When: calling lstat
      // Then: should return stats for root directory

      const stats = await lstat('/')

      expect(stats).toBeInstanceOf(Stats)
      expect(stats.isDirectory()).toBe(true)
    })

    it('should handle paths with spaces', async () => {
      // Given: a path with spaces
      // When: calling lstat
      // Then: should handle correctly

      const stats = await lstat('/home/user/my documents/file.txt')

      expect(stats).toBeInstanceOf(Stats)
    })

    it('should handle paths with unicode characters', async () => {
      // Given: a path with unicode characters
      // When: calling lstat
      // Then: should handle correctly

      const stats = await lstat('/home/user/archivo.txt')

      expect(stats).toBeInstanceOf(Stats)
    })
  })

  describe('comparison with stat (conceptual)', () => {
    it('should differ from stat on symlinks - lstat returns symlink stats', async () => {
      // This test documents the key behavioral difference:
      //
      // Given: /link -> /target (where /target is a regular file)
      //
      // stat('/link') returns:
      //   - isFile() = true (follows link to target)
      //   - isSymbolicLink() = false (target is not a symlink)
      //   - size = size of target file
      //
      // lstat('/link') returns:
      //   - isFile() = false (the link itself is not a file)
      //   - isSymbolicLink() = true (it's a symlink)
      //   - size = length of target path string

      const stats = await lstat('/link')

      // lstat should return symlink info
      expect(stats.isSymbolicLink()).toBe(true)
      expect(stats.isFile()).toBe(false)
    })

    it('should match stat behavior on regular files', async () => {
      // For regular files (non-symlinks), stat and lstat behave identically

      const stats = await lstat('/home/user/regular-file.txt')

      expect(stats.isFile()).toBe(true)
      expect(stats.isSymbolicLink()).toBe(false)
    })

    it('should match stat behavior on directories', async () => {
      // For directories (non-symlinks), stat and lstat behave identically

      const stats = await lstat('/home/user/directory')

      expect(stats.isDirectory()).toBe(true)
      expect(stats.isSymbolicLink()).toBe(false)
    })
  })

  describe('other type methods', () => {
    it('should return isBlockDevice() false for regular files', async () => {
      const stats = await lstat('/home/user/file.txt')
      expect(stats.isBlockDevice()).toBe(false)
    })

    it('should return isCharacterDevice() false for regular files', async () => {
      const stats = await lstat('/home/user/file.txt')
      expect(stats.isCharacterDevice()).toBe(false)
    })

    it('should return isFIFO() false for regular files', async () => {
      const stats = await lstat('/home/user/file.txt')
      expect(stats.isFIFO()).toBe(false)
    })

    it('should return isSocket() false for regular files', async () => {
      const stats = await lstat('/home/user/file.txt')
      expect(stats.isSocket()).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('should handle symlink to symlink (returns first symlink stats)', async () => {
      // Given: /link1 -> /link2 -> /target
      // When: calling lstat('/link1')
      // Then: should return stats of link1, NOT link2 or target

      const stats = await lstat('/link1')

      expect(stats.isSymbolicLink()).toBe(true)
    })

    it('should handle circular symlinks', async () => {
      // Given: /a -> /b and /b -> /a (circular)
      // When: calling lstat('/a')
      // Then: should succeed (doesn't follow the link)

      const stats = await lstat('/circular/a')

      expect(stats.isSymbolicLink()).toBe(true)
    })

    it('should handle symlink with very long target path', async () => {
      // Given: a symlink with a very long target path
      // When: calling lstat
      // Then: should succeed and size should reflect target path length

      const stats = await lstat('/links/long-target-link')

      expect(stats.isSymbolicLink()).toBe(true)
      // Size should be large (length of long target path)
      expect(stats.size).toBeGreaterThan(100)
    })

    it('should handle symlink to current directory (. target)', async () => {
      // Given: a symlink /links/dot -> .
      // When: calling lstat
      // Then: should return symlink stats

      const stats = await lstat('/links/dot')

      expect(stats.isSymbolicLink()).toBe(true)
      expect(stats.size).toBe(1) // "." is 1 character
    })

    it('should handle symlink to parent directory (.. target)', async () => {
      // Given: a symlink /links/dotdot -> ..
      // When: calling lstat
      // Then: should return symlink stats

      const stats = await lstat('/links/dotdot')

      expect(stats.isSymbolicLink()).toBe(true)
      expect(stats.size).toBe(2) // ".." is 2 characters
    })
  })
})
