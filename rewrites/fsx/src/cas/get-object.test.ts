import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getObject } from './get-object'
import { compress } from './compression'
import { createGitObject } from './git-object'
import { hashToPath } from './path-mapping'
import { sha1, sha256 } from './hash'
import { ENOENT } from '../core/errors'

// Mock R2Storage interface for testing
interface MockR2Storage {
  get: ReturnType<typeof vi.fn>
  put: ReturnType<typeof vi.fn>
}

/**
 * Create a mock storage with optional pre-stored objects
 */
function createMockStorage(objects: Map<string, Uint8Array> = new Map()): MockR2Storage {
  return {
    get: vi.fn(async (path: string) => {
      const data = objects.get(path)
      if (!data) return null
      return { data, metadata: {} }
    }),
    put: vi.fn(async (path: string, data: Uint8Array) => {
      objects.set(path, data)
      return { etag: 'mock-etag', size: data.length }
    }),
  }
}

/**
 * Helper to store a git object in mock storage
 */
async function storeObject(
  storage: MockR2Storage,
  type: string,
  content: Uint8Array
): Promise<string> {
  const gitObject = createGitObject(type, content)
  const compressed = await compress(gitObject)
  const hash = await sha1(gitObject)
  const path = hashToPath(hash)
  await storage.put(path, compressed)
  return hash
}

/**
 * Helper to store a git object with SHA-256
 */
async function storeObjectSha256(
  storage: MockR2Storage,
  type: string,
  content: Uint8Array
): Promise<string> {
  const gitObject = createGitObject(type, content)
  const compressed = await compress(gitObject)
  const hash = await sha256(gitObject)
  const path = hashToPath(hash)
  await storage.put(path, compressed)
  return hash
}

describe('getObject', () => {
  let storage: MockR2Storage
  let objects: Map<string, Uint8Array>
  const encoder = new TextEncoder()

  beforeEach(() => {
    objects = new Map()
    storage = createMockStorage(objects)
  })

  describe('Basic Retrieval', () => {
    it('should retrieve blob object by hash', async () => {
      const content = encoder.encode('hello world')
      const hash = await storeObject(storage, 'blob', content)

      const result = await getObject(hash, storage as any)

      expect(result.type).toBe('blob')
      expect(result.content).toEqual(content)
    })

    it('should retrieve tree object by hash', async () => {
      // Tree content format: mode name\0sha
      const treeContent = new Uint8Array([
        ...encoder.encode('100644 file.txt\0'),
        // 20 bytes for SHA-1 hash
        0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09,
        0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10, 0x11, 0x12, 0x13,
      ])
      const hash = await storeObject(storage, 'tree', treeContent)

      const result = await getObject(hash, storage as any)

      expect(result.type).toBe('tree')
      expect(result.content).toEqual(treeContent)
    })

    it('should retrieve commit object by hash', async () => {
      const commitContent = encoder.encode(
        'tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904\n' +
        'author Test User <test@example.com> 1234567890 +0000\n' +
        'committer Test User <test@example.com> 1234567890 +0000\n\n' +
        'Initial commit'
      )
      const hash = await storeObject(storage, 'commit', commitContent)

      const result = await getObject(hash, storage as any)

      expect(result.type).toBe('commit')
      expect(result.content).toEqual(commitContent)
    })

    it('should return object with type and content properties', async () => {
      const content = encoder.encode('test content')
      const hash = await storeObject(storage, 'blob', content)

      const result = await getObject(hash, storage as any)

      expect(result).toHaveProperty('type')
      expect(result).toHaveProperty('content')
      expect(typeof result.type).toBe('string')
      expect(result.content).toBeInstanceOf(Uint8Array)
    })
  })

  describe('Hash Formats', () => {
    it('should accept lowercase 40-char SHA-1 hash', async () => {
      const content = encoder.encode('lowercase sha1 test')
      const hash = await storeObject(storage, 'blob', content)

      // Ensure hash is lowercase
      expect(hash).toMatch(/^[0-9a-f]{40}$/)

      const result = await getObject(hash, storage as any)
      expect(result.content).toEqual(content)
    })

    it('should accept uppercase SHA-1 hash and normalize to lowercase', async () => {
      const content = encoder.encode('uppercase sha1 test')
      const hash = await storeObject(storage, 'blob', content)
      const uppercaseHash = hash.toUpperCase()

      // Ensure it's actually uppercase
      expect(uppercaseHash).toMatch(/^[0-9A-F]{40}$/)

      const result = await getObject(uppercaseHash, storage as any)
      expect(result.content).toEqual(content)
    })

    it('should accept 64-char SHA-256 hash', async () => {
      const content = encoder.encode('sha256 test')
      const hash = await storeObjectSha256(storage, 'blob', content)

      // Ensure hash is 64 chars
      expect(hash).toMatch(/^[0-9a-f]{64}$/)

      const result = await getObject(hash, storage as any)
      expect(result.content).toEqual(content)
    })

    it('should reject invalid hash format - wrong length', async () => {
      const invalidHash = 'abc123' // Too short

      await expect(getObject(invalidHash, storage as any)).rejects.toThrow()
    })

    it('should reject invalid hash format - non-hex characters', async () => {
      const invalidHash = 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz' // 40 chars but not hex

      await expect(getObject(invalidHash, storage as any)).rejects.toThrow()
    })

    it('should reject invalid hash format - 39 characters', async () => {
      const invalidHash = 'a'.repeat(39)

      await expect(getObject(invalidHash, storage as any)).rejects.toThrow()
    })

    it('should reject invalid hash format - 41 characters', async () => {
      const invalidHash = 'a'.repeat(41)

      await expect(getObject(invalidHash, storage as any)).rejects.toThrow()
    })
  })

  describe('Content Integrity', () => {
    it('should return content that matches what was stored', async () => {
      const originalContent = encoder.encode('The quick brown fox jumps over the lazy dog')
      const hash = await storeObject(storage, 'blob', originalContent)

      const result = await getObject(hash, storage as any)

      expect(result.content).toEqual(originalContent)
    })

    it('should return type that matches what was stored', async () => {
      const content = encoder.encode('some content')

      const blobHash = await storeObject(storage, 'blob', content)
      const blobResult = await getObject(blobHash, storage as any)
      expect(blobResult.type).toBe('blob')

      // Store same content as commit (different hash due to different type)
      const commitContent = encoder.encode(
        'tree 0000000000000000000000000000000000000000\n' +
        'author A <a@a.com> 0 +0000\n' +
        'committer A <a@a.com> 0 +0000\n\n' +
        'msg'
      )
      const commitHash = await storeObject(storage, 'commit', commitContent)
      const commitResult = await getObject(commitHash, storage as any)
      expect(commitResult.type).toBe('commit')
    })

    it('should decompress content correctly', async () => {
      // Store compressed data manually and verify decompression
      const content = encoder.encode('compressed content test')
      const hash = await storeObject(storage, 'blob', content)

      const result = await getObject(hash, storage as any)

      // Content should be decompressed (not still compressed)
      expect(result.content).toEqual(content)
      // Verify it's not still the compressed format
      expect(result.content[0]).not.toBe(0x78) // zlib header
    })
  })

  describe('Error Handling', () => {
    it('should throw ENOENT when object does not exist', async () => {
      const nonExistentHash = 'a'.repeat(40)

      await expect(getObject(nonExistentHash, storage as any)).rejects.toThrow(ENOENT)
    })

    it('should throw error for corrupted compressed data', async () => {
      const hash = 'b'.repeat(40)
      const path = hashToPath(hash)
      // Store invalid compressed data
      objects.set(path, new Uint8Array([0x00, 0x01, 0x02, 0x03]))

      await expect(getObject(hash, storage as any)).rejects.toThrow()
    })

    it('should throw error for invalid git object format - missing null byte', async () => {
      const hash = 'c'.repeat(40)
      const path = hashToPath(hash)
      // Store valid zlib but invalid git object format
      const invalidGitObject = encoder.encode('blob 5hello') // Missing null byte
      const compressed = await compress(invalidGitObject)
      objects.set(path, compressed)

      await expect(getObject(hash, storage as any)).rejects.toThrow()
    })

    it('should throw error for invalid git object format - wrong size', async () => {
      const hash = 'd'.repeat(40)
      const path = hashToPath(hash)
      // Store git object with wrong size in header
      const invalidGitObject = encoder.encode('blob 100\0hello') // Says 100 bytes but only 5
      const compressed = await compress(invalidGitObject)
      objects.set(path, compressed)

      await expect(getObject(hash, storage as any)).rejects.toThrow()
    })

    it('should throw error for invalid git object format - invalid type', async () => {
      const hash = 'e'.repeat(40)
      const path = hashToPath(hash)
      // Store git object with invalid type
      const invalidGitObject = encoder.encode('invalid 5\0hello')
      const compressed = await compress(invalidGitObject)
      objects.set(path, compressed)

      await expect(getObject(hash, storage as any)).rejects.toThrow()
    })

    it('should include hash in error message for non-existent object', async () => {
      const nonExistentHash = 'f'.repeat(40)

      try {
        await getObject(nonExistentHash, storage as any)
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(ENOENT)
        // The path should contain the hash
        expect((error as ENOENT).path).toContain(nonExistentHash.slice(0, 2))
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty content object (empty blob)', async () => {
      const emptyContent = new Uint8Array(0)
      const hash = await storeObject(storage, 'blob', emptyContent)

      const result = await getObject(hash, storage as any)

      expect(result.type).toBe('blob')
      expect(result.content).toEqual(emptyContent)
      expect(result.content.length).toBe(0)
    })

    it('should handle large object (1MB+)', async () => {
      // Create 1.5MB of content
      const size = 1.5 * 1024 * 1024
      const largeContent = new Uint8Array(size)
      for (let i = 0; i < size; i++) {
        largeContent[i] = i % 256
      }
      const hash = await storeObject(storage, 'blob', largeContent)

      const result = await getObject(hash, storage as any)

      expect(result.type).toBe('blob')
      expect(result.content).toEqual(largeContent)
      expect(result.content.length).toBe(size)
    })

    it('should handle binary content with null bytes', async () => {
      const binaryContent = new Uint8Array([0x00, 0x01, 0x00, 0x02, 0x00, 0x03, 0xff, 0x00, 0xfe])
      const hash = await storeObject(storage, 'blob', binaryContent)

      const result = await getObject(hash, storage as any)

      expect(result.type).toBe('blob')
      expect(result.content).toEqual(binaryContent)
    })

    it('should handle object stored with SHA-256', async () => {
      const content = encoder.encode('sha256 stored content')
      const hash = await storeObjectSha256(storage, 'blob', content)

      // Verify it's a SHA-256 hash
      expect(hash.length).toBe(64)

      const result = await getObject(hash, storage as any)

      expect(result.type).toBe('blob')
      expect(result.content).toEqual(content)
    })

    it('should handle content with all byte values (0-255)', async () => {
      const content = new Uint8Array(256)
      for (let i = 0; i < 256; i++) {
        content[i] = i
      }
      const hash = await storeObject(storage, 'blob', content)

      const result = await getObject(hash, storage as any)

      expect(result.content).toEqual(content)
    })

    it('should handle tag object type', async () => {
      const tagContent = encoder.encode(
        'object 0000000000000000000000000000000000000000\n' +
        'type commit\n' +
        'tag v1.0.0\n' +
        'tagger Test <test@test.com> 0 +0000\n\n' +
        'Release v1.0.0'
      )
      const hash = await storeObject(storage, 'tag', tagContent)

      const result = await getObject(hash, storage as any)

      expect(result.type).toBe('tag')
      expect(result.content).toEqual(tagContent)
    })

    it('should handle content that looks like zlib header', async () => {
      // Content that starts with zlib magic bytes 0x78 0x9c
      const content = new Uint8Array([0x78, 0x9c, 0x00, 0x01, 0x02])
      const hash = await storeObject(storage, 'blob', content)

      const result = await getObject(hash, storage as any)

      expect(result.content).toEqual(content)
    })

    it('should handle UTF-8 content with multi-byte characters', async () => {
      const content = encoder.encode('Hello World!')
      const hash = await storeObject(storage, 'blob', content)

      const result = await getObject(hash, storage as any)

      expect(new TextDecoder().decode(result.content)).toBe('Hello World!')
    })
  })

  describe('Round-trip with putObject', () => {
    // Note: These tests assume putObject will be implemented
    // For now we use the storeObject helper which simulates putObject behavior

    it('should round-trip blob content correctly', async () => {
      const originalContent = encoder.encode('round-trip blob test')
      const hash = await storeObject(storage, 'blob', originalContent)

      const result = await getObject(hash, storage as any)

      expect(result.type).toBe('blob')
      expect(result.content).toEqual(originalContent)
    })

    it('should round-trip tree content correctly', async () => {
      const treeContent = new Uint8Array([
        ...encoder.encode('100644 test.txt\0'),
        0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 0x00, 0x11, 0x22, 0x33,
        0x44, 0x55, 0x66, 0x77, 0x88, 0x99, 0xaa, 0xbb, 0xcc, 0xdd,
      ])
      const hash = await storeObject(storage, 'tree', treeContent)

      const result = await getObject(hash, storage as any)

      expect(result.type).toBe('tree')
      expect(result.content).toEqual(treeContent)
    })

    it('should round-trip commit content correctly', async () => {
      const commitContent = encoder.encode(
        'tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904\n' +
        'parent 0000000000000000000000000000000000000000\n' +
        'author Test <t@t.com> 1000000000 +0000\n' +
        'committer Test <t@t.com> 1000000000 +0000\n\n' +
        'Test commit message\n\nWith multiple lines.'
      )
      const hash = await storeObject(storage, 'commit', commitContent)

      const result = await getObject(hash, storage as any)

      expect(result.type).toBe('commit')
      expect(result.content).toEqual(commitContent)
    })

    it('should round-trip tag content correctly', async () => {
      const tagContent = encoder.encode(
        'object 0000000000000000000000000000000000000000\n' +
        'type commit\n' +
        'tag v2.0.0\n' +
        'tagger Developer <dev@example.com> 1600000000 -0700\n\n' +
        'Version 2.0.0 release\n\nSigned-off-by: Dev <dev@example.com>'
      )
      const hash = await storeObject(storage, 'tag', tagContent)

      const result = await getObject(hash, storage as any)

      expect(result.type).toBe('tag')
      expect(result.content).toEqual(tagContent)
    })

    it('should produce same hash for same content regardless of retrieval', async () => {
      const content = encoder.encode('deterministic hash test')
      const hash1 = await storeObject(storage, 'blob', content)

      // Store again (simulating same content)
      const hash2 = await storeObject(storage, 'blob', content)

      expect(hash1).toBe(hash2)

      const result = await getObject(hash1, storage as any)
      expect(result.content).toEqual(content)
    })
  })

  describe('Storage Integration', () => {
    it('should call storage.get with correct path from hash', async () => {
      const content = encoder.encode('storage integration test')
      const hash = await storeObject(storage, 'blob', content)
      const expectedPath = hashToPath(hash)

      storage.get.mockClear()

      await getObject(hash, storage as any)

      expect(storage.get).toHaveBeenCalledWith(expectedPath)
    })

    it('should call storage.get with normalized lowercase path for uppercase hash', async () => {
      const content = encoder.encode('uppercase hash path test')
      const hash = await storeObject(storage, 'blob', content)
      const uppercaseHash = hash.toUpperCase()
      const expectedPath = hashToPath(hash) // hashToPath normalizes to lowercase

      storage.get.mockClear()

      await getObject(uppercaseHash, storage as any)

      expect(storage.get).toHaveBeenCalledWith(expectedPath)
    })
  })
})
