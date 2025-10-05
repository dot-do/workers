/**
 * Asset Storage System
 *
 * Handles content-addressed storage of MDX assets:
 * - R2 for blob storage (JSON, AST, ESM, HTML)
 * - R2 SQL for queryable metadata
 * - Deduplication via content hashing
 * - Atomic operations for consistency
 */

import { generateR2Key, hashContent, type AssetType, type MdxAsset, type MdxFile } from '../schema'

export interface StorageEnv {
  MDX_ASSETS: R2Bucket
  MDX_METADATA: D1Database
}

// ============================================================================
// Asset Storage Manager
// ============================================================================

export class AssetStorage {
  constructor(private env: StorageEnv) {}

  /**
   * Store an asset with content-addressed storage
   * Returns existing asset if content hash matches (deduplication)
   */
  async storeAsset(params: {
    fileId: string
    type: AssetType
    content: string | ArrayBuffer
    metadata?: Record<string, unknown>
  }): Promise<MdxAsset> {
    const { fileId, type, content, metadata } = params

    // Hash the content
    const hash = await hashContent(content)
    const size = typeof content === 'string' ? new TextEncoder().encode(content).length : content.byteLength

    // Check if asset already exists with same hash
    const existingAsset = await this.getAssetByHash(fileId, type, hash)
    if (existingAsset) {
      return existingAsset
    }

    // Generate content-addressed R2 key
    const r2Key = generateR2Key(type, hash)

    // Store blob in R2 (only if not already present)
    const existingBlob = await this.env.MDX_ASSETS.head(r2Key)
    if (!existingBlob) {
      await this.env.MDX_ASSETS.put(r2Key, content, {
        httpMetadata: {
          contentType: this.getContentType(type),
        },
        customMetadata: {
          type,
          hash,
          fileId,
        },
      })
    }

    // Store metadata in D1
    const asset: MdxAsset = {
      id: crypto.randomUUID(),
      file_id: fileId,
      type,
      hash,
      size,
      r2_key: r2Key,
      created_at: new Date().toISOString(),
      metadata,
    }

    await this.env.MDX_METADATA.prepare(
      `INSERT INTO mdx_assets (id, file_id, type, hash, size, r2_key, created_at, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(file_id, type) DO UPDATE SET
         hash = excluded.hash,
         size = excluded.size,
         r2_key = excluded.r2_key,
         created_at = excluded.created_at,
         metadata = excluded.metadata`
    ).bind(
      asset.id,
      asset.file_id,
      asset.type,
      asset.hash,
      asset.size,
      asset.r2_key,
      asset.created_at,
      JSON.stringify(asset.metadata || {})
    ).run()

    return asset
  }

  /**
   * Retrieve asset content from R2
   */
  async getAssetContent(asset: MdxAsset): Promise<ArrayBuffer | null> {
    const object = await this.env.MDX_ASSETS.get(asset.r2_key)
    if (!object) return null
    return object.arrayBuffer()
  }

  /**
   * Retrieve asset by file ID and type
   */
  async getAsset(fileId: string, type: AssetType): Promise<MdxAsset | null> {
    const result = await this.env.MDX_METADATA.prepare(`SELECT * FROM mdx_assets WHERE file_id = ? AND type = ? LIMIT 1`).bind(fileId,
      type
    ).all()

    if (result.rows.length === 0) return null

    const row = result.rows[0] as Record<string, unknown>
    return {
      id: row.id as string,
      file_id: row.file_id as string,
      type: row.type as AssetType,
      hash: row.hash as string,
      size: row.size as number,
      r2_key: row.r2_key as string,
      created_at: row.created_at as string,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    }
  }

  /**
   * Get asset by content hash (for deduplication check)
   */
  async getAssetByHash(fileId: string, type: AssetType, hash: string): Promise<MdxAsset | null> {
    const result = await this.env.MDX_METADATA.prepare(`SELECT * FROM mdx_assets WHERE file_id = ? AND type = ? AND hash = ? LIMIT 1`).bind(fileId,
      type,
      hash
    ).all()

    if (result.rows.length === 0) return null

    const row = result.rows[0] as Record<string, unknown>
    return {
      id: row.id as string,
      file_id: row.file_id as string,
      type: row.type as AssetType,
      hash: row.hash as string,
      size: row.size as number,
      r2_key: row.r2_key as string,
      created_at: row.created_at as string,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    }
  }

  /**
   * List all assets for a file
   */
  async listAssets(fileId: string): Promise<MdxAsset[]> {
    const result = await this.env.MDX_METADATA.prepare(`SELECT * FROM mdx_assets WHERE file_id = ? ORDER BY created_at DESC`).bind(fileId).all()

    return result.rows.map((row: unknown) => {
      const r = row as Record<string, unknown>
      return {
        id: r.id as string,
        file_id: r.file_id as string,
        type: r.type as AssetType,
        hash: r.hash as string,
        size: r.size as number,
        r2_key: r.r2_key as string,
        created_at: r.created_at as string,
        metadata: r.metadata ? JSON.parse(r.metadata as string) : undefined,
      }
    })
  }

  /**
   * Store MDX file metadata
   */
  async storeFile(params: { repo: string; path: string; content: string; metadata?: Record<string, unknown> }): Promise<MdxFile> {
    const { repo, path, content, metadata } = params

    const hash = await hashContent(content)
    const size = new TextEncoder().encode(content).length

    // Check if file already exists
    const existingFile = await this.getFileByPath(repo, path)

    const file: MdxFile = {
      id: existingFile?.id || crypto.randomUUID(),
      repo,
      path,
      hash,
      size,
      created_at: existingFile?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      metadata,
    }

    await this.env.MDX_METADATA.prepare(`INSERT INTO mdx_files (id, repo, path, hash, size, created_at, updated_at, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(repo, path) DO UPDATE SET
         hash = excluded.hash,
         size = excluded.size,
         updated_at = excluded.updated_at,
         metadata = excluded.metadata`).bind(
      file.id,
      file.repo,
      file.path,
      file.hash,
      file.size,
      file.created_at,
      file.updated_at,
      JSON.stringify(file.metadata || {})
    ).run()

    return file
  }

  /**
   * Get file by repo and path
   */
  async getFileByPath(repo: string, path: string): Promise<MdxFile | null> {
    const result = await this.env.MDX_METADATA.prepare(`SELECT * FROM mdx_files WHERE repo = ? AND path = ? LIMIT 1`).bind(repo, path).all()

    if (result.rows.length === 0) return null

    const row = result.rows[0] as Record<string, unknown>
    return {
      id: row.id as string,
      repo: row.repo as string,
      path: row.path as string,
      hash: row.hash as string,
      size: row.size as number,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    }
  }

  /**
   * Get file by ID
   */
  async getFile(fileId: string): Promise<MdxFile | null> {
    const result = await this.env.MDX_METADATA.prepare(`SELECT * FROM mdx_files WHERE id = ? LIMIT 1`).bind(fileId).all()

    if (result.rows.length === 0) return null

    const row = result.rows[0] as Record<string, unknown>
    return {
      id: row.id as string,
      repo: row.repo as string,
      path: row.path as string,
      hash: row.hash as string,
      size: row.size as number,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    }
  }

  /**
   * List files in a repo
   */
  async listFiles(repo: string, limit = 100, offset = 0): Promise<MdxFile[]> {
    const result = await this.env.MDX_METADATA.prepare(`SELECT * FROM mdx_files WHERE repo = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?`).bind(repo,
      limit,
      offset
    ).all()

    return result.rows.map((row: unknown) => {
      const r = row as Record<string, unknown>
      return {
        id: r.id as string,
        repo: r.repo as string,
        path: r.path as string,
        hash: r.hash as string,
        size: r.size as number,
        created_at: r.created_at as string,
        updated_at: r.updated_at as string,
        metadata: r.metadata ? JSON.parse(r.metadata as string) : undefined,
      }
    })
  }

  /**
   * Get content type for asset type
   */
  private getContentType(type: AssetType): string {
    switch (type) {
      case 'json':
        return 'application/json'
      case 'ast':
        return 'application/json'
      case 'esm':
        return 'application/javascript'
      case 'html':
        return 'text/html'
      case 'source':
        return 'text/markdown'
      default:
        return 'application/octet-stream'
    }
  }
}
