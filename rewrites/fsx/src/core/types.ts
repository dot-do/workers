/**
 * Core filesystem types
 */

import { constants } from './constants'

/**
 * File mode (permissions)
 */
export type FileMode = number

/**
 * File type
 */
export type FileType = 'file' | 'directory' | 'symlink' | 'block' | 'character' | 'fifo' | 'socket'

/**
 * Stats properties for constructor
 */
export interface StatsInit {
  dev: number
  ino: number
  mode: number
  nlink: number
  uid: number
  gid: number
  rdev: number
  size: number
  blksize: number
  blocks: number
  atimeMs: number
  mtimeMs: number
  ctimeMs: number
  birthtimeMs: number
}

/**
 * File statistics class
 */
export class Stats {
  /** Device ID */
  readonly dev: number
  /** Inode number */
  readonly ino: number
  /** File mode (permissions + type) */
  readonly mode: number
  /** Number of hard links */
  readonly nlink: number
  /** User ID */
  readonly uid: number
  /** Group ID */
  readonly gid: number
  /** Device ID (if special file) */
  readonly rdev: number
  /** File size in bytes */
  readonly size: number
  /** Block size */
  readonly blksize: number
  /** Number of blocks */
  readonly blocks: number
  /** Access time in ms */
  readonly atimeMs: number
  /** Modification time in ms */
  readonly mtimeMs: number
  /** Change time (metadata) in ms */
  readonly ctimeMs: number
  /** Birth time (creation) in ms */
  readonly birthtimeMs: number

  constructor(init: StatsInit) {
    this.dev = init.dev
    this.ino = init.ino
    this.mode = init.mode
    this.nlink = init.nlink
    this.uid = init.uid
    this.gid = init.gid
    this.rdev = init.rdev
    this.size = init.size
    this.blksize = init.blksize
    this.blocks = init.blocks
    this.atimeMs = init.atimeMs
    this.mtimeMs = init.mtimeMs
    this.ctimeMs = init.ctimeMs
    this.birthtimeMs = init.birthtimeMs
  }

  /** Access time */
  get atime(): Date {
    return new Date(this.atimeMs)
  }

  /** Modification time */
  get mtime(): Date {
    return new Date(this.mtimeMs)
  }

  /** Change time (metadata) */
  get ctime(): Date {
    return new Date(this.ctimeMs)
  }

  /** Birth time (creation) */
  get birthtime(): Date {
    return new Date(this.birthtimeMs)
  }

  /** Is regular file */
  isFile(): boolean {
    return (this.mode & constants.S_IFMT) === constants.S_IFREG
  }

  /** Is directory */
  isDirectory(): boolean {
    return (this.mode & constants.S_IFMT) === constants.S_IFDIR
  }

  /** Is symbolic link */
  isSymbolicLink(): boolean {
    return (this.mode & constants.S_IFMT) === constants.S_IFLNK
  }

  /** Is block device */
  isBlockDevice(): boolean {
    return (this.mode & constants.S_IFMT) === constants.S_IFBLK
  }

  /** Is character device */
  isCharacterDevice(): boolean {
    return (this.mode & constants.S_IFMT) === constants.S_IFCHR
  }

  /** Is FIFO (named pipe) */
  isFIFO(): boolean {
    return (this.mode & constants.S_IFMT) === constants.S_IFIFO
  }

  /** Is socket */
  isSocket(): boolean {
    return (this.mode & constants.S_IFMT) === constants.S_IFSOCK
  }
}

/**
 * Dirent type
 */
export type DirentType = 'file' | 'directory' | 'symlink' | 'block' | 'character' | 'fifo' | 'socket'

/**
 * Directory entry class
 */
export class Dirent {
  /** Entry name */
  readonly name: string
  /** Parent path */
  readonly parentPath: string
  /** Entry type */
  private readonly _type: DirentType

  constructor(name: string, parentPath: string, type: DirentType) {
    this.name = name
    this.parentPath = parentPath
    this._type = type
  }

  /** Full path */
  get path(): string {
    if (this.parentPath.endsWith('/')) {
      return this.parentPath + this.name
    }
    return this.parentPath + '/' + this.name
  }

  /** Is regular file */
  isFile(): boolean {
    return this._type === 'file'
  }

  /** Is directory */
  isDirectory(): boolean {
    return this._type === 'directory'
  }

  /** Is symbolic link */
  isSymbolicLink(): boolean {
    return this._type === 'symlink'
  }

  /** Is block device */
  isBlockDevice(): boolean {
    return this._type === 'block'
  }

  /** Is character device */
  isCharacterDevice(): boolean {
    return this._type === 'character'
  }

  /** Is FIFO */
  isFIFO(): boolean {
    return this._type === 'fifo'
  }

  /** Is socket */
  isSocket(): boolean {
    return this._type === 'socket'
  }
}

/**
 * Stats-like interface for FileHandle
 */
export interface StatsLike {
  dev: number
  ino: number
  mode: number
  nlink: number
  uid: number
  gid: number
  rdev: number
  size: number
  blksize: number
  blocks: number
  atime: Date
  mtime: Date
  ctime: Date
  birthtime: Date
  isFile(): boolean
  isDirectory(): boolean
  isSymbolicLink(): boolean
  isBlockDevice(): boolean
  isCharacterDevice(): boolean
  isFIFO(): boolean
  isSocket(): boolean
}

/**
 * File handle for open files
 */
export class FileHandle {
  /** File descriptor */
  readonly fd: number
  /** Internal data buffer */
  private _data: Uint8Array
  /** Internal stats */
  private _stats: StatsLike
  /** Whether the handle is closed */
  private _closed: boolean = false

  constructor(fd: number, data: Uint8Array, stats: StatsLike) {
    this.fd = fd
    this._data = data
    this._stats = stats
  }

  private _ensureOpen(): void {
    if (this._closed) {
      throw new Error('File handle is closed')
    }
  }

  /** Read from file */
  async read(
    buffer: Uint8Array,
    offset: number = 0,
    length?: number,
    position: number = 0
  ): Promise<{ bytesRead: number; buffer: Uint8Array }> {
    this._ensureOpen()

    const readLength = length ?? this._data.length - position
    const actualLength = Math.min(readLength, this._data.length - position)
    const bytesToRead = Math.min(actualLength, buffer.length - offset)

    for (let i = 0; i < bytesToRead; i++) {
      buffer[offset + i] = this._data[position + i]
    }

    return { bytesRead: bytesToRead, buffer }
  }

  /** Write to file */
  async write(
    data: Uint8Array | string,
    position?: number
  ): Promise<{ bytesWritten: number }> {
    this._ensureOpen()

    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
    const pos = position ?? this._data.length

    // Expand data array if needed
    if (pos + bytes.length > this._data.length) {
      const newData = new Uint8Array(pos + bytes.length)
      newData.set(this._data)
      this._data = newData
    }

    // Write the data
    for (let i = 0; i < bytes.length; i++) {
      this._data[pos + i] = bytes[i]
    }

    // Note: stats size update will be reflected in stat() via this._data.length
    // No need to update _stats here since stat() reads directly from _data.length

    return { bytesWritten: bytes.length }
  }

  /** Get file stats */
  async stat(): Promise<Stats> {
    this._ensureOpen()

    // Return current stats with updated size
    return new Stats({
      dev: this._stats.dev,
      ino: this._stats.ino,
      mode: this._stats.mode,
      nlink: this._stats.nlink,
      uid: this._stats.uid,
      gid: this._stats.gid,
      rdev: this._stats.rdev,
      size: this._data.length,
      blksize: this._stats.blksize,
      blocks: Math.ceil(this._data.length / this._stats.blksize),
      atimeMs: this._stats.atime.getTime(),
      mtimeMs: this._stats.mtime.getTime(),
      ctimeMs: this._stats.ctime.getTime(),
      birthtimeMs: this._stats.birthtime.getTime(),
    })
  }

  /** Truncate file */
  async truncate(length: number = 0): Promise<void> {
    this._ensureOpen()

    if (length < this._data.length) {
      this._data = this._data.slice(0, length)
    } else if (length > this._data.length) {
      const newData = new Uint8Array(length)
      newData.set(this._data)
      this._data = newData
    }

    // Create a new stats object preserving the atime/mtime/ctime/birthtime getters
    const oldStats = this._stats
    this._stats = {
      dev: oldStats.dev,
      ino: oldStats.ino,
      mode: oldStats.mode,
      nlink: oldStats.nlink,
      uid: oldStats.uid,
      gid: oldStats.gid,
      rdev: oldStats.rdev,
      size: this._data.length,
      blksize: oldStats.blksize,
      blocks: Math.ceil(this._data.length / oldStats.blksize),
      atime: oldStats.atime,
      mtime: oldStats.mtime,
      ctime: oldStats.ctime,
      birthtime: oldStats.birthtime,
      isFile: () => oldStats.isFile(),
      isDirectory: () => oldStats.isDirectory(),
      isSymbolicLink: () => oldStats.isSymbolicLink(),
      isBlockDevice: () => oldStats.isBlockDevice(),
      isCharacterDevice: () => oldStats.isCharacterDevice(),
      isFIFO: () => oldStats.isFIFO(),
      isSocket: () => oldStats.isSocket(),
    }
  }

  /** Sync to disk */
  async sync(): Promise<void> {
    this._ensureOpen()
    // No-op in memory implementation
  }

  /** Close file */
  async close(): Promise<void> {
    this._closed = true
  }

  /** Create readable stream */
  createReadStream(options?: ReadStreamOptions): ReadableStream<Uint8Array> {
    this._ensureOpen()

    const start = options?.start ?? 0
    const end = options?.end ?? this._data.length - 1
    const data = this._data.slice(start, end + 1)
    const highWaterMark = options?.highWaterMark ?? 16384

    let offset = 0

    return new ReadableStream<Uint8Array>({
      pull(controller) {
        if (offset >= data.length) {
          controller.close()
          return
        }

        const chunk = data.slice(offset, offset + highWaterMark)
        offset += chunk.length
        controller.enqueue(chunk)
      },
    })
  }

  /** Create writable stream */
  createWriteStream(options?: WriteStreamOptions): WritableStream<Uint8Array> {
    this._ensureOpen()

    let position = options?.start ?? 0
    const self = this

    return new WritableStream<Uint8Array>({
      async write(chunk) {
        await self.write(chunk, position)
        position += chunk.length
      },
    })
  }
}

/**
 * Options for creating read streams
 */
export interface ReadStreamOptions {
  /** Start position */
  start?: number
  /** End position (inclusive) */
  end?: number
  /** High water mark (buffer size) */
  highWaterMark?: number
  /** Encoding */
  encoding?: BufferEncoding
}

/**
 * Options for creating write streams
 */
export interface WriteStreamOptions {
  /** Start position */
  start?: number
  /** File flags */
  flags?: string
  /** File mode */
  mode?: number
  /** High water mark */
  highWaterMark?: number
  /** Encoding */
  encoding?: BufferEncoding
}

/**
 * Options for mkdir
 */
export interface MkdirOptions {
  /** Create parent directories */
  recursive?: boolean
  /** Directory mode */
  mode?: number
}

/**
 * Options for rmdir
 */
export interface RmdirOptions {
  /** Remove recursively */
  recursive?: boolean
  /** Max retries */
  maxRetries?: number
  /** Retry delay in ms */
  retryDelay?: number
}

/**
 * Options for readdir
 */
export interface ReaddirOptions {
  /** Return Dirent objects */
  withFileTypes?: boolean
  /** Recursive listing */
  recursive?: boolean
  /** Encoding */
  encoding?: BufferEncoding
}

/**
 * Options for watch
 */
export interface WatchOptions {
  /** Watch recursively */
  recursive?: boolean
  /** Persistent (keep process alive) */
  persistent?: boolean
  /** Encoding */
  encoding?: BufferEncoding
}

/**
 * File system watcher
 */
export interface FSWatcher {
  /** Close watcher */
  close(): void
  /** Reference watcher (keep alive) */
  ref(): this
  /** Unreference watcher */
  unref(): this
}

/**
 * Buffer encoding types
 */
export type BufferEncoding = 'utf-8' | 'utf8' | 'ascii' | 'base64' | 'hex' | 'binary' | 'latin1'

/**
 * Internal file entry (stored in SQLite)
 */
export interface FileEntry {
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
  atime: number
  mtime: number
  ctime: number
  birthtime: number
  nlink: number
}

/**
 * Blob reference (for R2 storage)
 */
export interface BlobRef {
  id: string
  tier: 'hot' | 'warm' | 'cold'
  size: number
  checksum: string
  createdAt: number
}
