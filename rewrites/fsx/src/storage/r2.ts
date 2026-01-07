/**
 * R2Storage - R2-backed blob storage for fsx
 */

export interface R2StorageConfig {
  /** R2 bucket binding */
  bucket: R2Bucket
  /** Key prefix for all objects */
  prefix?: string
}

/**
 * R2Storage - Store blobs in R2
 */
export class R2Storage {
  private bucket: R2Bucket
  private prefix: string

  constructor(config: R2StorageConfig) {
    this.bucket = config.bucket
    this.prefix = config.prefix || ''
  }

  /**
   * Get full key with prefix
   */
  private key(path: string): string {
    return this.prefix + path
  }

  /**
   * Store a blob
   */
  async put(path: string, data: Uint8Array | ReadableStream, options?: { contentType?: string; customMetadata?: Record<string, string> }): Promise<{ etag: string; size: number }> {
    const key = this.key(path)

    const object = await this.bucket.put(key, data, {
      httpMetadata: options?.contentType ? { contentType: options.contentType } : undefined,
      customMetadata: options?.customMetadata,
    })

    return {
      etag: object.etag,
      size: object.size,
    }
  }

  /**
   * Get a blob
   */
  async get(path: string): Promise<{ data: Uint8Array; metadata: R2Object } | null> {
    const key = this.key(path)
    const object = await this.bucket.get(key)

    if (!object) {
      return null
    }

    const data = new Uint8Array(await object.arrayBuffer())
    return { data, metadata: object }
  }

  /**
   * Get a blob as a stream
   */
  async getStream(path: string): Promise<{ stream: ReadableStream; metadata: R2Object } | null> {
    const key = this.key(path)
    const object = await this.bucket.get(key)

    if (!object) {
      return null
    }

    return { stream: object.body, metadata: object }
  }

  /**
   * Get a range of a blob
   */
  async getRange(path: string, start: number, end?: number): Promise<{ data: Uint8Array; metadata: R2Object } | null> {
    const key = this.key(path)
    const range = end !== undefined ? { offset: start, length: end - start + 1 } : { offset: start }
    const object = await this.bucket.get(key, { range })

    if (!object) {
      return null
    }

    const data = new Uint8Array(await object.arrayBuffer())
    return { data, metadata: object }
  }

  /**
   * Delete a blob
   */
  async delete(path: string): Promise<void> {
    const key = this.key(path)
    await this.bucket.delete(key)
  }

  /**
   * Delete multiple blobs
   */
  async deleteMany(paths: string[]): Promise<void> {
    const keys = paths.map((p) => this.key(p))
    await this.bucket.delete(keys)
  }

  /**
   * Check if blob exists
   */
  async exists(path: string): Promise<boolean> {
    const key = this.key(path)
    const object = await this.bucket.head(key)
    return object !== null
  }

  /**
   * Get blob metadata without downloading
   */
  async head(path: string): Promise<R2Object | null> {
    const key = this.key(path)
    return this.bucket.head(key)
  }

  /**
   * List blobs
   */
  async list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{
    objects: R2Object[]
    cursor?: string
    truncated: boolean
  }> {
    const fullPrefix = options?.prefix ? this.key(options.prefix) : this.prefix

    const result = await this.bucket.list({
      prefix: fullPrefix,
      limit: options?.limit,
      cursor: options?.cursor,
    })

    return {
      objects: result.objects,
      cursor: result.cursor,
      truncated: result.truncated,
    }
  }

  /**
   * Copy a blob
   */
  async copy(sourcePath: string, destPath: string): Promise<{ etag: string; size: number }> {
    const sourceKey = this.key(sourcePath)
    const destKey = this.key(destPath)

    // R2 doesn't have native copy, so we need to get and put
    const source = await this.bucket.get(sourceKey)
    if (!source) {
      throw new Error(`Source not found: ${sourcePath}`)
    }

    const object = await this.bucket.put(destKey, source.body, {
      httpMetadata: source.httpMetadata,
      customMetadata: source.customMetadata,
    })

    return {
      etag: object.etag,
      size: object.size,
    }
  }

  /**
   * Create a multipart upload
   */
  async createMultipartUpload(path: string, options?: { contentType?: string; customMetadata?: Record<string, string> }): Promise<R2MultipartUpload> {
    const key = this.key(path)
    return this.bucket.createMultipartUpload(key, {
      httpMetadata: options?.contentType ? { contentType: options.contentType } : undefined,
      customMetadata: options?.customMetadata,
    })
  }

  /**
   * Resume a multipart upload
   */
  resumeMultipartUpload(path: string, uploadId: string): R2MultipartUpload {
    const key = this.key(path)
    return this.bucket.resumeMultipartUpload(key, uploadId)
  }
}
