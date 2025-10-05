/**
 * Query API for MDX Assets
 *
 * Provides high-level query interface for:
 * - Finding assets by various criteria
 * - Dependency graph traversal
 * - Version history queries
 * - Deployment tracking
 * - Analytics and statistics
 */

import type { StorageEnv } from './storage'
import type { MdxAsset, MdxDependency, MdxFile, MdxVersion } from './schema'

// ============================================================================
// Query Interface
// ============================================================================

export class AssetQuery {
  constructor(private env: StorageEnv) {}

  /**
   * Find assets by file path
   */
  async findAssetsByPath(repo: string, path: string): Promise<(MdxAsset & { file: MdxFile })[]> {
    const result = await this.env.MDX_METADATA.prepare(
      `SELECT a.*, f.* FROM mdx_assets a
       JOIN mdx_files f ON a.file_id = f.id
       WHERE f.repo = ? AND f.path = ?
       ORDER BY a.created_at DESC`,
      repo,
      path
    )

    return result.rows.map((row: unknown) => this.parseAssetWithFile(row))
  }

  /**
   * Find assets by content hash (deduplication detection)
   */
  async findAssetsByHash(hash: string): Promise<(MdxAsset & { file: MdxFile })[]> {
    const result = await this.env.MDX_METADATA.prepare(
      `SELECT a.*, f.* FROM mdx_assets a
       JOIN mdx_files f ON a.file_id = f.id
       WHERE a.hash = ?
       ORDER BY a.created_at DESC`,
      hash
    )

    return result.rows.map((row: unknown) => this.parseAssetWithFile(row))
  }

  /**
   * Find assets by version tag
   */
  async findAssetsByTag(tag: string): Promise<(MdxAsset & { file: MdxFile; version: MdxVersion })[]> {
    const result = await this.env.MDX_METADATA.prepare(
      `SELECT a.*, f.*, v.* FROM mdx_assets a
       JOIN mdx_files f ON a.file_id = f.id
       JOIN mdx_versions v ON v.file_id = f.id
       WHERE v.tag = ?
       ORDER BY v.created_at DESC`,
      tag
    )

    return result.rows.map((row: unknown) => this.parseAssetWithFileAndVersion(row))
  }

  /**
   * Get dependency graph for a file
   */
  async getDependencies(fileId: string, recursive = false): Promise<MdxDependency[]> {
    if (!recursive) {
      const result = await this.env.MDX_METADATA.prepare(
        `SELECT d.* FROM mdx_dependencies d
         WHERE d.source_file_id = ?`,
        fileId
      )
      return result.rows.map((row: unknown) => this.parseDependency(row))
    }

    // Recursive CTE query for full dependency tree
    const result = await this.env.MDX_METADATA.prepare(
      `WITH RECURSIVE dep_tree AS (
         SELECT d.* FROM mdx_dependencies d WHERE d.source_file_id = ?
         UNION ALL
         SELECT d.* FROM mdx_dependencies d
         JOIN dep_tree dt ON d.source_file_id = dt.target_file_id
       )
       SELECT DISTINCT * FROM dep_tree`,
      fileId
    )

    return result.rows.map((row: unknown) => this.parseDependency(row))
  }

  /**
   * Get files that depend on this file (reverse dependencies)
   */
  async getDependents(fileId: string, recursive = false): Promise<MdxDependency[]> {
    if (!recursive) {
      const result = await this.env.MDX_METADATA.prepare(
        `SELECT d.* FROM mdx_dependencies d
         WHERE d.target_file_id = ?`,
        fileId
      )
      return result.rows.map((row: unknown) => this.parseDependency(row))
    }

    // Recursive CTE query for full dependent tree
    const result = await this.env.MDX_METADATA.prepare(
      `WITH RECURSIVE dep_tree AS (
         SELECT d.* FROM mdx_dependencies d WHERE d.target_file_id = ?
         UNION ALL
         SELECT d.* FROM mdx_dependencies d
         JOIN dep_tree dt ON d.target_file_id = dt.source_file_id
       )
       SELECT DISTINCT * FROM dep_tree`,
      fileId
    )

    return result.rows.map((row: unknown) => this.parseDependency(row))
  }

  /**
   * Get version history for a file
   */
  async getVersionHistory(fileId: string, limit = 10): Promise<MdxVersion[]> {
    const result = await this.env.MDX_METADATA.prepare(
      `SELECT * FROM mdx_versions
       WHERE file_id = ?
       ORDER BY version DESC
       LIMIT ?`,
      fileId,
      limit
    )

    return result.rows.map((row: unknown) => this.parseVersion(row))
  }

  /**
   * Get recently updated files
   */
  async getRecentFiles(repo?: string, limit = 20): Promise<MdxFile[]> {
    const query = repo
      ? `SELECT * FROM mdx_files WHERE repo = ? ORDER BY updated_at DESC LIMIT ?`
      : `SELECT * FROM mdx_files ORDER BY updated_at DESC LIMIT ?`

    const params = repo ? [repo, limit] : [limit]
    const result = await this.env.MDX_METADATA.prepare(query, ...params)

    return result.rows.map((row: unknown) => this.parseFile(row))
  }

  /**
   * Get asset statistics for a repo
   */
  async getRepoStats(repo: string): Promise<{
    fileCount: number
    totalSize: number
    assetCount: number
    assetsByType: Record<string, number>
  }> {
    const fileStats = await this.env.MDX_METADATA.prepare(`SELECT COUNT(*) as count, SUM(size) as total_size FROM mdx_files WHERE repo = ?`, repo)

    const assetStats = await this.env.MDX_METADATA.prepare(
      `SELECT a.type, COUNT(*) as count
       FROM mdx_assets a
       JOIN mdx_files f ON a.file_id = f.id
       WHERE f.repo = ?
       GROUP BY a.type`,
      repo
    )

    const fileStatsRow = fileStats.rows[0] as { count: number; total_size: number }
    const assetsByType: Record<string, number> = {}

    for (const row of assetStats.rows) {
      const r = row as { type: string; count: number }
      assetsByType[r.type] = r.count
    }

    return {
      fileCount: fileStatsRow.count,
      totalSize: fileStatsRow.total_size,
      assetCount: assetStats.rows.length,
      assetsByType,
    }
  }

  /**
   * Search files by content (requires full-text search setup)
   */
  async searchFiles(query: string, repo?: string, limit = 20): Promise<MdxFile[]> {
    // Simple LIKE search for now - could be enhanced with FTS5
    const searchQuery = repo
      ? `SELECT * FROM mdx_files WHERE repo = ? AND (path LIKE ? OR metadata LIKE ?) ORDER BY updated_at DESC LIMIT ?`
      : `SELECT * FROM mdx_files WHERE (path LIKE ? OR metadata LIKE ?) ORDER BY updated_at DESC LIMIT ?`

    const searchPattern = `%${query}%`
    const params = repo ? [repo, searchPattern, searchPattern, limit] : [searchPattern, searchPattern, limit]

    const result = await this.env.MDX_METADATA.prepare(searchQuery, ...params)

    return result.rows.map((row: unknown) => this.parseFile(row))
  }

  /**
   * Get files with missing assets (incomplete compilations)
   */
  async getIncompleteFiles(repo?: string): Promise<MdxFile[]> {
    const query = repo
      ? `SELECT f.* FROM mdx_files f
         LEFT JOIN mdx_assets a ON a.file_id = f.id
         WHERE f.repo = ?
         GROUP BY f.id
         HAVING COUNT(DISTINCT a.type) < 4` // Expecting json, ast, esm, html
      : `SELECT f.* FROM mdx_files f
         LEFT JOIN mdx_assets a ON a.file_id = f.id
         GROUP BY f.id
         HAVING COUNT(DISTINCT a.type) < 4`

    const params = repo ? [repo] : []
    const result = await this.env.MDX_METADATA.prepare(query, ...params)

    return result.rows.map((row: unknown) => this.parseFile(row))
  }

  /**
   * Get duplicate content (different files with same asset hash)
   */
  async getDuplicateContent(minDuplicates = 2): Promise<
    Array<{
      hash: string
      type: string
      count: number
      files: Array<{ id: string; repo: string; path: string }>
    }>
  > {
    const result = await this.env.MDX_METADATA.prepare(
      `SELECT a.hash, a.type, COUNT(*) as count,
              GROUP_CONCAT(f.id || ':' || f.repo || ':' || f.path) as files
       FROM mdx_assets a
       JOIN mdx_files f ON a.file_id = f.id
       GROUP BY a.hash, a.type
       HAVING count >= ?
       ORDER BY count DESC`,
      minDuplicates
    )

    return result.rows.map((row: unknown) => {
      const r = row as { hash: string; type: string; count: number; files: string }
      return {
        hash: r.hash,
        type: r.type,
        count: r.count,
        files: r.files.split(',').map(fileStr => {
          const [id, repo, path] = fileStr.split(':')
          return { id, repo, path }
        }),
      }
    })
  }

  // ============================================================================
  // Helper Parsers
  // ============================================================================

  private parseFile(row: unknown): MdxFile {
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
  }

  private parseAsset(row: unknown): MdxAsset {
    const r = row as Record<string, unknown>
    return {
      id: r.id as string,
      file_id: r.file_id as string,
      type: r.type as any,
      hash: r.hash as string,
      size: r.size as number,
      r2_key: r.r2_key as string,
      created_at: r.created_at as string,
      metadata: r.metadata ? JSON.parse(r.metadata as string) : undefined,
    }
  }

  private parseAssetWithFile(row: unknown): MdxAsset & { file: MdxFile } {
    const asset = this.parseAsset(row)
    const file = this.parseFile(row)
    return { ...asset, file }
  }

  private parseAssetWithFileAndVersion(row: unknown): MdxAsset & { file: MdxFile; version: MdxVersion } {
    const asset = this.parseAsset(row)
    const file = this.parseFile(row)
    const version = this.parseVersion(row)
    return { ...asset, file, version }
  }

  private parseDependency(row: unknown): MdxDependency {
    const r = row as Record<string, unknown>
    return {
      id: r.id as string,
      source_file_id: r.source_file_id as string,
      target_file_id: r.target_file_id as string,
      type: r.type as any,
      created_at: r.created_at as string,
    }
  }

  private parseVersion(row: unknown): MdxVersion {
    const r = row as Record<string, unknown>
    return {
      id: r.id as string,
      file_id: r.file_id as string,
      version: r.version as number,
      hash: r.hash as string,
      tag: r.tag as string | undefined,
      author: r.author as string | undefined,
      message: r.message as string | undefined,
      created_at: r.created_at as string,
    }
  }
}
