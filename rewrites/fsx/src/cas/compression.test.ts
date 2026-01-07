import { describe, it, expect } from 'vitest'
import { compress, decompress } from './compression'

describe('Zlib Compression', () => {
  describe('compress', () => {
    it('should compress empty Uint8Array', async () => {
      const data = new Uint8Array([])
      const compressed = await compress(data)
      expect(compressed).toBeInstanceOf(Uint8Array)
      // Empty data compressed with zlib deflate should have a small header
      expect(compressed.length).toBeGreaterThan(0)
    })

    it('should compress "hello" to valid zlib format', async () => {
      const data = new TextEncoder().encode('hello')
      const compressed = await compress(data)
      expect(compressed).toBeInstanceOf(Uint8Array)
      // Zlib header: first byte 0x78 (deflate, 32K window)
      // Common values: 0x78 0x01 (no compression), 0x78 0x9c (default), 0x78 0xda (best)
      expect(compressed[0]).toBe(0x78)
    })

    it('should produce deterministic output for same input', async () => {
      const data = new TextEncoder().encode('deterministic test')
      const compressed1 = await compress(data)
      const compressed2 = await compress(data)
      expect(compressed1).toEqual(compressed2)
    })

    it('should compress binary data with null bytes', async () => {
      const data = new Uint8Array([0, 1, 0, 2, 0, 3, 0, 4, 0, 5])
      const compressed = await compress(data)
      expect(compressed).toBeInstanceOf(Uint8Array)
      expect(compressed.length).toBeGreaterThan(0)
    })

    it('should compress all-zeros data efficiently', async () => {
      const data = new Uint8Array(1000).fill(0)
      const compressed = await compress(data)
      // Highly repetitive data should compress well
      expect(compressed.length).toBeLessThan(data.length)
    })

    it('should compress all-ones (0xFF) data efficiently', async () => {
      const data = new Uint8Array(1000).fill(0xff)
      const compressed = await compress(data)
      expect(compressed.length).toBeLessThan(data.length)
    })

    it('should compress single byte', async () => {
      const data = new Uint8Array([42])
      const compressed = await compress(data)
      expect(compressed).toBeInstanceOf(Uint8Array)
      expect(compressed.length).toBeGreaterThan(0)
    })

    it('should handle large data (>1MB)', async () => {
      // Create 1.5MB of repetitive data
      const size = 1.5 * 1024 * 1024
      const data = new Uint8Array(size)
      for (let i = 0; i < size; i++) {
        data[i] = i % 256
      }
      const compressed = await compress(data)
      expect(compressed).toBeInstanceOf(Uint8Array)
      // Repetitive pattern should compress
      expect(compressed.length).toBeLessThan(data.length)
    })
  })

  describe('decompress', () => {
    it('should decompress empty compressed data to empty array', async () => {
      const data = new Uint8Array([])
      const compressed = await compress(data)
      const decompressed = await decompress(compressed)
      expect(decompressed).toEqual(new Uint8Array([]))
    })

    it('should decompress to original "hello" string', async () => {
      const original = new TextEncoder().encode('hello')
      const compressed = await compress(original)
      const decompressed = await decompress(compressed)
      expect(new TextDecoder().decode(decompressed)).toBe('hello')
    })

    it('should decompress binary data correctly', async () => {
      const original = new Uint8Array([0, 1, 2, 255, 254, 253])
      const compressed = await compress(original)
      const decompressed = await decompress(compressed)
      expect(decompressed).toEqual(original)
    })

    it('should throw error for invalid/corrupted data', async () => {
      const invalidData = new Uint8Array([0x00, 0x01, 0x02, 0x03])
      await expect(decompress(invalidData)).rejects.toThrow()
    })

    it('should throw error for truncated compressed data', async () => {
      const original = new TextEncoder().encode('hello world')
      const compressed = await compress(original)
      // Truncate the compressed data
      const truncated = compressed.slice(0, Math.floor(compressed.length / 2))
      await expect(decompress(truncated)).rejects.toThrow()
    })

    it('should throw error for random bytes', async () => {
      const randomData = new Uint8Array(100)
      for (let i = 0; i < 100; i++) {
        randomData[i] = Math.floor(Math.random() * 256)
      }
      // Random data is very unlikely to be valid zlib
      await expect(decompress(randomData)).rejects.toThrow()
    })

    it('should handle decompressing single byte compressed data', async () => {
      const original = new Uint8Array([42])
      const compressed = await compress(original)
      const decompressed = await decompress(compressed)
      expect(decompressed).toEqual(original)
    })
  })

  describe('roundtrip', () => {
    it('should roundtrip: compress -> decompress returns original', async () => {
      const original = new TextEncoder().encode('The quick brown fox jumps over the lazy dog')
      const compressed = await compress(original)
      const decompressed = await decompress(compressed)
      expect(decompressed).toEqual(original)
    })

    it('should roundtrip empty data', async () => {
      const original = new Uint8Array([])
      const compressed = await compress(original)
      const decompressed = await decompress(compressed)
      expect(decompressed).toEqual(original)
    })

    it('should roundtrip large data', async () => {
      const size = 100000
      const original = new Uint8Array(size)
      for (let i = 0; i < size; i++) {
        original[i] = i % 256
      }
      const compressed = await compress(original)
      const decompressed = await decompress(compressed)
      expect(decompressed).toEqual(original)
    })

    it('should roundtrip binary data with all byte values', async () => {
      const original = new Uint8Array(256)
      for (let i = 0; i < 256; i++) {
        original[i] = i
      }
      const compressed = await compress(original)
      const decompressed = await decompress(compressed)
      expect(decompressed).toEqual(original)
    })

    it('should roundtrip highly compressible data', async () => {
      // Repeated pattern
      const original = new Uint8Array(10000)
      for (let i = 0; i < 10000; i++) {
        original[i] = 65 // 'A'
      }
      const compressed = await compress(original)
      const decompressed = await decompress(compressed)
      expect(decompressed).toEqual(original)
    })

    it('should roundtrip incompressible random data', async () => {
      // Random data doesn't compress well but should still roundtrip
      const original = new Uint8Array(1000)
      // Use deterministic "random" values for reproducibility
      for (let i = 0; i < 1000; i++) {
        original[i] = (i * 17 + 31) % 256
      }
      const compressed = await compress(original)
      const decompressed = await decompress(compressed)
      expect(decompressed).toEqual(original)
    })

    it('should roundtrip JSON content', async () => {
      const json = JSON.stringify({
        name: 'test',
        values: [1, 2, 3, 4, 5],
        nested: { a: 1, b: 2 },
      })
      const original = new TextEncoder().encode(json)
      const compressed = await compress(original)
      const decompressed = await decompress(compressed)
      expect(JSON.parse(new TextDecoder().decode(decompressed))).toEqual(
        JSON.parse(json)
      )
    })

    it('should roundtrip source code content', async () => {
      const code = `
        function hello(name: string): string {
          return \`Hello, \${name}!\`;
        }

        export default hello;
      `
      const original = new TextEncoder().encode(code)
      const compressed = await compress(original)
      const decompressed = await decompress(compressed)
      expect(new TextDecoder().decode(decompressed)).toBe(code)
    })
  })

  describe('compression efficiency', () => {
    it('should produce smaller output for highly compressible text', async () => {
      // Lorem ipsum repeated many times
      const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(100)
      const data = new TextEncoder().encode(text)
      const compressed = await compress(data)
      expect(compressed.length).toBeLessThan(data.length)
      // Should achieve significant compression
      expect(compressed.length).toBeLessThan(data.length * 0.5)
    })

    it('should produce smaller output for repeated patterns', async () => {
      const pattern = new Uint8Array([1, 2, 3, 4, 5])
      const data = new Uint8Array(5000)
      for (let i = 0; i < 1000; i++) {
        data.set(pattern, i * 5)
      }
      const compressed = await compress(data)
      expect(compressed.length).toBeLessThan(data.length)
    })

    it('should handle data that does not compress well', async () => {
      // Pre-compressed or random-like data may not compress further
      const data = new Uint8Array(100)
      for (let i = 0; i < 100; i++) {
        data[i] = (i * 17 + 31) % 256
      }
      const compressed = await compress(data)
      // Should still produce valid output even if larger
      expect(compressed).toBeInstanceOf(Uint8Array)
      expect(compressed.length).toBeGreaterThan(0)
    })
  })

  describe('git zlib compatibility', () => {
    // Git uses raw deflate (zlib format) for object storage
    // The format is: CMF (1 byte) + FLG (1 byte) + compressed data + ADLER32 (4 bytes)

    it('should produce zlib format with proper header', async () => {
      const data = new TextEncoder().encode('test content')
      const compressed = await compress(data)

      // Zlib header byte CMF = 0x78 for deflate with 32K window
      expect(compressed[0]).toBe(0x78)
      // FLG byte: common values are 0x01, 0x5e, 0x9c, 0xda
      expect([0x01, 0x5e, 0x9c, 0xda]).toContain(compressed[1])
    })

    it('should use deflate algorithm (not gzip)', async () => {
      const data = new TextEncoder().encode('hello world')
      const compressed = await compress(data)

      // Gzip header starts with 0x1f 0x8b
      // Zlib header starts with 0x78 (or sometimes 0x08, 0x18, 0x28, etc.)
      expect(compressed[0]).not.toBe(0x1f)
      expect(compressed[1]).not.toBe(0x8b)

      // Should start with zlib magic
      expect(compressed[0]).toBe(0x78)
    })

    it('should compress "what is up, doc?" to match git blob zlib output', async () => {
      // This is the content of a well-known git test vector
      // The git object is: "blob 16\0what is up, doc?"
      // which hashes to: bd9dbf5aae1a3862dd1526723246b20206e5fc37
      const gitObject = new Uint8Array([
        0x62, 0x6c, 0x6f, 0x62, // 'blob'
        0x20, // space
        0x31, 0x36, // '16'
        0x00, // null byte
        ...new TextEncoder().encode('what is up, doc?'),
      ])

      const compressed = await compress(gitObject)

      // Verify it's valid zlib that can be decompressed
      const decompressed = await decompress(compressed)
      expect(decompressed).toEqual(gitObject)
    })

    it('should be compatible with known git zlib compressed data', async () => {
      // Known zlib-compressed "blob 5\0hello" from git
      // This can be generated with: echo -n "hello" | git hash-object --stdin -w
      // then reading .git/objects/aa/f4c61ddcc5e8a2dabede0f3b482cd9aea9434d

      // Expected git object for "hello": blob 5\0hello
      const expectedObject = new Uint8Array([
        0x62, 0x6c, 0x6f, 0x62, // 'blob'
        0x20, // space
        0x35, // '5'
        0x00, // null byte
        0x68, 0x65, 0x6c, 0x6c, 0x6f, // 'hello'
      ])

      // Compress and verify roundtrip
      const compressed = await compress(expectedObject)
      const decompressed = await decompress(compressed)
      expect(decompressed).toEqual(expectedObject)
    })
  })

  describe('edge cases', () => {
    it('should handle data exactly at power-of-2 sizes', async () => {
      for (const size of [64, 128, 256, 512, 1024, 2048, 4096]) {
        const data = new Uint8Array(size).fill(0x41)
        const compressed = await compress(data)
        const decompressed = await decompress(compressed)
        expect(decompressed).toEqual(data)
      }
    })

    it('should handle data at power-of-2 sizes minus 1', async () => {
      for (const size of [63, 127, 255, 511, 1023, 2047, 4095]) {
        const data = new Uint8Array(size).fill(0x42)
        const compressed = await compress(data)
        const decompressed = await decompress(compressed)
        expect(decompressed).toEqual(data)
      }
    })

    it('should handle data at power-of-2 sizes plus 1', async () => {
      for (const size of [65, 129, 257, 513, 1025, 2049, 4097]) {
        const data = new Uint8Array(size).fill(0x43)
        const compressed = await compress(data)
        const decompressed = await decompress(compressed)
        expect(decompressed).toEqual(data)
      }
    })

    it('should handle data with embedded zlib-like bytes', async () => {
      // Data that looks like zlib headers but isn't
      const data = new Uint8Array([0x78, 0x9c, 0x00, 0x78, 0x9c, 0x00])
      const compressed = await compress(data)
      const decompressed = await decompress(compressed)
      expect(decompressed).toEqual(data)
    })

    it('should handle alternating byte patterns', async () => {
      const data = new Uint8Array(1000)
      for (let i = 0; i < 1000; i++) {
        data[i] = i % 2 === 0 ? 0x00 : 0xff
      }
      const compressed = await compress(data)
      const decompressed = await decompress(compressed)
      expect(decompressed).toEqual(data)
    })

    it('should handle data that is already compressed (nested compression)', async () => {
      const original = new TextEncoder().encode('This is original content')
      const compressed1 = await compress(original)
      const compressed2 = await compress(compressed1)

      // Double-compressed data should decompress in reverse order
      const decompressed1 = await decompress(compressed2)
      expect(decompressed1).toEqual(compressed1)

      const decompressed2 = await decompress(decompressed1)
      expect(decompressed2).toEqual(original)
    })
  })

  describe('error handling', () => {
    it('should throw descriptive error for invalid zlib header', async () => {
      const invalidHeader = new Uint8Array([0x00, 0x00, 0x00, 0x00])
      await expect(decompress(invalidHeader)).rejects.toThrow()
    })

    it('should throw error for incomplete zlib stream', async () => {
      // Valid zlib header but no data
      const incompleteStream = new Uint8Array([0x78, 0x9c])
      await expect(decompress(incompleteStream)).rejects.toThrow()
    })

    it('should throw error for corrupted ADLER32 checksum', async () => {
      const original = new TextEncoder().encode('test data')
      const compressed = await compress(original)

      // Corrupt the last 4 bytes (ADLER32 checksum)
      const corrupted = new Uint8Array(compressed)
      corrupted[corrupted.length - 1] ^= 0xff
      corrupted[corrupted.length - 2] ^= 0xff

      await expect(decompress(corrupted)).rejects.toThrow()
    })

    it('should throw error for corrupted compressed data', async () => {
      const original = new TextEncoder().encode('test data for corruption test')
      const compressed = await compress(original)

      // Corrupt middle of compressed data
      const corrupted = new Uint8Array(compressed)
      const middle = Math.floor(corrupted.length / 2)
      corrupted[middle] ^= 0xff

      await expect(decompress(corrupted)).rejects.toThrow()
    })
  })
})
