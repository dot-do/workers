/**
 * fsx.do - Filesystem on Cloudflare Durable Objects
 *
 * A virtual filesystem for the edge with POSIX-like API,
 * tiered storage, and MCP integration for AI-assisted operations.
 */

// Core filesystem API
export { FSx, type FSxOptions } from './core/fsx.js'

// Types
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
} from './core/types.js'

// Constants
export { constants } from './core/constants.js'

// Errors
export { FSError, ENOENT, EEXIST, EISDIR, ENOTDIR, EACCES, ENOTEMPTY } from './core/errors.js'

// Durable Object
export { FileSystemDO } from './durable-object/index.js'

// MCP Tools
export { fsTools, invokeTool, registerTool } from './mcp/index.js'

// Storage backends
export { TieredFS, R2Storage, SQLiteMetadata } from './storage/index.js'
