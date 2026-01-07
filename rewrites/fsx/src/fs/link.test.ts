/**
 * Tests for link (hard link creation) - RED phase
 * These tests should fail initially, driving the implementation of the link function
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { link } from './link'
import { ENOENT, EEXIST, EPERM } from '../core/errors'

/**
 * Mock filesystem context for testing
 * In production, this would be backed by D1/R2 storage
 */
interface MockFS {
  files: Map<string, { ino: number; content: Uint8Array; nlink: number; isDirectory: boolean }>
  inodes: Map<number, { content: Uint8Array; nlink: number; isDirectory: boolean }>
  nextIno: number

  // Helper methods
  createFile(path: string, content: string): void
  createDirectory(path: string): void
  getIno(path: string): number | undefined
  getNlink(path: string): number
  readFile(path: string): string | undefined
  writeFile(path: string, content: string): void
  deleteFile(path: string): boolean
  exists(path: string): boolean
}

function createMockFS(): MockFS {
  const files = new Map<string, { ino: number; content: Uint8Array; nlink: number; isDirectory: boolean }>()
  const inodes = new Map<number, { content: Uint8Array; nlink: number; isDirectory: boolean }>()
  let nextIno = 1

  return {
    files,
    inodes,
    nextIno,

    createFile(path: string, content: string) {
      const encoder = new TextEncoder()
      const data = encoder.encode(content)
      const ino = this.nextIno++
      const entry = { ino, content: data, nlink: 1, isDirectory: false }
      files.set(path, entry)
      inodes.set(ino, entry)
    },

    createDirectory(path: string) {
      const ino = this.nextIno++
      const entry = { ino, content: new Uint8Array(0), nlink: 2, isDirectory: true }
      files.set(path, entry)
      inodes.set(ino, entry)
    },

    getIno(path: string): number | undefined {
      return files.get(path)?.ino
    },

    getNlink(path: string): number {
      return files.get(path)?.nlink ?? 0
    },

    readFile(path: string): string | undefined {
      const entry = files.get(path)
      if (!entry || entry.isDirectory) return undefined
      return new TextDecoder().decode(entry.content)
    },

    writeFile(path: string, content: string) {
      const entry = files.get(path)
      if (!entry || entry.isDirectory) return
      const encoder = new TextEncoder()
      entry.content = encoder.encode(content)
    },

    deleteFile(path: string): boolean {
      const entry = files.get(path)
      if (!entry) return false
      files.delete(path)
      entry.nlink--
      if (entry.nlink <= 0) {
        inodes.delete(entry.ino)
      }
      return true
    },

    exists(path: string): boolean {
      return files.has(path)
    }
  }
}

describe('link', () => {
  let fs: MockFS

  beforeEach(() => {
    fs = createMockFS()
    // Create a test directory structure
    fs.createDirectory('/home')
    fs.createDirectory('/home/user')
  })

  describe('successful hard link creation', () => {
    beforeEach(() => {
      fs.createFile('/home/user/original.txt', 'Hello, World!')
    })

    it('should create a hard link to an existing file', async () => {
      await link(fs, '/home/user/original.txt', '/home/user/hardlink.txt')

      expect(fs.exists('/home/user/hardlink.txt')).toBe(true)
    })

    it('should share the same inode number between original and link', async () => {
      await link(fs, '/home/user/original.txt', '/home/user/hardlink.txt')

      const originalIno = fs.getIno('/home/user/original.txt')
      const linkIno = fs.getIno('/home/user/hardlink.txt')

      expect(originalIno).toBeDefined()
      expect(linkIno).toBe(originalIno)
    })

    it('should increment nlink count on the source inode', async () => {
      const nlinkBefore = fs.getNlink('/home/user/original.txt')
      expect(nlinkBefore).toBe(1)

      await link(fs, '/home/user/original.txt', '/home/user/hardlink.txt')

      const nlinkAfter = fs.getNlink('/home/user/original.txt')
      expect(nlinkAfter).toBe(2)
    })

    it('should allow access to the same content via both paths', async () => {
      await link(fs, '/home/user/original.txt', '/home/user/hardlink.txt')

      const originalContent = fs.readFile('/home/user/original.txt')
      const linkContent = fs.readFile('/home/user/hardlink.txt')

      expect(originalContent).toBe('Hello, World!')
      expect(linkContent).toBe('Hello, World!')
    })

    it('should reflect modifications via one path in the other', async () => {
      await link(fs, '/home/user/original.txt', '/home/user/hardlink.txt')

      // Modify via the link path
      fs.writeFile('/home/user/hardlink.txt', 'Modified content')

      // Read via the original path
      const originalContent = fs.readFile('/home/user/original.txt')
      expect(originalContent).toBe('Modified content')
    })

    it('should reflect modifications via original path in the link', async () => {
      await link(fs, '/home/user/original.txt', '/home/user/hardlink.txt')

      // Modify via the original path
      fs.writeFile('/home/user/original.txt', 'Updated via original')

      // Read via the link path
      const linkContent = fs.readFile('/home/user/hardlink.txt')
      expect(linkContent).toBe('Updated via original')
    })

    it('should allow creating multiple hard links to the same file', async () => {
      await link(fs, '/home/user/original.txt', '/home/user/link1.txt')
      await link(fs, '/home/user/original.txt', '/home/user/link2.txt')
      await link(fs, '/home/user/original.txt', '/home/user/link3.txt')

      const nlink = fs.getNlink('/home/user/original.txt')
      expect(nlink).toBe(4) // original + 3 links

      // All should have the same inode
      const originalIno = fs.getIno('/home/user/original.txt')
      expect(fs.getIno('/home/user/link1.txt')).toBe(originalIno)
      expect(fs.getIno('/home/user/link2.txt')).toBe(originalIno)
      expect(fs.getIno('/home/user/link3.txt')).toBe(originalIno)
    })
  })

  describe('hard link deletion behavior', () => {
    beforeEach(() => {
      fs.createFile('/home/user/original.txt', 'Persistent content')
    })

    it('should not affect the other link when deleting one link', async () => {
      await link(fs, '/home/user/original.txt', '/home/user/hardlink.txt')

      // Delete the original
      fs.deleteFile('/home/user/original.txt')

      // The link should still exist and have the content
      expect(fs.exists('/home/user/hardlink.txt')).toBe(true)
      expect(fs.readFile('/home/user/hardlink.txt')).toBe('Persistent content')
    })

    it('should decrement nlink when deleting a link but keep inode alive', async () => {
      await link(fs, '/home/user/original.txt', '/home/user/hardlink.txt')
      expect(fs.getNlink('/home/user/original.txt')).toBe(2)

      // Delete one link
      fs.deleteFile('/home/user/hardlink.txt')

      // nlink should decrease, but original still exists
      expect(fs.getNlink('/home/user/original.txt')).toBe(1)
      expect(fs.exists('/home/user/original.txt')).toBe(true)
    })

    it('should only free inode data when nlink reaches 0', async () => {
      await link(fs, '/home/user/original.txt', '/home/user/link1.txt')
      await link(fs, '/home/user/original.txt', '/home/user/link2.txt')

      const ino = fs.getIno('/home/user/original.txt')!

      // Delete all but one link
      fs.deleteFile('/home/user/original.txt')
      fs.deleteFile('/home/user/link1.txt')

      // link2 should still exist with nlink=1
      expect(fs.exists('/home/user/link2.txt')).toBe(true)
      expect(fs.getNlink('/home/user/link2.txt')).toBe(1)

      // Content should still be accessible
      expect(fs.readFile('/home/user/link2.txt')).toBe('Persistent content')
    })

    it('should preserve data until all links are deleted', async () => {
      await link(fs, '/home/user/original.txt', '/home/user/backup.txt')

      // Delete original
      fs.deleteFile('/home/user/original.txt')

      // Data still accessible via backup
      const content = fs.readFile('/home/user/backup.txt')
      expect(content).toBe('Persistent content')

      // Modify via backup
      fs.writeFile('/home/user/backup.txt', 'Updated after original deleted')
      expect(fs.readFile('/home/user/backup.txt')).toBe('Updated after original deleted')
    })
  })

  describe('error cases', () => {
    describe('ENOENT - source does not exist', () => {
      it('should throw ENOENT when source file does not exist', async () => {
        await expect(
          link(fs, '/home/user/nonexistent.txt', '/home/user/link.txt')
        ).rejects.toThrow(ENOENT)
      })

      it('should throw ENOENT with correct syscall and path', async () => {
        try {
          await link(fs, '/home/user/nonexistent.txt', '/home/user/link.txt')
          expect.fail('Should have thrown ENOENT')
        } catch (error) {
          expect(error).toBeInstanceOf(ENOENT)
          expect((error as ENOENT).syscall).toBe('link')
          expect((error as ENOENT).path).toBe('/home/user/nonexistent.txt')
        }
      })

      it('should throw ENOENT when source path has nonexistent parent directory', async () => {
        await expect(
          link(fs, '/nonexistent/parent/file.txt', '/home/user/link.txt')
        ).rejects.toThrow(ENOENT)
      })
    })

    describe('EEXIST - destination already exists', () => {
      beforeEach(() => {
        fs.createFile('/home/user/source.txt', 'Source content')
        fs.createFile('/home/user/existing.txt', 'Existing content')
      })

      it('should throw EEXIST when destination file already exists', async () => {
        await expect(
          link(fs, '/home/user/source.txt', '/home/user/existing.txt')
        ).rejects.toThrow(EEXIST)
      })

      it('should throw EEXIST with correct syscall and path', async () => {
        try {
          await link(fs, '/home/user/source.txt', '/home/user/existing.txt')
          expect.fail('Should have thrown EEXIST')
        } catch (error) {
          expect(error).toBeInstanceOf(EEXIST)
          expect((error as EEXIST).syscall).toBe('link')
          expect((error as EEXIST).path).toBe('/home/user/existing.txt')
        }
      })

      it('should throw EEXIST when destination is an existing directory', async () => {
        fs.createDirectory('/home/user/existingdir')

        await expect(
          link(fs, '/home/user/source.txt', '/home/user/existingdir')
        ).rejects.toThrow(EEXIST)
      })
    })

    describe('EPERM - operation not permitted (directories)', () => {
      beforeEach(() => {
        fs.createDirectory('/home/user/sourcedir')
      })

      it('should throw EPERM when attempting to hard link a directory', async () => {
        await expect(
          link(fs, '/home/user/sourcedir', '/home/user/linkdir')
        ).rejects.toThrow(EPERM)
      })

      it('should throw EPERM with correct syscall and path for directory link', async () => {
        try {
          await link(fs, '/home/user/sourcedir', '/home/user/linkdir')
          expect.fail('Should have thrown EPERM')
        } catch (error) {
          expect(error).toBeInstanceOf(EPERM)
          expect((error as EPERM).syscall).toBe('link')
          expect((error as EPERM).path).toBe('/home/user/sourcedir')
        }
      })

      it('should not allow hard links to root directory', async () => {
        await expect(
          link(fs, '/', '/home/user/rootlink')
        ).rejects.toThrow(EPERM)
      })

      it('should not allow hard links to . or ..', async () => {
        await expect(
          link(fs, '/home/user/.', '/home/user/dotlink')
        ).rejects.toThrow(EPERM)

        await expect(
          link(fs, '/home/user/..', '/home/user/dotdotlink')
        ).rejects.toThrow(EPERM)
      })
    })

    describe('ENOENT - destination parent does not exist', () => {
      beforeEach(() => {
        fs.createFile('/home/user/source.txt', 'Source content')
      })

      it('should throw ENOENT when destination parent directory does not exist', async () => {
        await expect(
          link(fs, '/home/user/source.txt', '/nonexistent/parent/link.txt')
        ).rejects.toThrow(ENOENT)
      })
    })
  })

  describe('edge cases', () => {
    it('should handle link to file in same directory', async () => {
      fs.createFile('/home/user/file.txt', 'Content')

      await link(fs, '/home/user/file.txt', '/home/user/file-link.txt')

      expect(fs.exists('/home/user/file-link.txt')).toBe(true)
      expect(fs.getIno('/home/user/file.txt')).toBe(fs.getIno('/home/user/file-link.txt'))
    })

    it('should handle link to file in different directory', async () => {
      fs.createDirectory('/home/other')
      fs.createFile('/home/user/file.txt', 'Cross-directory content')

      await link(fs, '/home/user/file.txt', '/home/other/file-link.txt')

      expect(fs.exists('/home/other/file-link.txt')).toBe(true)
      expect(fs.getIno('/home/user/file.txt')).toBe(fs.getIno('/home/other/file-link.txt'))
    })

    it('should handle link with empty file', async () => {
      fs.createFile('/home/user/empty.txt', '')

      await link(fs, '/home/user/empty.txt', '/home/user/empty-link.txt')

      expect(fs.exists('/home/user/empty-link.txt')).toBe(true)
      expect(fs.readFile('/home/user/empty-link.txt')).toBe('')
    })

    it('should handle link with large file', async () => {
      const largeContent = 'x'.repeat(1024 * 1024) // 1MB of data
      fs.createFile('/home/user/large.txt', largeContent)

      await link(fs, '/home/user/large.txt', '/home/user/large-link.txt')

      expect(fs.exists('/home/user/large-link.txt')).toBe(true)
      expect(fs.readFile('/home/user/large-link.txt')).toBe(largeContent)
    })

    it('should handle link with special characters in filename', async () => {
      fs.createFile('/home/user/file with spaces.txt', 'Content')

      await link(fs, '/home/user/file with spaces.txt', '/home/user/link with spaces.txt')

      expect(fs.exists('/home/user/link with spaces.txt')).toBe(true)
    })

    it('should handle link when source and destination are the same path', async () => {
      fs.createFile('/home/user/file.txt', 'Content')

      // Linking a file to itself should throw EEXIST
      await expect(
        link(fs, '/home/user/file.txt', '/home/user/file.txt')
      ).rejects.toThrow(EEXIST)
    })

    it('should handle link to existing hard link', async () => {
      fs.createFile('/home/user/original.txt', 'Content')
      await link(fs, '/home/user/original.txt', '/home/user/link1.txt')

      // Create another link from the first link
      await link(fs, '/home/user/link1.txt', '/home/user/link2.txt')

      // All three should share the same inode
      const originalIno = fs.getIno('/home/user/original.txt')
      expect(fs.getIno('/home/user/link1.txt')).toBe(originalIno)
      expect(fs.getIno('/home/user/link2.txt')).toBe(originalIno)

      // nlink should be 3
      expect(fs.getNlink('/home/user/original.txt')).toBe(3)
    })
  })

  describe('atomicity and consistency', () => {
    it('should not create partial links on error', async () => {
      fs.createFile('/home/user/source.txt', 'Content')
      fs.createFile('/home/user/existing.txt', 'Existing')

      const nlinkBefore = fs.getNlink('/home/user/source.txt')

      // This should fail with EEXIST
      try {
        await link(fs, '/home/user/source.txt', '/home/user/existing.txt')
      } catch {
        // Expected
      }

      // nlink should not have changed
      expect(fs.getNlink('/home/user/source.txt')).toBe(nlinkBefore)
    })

    it('should update ctime on successful link', async () => {
      // This test verifies that creating a hard link updates the ctime of the inode
      // Since our mock doesn't track ctime, this is a placeholder for the real implementation
      fs.createFile('/home/user/source.txt', 'Content')

      await link(fs, '/home/user/source.txt', '/home/user/link.txt')

      // In real implementation, verify ctime is updated
      // For now, just verify the link was created
      expect(fs.exists('/home/user/link.txt')).toBe(true)
    })
  })
})
