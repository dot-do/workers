/**
 * Core filesystem types
 */

/**
 * File mode (permissions)
 */
export type FileMode = number

/**
 * File type
 */
export type FileType = 'file' | 'directory' | 'symlink' | 'block' | 'character' | 'fifo' | 'socket'

/**
 * File statistics
 */
export interface Stats {
  /** Device ID */
  dev: number
  /** Inode number */
  ino: number
  /** File mode (permissions + type) */
  mode: number
  /** Number of hard links */
  nlink: number
  /** User ID */
  uid: number
  /** Group ID */
  gid: number
  /** Device ID (if special file) */
  rdev: number
  /** File size in bytes */
  size: number
  /** Block size */
  blksize: number
  /** Number of blocks */
  blocks: number
  /** Access time */
  atime: Date
  /** Modification time */
  mtime: Date
  /** Change time (metadata) */
  ctime: Date
  /** Birth time (creation) */
  birthtime: Date

  /** Is regular file */
  isFile(): boolean
  /** Is directory */
  isDirectory(): boolean
  /** Is symbolic link */
  isSymbolicLink(): boolean
  /** Is block device */
  isBlockDevice(): boolean
  /** Is character device */
  isCharacterDevice(): boolean
  /** Is FIFO (named pipe) */
  isFIFO(): boolean
  /** Is socket */
  isSocket(): boolean
}

/**
 * Directory entry
 */
export interface Dirent {
  /** Entry name */
  name: string
  /** Parent path */
  parentPath: string
  /** Full path */
  path: string

  /** Is regular file */
  isFile(): boolean
  /** Is directory */
  isDirectory(): boolean
  /** Is symbolic link */
  isSymbolicLink(): boolean
  /** Is block device */
  isBlockDevice(): boolean
  /** Is character device */
  isCharacterDevice(): boolean
  /** Is FIFO */
  isFIFO(): boolean
  /** Is socket */
  isSocket(): boolean
}

/**
 * File handle for open files
 */
export interface FileHandle {
  /** File descriptor */
  fd: number
  /** Read from file */
  read(buffer: Uint8Array, offset?: number, length?: number, position?: number): Promise<{ bytesRead: number; buffer: Uint8Array }>
  /** Write to file */
  write(data: Uint8Array | string, position?: number): Promise<{ bytesWritten: number }>
  /** Get file stats */
  stat(): Promise<Stats>
  /** Truncate file */
  truncate(length?: number): Promise<void>
  /** Sync to disk */
  sync(): Promise<void>
  /** Close file */
  close(): Promise<void>
  /** Create readable stream */
  createReadStream(options?: ReadStreamOptions): ReadableStream<Uint8Array>
  /** Create writable stream */
  createWriteStream(options?: WriteStreamOptions): WritableStream<Uint8Array>
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
