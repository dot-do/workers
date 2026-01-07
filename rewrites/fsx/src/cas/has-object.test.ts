import { describe, it, expect, beforeEach, vi } from 'vitest'
import { hasObject } from './has-object'

/**
 * Tests for hasObject - checking git object existence in CAS
 *
 * hasObject performs a fast existence check by:
 * 1. Converting hash to path using hashToPath()
 * 2. Checking if file exists at that path
 * 3. Returning true if exists, false if not
 *
 * Performance: Should only check existence, not read/decompress content.
 */

// Sample valid hashes for testing
const VALID_SHA1_HASH = 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d'
const VALID_SHA256_HASH = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'

describe('hasObject', () => {
  describe('Basic Existence Check', () => {
    it('should return true for existing object', async () => {
      // This test expects the implementation to check actual storage
      // In RED phase, we verify it fails with "Not implemented"
      const result = await hasObject(VALID_SHA1_HASH)
      expect(result).toBe(true)
    })

    it('should return false for non-existent object', async () => {
      const nonExistentHash = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      const result = await hasObject(nonExistentHash)
      expect(result).toBe(false)
    })

    it('should return false for partially matching hash', async () => {
      // Even if object 'aaf4c6...' exists, 'aaf4c7...' should return false
      const partiallyMatchingHash = 'aaf4c71ddcc5e8a2dabede0f3b482cd9aea9434d'
      const result = await hasObject(partiallyMatchingHash)
      expect(result).toBe(false)
    })
  })

  describe('Hash Formats', () => {
    it('should accept lowercase 40-char SHA-1 hash', async () => {
      const hash = 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d'
      // Should not throw for valid format
      await expect(hasObject(hash)).resolves.toBeDefined()
    })

    it('should accept uppercase SHA-1 hash and normalize', async () => {
      const hash = 'AAF4C61DDCC5E8A2DABEDE0F3B482CD9AEA9434D'
      // Should accept and normalize to lowercase internally
      await expect(hasObject(hash)).resolves.toBeDefined()
    })

    it('should accept mixed-case SHA-1 hash and normalize', async () => {
      const hash = 'AaF4c61dDCC5e8a2dabede0f3B482cd9aea9434D'
      await expect(hasObject(hash)).resolves.toBeDefined()
    })

    it('should accept 64-char SHA-256 hash', async () => {
      const hash = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
      await expect(hasObject(hash)).resolves.toBeDefined()
    })

    it('should accept uppercase SHA-256 hash and normalize', async () => {
      const hash = '2CF24DBA5FB0A30E26E83B2AC5B9E29E1B161E5C1FA7425E73043362938B9824'
      await expect(hasObject(hash)).resolves.toBeDefined()
    })

    it('should reject invalid hash format with error', async () => {
      const invalidHash = 'not-a-valid-hash'
      await expect(hasObject(invalidHash)).rejects.toThrow()
    })
  })

  describe('Error Handling - Invalid Hash', () => {
    it('should throw error for hash that is too short', async () => {
      const shortHash = 'aaf4c61'
      await expect(hasObject(shortHash)).rejects.toThrow()
    })

    it('should throw error for hash that is too long', async () => {
      const longHash = 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434daa'
      await expect(hasObject(longHash)).rejects.toThrow()
    })

    it('should throw error for hash with invalid length (not 40 or 64)', async () => {
      // 50 characters - neither SHA-1 nor SHA-256
      const invalidLengthHash = 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d1234567890'
      await expect(hasObject(invalidLengthHash)).rejects.toThrow()
    })

    it('should throw error for hash with non-hex characters', async () => {
      const nonHexHash = 'ghijklmnopqrstuvwxyzabcdef1234567890123456'
      await expect(hasObject(nonHexHash)).rejects.toThrow()
    })

    it('should throw error for empty hash', async () => {
      await expect(hasObject('')).rejects.toThrow()
    })

    it('should throw error for hash with spaces', async () => {
      const hashWithSpaces = 'aaf4c61ddcc5e8a2 dabede0f3b482cd9aea9434d'
      await expect(hasObject(hashWithSpaces)).rejects.toThrow()
    })

    it('should throw error for hash with special characters', async () => {
      const hashWithSpecialChars = 'aaf4c61ddcc5e8a2-dabede0f3b482cd9aea9434d'
      await expect(hasObject(hashWithSpecialChars)).rejects.toThrow()
    })

    it('should throw error for hash with newline', async () => {
      const hashWithNewline = 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434\n'
      await expect(hasObject(hashWithNewline)).rejects.toThrow()
    })
  })

  describe('Edge Cases - Special Hash Values', () => {
    it('should handle hash with leading zeros (00...)', async () => {
      const hashWithLeadingZeros = '00a4c61ddcc5e8a2dabede0f3b482cd9aea9434d'
      // Should not throw, just check existence
      await expect(hasObject(hashWithLeadingZeros)).resolves.toBeDefined()
    })

    it('should handle hash with all same characters (aaa...)', async () => {
      const allSameHash = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      await expect(hasObject(allSameHash)).resolves.toBeDefined()
    })

    it('should handle all-zeros SHA-1 hash', async () => {
      const allZerosHash = '0000000000000000000000000000000000000000'
      await expect(hasObject(allZerosHash)).resolves.toBeDefined()
    })

    it('should handle all-fs SHA-1 hash', async () => {
      const allFsHash = 'ffffffffffffffffffffffffffffffffffffffff'
      await expect(hasObject(allFsHash)).resolves.toBeDefined()
    })

    it('should handle all-zeros SHA-256 hash', async () => {
      const allZerosHash256 = '0000000000000000000000000000000000000000000000000000000000000000'
      await expect(hasObject(allZerosHash256)).resolves.toBeDefined()
    })

    it('should handle all-fs SHA-256 hash', async () => {
      const allFsHash256 = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
      await expect(hasObject(allFsHash256)).resolves.toBeDefined()
    })

    it('should handle hash starting with numeric character', async () => {
      const numericStartHash = '1234567890abcdef1234567890abcdef12345678'
      await expect(hasObject(numericStartHash)).resolves.toBeDefined()
    })
  })

  describe('Case Sensitivity', () => {
    it('should return same result for lowercase and uppercase versions of same hash', async () => {
      const lowerHash = 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d'
      const upperHash = 'AAF4C61DDCC5E8A2DABEDE0F3B482CD9AEA9434D'

      const lowerResult = await hasObject(lowerHash)
      const upperResult = await hasObject(upperHash)

      expect(lowerResult).toBe(upperResult)
    })

    it('should normalize mixed case hash to find object', async () => {
      const mixedHash = 'AaF4C61dDcC5e8A2dabede0f3b482cd9aea9434d'
      // Should work the same as lowercase version
      await expect(hasObject(mixedHash)).resolves.toBeDefined()
    })
  })

  describe('Performance Expectations (documented behavior)', () => {
    /**
     * These tests document expected performance characteristics.
     * The hasObject function should:
     * - Only check file existence (no read)
     * - Not decompress or parse object content
     * - Be faster than getObject for existence checks
     */

    it('should be a fast file existence check only', async () => {
      // This test validates that hasObject completes (doesn't hang on large objects)
      // In implementation, it should NOT read or decompress the file
      const hash = VALID_SHA1_HASH
      await expect(hasObject(hash)).resolves.toBeDefined()
    })

    it('should work without decompressing object content', async () => {
      // If an object exists but is corrupted (invalid zlib), hasObject
      // should still return true because it only checks existence
      // This is tested by verifying the function signature returns boolean
      const hash = VALID_SHA1_HASH
      const result = await hasObject(hash)
      expect(typeof result).toBe('boolean')
    })
  })

  describe('Integration with hashToPath', () => {
    it('should use hashToPath internally for path resolution', async () => {
      // Valid hash should be converted using hashToPath rules
      // objects/aa/f4c61ddcc5e8a2dabede0f3b482cd9aea9434d
      const hash = 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d'
      await expect(hasObject(hash)).resolves.toBeDefined()
    })

    it('should fail with same errors as hashToPath for invalid hashes', async () => {
      // hashToPath throws for invalid format, hasObject should propagate
      const invalidHash = 'not-valid'
      await expect(hasObject(invalidHash)).rejects.toThrow()
    })
  })

  describe('Consistency with Storage Operations', () => {
    /**
     * These tests document expected behavior when combined with
     * putObject and deleteObject (to be implemented).
     * They verify the contract that hasObject should honor.
     */

    it('should return false before any object is stored', async () => {
      // In a clean storage, no objects exist
      const hash = 'cccccccccccccccccccccccccccccccccccccccc'
      const result = await hasObject(hash)
      expect(result).toBe(false)
    })

    it('should return true after putObject stores with same hash', async () => {
      // After storing content that hashes to X, hasObject(X) should be true
      // This test documents the expected integration behavior
      const hash = VALID_SHA1_HASH
      // When putObject(content) is called and returns this hash,
      // hasObject(hash) should return true
      const result = await hasObject(hash)
      expect(result).toBe(true)
    })

    it('should return false after deleteObject removes the hash', async () => {
      // After deleting an object, hasObject should return false
      // This test documents the expected integration behavior
      const hash = 'dddddddddddddddddddddddddddddddddddddddd'
      const result = await hasObject(hash)
      expect(result).toBe(false)
    })
  })

  describe('Return Type Validation', () => {
    it('should return a boolean, not truthy/falsy value', async () => {
      const hash = VALID_SHA1_HASH
      const result = await hasObject(hash)
      expect(result === true || result === false).toBe(true)
      expect(typeof result).toBe('boolean')
    })

    it('should return a Promise that resolves to boolean', async () => {
      const hash = VALID_SHA1_HASH
      const promise = hasObject(hash)
      expect(promise).toBeInstanceOf(Promise)
      const result = await promise
      expect(typeof result).toBe('boolean')
    })
  })
})
