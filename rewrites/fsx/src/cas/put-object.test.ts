import { describe, it, expect, vi, beforeEach } from 'vitest'
import { putObject, ObjectStorage } from './put-object'
import { sha1 } from './hash'
import { decompress } from './compression'
import { createGitObject, parseGitObject } from './git-object'
import { hashToPath } from './path-mapping'

/**
 * Mock storage implementation for testing
 */
class MockStorage implements ObjectStorage {
  public written: Map<string, Uint8Array> = new Map()

  async write(path: string, data: Uint8Array): Promise<void> {
    this.written.set(path, data)
  }

  get(path: string): Uint8Array | undefined {
    return this.written.get(path)
  }

  clear(): void {
    this.written.clear()
  }
}

describe('putObject', () => {
  let storage: MockStorage

  beforeEach(() => {
    storage = new MockStorage()
  })

  describe('Basic Storage', () => {
    it('should store blob with string content and return 40-char hex hash', async () => {
      const content = new TextEncoder().encode('hello')
      const hash = await putObject(storage, 'blob', content)

      expect(hash).toHaveLength(40)
      expect(hash).toMatch(/^[a-f0-9]{40}$/)
    })

    it('should store blob with binary content', async () => {
      const content = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe, 0xfd])
      const hash = await putObject(storage, 'blob', content)

      expect(hash).toHaveLength(40)
      expect(hash).toMatch(/^[a-f0-9]{40}$/)
      expect(storage.written.size).toBe(1)
    })

    it('should store tree object', async () => {
      // Simple tree entry format: mode + space + filename + null + 20-byte SHA
      const treeContent = new Uint8Array([
        0x31, 0x30, 0x30, 0x36, 0x34, 0x34, // '100644'
        0x20, // space
        0x66, 0x69, 0x6c, 0x65, 0x2e, 0x74, 0x78, 0x74, // 'file.txt'
        0x00, // null byte
        // 20-byte SHA (dummy)
        ...new Uint8Array(20).fill(0xaa),
      ])
      const hash = await putObject(storage, 'tree', treeContent)

      expect(hash).toHaveLength(40)
      expect(storage.written.size).toBe(1)
    })

    it('should store commit object', async () => {
      const commitContent = new TextEncoder().encode(
        'tree 0000000000000000000000000000000000000000\n' +
          'author Test <test@test.com> 1234567890 +0000\n' +
          'committer Test <test@test.com> 1234567890 +0000\n\n' +
          'Initial commit'
      )
      const hash = await putObject(storage, 'commit', commitContent)

      expect(hash).toHaveLength(40)
      expect(storage.written.size).toBe(1)
    })

    it('should store tag object', async () => {
      const tagContent = new TextEncoder().encode(
        'object 0000000000000000000000000000000000000000\n' +
          'type commit\n' +
          'tag v1.0.0\n' +
          'tagger Test <test@test.com> 1234567890 +0000\n\n' +
          'Release v1.0.0'
      )
      const hash = await putObject(storage, 'tag', tagContent)

      expect(hash).toHaveLength(40)
      expect(storage.written.size).toBe(1)
    })
  })

  describe('Hash Verification', () => {
    it('should return same hash for same content (deterministic)', async () => {
      const content = new TextEncoder().encode('test content')

      const hash1 = await putObject(storage, 'blob', content)
      storage.clear()
      const hash2 = await putObject(storage, 'blob', content)

      expect(hash1).toBe(hash2)
    })

    it('should return different hash for different content', async () => {
      const content1 = new TextEncoder().encode('content one')
      const content2 = new TextEncoder().encode('content two')

      const hash1 = await putObject(storage, 'blob', content1)
      const hash2 = await putObject(storage, 'blob', content2)

      expect(hash1).not.toBe(hash2)
    })

    it('should match expected hash for "hello" blob', async () => {
      // Known git hash: echo -n "hello" | git hash-object --stdin
      // Git computes SHA-1 of "blob 5\0hello"
      const content = new TextEncoder().encode('hello')
      const hash = await putObject(storage, 'blob', content)

      // This is the SHA-1 of "blob 5\0hello", not just "hello"
      expect(hash).toBe('b6fc4c620b67d95f953a5c1c1230aaab5db5a1b0')
    })

    it('should match expected hash for empty blob', async () => {
      // Known git hash: git hash-object -t blob /dev/null
      // SHA-1 of "blob 0\0"
      const content = new Uint8Array([])
      const hash = await putObject(storage, 'blob', content)

      expect(hash).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391')
    })

    it('should match expected hash for "what is up, doc?" blob', async () => {
      // Known git test vector
      // SHA-1 of "blob 16\0what is up, doc?"
      const content = new TextEncoder().encode('what is up, doc?')
      const hash = await putObject(storage, 'blob', content)

      expect(hash).toBe('bd9dbf5aae1a3862dd1526723246b20206e5fc37')
    })

    it('should compute hash from git object (header + content)', async () => {
      const content = new TextEncoder().encode('test')
      const hash = await putObject(storage, 'blob', content)

      // Verify by computing expected hash ourselves
      const gitObject = createGitObject('blob', content)
      const expectedHash = await sha1(gitObject)

      expect(hash).toBe(expectedHash)
    })
  })

  describe('Git Object Format', () => {
    it('should wrap content with correct header: "blob 5\\0hello"', async () => {
      const content = new TextEncoder().encode('hello')
      await putObject(storage, 'blob', content)

      // Get the stored data and decompress it
      const storedPath = Array.from(storage.written.keys())[0]
      const compressedData = storage.get(storedPath)!
      const decompressed = await decompress(compressedData)

      // Parse the git object
      const parsed = parseGitObject(decompressed)

      expect(parsed.type).toBe('blob')
      expect(new TextDecoder().decode(parsed.content)).toBe('hello')
    })

    it('should set size in header to match actual content size', async () => {
      const content = new Uint8Array(1234).fill(0x42)
      await putObject(storage, 'blob', content)

      const storedPath = Array.from(storage.written.keys())[0]
      const compressedData = storage.get(storedPath)!
      const decompressed = await decompress(compressedData)

      // Check header manually
      const nullIndex = decompressed.indexOf(0x00)
      const header = new TextDecoder().decode(decompressed.slice(0, nullIndex))

      expect(header).toBe('blob 1234')
    })

    it('should set correct type in header for tree', async () => {
      const content = new Uint8Array([1, 2, 3, 4, 5])
      await putObject(storage, 'tree', content)

      const storedPath = Array.from(storage.written.keys())[0]
      const compressedData = storage.get(storedPath)!
      const decompressed = await decompress(compressedData)
      const parsed = parseGitObject(decompressed)

      expect(parsed.type).toBe('tree')
    })

    it('should set correct type in header for commit', async () => {
      const content = new TextEncoder().encode('commit content')
      await putObject(storage, 'commit', content)

      const storedPath = Array.from(storage.written.keys())[0]
      const compressedData = storage.get(storedPath)!
      const decompressed = await decompress(compressedData)
      const parsed = parseGitObject(decompressed)

      expect(parsed.type).toBe('commit')
    })

    it('should set correct type in header for tag', async () => {
      const content = new TextEncoder().encode('tag content')
      await putObject(storage, 'tag', content)

      const storedPath = Array.from(storage.written.keys())[0]
      const compressedData = storage.get(storedPath)!
      const decompressed = await decompress(compressedData)
      const parsed = parseGitObject(decompressed)

      expect(parsed.type).toBe('tag')
    })
  })

  describe('Storage Path', () => {
    it('should store object at objects/xx/yyyy... path', async () => {
      const content = new TextEncoder().encode('test')
      const hash = await putObject(storage, 'blob', content)

      const storedPath = Array.from(storage.written.keys())[0]

      expect(storedPath).toMatch(/^objects\/[a-f0-9]{2}\/[a-f0-9]{38}$/)
    })

    it('should use first 2 chars of hash as directory', async () => {
      const content = new TextEncoder().encode('hello')
      const hash = await putObject(storage, 'blob', content)

      const storedPath = Array.from(storage.written.keys())[0]
      const dirPart = storedPath.split('/')[1]

      expect(dirPart).toBe(hash.slice(0, 2))
    })

    it('should use remaining 38 chars of hash as filename', async () => {
      const content = new TextEncoder().encode('hello')
      const hash = await putObject(storage, 'blob', content)

      const storedPath = Array.from(storage.written.keys())[0]
      const filePart = storedPath.split('/')[2]

      expect(filePart).toBe(hash.slice(2))
    })

    it('should store at path matching hashToPath(hash)', async () => {
      const content = new TextEncoder().encode('test content')
      const hash = await putObject(storage, 'blob', content)

      const storedPath = Array.from(storage.written.keys())[0]
      const expectedPath = hashToPath(hash)

      expect(storedPath).toBe(expectedPath)
    })
  })

  describe('Compression', () => {
    it('should store compressed data (zlib format)', async () => {
      const content = new TextEncoder().encode('hello world')
      await putObject(storage, 'blob', content)

      const storedPath = Array.from(storage.written.keys())[0]
      const storedData = storage.get(storedPath)!

      // Zlib header starts with 0x78
      expect(storedData[0]).toBe(0x78)
    })

    it('should decompress to original git object', async () => {
      const content = new TextEncoder().encode('test content for compression')
      await putObject(storage, 'blob', content)

      const storedPath = Array.from(storage.written.keys())[0]
      const compressedData = storage.get(storedPath)!
      const decompressed = await decompress(compressedData)

      // Should be: "blob <size>\0<content>"
      const expectedGitObject = createGitObject('blob', content)
      expect(decompressed).toEqual(expectedGitObject)
    })

    it('should compress highly repetitive data efficiently', async () => {
      const content = new Uint8Array(10000).fill(0x41) // 10k 'A' characters
      await putObject(storage, 'blob', content)

      const storedPath = Array.from(storage.written.keys())[0]
      const compressedData = storage.get(storedPath)!

      // Git object is "blob 10000\0" + content = 11 + 10000 = 10011 bytes
      // Compressed should be much smaller
      expect(compressedData.length).toBeLessThan(1000)
    })

    it('should produce valid zlib that can be decompressed', async () => {
      const content = new Uint8Array([0, 1, 2, 3, 4, 255, 254, 253])
      await putObject(storage, 'blob', content)

      const storedPath = Array.from(storage.written.keys())[0]
      const compressedData = storage.get(storedPath)!

      // Should not throw
      const decompressed = await decompress(compressedData)
      expect(decompressed).toBeInstanceOf(Uint8Array)
    })
  })

  describe('Error Handling', () => {
    it('should throw error for invalid type', async () => {
      const content = new TextEncoder().encode('test')

      await expect(putObject(storage, 'invalid', content)).rejects.toThrow(
        /invalid.*type/i
      )
    })

    it('should throw error for empty type', async () => {
      const content = new TextEncoder().encode('test')

      await expect(putObject(storage, '', content)).rejects.toThrow(/type/i)
    })

    it('should throw error for type with spaces', async () => {
      const content = new TextEncoder().encode('test')

      await expect(putObject(storage, 'blob ', content)).rejects.toThrow(
        /invalid.*type/i
      )
    })

    it('should throw error for type with null bytes', async () => {
      const content = new TextEncoder().encode('test')

      await expect(putObject(storage, 'blob\0', content)).rejects.toThrow(
        /invalid.*type/i
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty content (0 bytes)', async () => {
      const content = new Uint8Array([])
      const hash = await putObject(storage, 'blob', content)

      expect(hash).toHaveLength(40)
      expect(storage.written.size).toBe(1)

      // Verify the stored object
      const storedPath = Array.from(storage.written.keys())[0]
      const compressedData = storage.get(storedPath)!
      const decompressed = await decompress(compressedData)
      const parsed = parseGitObject(decompressed)

      expect(parsed.type).toBe('blob')
      expect(parsed.content.length).toBe(0)
    })

    it('should handle large content (1MB+)', async () => {
      const size = 1.5 * 1024 * 1024 // 1.5MB
      const content = new Uint8Array(size)
      for (let i = 0; i < size; i++) {
        content[i] = i % 256
      }

      const hash = await putObject(storage, 'blob', content)

      expect(hash).toHaveLength(40)
      expect(storage.written.size).toBe(1)
    })

    it('should handle binary content with null bytes', async () => {
      const content = new Uint8Array([0x00, 0x00, 0x00, 0x00, 0x00])
      const hash = await putObject(storage, 'blob', content)

      expect(hash).toHaveLength(40)

      // Verify content is preserved
      const storedPath = Array.from(storage.written.keys())[0]
      const compressedData = storage.get(storedPath)!
      const decompressed = await decompress(compressedData)
      const parsed = parseGitObject(decompressed)

      expect(parsed.content).toEqual(content)
    })

    it('should handle content with all byte values (0-255)', async () => {
      const content = new Uint8Array(256)
      for (let i = 0; i < 256; i++) {
        content[i] = i
      }

      const hash = await putObject(storage, 'blob', content)

      expect(hash).toHaveLength(40)

      // Verify content is preserved
      const storedPath = Array.from(storage.written.keys())[0]
      const compressedData = storage.get(storedPath)!
      const decompressed = await decompress(compressedData)
      const parsed = parseGitObject(decompressed)

      expect(parsed.content).toEqual(content)
    })

    it('should handle content that looks like zlib header', async () => {
      // Content that starts with 0x78 (zlib magic)
      const content = new Uint8Array([0x78, 0x9c, 0x00, 0x01, 0x02])
      const hash = await putObject(storage, 'blob', content)

      expect(hash).toHaveLength(40)

      // Verify content is preserved
      const storedPath = Array.from(storage.written.keys())[0]
      const compressedData = storage.get(storedPath)!
      const decompressed = await decompress(compressedData)
      const parsed = parseGitObject(decompressed)

      expect(parsed.content).toEqual(content)
    })

    it('should handle single byte content', async () => {
      const content = new Uint8Array([42])
      const hash = await putObject(storage, 'blob', content)

      expect(hash).toHaveLength(40)

      const storedPath = Array.from(storage.written.keys())[0]
      const compressedData = storage.get(storedPath)!
      const decompressed = await decompress(compressedData)
      const parsed = parseGitObject(decompressed)

      expect(parsed.content).toEqual(content)
    })
  })

  describe('Storage Interface', () => {
    it('should call storage.write exactly once per putObject call', async () => {
      const writeSpy = vi.spyOn(storage, 'write')
      const content = new TextEncoder().encode('test')

      await putObject(storage, 'blob', content)

      expect(writeSpy).toHaveBeenCalledTimes(1)
    })

    it('should pass correct path to storage.write', async () => {
      const writeSpy = vi.spyOn(storage, 'write')
      const content = new TextEncoder().encode('hello')

      const hash = await putObject(storage, 'blob', content)

      expect(writeSpy).toHaveBeenCalledWith(
        hashToPath(hash),
        expect.any(Uint8Array)
      )
    })

    it('should pass Uint8Array to storage.write', async () => {
      const writeSpy = vi.spyOn(storage, 'write')
      const content = new TextEncoder().encode('test')

      await putObject(storage, 'blob', content)

      const [, data] = writeSpy.mock.calls[0]
      expect(data).toBeInstanceOf(Uint8Array)
    })

    it('should handle storage.write errors', async () => {
      const errorStorage: ObjectStorage = {
        async write() {
          throw new Error('Storage write failed')
        },
      }
      const content = new TextEncoder().encode('test')

      await expect(
        putObject(errorStorage, 'blob', content)
      ).rejects.toThrow('Storage write failed')
    })
  })

  describe('Idempotency', () => {
    it('should produce identical output for repeated calls with same input', async () => {
      const content = new TextEncoder().encode('test content')

      const hash1 = await putObject(storage, 'blob', content)
      const data1 = storage.get(hashToPath(hash1))!

      storage.clear()

      const hash2 = await putObject(storage, 'blob', content)
      const data2 = storage.get(hashToPath(hash2))!

      expect(hash1).toBe(hash2)
      expect(data1).toEqual(data2)
    })

    it('should overwrite if same content is stored twice', async () => {
      const content = new TextEncoder().encode('duplicate content')

      await putObject(storage, 'blob', content)
      await putObject(storage, 'blob', content)

      // Should still have only one entry (same hash = same path)
      expect(storage.written.size).toBe(1)
    })
  })

  describe('Integration with other CAS modules', () => {
    it('should produce hash that works with hashToPath', async () => {
      const content = new TextEncoder().encode('test')
      const hash = await putObject(storage, 'blob', content)

      // Should not throw
      const path = hashToPath(hash)
      expect(path).toMatch(/^objects\/[a-f0-9]{2}\/[a-f0-9]{38}$/)
    })

    it('should produce output that decompresses with decompress()', async () => {
      const content = new TextEncoder().encode('integration test')
      const hash = await putObject(storage, 'blob', content)

      const compressedData = storage.get(hashToPath(hash))!

      // Should not throw
      const decompressed = await decompress(compressedData)
      expect(decompressed.length).toBeGreaterThan(0)
    })

    it('should produce decompressed output that parses with parseGitObject()', async () => {
      const content = new TextEncoder().encode('parse test')
      await putObject(storage, 'blob', content)

      const storedPath = Array.from(storage.written.keys())[0]
      const compressedData = storage.get(storedPath)!
      const decompressed = await decompress(compressedData)

      // Should not throw
      const parsed = parseGitObject(decompressed)
      expect(parsed.type).toBe('blob')
      expect(new TextDecoder().decode(parsed.content)).toBe('parse test')
    })

    it('should produce hash matching sha1(createGitObject(type, content))', async () => {
      const content = new TextEncoder().encode('hash verification')
      const hash = await putObject(storage, 'blob', content)

      const gitObject = createGitObject('blob', content)
      const expectedHash = await sha1(gitObject)

      expect(hash).toBe(expectedHash)
    })
  })
})
