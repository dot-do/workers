/**
 * Encryption Utilities Tests - Phase 7 Universal API
 *
 * Comprehensive tests for encryption/decryption functions.
 */

import { describe, it, expect } from 'vitest'
import {
  deriveKey,
  encryptToken,
  decryptToken,
  encryptTokenWithSecret,
  decryptTokenWithSecret,
} from '../src/encryption'

describe('Encryption Utilities', () => {
  const testSecret = 'test-secret-key-for-encryption-12345'
  const testToken = 'access_token_abc123xyz456'
  const longToken = 'a'.repeat(1000) // Test with longer string

  describe('deriveKey', () => {
    it('should derive a CryptoKey from a secret', async () => {
      const key = await deriveKey(testSecret)

      expect(key).toBeDefined()
      expect(key.type).toBe('secret')
      expect(key.algorithm.name).toBe('AES-GCM')
    })

    it('should derive the same key from the same secret', async () => {
      const key1 = await deriveKey(testSecret)
      const key2 = await deriveKey(testSecret)

      // Keys are objects, but should have same properties
      expect(key1.type).toBe(key2.type)
      expect(key1.algorithm.name).toBe(key2.algorithm.name)
    })

    it('should derive different keys from different secrets', async () => {
      const key1 = await deriveKey('secret1')
      const key2 = await deriveKey('secret2')

      // Both should be valid keys but different
      expect(key1).toBeDefined()
      expect(key2).toBeDefined()
      expect(key1).not.toBe(key2)
    })
  })

  describe('encryptToken', () => {
    it('should encrypt a token and return base64 string', async () => {
      const key = await deriveKey(testSecret)
      const encrypted = await encryptToken(testToken, key)

      expect(encrypted).toBeDefined()
      expect(typeof encrypted).toBe('string')
      expect(encrypted.length).toBeGreaterThan(0)

      // Should be base64 encoded
      expect(() => atob(encrypted)).not.toThrow()
    })

    it('should produce different ciphertexts for same token (due to random IV)', async () => {
      const key = await deriveKey(testSecret)
      const encrypted1 = await encryptToken(testToken, key)
      const encrypted2 = await encryptToken(testToken, key)

      // Should be different due to random IV
      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should encrypt empty string', async () => {
      const key = await deriveKey(testSecret)
      const encrypted = await encryptToken('', key)

      expect(encrypted).toBeDefined()
      expect(typeof encrypted).toBe('string')
    })

    it('should encrypt long token', async () => {
      const key = await deriveKey(testSecret)
      const encrypted = await encryptToken(longToken, key)

      expect(encrypted).toBeDefined()
      expect(typeof encrypted).toBe('string')
    })
  })

  describe('decryptToken', () => {
    it('should decrypt an encrypted token back to original', async () => {
      const key = await deriveKey(testSecret)
      const encrypted = await encryptToken(testToken, key)
      const decrypted = await decryptToken(encrypted, key)

      expect(decrypted).toBe(testToken)
    })

    it('should decrypt empty string', async () => {
      const key = await deriveKey(testSecret)
      const encrypted = await encryptToken('', key)
      const decrypted = await decryptToken(encrypted, key)

      expect(decrypted).toBe('')
    })

    it('should decrypt long token', async () => {
      const key = await deriveKey(testSecret)
      const encrypted = await encryptToken(longToken, key)
      const decrypted = await decryptToken(encrypted, key)

      expect(decrypted).toBe(longToken)
    })

    it('should throw error with wrong key', async () => {
      const key1 = await deriveKey('secret1')
      const key2 = await deriveKey('secret2')

      const encrypted = await encryptToken(testToken, key1)

      await expect(decryptToken(encrypted, key2)).rejects.toThrow()
    })

    it('should throw error with corrupted ciphertext', async () => {
      const key = await deriveKey(testSecret)
      const encrypted = await encryptToken(testToken, key)

      // Corrupt the ciphertext
      const corrupted = encrypted.slice(0, -5) + 'xxxxx'

      await expect(decryptToken(corrupted, key)).rejects.toThrow()
    })

    it('should throw error with invalid base64', async () => {
      const key = await deriveKey(testSecret)

      await expect(decryptToken('not-valid-base64!!!', key)).rejects.toThrow()
    })
  })

  describe('encryptTokenWithSecret', () => {
    it('should encrypt token with secret string', async () => {
      const encrypted = await encryptTokenWithSecret(testToken, testSecret)

      expect(encrypted).toBeDefined()
      expect(typeof encrypted).toBe('string')
      expect(encrypted.length).toBeGreaterThan(0)
    })

    it('should produce different ciphertexts for same inputs (due to random IV)', async () => {
      const encrypted1 = await encryptTokenWithSecret(testToken, testSecret)
      const encrypted2 = await encryptTokenWithSecret(testToken, testSecret)

      expect(encrypted1).not.toBe(encrypted2)
    })
  })

  describe('decryptTokenWithSecret', () => {
    it('should decrypt encrypted token with same secret', async () => {
      const encrypted = await encryptTokenWithSecret(testToken, testSecret)
      const decrypted = await decryptTokenWithSecret(encrypted, testSecret)

      expect(decrypted).toBe(testToken)
    })

    it('should throw error with wrong secret', async () => {
      const encrypted = await encryptTokenWithSecret(testToken, 'secret1')

      await expect(decryptTokenWithSecret(encrypted, 'secret2')).rejects.toThrow()
    })
  })

  describe('Round-trip tests', () => {
    it('should handle multiple encrypt/decrypt cycles', async () => {
      let current = testToken

      // Encrypt 5 times
      const key = await deriveKey(testSecret)
      for (let i = 0; i < 5; i++) {
        current = await encryptToken(current, key)
      }

      // Decrypt 5 times
      for (let i = 0; i < 5; i++) {
        current = await decryptToken(current, key)
      }

      expect(current).toBe(testToken)
    })

    it('should handle special characters', async () => {
      const specialToken = 'token_with_!@#$%^&*()_+-={}[]|:";\'<>?,./~`'
      const key = await deriveKey(testSecret)

      const encrypted = await encryptToken(specialToken, key)
      const decrypted = await decryptToken(encrypted, key)

      expect(decrypted).toBe(specialToken)
    })

    it('should handle unicode characters', async () => {
      const unicodeToken = 'token_with_emoji_🚀_and_kanji_日本語'
      const key = await deriveKey(testSecret)

      const encrypted = await encryptToken(unicodeToken, key)
      const decrypted = await decryptToken(encrypted, key)

      expect(decrypted).toBe(unicodeToken)
    })

    it('should handle newlines and whitespace', async () => {
      const whitespaceToken = 'token\\nwith\\nnewlines\\tand\\ttabs   and   spaces'
      const key = await deriveKey(testSecret)

      const encrypted = await encryptToken(whitespaceToken, key)
      const decrypted = await decryptToken(encrypted, key)

      expect(decrypted).toBe(whitespaceToken)
    })
  })

  describe('Security properties', () => {
    it('should use different IVs for each encryption', async () => {
      const key = await deriveKey(testSecret)

      // Encrypt same token multiple times
      const encrypted1 = await encryptToken(testToken, key)
      const encrypted2 = await encryptToken(testToken, key)
      const encrypted3 = await encryptToken(testToken, key)

      // All should be different
      expect(encrypted1).not.toBe(encrypted2)
      expect(encrypted2).not.toBe(encrypted3)
      expect(encrypted1).not.toBe(encrypted3)

      // But all should decrypt to same value
      expect(await decryptToken(encrypted1, key)).toBe(testToken)
      expect(await decryptToken(encrypted2, key)).toBe(testToken)
      expect(await decryptToken(encrypted3, key)).toBe(testToken)
    })

    it('should be deterministic for key derivation', async () => {
      // Same secret should always produce keys that work together
      const key1a = await deriveKey(testSecret)
      const key1b = await deriveKey(testSecret)

      const encrypted = await encryptToken(testToken, key1a)
      const decrypted = await decryptToken(encrypted, key1b)

      expect(decrypted).toBe(testToken)
    })
  })
})
