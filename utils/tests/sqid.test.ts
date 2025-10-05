import { describe, it, expect } from 'vitest'
import {
  ulidToSqid,
  sqidToUlid,
  extractTimestampFromSquid,
  extractTimestampFromUlid,
  createSquidWithTimestamp,
  createUlidWithTimestamp,
  isValidSquid,
} from '../sqid.js'
import { isValid as isValidUlid } from 'ulid'

describe('Squid ID System', () => {
  describe('ULID ↔ Squid Conversion', () => {
    it('should convert ULID to Squid', () => {
      const ulid = '01JBXTG8EZRQ5X9V1N2K7P3M4J'
      const squid = ulidToSqid(ulid)

      expect(squid).toBeTruthy()
      expect(typeof squid).toBe('string')
      expect(squid.length).toBeGreaterThan(0)
    })

    it('should convert Squid back to ULID', () => {
      const originalUlid = '01JBXTG8EZRQ5X9V1N2K7P3M4J'
      const squid = ulidToSqid(originalUlid)
      const convertedUlid = sqidToUlid(squid)

      expect(convertedUlid).toBe(originalUlid)
      expect(isValidUlid(convertedUlid)).toBe(true)
    })

    it('should throw error for invalid ULID', () => {
      expect(() => ulidToSqid('invalid-ulid')).toThrow('Invalid ULID')
    })

    it('should throw error for invalid Squid', () => {
      expect(() => sqidToUlid('invalid-squid')).toThrow('Bad Sqid')
    })

    it('should handle roundtrip conversion correctly', () => {
      const ulid1 = '01JBXTG8EZRQ5X9V1N2K7P3M4J'
      const ulid2 = '01JBXTG8EZRQ5X9V1N2K7P3M4K'

      const squid1 = ulidToSqid(ulid1)
      const squid2 = ulidToSqid(ulid2)

      // Different ULIDs should produce different Squids
      expect(squid1).not.toBe(squid2)

      // Roundtrip should preserve original
      expect(sqidToUlid(squid1)).toBe(ulid1)
      expect(sqidToUlid(squid2)).toBe(ulid2)
    })
  })

  describe('Timestamp Extraction', () => {
    it('should extract timestamp from Squid', () => {
      const timestamp = Date.now()
      const squid = createSquidWithTimestamp(timestamp)

      const extracted = extractTimestampFromSquid(squid)
      expect(extracted).toBe(timestamp)
    })

    it('should extract timestamp from ULID', () => {
      const timestamp = Date.now()
      const ulid = createUlidWithTimestamp(timestamp)

      const extracted = extractTimestampFromUlid(ulid)
      expect(extracted).toBe(timestamp)
    })

    it('should preserve timestamp through ULID ↔ Squid conversion', () => {
      const timestamp = Date.now()
      const ulid = createUlidWithTimestamp(timestamp)
      const squid = ulidToSqid(ulid)

      const timestampFromUlid = extractTimestampFromUlid(ulid)
      const timestampFromSquid = extractTimestampFromSquid(squid)

      expect(timestampFromUlid).toBe(timestamp)
      expect(timestampFromSquid).toBe(timestamp)
    })

    it('should handle past timestamps', () => {
      const pastTimestamp = Date.now() - 86400000 // 1 day ago
      const squid = createSquidWithTimestamp(pastTimestamp)

      const extracted = extractTimestampFromSquid(squid)
      expect(extracted).toBe(pastTimestamp)
    })

    it('should handle future timestamps', () => {
      const futureTimestamp = Date.now() + 86400000 // 1 day from now
      const squid = createSquidWithTimestamp(futureTimestamp)

      const extracted = extractTimestampFromSquid(squid)
      expect(extracted).toBe(futureTimestamp)
    })

    it('should throw error for invalid Squid when extracting timestamp', () => {
      expect(() => extractTimestampFromSquid('invalid')).toThrow('Invalid Sqid')
    })

    it('should throw error for invalid ULID when extracting timestamp', () => {
      expect(() => extractTimestampFromUlid('invalid')).toThrow('Invalid ULID')
    })
  })

  describe('ID Generation', () => {
    it('should create Squid with current timestamp by default', () => {
      const before = Date.now()
      const squid = createSquidWithTimestamp()
      const after = Date.now()

      const timestamp = extractTimestampFromSquid(squid)

      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
    })

    it('should create ULID with current timestamp by default', () => {
      const before = Date.now()
      const ulid = createUlidWithTimestamp()
      const after = Date.now()

      const timestamp = extractTimestampFromUlid(ulid)

      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
      expect(isValidUlid(ulid)).toBe(true)
    })

    it('should create Squid with specific timestamp', () => {
      const specificTimestamp = 1704067200000 // 2024-01-01 00:00:00 UTC
      const squid = createSquidWithTimestamp(specificTimestamp)

      const extracted = extractTimestampFromSquid(squid)
      expect(extracted).toBe(specificTimestamp)
    })

    it('should create ULID with specific timestamp', () => {
      const specificTimestamp = 1704067200000 // 2024-01-01 00:00:00 UTC
      const ulid = createUlidWithTimestamp(specificTimestamp)

      const extracted = extractTimestampFromUlid(ulid)
      expect(extracted).toBe(specificTimestamp)
      expect(isValidUlid(ulid)).toBe(true)
    })

    it('should generate unique Squids even with same timestamp', () => {
      const timestamp = Date.now()
      const squid1 = createSquidWithTimestamp(timestamp)
      const squid2 = createSquidWithTimestamp(timestamp)

      expect(squid1).not.toBe(squid2)
      expect(extractTimestampFromSquid(squid1)).toBe(timestamp)
      expect(extractTimestampFromSquid(squid2)).toBe(timestamp)
    })

    it('should generate unique ULIDs even with same timestamp', () => {
      const timestamp = Date.now()
      const ulid1 = createUlidWithTimestamp(timestamp)
      const ulid2 = createUlidWithTimestamp(timestamp)

      expect(ulid1).not.toBe(ulid2)
      expect(extractTimestampFromUlid(ulid1)).toBe(timestamp)
      expect(extractTimestampFromUlid(ulid2)).toBe(timestamp)
    })
  })

  describe('Validation', () => {
    it('should validate correct Squid', () => {
      const squid = createSquidWithTimestamp()
      expect(isValidSquid(squid)).toBe(true)
    })

    it('should validate Squid from ULID conversion', () => {
      const ulid = createUlidWithTimestamp()
      const squid = ulidToSqid(ulid)
      expect(isValidSquid(squid)).toBe(true)
    })

    it('should reject invalid Squid strings', () => {
      expect(isValidSquid('invalid')).toBe(false)
      expect(isValidSquid('')).toBe(false)
      expect(isValidSquid('123')).toBe(false)
    })

    it('should reject empty string', () => {
      expect(isValidSquid('')).toBe(false)
    })
  })

  describe('Sorting and Ordering', () => {
    it('should maintain chronological order when IDs created sequentially', () => {
      const squid1 = createSquidWithTimestamp(Date.now())
      // Small delay to ensure different timestamp
      const squid2 = createSquidWithTimestamp(Date.now() + 1)
      const squid3 = createSquidWithTimestamp(Date.now() + 2)

      const t1 = extractTimestampFromSquid(squid1)
      const t2 = extractTimestampFromSquid(squid2)
      const t3 = extractTimestampFromSquid(squid3)

      expect(t1).toBeLessThan(t2)
      expect(t2).toBeLessThan(t3)
    })

    it('should allow sorting by timestamp', () => {
      const timestamps = [
        Date.now() - 1000,
        Date.now(),
        Date.now() - 500,
        Date.now() + 100,
      ]

      const squids = timestamps.map((t) => createSquidWithTimestamp(t))

      // Sort squids by extracted timestamp
      const sorted = [...squids].sort((a, b) => {
        return extractTimestampFromSquid(a) - extractTimestampFromSquid(b)
      })

      // Extract timestamps from sorted squids
      const sortedTimestamps = sorted.map(extractTimestampFromSquid)

      // Should match manually sorted original timestamps
      const expectedTimestamps = [...timestamps].sort((a, b) => a - b)

      expect(sortedTimestamps).toEqual(expectedTimestamps)
    })
  })

  describe('Edge Cases', () => {
    it('should handle epoch timestamp (0)', () => {
      const squid = createSquidWithTimestamp(0)
      expect(extractTimestampFromSquid(squid)).toBe(0)

      const ulid = createUlidWithTimestamp(0)
      expect(extractTimestampFromUlid(ulid)).toBe(0)
    })

    it('should handle very large timestamps', () => {
      const largeTimestamp = 253402300799999 // 9999-12-31 23:59:59.999 UTC
      const squid = createSquidWithTimestamp(largeTimestamp)
      expect(extractTimestampFromSquid(squid)).toBe(largeTimestamp)

      const ulid = createUlidWithTimestamp(largeTimestamp)
      expect(extractTimestampFromUlid(ulid)).toBe(largeTimestamp)
    })

    it('should handle conversion of historically generated ULIDs', () => {
      // ULIDs from various timestamps
      const testCases = [
        { timestamp: 1704067200000, description: '2024-01-01' },
        { timestamp: 1609459200000, description: '2021-01-01' },
        { timestamp: Date.now(), description: 'now' },
      ]

      testCases.forEach(({ timestamp, description }) => {
        const ulid = createUlidWithTimestamp(timestamp)
        const squid = ulidToSqid(ulid)
        const backToUlid = sqidToUlid(squid)

        expect(backToUlid).toBe(ulid)
        expect(extractTimestampFromUlid(backToUlid)).toBe(timestamp)
        expect(extractTimestampFromSquid(squid)).toBe(timestamp)
      })
    })
  })
})
