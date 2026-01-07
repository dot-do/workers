/**
 * Core filesystem module
 */

export { FSx, type FSxOptions } from './fsx.js'
export { constants, type Constants } from './constants.js'
export { FSError, ENOENT, EEXIST, EISDIR, ENOTDIR, EACCES, ENOTEMPTY, EINVAL, ELOOP, ENAMETOOLONG, ENOSPC, EROFS, EBUSY, EMFILE, EXDEV } from './errors.js'
export type {
  Stats,
  Dirent,
  FileHandle,
  ReadStreamOptions,
  WriteStreamOptions,
  MkdirOptions,
  RmdirOptions,
  ReaddirOptions,
  WatchOptions,
  FSWatcher,
  FileMode,
  FileType,
  BufferEncoding,
  FileEntry,
  BlobRef,
} from './types.js'
