import { describe, it, expect } from 'vitest'
import { sha1, sha256 } from './hash'

describe('SHA-1 Hash Computation', () => {
  it('should hash empty Uint8Array to known SHA-1 value', async () => {
    const data = new Uint8Array([])
    const hash = await sha1(data)
    expect(hash).toBe('da39a3ee5e6b4b0d3255bfef95601890afd80709')
  })

  it('should hash "hello" to known SHA-1 value', async () => {
    const data = new TextEncoder().encode('hello')
    const hash = await sha1(data)
    expect(hash).toBe('aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d')
  })

  it('should hash binary data correctly', async () => {
    const data = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    const hash = await sha1(data)
    // Expected SHA-1 hash for bytes [0-9]
    expect(hash).toBe('494179714a6cd627239dfededf2de9ef994caf03')
  })

  it('should produce different hashes for different inputs', async () => {
    const data1 = new TextEncoder().encode('hello')
    const data2 = new TextEncoder().encode('world')
    const hash1 = await sha1(data1)
    const hash2 = await sha1(data2)
    expect(hash1).not.toBe(hash2)
  })

  it('should produce same hash for same inputs (deterministic)', async () => {
    const data = new TextEncoder().encode('test data')
    const hash1 = await sha1(data)
    const hash2 = await sha1(data)
    expect(hash1).toBe(hash2)
  })

  it('should produce 40-character hex string', async () => {
    const data = new TextEncoder().encode('hello')
    const hash = await sha1(data)
    expect(hash).toHaveLength(40)
    expect(hash).toMatch(/^[a-f0-9]{40}$/)
  })
})

describe('SHA-256 Hash Computation', () => {
  it('should hash empty Uint8Array to known SHA-256 value', async () => {
    const data = new Uint8Array([])
    const hash = await sha256(data)
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855')
  })

  it('should hash "hello" to known SHA-256 value', async () => {
    const data = new TextEncoder().encode('hello')
    const hash = await sha256(data)
    expect(hash).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824')
  })

  it('should hash binary data correctly', async () => {
    const data = new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    const hash = await sha256(data)
    // Expected SHA-256 hash for bytes [0-9]
    expect(hash).toBe('1f825aa2f0020ef7cf91dfa30da4668d791c5d4824fc8e41354b89ec05795ab3')
  })

  it('should produce different hashes for different inputs', async () => {
    const data1 = new TextEncoder().encode('hello')
    const data2 = new TextEncoder().encode('world')
    const hash1 = await sha256(data1)
    const hash2 = await sha256(data2)
    expect(hash1).not.toBe(hash2)
  })

  it('should produce same hash for same inputs (deterministic)', async () => {
    const data = new TextEncoder().encode('test data')
    const hash1 = await sha256(data)
    const hash2 = await sha256(data)
    expect(hash1).toBe(hash2)
  })

  it('should produce 64-character hex string', async () => {
    const data = new TextEncoder().encode('hello')
    const hash = await sha256(data)
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })
})

describe('Large Data Hashing', () => {
  it('should hash large data (>1MB) with SHA-1', async () => {
    // Create 1.5MB of data
    const size = 1.5 * 1024 * 1024
    const data = new Uint8Array(size)
    for (let i = 0; i < size; i++) {
      data[i] = i % 256
    }

    const hash = await sha1(data)
    expect(hash).toHaveLength(40)
    expect(hash).toMatch(/^[a-f0-9]{40}$/)
  })

  it('should hash large data (>1MB) with SHA-256', async () => {
    // Create 1.5MB of data
    const size = 1.5 * 1024 * 1024
    const data = new Uint8Array(size)
    for (let i = 0; i < size; i++) {
      data[i] = i % 256
    }

    const hash = await sha256(data)
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })
})

describe('Edge Cases', () => {
  it('should handle single byte with SHA-1', async () => {
    const data = new Uint8Array([42])
    const hash = await sha1(data)
    expect(hash).toHaveLength(40)
  })

  it('should handle single byte with SHA-256', async () => {
    const data = new Uint8Array([42])
    const hash = await sha256(data)
    expect(hash).toHaveLength(64)
  })

  it('should handle all-zeros data with SHA-1', async () => {
    const data = new Uint8Array(100)
    const hash = await sha1(data)
    expect(hash).toHaveLength(40)
    expect(hash).toMatch(/^[a-f0-9]{40}$/)
  })

  it('should handle all-zeros data with SHA-256', async () => {
    const data = new Uint8Array(100)
    const hash = await sha256(data)
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })

  it('should handle all-ones data with SHA-1', async () => {
    const data = new Uint8Array(100).fill(255)
    const hash = await sha1(data)
    expect(hash).toHaveLength(40)
    expect(hash).toMatch(/^[a-f0-9]{40}$/)
  })

  it('should handle all-ones data with SHA-256', async () => {
    const data = new Uint8Array(100).fill(255)
    const hash = await sha256(data)
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })
})
