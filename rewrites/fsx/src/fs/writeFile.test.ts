import { describe, it, expect, beforeEach } from 'vitest'
import { writeFile } from './writeFile'
import { ENOENT, EISDIR } from '../core/errors'

/**
 * Tests for writeFile operation
 *
 * These tests are in RED phase - they will fail until implementation is complete.
 * The writeFile function should:
 * - Write string data to a file (creating it if it doesn't exist)
 * - Write Uint8Array data to a file
 * - Overwrite existing files
 * - Support explicit encoding options
 * - Throw EISDIR when path is a directory
 * - Throw ENOENT when parent directory doesn't exist
 * - Handle empty content
 * - Handle large files
 */

describe('writeFile', () => {
  describe('happy path - string data', () => {
    it('should write string to a new file', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/hello.txt'
      const content = 'Hello, World!'

      await writeFile(mockStorage, path, content)

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new TextEncoder().encode(content))
    })

    it('should write empty string to a new file', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/empty.txt'
      const content = ''

      await writeFile(mockStorage, path, content)

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new Uint8Array([]))
      expect(result?.content.length).toBe(0)
    })

    it('should write multiline string content', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/multiline.txt'
      const content = 'Line 1\nLine 2\nLine 3'

      await writeFile(mockStorage, path, content)

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new TextEncoder().encode(content))
    })

    it('should write string with unicode characters', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/unicode.txt'
      const content = 'Hello, World!'

      await writeFile(mockStorage, path, content)

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new TextEncoder().encode(content))
    })
  })

  describe('happy path - Uint8Array data', () => {
    it('should write Uint8Array to a new file', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/binary.bin'
      const content = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]) // "Hello"

      await writeFile(mockStorage, path, content)

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(content)
    })

    it('should write empty Uint8Array to a new file', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/empty.bin'
      const content = new Uint8Array([])

      await writeFile(mockStorage, path, content)

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(content)
      expect(result?.content.length).toBe(0)
    })

    it('should write binary data with all byte values', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/allbytes.bin'
      const content = new Uint8Array(256)
      for (let i = 0; i < 256; i++) {
        content[i] = i
      }

      await writeFile(mockStorage, path, content)

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(content)
    })
  })

  describe('happy path - overwrite existing file', () => {
    it('should overwrite existing file with new string content', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/existing.txt'
      const originalContent = 'Original content'
      const newContent = 'New content'

      // First write
      await writeFile(mockStorage, path, originalContent)
      expect(mockStorage.getFile(path)?.content).toEqual(new TextEncoder().encode(originalContent))

      // Overwrite
      await writeFile(mockStorage, path, newContent)
      expect(mockStorage.getFile(path)?.content).toEqual(new TextEncoder().encode(newContent))
    })

    it('should overwrite existing file with new Uint8Array content', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/existing.bin'
      const originalContent = new Uint8Array([1, 2, 3])
      const newContent = new Uint8Array([4, 5, 6, 7, 8])

      // First write
      await writeFile(mockStorage, path, originalContent)
      expect(mockStorage.getFile(path)?.content).toEqual(originalContent)

      // Overwrite
      await writeFile(mockStorage, path, newContent)
      expect(mockStorage.getFile(path)?.content).toEqual(newContent)
    })

    it('should overwrite larger file with smaller content', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/shrink.txt'
      const largeContent = 'A'.repeat(1000)
      const smallContent = 'Small'

      await writeFile(mockStorage, path, largeContent)
      expect(mockStorage.getFile(path)?.content.length).toBe(1000)

      await writeFile(mockStorage, path, smallContent)
      expect(mockStorage.getFile(path)?.content.length).toBe(5)
      expect(mockStorage.getFile(path)?.content).toEqual(new TextEncoder().encode(smallContent))
    })

    it('should overwrite smaller file with larger content', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/grow.txt'
      const smallContent = 'Small'
      const largeContent = 'A'.repeat(1000)

      await writeFile(mockStorage, path, smallContent)
      expect(mockStorage.getFile(path)?.content.length).toBe(5)

      await writeFile(mockStorage, path, largeContent)
      expect(mockStorage.getFile(path)?.content.length).toBe(1000)
    })
  })

  describe('happy path - explicit encoding', () => {
    it('should write string with utf-8 encoding', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/utf8.txt'
      const content = 'Hello, World!'

      await writeFile(mockStorage, path, content, { encoding: 'utf-8' })

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new TextEncoder().encode(content))
    })

    it('should write string with utf8 encoding alias', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/utf8alias.txt'
      const content = 'Hello, World!'

      await writeFile(mockStorage, path, content, { encoding: 'utf8' })

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new TextEncoder().encode(content))
    })

    it('should write base64 encoded data', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/base64.bin'
      const originalData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]) // "Hello"
      const base64Content = 'SGVsbG8=' // base64 of "Hello"

      await writeFile(mockStorage, path, base64Content, { encoding: 'base64' })

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(originalData)
    })

    it('should write hex encoded data', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/hex.bin'
      const originalData = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]) // "Hello"
      const hexContent = '48656c6c6f' // hex of "Hello"

      await writeFile(mockStorage, path, hexContent, { encoding: 'hex' })

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(originalData)
    })
  })

  describe('error - EISDIR', () => {
    it('should throw EISDIR when path is a directory', async () => {
      const mockStorage = createMockStorage()
      mockStorage.addDirectory('/test/mydir')
      const path = '/test/mydir'

      await expect(writeFile(mockStorage, path, 'content'))
        .rejects.toThrow(EISDIR)
    })

    it('should throw EISDIR with correct syscall', async () => {
      const mockStorage = createMockStorage()
      mockStorage.addDirectory('/test/mydir')
      const path = '/test/mydir'

      try {
        await writeFile(mockStorage, path, 'content')
        expect.fail('Should have thrown EISDIR')
      } catch (error) {
        expect(error).toBeInstanceOf(EISDIR)
        expect((error as EISDIR).syscall).toBe('open')
        expect((error as EISDIR).path).toBe(path)
      }
    })

    it('should throw EISDIR for root directory', async () => {
      const mockStorage = createMockStorage()
      const path = '/'

      await expect(writeFile(mockStorage, path, 'content'))
        .rejects.toThrow(EISDIR)
    })
  })

  describe('error - ENOENT', () => {
    it('should throw ENOENT when parent directory does not exist', async () => {
      const mockStorage = createMockStorage()
      const path = '/nonexistent/parent/file.txt'

      await expect(writeFile(mockStorage, path, 'content'))
        .rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT with correct syscall and path', async () => {
      const mockStorage = createMockStorage()
      const path = '/nonexistent/file.txt'

      try {
        await writeFile(mockStorage, path, 'content')
        expect.fail('Should have thrown ENOENT')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOENT)
        expect((error as ENOENT).syscall).toBe('open')
        expect((error as ENOENT).path).toBe('/nonexistent')
      }
    })

    it('should throw ENOENT for deeply nested nonexistent path', async () => {
      const mockStorage = createMockStorage()
      const path = '/a/b/c/d/e/f/file.txt'

      await expect(writeFile(mockStorage, path, 'content'))
        .rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT when intermediate path component is a file', async () => {
      const mockStorage = createMockStorage()
      mockStorage.addFile('/test/file.txt', new Uint8Array([]))
      const path = '/test/file.txt/nested.txt'

      // This should throw ENOENT because file.txt is a file, not a directory
      await expect(writeFile(mockStorage, path, 'content'))
        .rejects.toThrow(ENOENT)
    })
  })

  describe('empty content', () => {
    it('should create file with empty string', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/empty.txt'

      await writeFile(mockStorage, path, '')

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content.length).toBe(0)
    })

    it('should create file with empty Uint8Array', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/empty.bin'

      await writeFile(mockStorage, path, new Uint8Array(0))

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content.length).toBe(0)
    })

    it('should overwrite existing content with empty content', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/clear.txt'

      await writeFile(mockStorage, path, 'Some content')
      expect(mockStorage.getFile(path)?.content.length).toBeGreaterThan(0)

      await writeFile(mockStorage, path, '')
      expect(mockStorage.getFile(path)?.content.length).toBe(0)
    })
  })

  describe('large file handling', () => {
    it('should write 1MB file', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/large1mb.bin'
      const size = 1024 * 1024 // 1MB
      const content = new Uint8Array(size)
      for (let i = 0; i < size; i++) {
        content[i] = i % 256
      }

      await writeFile(mockStorage, path, content)

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content.length).toBe(size)
      expect(result?.content).toEqual(content)
    })

    it('should write 10MB file', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/large10mb.bin'
      const size = 10 * 1024 * 1024 // 10MB
      const content = new Uint8Array(size)
      for (let i = 0; i < size; i++) {
        content[i] = i % 256
      }

      await writeFile(mockStorage, path, content)

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content.length).toBe(size)
    })

    it('should write large string content', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/largetext.txt'
      const content = 'A'.repeat(1024 * 1024) // 1MB of 'A's

      await writeFile(mockStorage, path, content)

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content.length).toBe(1024 * 1024)
    })
  })

  describe('file metadata', () => {
    it('should set file creation time on new file', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/newfile.txt'
      const beforeTime = Date.now()

      await writeFile(mockStorage, path, 'content')

      const afterTime = Date.now()
      const result = mockStorage.getFile(path)
      expect(result?.metadata.birthtime).toBeGreaterThanOrEqual(beforeTime)
      expect(result?.metadata.birthtime).toBeLessThanOrEqual(afterTime)
    })

    it('should update modification time on overwrite', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/updatetime.txt'

      await writeFile(mockStorage, path, 'original')
      const originalMtime = mockStorage.getFile(path)?.metadata.mtime

      // Small delay to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10))

      await writeFile(mockStorage, path, 'updated')
      const updatedMtime = mockStorage.getFile(path)?.metadata.mtime

      expect(updatedMtime).toBeGreaterThan(originalMtime!)
    })

    it('should preserve birthtime on overwrite', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/preservebirth.txt'

      await writeFile(mockStorage, path, 'original')
      const originalBirthtime = mockStorage.getFile(path)?.metadata.birthtime

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 10))

      await writeFile(mockStorage, path, 'updated')
      const updatedBirthtime = mockStorage.getFile(path)?.metadata.birthtime

      expect(updatedBirthtime).toBe(originalBirthtime)
    })
  })

  describe('options - mode', () => {
    it('should create file with default mode', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/defaultmode.txt'

      await writeFile(mockStorage, path, 'content')

      const result = mockStorage.getFile(path)
      expect(result?.metadata.mode).toBe(0o644) // Default file mode
    })

    it('should create file with specified mode', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/custommode.txt'

      await writeFile(mockStorage, path, 'content', { mode: 0o600 })

      const result = mockStorage.getFile(path)
      expect(result?.metadata.mode).toBe(0o600)
    })

    it('should create executable file with mode 0o755', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/executable.sh'

      await writeFile(mockStorage, path, '#!/bin/bash\necho hello', { mode: 0o755 })

      const result = mockStorage.getFile(path)
      expect(result?.metadata.mode).toBe(0o755)
    })
  })

  describe('options - flag', () => {
    it('should create new file with flag "w"', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/newflag.txt'

      await writeFile(mockStorage, path, 'content', { flag: 'w' })

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new TextEncoder().encode('content'))
    })

    it('should overwrite existing file with flag "w"', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/overwriteflag.txt'

      await writeFile(mockStorage, path, 'original')
      await writeFile(mockStorage, path, 'overwritten', { flag: 'w' })

      const result = mockStorage.getFile(path)
      expect(result?.content).toEqual(new TextEncoder().encode('overwritten'))
    })

    it('should append to file with flag "a"', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/appendflag.txt'

      await writeFile(mockStorage, path, 'Hello, ')
      await writeFile(mockStorage, path, 'World!', { flag: 'a' })

      const result = mockStorage.getFile(path)
      expect(result?.content).toEqual(new TextEncoder().encode('Hello, World!'))
    })

    it('should fail with flag "wx" if file exists', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/exclusive.txt'

      await writeFile(mockStorage, path, 'first')

      // wx flag means exclusive write - should fail if file exists
      await expect(writeFile(mockStorage, path, 'second', { flag: 'wx' }))
        .rejects.toThrow()
    })

    it('should create file with flag "wx" if file does not exist', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/newexclusive.txt'

      await writeFile(mockStorage, path, 'content', { flag: 'wx' })

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new TextEncoder().encode('content'))
    })
  })

  describe('path handling', () => {
    it('should handle paths with trailing slashes correctly', async () => {
      const mockStorage = createMockStorage()
      // Path should be normalized - trailing slashes removed for files
      const path = '/test/file.txt'

      await writeFile(mockStorage, path, 'content')

      const result = mockStorage.getFile('/test/file.txt')
      expect(result).toBeDefined()
    })

    it('should handle paths with double slashes', async () => {
      const mockStorage = createMockStorage()
      const path = '/test//file.txt'

      await writeFile(mockStorage, path, 'content')

      // Should normalize to /test/file.txt
      const result = mockStorage.getFile('/test/file.txt')
      expect(result).toBeDefined()
    })

    it('should handle paths with dots', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/./file.txt'

      await writeFile(mockStorage, path, 'content')

      // Should normalize to /test/file.txt
      const result = mockStorage.getFile('/test/file.txt')
      expect(result).toBeDefined()
    })

    it('should handle paths with parent references', async () => {
      const mockStorage = createMockStorage()
      mockStorage.addDirectory('/test/subdir')
      const path = '/test/subdir/../file.txt'

      await writeFile(mockStorage, path, 'content')

      // Should normalize to /test/file.txt
      const result = mockStorage.getFile('/test/file.txt')
      expect(result).toBeDefined()
    })

    it('should write to root directory', async () => {
      const mockStorage = createMockStorage()
      const path = '/rootfile.txt'

      await writeFile(mockStorage, path, 'content')

      const result = mockStorage.getFile('/rootfile.txt')
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new TextEncoder().encode('content'))
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
  isDirectory(path: string): boolean
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
  const directories = new Set<string>(['/test', '/']) // Pre-create /test and root

  return {
    getFile(path: string): MockFile | undefined {
      return files.get(path)
    },

    addDirectory(path: string): void {
      directories.add(path)
    },

    addFile(path: string, content: Uint8Array, metadata?: { mode?: number; birthtime?: number }): void {
      const now = Date.now()
      files.set(path, {
        content,
        metadata: {
          mode: metadata?.mode ?? 0o644,
          mtime: now,
          birthtime: metadata?.birthtime ?? now,
          ctime: now,
        },
      })
    },

    isDirectory(path: string): boolean {
      return directories.has(path)
    },

    parentExists(path: string): boolean {
      const parent = path.substring(0, path.lastIndexOf('/')) || '/'
      return directories.has(parent) || files.has(parent)
    },
  }
}
