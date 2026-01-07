/**
 * FSx - Main filesystem class
 *
 * Provides POSIX-like filesystem operations backed by Durable Objects and R2.
 */

import type { Stats, Dirent, FileHandle, MkdirOptions, RmdirOptions, ReaddirOptions, ReadStreamOptions, WriteStreamOptions, WatchOptions, FSWatcher, BufferEncoding } from './types.js'
import { constants } from './constants.js'
import { ENOENT, EEXIST, EISDIR, ENOTDIR, EINVAL } from './errors.js'

/**
 * FSx configuration options
 */
export interface FSxOptions {
  /** Storage tier thresholds */
  tiers?: {
    /** Max size for hot tier (DO SQLite) */
    hotMaxSize?: number
    /** Enable warm tier (R2) */
    warmEnabled?: boolean
    /** Enable cold tier (archive) */
    coldEnabled?: boolean
  }
  /** Default file mode (permissions) */
  defaultMode?: number
  /** Default directory mode */
  defaultDirMode?: number
  /** Temp file max age in ms */
  tmpMaxAge?: number
  /** Max file size */
  maxFileSize?: number
  /** Max path length */
  maxPathLength?: number
  /** User ID */
  uid?: number
  /** Group ID */
  gid?: number
}

const DEFAULT_OPTIONS: Required<FSxOptions> = {
  tiers: {
    hotMaxSize: 1024 * 1024, // 1MB
    warmEnabled: true,
    coldEnabled: false,
  },
  defaultMode: 0o644,
  defaultDirMode: 0o755,
  tmpMaxAge: 24 * 60 * 60 * 1000, // 24 hours
  maxFileSize: 100 * 1024 * 1024, // 100MB
  maxPathLength: 4096,
  uid: 0,
  gid: 0,
}

/**
 * FSx - Virtual filesystem for Cloudflare Workers
 */
export class FSx {
  private stub: DurableObjectStub
  private options: Required<FSxOptions>

  constructor(binding: DurableObjectNamespace | DurableObjectStub, options: FSxOptions = {}) {
    if ('idFromName' in binding) {
      // It's a namespace, get the global stub
      const id = binding.idFromName('global')
      this.stub = binding.get(id)
    } else {
      this.stub = binding
    }
    this.options = { ...DEFAULT_OPTIONS, ...options }
  }

  /**
   * Normalize a path
   */
  private normalizePath(path: string): string {
    // Remove trailing slashes (except root)
    if (path !== '/' && path.endsWith('/')) {
      path = path.slice(0, -1)
    }
    // Ensure starts with /
    if (!path.startsWith('/')) {
      path = '/' + path
    }
    // Resolve . and ..
    const parts = path.split('/').filter(Boolean)
    const resolved: string[] = []
    for (const part of parts) {
      if (part === '.') continue
      if (part === '..') {
        resolved.pop()
      } else {
        resolved.push(part)
      }
    }
    return '/' + resolved.join('/')
  }

  /**
   * Send a request to the Durable Object
   */
  private async request<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const response = await this.stub.fetch('http://fsx.do/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, params }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ code: 'UNKNOWN', message: response.statusText }))
      throw this.createError(error as { code: string; message: string; path?: string })
    }

    return response.json()
  }

  /**
   * Create an error from response
   */
  private createError(error: { code: string; message: string; path?: string }): Error {
    switch (error.code) {
      case 'ENOENT':
        return new ENOENT(undefined, error.path)
      case 'EEXIST':
        return new EEXIST(undefined, error.path)
      case 'EISDIR':
        return new EISDIR(undefined, error.path)
      case 'ENOTDIR':
        return new ENOTDIR(undefined, error.path)
      case 'EINVAL':
        return new EINVAL(undefined, error.path)
      default:
        return new Error(error.message)
    }
  }

  // ==================== File Operations ====================

  /**
   * Read a file's contents
   */
  async readFile(path: string, encoding?: BufferEncoding): Promise<string | Uint8Array> {
    path = this.normalizePath(path)
    const result = await this.request<{ data: string; encoding: string }>('readFile', { path, encoding })

    if (encoding || result.encoding === 'utf-8') {
      return result.data
    }

    // Decode base64 to Uint8Array
    const binary = atob(result.data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i)
    }
    return bytes
  }

  /**
   * Write data to a file
   */
  async writeFile(path: string, data: string | Uint8Array, options?: { mode?: number; flag?: string }): Promise<void> {
    path = this.normalizePath(path)

    let encodedData: string
    let encoding: string

    if (typeof data === 'string') {
      encodedData = data
      encoding = 'utf-8'
    } else {
      // Encode Uint8Array as base64
      let binary = ''
      for (const byte of data) {
        binary += String.fromCharCode(byte)
      }
      encodedData = btoa(binary)
      encoding = 'base64'
    }

    await this.request('writeFile', {
      path,
      data: encodedData,
      encoding,
      mode: options?.mode ?? this.options.defaultMode,
      flag: options?.flag,
    })
  }

  /**
   * Append data to a file
   */
  async appendFile(path: string, data: string | Uint8Array): Promise<void> {
    return this.writeFile(path, data, { flag: 'a' })
  }

  /**
   * Delete a file
   */
  async unlink(path: string): Promise<void> {
    path = this.normalizePath(path)
    await this.request('unlink', { path })
  }

  /**
   * Rename/move a file or directory
   */
  async rename(oldPath: string, newPath: string): Promise<void> {
    oldPath = this.normalizePath(oldPath)
    newPath = this.normalizePath(newPath)
    await this.request('rename', { oldPath, newPath })
  }

  /**
   * Copy a file
   */
  async copyFile(src: string, dest: string, flags?: number): Promise<void> {
    src = this.normalizePath(src)
    dest = this.normalizePath(dest)
    await this.request('copyFile', { src, dest, flags })
  }

  // ==================== Directory Operations ====================

  /**
   * Create a directory
   */
  async mkdir(path: string, options?: MkdirOptions): Promise<void> {
    path = this.normalizePath(path)
    await this.request('mkdir', {
      path,
      recursive: options?.recursive ?? false,
      mode: options?.mode ?? this.options.defaultDirMode,
    })
  }

  /**
   * Remove a directory
   */
  async rmdir(path: string, options?: RmdirOptions): Promise<void> {
    path = this.normalizePath(path)
    await this.request('rmdir', {
      path,
      recursive: options?.recursive ?? false,
    })
  }

  /**
   * Remove a file or directory (rm -rf)
   */
  async rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void> {
    path = this.normalizePath(path)
    await this.request('rm', {
      path,
      recursive: options?.recursive ?? false,
      force: options?.force ?? false,
    })
  }

  /**
   * Read directory contents
   */
  async readdir(path: string, options?: ReaddirOptions): Promise<string[] | Dirent[]> {
    path = this.normalizePath(path)
    return this.request('readdir', {
      path,
      withFileTypes: options?.withFileTypes ?? false,
      recursive: options?.recursive ?? false,
    })
  }

  // ==================== Metadata Operations ====================

  /**
   * Get file/directory stats
   */
  async stat(path: string): Promise<Stats> {
    path = this.normalizePath(path)
    const stats = await this.request<Stats>('stat', { path })
    return this.hydrateStats(stats)
  }

  /**
   * Get file/directory stats (don't follow symlinks)
   */
  async lstat(path: string): Promise<Stats> {
    path = this.normalizePath(path)
    const stats = await this.request<Stats>('lstat', { path })
    return this.hydrateStats(stats)
  }

  /**
   * Hydrate stats object with methods
   */
  private hydrateStats(stats: any): Stats {
    const mode = stats.mode
    return {
      ...stats,
      atime: new Date(stats.atime),
      mtime: new Date(stats.mtime),
      ctime: new Date(stats.ctime),
      birthtime: new Date(stats.birthtime),
      isFile: () => (mode & constants.S_IFMT) === constants.S_IFREG,
      isDirectory: () => (mode & constants.S_IFMT) === constants.S_IFDIR,
      isSymbolicLink: () => (mode & constants.S_IFMT) === constants.S_IFLNK,
      isBlockDevice: () => (mode & constants.S_IFMT) === constants.S_IFBLK,
      isCharacterDevice: () => (mode & constants.S_IFMT) === constants.S_IFCHR,
      isFIFO: () => (mode & constants.S_IFMT) === constants.S_IFIFO,
      isSocket: () => (mode & constants.S_IFMT) === constants.S_IFSOCK,
    }
  }

  /**
   * Check file access
   */
  async access(path: string, mode?: number): Promise<void> {
    path = this.normalizePath(path)
    await this.request('access', { path, mode: mode ?? constants.F_OK })
  }

  /**
   * Check if path exists
   */
  async exists(path: string): Promise<boolean> {
    try {
      await this.access(path)
      return true
    } catch {
      return false
    }
  }

  /**
   * Change file permissions
   */
  async chmod(path: string, mode: number): Promise<void> {
    path = this.normalizePath(path)
    await this.request('chmod', { path, mode })
  }

  /**
   * Change file ownership
   */
  async chown(path: string, uid: number, gid: number): Promise<void> {
    path = this.normalizePath(path)
    await this.request('chown', { path, uid, gid })
  }

  /**
   * Update file timestamps
   */
  async utimes(path: string, atime: Date | number, mtime: Date | number): Promise<void> {
    path = this.normalizePath(path)
    await this.request('utimes', {
      path,
      atime: atime instanceof Date ? atime.getTime() : atime,
      mtime: mtime instanceof Date ? mtime.getTime() : mtime,
    })
  }

  // ==================== Symbolic Links ====================

  /**
   * Create a symbolic link
   */
  async symlink(target: string, path: string): Promise<void> {
    path = this.normalizePath(path)
    await this.request('symlink', { target, path })
  }

  /**
   * Create a hard link
   */
  async link(existingPath: string, newPath: string): Promise<void> {
    existingPath = this.normalizePath(existingPath)
    newPath = this.normalizePath(newPath)
    await this.request('link', { existingPath, newPath })
  }

  /**
   * Read symbolic link target
   */
  async readlink(path: string): Promise<string> {
    path = this.normalizePath(path)
    return this.request('readlink', { path })
  }

  /**
   * Resolve path (follow symlinks)
   */
  async realpath(path: string): Promise<string> {
    path = this.normalizePath(path)
    return this.request('realpath', { path })
  }

  // ==================== Streams ====================

  /**
   * Create a readable stream
   */
  async createReadStream(path: string, options?: ReadStreamOptions): Promise<ReadableStream<Uint8Array>> {
    path = this.normalizePath(path)

    const response = await this.stub.fetch('http://fsx.do/stream/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, ...options }),
    })

    if (!response.ok || !response.body) {
      const error = await response.json().catch(() => ({ code: 'UNKNOWN', message: response.statusText }))
      throw this.createError(error as { code: string; message: string; path?: string })
    }

    return response.body
  }

  /**
   * Create a writable stream
   */
  async createWriteStream(path: string, options?: WriteStreamOptions): Promise<WritableStream<Uint8Array>> {
    path = this.normalizePath(path)

    // Create a TransformStream to pipe data to the DO
    const { readable, writable } = new TransformStream<Uint8Array>()

    // Start the upload in the background
    this.stub
      .fetch('http://fsx.do/stream/write', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'X-FSx-Path': path,
          'X-FSx-Options': JSON.stringify(options || {}),
        },
        body: readable,
      })
      .then(async (response) => {
        if (!response.ok) {
          const error = await response.json().catch(() => ({ code: 'UNKNOWN', message: response.statusText }))
          throw this.createError(error as { code: string; message: string; path?: string })
        }
      })

    return writable
  }

  // ==================== File Watching ====================

  /**
   * Watch a file or directory for changes
   */
  watch(path: string, options?: WatchOptions, listener?: (eventType: string, filename: string) => void): FSWatcher {
    path = this.normalizePath(path)

    // Note: This is a simplified implementation
    // Full implementation would use WebSocket or Server-Sent Events
    const watcher: FSWatcher = {
      close: () => {
        // Close the watcher
      },
      ref: () => watcher,
      unref: () => watcher,
    }

    return watcher
  }

  // ==================== Utility ====================

  /**
   * Truncate a file
   */
  async truncate(path: string, length?: number): Promise<void> {
    path = this.normalizePath(path)
    await this.request('truncate', { path, length: length ?? 0 })
  }

  /**
   * Open a file and get a file handle
   */
  async open(path: string, flags?: string | number, mode?: number): Promise<FileHandle> {
    path = this.normalizePath(path)
    const fd = await this.request<number>('open', { path, flags, mode })

    // Return a FileHandle implementation
    return {
      fd,
      read: async (buffer, offset, length, position) => {
        const result = await this.request<{ bytesRead: number; data: string }>('read', {
          fd,
          length: length ?? buffer.length,
          position,
        })
        const decoded = atob(result.data)
        for (let i = 0; i < result.bytesRead; i++) {
          buffer[(offset ?? 0) + i] = decoded.charCodeAt(i)
        }
        return { bytesRead: result.bytesRead, buffer }
      },
      write: async (data, position) => {
        let encoded: string
        if (typeof data === 'string') {
          encoded = btoa(data)
        } else {
          let binary = ''
          for (const byte of data) {
            binary += String.fromCharCode(byte)
          }
          encoded = btoa(binary)
        }
        const result = await this.request<{ bytesWritten: number }>('write', { fd, data: encoded, position })
        return result
      },
      stat: () => this.request('fstat', { fd }).then(this.hydrateStats.bind(this)),
      truncate: (length) => this.request('ftruncate', { fd, length }),
      sync: () => this.request('fsync', { fd }),
      close: () => this.request('close', { fd }),
      createReadStream: (options) => {
        throw new Error('Not implemented')
      },
      createWriteStream: (options) => {
        throw new Error('Not implemented')
      },
    }
  }
}
