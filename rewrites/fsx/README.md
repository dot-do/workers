# fsx.do

> Filesystem at the Edge. Natural Language. Tiered Storage. AI-Native.

Cloud storage vendors charge for egress, lock you into their APIs, and treat AI integration as an afterthought. Managing files across regions means complexity. Simple operations require SDKs, credentials, and configuration.

**fsx.do** is the edge-native alternative. POSIX-like semantics. Durable Object storage. Talk to your filesystem like a colleague.

## AI-Native API

```typescript
import { fsx } from 'fsx.do'           // Full SDK
import { fsx } from 'fsx.do/tiny'      // Minimal client
import { fsx } from 'fsx.do/stream'    // Streaming-only operations
```

Natural language for file operations:

```typescript
import { fsx } from 'fsx.do'

// Talk to it like a colleague
const files = await fsx`typescript files in src modified today`
const large = await fsx`files over 1MB in /uploads`
const logs = await fsx`error logs from last hour`

// Chain like sentences
await fsx`watch /config.json`
  .on('change', file => fsx`reload ${file}`)

// Streaming that describes itself
await fsx`stream /var/log/app.log`
  .pipe(fsx`compress to /backups/app.log.gz`)
```

## The Problem

Cloud storage is fragmented and complex:

| What Cloud Vendors Charge | The Reality |
|---------------------------|-------------|
| **Egress Fees** | $0.09/GB (adds up fast) |
| **API Calls** | $0.004 per 10,000 requests |
| **Regional Complexity** | Multi-region = multi-config |
| **AI Integration** | DIY with external services |
| **Hot/Cold Management** | Manual lifecycle policies |

### The Egress Tax

Every time data leaves the cloud:
- File downloads cost money
- API responses cost money
- Backups cost money
- Analytics cost money

Edge-native means data stays close to users. No egress.

### The Complexity Tax

Simple file operations require:
- SDK installation and configuration
- Credential management
- Region selection
- Error handling boilerplate
- Retry logic

A `readFile` shouldn't require 50 lines of setup.

## The Solution

**fsx.do** reimagines filesystems for the edge:

```
Cloud Storage                   fsx.do
-----------------------------------------------------------------
Egress fees                     Edge-native (no egress)
Multi-region complexity         Global by default
Manual lifecycle policies       Automatic tiered storage
SDK boilerplate                 Natural language
External AI integration         AI-native from day one
Vendor lock-in                  POSIX-like, portable
```

## One-Click Deploy

```bash
npx create-dotdo fsx
```

A virtual filesystem. Running at the edge. Tiered storage automatic from day one.

```typescript
import { FSx } from 'fsx.do'

export default FSx({
  name: 'my-filesystem',
  domain: 'files.myapp.com',
  tiers: {
    hot: 'sqlite',    // Fast access
    warm: 'r2',       // Large files
    cold: 'archive',  // Long-term retention
  },
})
```

## Features

### File Operations

```typescript
// Just say what you need
const content = await fsx`read /hello.txt`
const readme = await fsx`show me the readme`
const config = await fsx`what's in config.json`

// Write naturally
await fsx`write "Hello, World!" to /hello.txt`
await fsx`save ${data} as /output.json`

// Copy, move, delete
await fsx`copy /src/file.ts to /backup/`
await fsx`move /old to /archive`
await fsx`delete /tmp/cache`
```

### Directory Operations

```typescript
// List and explore
const entries = await fsx`list /my-folder`
const tree = await fsx`show /src tree structure`
const nested = await fsx`everything in /project recursively`

// Create and remove
await fsx`create directory /my-folder`
await fsx`make /a/b/c/d recursively`
await fsx`remove /old-folder and all contents`
```

### Finding Files

```typescript
// Natural queries
const ts = await fsx`typescript files in /src`
const recent = await fsx`files modified in the last hour`
const large = await fsx`files larger than 10MB`
const logs = await fsx`log files containing "error"`

// Combine naturally
const criticalLogs = await fsx`error logs from today over 1KB`
```

### Streaming Large Files

```typescript
// Stream naturally
await fsx`stream /large-file.bin`
  .pipe(response)

// Partial reads
const chunk = await fsx`bytes 1000-2000 of /large-file.bin`

// Upload with streaming
await fsx`stream upload to /large-file.bin`
  .from(request.body)
```

### File Watching

```typescript
// Watch like you'd ask someone to
await fsx`watch /config.json`
  .on('change', () => fsx`reload config`)

// Watch directories
await fsx`watch /src for changes`
  .on('change', file => fsx`rebuild ${file}`)

// Recursive watching
await fsx`watch /project recursively`
  .on('add', file => console.log(`New: ${file}`))
  .on('remove', file => console.log(`Gone: ${file}`))
```

### Tiered Storage

```typescript
// Storage tier is automatic based on:
// - File size (small = hot, large = warm)
// - Access frequency (frequent = promote, rare = demote)
// - Age (old = cold)

await fsx`write ${smallConfig} to /config.json`     // -> hot tier (SQLite)
await fsx`upload ${hugeVideo} to /videos/raw.mp4`   // -> warm tier (R2)

// Query by tier
const archived = await fsx`files in cold storage`
const active = await fsx`hot tier files accessed today`

// Manual tier control when needed
await fsx`move /old-logs to cold storage`
await fsx`promote /important.db to hot tier`
```

### Permissions

```typescript
// Unix-like permissions, natural language
await fsx`make /script.sh executable`
await fsx`set /private read-only`
await fsx`allow group write on /shared`

// Check access
const canWrite = await fsx`can I write to /protected?`
```

### Links

```typescript
// Symlinks and hardlinks
await fsx`link /current to /releases/v2.0`
await fsx`symlink /latest to /versions/newest`

// Resolve links
const target = await fsx`where does /current point?`
const real = await fsx`real path of /symlinked/file.txt`
```

## MCP Tools

AI assistants can work with your filesystem:

```typescript
import { fsx } from 'fsx.do/mcp'

// Available as MCP tools
// fs_read, fs_write, fs_list, fs_search, fs_move, fs_copy, fs_delete...

// AI can use these naturally
await fsx`find all TODO comments in typescript files`
await fsx`search for "deprecated" in /src`
await fsx`what files changed since yesterday?`
```

## Architecture

### Durable Object per Filesystem

```
FileSystemDO (config, metadata index)
  |
  +-- HotTier: SQLite
  |     |-- Small files (<1MB)
  |     +-- Frequently accessed
  |
  +-- WarmTier: R2
  |     |-- Large files (1MB-100MB)
  |     +-- Standard access patterns
  |
  +-- ColdTier: R2 Archive
        |-- Rarely accessed
        +-- Long-term retention
```

### Storage Tiers

| Tier | Storage | Use Case | Latency |
|------|---------|----------|---------|
| **Hot** | SQLite | Small files, config, metadata | <10ms |
| **Warm** | R2 | Large files, media, logs | <100ms |
| **Cold** | R2 Archive | Backups, compliance, historical | <1s |

### Automatic Tier Management

```typescript
// fsx.do automatically manages tiers:
// - New small files -> hot
// - Large files -> warm
// - Untouched for 30 days -> cold
// - Accessed from cold -> promote to warm

// Override defaults per-filesystem
export default FSx({
  tiers: {
    hotMaxSize: '2MB',        // Larger hot tier
    warmToClodAge: '90 days', // Slower cold transition
    autoPromote: true,        // Promote on access
  },
})
```

## File System Structure

```
/
├── .fsx/                 # System directory
│   ├── metadata.db       # SQLite index
│   └── config.json       # FS configuration
├── home/
│   └── user/
│       ├── documents/
│       └── .config/
└── tmp/                  # Temporary (auto-cleanup)
```

## vs Cloud Storage

| Feature | S3/GCS/Azure | fsx.do |
|---------|--------------|--------|
| **Egress** | $0.09/GB | $0 (edge-native) |
| **Latency** | Region-bound | Global edge |
| **API** | SDK required | Natural language |
| **Tiering** | Manual policies | Automatic |
| **AI Integration** | External | MCP native |
| **File Operations** | Object-based | POSIX-like |
| **Streaming** | Multipart complexity | Native streams |

## Use Cases

### Config Management

```typescript
// Watch and reload
await fsx`watch /config.json`
  .on('change', () => fsx`reload config and restart workers`)
```

### Log Aggregation

```typescript
// Tail logs across services
await fsx`tail /var/log/*.log`
  .pipe(fsx`stream to /aggregated/all.log`)

// Archive old logs
await fsx`logs older than 7 days`
  .each(log => fsx`compress ${log} to cold storage`)
```

### Asset Pipeline

```typescript
// Process uploads
await fsx`watch /uploads for new images`
  .on('add', img => fsx`resize ${img} to /thumbnails`)
```

### Backup and Sync

```typescript
// Sync directories
await fsx`sync /local to /backup`

// Incremental backup
await fsx`files changed since last backup`
  .each(file => fsx`copy ${file} to /backup`)
```

## SDK Entry Points

```typescript
import { fsx } from 'fsx.do'            // Full featured
import { fsx } from 'fsx.do/tiny'       // Minimal, no deps
import { fsx } from 'fsx.do/stream'     // Streaming only
import { fsx } from 'fsx.do/mcp'        // MCP tools
import { fsx } from 'fsx.do/do'         // Durable Object class
```

## License

MIT

---

<p align="center">
  <strong>Files at the edge. Natural as speech.</strong>
  <br />
  POSIX-like. Tiered storage. AI-native.
  <br /><br />
  <a href="https://fsx.do">Website</a> |
  <a href="https://docs.fsx.do">Docs</a> |
  <a href="https://discord.gg/dotdo">Discord</a> |
  <a href="https://github.com/dotdo/fsx.do">GitHub</a>
</p>
