/**
 * DatasetR2Storage - Dataset storage in Cloudflare R2
 *
 * Implements upload, download, chunking, and metadata management
 * for datasets used in evaluations.
 *
 * GREEN phase implementation for workers-02o1
 */

import { createHash } from 'crypto'

/**
 * R2 Bucket interface
 */
export interface R2Bucket {
  put(key: string, value: ReadableStream | ArrayBuffer | string, options?: {
    httpMetadata?: {
      contentType?: string
    }
    customMetadata?: Record<string, string>
  }): Promise<any>

  get(key: string): Promise<{
    body: ReadableStream<Uint8Array>
    size: number
    etag: string
    httpMetadata?: any
    customMetadata?: Record<string, string>
  } | null>

  delete(key: string): Promise<void>

  head(key: string): Promise<any>

  list(options?: { prefix?: string; limit?: number }): Promise<{
    objects: Array<{ key: string; size: number; etag: string; uploaded: Date }>
    truncated: boolean
  }>
}

/**
 * Dataset metadata stored in SQLite
 */
export interface DatasetMetadata {
  id: string
  name: string
  format: 'json' | 'jsonl' | 'csv' | 'parquet'
  size: number
  recordCount: number
  checksum: string
  r2Key: string
  createdAt: Date
  updatedAt: Date
  metadata?: Record<string, unknown>
}

/**
 * Options for uploading a dataset
 */
export interface UploadOptions {
  format?: 'json' | 'jsonl' | 'csv' | 'parquet'
  chunkSize?: number
  metadata?: Record<string, unknown>
}

/**
 * Options for downloading a dataset
 */
export interface DownloadOptions {
  offset?: number
  limit?: number
}

/**
 * Database interface for metadata storage
 */
export interface DatasetDb {
  insertDataset(metadata: DatasetMetadata): Promise<void>
  getDataset(id: string): Promise<DatasetMetadata | null>
  listDatasets(options?: { limit?: number; offset?: number }): Promise<DatasetMetadata[]>
  deleteDataset(id: string): Promise<boolean>
  updateDataset(id: string, updates: Partial<DatasetMetadata>): Promise<void>
}

/**
 * DatasetR2Storage - Manages dataset storage in R2 and metadata in SQLite
 */
export class DatasetR2Storage {
  constructor(
    private r2: R2Bucket,
    private db: DatasetDb
  ) {}

  /**
   * Upload a dataset to R2
   */
  async upload(
    datasetId: string,
    data: string | ArrayBuffer,
    options: UploadOptions = {}
  ): Promise<DatasetMetadata> {
    const format = options.format || 'json'
    const customMetadata = options.metadata || {}

    // Validate format
    if (!['json', 'jsonl', 'csv', 'parquet'].includes(format)) {
      throw new Error(`Invalid format: ${format}`)
    }

    // Convert to string if ArrayBuffer
    const dataString = data instanceof ArrayBuffer
      ? new TextDecoder().decode(data)
      : data

    // Calculate checksum
    const checksum = this.calculateChecksum(dataString)

    // Count records based on format
    const recordCount = this.countRecords(dataString, format)

    // Generate R2 key
    const r2Key = `datasets/${datasetId}-${Date.now()}.${format}`

    // Upload to R2
    try {
      await this.r2.put(r2Key, dataString, {
        httpMetadata: {
          contentType: this.getContentType(format),
        },
        customMetadata: {
          datasetId,
          format,
          checksum,
          ...Object.fromEntries(
            Object.entries(customMetadata).map(([k, v]) => [k, String(v)])
          ),
        },
      })
    } catch (error) {
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Create metadata
    const metadata: DatasetMetadata = {
      id: datasetId,
      name: datasetId,
      format,
      size: dataString.length,
      recordCount,
      checksum,
      r2Key,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: customMetadata,
    }

    // Store metadata in database
    await this.db.insertDataset(metadata)

    return metadata
  }

  /**
   * Download a dataset from R2
   */
  async download(datasetId: string, options: DownloadOptions = {}): Promise<string> {
    // Get metadata
    const metadata = await this.db.getDataset(datasetId)
    if (!metadata) {
      throw new Error(`Dataset not found: ${datasetId}`)
    }

    // Get from R2
    const object = await this.r2.get(metadata.r2Key)
    if (!object) {
      throw new Error(`Dataset not found in R2: ${datasetId}`)
    }

    // Read the body
    const data = await this.streamToString(object.body)

    // Handle offset/limit for JSONL format
    if (options.offset !== undefined || options.limit !== undefined) {
      return this.sliceData(data, metadata.format, options.offset, options.limit)
    }

    return data
  }

  /**
   * Get dataset metadata
   */
  async getMetadata(datasetId: string): Promise<DatasetMetadata | null> {
    return await this.db.getDataset(datasetId)
  }

  /**
   * List all datasets
   */
  async list(options: { limit?: number; offset?: number } = {}): Promise<DatasetMetadata[]> {
    return await this.db.listDatasets(options)
  }

  /**
   * Delete a dataset
   */
  async delete(datasetId: string): Promise<boolean> {
    const metadata = await this.db.getDataset(datasetId)
    if (!metadata) {
      return false
    }

    // Delete from R2
    await this.r2.delete(metadata.r2Key)

    // Delete metadata
    return await this.db.deleteDataset(datasetId)
  }

  /**
   * Check if a dataset exists
   */
  async exists(datasetId: string): Promise<boolean> {
    const metadata = await this.db.getDataset(datasetId)
    return metadata !== null
  }

  /**
   * Calculate MD5 checksum for data
   */
  private calculateChecksum(data: string): string {
    return createHash('md5').update(data).digest('hex')
  }

  /**
   * Count records in dataset based on format
   */
  private countRecords(data: string, format: string): number {
    switch (format) {
      case 'json':
        try {
          const parsed = JSON.parse(data)
          return Array.isArray(parsed) ? parsed.length : 1
        } catch {
          return 0
        }

      case 'jsonl':
        return data
          .trim()
          .split('\n')
          .filter(line => line.trim().length > 0).length

      case 'csv':
        const lines = data.trim().split('\n')
        // Subtract 1 for header row
        return Math.max(0, lines.length - 1)

      case 'parquet':
        // Parquet record counting would require parsing the binary format
        // For now, return 0 as a placeholder
        return 0

      default:
        return 0
    }
  }

  /**
   * Get content type for format
   */
  private getContentType(format: string): string {
    switch (format) {
      case 'json':
        return 'application/json'
      case 'jsonl':
        return 'application/x-ndjson'
      case 'csv':
        return 'text/csv'
      case 'parquet':
        return 'application/octet-stream'
      default:
        return 'application/octet-stream'
    }
  }

  /**
   * Convert ReadableStream to string
   */
  private async streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
    const reader = stream.getReader()
    const chunks: Uint8Array[] = []

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    const result = new Uint8Array(totalLength)
    let offset = 0

    for (const chunk of chunks) {
      result.set(chunk, offset)
      offset += chunk.length
    }

    return new TextDecoder().decode(result)
  }

  /**
   * Slice data for partial downloads (offset/limit)
   */
  private sliceData(
    data: string,
    format: string,
    offset: number = 0,
    limit?: number
  ): string {
    if (format === 'jsonl') {
      const lines = data.trim().split('\n')
      const start = offset
      const end = limit !== undefined ? start + limit : undefined
      return lines.slice(start, end).join('\n')
    }

    if (format === 'csv') {
      const lines = data.trim().split('\n')
      const header = lines[0]
      const dataLines = lines.slice(1)
      const start = offset
      const end = limit !== undefined ? start + limit : undefined
      const sliced = dataLines.slice(start, end)
      return [header, ...sliced].join('\n')
    }

    if (format === 'json') {
      try {
        const parsed = JSON.parse(data)
        if (Array.isArray(parsed)) {
          const start = offset
          const end = limit !== undefined ? start + limit : undefined
          return JSON.stringify(parsed.slice(start, end))
        }
      } catch {
        // Fall through to return full data
      }
    }

    // For other formats or errors, return full data
    return data
  }
}
