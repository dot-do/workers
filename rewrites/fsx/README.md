# fsx.do

Filesystem on Cloudflare Durable Objects - A virtual filesystem for the edge.

## Features

- **POSIX-like API** - Familiar fs operations (read, write, mkdir, readdir, stat, etc.)
- **Durable Object Storage** - SQLite-backed metadata with R2 blob storage
- **MCP Tools** - Model Context Protocol integration for AI-assisted file operations
- **Tiered Storage** - Hot/warm/cold storage tiers with automatic promotion
  - Hot: Durable Object SQLite (low latency, small files)
  - Warm: R2 object storage (large files, blobs)
  - Cold: Archive storage (infrequent access)
- **Streaming** - ReadableStream/WritableStream support for large files
- **Permissions** - Unix-like permission model (rwx)
- **Symbolic Links** - Symlink and hardlink support
- **Watch** - File/directory change notifications

## Installation

```bash
npm install fsx.do
```

## Quick Start

### Basic Operations

```typescript
import { FSx } from 'fsx.do'

const fs = new FSx(env.FSX)

// Write a file
await fs.writeFile('/hello.txt', 'Hello, World!')

// Read a file
const content = await fs.readFile('/hello.txt', 'utf-8')

// Create directory
await fs.mkdir('/my-folder', { recursive: true })

// List directory
const entries = await fs.readdir('/my-folder')

// Get file stats
const stats = await fs.stat('/hello.txt')
console.log(`Size: ${stats.size}, Modified: ${stats.mtime}`)

// Delete file
await fs.unlink('/hello.txt')
```

### Streaming Large Files

```typescript
import { FSx } from 'fsx.do'

const fs = new FSx(env.FSX)

// Write stream
const writable = await fs.createWriteStream('/large-file.bin')
await someReadableStream.pipeTo(writable)

// Read stream
const readable = await fs.createReadStream('/large-file.bin')
for await (const chunk of readable) {
  process.stdout.write(chunk)
}

// Partial reads
const partial = await fs.createReadStream('/large-file.bin', {
  start: 1000,
  end: 2000
})
```

### File Watching

```typescript
import { FSx } from 'fsx.do'

const fs = new FSx(env.FSX)

// Watch a file
const watcher = fs.watch('/config.json', (eventType, filename) => {
  console.log(`${eventType}: ${filename}`)
})

// Watch a directory recursively
const dirWatcher = fs.watch('/src', { recursive: true }, (eventType, filename) => {
  console.log(`${eventType}: ${filename}`)
})

// Stop watching
watcher.close()
```

### MCP Tools

```typescript
import { fsTools, invokeTool } from 'fsx.do/mcp'

// List available fs tools
console.log(fsTools.map(t => t.name))
// ['fs_read', 'fs_write', 'fs_list', 'fs_mkdir', 'fs_delete', 'fs_move', 'fs_copy', ...]

// Invoke a tool
const result = await invokeTool('fs_list', { path: '/src', recursive: true })

// Read file tool
const content = await invokeTool('fs_read', { path: '/README.md' })

// Search files
const matches = await invokeTool('fs_search', {
  path: '/src',
  pattern: '*.ts',
  content: 'export function'
})
```

### Durable Object

```typescript
import { FileSystemDO } from 'fsx.do/do'

// In your worker
export { FileSystemDO }

export default {
  async fetch(request, env) {
    const id = env.FSX.idFromName('user-123')
    const stub = env.FSX.get(id)
    return stub.fetch(request)
  }
}
```

### Tiered Storage

```typescript
import { TieredFS } from 'fsx.do/storage'

const fs = new TieredFS({
  hot: env.FSX,           // Durable Object (fast, small files)
  warm: env.R2_BUCKET,    // R2 (large files)
  cold: env.ARCHIVE,      // Archive (infrequent)
  thresholds: {
    hotMaxSize: 1024 * 1024,      // 1MB
    warmMaxSize: 100 * 1024 * 1024 // 100MB
  }
})

// Automatic tier selection based on file size
await fs.writeFile('/small.txt', 'small content')      // -> hot tier
await fs.writeFile('/large.bin', hugeBuffer)           // -> warm tier
```

## API Overview

### Core Module (`fsx.do/core`)

**File Operations**
- `readFile(path, encoding?)` - Read file contents
- `writeFile(path, data, options?)` - Write file contents
- `appendFile(path, data)` - Append to file
- `unlink(path)` - Delete file
- `rename(oldPath, newPath)` - Rename/move file
- `copyFile(src, dest)` - Copy file

**Directory Operations**
- `mkdir(path, options?)` - Create directory
- `rmdir(path, options?)` - Remove directory
- `readdir(path, options?)` - List directory contents

**Metadata**
- `stat(path)` - Get file/directory stats
- `lstat(path)` - Get stats (don't follow symlinks)
- `access(path, mode?)` - Check file access
- `chmod(path, mode)` - Change permissions
- `chown(path, uid, gid)` - Change ownership

**Links**
- `symlink(target, path)` - Create symbolic link
- `link(existingPath, newPath)` - Create hard link
- `readlink(path)` - Read symbolic link target
- `realpath(path)` - Resolve path (follow symlinks)

**Streams**
- `createReadStream(path, options?)` - Get readable stream
- `createWriteStream(path, options?)` - Get writable stream

**Watching**
- `watch(path, options?, listener?)` - Watch for changes
- `watchFile(path, options?, listener?)` - Watch specific file

### MCP Tools (`fsx.do/mcp`)

- `fsTools` - Array of available filesystem tool definitions
- `invokeTool(name, params)` - Execute a tool by name
- `registerTool(tool)` - Add a custom tool

### Durable Object (`fsx.do/do`)

- `FileSystemDO` - Main Durable Object class
- Handles all filesystem operations via fetch API

### Storage (`fsx.do/storage`)

- `TieredFS` - Multi-tier filesystem with automatic placement
- `R2Storage` - R2-backed blob storage
- `SQLiteMetadata` - SQLite-backed metadata store

## File System Structure

```
/
├── .fsx/                 # System directory
│   ├── metadata.db       # SQLite metadata
│   └── config.json       # FS configuration
├── home/
│   └── user/
│       ├── documents/
│       └── .config/
└── tmp/                  # Temporary files (auto-cleanup)
```

## Configuration

```typescript
const fs = new FSx(env.FSX, {
  // Storage tiers
  tiers: {
    hotMaxSize: 1024 * 1024,        // 1MB
    warmEnabled: true,
    coldEnabled: false,
  },

  // Permissions
  defaultMode: 0o644,               // rw-r--r--
  defaultDirMode: 0o755,            // rwxr-xr-x

  // Cleanup
  tmpMaxAge: 24 * 60 * 60 * 1000,   // 24 hours

  // Limits
  maxFileSize: 100 * 1024 * 1024,   // 100MB
  maxPathLength: 4096,
})
```

## License

MIT
