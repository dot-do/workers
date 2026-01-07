import { describe, it, expect } from 'vitest'
import { copyFile, COPYFILE_EXCL, COPYFILE_FICLONE, COPYFILE_FICLONE_FORCE } from './copyFile'
import { ENOENT, EEXIST, EISDIR } from '../core/errors'

/**
 * Tests for copyFile operation
 *
 * These tests are in RED phase - they will fail until implementation is complete.
 * The copyFile function should:
 * - Copy source file to destination
 * - By default, overwrite destination if it exists
 * - With COPYFILE_EXCL flag, throw EEXIST if dest exists
 * - Throw ENOENT if source doesn't exist
 * - Throw EISDIR if source or dest is a directory
 * - Preserve file content exactly (binary safe)
 * - Return undefined on success
 */

describe('copyFile', () => {
  describe('basic file copy', () => {
    it('should copy a file to a new destination', async () => {
      const mockStorage = createMockStorage()
      const srcContent = new TextEncoder().encode('Hello, World!')
      mockStorage.addFile('/src/source.txt', srcContent)

      await copyFile(mockStorage, '/src/source.txt', '/dest/copied.txt')

      const result = mockStorage.getFile('/dest/copied.txt')
      expect(result).toBeDefined()
      expect(result?.content).toEqual(srcContent)
    })

    it('should return undefined on success', async () => {
      const mockStorage = createMockStorage()
      mockStorage.addFile('/src/file.txt', new TextEncoder().encode('content'))

      const result = await copyFile(mockStorage, '/src/file.txt', '/dest/file.txt')

      expect(result).toBeUndefined()
    })

    it('should copy empty file', async () => {
      const mockStorage = createMockStorage()
      mockStorage.addFile('/src/empty.txt', new Uint8Array([]))

      await copyFile(mockStorage, '/src/empty.txt', '/dest/empty.txt')

      const result = mockStorage.getFile('/dest/empty.txt')
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new Uint8Array([]))
      expect(result?.content.length).toBe(0)
    })

    it('should copy file to same directory with different name', async () => {
      const mockStorage = createMockStorage()
      const content = new TextEncoder().encode('test content')
      mockStorage.addFile('/test/original.txt', content)

      await copyFile(mockStorage, '/test/original.txt', '/test/copy.txt')

      const result = mockStorage.getFile('/test/copy.txt')
      expect(result).toBeDefined()
      expect(result?.content).toEqual(content)
      // Original should still exist
      expect(mockStorage.getFile('/test/original.txt')).toBeDefined()
    })
  })

  describe('copy with overwrite (default behavior)', () => {
    it('should overwrite existing file by default', async () => {
      const mockStorage = createMockStorage()
      const originalContent = new TextEncoder().encode('original')
      const newContent = new TextEncoder().encode('new content')
      mockStorage.addFile('/src/source.txt', newContent)
      mockStorage.addFile('/dest/target.txt', originalContent)

      await copyFile(mockStorage, '/src/source.txt', '/dest/target.txt')

      const result = mockStorage.getFile('/dest/target.txt')
      expect(result?.content).toEqual(newContent)
    })

    it('should overwrite larger file with smaller content', async () => {
      const mockStorage = createMockStorage()
      const largeContent = new Uint8Array(10000).fill(0x41) // 10KB of 'A'
      const smallContent = new TextEncoder().encode('Small')
      mockStorage.addFile('/src/small.txt', smallContent)
      mockStorage.addFile('/dest/large.txt', largeContent)

      await copyFile(mockStorage, '/src/small.txt', '/dest/large.txt')

      const result = mockStorage.getFile('/dest/large.txt')
      expect(result?.content).toEqual(smallContent)
      expect(result?.content.length).toBe(5)
    })

    it('should overwrite smaller file with larger content', async () => {
      const mockStorage = createMockStorage()
      const smallContent = new TextEncoder().encode('Small')
      const largeContent = new Uint8Array(10000).fill(0x42) // 10KB of 'B'
      mockStorage.addFile('/src/large.bin', largeContent)
      mockStorage.addFile('/dest/small.txt', smallContent)

      await copyFile(mockStorage, '/src/large.bin', '/dest/small.txt')

      const result = mockStorage.getFile('/dest/small.txt')
      expect(result?.content).toEqual(largeContent)
      expect(result?.content.length).toBe(10000)
    })

    it('should overwrite with mode = 0 (explicit no flags)', async () => {
      const mockStorage = createMockStorage()
      const originalContent = new TextEncoder().encode('old')
      const newContent = new TextEncoder().encode('new')
      mockStorage.addFile('/src/source.txt', newContent)
      mockStorage.addFile('/dest/target.txt', originalContent)

      await copyFile(mockStorage, '/src/source.txt', '/dest/target.txt', 0)

      const result = mockStorage.getFile('/dest/target.txt')
      expect(result?.content).toEqual(newContent)
    })
  })

  describe('COPYFILE_EXCL - fail if dest exists', () => {
    it('should throw EEXIST when dest exists with COPYFILE_EXCL', async () => {
      const mockStorage = createMockStorage()
      mockStorage.addFile('/src/source.txt', new TextEncoder().encode('source'))
      mockStorage.addFile('/dest/existing.txt', new TextEncoder().encode('existing'))

      await expect(
        copyFile(mockStorage, '/src/source.txt', '/dest/existing.txt', COPYFILE_EXCL)
      ).rejects.toThrow(EEXIST)
    })

    it('should throw EEXIST with correct syscall and path', async () => {
      const mockStorage = createMockStorage()
      mockStorage.addFile('/src/source.txt', new TextEncoder().encode('source'))
      mockStorage.addFile('/dest/existing.txt', new TextEncoder().encode('existing'))

      try {
        await copyFile(mockStorage, '/src/source.txt', '/dest/existing.txt', COPYFILE_EXCL)
        expect.fail('Should have thrown EEXIST')
      } catch (error) {
        expect(error).toBeInstanceOf(EEXIST)
        expect((error as EEXIST).syscall).toBe('copyfile')
        expect((error as EEXIST).path).toBe('/dest/existing.txt')
      }
    })

    it('should succeed with COPYFILE_EXCL when dest does not exist', async () => {
      const mockStorage = createMockStorage()
      const content = new TextEncoder().encode('content')
      mockStorage.addFile('/src/source.txt', content)

      await copyFile(mockStorage, '/src/source.txt', '/dest/new.txt', COPYFILE_EXCL)

      const result = mockStorage.getFile('/dest/new.txt')
      expect(result).toBeDefined()
      expect(result?.content).toEqual(content)
    })

    it('should throw EEXIST even if dest is empty file', async () => {
      const mockStorage = createMockStorage()
      mockStorage.addFile('/src/source.txt', new TextEncoder().encode('content'))
      mockStorage.addFile('/dest/empty.txt', new Uint8Array([]))

      await expect(
        copyFile(mockStorage, '/src/source.txt', '/dest/empty.txt', COPYFILE_EXCL)
      ).rejects.toThrow(EEXIST)
    })
  })

  describe('ENOENT - source does not exist', () => {
    it('should throw ENOENT when source does not exist', async () => {
      const mockStorage = createMockStorage()

      await expect(
        copyFile(mockStorage, '/nonexistent/file.txt', '/dest/file.txt')
      ).rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT with correct syscall and path', async () => {
      const mockStorage = createMockStorage()

      try {
        await copyFile(mockStorage, '/nonexistent/source.txt', '/dest/file.txt')
        expect.fail('Should have thrown ENOENT')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOENT)
        expect((error as ENOENT).syscall).toBe('copyfile')
        expect((error as ENOENT).path).toBe('/nonexistent/source.txt')
      }
    })

    it('should throw ENOENT for deeply nested nonexistent source', async () => {
      const mockStorage = createMockStorage()

      await expect(
        copyFile(mockStorage, '/a/b/c/d/e/f/file.txt', '/dest/file.txt')
      ).rejects.toThrow(ENOENT)
    })
  })

  describe('EISDIR - source or dest is directory', () => {
    it('should throw EISDIR when source is a directory', async () => {
      const mockStorage = createMockStorage()
      mockStorage.addDirectory('/src/mydir')

      await expect(
        copyFile(mockStorage, '/src/mydir', '/dest/target')
      ).rejects.toThrow(EISDIR)
    })

    it('should throw EISDIR with correct syscall when source is directory', async () => {
      const mockStorage = createMockStorage()
      mockStorage.addDirectory('/src/mydir')

      try {
        await copyFile(mockStorage, '/src/mydir', '/dest/target')
        expect.fail('Should have thrown EISDIR')
      } catch (error) {
        expect(error).toBeInstanceOf(EISDIR)
        expect((error as EISDIR).syscall).toBe('copyfile')
        expect((error as EISDIR).path).toBe('/src/mydir')
      }
    })

    it('should throw EISDIR when dest is a directory', async () => {
      const mockStorage = createMockStorage()
      mockStorage.addFile('/src/file.txt', new TextEncoder().encode('content'))
      mockStorage.addDirectory('/dest/targetdir')

      await expect(
        copyFile(mockStorage, '/src/file.txt', '/dest/targetdir')
      ).rejects.toThrow(EISDIR)
    })

    it('should throw EISDIR when trying to copy to root', async () => {
      const mockStorage = createMockStorage()
      mockStorage.addFile('/src/file.txt', new TextEncoder().encode('content'))

      await expect(
        copyFile(mockStorage, '/src/file.txt', '/')
      ).rejects.toThrow(EISDIR)
    })
  })

  describe('large file copy (binary data)', () => {
    it('should copy 1MB file correctly', async () => {
      const mockStorage = createMockStorage()
      const size = 1024 * 1024 // 1MB
      const content = new Uint8Array(size)
      for (let i = 0; i < size; i++) {
        content[i] = i % 256
      }
      mockStorage.addFile('/src/large.bin', content)

      await copyFile(mockStorage, '/src/large.bin', '/dest/large.bin')

      const result = mockStorage.getFile('/dest/large.bin')
      expect(result).toBeDefined()
      expect(result?.content.length).toBe(size)
      expect(result?.content).toEqual(content)
    })

    it('should copy 10MB file correctly', async () => {
      const mockStorage = createMockStorage()
      const size = 10 * 1024 * 1024 // 10MB
      const content = new Uint8Array(size)
      for (let i = 0; i < size; i++) {
        content[i] = i % 256
      }
      mockStorage.addFile('/src/verylarge.bin', content)

      await copyFile(mockStorage, '/src/verylarge.bin', '/dest/verylarge.bin')

      const result = mockStorage.getFile('/dest/verylarge.bin')
      expect(result).toBeDefined()
      expect(result?.content.length).toBe(size)
    })
  })

  describe('content preservation (binary safe)', () => {
    it('should preserve all byte values (0x00 to 0xFF)', async () => {
      const mockStorage = createMockStorage()
      const content = new Uint8Array(256)
      for (let i = 0; i < 256; i++) {
        content[i] = i
      }
      mockStorage.addFile('/src/allbytes.bin', content)

      await copyFile(mockStorage, '/src/allbytes.bin', '/dest/allbytes.bin')

      const result = mockStorage.getFile('/dest/allbytes.bin')
      expect(result?.content).toEqual(content)
    })

    it('should preserve null bytes', async () => {
      const mockStorage = createMockStorage()
      const content = new Uint8Array([0x00, 0x00, 0x00, 0x41, 0x00, 0x42, 0x00])
      mockStorage.addFile('/src/nulls.bin', content)

      await copyFile(mockStorage, '/src/nulls.bin', '/dest/nulls.bin')

      const result = mockStorage.getFile('/dest/nulls.bin')
      expect(result?.content).toEqual(content)
    })

    it('should preserve UTF-8 encoded text', async () => {
      const mockStorage = createMockStorage()
      const text = 'Hello World! Emoji: test Unicode: test'
      const content = new TextEncoder().encode(text)
      mockStorage.addFile('/src/unicode.txt', content)

      await copyFile(mockStorage, '/src/unicode.txt', '/dest/unicode.txt')

      const result = mockStorage.getFile('/dest/unicode.txt')
      expect(result?.content).toEqual(content)
      expect(new TextDecoder().decode(result?.content)).toBe(text)
    })

    it('should preserve line endings exactly', async () => {
      const mockStorage = createMockStorage()
      // Mix of Unix and Windows line endings
      const content = new TextEncoder().encode('line1\nline2\r\nline3\rline4')
      mockStorage.addFile('/src/lineendings.txt', content)

      await copyFile(mockStorage, '/src/lineendings.txt', '/dest/lineendings.txt')

      const result = mockStorage.getFile('/dest/lineendings.txt')
      expect(result?.content).toEqual(content)
    })
  })

  describe('copy does not modify source', () => {
    it('should not modify source file content', async () => {
      const mockStorage = createMockStorage()
      const originalContent = new TextEncoder().encode('original content')
      mockStorage.addFile('/src/source.txt', originalContent)

      await copyFile(mockStorage, '/src/source.txt', '/dest/copy.txt')

      const source = mockStorage.getFile('/src/source.txt')
      expect(source?.content).toEqual(originalContent)
    })

    it('should not modify source file metadata', async () => {
      const mockStorage = createMockStorage()
      const content = new TextEncoder().encode('content')
      const birthtime = Date.now() - 10000 // 10 seconds ago
      mockStorage.addFile('/src/source.txt', content, { mode: 0o755, birthtime })

      const sourceBefore = mockStorage.getFile('/src/source.txt')
      await copyFile(mockStorage, '/src/source.txt', '/dest/copy.txt')
      const sourceAfter = mockStorage.getFile('/src/source.txt')

      expect(sourceAfter?.metadata.mode).toBe(sourceBefore?.metadata.mode)
      expect(sourceAfter?.metadata.birthtime).toBe(sourceBefore?.metadata.birthtime)
    })
  })

  describe('destination metadata', () => {
    it('should create destination with new birthtime', async () => {
      const mockStorage = createMockStorage()
      const content = new TextEncoder().encode('content')
      const oldBirthtime = Date.now() - 100000 // 100 seconds ago
      mockStorage.addFile('/src/source.txt', content, { birthtime: oldBirthtime })

      const beforeCopy = Date.now()
      await copyFile(mockStorage, '/src/source.txt', '/dest/copy.txt')
      const afterCopy = Date.now()

      const result = mockStorage.getFile('/dest/copy.txt')
      expect(result?.metadata.birthtime).toBeGreaterThanOrEqual(beforeCopy)
      expect(result?.metadata.birthtime).toBeLessThanOrEqual(afterCopy)
    })

    it('should preserve source file mode in destination', async () => {
      const mockStorage = createMockStorage()
      const content = new TextEncoder().encode('#!/bin/bash\necho hello')
      mockStorage.addFile('/src/script.sh', content, { mode: 0o755 })

      await copyFile(mockStorage, '/src/script.sh', '/dest/script.sh')

      const result = mockStorage.getFile('/dest/script.sh')
      expect(result?.metadata.mode).toBe(0o755)
    })

    it('should preserve source file mode 0o644', async () => {
      const mockStorage = createMockStorage()
      const content = new TextEncoder().encode('regular file')
      mockStorage.addFile('/src/file.txt', content, { mode: 0o644 })

      await copyFile(mockStorage, '/src/file.txt', '/dest/file.txt')

      const result = mockStorage.getFile('/dest/file.txt')
      expect(result?.metadata.mode).toBe(0o644)
    })
  })

  describe('COPYFILE_FICLONE flags', () => {
    it('should accept COPYFILE_FICLONE flag (copy-on-write hint)', async () => {
      const mockStorage = createMockStorage()
      const content = new TextEncoder().encode('content')
      mockStorage.addFile('/src/file.txt', content)

      // FICLONE is a hint - it should work even if copy-on-write isn't supported
      await copyFile(mockStorage, '/src/file.txt', '/dest/file.txt', COPYFILE_FICLONE)

      const result = mockStorage.getFile('/dest/file.txt')
      expect(result?.content).toEqual(content)
    })

    it('should accept combined flags COPYFILE_EXCL | COPYFILE_FICLONE', async () => {
      const mockStorage = createMockStorage()
      const content = new TextEncoder().encode('content')
      mockStorage.addFile('/src/file.txt', content)

      await copyFile(
        mockStorage,
        '/src/file.txt',
        '/dest/newfile.txt',
        COPYFILE_EXCL | COPYFILE_FICLONE
      )

      const result = mockStorage.getFile('/dest/newfile.txt')
      expect(result?.content).toEqual(content)
    })

    it('should throw EEXIST with combined flags if dest exists', async () => {
      const mockStorage = createMockStorage()
      mockStorage.addFile('/src/source.txt', new TextEncoder().encode('source'))
      mockStorage.addFile('/dest/existing.txt', new TextEncoder().encode('existing'))

      await expect(
        copyFile(
          mockStorage,
          '/src/source.txt',
          '/dest/existing.txt',
          COPYFILE_EXCL | COPYFILE_FICLONE
        )
      ).rejects.toThrow(EEXIST)
    })

    // Note: COPYFILE_FICLONE_FORCE would normally throw an error if CoW is not supported
    // In our implementation, we may want to either:
    // - Ignore it (treat like FICLONE)
    // - Throw an error indicating CoW is not supported
    it('should handle COPYFILE_FICLONE_FORCE flag', async () => {
      const mockStorage = createMockStorage()
      const content = new TextEncoder().encode('content')
      mockStorage.addFile('/src/file.txt', content)

      // Implementation may choose to either succeed (treating as hint) or throw
      // For now, test that it at least doesn't crash unexpectedly
      try {
        await copyFile(mockStorage, '/src/file.txt', '/dest/file.txt', COPYFILE_FICLONE_FORCE)
        // If it succeeded, verify the copy worked
        const result = mockStorage.getFile('/dest/file.txt')
        expect(result?.content).toEqual(content)
      } catch (error) {
        // If it threw, should be a reasonable error (not unimplemented)
        expect(error).not.toHaveProperty('message', 'copyFile: not implemented')
      }
    })
  })

  describe('path normalization', () => {
    it('should handle paths with double slashes', async () => {
      const mockStorage = createMockStorage()
      const content = new TextEncoder().encode('content')
      mockStorage.addFile('/src/file.txt', content)

      await copyFile(mockStorage, '/src//file.txt', '/dest//copy.txt')

      const result = mockStorage.getFile('/dest/copy.txt')
      expect(result).toBeDefined()
      expect(result?.content).toEqual(content)
    })

    it('should handle paths with dots', async () => {
      const mockStorage = createMockStorage()
      const content = new TextEncoder().encode('content')
      mockStorage.addFile('/src/file.txt', content)

      await copyFile(mockStorage, '/src/./file.txt', '/dest/./copy.txt')

      const result = mockStorage.getFile('/dest/copy.txt')
      expect(result).toBeDefined()
    })

    it('should handle paths with parent references', async () => {
      const mockStorage = createMockStorage()
      mockStorage.addDirectory('/src/subdir')
      const content = new TextEncoder().encode('content')
      mockStorage.addFile('/src/file.txt', content)

      await copyFile(mockStorage, '/src/subdir/../file.txt', '/dest/subdir/../copy.txt')

      const result = mockStorage.getFile('/dest/copy.txt')
      expect(result).toBeDefined()
    })
  })

  describe('symlink handling', () => {
    it('should follow symlinks for source (copy symlink target)', async () => {
      const mockStorage = createMockStorage()
      const content = new TextEncoder().encode('real content')
      mockStorage.addFile('/real/file.txt', content)
      mockStorage.addSymlink('/src/link.txt', '/real/file.txt')

      await copyFile(mockStorage, '/src/link.txt', '/dest/copy.txt')

      const result = mockStorage.getFile('/dest/copy.txt')
      expect(result?.content).toEqual(content)
    })
  })

  describe('edge cases', () => {
    it('should handle copying file to itself (same path)', async () => {
      const mockStorage = createMockStorage()
      const content = new TextEncoder().encode('content')
      mockStorage.addFile('/src/file.txt', content)

      // Node.js allows copying a file to itself - it's a no-op
      // Some implementations may throw an error
      // We'll test that content is preserved either way
      try {
        await copyFile(mockStorage, '/src/file.txt', '/src/file.txt')
        const result = mockStorage.getFile('/src/file.txt')
        expect(result?.content).toEqual(content)
      } catch {
        // If it throws, that's also acceptable behavior
        // Just ensure the file wasn't corrupted
        const result = mockStorage.getFile('/src/file.txt')
        expect(result?.content).toEqual(content)
      }
    })

    it('should handle very long file names', async () => {
      const mockStorage = createMockStorage()
      const content = new TextEncoder().encode('content')
      const longName = 'a'.repeat(200) + '.txt'
      mockStorage.addFile(`/src/${longName}`, content)

      await copyFile(mockStorage, `/src/${longName}`, `/dest/${longName}`)

      const result = mockStorage.getFile(`/dest/${longName}`)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(content)
    })

    it('should handle files with special characters in name', async () => {
      const mockStorage = createMockStorage()
      const content = new TextEncoder().encode('content')
      const specialName = 'file with spaces & symbols!.txt'
      mockStorage.addFile(`/src/${specialName}`, content)

      await copyFile(mockStorage, `/src/${specialName}`, `/dest/${specialName}`)

      const result = mockStorage.getFile(`/dest/${specialName}`)
      expect(result).toBeDefined()
    })

    it('should throw ENOENT when destination parent directory does not exist', async () => {
      const mockStorage = createMockStorage()
      const content = new TextEncoder().encode('content')
      mockStorage.addFile('/src/file.txt', content)
      // /nonexistent directory does not exist

      await expect(
        copyFile(mockStorage, '/src/file.txt', '/nonexistent/dest.txt')
      ).rejects.toThrow(ENOENT)
    })
  })
})

/**
 * Mock storage interface for testing
 */
interface MockFile {
  content: Uint8Array
  metadata: {
    mode: number
    mtime: number
    birthtime: number
    ctime: number
  }
}

interface MockStorage {
  getFile(path: string): MockFile | undefined
  addDirectory(path: string): void
  addFile(path: string, content: Uint8Array, metadata?: { mode?: number; birthtime?: number }): void
  addSymlink(path: string, target: string): void
  isDirectory(path: string): boolean
  isSymlink(path: string): boolean
  getSymlinkTarget(path: string): string | undefined
  parentExists(path: string): boolean
}

/**
 * Create mock storage for tests
 *
 * Note: This creates a minimal mock. The actual implementation
 * will use the real storage backend.
 */
function createMockStorage(): MockStorage {
  const files = new Map<string, MockFile>()
  const directories = new Set<string>(['/src', '/dest', '/test', '/real', '/'])
  const symlinks = new Map<string, string>()

  function normalizePath(path: string): string {
    const segments = path.split('/').filter(s => s !== '' && s !== '.')
    const result: string[] = []
    for (const segment of segments) {
      if (segment === '..') {
        result.pop()
      } else {
        result.push(segment)
      }
    }
    return '/' + result.join('/')
  }

  return {
    getFile(path: string): MockFile | undefined {
      const normalized = normalizePath(path)
      // Follow symlinks
      if (symlinks.has(normalized)) {
        const target = symlinks.get(normalized)!
        return files.get(normalizePath(target))
      }
      return files.get(normalized)
    },

    addDirectory(path: string): void {
      directories.add(normalizePath(path))
    },

    addFile(path: string, content: Uint8Array, metadata?: { mode?: number; birthtime?: number }): void {
      const normalized = normalizePath(path)
      const now = Date.now()
      files.set(normalized, {
        content,
        metadata: {
          mode: metadata?.mode ?? 0o644,
          mtime: now,
          birthtime: metadata?.birthtime ?? now,
          ctime: now,
        },
      })
      // Ensure parent directories exist
      const parts = normalized.split('/')
      for (let i = 1; i < parts.length; i++) {
        directories.add(parts.slice(0, i).join('/') || '/')
      }
    },

    addSymlink(path: string, target: string): void {
      const normalized = normalizePath(path)
      symlinks.set(normalized, target)
    },

    isDirectory(path: string): boolean {
      return directories.has(normalizePath(path)) && !files.has(normalizePath(path))
    },

    isSymlink(path: string): boolean {
      return symlinks.has(normalizePath(path))
    },

    getSymlinkTarget(path: string): string | undefined {
      return symlinks.get(normalizePath(path))
    },

    parentExists(path: string): boolean {
      const normalized = normalizePath(path)
      const parent = normalized.substring(0, normalized.lastIndexOf('/')) || '/'
      return directories.has(parent)
    },
  }
}
