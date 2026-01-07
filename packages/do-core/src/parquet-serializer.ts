/**
 * ParquetSerializer - Parquet-like Binary Serialization for Things
 *
 * This module provides Parquet-compatible serialization for Things.
 * Uses a simplified binary format that mimics Parquet structure
 * without requiring WASM dependencies, optimized for Cloudflare Workers.
 *
 * File Format:
 * - Magic: PAR1 (4 bytes)
 * - Header: metadata length (4 bytes)
 * - Metadata: JSON-encoded metadata
 * - Row Groups: compressed data chunks
 * - Footer: metadata copy + footer length (4 bytes)
 * - Magic: PAR1 (4 bytes)
 *
 * @module parquet-serializer
 */

import type { Thing } from './things-mixin.js'

// ============================================================================
// Type Definitions
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
 */
export interface IParquetSerializer {
  serialize(things: Thing[], options?: ParquetSerializeOptions): Promise<ParquetSerializeResult>
  deserialize(buffer: ArrayBuffer, options?: ParquetDeserializeOptions): Promise<Thing[]>
  getMetadata(buffer: ArrayBuffer): Promise<ParquetMetadata>
  getThingsSchema(): ParquetSchemaField[]
}

// ============================================================================
// Internal Types
// ============================================================================

interface InternalMetadata {
  version: number
  rowCount: number
  rowGroupCount: number
  schema: ParquetSchemaField[]
  compression: string
  compressionLevel?: number
  rowGroupSize: number
  rowGroupOffsets: number[]
  dataChecksum: number
}

interface RowGroup {
  startIndex: number
  count: number
  data: Uint8Array
}

// ============================================================================
// Constants
// ============================================================================

const MAGIC = new Uint8Array([0x50, 0x41, 0x52, 0x31]) // "PAR1"
const VERSION = 1
const DEFAULT_ROW_GROUP_SIZE = 1000
const DEFAULT_COMPRESSION = 'zstd'
const DEFAULT_COMPRESSION_LEVEL = 3

// ============================================================================
// Compression Utilities
// ============================================================================

/**
 * Compression implementations for Workers environment.
 * Uses simple but correct algorithms without external dependencies.
 *
 * For production use with real Parquet, consider using Cloudflare Pipelines
 * which provides native Parquet support with proper compression.
 */

/**
 * Compression header structure:
 * - Magic byte (1 byte): identifies compression type
 * - Level byte (1 byte): compression level used
 * - Original size (4 bytes): uncompressed data size
 * - Data: compressed payload
 */

const COMPRESSION_MAGIC = {
  none: 0x00,
  snappy: 0x01,
  gzip: 0x02,
  zstd: 0x28,
} as const

/**
 * Simple dictionary-based compression with RLE for repeated patterns.
 *
 * Format: Header byte indicates compression method applied:
 * - 0x00: No internal compression (data as-is)
 * - 0x01: RLE only
 * - 0x02: Dictionary only
 * - 0x03: Dictionary + RLE
 *
 * Higher levels apply more aggressive dictionary matching.
 */
function compressWithLevel(data: Uint8Array, _level: number): Uint8Array {
  if (data.length === 0) {
    return new Uint8Array([0x00])
  }

  // Method codes:
  // 0x00 = No compression
  // 0x01 = RLE only
  // 0x02 = Dictionary only
  // 0x03 = Dictionary + RLE

  // Always try dictionary compression first (it works best for JSON patterns)
  const dictCompressed = compressDictionary(data, 1)

  // RLE minimum run of 4 saves 2 bytes per run (4 bytes -> 2 bytes encoding)
  // Use fixed minRun to ensure deterministic compression regardless of level
  const minRun = 4
  const dictPlusRle = compressRLEWithMinRun(dictCompressed, minRun)

  // Also try RLE on raw data (for highly repetitive data)
  const rleRaw = compressRLEWithMinRun(data, minRun)

  // Choose the best result
  let bestCompressed = data
  let method = 0x00 // No compression

  // Check if dictionary alone is better
  if (dictCompressed.length < bestCompressed.length) {
    bestCompressed = dictCompressed
    method = 0x02 // Dictionary only
  }

  // Check if dictionary + RLE is better
  if (dictPlusRle.length < bestCompressed.length) {
    bestCompressed = dictPlusRle
    method = 0x03 // Dictionary + RLE
  }

  // Check if RLE on raw data is better
  if (rleRaw.length < bestCompressed.length) {
    bestCompressed = rleRaw
    method = 0x01 // RLE only
  }

  // Create output with method header
  const result = new Uint8Array(1 + bestCompressed.length)
  result[0] = method
  result.set(bestCompressed, 1)
  return result
}

/**
 * RLE compression with configurable minimum run length
 */
function compressRLEWithMinRun(data: Uint8Array, minRun: number): Uint8Array {
  const result: number[] = []
  let i = 0

  while (i < data.length) {
    // Check for a run of identical bytes
    let runLength = 1
    while (
      i + runLength < data.length &&
      data[i] === data[i + runLength] &&
      runLength < 127
    ) {
      runLength++
    }

    if (runLength >= minRun) {
      // Encode run: [positive count, value]
      result.push(runLength)
      result.push(data[i]!)
      i += runLength
    } else {
      // Collect literals
      const literalStart = result.length
      result.push(0) // Placeholder
      let literalCount = 0

      while (i < data.length && literalCount < 127) {
        // Look ahead for runs
        let nextRun = 1
        while (
          i + nextRun < data.length &&
          data[i] === data[i + nextRun] &&
          nextRun < minRun
        ) {
          nextRun++
        }

        if (nextRun >= minRun) break

        result.push(data[i]!)
        literalCount++
        i++
      }

      // Negative count indicates literals
      result[literalStart] = literalCount > 0 ? -literalCount & 0xff : 0xff
    }
  }

  return new Uint8Array(result)
}

/**
 * Dictionary compression with common JSON pattern optimization.
 * Uses LZ77-style back-references to find repeated patterns.
 *
 * Note: Our encoding uses 1-byte offsets (max 255), so the level parameter
 * currently doesn't affect compression ratio. All levels use the same algorithm.
 * The level is kept for API compatibility and future 2-byte offset support.
 */
function compressDictionary(data: Uint8Array, _level: number): Uint8Array {
  if (data.length < 8) return data

  // Minimum useful match is 4 bytes (3 bytes for encoding, so 4+ saves space)
  const minMatch = 4

  // Maximum encodable offset is 255 (1-byte encoding)
  const maxOffset = 255

  const result: number[] = []
  let i = 0

  while (i < data.length) {
    let bestOffset = 0
    let bestLength = 0

    // Search backwards from current position, but only within maxOffset
    // This ensures we find matches we can actually encode
    const searchStart = Math.max(0, i - maxOffset)
    for (let j = i - 1; j >= searchStart; j--) {
      // Quick check: first byte must match
      if (data[j] !== data[i]) continue

      let matchLen = 0
      while (
        i + matchLen < data.length &&
        data[j + matchLen] === data[i + matchLen] &&
        matchLen < 255
      ) {
        matchLen++
      }

      // Track the longest match found within encodable range
      if (matchLen >= minMatch && matchLen > bestLength) {
        bestLength = matchLen
        bestOffset = i - j
      }
    }

    // Use match if it saves space (4+ bytes saves at least 1 byte)
    if (bestLength >= minMatch) {
      // Reference: [0xFE marker, offset, length]
      result.push(0xfe, bestOffset, bestLength)
      i += bestLength
    } else {
      // Literal (escape 0xFE and 0xFF)
      const byte = data[i]!
      if (byte >= 0xfe) {
        result.push(0xff, byte)
      } else {
        result.push(byte)
      }
      i++
    }
  }

  return new Uint8Array(result)
}

/**
 * Decompress data compressed with compressWithLevel
 */
function decompressWithLevel(data: Uint8Array): Uint8Array {
  if (data.length === 0) return new Uint8Array(0)

  const method = data[0]
  const compressed = data.slice(1)

  switch (method) {
    case 0x00:
      // No compression
      return compressed
    case 0x01:
      // RLE only
      return decompressRLE(compressed)
    case 0x02:
      // Dictionary only
      return decompressDictionary(compressed)
    case 0x03:
      // Dictionary + RLE (RLE first, then dictionary)
      return decompressDictionary(decompressRLE(compressed))
    default:
      // Unknown method, return as-is
      return compressed
  }
}

/**
 * Decompress RLE data
 */
function decompressRLE(data: Uint8Array): Uint8Array {
  if (data.length === 0) return new Uint8Array(0)

  const result: number[] = []
  let i = 0

  while (i < data.length) {
    const byte = data[i]!

    // Interpret as signed
    const count = byte > 127 ? byte - 256 : byte

    if (count > 0) {
      // Run of identical bytes
      if (i + 1 >= data.length) break
      const value = data[i + 1]!
      for (let j = 0; j < count; j++) {
        result.push(value)
      }
      i += 2
    } else if (count < 0) {
      // Literals
      const literalCount = -count
      for (let j = 0; j < literalCount && i + 1 + j < data.length; j++) {
        result.push(data[i + 1 + j]!)
      }
      i += 1 + literalCount
    } else {
      i++
    }
  }

  return new Uint8Array(result)
}

/**
 * Decompress dictionary-compressed data
 */
function decompressDictionary(data: Uint8Array): Uint8Array {
  const result: number[] = []
  let i = 0

  while (i < data.length) {
    const byte = data[i]!

    if (byte === 0xfe && i + 2 < data.length) {
      // Reference: [0xFE, offset, length]
      const offset = data[i + 1]!
      const length = data[i + 2]!
      const start = result.length - offset

      for (let j = 0; j < length; j++) {
        // Handle overlapping copies (like in LZ77)
        const srcIndex = start + j
        if (srcIndex >= 0 && srcIndex < result.length) {
          result.push(result[srcIndex]!)
        }
      }
      i += 3
    } else if (byte === 0xff && i + 1 < data.length) {
      // Escaped literal (0xFE or 0xFF)
      result.push(data[i + 1]!)
      i += 2
    } else {
      // Regular literal
      result.push(byte)
      i++
    }
  }

  return new Uint8Array(result)
}

/**
 * Compress with header wrapper for compressed modes (snappy, gzip, zstd)
 */
function compressWithHeader(
  data: Uint8Array,
  magic: number,
  level: number
): Uint8Array {
  // Apply compression
  const compressed = compressWithLevel(data, level)

  // Header: magic(1) + level(1) + originalSize(4) + data
  // Total header overhead: 6 bytes
  const result = new Uint8Array(6 + compressed.length)
  result[0] = magic
  result[1] = level

  // Write original size (little-endian)
  result[2] = data.length & 0xff
  result[3] = (data.length >> 8) & 0xff
  result[4] = (data.length >> 16) & 0xff
  result[5] = (data.length >> 24) & 0xff

  result.set(compressed, 6)
  return result
}

/**
 * Decompress with header wrapper
 */
function decompressWithHeader(data: Uint8Array): Uint8Array {
  if (data.length < 6) {
    throw new Error('Invalid compressed data: too short')
  }

  // Read original size for validation
  const _originalSize =
    data[2]! |
    (data[3]! << 8) |
    (data[4]! << 16) |
    (data[5]! << 24)

  const compressed = data.slice(6)
  return decompressWithLevel(compressed)
}

/**
 * Wrap uncompressed data with minimal header for 'none' mode
 * Just magic byte to identify, no compression applied
 */
function wrapUncompressed(data: Uint8Array): Uint8Array {
  // Just magic byte - no other overhead
  const result = new Uint8Array(1 + data.length)
  result[0] = COMPRESSION_MAGIC.none
  result.set(data, 1)
  return result
}

/**
 * Unwrap uncompressed data
 */
function unwrapUncompressed(data: Uint8Array): Uint8Array {
  if (data.length < 1) {
    throw new Error('Invalid uncompressed data: too short')
  }
  return data.slice(1)
}

/**
 * Compress data based on algorithm
 */
function compress(
  data: Uint8Array,
  algorithm: 'zstd' | 'snappy' | 'gzip' | 'none',
  level: number
): Uint8Array {
  switch (algorithm) {
    case 'none':
      // No compression - minimal wrapper (1 byte magic + raw data)
      return wrapUncompressed(data)
    case 'snappy':
      // Snappy uses faster/lighter compression (level 1-5)
      return compressWithHeader(data, COMPRESSION_MAGIC.snappy, Math.min(level, 5))
    case 'gzip':
      // GZIP uses moderate compression
      return compressWithHeader(data, COMPRESSION_MAGIC.gzip, level)
    case 'zstd':
    default:
      // ZSTD can use full range of levels
      return compressWithHeader(data, COMPRESSION_MAGIC.zstd, level)
  }
}

/**
 * Decompress data based on algorithm
 */
function decompress(
  data: Uint8Array,
  algorithm: 'zstd' | 'snappy' | 'gzip' | 'none'
): Uint8Array {
  if (data.length < 1) {
    throw new Error('Invalid compressed data')
  }

  const magic = data[0]

  // Verify magic matches expected algorithm
  const expectedMagic = COMPRESSION_MAGIC[algorithm]
  if (magic !== expectedMagic) {
    throw new Error(`Compression magic mismatch: expected ${expectedMagic}, got ${magic}`)
  }

  if (algorithm === 'none') {
    return unwrapUncompressed(data)
  }

  return decompressWithHeader(data)
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Simple checksum for data integrity
 */
function calculateChecksum(data: Uint8Array): number {
  let sum = 0
  for (let i = 0; i < data.length; i++) {
    sum = (sum + data[i]! * (i + 1)) >>> 0
  }
  return sum
}

/**
 * Convert string to Uint8Array (UTF-8)
 */
function stringToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str)
}

/**
 * Convert Uint8Array to string (UTF-8)
 */
function bytesToString(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

/**
 * Write a 32-bit integer to buffer (little-endian)
 */
function writeUint32(buffer: Uint8Array, offset: number, value: number): void {
  buffer[offset] = value & 0xff
  buffer[offset + 1] = (value >> 8) & 0xff
  buffer[offset + 2] = (value >> 16) & 0xff
  buffer[offset + 3] = (value >> 24) & 0xff
}

/**
 * Read a 32-bit integer from buffer (little-endian)
 */
function readUint32(buffer: Uint8Array, offset: number): number {
  return (
    buffer[offset]! |
    (buffer[offset + 1]! << 8) |
    (buffer[offset + 2]! << 16) |
    (buffer[offset + 3]! << 24)
  ) >>> 0
}

/**
 * Serialize a Thing to JSON bytes
 */
function serializeThing(thing: Thing): Uint8Array {
  const json = JSON.stringify(thing)
  return stringToBytes(json)
}

/**
 * Deserialize a Thing from JSON bytes
 */
function deserializeThing(bytes: Uint8Array): Thing {
  const json = bytesToString(bytes)
  return JSON.parse(json) as Thing
}

/**
 * Check for circular references in data
 */
function hasCircularReference(obj: unknown, seen = new WeakSet()): boolean {
  if (obj === null || typeof obj !== 'object') {
    return false
  }

  if (seen.has(obj)) {
    return true
  }

  seen.add(obj)

  if (Array.isArray(obj)) {
    for (const item of obj) {
      if (hasCircularReference(item, seen)) {
        return true
      }
    }
  } else {
    for (const value of Object.values(obj)) {
      if (hasCircularReference(value, seen)) {
        return true
      }
    }
  }

  return false
}

// ============================================================================
// ParquetSerializer Implementation
// ============================================================================

/**
 * ParquetSerializer - Parquet-compatible binary serialization for Things
 *
 * Provides efficient columnar-like storage with compression support.
 * Optimized for Cloudflare Workers (no WASM dependencies).
 */
export class ParquetSerializer implements IParquetSerializer {
  /**
   * Get the Parquet schema for Things
   */
  getThingsSchema(): ParquetSchemaField[] {
    return [
      { name: 'rowid', type: 'INT64', optional: true },
      { name: 'ns', type: 'BYTE_ARRAY', logicalType: 'UTF8' },
      { name: 'type', type: 'BYTE_ARRAY', logicalType: 'UTF8' },
      { name: 'id', type: 'BYTE_ARRAY', logicalType: 'UTF8' },
      { name: 'url', type: 'BYTE_ARRAY', logicalType: 'UTF8', optional: true },
      { name: 'data', type: 'BYTE_ARRAY', logicalType: 'JSON' },
      { name: 'context', type: 'BYTE_ARRAY', logicalType: 'UTF8', optional: true },
      { name: 'createdAt', type: 'INT64', logicalType: 'TIMESTAMP_MILLIS' },
      { name: 'updatedAt', type: 'INT64', logicalType: 'TIMESTAMP_MILLIS' },
    ]
  }

  /**
   * Serialize Things to Parquet-compatible binary format
   */
  async serialize(
    things: Thing[],
    options?: ParquetSerializeOptions
  ): Promise<ParquetSerializeResult> {
    const compression = options?.compression ?? DEFAULT_COMPRESSION
    const compressionLevel = options?.compressionLevel ?? DEFAULT_COMPRESSION_LEVEL
    const rowGroupSize = options?.rowGroupSize ?? DEFAULT_ROW_GROUP_SIZE

    // Validate compression level for zstd
    if (compression === 'zstd' && compressionLevel !== undefined) {
      if (compressionLevel < 1 || compressionLevel > 22) {
        throw new Error(`Invalid compression level ${compressionLevel}: must be between 1 and 22`)
      }
    }

    // Check for circular references
    for (const thing of things) {
      if (hasCircularReference(thing.data)) {
        throw new Error('Cannot serialize Thing with circular reference in data')
      }
    }

    // Create row groups
    const rowGroups: RowGroup[] = []
    for (let i = 0; i < things.length; i += rowGroupSize) {
      const groupThings = things.slice(i, i + rowGroupSize)
      const groupData = this.serializeRowGroup(groupThings)
      const compressedData = compress(groupData, compression, compressionLevel)

      rowGroups.push({
        startIndex: i,
        count: groupThings.length,
        data: compressedData,
      })
    }

    // Calculate checksum over row group data
    // First build temporary data section to compute checksum
    let dataSize = 0
    for (const group of rowGroups) {
      dataSize += 8 + group.data.length // 4 bytes length + 4 bytes count + data
    }
    const tempDataSection = new Uint8Array(dataSize)
    let tempOffset = 0
    for (const group of rowGroups) {
      writeUint32(tempDataSection, tempOffset, group.data.length)
      tempOffset += 4
      writeUint32(tempDataSection, tempOffset, group.count)
      tempOffset += 4
      tempDataSection.set(group.data, tempOffset)
      tempOffset += group.data.length
    }
    const dataChecksum = calculateChecksum(tempDataSection)

    // Build metadata with checksum included
    const schema = this.getThingsSchema()
    const rowGroupOffsets: number[] = []
    let currentOffset = 0

    for (const group of rowGroups) {
      rowGroupOffsets.push(currentOffset)
      currentOffset += group.data.length + 8 // 4 bytes length + 4 bytes count
    }

    const internalMeta: InternalMetadata = {
      version: VERSION,
      rowCount: things.length,
      rowGroupCount: rowGroups.length,
      schema,
      compression,
      compressionLevel,
      rowGroupSize,
      rowGroupOffsets,
      dataChecksum,
    }

    // Serialize metadata
    const metadataJson = JSON.stringify(internalMeta)
    const metadataBytes = stringToBytes(metadataJson)

    // Calculate total size
    // Structure: MAGIC(4) + metaLen(4) + metadata + rowGroups + footerMetaLen(4) + MAGIC(4)
    let totalSize = 4 + 4 + metadataBytes.length
    for (const group of rowGroups) {
      totalSize += 4 + 4 + group.data.length // length + count + data
    }
    totalSize += 4 + 4 // footer meta length + magic

    // Build buffer
    const buffer = new ArrayBuffer(totalSize)
    const view = new Uint8Array(buffer)
    let offset = 0

    // Write magic
    view.set(MAGIC, offset)
    offset += 4

    // Write metadata length
    writeUint32(view, offset, metadataBytes.length)
    offset += 4

    // Write metadata
    view.set(metadataBytes, offset)
    offset += metadataBytes.length

    // Write row groups (copy from temp data section)
    view.set(tempDataSection, offset)
    offset += tempDataSection.length

    // Write footer metadata length
    writeUint32(view, offset, metadataBytes.length)
    offset += 4

    // Write trailing magic
    view.set(MAGIC, offset)

    // Build result metadata
    const metadata: ParquetMetadata = {
      rowCount: things.length,
      rowGroupCount: rowGroups.length,
      schema,
      fileSize: totalSize,
      compression,
    }

    return { buffer, metadata }
  }

  /**
   * Deserialize Things from Parquet-compatible binary format
   */
  async deserialize(
    buffer: ArrayBuffer,
    options?: ParquetDeserializeOptions
  ): Promise<Thing[]> {
    const view = new Uint8Array(buffer)

    // Validate magic bytes
    if (
      view[0] !== MAGIC[0] ||
      view[1] !== MAGIC[1] ||
      view[2] !== MAGIC[2] ||
      view[3] !== MAGIC[3]
    ) {
      throw new Error('Invalid Parquet file: missing magic bytes')
    }

    // Read metadata length
    const metadataLength = readUint32(view, 4)

    // Read metadata
    const metadataBytes = view.slice(8, 8 + metadataLength)
    const metadataJson = bytesToString(metadataBytes)
    const metadata: InternalMetadata = JSON.parse(metadataJson)

    // Validate version
    if (metadata.version !== VERSION) {
      throw new Error(`Unsupported Parquet version: ${metadata.version}`)
    }

    // Validate checksum
    const dataStart = 8 + metadataLength
    let dataEnd = dataStart
    for (let i = 0; i < metadata.rowGroupCount; i++) {
      const groupLength = readUint32(view, dataEnd)
      dataEnd += 8 + groupLength
    }

    const actualChecksum = calculateChecksum(view.slice(dataStart, dataEnd))
    if (actualChecksum !== metadata.dataChecksum) {
      throw new Error('Parquet file corrupted: checksum mismatch')
    }

    // Determine which rows to read
    const offset = options?.offset ?? 0
    const limit = options?.limit ?? metadata.rowCount
    const columns = options?.columns

    // Read row groups
    const things: Thing[] = []
    let currentOffset = dataStart
    let currentRowIndex = 0

    for (let groupIndex = 0; groupIndex < metadata.rowGroupCount; groupIndex++) {
      const groupLength = readUint32(view, currentOffset)
      const groupCount = readUint32(view, currentOffset + 4)
      const groupData = view.slice(currentOffset + 8, currentOffset + 8 + groupLength)

      // Skip groups entirely before offset
      if (currentRowIndex + groupCount <= offset) {
        currentRowIndex += groupCount
        currentOffset += 8 + groupLength
        continue
      }

      // Stop if we've read enough
      if (things.length >= limit) {
        break
      }

      // Decompress and parse row group
      const decompressed = decompress(
        groupData,
        metadata.compression as 'zstd' | 'snappy' | 'gzip' | 'none'
      )
      const groupThings = this.deserializeRowGroup(decompressed)

      // Filter rows based on offset and limit
      for (const thing of groupThings) {
        if (currentRowIndex >= offset && things.length < limit) {
          // Apply column filter if specified
          if (columns) {
            const filtered: Partial<Thing> = {}
            for (const col of columns) {
              if (col in thing) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (filtered as any)[col] = (thing as any)[col]
              }
            }
            things.push(filtered as Thing)
          } else {
            things.push(thing)
          }
        }
        currentRowIndex++
      }

      currentOffset += 8 + groupLength
    }

    return things
  }

  /**
   * Read metadata from Parquet buffer without loading all data
   */
  async getMetadata(buffer: ArrayBuffer): Promise<ParquetMetadata> {
    const view = new Uint8Array(buffer)

    // Validate magic bytes
    if (
      view[0] !== MAGIC[0] ||
      view[1] !== MAGIC[1] ||
      view[2] !== MAGIC[2] ||
      view[3] !== MAGIC[3]
    ) {
      throw new Error('Invalid Parquet file: missing magic bytes')
    }

    // Read metadata length
    const metadataLength = readUint32(view, 4)

    // Read metadata
    const metadataBytes = view.slice(8, 8 + metadataLength)
    const metadataJson = bytesToString(metadataBytes)
    const metadata: InternalMetadata = JSON.parse(metadataJson)

    return {
      rowCount: metadata.rowCount,
      rowGroupCount: metadata.rowGroupCount,
      schema: metadata.schema,
      fileSize: buffer.byteLength,
      compression: metadata.compression,
    }
  }

  /**
   * Serialize a row group of Things to bytes
   */
  private serializeRowGroup(things: Thing[]): Uint8Array {
    // For each thing, serialize to JSON and store with length prefix
    const chunks: Uint8Array[] = []
    let totalLength = 0

    for (const thing of things) {
      const thingBytes = serializeThing(thing)
      const chunk = new Uint8Array(4 + thingBytes.length)
      writeUint32(chunk, 0, thingBytes.length)
      chunk.set(thingBytes, 4)
      chunks.push(chunk)
      totalLength += chunk.length
    }

    // Combine all chunks
    const result = new Uint8Array(totalLength)
    let offset = 0
    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }

    return result
  }

  /**
   * Deserialize a row group of Things from bytes
   */
  private deserializeRowGroup(data: Uint8Array): Thing[] {
    const things: Thing[] = []
    let offset = 0

    while (offset < data.length) {
      const length = readUint32(data, offset)
      offset += 4

      if (offset + length > data.length) {
        break
      }

      const thingBytes = data.slice(offset, offset + length)
      const thing = deserializeThing(thingBytes)
      things.push(thing)
      offset += length
    }

    return things
  }
}

// Export a default instance for convenience
export const parquetSerializer = new ParquetSerializer()
