import { describe, it, expect } from 'vitest'
import { createHeader, parseHeader, createGitObject, parseGitObject } from './git-object'

describe('Git Object Format', () => {
  describe('createHeader', () => {
    it('should create header for blob type', () => {
      const header = createHeader('blob', 5)
      const expected = new Uint8Array([
        0x62, 0x6c, 0x6f, 0x62, // 'blob'
        0x20, // space
        0x35, // '5'
        0x00, // null byte
      ])
      expect(header).toEqual(expected)
    })

    it('should create header for tree type', () => {
      const header = createHeader('tree', 100)
      const expected = new Uint8Array([
        0x74, 0x72, 0x65, 0x65, // 'tree'
        0x20, // space
        0x31, 0x30, 0x30, // '100'
        0x00, // null byte
      ])
      expect(header).toEqual(expected)
    })

    it('should create header for commit type', () => {
      const header = createHeader('commit', 250)
      const expected = new Uint8Array([
        0x63, 0x6f, 0x6d, 0x6d, 0x69, 0x74, // 'commit'
        0x20, // space
        0x32, 0x35, 0x30, // '250'
        0x00, // null byte
      ])
      expect(header).toEqual(expected)
    })

    it('should create header for tag type', () => {
      const header = createHeader('tag', 42)
      const expected = new Uint8Array([
        0x74, 0x61, 0x67, // 'tag'
        0x20, // space
        0x34, 0x32, // '42'
        0x00, // null byte
      ])
      expect(header).toEqual(expected)
    })

    it('should handle size 0 (empty content)', () => {
      const header = createHeader('blob', 0)
      const expected = new Uint8Array([
        0x62, 0x6c, 0x6f, 0x62, // 'blob'
        0x20, // space
        0x30, // '0'
        0x00, // null byte
      ])
      expect(header).toEqual(expected)
    })

    it('should handle large sizes', () => {
      const header = createHeader('blob', 1234567890)
      const expected = new Uint8Array([
        0x62, 0x6c, 0x6f, 0x62, // 'blob'
        0x20, // space
        0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x30, // '1234567890'
        0x00, // null byte
      ])
      expect(header).toEqual(expected)
    })

    it('should handle very large sizes (over 4GB)', () => {
      const header = createHeader('blob', 5000000000) // 5 billion bytes
      const decoder = new TextDecoder()
      const headerStr = decoder.decode(header.slice(0, -1)) // Remove null byte for string check
      expect(headerStr).toBe('blob 5000000000')
      expect(header[header.length - 1]).toBe(0x00)
    })
  })

  describe('parseHeader', () => {
    it('should parse blob header and extract type', () => {
      const data = new Uint8Array([
        0x62, 0x6c, 0x6f, 0x62, // 'blob'
        0x20, // space
        0x35, // '5'
        0x00, // null byte
        0x68, 0x65, 0x6c, 0x6c, 0x6f, // 'hello' (content)
      ])
      const result = parseHeader(data)
      expect(result.type).toBe('blob')
    })

    it('should parse header and extract size', () => {
      const data = new Uint8Array([
        0x62, 0x6c, 0x6f, 0x62, // 'blob'
        0x20, // space
        0x35, // '5'
        0x00, // null byte
        0x68, 0x65, 0x6c, 0x6c, 0x6f, // 'hello'
      ])
      const result = parseHeader(data)
      expect(result.size).toBe(5)
    })

    it('should return correct content offset', () => {
      const data = new Uint8Array([
        0x62, 0x6c, 0x6f, 0x62, // 'blob'
        0x20, // space
        0x35, // '5'
        0x00, // null byte (index 6)
        0x68, 0x65, 0x6c, 0x6c, 0x6f, // 'hello' (starts at index 7)
      ])
      const result = parseHeader(data)
      expect(result.contentOffset).toBe(7)
    })

    it('should parse tree type correctly', () => {
      const data = new Uint8Array([
        0x74, 0x72, 0x65, 0x65, // 'tree'
        0x20, // space
        0x31, 0x30, 0x30, // '100'
        0x00, // null byte
      ])
      const result = parseHeader(data)
      expect(result.type).toBe('tree')
      expect(result.size).toBe(100)
      expect(result.contentOffset).toBe(9)
    })

    it('should parse commit type correctly', () => {
      const data = new Uint8Array([
        0x63, 0x6f, 0x6d, 0x6d, 0x69, 0x74, // 'commit'
        0x20, // space
        0x32, 0x35, 0x30, // '250'
        0x00, // null byte
      ])
      const result = parseHeader(data)
      expect(result.type).toBe('commit')
      expect(result.size).toBe(250)
      expect(result.contentOffset).toBe(11)
    })

    it('should parse tag type correctly', () => {
      const data = new Uint8Array([
        0x74, 0x61, 0x67, // 'tag'
        0x20, // space
        0x34, 0x32, // '42'
        0x00, // null byte
      ])
      const result = parseHeader(data)
      expect(result.type).toBe('tag')
      expect(result.size).toBe(42)
      expect(result.contentOffset).toBe(7)
    })

    it('should parse large sizes correctly', () => {
      const data = new Uint8Array([
        0x62, 0x6c, 0x6f, 0x62, // 'blob'
        0x20, // space
        0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x30, // '1234567890'
        0x00, // null byte
      ])
      const result = parseHeader(data)
      expect(result.size).toBe(1234567890)
    })

    it('should reject header with missing null byte', () => {
      const data = new Uint8Array([
        0x62, 0x6c, 0x6f, 0x62, // 'blob'
        0x20, // space
        0x35, // '5'
        // Missing null byte!
      ])
      expect(() => parseHeader(data)).toThrow(/null byte/i)
    })

    it('should reject header with invalid type', () => {
      const data = new Uint8Array([
        0x66, 0x6f, 0x6f, // 'foo' (invalid type)
        0x20, // space
        0x35, // '5'
        0x00, // null byte
      ])
      expect(() => parseHeader(data)).toThrow(/invalid.*type/i)
    })

    it('should reject header with negative size', () => {
      const data = new Uint8Array([
        0x62, 0x6c, 0x6f, 0x62, // 'blob'
        0x20, // space
        0x2d, 0x35, // '-5'
        0x00, // null byte
      ])
      expect(() => parseHeader(data)).toThrow(/size/i)
    })

    it('should reject header with non-numeric size', () => {
      const data = new Uint8Array([
        0x62, 0x6c, 0x6f, 0x62, // 'blob'
        0x20, // space
        0x61, 0x62, 0x63, // 'abc' (not a number)
        0x00, // null byte
      ])
      expect(() => parseHeader(data)).toThrow(/size/i)
    })

    it('should reject header with missing space separator', () => {
      const data = new Uint8Array([
        0x62, 0x6c, 0x6f, 0x62, 0x35, // 'blob5' (no space)
        0x00, // null byte
      ])
      expect(() => parseHeader(data)).toThrow()
    })

    it('should handle empty data', () => {
      const data = new Uint8Array([])
      expect(() => parseHeader(data)).toThrow()
    })
  })

  describe('createGitObject', () => {
    it('should create full git object with header and content', () => {
      const content = new TextEncoder().encode('hello')
      const object = createGitObject('blob', content)

      // Should be: "blob 5\0hello"
      const expected = new Uint8Array([
        0x62, 0x6c, 0x6f, 0x62, // 'blob'
        0x20, // space
        0x35, // '5'
        0x00, // null byte
        0x68, 0x65, 0x6c, 0x6c, 0x6f, // 'hello'
      ])
      expect(object).toEqual(expected)
    })

    it('should create git object with empty content', () => {
      const content = new Uint8Array([])
      const object = createGitObject('blob', content)

      // Should be: "blob 0\0"
      const expected = new Uint8Array([
        0x62, 0x6c, 0x6f, 0x62, // 'blob'
        0x20, // space
        0x30, // '0'
        0x00, // null byte
      ])
      expect(object).toEqual(expected)
    })

    it('should create git object for tree type', () => {
      const content = new Uint8Array([1, 2, 3, 4, 5])
      const object = createGitObject('tree', content)

      // Header should be: "tree 5\0"
      expect(object[0]).toBe(0x74) // 't'
      expect(object[1]).toBe(0x72) // 'r'
      expect(object[2]).toBe(0x65) // 'e'
      expect(object[3]).toBe(0x65) // 'e'
      expect(object[4]).toBe(0x20) // space
      expect(object[5]).toBe(0x35) // '5'
      expect(object[6]).toBe(0x00) // null byte
      expect(object.slice(7)).toEqual(content)
    })

    it('should verify SHA-1 hash matches git test vector', async () => {
      // Git test vector: "what is up, doc?" as blob
      const content = new TextEncoder().encode('what is up, doc?')
      const object = createGitObject('blob', content)

      // Compute SHA-1 using Web Crypto API
      const hashBuffer = await crypto.subtle.digest('SHA-1', object)
      const hashArray = new Uint8Array(hashBuffer)
      const hashHex = Array.from(hashArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      // Known git hash for "what is up, doc?" blob
      expect(hashHex).toBe('bd9dbf5aae1a3862dd1526723246b20206e5fc37')
    })

    it('should verify SHA-1 hash for empty blob', async () => {
      const content = new Uint8Array([])
      const object = createGitObject('blob', content)

      const hashBuffer = await crypto.subtle.digest('SHA-1', object)
      const hashArray = new Uint8Array(hashBuffer)
      const hashHex = Array.from(hashArray)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      // Known git hash for empty blob
      expect(hashHex).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391')
    })

    it('should handle large content', () => {
      const content = new Uint8Array(10000).fill(0x61) // 10k 'a' characters
      const object = createGitObject('blob', content)

      // Verify header
      const headerEnd = object.indexOf(0x00)
      const header = new TextDecoder().decode(object.slice(0, headerEnd))
      expect(header).toBe('blob 10000')

      // Verify content follows header
      expect(object.length).toBe(headerEnd + 1 + 10000)
      expect(object.slice(headerEnd + 1)).toEqual(content)
    })
  })

  describe('parseGitObject', () => {
    it('should parse full object and return type', () => {
      const data = new Uint8Array([
        0x62, 0x6c, 0x6f, 0x62, // 'blob'
        0x20, // space
        0x35, // '5'
        0x00, // null byte
        0x68, 0x65, 0x6c, 0x6c, 0x6f, // 'hello'
      ])
      const result = parseGitObject(data)
      expect(result.type).toBe('blob')
    })

    it('should parse full object and return content', () => {
      const data = new Uint8Array([
        0x62, 0x6c, 0x6f, 0x62, // 'blob'
        0x20, // space
        0x35, // '5'
        0x00, // null byte
        0x68, 0x65, 0x6c, 0x6c, 0x6f, // 'hello'
      ])
      const result = parseGitObject(data)
      const contentStr = new TextDecoder().decode(result.content)
      expect(contentStr).toBe('hello')
    })

    it('should handle empty content', () => {
      const data = new Uint8Array([
        0x62, 0x6c, 0x6f, 0x62, // 'blob'
        0x20, // space
        0x30, // '0'
        0x00, // null byte
      ])
      const result = parseGitObject(data)
      expect(result.type).toBe('blob')
      expect(result.content).toEqual(new Uint8Array([]))
    })

    it('should handle large content', () => {
      const largeContent = new Uint8Array(10000).fill(0x61)
      const header = new TextEncoder().encode('blob 10000\0')
      const data = new Uint8Array(header.length + largeContent.length)
      data.set(header)
      data.set(largeContent, header.length)

      const result = parseGitObject(data)
      expect(result.type).toBe('blob')
      expect(result.content.length).toBe(10000)
      expect(result.content).toEqual(largeContent)
    })

    it('should parse tree object', () => {
      const content = new Uint8Array([1, 2, 3, 4, 5])
      const header = new TextEncoder().encode('tree 5\0')
      const data = new Uint8Array(header.length + content.length)
      data.set(header)
      data.set(content, header.length)

      const result = parseGitObject(data)
      expect(result.type).toBe('tree')
      expect(result.content).toEqual(content)
    })

    it('should parse commit object', () => {
      const content = new TextEncoder().encode('tree abc123\nauthor...')
      const header = new TextEncoder().encode(`commit ${content.length}\0`)
      const data = new Uint8Array(header.length + content.length)
      data.set(header)
      data.set(content, header.length)

      const result = parseGitObject(data)
      expect(result.type).toBe('commit')
      expect(new TextDecoder().decode(result.content)).toBe('tree abc123\nauthor...')
    })

    it('should verify content length matches header size', () => {
      // Header says 5 bytes, but only 3 bytes provided
      const data = new Uint8Array([
        0x62, 0x6c, 0x6f, 0x62, // 'blob'
        0x20, // space
        0x35, // '5'
        0x00, // null byte
        0x68, 0x65, 0x6c, // 'hel' (only 3 bytes)
      ])
      expect(() => parseGitObject(data)).toThrow(/size mismatch/i)
    })

    it('should verify content length does not exceed header size', () => {
      // Header says 5 bytes, but 7 bytes provided
      const data = new Uint8Array([
        0x62, 0x6c, 0x6f, 0x62, // 'blob'
        0x20, // space
        0x35, // '5'
        0x00, // null byte
        0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x21, 0x21, // 'hello!!' (7 bytes)
      ])
      expect(() => parseGitObject(data)).toThrow(/size mismatch/i)
    })

    it('should handle binary content correctly', () => {
      const content = new Uint8Array([0x00, 0x01, 0x02, 0xff, 0xfe])
      const header = new TextEncoder().encode('blob 5\0')
      const data = new Uint8Array(header.length + content.length)
      data.set(header)
      data.set(content, header.length)

      const result = parseGitObject(data)
      expect(result.content).toEqual(content)
    })
  })

  describe('roundtrip', () => {
    it('should roundtrip: create then parse returns same data', () => {
      const originalContent = new TextEncoder().encode('test content')
      const object = createGitObject('blob', originalContent)
      const parsed = parseGitObject(object)

      expect(parsed.type).toBe('blob')
      expect(parsed.content).toEqual(originalContent)
    })

    it('should roundtrip with empty content', () => {
      const originalContent = new Uint8Array([])
      const object = createGitObject('blob', originalContent)
      const parsed = parseGitObject(object)

      expect(parsed.type).toBe('blob')
      expect(parsed.content).toEqual(originalContent)
    })

    it('should roundtrip with large content', () => {
      const originalContent = new Uint8Array(50000).fill(0x42)
      const object = createGitObject('blob', originalContent)
      const parsed = parseGitObject(object)

      expect(parsed.type).toBe('blob')
      expect(parsed.content).toEqual(originalContent)
    })

    it('should roundtrip with binary content', () => {
      const originalContent = new Uint8Array(256)
      for (let i = 0; i < 256; i++) {
        originalContent[i] = i
      }
      const object = createGitObject('blob', originalContent)
      const parsed = parseGitObject(object)

      expect(parsed.type).toBe('blob')
      expect(parsed.content).toEqual(originalContent)
    })

    it('should roundtrip for all object types', () => {
      const types: Array<'blob' | 'tree' | 'commit' | 'tag'> = ['blob', 'tree', 'commit', 'tag']
      const content = new TextEncoder().encode('test')

      for (const type of types) {
        const object = createGitObject(type, content)
        const parsed = parseGitObject(object)
        expect(parsed.type).toBe(type)
        expect(parsed.content).toEqual(content)
      }
    })
  })
})
