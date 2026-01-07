/**
 * FileSystemDO - Durable Object implementation for filesystem
 */

import { DurableObject } from 'cloudflare:workers'
import { Hono } from 'hono'
import { constants } from '../core/constants.js'
import type { FileEntry, FileType, Stats, Dirent } from '../core/types.js'

interface Env {
  FSX: DurableObjectNamespace
  R2?: R2Bucket
}

/**
 * SQLite schema for filesystem metadata
 */
const SCHEMA = `
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
    data BLOB,
    size INTEGER NOT NULL,
    checksum TEXT,
    tier TEXT NOT NULL DEFAULT 'hot',
    created_at INTEGER NOT NULL
  );
`

/**
 * FileSystemDO - Durable Object for filesystem operations
 */
export class FileSystemDO extends DurableObject<Env> {
  private app: Hono
  private initialized = false

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.app = this.createApp()
  }

  private async ensureInitialized() {
    if (this.initialized) return

    // Run schema
    await this.ctx.storage.sql.exec(SCHEMA)

    // Create root directory if not exists
    const root = await this.ctx.storage.sql.exec<FileEntry>('SELECT * FROM files WHERE path = ?', '/').one()

    if (!root) {
      const now = Date.now()
      await this.ctx.storage.sql.exec(
        `INSERT INTO files (id, path, name, parent_id, type, mode, uid, gid, size, atime, mtime, ctime, birthtime, nlink)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        crypto.randomUUID(),
        '/',
        '',
        null,
        'directory',
        0o755,
        0,
        0,
        0,
        now,
        now,
        now,
        now,
        2
      )
    }

    this.initialized = true
  }

  private createApp(): Hono {
    const app = new Hono()

    // RPC endpoint
    app.post('/rpc', async (c) => {
      await this.ensureInitialized()

      const { method, params } = await c.req.json<{ method: string; params: Record<string, unknown> }>()

      try {
        const result = await this.handleMethod(method, params)
        return c.json(result)
      } catch (error: any) {
        return c.json({ code: error.code || 'UNKNOWN', message: error.message, path: error.path }, error.code === 'ENOENT' ? 404 : 400)
      }
    })

    // Streaming read
    app.post('/stream/read', async (c) => {
      await this.ensureInitialized()
      const { path, start, end } = await c.req.json<{ path: string; start?: number; end?: number }>()

      const file = await this.getFile(path)
      if (!file) {
        return c.json({ code: 'ENOENT', message: 'no such file or directory', path }, 404)
      }

      if (file.type === 'directory') {
        return c.json({ code: 'EISDIR', message: 'illegal operation on a directory', path }, 400)
      }

      if (!file.blob_id) {
        return new Response(new Uint8Array(0))
      }

      const blob = await this.ctx.storage.sql.exec<{ data: ArrayBuffer }>('SELECT data FROM blobs WHERE id = ?', file.blob_id).one()

      if (!blob?.data) {
        return new Response(new Uint8Array(0))
      }

      let data = new Uint8Array(blob.data)
      if (start !== undefined || end !== undefined) {
        data = data.slice(start ?? 0, end !== undefined ? end + 1 : undefined)
      }

      return new Response(data)
    })

    // Streaming write
    app.post('/stream/write', async (c) => {
      await this.ensureInitialized()
      const path = c.req.header('X-FSx-Path')
      const options = JSON.parse(c.req.header('X-FSx-Options') || '{}')

      if (!path) {
        return c.json({ code: 'EINVAL', message: 'path required' }, 400)
      }

      const data = await c.req.arrayBuffer()
      await this.writeFile(path, new Uint8Array(data), options)

      return c.json({ success: true })
    })

    return app
  }

  private async handleMethod(method: string, params: Record<string, unknown>): Promise<unknown> {
    switch (method) {
      case 'readFile':
        return this.readFile(params.path as string, params.encoding as string | undefined)
      case 'writeFile':
        return this.writeFile(params.path as string, params.data as string, params)
      case 'unlink':
        return this.unlink(params.path as string)
      case 'rename':
        return this.rename(params.oldPath as string, params.newPath as string)
      case 'copyFile':
        return this.copyFile(params.src as string, params.dest as string)
      case 'mkdir':
        return this.mkdir(params.path as string, params as { recursive?: boolean; mode?: number })
      case 'rmdir':
        return this.rmdir(params.path as string, params as { recursive?: boolean })
      case 'rm':
        return this.rm(params.path as string, params as { recursive?: boolean; force?: boolean })
      case 'readdir':
        return this.readdir(params.path as string, params as { withFileTypes?: boolean; recursive?: boolean })
      case 'stat':
      case 'lstat':
        return this.stat(params.path as string)
      case 'access':
        return this.access(params.path as string, params.mode as number)
      case 'chmod':
        return this.chmod(params.path as string, params.mode as number)
      case 'chown':
        return this.chown(params.path as string, params.uid as number, params.gid as number)
      case 'symlink':
        return this.symlink(params.target as string, params.path as string)
      case 'link':
        return this.link(params.existingPath as string, params.newPath as string)
      case 'readlink':
        return this.readlink(params.path as string)
      case 'realpath':
        return this.realpath(params.path as string)
      case 'truncate':
        return this.truncate(params.path as string, params.length as number)
      default:
        throw new Error(`Unknown method: ${method}`)
    }
  }

  private async getFile(path: string): Promise<FileEntry | null> {
    const result = await this.ctx.storage.sql.exec<FileEntry>('SELECT * FROM files WHERE path = ?', path).one()
    return result || null
  }

  private async readFile(path: string, encoding?: string): Promise<{ data: string; encoding: string }> {
    const file = await this.getFile(path)
    if (!file) {
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT', path })
    }

    if (file.type === 'directory') {
      throw Object.assign(new Error('illegal operation on a directory'), { code: 'EISDIR', path })
    }

    if (!file.blob_id) {
      return { data: '', encoding: encoding || 'utf-8' }
    }

    const blob = await this.ctx.storage.sql.exec<{ data: ArrayBuffer }>('SELECT data FROM blobs WHERE id = ?', file.blob_id).one()

    if (!blob?.data) {
      return { data: '', encoding: encoding || 'utf-8' }
    }

    if (encoding === 'utf-8' || encoding === 'utf8') {
      const decoder = new TextDecoder()
      return { data: decoder.decode(blob.data), encoding: 'utf-8' }
    }

    // Return as base64
    const bytes = new Uint8Array(blob.data)
    let binary = ''
    for (const byte of bytes) {
      binary += String.fromCharCode(byte)
    }
    return { data: btoa(binary), encoding: 'base64' }
  }

  private async writeFile(path: string, data: string | Uint8Array, options: { encoding?: string; mode?: number; flag?: string } = {}): Promise<void> {
    const now = Date.now()
    const parentPath = path.substring(0, path.lastIndexOf('/')) || '/'
    const name = path.substring(path.lastIndexOf('/') + 1)

    // Ensure parent exists
    const parent = await this.getFile(parentPath)
    if (!parent) {
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT', path: parentPath })
    }

    // Decode data
    let bytes: Uint8Array
    if (typeof data === 'string') {
      if (options.encoding === 'base64') {
        const binary = atob(data)
        bytes = new Uint8Array(binary.length)
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i)
        }
      } else {
        const encoder = new TextEncoder()
        bytes = encoder.encode(data)
      }
    } else {
      bytes = data
    }

    const existing = await this.getFile(path)
    const blobId = crypto.randomUUID()

    // Store blob
    await this.ctx.storage.sql.exec('INSERT INTO blobs (id, data, size, tier, created_at) VALUES (?, ?, ?, ?, ?)', blobId, bytes.buffer, bytes.length, 'hot', now)

    if (existing) {
      // Delete old blob
      if (existing.blob_id) {
        await this.ctx.storage.sql.exec('DELETE FROM blobs WHERE id = ?', existing.blob_id)
      }

      // Update file
      await this.ctx.storage.sql.exec('UPDATE files SET blob_id = ?, size = ?, mtime = ?, ctime = ? WHERE id = ?', blobId, bytes.length, now, now, existing.id)
    } else {
      // Create new file
      await this.ctx.storage.sql.exec(
        `INSERT INTO files (id, path, name, parent_id, type, mode, uid, gid, size, blob_id, atime, mtime, ctime, birthtime, nlink)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        crypto.randomUUID(),
        path,
        name,
        parent.id,
        'file',
        options.mode || 0o644,
        0,
        0,
        bytes.length,
        blobId,
        now,
        now,
        now,
        now,
        1
      )
    }
  }

  private async unlink(path: string): Promise<void> {
    const file = await this.getFile(path)
    if (!file) {
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT', path })
    }

    if (file.type === 'directory') {
      throw Object.assign(new Error('illegal operation on a directory'), { code: 'EISDIR', path })
    }

    // Delete blob
    if (file.blob_id) {
      await this.ctx.storage.sql.exec('DELETE FROM blobs WHERE id = ?', file.blob_id)
    }

    // Delete file
    await this.ctx.storage.sql.exec('DELETE FROM files WHERE id = ?', file.id)
  }

  private async rename(oldPath: string, newPath: string): Promise<void> {
    const file = await this.getFile(oldPath)
    if (!file) {
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT', path: oldPath })
    }

    const now = Date.now()
    const newParentPath = newPath.substring(0, newPath.lastIndexOf('/')) || '/'
    const newName = newPath.substring(newPath.lastIndexOf('/') + 1)

    const newParent = await this.getFile(newParentPath)
    if (!newParent) {
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT', path: newParentPath })
    }

    await this.ctx.storage.sql.exec('UPDATE files SET path = ?, name = ?, parent_id = ?, ctime = ? WHERE id = ?', newPath, newName, newParent.id, now, file.id)
  }

  private async copyFile(src: string, dest: string): Promise<void> {
    const file = await this.getFile(src)
    if (!file) {
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT', path: src })
    }

    const content = await this.readFile(src)
    await this.writeFile(dest, content.data, { encoding: content.encoding })
  }

  private async mkdir(path: string, options: { recursive?: boolean; mode?: number } = {}): Promise<void> {
    const now = Date.now()

    if (options.recursive) {
      const parts = path.split('/').filter(Boolean)
      let currentPath = ''

      for (const part of parts) {
        currentPath += '/' + part
        const existing = await this.getFile(currentPath)

        if (!existing) {
          const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/')) || '/'
          const parent = await this.getFile(parentPath)

          await this.ctx.storage.sql.exec(
            `INSERT INTO files (id, path, name, parent_id, type, mode, uid, gid, size, atime, mtime, ctime, birthtime, nlink)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            crypto.randomUUID(),
            currentPath,
            part,
            parent?.id || null,
            'directory',
            options.mode || 0o755,
            0,
            0,
            0,
            now,
            now,
            now,
            now,
            2
          )
        }
      }
    } else {
      const parentPath = path.substring(0, path.lastIndexOf('/')) || '/'
      const name = path.substring(path.lastIndexOf('/') + 1)
      const parent = await this.getFile(parentPath)

      if (!parent) {
        throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT', path: parentPath })
      }

      const existing = await this.getFile(path)
      if (existing) {
        throw Object.assign(new Error('file already exists'), { code: 'EEXIST', path })
      }

      await this.ctx.storage.sql.exec(
        `INSERT INTO files (id, path, name, parent_id, type, mode, uid, gid, size, atime, mtime, ctime, birthtime, nlink)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        crypto.randomUUID(),
        path,
        name,
        parent.id,
        'directory',
        options.mode || 0o755,
        0,
        0,
        0,
        now,
        now,
        now,
        now,
        2
      )
    }
  }

  private async rmdir(path: string, options: { recursive?: boolean } = {}): Promise<void> {
    const file = await this.getFile(path)
    if (!file) {
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT', path })
    }

    if (file.type !== 'directory') {
      throw Object.assign(new Error('not a directory'), { code: 'ENOTDIR', path })
    }

    const children = await this.ctx.storage.sql.exec<FileEntry>('SELECT * FROM files WHERE parent_id = ?', file.id).toArray()

    if (children.length > 0 && !options.recursive) {
      throw Object.assign(new Error('directory not empty'), { code: 'ENOTEMPTY', path })
    }

    if (options.recursive) {
      for (const child of children) {
        if (child.type === 'directory') {
          await this.rmdir(child.path, { recursive: true })
        } else {
          await this.unlink(child.path)
        }
      }
    }

    await this.ctx.storage.sql.exec('DELETE FROM files WHERE id = ?', file.id)
  }

  private async rm(path: string, options: { recursive?: boolean; force?: boolean } = {}): Promise<void> {
    const file = await this.getFile(path)

    if (!file) {
      if (options.force) return
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT', path })
    }

    if (file.type === 'directory') {
      await this.rmdir(path, { recursive: options.recursive })
    } else {
      await this.unlink(path)
    }
  }

  private async readdir(path: string, options: { withFileTypes?: boolean; recursive?: boolean } = {}): Promise<string[] | Dirent[]> {
    const file = await this.getFile(path)
    if (!file) {
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT', path })
    }

    if (file.type !== 'directory') {
      throw Object.assign(new Error('not a directory'), { code: 'ENOTDIR', path })
    }

    const children = await this.ctx.storage.sql.exec<FileEntry>('SELECT * FROM files WHERE parent_id = ?', file.id).toArray()

    if (options.withFileTypes) {
      const result: Dirent[] = children.map((child) => ({
        name: child.name,
        parentPath: path,
        path: child.path,
        isFile: () => child.type === 'file',
        isDirectory: () => child.type === 'directory',
        isSymbolicLink: () => child.type === 'symlink',
        isBlockDevice: () => false,
        isCharacterDevice: () => false,
        isFIFO: () => false,
        isSocket: () => false,
      }))

      if (options.recursive) {
        for (const child of children) {
          if (child.type === 'directory') {
            const subEntries = (await this.readdir(child.path, options)) as Dirent[]
            result.push(...subEntries)
          }
        }
      }

      return result
    }

    const names = children.map((c) => c.name)

    if (options.recursive) {
      for (const child of children) {
        if (child.type === 'directory') {
          const subNames = (await this.readdir(child.path, options)) as string[]
          names.push(...subNames.map((n) => child.name + '/' + n))
        }
      }
    }

    return names
  }

  private async stat(path: string): Promise<Stats> {
    const file = await this.getFile(path)
    if (!file) {
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT', path })
    }

    const typeMode = file.type === 'directory' ? constants.S_IFDIR : file.type === 'symlink' ? constants.S_IFLNK : constants.S_IFREG

    return {
      dev: 0,
      ino: parseInt(file.id.replace(/-/g, '').substring(0, 12), 16),
      mode: typeMode | file.mode,
      nlink: file.nlink,
      uid: file.uid,
      gid: file.gid,
      rdev: 0,
      size: file.size,
      blksize: 4096,
      blocks: Math.ceil(file.size / 512),
      atime: file.atime,
      mtime: file.mtime,
      ctime: file.ctime,
      birthtime: file.birthtime,
    } as any
  }

  private async access(path: string, mode: number = 0): Promise<void> {
    const file = await this.getFile(path)
    if (!file) {
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT', path })
    }
    // Simplified: just check existence
  }

  private async chmod(path: string, mode: number): Promise<void> {
    const file = await this.getFile(path)
    if (!file) {
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT', path })
    }
    await this.ctx.storage.sql.exec('UPDATE files SET mode = ?, ctime = ? WHERE id = ?', mode, Date.now(), file.id)
  }

  private async chown(path: string, uid: number, gid: number): Promise<void> {
    const file = await this.getFile(path)
    if (!file) {
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT', path })
    }
    await this.ctx.storage.sql.exec('UPDATE files SET uid = ?, gid = ?, ctime = ? WHERE id = ?', uid, gid, Date.now(), file.id)
  }

  private async symlink(target: string, path: string): Promise<void> {
    const now = Date.now()
    const parentPath = path.substring(0, path.lastIndexOf('/')) || '/'
    const name = path.substring(path.lastIndexOf('/') + 1)

    const parent = await this.getFile(parentPath)
    if (!parent) {
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT', path: parentPath })
    }

    await this.ctx.storage.sql.exec(
      `INSERT INTO files (id, path, name, parent_id, type, mode, uid, gid, size, link_target, atime, mtime, ctime, birthtime, nlink)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      crypto.randomUUID(),
      path,
      name,
      parent.id,
      'symlink',
      0o777,
      0,
      0,
      target.length,
      target,
      now,
      now,
      now,
      now,
      1
    )
  }

  private async link(existingPath: string, newPath: string): Promise<void> {
    const file = await this.getFile(existingPath)
    if (!file) {
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT', path: existingPath })
    }

    // Increment nlink
    await this.ctx.storage.sql.exec('UPDATE files SET nlink = nlink + 1 WHERE id = ?', file.id)

    // Create new entry pointing to same blob
    const now = Date.now()
    const parentPath = newPath.substring(0, newPath.lastIndexOf('/')) || '/'
    const name = newPath.substring(newPath.lastIndexOf('/') + 1)

    const parent = await this.getFile(parentPath)
    if (!parent) {
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT', path: parentPath })
    }

    await this.ctx.storage.sql.exec(
      `INSERT INTO files (id, path, name, parent_id, type, mode, uid, gid, size, blob_id, atime, mtime, ctime, birthtime, nlink)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      crypto.randomUUID(),
      newPath,
      name,
      parent.id,
      file.type,
      file.mode,
      file.uid,
      file.gid,
      file.size,
      file.blob_id,
      now,
      now,
      now,
      now,
      file.nlink + 1
    )
  }

  private async readlink(path: string): Promise<string> {
    const file = await this.getFile(path)
    if (!file) {
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT', path })
    }
    if (file.type !== 'symlink' || !file.link_target) {
      throw Object.assign(new Error('invalid argument'), { code: 'EINVAL', path })
    }
    return file.link_target
  }

  private async realpath(path: string): Promise<string> {
    const file = await this.getFile(path)
    if (!file) {
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT', path })
    }

    if (file.type === 'symlink' && file.link_target) {
      // Resolve symlink
      if (file.link_target.startsWith('/')) {
        return this.realpath(file.link_target)
      } else {
        const parentPath = path.substring(0, path.lastIndexOf('/')) || '/'
        return this.realpath(parentPath + '/' + file.link_target)
      }
    }

    return path
  }

  private async truncate(path: string, length: number): Promise<void> {
    const file = await this.getFile(path)
    if (!file) {
      throw Object.assign(new Error('no such file or directory'), { code: 'ENOENT', path })
    }

    if (file.blob_id) {
      const blob = await this.ctx.storage.sql.exec<{ data: ArrayBuffer }>('SELECT data FROM blobs WHERE id = ?', file.blob_id).one()

      if (blob?.data) {
        const bytes = new Uint8Array(blob.data)
        const truncated = bytes.slice(0, length)
        await this.ctx.storage.sql.exec('UPDATE blobs SET data = ?, size = ? WHERE id = ?', truncated.buffer, truncated.length, file.blob_id)
        await this.ctx.storage.sql.exec('UPDATE files SET size = ?, mtime = ?, ctime = ? WHERE id = ?', truncated.length, Date.now(), Date.now(), file.id)
      }
    }
  }

  async fetch(request: Request): Promise<Response> {
    return this.app.fetch(request)
  }
}
