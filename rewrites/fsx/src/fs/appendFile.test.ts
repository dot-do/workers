import { describe, it, expect } from 'vitest'
import { appendFile } from './appendFile'
import { ENOENT, EISDIR } from '../core/errors'

/**
 * Tests for appendFile operation
 *
 * These tests are in RED phase - they will fail until implementation is complete.
 * The appendFile function should:
 * - Append string data to a file
 * - Append Uint8Array data to a file
 * - Create the file if it doesn't exist
 * - Preserve existing content
 * - Support encoding options for strings
 * - Return undefined on success
 * - Throw EISDIR when path is a directory
 * - Throw ENOENT when parent directory doesn't exist
 */

describe('appendFile', () => {
  describe('append to existing file - string data', () => {
    it('should append string to existing file', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/existing.txt'
      const existingContent = 'Hello, '
      mockStorage.addFile(path, new TextEncoder().encode(existingContent))

      await appendFile(mockStorage, path, 'World!')

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new TextEncoder().encode('Hello, World!'))
    })

    it('should append multiline string to existing file', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/multiline.txt'
      const existingContent = 'Line 1\n'
      mockStorage.addFile(path, new TextEncoder().encode(existingContent))

      await appendFile(mockStorage, path, 'Line 2\nLine 3')

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new TextEncoder().encode('Line 1\nLine 2\nLine 3'))
    })

    it('should append empty string (no change)', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/nochange.txt'
      const existingContent = 'Original content'
      mockStorage.addFile(path, new TextEncoder().encode(existingContent))

      await appendFile(mockStorage, path, '')

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new TextEncoder().encode(existingContent))
    })

    it('should append unicode characters', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/unicode.txt'
      const existingContent = 'Hello '
      mockStorage.addFile(path, new TextEncoder().encode(existingContent))

      await appendFile(mockStorage, path, 'World!')

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      const decoded = new TextDecoder().decode(result?.content)
      expect(decoded).toBe('Hello World!')
    })
  })

  describe('append to existing file - Uint8Array data', () => {
    it('should append Uint8Array to existing file', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/binary.bin'
      const existingContent = new Uint8Array([0x01, 0x02, 0x03])
      mockStorage.addFile(path, existingContent)

      await appendFile(mockStorage, path, new Uint8Array([0x04, 0x05]))

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new Uint8Array([0x01, 0x02, 0x03, 0x04, 0x05]))
    })

    it('should append empty Uint8Array (no change)', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/noop.bin'
      const existingContent = new Uint8Array([0x01, 0x02, 0x03])
      mockStorage.addFile(path, existingContent)

      await appendFile(mockStorage, path, new Uint8Array([]))

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(existingContent)
    })

    it('should append binary data with all byte values', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/allbytes.bin'
      const existingContent = new Uint8Array([0x00, 0x01])
      mockStorage.addFile(path, existingContent)

      const toAppend = new Uint8Array(256)
      for (let i = 0; i < 256; i++) {
        toAppend[i] = i
      }

      await appendFile(mockStorage, path, toAppend)

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content.length).toBe(258)
      expect(result?.content[0]).toBe(0x00)
      expect(result?.content[1]).toBe(0x01)
      expect(result?.content[2]).toBe(0x00)
      expect(result?.content[257]).toBe(255)
    })
  })

  describe('create new file if not exists', () => {
    it('should create new file with string data', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/newfile.txt'
      const content = 'New file content'

      await appendFile(mockStorage, path, content)

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new TextEncoder().encode(content))
    })

    it('should create new file with Uint8Array data', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/newfile.bin'
      const content = new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f]) // "Hello"

      await appendFile(mockStorage, path, content)

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(content)
    })

    it('should create new file with empty string', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/empty.txt'

      await appendFile(mockStorage, path, '')

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new Uint8Array([]))
      expect(result?.content.length).toBe(0)
    })

    it('should create new file with empty Uint8Array', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/empty.bin'

      await appendFile(mockStorage, path, new Uint8Array([]))

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content.length).toBe(0)
    })
  })

  describe('multiple appends preserve order', () => {
    it('should preserve order of multiple string appends', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/ordered.txt'

      await appendFile(mockStorage, path, 'First ')
      await appendFile(mockStorage, path, 'Second ')
      await appendFile(mockStorage, path, 'Third')

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new TextEncoder().encode('First Second Third'))
    })

    it('should preserve order of multiple binary appends', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/ordered.bin'

      await appendFile(mockStorage, path, new Uint8Array([1, 2]))
      await appendFile(mockStorage, path, new Uint8Array([3, 4]))
      await appendFile(mockStorage, path, new Uint8Array([5]))

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new Uint8Array([1, 2, 3, 4, 5]))
    })

    it('should handle mixed string and binary appends', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/mixed.txt'

      await appendFile(mockStorage, path, 'Hello')
      await appendFile(mockStorage, path, new Uint8Array([0x20])) // space
      await appendFile(mockStorage, path, 'World')

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new TextEncoder().encode('Hello World'))
    })
  })

  describe('encoding handling', () => {
    it('should append with utf-8 encoding (default)', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/utf8.txt'
      mockStorage.addFile(path, new TextEncoder().encode('Hello '))

      await appendFile(mockStorage, path, 'World', { encoding: 'utf-8' })

      const result = mockStorage.getFile(path)
      expect(result?.content).toEqual(new TextEncoder().encode('Hello World'))
    })

    it('should append with utf8 alias', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/utf8alias.txt'
      mockStorage.addFile(path, new TextEncoder().encode('Hello '))

      await appendFile(mockStorage, path, 'World', { encoding: 'utf8' })

      const result = mockStorage.getFile(path)
      expect(result?.content).toEqual(new TextEncoder().encode('Hello World'))
    })

    it('should append base64 encoded data', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/base64.bin'
      mockStorage.addFile(path, new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])) // "Hello"

      // Base64 for " World" = " V29ybGQ=" but let's use simpler "IQ==" for "!"
      await appendFile(mockStorage, path, 'IQ==', { encoding: 'base64' })

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21])) // "Hello!"
    })

    it('should append hex encoded data', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/hex.bin'
      mockStorage.addFile(path, new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f])) // "Hello"

      // Hex for "!" = "21"
      await appendFile(mockStorage, path, '21', { encoding: 'hex' })

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new Uint8Array([0x48, 0x65, 0x6c, 0x6c, 0x6f, 0x21])) // "Hello!"
    })

    it('should handle null encoding (treat as binary)', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/nullenc.txt'
      mockStorage.addFile(path, new TextEncoder().encode('Hello'))

      await appendFile(mockStorage, path, ' World', { encoding: null })

      const result = mockStorage.getFile(path)
      // With null encoding, string should be encoded as utf-8 by default behavior
      expect(result?.content).toEqual(new TextEncoder().encode('Hello World'))
    })
  })

  describe('large data append', () => {
    it('should append 1MB of data to existing file', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/large.bin'
      const existingContent = new Uint8Array([0x00])
      mockStorage.addFile(path, existingContent)

      const size = 1024 * 1024 // 1MB
      const toAppend = new Uint8Array(size)
      for (let i = 0; i < size; i++) {
        toAppend[i] = i % 256
      }

      await appendFile(mockStorage, path, toAppend)

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content.length).toBe(size + 1)
      expect(result?.content[0]).toBe(0x00) // original byte preserved
      expect(result?.content[1]).toBe(0x00) // first appended byte
      expect(result?.content[size]).toBe(255) // last appended byte
    })

    it('should append large string content', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/largetext.txt'
      mockStorage.addFile(path, new TextEncoder().encode('Start:'))

      const largeContent = 'A'.repeat(100000) // 100KB of 'A's

      await appendFile(mockStorage, path, largeContent)

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content.length).toBe(100006) // "Start:" (6) + 100000 A's
    })

    it('should handle multiple large appends', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/multilarge.bin'

      const chunk = new Uint8Array(10000)
      for (let i = 0; i < 10000; i++) {
        chunk[i] = i % 256
      }

      // Append 10 chunks
      for (let j = 0; j < 10; j++) {
        await appendFile(mockStorage, path, chunk)
      }

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content.length).toBe(100000)
    })
  })

  describe('error - EISDIR', () => {
    it('should throw EISDIR when path is a directory', async () => {
      const mockStorage = createMockStorage()
      mockStorage.addDirectory('/test/mydir')
      const path = '/test/mydir'

      await expect(appendFile(mockStorage, path, 'content'))
        .rejects.toThrow(EISDIR)
    })

    it('should throw EISDIR with correct syscall and path', async () => {
      const mockStorage = createMockStorage()
      mockStorage.addDirectory('/test/mydir')
      const path = '/test/mydir'

      try {
        await appendFile(mockStorage, path, 'content')
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

      await expect(appendFile(mockStorage, path, 'content'))
        .rejects.toThrow(EISDIR)
    })
  })

  describe('error - ENOENT', () => {
    it('should throw ENOENT when parent directory does not exist', async () => {
      const mockStorage = createMockStorage()
      const path = '/nonexistent/parent/file.txt'

      await expect(appendFile(mockStorage, path, 'content'))
        .rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT with correct syscall and path', async () => {
      const mockStorage = createMockStorage()
      const path = '/nonexistent/file.txt'

      try {
        await appendFile(mockStorage, path, 'content')
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

      await expect(appendFile(mockStorage, path, 'content'))
        .rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT when intermediate path component is a file', async () => {
      const mockStorage = createMockStorage()
      mockStorage.addFile('/test/file.txt', new Uint8Array([]))
      const path = '/test/file.txt/nested.txt'

      // This should throw ENOENT because file.txt is a file, not a directory
      await expect(appendFile(mockStorage, path, 'content'))
        .rejects.toThrow(ENOENT)
    })
  })

  describe('options - mode', () => {
    it('should create new file with default mode 0o666', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/defaultmode.txt'

      await appendFile(mockStorage, path, 'content')

      const result = mockStorage.getFile(path)
      expect(result?.metadata.mode).toBe(0o666) // Default mode for appendFile
    })

    it('should create new file with specified mode', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/custommode.txt'

      await appendFile(mockStorage, path, 'content', { mode: 0o600 })

      const result = mockStorage.getFile(path)
      expect(result?.metadata.mode).toBe(0o600)
    })

    it('should preserve existing file mode on append', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/preservemode.txt'
      mockStorage.addFile(path, new TextEncoder().encode('existing'), { mode: 0o755 })

      await appendFile(mockStorage, path, ' appended', { mode: 0o600 }) // mode option ignored for existing file

      const result = mockStorage.getFile(path)
      expect(result?.metadata.mode).toBe(0o755) // Original mode preserved
    })
  })

  describe('options - flag', () => {
    it('should use default flag "a" for append', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/defaultflag.txt'
      mockStorage.addFile(path, new TextEncoder().encode('original'))

      await appendFile(mockStorage, path, ' appended')

      const result = mockStorage.getFile(path)
      expect(result?.content).toEqual(new TextEncoder().encode('original appended'))
    })

    it('should respect explicit "a" flag', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/explicitflag.txt'
      mockStorage.addFile(path, new TextEncoder().encode('original'))

      await appendFile(mockStorage, path, ' appended', { flag: 'a' })

      const result = mockStorage.getFile(path)
      expect(result?.content).toEqual(new TextEncoder().encode('original appended'))
    })

    it('should create file with "a" flag if not exists', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/newwithflag.txt'

      await appendFile(mockStorage, path, 'content', { flag: 'a' })

      const result = mockStorage.getFile(path)
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new TextEncoder().encode('content'))
    })
  })

  describe('file metadata', () => {
    it('should set file creation time on new file', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/newfile.txt'
      const beforeTime = Date.now()

      await appendFile(mockStorage, path, 'content')

      const afterTime = Date.now()
      const result = mockStorage.getFile(path)
      expect(result?.metadata.birthtime).toBeGreaterThanOrEqual(beforeTime)
      expect(result?.metadata.birthtime).toBeLessThanOrEqual(afterTime)
    })

    it('should update modification time on append', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/updatetime.txt'
      mockStorage.addFile(path, new TextEncoder().encode('original'))
      const originalMtime = mockStorage.getFile(path)?.metadata.mtime

      // Small delay to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10))

      await appendFile(mockStorage, path, ' appended')
      const updatedMtime = mockStorage.getFile(path)?.metadata.mtime

      expect(updatedMtime).toBeGreaterThan(originalMtime!)
    })

    it('should preserve birthtime on append to existing file', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/preservebirth.txt'
      const originalBirthtime = Date.now() - 10000 // 10 seconds ago
      mockStorage.addFile(path, new TextEncoder().encode('original'), { birthtime: originalBirthtime })

      await appendFile(mockStorage, path, ' appended')

      const result = mockStorage.getFile(path)
      expect(result?.metadata.birthtime).toBe(originalBirthtime)
    })
  })

  describe('path handling', () => {
    it('should handle paths with double slashes', async () => {
      const mockStorage = createMockStorage()
      const path = '/test//file.txt'

      await appendFile(mockStorage, path, 'content')

      // Should normalize to /test/file.txt
      const result = mockStorage.getFile('/test/file.txt')
      expect(result).toBeDefined()
    })

    it('should handle paths with dots', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/./file.txt'

      await appendFile(mockStorage, path, 'content')

      // Should normalize to /test/file.txt
      const result = mockStorage.getFile('/test/file.txt')
      expect(result).toBeDefined()
    })

    it('should handle paths with parent references', async () => {
      const mockStorage = createMockStorage()
      mockStorage.addDirectory('/test/subdir')
      const path = '/test/subdir/../file.txt'

      await appendFile(mockStorage, path, 'content')

      // Should normalize to /test/file.txt
      const result = mockStorage.getFile('/test/file.txt')
      expect(result).toBeDefined()
    })

    it('should append to file in root directory', async () => {
      const mockStorage = createMockStorage()
      const path = '/rootfile.txt'

      await appendFile(mockStorage, path, 'content')

      const result = mockStorage.getFile('/rootfile.txt')
      expect(result).toBeDefined()
      expect(result?.content).toEqual(new TextEncoder().encode('content'))
    })
  })

  describe('return value', () => {
    it('should return undefined on successful append to existing file', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/existing.txt'
      mockStorage.addFile(path, new TextEncoder().encode('existing'))

      const result = await appendFile(mockStorage, path, ' appended')

      expect(result).toBeUndefined()
    })

    it('should return undefined on successful creation of new file', async () => {
      const mockStorage = createMockStorage()
      const path = '/test/newfile.txt'

      const result = await appendFile(mockStorage, path, 'content')

      expect(result).toBeUndefined()
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
          mode: metadata?.mode ?? 0o666,
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
