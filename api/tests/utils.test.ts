/**
 * Tests for utility functions
 */

import { describe, it, expect } from 'vitest'
import { generateRequestId, safeJsonParse } from '../src/utils'

describe('generateRequestId', () => {
  it('should generate a ULID', () => {
    const id1 = generateRequestId()
    const id2 = generateRequestId()

    expect(id1).toBeDefined()
    expect(id2).toBeDefined()
    expect(id1).not.toBe(id2)
    expect(id1).toHaveLength(26)
  })

  it('should generate unique IDs', () => {
    const ids = new Set()
    for (let i = 0; i < 100; i++) {
      ids.add(generateRequestId())
    }
    expect(ids.size).toBe(100)
  })
})

describe('safeJsonParse', () => {
  it('should parse valid JSON', () => {
    const result = safeJsonParse('{"key": "value"}', {})
    expect(result).toEqual({ key: 'value' })
  })

  it('should return fallback for invalid JSON', () => {
    const fallback = { default: true }
    const result = safeJsonParse('invalid json', fallback)
    expect(result).toEqual(fallback)
  })

  it('should handle arrays', () => {
    const result = safeJsonParse('[1, 2, 3]', [])
    expect(result).toEqual([1, 2, 3])
  })

  it('should handle nested objects', () => {
    const json = '{"user": {"name": "test", "id": 123}}'
    const result = safeJsonParse(json, {})
    expect(result).toEqual({ user: { name: 'test', id: 123 } })
  })
})
