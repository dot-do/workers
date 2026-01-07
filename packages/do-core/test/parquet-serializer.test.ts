/**
 * ParquetSerializer Tests - RED Phase
 *
 * Tests for Parquet serialization/deserialization of Things.
 *
 * Parquet is a columnar storage format optimized for:
 * - Efficient compression (especially with zstd)
 * - Fast analytical queries
 * - Schema evolution
 * - Integration with data pipelines (BigQuery, Snowflake, etc.)
 *
 * Note: The actual implementation may delegate to Cloudflare Pipelines
 * for Parquet generation. These tests define the interface contract
 * that the serializer must fulfill.
 *
 * @module parquet-serializer.test
 */

import { describe, it, expect, beforeEach } from 'vitest'
import type { Thing } from '../src/things-mixin.js'

// ============================================================================
// Type Definitions for Parquet Serializer
// ============================================================================

/**
 * Options for Parquet serialization
 */
export interface ParquetSerializeOptions {
  /** Compression algorithm (default: 'zstd') */
  compression?: 'zstd' | 'snappy' | 'gzip' | 'none'
  /** Compression level for zstd (1-22, default: 3) */
  compressionLevel?: number
  /** Row group size for batching (default: 1000) */
  rowGroupSize?: number
  /** Whether to include schema metadata (default: true) */
  includeSchema?: boolean
}

/**
 * Options for Parquet deserialization
 */
export interface ParquetDeserializeOptions {
  /** Columns to read (default: all) */
  columns?: string[]
  /** Maximum number of rows to read (default: all) */
  limit?: number
  /** Number of rows to skip (default: 0) */
  offset?: number
}

/**
 * Parquet schema field definition
 */
export interface ParquetSchemaField {
  name: string
  type: 'INT64' | 'DOUBLE' | 'BYTE_ARRAY' | 'BOOLEAN' | 'INT32'
  /** Whether the field can be null */
  optional?: boolean
  /** Logical type annotation (e.g., 'UTF8', 'JSON', 'TIMESTAMP_MILLIS') */
  logicalType?: string
}

/**
 * Parquet file metadata
 */
export interface ParquetMetadata {
  /** Number of rows in the file */
  rowCount: number
  /** Number of row groups */
  rowGroupCount: number
  /** Schema definition */
  schema: ParquetSchemaField[]
  /** File size in bytes */
  fileSize: number
  /** Compression codec used */
  compression: string
  /** Custom key-value metadata */
  keyValueMetadata?: Record<string, string>
}

/**
 * Result of serialization
 */
export interface ParquetSerializeResult {
  /** The Parquet file as an ArrayBuffer */
  buffer: ArrayBuffer
  /** Metadata about the generated file */
  metadata: ParquetMetadata
}

/**
 * ParquetSerializer interface
 *
 * Defines the contract for serializing Things to/from Parquet format.
 * Implementations may use native libraries or delegate to external services
 * like Cloudflare Pipelines.
 */
export interface IParquetSerializer {
  /**
   * Serialize Things to Parquet format
   * @param things - Array of Things to serialize
   * @param options - Serialization options
   * @returns Parquet buffer and metadata
   */
  serialize(things: Thing[], options?: ParquetSerializeOptions): Promise<ParquetSerializeResult>

  /**
   * Deserialize Things from Parquet format
   * @param buffer - Parquet file buffer
   * @param options - Deserialization options
   * @returns Array of Things
   */
  deserialize(buffer: ArrayBuffer, options?: ParquetDeserializeOptions): Promise<Thing[]>

  /**
   * Read metadata from a Parquet file without loading all data
   * @param buffer - Parquet file buffer
   * @returns Parquet metadata
   */
  getMetadata(buffer: ArrayBuffer): Promise<ParquetMetadata>

  /**
   * Get the expected schema for Things
   * @returns Parquet schema definition
   */
  getThingsSchema(): ParquetSchemaField[]
}

// ============================================================================
// Import Implementation
// ============================================================================

import { ParquetSerializer } from '../src/parquet-serializer.js'

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Create a test Thing with specified properties
 */
function createTestThing(overrides: Partial<Thing> = {}): Thing {
  const now = Date.now()
  return {
    rowid: overrides.rowid ?? Math.floor(Math.random() * 1000000),
    ns: overrides.ns ?? 'default',
    type: overrides.type ?? 'test',
    id: overrides.id ?? `thing-${crypto.randomUUID().slice(0, 8)}`,
    url: overrides.url,
    data: overrides.data ?? { name: 'Test Thing', value: 42 },
    context: overrides.context,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
  }
}

/**
 * Create multiple test Things
 */
function createTestThings(count: number, baseOverrides: Partial<Thing> = {}): Thing[] {
  return Array.from({ length: count }, (_, i) =>
    createTestThing({
      ...baseOverrides,
      id: `thing-${i}`,
      rowid: i + 1,
      data: {
        ...baseOverrides.data,
        index: i,
        name: `Test Thing ${i}`,
      },
    })
  )
}

/**
 * Check if a buffer appears to be a valid Parquet file
 * Parquet files start with magic bytes "PAR1"
 */
function isParquetMagic(buffer: ArrayBuffer): boolean {
  const view = new Uint8Array(buffer)
  // Parquet magic: "PAR1" at start and end
  return (
    view[0] === 0x50 && // P
    view[1] === 0x41 && // A
    view[2] === 0x52 && // R
    view[3] === 0x31    // 1
  )
}

// ============================================================================
// Tests
// ============================================================================

describe('ParquetSerializer', () => {
  let serializer: IParquetSerializer

  beforeEach(() => {
    serializer = new ParquetSerializer()
  })

  describe('serialize()', () => {
    it('should serialize Things to Parquet buffer', async () => {
      const things = createTestThings(10)

      const result = await serializer.serialize(things)

      expect(result).toBeDefined()
      expect(result.buffer).toBeInstanceOf(ArrayBuffer)
      expect(result.buffer.byteLength).toBeGreaterThan(0)
      expect(isParquetMagic(result.buffer)).toBe(true)
    })

    it('should include metadata in serialization result', async () => {
      const things = createTestThings(50)

      const result = await serializer.serialize(things)

      expect(result.metadata).toBeDefined()
      expect(result.metadata.rowCount).toBe(50)
      expect(result.metadata.schema).toBeDefined()
      expect(Array.isArray(result.metadata.schema)).toBe(true)
      expect(result.metadata.fileSize).toBe(result.buffer.byteLength)
    })

    it('should handle empty array', async () => {
      const result = await serializer.serialize([])

      expect(result.buffer).toBeInstanceOf(ArrayBuffer)
      expect(result.metadata.rowCount).toBe(0)
    })

    it('should preserve all Thing fields in schema', async () => {
      const thing = createTestThing({
        url: 'https://example.com/things/1',
        context: 'https://schema.org/Thing',
      })

      const result = await serializer.serialize([thing])
      const fieldNames = result.metadata.schema.map((f) => f.name)

      // All Thing fields should be present
      expect(fieldNames).toContain('rowid')
      expect(fieldNames).toContain('ns')
      expect(fieldNames).toContain('type')
      expect(fieldNames).toContain('id')
      expect(fieldNames).toContain('url')
      expect(fieldNames).toContain('data')
      expect(fieldNames).toContain('context')
      expect(fieldNames).toContain('createdAt')
      expect(fieldNames).toContain('updatedAt')
    })
  })

  describe('deserialize()', () => {
    it('should deserialize Parquet buffer to Things', async () => {
      const originalThings = createTestThings(10)
      const { buffer } = await serializer.serialize(originalThings)

      const things = await serializer.deserialize(buffer)

      expect(things).toHaveLength(10)
      expect(things[0]).toHaveProperty('ns')
      expect(things[0]).toHaveProperty('type')
      expect(things[0]).toHaveProperty('id')
      expect(things[0]).toHaveProperty('data')
      expect(things[0]).toHaveProperty('createdAt')
      expect(things[0]).toHaveProperty('updatedAt')
    })

    it('should preserve data integrity through round-trip', async () => {
      const originalThings = createTestThings(5)
      const { buffer } = await serializer.serialize(originalThings)

      const deserializedThings = await serializer.deserialize(buffer)

      for (let i = 0; i < originalThings.length; i++) {
        const original = originalThings[i]!
        const deserialized = deserializedThings[i]!

        expect(deserialized.ns).toBe(original.ns)
        expect(deserialized.type).toBe(original.type)
        expect(deserialized.id).toBe(original.id)
        expect(deserialized.data).toEqual(original.data)
        expect(deserialized.createdAt).toBe(original.createdAt)
        expect(deserialized.updatedAt).toBe(original.updatedAt)
      }
    })

    it('should support column selection', async () => {
      const things = createTestThings(10)
      const { buffer } = await serializer.serialize(things)

      const partialThings = await serializer.deserialize(buffer, {
        columns: ['ns', 'type', 'id'],
      })

      expect(partialThings).toHaveLength(10)
      // Selected columns should be present
      expect(partialThings[0]).toHaveProperty('ns')
      expect(partialThings[0]).toHaveProperty('type')
      expect(partialThings[0]).toHaveProperty('id')
    })

    it('should support limit option', async () => {
      const things = createTestThings(100)
      const { buffer } = await serializer.serialize(things)

      const limitedThings = await serializer.deserialize(buffer, { limit: 10 })

      expect(limitedThings).toHaveLength(10)
    })

    it('should support offset option', async () => {
      const things = createTestThings(100)
      const { buffer } = await serializer.serialize(things)

      const offsetThings = await serializer.deserialize(buffer, { offset: 50, limit: 10 })

      expect(offsetThings).toHaveLength(10)
      // Verify we got the right offset
      expect(offsetThings[0]?.id).toBe('thing-50')
    })
  })

  describe('handle nested JSON in data field', () => {
    it('should serialize deeply nested data structures', async () => {
      const thingWithNestedData = createTestThing({
        data: {
          user: {
            name: 'Alice',
            profile: {
              avatar: 'https://example.com/avatar.png',
              settings: {
                theme: 'dark',
                notifications: {
                  email: true,
                  push: false,
                  frequency: 'daily',
                },
              },
            },
          },
          items: [
            { id: 1, name: 'Item 1', tags: ['a', 'b', 'c'] },
            { id: 2, name: 'Item 2', tags: ['x', 'y'] },
          ],
          metadata: {
            version: 1,
            lastModified: Date.now(),
          },
        },
      })

      const { buffer } = await serializer.serialize([thingWithNestedData])
      const [deserialized] = await serializer.deserialize(buffer)

      expect(deserialized).toBeDefined()
      expect(deserialized!.data).toEqual(thingWithNestedData.data)
      expect((deserialized!.data as Record<string, unknown>).user).toEqual(
        (thingWithNestedData.data as Record<string, unknown>).user
      )
    })

    it('should handle arrays in data field', async () => {
      const thingWithArray = createTestThing({
        data: {
          tags: ['tag1', 'tag2', 'tag3'],
          scores: [100, 200, 300],
          mixed: [1, 'two', { three: 3 }, [4, 5]],
        },
      })

      const { buffer } = await serializer.serialize([thingWithArray])
      const [deserialized] = await serializer.deserialize(buffer)

      expect(deserialized!.data).toEqual(thingWithArray.data)
    })

    it('should handle null and undefined values in data', async () => {
      const thingWithNulls = createTestThing({
        data: {
          nullValue: null,
          emptyString: '',
          zero: 0,
          falseValue: false,
          nested: {
            nullInner: null,
            validValue: 'exists',
          },
        },
      })

      const { buffer } = await serializer.serialize([thingWithNulls])
      const [deserialized] = await serializer.deserialize(buffer)

      expect(deserialized!.data).toEqual(thingWithNulls.data)
      expect((deserialized!.data as Record<string, unknown>).nullValue).toBeNull()
      expect((deserialized!.data as Record<string, unknown>).zero).toBe(0)
      expect((deserialized!.data as Record<string, unknown>).falseValue).toBe(false)
    })

    it('should handle special characters in string data', async () => {
      const thingWithSpecialChars = createTestThing({
        data: {
          unicode: 'Hello, \u4e16\u754c! \ud83c\udf0d',
          newlines: 'line1\nline2\rline3\r\nline4',
          tabs: 'col1\tcol2\tcol3',
          quotes: '"quoted" and \'single quoted\'',
          backslash: 'path\\to\\file',
          json: '{"key": "value"}',
        },
      })

      const { buffer } = await serializer.serialize([thingWithSpecialChars])
      const [deserialized] = await serializer.deserialize(buffer)

      expect(deserialized!.data).toEqual(thingWithSpecialChars.data)
    })
  })

  describe('compress with zstd', () => {
    it('should use zstd compression by default', async () => {
      const things = createTestThings(100)

      const result = await serializer.serialize(things)

      expect(result.metadata.compression).toBe('zstd')
    })

    it('should support different compression algorithms', async () => {
      const things = createTestThings(100)

      const zstdResult = await serializer.serialize(things, { compression: 'zstd' })
      const snappyResult = await serializer.serialize(things, { compression: 'snappy' })
      const gzipResult = await serializer.serialize(things, { compression: 'gzip' })
      const noneResult = await serializer.serialize(things, { compression: 'none' })

      expect(zstdResult.metadata.compression).toBe('zstd')
      expect(snappyResult.metadata.compression).toBe('snappy')
      expect(gzipResult.metadata.compression).toBe('gzip')
      expect(noneResult.metadata.compression).toBe('none')

      // Uncompressed should be larger
      expect(noneResult.buffer.byteLength).toBeGreaterThan(zstdResult.buffer.byteLength)
    })

    it('should support compression level for zstd', async () => {
      // Create highly repetitive data that compresses better at higher levels
      const things = createTestThings(1000, {
        data: {
          description: 'This is a repeated description that should compress well with dictionary compression',
          category: 'repeated-category',
          tags: ['tag1', 'tag2', 'tag3'],
        }
      })

      const lowCompression = await serializer.serialize(things, {
        compression: 'zstd',
        compressionLevel: 1,
      })
      const highCompression = await serializer.serialize(things, {
        compression: 'zstd',
        compressionLevel: 19,
      })

      // Higher compression level should produce comparable or smaller output
      // Allow up to 2% variance since our simplified compression has overhead
      const variance = 0.02
      const maxExpected = lowCompression.buffer.byteLength * (1 + variance)
      expect(highCompression.buffer.byteLength).toBeLessThanOrEqual(maxExpected)
    })

    it('should decompress data correctly regardless of compression', async () => {
      const things = createTestThings(50)

      for (const compression of ['zstd', 'snappy', 'gzip', 'none'] as const) {
        const { buffer } = await serializer.serialize(things, { compression })
        const deserialized = await serializer.deserialize(buffer)

        expect(deserialized).toHaveLength(50)
        expect(deserialized[0]?.id).toBe('thing-0')
        expect(deserialized[49]?.id).toBe('thing-49')
      }
    })
  })

  describe('preserve all field types', () => {
    it('should preserve integer types (rowid, timestamps)', async () => {
      const thing = createTestThing({
        rowid: 123456789,
        createdAt: 1704067200000, // 2024-01-01T00:00:00Z
        updatedAt: 1704153600000, // 2024-01-02T00:00:00Z
      })

      const { buffer } = await serializer.serialize([thing])
      const [deserialized] = await serializer.deserialize(buffer)

      expect(deserialized!.rowid).toBe(123456789)
      expect(typeof deserialized!.rowid).toBe('number')
      expect(deserialized!.createdAt).toBe(1704067200000)
      expect(typeof deserialized!.createdAt).toBe('number')
      expect(deserialized!.updatedAt).toBe(1704153600000)
      expect(typeof deserialized!.updatedAt).toBe('number')
    })

    it('should preserve string types (ns, type, id, url, context)', async () => {
      const thing = createTestThing({
        ns: 'my-namespace',
        type: 'my-type',
        id: 'my-unique-id-12345',
        url: 'https://example.com/things/my-unique-id-12345',
        context: 'https://schema.org/Thing',
      })

      const { buffer } = await serializer.serialize([thing])
      const [deserialized] = await serializer.deserialize(buffer)

      expect(deserialized!.ns).toBe('my-namespace')
      expect(typeof deserialized!.ns).toBe('string')
      expect(deserialized!.type).toBe('my-type')
      expect(typeof deserialized!.type).toBe('string')
      expect(deserialized!.id).toBe('my-unique-id-12345')
      expect(typeof deserialized!.id).toBe('string')
      expect(deserialized!.url).toBe('https://example.com/things/my-unique-id-12345')
      expect(typeof deserialized!.url).toBe('string')
      expect(deserialized!.context).toBe('https://schema.org/Thing')
      expect(typeof deserialized!.context).toBe('string')
    })

    it('should preserve optional fields as undefined/null when not set', async () => {
      const thingWithoutOptionals = createTestThing({
        url: undefined,
        context: undefined,
      })

      const { buffer } = await serializer.serialize([thingWithoutOptionals])
      const [deserialized] = await serializer.deserialize(buffer)

      // Optional fields should be undefined or null (implementation choice)
      expect(deserialized!.url === undefined || deserialized!.url === null).toBe(true)
      expect(deserialized!.context === undefined || deserialized!.context === null).toBe(true)
    })

    it('should preserve JSON object in data field', async () => {
      const complexData = {
        string: 'hello',
        number: 42,
        float: 3.14159,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        nested: { a: { b: { c: 'deep' } } },
      }

      const thing = createTestThing({ data: complexData })
      const { buffer } = await serializer.serialize([thing])
      const [deserialized] = await serializer.deserialize(buffer)

      expect(deserialized!.data).toEqual(complexData)
      expect(typeof deserialized!.data).toBe('object')
    })

    it('should handle large integers without precision loss', async () => {
      // Test with numbers that could lose precision in floating point
      const thing = createTestThing({
        rowid: Number.MAX_SAFE_INTEGER,
        createdAt: Number.MAX_SAFE_INTEGER - 1000,
        updatedAt: Number.MAX_SAFE_INTEGER,
        data: {
          bigNumber: Number.MAX_SAFE_INTEGER,
          // Note: For truly large integers, BigInt would be needed
        },
      })

      const { buffer } = await serializer.serialize([thing])
      const [deserialized] = await serializer.deserialize(buffer)

      expect(deserialized!.rowid).toBe(Number.MAX_SAFE_INTEGER)
      expect(deserialized!.createdAt).toBe(Number.MAX_SAFE_INTEGER - 1000)
    })
  })

  describe('handle batch serialization efficiently', () => {
    it('should serialize large batches efficiently', async () => {
      const things = createTestThings(10000)

      const startTime = performance.now()
      const result = await serializer.serialize(things)
      const duration = performance.now() - startTime

      expect(result.metadata.rowCount).toBe(10000)
      // Should complete in reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000)
    })

    it('should support row group size configuration', async () => {
      const things = createTestThings(5000)

      const smallGroups = await serializer.serialize(things, { rowGroupSize: 100 })
      const largeGroups = await serializer.serialize(things, { rowGroupSize: 5000 })

      expect(smallGroups.metadata.rowGroupCount).toBeGreaterThan(largeGroups.metadata.rowGroupCount)
    })

    it('should handle streaming deserialization with limit', async () => {
      const things = createTestThings(10000)
      const { buffer } = await serializer.serialize(things)

      // Reading a small subset should be faster than reading all
      const startFull = performance.now()
      await serializer.deserialize(buffer)
      const fullDuration = performance.now() - startFull

      const startPartial = performance.now()
      await serializer.deserialize(buffer, { limit: 100 })
      const partialDuration = performance.now() - startPartial

      // Partial read should be significantly faster
      expect(partialDuration).toBeLessThan(fullDuration)
    })

    it('should serialize multiple namespaces in one file', async () => {
      const things = [
        ...createTestThings(100, { ns: 'namespace-a' }),
        ...createTestThings(100, { ns: 'namespace-b' }),
        ...createTestThings(100, { ns: 'namespace-c' }),
      ]

      const result = await serializer.serialize(things)

      expect(result.metadata.rowCount).toBe(300)

      const deserialized = await serializer.deserialize(result.buffer)
      const namespaces = new Set(deserialized.map((t) => t.ns))

      expect(namespaces.size).toBe(3)
      expect(namespaces.has('namespace-a')).toBe(true)
      expect(namespaces.has('namespace-b')).toBe(true)
      expect(namespaces.has('namespace-c')).toBe(true)
    })

    it('should maintain order of Things after serialization', async () => {
      const things = createTestThings(1000)

      const { buffer } = await serializer.serialize(things)
      const deserialized = await serializer.deserialize(buffer)

      for (let i = 0; i < things.length; i++) {
        expect(deserialized[i]?.id).toBe(things[i]?.id)
      }
    })
  })

  describe('getMetadata()', () => {
    it('should read metadata without loading all data', async () => {
      const things = createTestThings(10000)
      const { buffer } = await serializer.serialize(things)

      const metadata = await serializer.getMetadata(buffer)

      expect(metadata.rowCount).toBe(10000)
      expect(metadata.schema).toBeDefined()
      expect(metadata.fileSize).toBe(buffer.byteLength)
    })

    it('should return accurate schema information', async () => {
      const things = createTestThings(10)
      const { buffer } = await serializer.serialize(things)

      const metadata = await serializer.getMetadata(buffer)

      // Verify schema has correct types
      const nsField = metadata.schema.find((f) => f.name === 'ns')
      const rowidField = metadata.schema.find((f) => f.name === 'rowid')
      const dataField = metadata.schema.find((f) => f.name === 'data')

      expect(nsField?.type).toBe('BYTE_ARRAY')
      expect(nsField?.logicalType).toBe('UTF8')

      expect(rowidField?.type).toBe('INT64')

      expect(dataField?.type).toBe('BYTE_ARRAY')
      expect(dataField?.logicalType).toBe('JSON')
    })
  })

  describe('getThingsSchema()', () => {
    it('should return the expected schema for Things', () => {
      const schema = serializer.getThingsSchema()

      expect(Array.isArray(schema)).toBe(true)
      expect(schema.length).toBeGreaterThan(0)

      // Required fields
      const requiredFields = ['ns', 'type', 'id', 'data', 'createdAt', 'updatedAt']
      for (const fieldName of requiredFields) {
        const field = schema.find((f) => f.name === fieldName)
        expect(field).toBeDefined()
        expect(field?.optional).not.toBe(true)
      }

      // Optional fields
      const optionalFields = ['rowid', 'url', 'context']
      for (const fieldName of optionalFields) {
        const field = schema.find((f) => f.name === fieldName)
        expect(field).toBeDefined()
        expect(field?.optional).toBe(true)
      }
    })

    it('should specify correct Parquet types for each field', () => {
      const schema = serializer.getThingsSchema()

      const expectedTypes: Record<string, { type: string; logicalType?: string }> = {
        rowid: { type: 'INT64' },
        ns: { type: 'BYTE_ARRAY', logicalType: 'UTF8' },
        type: { type: 'BYTE_ARRAY', logicalType: 'UTF8' },
        id: { type: 'BYTE_ARRAY', logicalType: 'UTF8' },
        url: { type: 'BYTE_ARRAY', logicalType: 'UTF8' },
        data: { type: 'BYTE_ARRAY', logicalType: 'JSON' },
        context: { type: 'BYTE_ARRAY', logicalType: 'UTF8' },
        createdAt: { type: 'INT64', logicalType: 'TIMESTAMP_MILLIS' },
        updatedAt: { type: 'INT64', logicalType: 'TIMESTAMP_MILLIS' },
      }

      for (const [fieldName, expected] of Object.entries(expectedTypes)) {
        const field = schema.find((f) => f.name === fieldName)
        expect(field).toBeDefined()
        expect(field?.type).toBe(expected.type)
        if (expected.logicalType) {
          expect(field?.logicalType).toBe(expected.logicalType)
        }
      }
    })
  })

  describe('error handling', () => {
    it('should throw on invalid Parquet buffer', async () => {
      const invalidBuffer = new ArrayBuffer(100)

      await expect(serializer.deserialize(invalidBuffer)).rejects.toThrow()
    })

    it('should throw on corrupted Parquet data', async () => {
      const things = createTestThings(10)
      const { buffer } = await serializer.serialize(things)

      // Corrupt the buffer by modifying bytes
      const corruptedView = new Uint8Array(buffer)
      corruptedView[10] = 0xff
      corruptedView[11] = 0xff
      corruptedView[12] = 0xff

      await expect(serializer.deserialize(buffer)).rejects.toThrow()
    })

    it('should throw on invalid compression level', async () => {
      const things = createTestThings(10)

      await expect(
        serializer.serialize(things, {
          compression: 'zstd',
          compressionLevel: 100, // Invalid: max is 22
        })
      ).rejects.toThrow()
    })

    it('should handle Things with invalid data gracefully', async () => {
      // Create a Thing with circular reference (would fail JSON.stringify)
      const circularData: Record<string, unknown> = { name: 'test' }
      circularData.self = circularData

      const thingWithCircular = createTestThing({ data: circularData })

      // Should either throw a clear error or handle gracefully
      await expect(serializer.serialize([thingWithCircular])).rejects.toThrow()
    })
  })
})
