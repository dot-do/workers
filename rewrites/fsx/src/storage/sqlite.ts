/**
 * SQLiteMetadata - SQLite-backed metadata store for fsx
 *
 * Stores filesystem metadata in SQLite (via Durable Objects or D1).
 */

import type { FileEntry, FileType, BlobRef } from '../core/types.js'

/**
 * SQLiteMetadata - Filesystem metadata backed by SQLite
 */
export class SQLiteMetadata {
  private sql: SqlStorage

  constructor(sql: SqlStorage) {
    this.sql = sql
  }

  /**
   * Initialize the database schema
   */
  async init(): Promise<void> {
    await this.sql.exec(`
      CREATE TABLE IF NOT EXISTS files (
        id TEXT PRIMARY KEY,
        path TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        parent_id TEXT,
        type TEXT NOT NULL,
        mode INTEGER NOT NULL DEFAULT 420,
        uid INTEGER NOT NULL DEFAULT 0,
        gid INTEGER NOT NULL DEFAULT 0,
        size INTEGER NOT NULL DEFAULT 0,
        blob_id TEXT,
        link_target TEXT,
        atime INTEGER NOT NULL,
        mtime INTEGER NOT NULL,
        ctime INTEGER NOT NULL,
        birthtime INTEGER NOT NULL,
        nlink INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (parent_id) REFERENCES files(id)
      );

      CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
      CREATE INDEX IF NOT EXISTS idx_files_parent ON files(parent_id);

      CREATE TABLE IF NOT EXISTS blobs (
        id TEXT PRIMARY KEY,
        tier TEXT NOT NULL DEFAULT 'hot',
        size INTEGER NOT NULL,
        checksum TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_blobs_tier ON blobs(tier);
    `)

    // Create root if not exists
    const root = await this.getByPath('/')
    if (!root) {
      await this.createEntry({
        id: crypto.randomUUID(),
        path: '/',
        name: '',
        parentId: null,
        type: 'directory',
        mode: 0o755,
        uid: 0,
        gid: 0,
        size: 0,
        blobId: null,
        linkTarget: null,
        nlink: 2,
      })
    }
  }

  /**
   * Get entry by path
   */
  async getByPath(path: string): Promise<FileEntry | null> {
    const result = await this.sql.exec<FileEntry>('SELECT * FROM files WHERE path = ?', path).one()
    return result || null
  }

  /**
   * Get entry by ID
   */
  async getById(id: string): Promise<FileEntry | null> {
    const result = await this.sql.exec<FileEntry>('SELECT * FROM files WHERE id = ?', id).one()
    return result || null
  }

  /**
   * Get children of a directory
   */
  async getChildren(parentId: string): Promise<FileEntry[]> {
    return this.sql.exec<FileEntry>('SELECT * FROM files WHERE parent_id = ?', parentId).toArray()
  }

  /**
   * Create a new entry
   */
  async createEntry(entry: {
    id: string
    path: string
    name: string
    parentId: string | null
    type: FileType
    mode: number
    uid: number
    gid: number
    size: number
    blobId: string | null
    linkTarget: string | null
    nlink: number
  }): Promise<void> {
    const now = Date.now()
    await this.sql.exec(
      `INSERT INTO files (id, path, name, parent_id, type, mode, uid, gid, size, blob_id, link_target, atime, mtime, ctime, birthtime, nlink)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      entry.id,
      entry.path,
      entry.name,
      entry.parentId,
      entry.type,
      entry.mode,
      entry.uid,
      entry.gid,
      entry.size,
      entry.blobId,
      entry.linkTarget,
      now,
      now,
      now,
      now,
      entry.nlink
    )
  }

  /**
   * Update an entry
   */
  async updateEntry(
    id: string,
    updates: Partial<{
      path: string
      name: string
      parentId: string | null
      mode: number
      uid: number
      gid: number
      size: number
      blobId: string | null
      atime: number
      mtime: number
    }>
  ): Promise<void> {
    const sets: string[] = []
    const values: unknown[] = []

    if (updates.path !== undefined) {
      sets.push('path = ?')
      values.push(updates.path)
    }
    if (updates.name !== undefined) {
      sets.push('name = ?')
      values.push(updates.name)
    }
    if (updates.parentId !== undefined) {
      sets.push('parent_id = ?')
      values.push(updates.parentId)
    }
    if (updates.mode !== undefined) {
      sets.push('mode = ?')
      values.push(updates.mode)
    }
    if (updates.uid !== undefined) {
      sets.push('uid = ?')
      values.push(updates.uid)
    }
    if (updates.gid !== undefined) {
      sets.push('gid = ?')
      values.push(updates.gid)
    }
    if (updates.size !== undefined) {
      sets.push('size = ?')
      values.push(updates.size)
    }
    if (updates.blobId !== undefined) {
      sets.push('blob_id = ?')
      values.push(updates.blobId)
    }
    if (updates.atime !== undefined) {
      sets.push('atime = ?')
      values.push(updates.atime)
    }
    if (updates.mtime !== undefined) {
      sets.push('mtime = ?')
      values.push(updates.mtime)
    }

    // Always update ctime
    sets.push('ctime = ?')
    values.push(Date.now())

    values.push(id)

    await this.sql.exec(`UPDATE files SET ${sets.join(', ')} WHERE id = ?`, ...values)
  }

  /**
   * Delete an entry
   */
  async deleteEntry(id: string): Promise<void> {
    await this.sql.exec('DELETE FROM files WHERE id = ?', id)
  }

  /**
   * Register a blob
   */
  async registerBlob(blob: { id: string; tier: 'hot' | 'warm' | 'cold'; size: number; checksum?: string }): Promise<void> {
    await this.sql.exec('INSERT INTO blobs (id, tier, size, checksum, created_at) VALUES (?, ?, ?, ?, ?)', blob.id, blob.tier, blob.size, blob.checksum || null, Date.now())
  }

  /**
   * Get blob info
   */
  async getBlob(id: string): Promise<BlobRef | null> {
    const result = await this.sql.exec<BlobRef>('SELECT * FROM blobs WHERE id = ?', id).one()
    return result || null
  }

  /**
   * Update blob tier
   */
  async updateBlobTier(id: string, tier: 'hot' | 'warm' | 'cold'): Promise<void> {
    await this.sql.exec('UPDATE blobs SET tier = ? WHERE id = ?', tier, id)
  }

  /**
   * Delete a blob reference
   */
  async deleteBlob(id: string): Promise<void> {
    await this.sql.exec('DELETE FROM blobs WHERE id = ?', id)
  }

  /**
   * Find entries by pattern (glob-like)
   */
  async findByPattern(pattern: string, parentPath?: string): Promise<FileEntry[]> {
    // Convert glob to SQL LIKE pattern
    const sqlPattern = pattern.replace(/\*/g, '%').replace(/\?/g, '_')

    if (parentPath) {
      return this.sql.exec<FileEntry>('SELECT * FROM files WHERE path LIKE ? AND path LIKE ?', parentPath + '%', sqlPattern).toArray()
    }

    return this.sql.exec<FileEntry>('SELECT * FROM files WHERE path LIKE ?', sqlPattern).toArray()
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<{
    totalFiles: number
    totalDirectories: number
    totalSize: number
    blobsByTier: Record<string, { count: number; size: number }>
  }> {
    const files = await this.sql.exec<{ count: number }>(`SELECT COUNT(*) as count FROM files WHERE type = 'file'`).one()
    const dirs = await this.sql.exec<{ count: number }>(`SELECT COUNT(*) as count FROM files WHERE type = 'directory'`).one()
    const size = await this.sql.exec<{ total: number }>('SELECT SUM(size) as total FROM files').one()

    const tierStats = await this.sql.exec<{ tier: string; count: number; size: number }>('SELECT tier, COUNT(*) as count, SUM(size) as size FROM blobs GROUP BY tier').toArray()

    const blobsByTier: Record<string, { count: number; size: number }> = {}
    for (const stat of tierStats) {
      blobsByTier[stat.tier] = { count: stat.count, size: stat.size }
    }

    return {
      totalFiles: files?.count || 0,
      totalDirectories: dirs?.count || 0,
      totalSize: size?.total || 0,
      blobsByTier,
    }
  }
}
