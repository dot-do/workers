import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { readFile, setStorage, type ReadFileStorage } from './readFile'
import { ENOENT, EISDIR } from '../core/errors'

/**
 * Tests for fs.readFile operation
 *
 * These tests follow Node.js fs.readFile semantics:
 * - Returns string when encoding specified (or default utf-8)
 * - Returns Uint8Array when no encoding specified
 * - Throws ENOENT for non-existent files
 * - Throws EISDIR when path is a directory
 */

describe('readFile', () => {
  // Mock filesystem state for testing
  // The implementation will need to integrate with actual storage
  let mockFs: Map<string, { content: Uint8Array; isDirectory: boolean }>

  beforeEach(() => {
    mockFs = new Map()
    // Setup test fixtures
    mockFs.set('/test/hello.txt', {
      content: new TextEncoder().encode('Hello, World!'),
      isDirectory: false,
    })
    mockFs.set('/test/empty.txt', {
      content: new Uint8Array(0),
      isDirectory: false,
    })
    mockFs.set('/test/unicode.txt', {
      content: new TextEncoder().encode('Hello, \u4e16\u754c! \u{1F600}'),
      isDirectory: false,
    })
    mockFs.set('/test/binary.bin', {
      content: new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]),
      isDirectory: false,
    })
    mockFs.set('/test/mydir', {
      content: new Uint8Array(0),
      isDirectory: true,
    })

    // Create storage adapter from Map
    const storage: ReadFileStorage = {
      get: (path: string) => mockFs.get(path),
      has: (path: string) => mockFs.has(path),
    }
    setStorage(storage)
  })

  afterEach(() => {
    setStorage(null)
  })

  describe('happy path - string output', () => {
    it('should read file as string with default encoding (utf-8)', async () => {
      const content = await readFile('/test/hello.txt')
      expect(content).toBe('Hello, World!')
      expect(typeof content).toBe('string')
    })

    it('should read file as string with explicit utf-8 encoding', async () => {
      const content = await readFile('/test/hello.txt', { encoding: 'utf-8' })
      expect(content).toBe('Hello, World!')
      expect(typeof content).toBe('string')
    })

    it('should read file as string with utf8 encoding (alias)', async () => {
      const content = await readFile('/test/hello.txt', { encoding: 'utf8' })
      expect(content).toBe('Hello, World!')
      expect(typeof content).toBe('string')
    })

    it('should read file with unicode content correctly', async () => {
      const content = await readFile('/test/unicode.txt', { encoding: 'utf-8' })
      expect(content).toBe('Hello, \u4e16\u754c! \u{1F600}')
    })

    it('should accept encoding as string shorthand', async () => {
      const content = await readFile('/test/hello.txt', 'utf-8')
      expect(content).toBe('Hello, World!')
      expect(typeof content).toBe('string')
    })
  })

  describe('happy path - Uint8Array output', () => {
    it('should read file as Uint8Array when encoding is null', async () => {
      const content = await readFile('/test/hello.txt', { encoding: null })
      expect(content).toBeInstanceOf(Uint8Array)
      expect(content).toEqual(new TextEncoder().encode('Hello, World!'))
    })

    it('should read binary file as Uint8Array', async () => {
      const content = await readFile('/test/binary.bin', { encoding: null })
      expect(content).toBeInstanceOf(Uint8Array)
      expect(content).toEqual(new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd]))
    })

    it('should preserve binary data exactly', async () => {
      const content = await readFile('/test/binary.bin', { encoding: null }) as Uint8Array
      expect(content[0]).toBe(0x00)
      expect(content[3]).toBe(0xff)
      expect(content.length).toBe(6)
    })
  })

  describe('explicit encoding options', () => {
    it('should read file with base64 encoding', async () => {
      const content = await readFile('/test/hello.txt', { encoding: 'base64' })
      expect(typeof content).toBe('string')
      // Base64 of 'Hello, World!' is 'SGVsbG8sIFdvcmxkIQ=='
      expect(content).toBe('SGVsbG8sIFdvcmxkIQ==')
    })

    it('should read file with hex encoding', async () => {
      const content = await readFile('/test/binary.bin', { encoding: 'hex' })
      expect(typeof content).toBe('string')
      expect(content).toBe('000102fffefd')
    })

    it('should read file with ascii encoding', async () => {
      const content = await readFile('/test/hello.txt', { encoding: 'ascii' })
      expect(typeof content).toBe('string')
      expect(content).toBe('Hello, World!')
    })

    it('should read file with latin1 encoding', async () => {
      const content = await readFile('/test/hello.txt', { encoding: 'latin1' })
      expect(typeof content).toBe('string')
      expect(content).toBe('Hello, World!')
    })

    it('should read file with binary encoding (alias for latin1)', async () => {
      const content = await readFile('/test/hello.txt', { encoding: 'binary' })
      expect(typeof content).toBe('string')
      expect(content).toBe('Hello, World!')
    })
  })

  describe('error handling - ENOENT', () => {
    it('should throw ENOENT when file does not exist', async () => {
      await expect(readFile('/nonexistent/file.txt')).rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT with correct path in error', async () => {
      try {
        await readFile('/nonexistent/file.txt')
        expect.fail('Should have thrown ENOENT')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOENT)
        expect((error as ENOENT).path).toBe('/nonexistent/file.txt')
        expect((error as ENOENT).syscall).toBe('open')
      }
    })

    it('should throw ENOENT for nested nonexistent path', async () => {
      await expect(readFile('/a/b/c/d/e/file.txt')).rejects.toThrow(ENOENT)
    })

    it('should throw ENOENT with correct error code', async () => {
      try {
        await readFile('/nonexistent.txt')
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as ENOENT).code).toBe('ENOENT')
        expect((error as ENOENT).errno).toBe(-2)
      }
    })
  })

  describe('error handling - EISDIR', () => {
    it('should throw EISDIR when path is a directory', async () => {
      await expect(readFile('/test/mydir')).rejects.toThrow(EISDIR)
    })

    it('should throw EISDIR with correct path in error', async () => {
      try {
        await readFile('/test/mydir')
        expect.fail('Should have thrown EISDIR')
      } catch (error) {
        expect(error).toBeInstanceOf(EISDIR)
        expect((error as EISDIR).path).toBe('/test/mydir')
        expect((error as EISDIR).syscall).toBe('read')
      }
    })

    it('should throw EISDIR with correct error code', async () => {
      try {
        await readFile('/test/mydir')
        expect.fail('Should have thrown')
      } catch (error) {
        expect((error as EISDIR).code).toBe('EISDIR')
        expect((error as EISDIR).errno).toBe(-21)
      }
    })
  })

  describe('empty file', () => {
    it('should read empty file as empty string', async () => {
      const content = await readFile('/test/empty.txt')
      expect(content).toBe('')
      expect(typeof content).toBe('string')
    })

    it('should read empty file as empty Uint8Array', async () => {
      const content = await readFile('/test/empty.txt', { encoding: null })
      expect(content).toBeInstanceOf(Uint8Array)
      expect((content as Uint8Array).length).toBe(0)
    })

    it('should read empty file with base64 encoding as empty string', async () => {
      const content = await readFile('/test/empty.txt', { encoding: 'base64' })
      expect(content).toBe('')
    })
  })

  describe('large file', () => {
    beforeEach(() => {
      // Create a 1MB test file
      const largeContent = new Uint8Array(1024 * 1024)
      for (let i = 0; i < largeContent.length; i++) {
        largeContent[i] = i % 256
      }
      mockFs.set('/test/large.bin', {
        content: largeContent,
        isDirectory: false,
      })

      // Create a large text file (100KB of repeated text)
      const textContent = 'The quick brown fox jumps over the lazy dog. '.repeat(2500)
      mockFs.set('/test/large.txt', {
        content: new TextEncoder().encode(textContent),
        isDirectory: false,
      })
    })

    it('should read large binary file (1MB)', async () => {
      const content = await readFile('/test/large.bin', { encoding: null }) as Uint8Array
      expect(content.length).toBe(1024 * 1024)
      // Verify some bytes at different positions
      expect(content[0]).toBe(0)
      expect(content[255]).toBe(255)
      expect(content[256]).toBe(0)
      expect(content[1024 * 512]).toBe(0) // Midpoint
    })

    it('should read large text file (100KB)', async () => {
      const content = await readFile('/test/large.txt', { encoding: 'utf-8' })
      expect(typeof content).toBe('string')
      expect(content.length).toBeGreaterThan(100000)
      expect(content.startsWith('The quick brown fox')).toBe(true)
    })

    it('should handle large file base64 encoding', async () => {
      const content = await readFile('/test/large.bin', { encoding: 'base64' })
      expect(typeof content).toBe('string')
      // Base64 increases size by ~33%
      expect(content.length).toBeGreaterThan(1024 * 1024)
    })
  })

  describe('path normalization', () => {
    it('should handle paths with trailing slashes', async () => {
      // Trailing slash should be stripped for files
      await expect(readFile('/test/hello.txt/')).rejects.toThrow(ENOENT)
    })

    it('should handle paths with double slashes', async () => {
      const content = await readFile('/test//hello.txt')
      expect(content).toBe('Hello, World!')
    })

    it('should handle paths with . components', async () => {
      const content = await readFile('/test/./hello.txt')
      expect(content).toBe('Hello, World!')
    })

    it('should handle paths with .. components', async () => {
      const content = await readFile('/test/subdir/../hello.txt')
      expect(content).toBe('Hello, World!')
    })

    it('should reject relative paths', async () => {
      await expect(readFile('test/hello.txt')).rejects.toThrow()
    })
  })

  describe('options object variations', () => {
    it('should accept flag option (for compatibility)', async () => {
      const content = await readFile('/test/hello.txt', { flag: 'r' })
      expect(content).toBe('Hello, World!')
    })

    it('should accept signal option for AbortController', async () => {
      const controller = new AbortController()
      const content = await readFile('/test/hello.txt', { signal: controller.signal })
      expect(content).toBe('Hello, World!')
    })

    it('should abort read when signal is aborted', async () => {
      const controller = new AbortController()
      controller.abort()
      await expect(
        readFile('/test/hello.txt', { signal: controller.signal })
      ).rejects.toThrow()
    })
  })

  describe('type safety', () => {
    it('should return string type when encoding is specified', async () => {
      const content: string = await readFile('/test/hello.txt', { encoding: 'utf-8' })
      expect(content).toBe('Hello, World!')
    })

    it('should return Uint8Array type when encoding is null', async () => {
      const content: Uint8Array = await readFile('/test/hello.txt', { encoding: null })
      expect(content).toBeInstanceOf(Uint8Array)
    })
  })
})
