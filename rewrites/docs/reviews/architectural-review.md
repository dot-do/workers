# Architectural Review: workers.do Rewrites Platform

**Date**: 2026-01-07
**Scope**: fsx, gitx, kafka, nats, supabase rewrites
**Author**: Claude (Architectural Review)

---

## Executive Summary

The workers.do rewrites platform implements a consistent pattern for rebuilding popular databases and services on Cloudflare Durable Objects. After reviewing the mature rewrites (fsx, gitx, kafka, nats, supabase), I find the architecture to be **well-designed and scalable**, with strong consistency in core patterns but room for improvement in cross-rewrite integration and client SDK standardization.

### Key Findings

| Aspect | Rating | Notes |
|--------|--------|-------|
| DO Pattern Consistency | Good | All rewrites follow similar DO + Hono patterns |
| Storage Tier Implementation | Good | Hot/warm/cold tiers well-designed in fsx/gitx |
| Client/Server Split | Mixed | Inconsistent SDK patterns across rewrites |
| MCP Integration | Excellent | Comprehensive tool definitions in fsx/gitx |
| Cross-rewrite Dependencies | Needs Work | gitx -> fsx coupling is too tight |
| Scalability | Excellent | DO model supports millions of instances |

---

## 1. Durable Objects Pattern Analysis

### 1.1 Common DO Structure

All reviewed rewrites follow a consistent pattern:

```
                    +-----------------------+
                    |   HTTP Entry Point    |
                    |  (Cloudflare Worker)  |
                    +-----------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    | {Service}DO (1)  | | {Service}DO (2)  | | {Service}DO (n)  |
    |   SQLite + R2    | |   SQLite + R2    | |   SQLite + R2    |
    +------------------+ +------------------+ +------------------+
```

### 1.2 DO Implementation Comparison

| Rewrite | DO Classes | Hono Routing | SQLite Schema | R2 Integration |
|---------|-----------|--------------|---------------|----------------|
| **fsx** | `FileSystemDO` | Yes (`/rpc`, `/stream/*`) | files, blobs tables | Tiered storage |
| **gitx** | `GitDO` (inferred) | Yes | objects, refs, hot_objects, wal | R2 packfiles |
| **kafka** | `TopicPartitionDO`, `ConsumerGroupDO`, `ClusterMetadataDO` | Yes | messages, watermarks | Not yet |
| **nats** | `NatsCoordinator` | Yes (RPC) | consumers | Not yet |
| **supabase** | `SupabaseDO` (planned) | TBD | Per-agent database | R2 storage |

### 1.3 Architectural Diagram: FileSystemDO (Reference Implementation)

```
+------------------------------------------------------------------+
|                        FileSystemDO                               |
+------------------------------------------------------------------+
|  Constructor                                                      |
|  - Initialize Hono app                                           |
|  - Set up routes                                                 |
+------------------------------------------------------------------+
|  ensureInitialized()                                             |
|  - Run SQLite schema                                             |
|  - Create root directory                                         |
+------------------------------------------------------------------+
|  Routes:                                                         |
|  +------------------------------------------------------------+  |
|  | POST /rpc      -> handleMethod(method, params)             |  |
|  | POST /stream/read  -> streaming file read                  |  |
|  | POST /stream/write -> streaming file write                 |  |
|  +------------------------------------------------------------+  |
+------------------------------------------------------------------+
|  SQLite Tables:                                                  |
|  +--------------------+  +--------------------+                  |
|  |      files         |  |      blobs         |                  |
|  +--------------------+  +--------------------+                  |
|  | id (PK)           |  | id (PK)            |                  |
|  | path (unique)     |  | data (BLOB)        |                  |
|  | name              |  | size               |                  |
|  | parent_id (FK)    |  | tier               |                  |
|  | type              |  | created_at         |                  |
|  | mode, uid, gid    |  +--------------------+                  |
|  | size              |                                          |
|  | blob_id (FK)      |                                          |
|  | timestamps...     |                                          |
|  +--------------------+                                          |
+------------------------------------------------------------------+
```

### 1.4 DO Initialization Pattern

All DOs use lazy initialization:

```typescript
// Common pattern across all rewrites
private initialized = false

private async ensureInitialized() {
  if (this.initialized) return

  // Run schema
  await this.ctx.storage.sql.exec(SCHEMA)

  // Initialize data structures
  // ...

  this.initialized = true
}

async fetch(request: Request): Promise<Response> {
  await this.ensureInitialized()
  return this.app.fetch(request)
}
```

**Recommendation**: Extract this pattern into a base class in `objects/do/`:

```typescript
// objects/do/base.ts
export abstract class BaseDO extends DurableObject<Env> {
  protected app: Hono
  private initialized = false

  protected abstract getSchema(): string
  protected abstract setupRoutes(): void
  protected abstract onInitialize(): Promise<void>

  private async ensureInitialized() {
    if (this.initialized) return
    await this.ctx.storage.sql.exec(this.getSchema())
    await this.onInitialize()
    this.initialized = true
  }

  async fetch(request: Request): Promise<Response> {
    await this.ensureInitialized()
    return this.app.fetch(request)
  }
}
```

---

## 2. Storage Tiers Analysis

### 2.1 Tiered Storage Architecture

```
+-------------------+
|     REQUEST       |
+-------------------+
         |
         v
+-------------------+     miss     +-------------------+     miss     +-------------------+
|    HOT TIER       | -----------> |    WARM TIER      | -----------> |    COLD TIER      |
|  (DO SQLite)      |              |      (R2)         |              |   (R2 Archive)    |
+-------------------+              +-------------------+              +-------------------+
| Fast access       |              | Large files       |              | Infrequent access |
| < 1MB files       |              | < 100MB files     |              | Historical data   |
| Single-threaded   |              | Object storage    |              | Compressed        |
+-------------------+              +-------------------+              +-------------------+
         ^                                  |                                  |
         |          promote on access       |          promote on access       |
         +----------------------------------+----------------------------------+
```

### 2.2 Implementation Status by Rewrite

| Rewrite | Hot (SQLite) | Warm (R2) | Cold (Archive) | Auto-Tier | Promotion |
|---------|--------------|-----------|----------------|-----------|-----------|
| **fsx** | Implemented | Implemented | Planned | By size | On access |
| **gitx** | Implemented | Pack files | Parquet | By access pattern | LRU |
| **kafka** | Implemented | Not yet | Not yet | N/A | N/A |
| **nats** | Implemented | Not yet | Not yet | N/A | N/A |
| **supabase** | Planned | Planned | Planned | TBD | TBD |

### 2.3 fsx TieredFS Implementation

```typescript
// rewrites/fsx/src/storage/tiered.ts

class TieredFS {
  private selectTier(size: number): 'hot' | 'warm' | 'cold' {
    if (size <= hotMaxSize) return 'hot'        // < 1MB -> SQLite
    if (size <= warmMaxSize) return 'warm'      // < 100MB -> R2
    return 'cold'                               // Archive
  }

  async readFile(path: string): Promise<{ data: Uint8Array; tier: string }> {
    // Check metadata for tier location
    const metadata = await this.getMetadata(path)

    // Read from appropriate tier
    if (metadata.tier === 'hot') {
      return { data: await this.readFromHot(path), tier: 'hot' }
    }

    if (metadata.tier === 'warm') {
      const data = await this.warm.get(path)

      // Promote on access if under threshold
      if (promotionPolicy === 'on-access' && data.length <= hotMaxSize) {
        await this.promote(path, data, 'warm', 'hot')
      }

      return { data, tier: 'warm' }
    }
    // ... cold tier handling
  }
}
```

### 2.4 gitx Tiered Storage (Advanced)

gitx has the most sophisticated tiered storage with CDC pipelines:

```
+-------------------+       +-------------------+       +-------------------+
|    Hot Objects    |       |   R2 Packfiles    |       | Parquet Archive   |
|   (SQLite DO)     |       |   (Git format)    |       |   (Columnar)      |
+-------------------+       +-------------------+       +-------------------+
        |                           |                           |
        v                           v                           v
+-------------------+       +-------------------+       +-------------------+
|  object_index     |       |  multi-pack idx   |       |  partition files  |
|  tier: 'hot'      |       |  pack_id, offset  |       |  by date range    |
+-------------------+       +-------------------+       +-------------------+
```

**gitx Schema (rewrites/gitx/src/durable-object/schema.ts)**:
- `objects` - Main Git object storage
- `object_index` - Location index across tiers (tier, pack_id, offset)
- `hot_objects` - Frequently accessed cache with LRU
- `wal` - Write-ahead log for durability
- `refs` - Git references

---

## 3. Client/Server Split Analysis

### 3.1 Pattern Overview

```
+-------------------+     HTTP/RPC     +-------------------+
|   Client SDK      | --------------> |   Durable Object   |
|   (npm package)   |                 |   (Worker)         |
+-------------------+                 +-------------------+
|  - Type-safe API  |                 |  - Hono routes    |
|  - DO stub wrap   |                 |  - SQLite storage |
|  - Streaming      |                 |  - Business logic |
+-------------------+                 +-------------------+
```

### 3.2 Client Implementation Comparison

#### fsx - FSx Client Class

```typescript
// rewrites/fsx/src/core/fsx.ts
export class FSx {
  private stub: DurableObjectStub

  constructor(binding: DurableObjectNamespace | DurableObjectStub) {
    if ('idFromName' in binding) {
      const id = binding.idFromName('global')
      this.stub = binding.get(id)
    } else {
      this.stub = binding
    }
  }

  private async request<T>(method: string, params: Record<string, unknown>): Promise<T> {
    const response = await this.stub.fetch('http://fsx.do/rpc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method, params }),
    })
    // ...
  }

  async readFile(path: string, encoding?: BufferEncoding): Promise<string | Uint8Array> {
    return this.request<{ data: string }>('readFile', { path, encoding })
  }
}
```

#### kafka - KafkaClient (HTTP-based)

```typescript
// rewrites/kafka/src/client/client.ts
export class KafkaClient {
  private config: KafkaClientConfig

  constructor(config: KafkaClientConfig) {
    this.config = {
      baseUrl: config.baseUrl.replace(/\/$/, ''),
      // ...
    }
  }

  producer(): KafkaProducerClient { /* ... */ }
  consumer(options: ConsumerOptions): KafkaConsumerClient { /* ... */ }
  admin(): KafkaAdminClient { /* ... */ }
}
```

### 3.3 Inconsistencies Identified

| Aspect | fsx | kafka | gitx | nats |
|--------|-----|-------|------|------|
| Client Location | `src/core/fsx.ts` | `src/client/` | No SDK client | `src/rpc/` |
| Constructor Input | DO binding | HTTP config | N/A | RPC endpoint |
| RPC Format | JSON `{method, params}` | REST endpoints | N/A | JSON-RPC 2.0 |
| Streaming | Yes (`/stream/*`) | No | No | No |

**Recommendation**: Standardize client SDK pattern:

```typescript
// Proposed standard pattern for all rewrites
export interface ServiceClientConfig {
  // Option 1: Internal (within workers.do)
  binding?: DurableObjectNamespace

  // Option 2: External (HTTP client)
  baseUrl?: string
  apiKey?: string

  // Common
  timeout?: number
}

export function createClient<T>(
  serviceName: string,
  config: ServiceClientConfig
): T {
  if (config.binding) {
    return new InternalClient(config.binding) as T
  }
  return new HTTPClient(config.baseUrl, config.apiKey) as T
}
```

---

## 4. MCP Integration Analysis

### 4.1 MCP Tool Pattern

All rewrites that implement MCP follow the same structure:

```typescript
interface McpTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, JSONSchema>
    required?: string[]
  }
  handler?: (params: Record<string, unknown>) => Promise<McpToolResult>
}

interface McpToolResult {
  content: Array<{ type: 'text' | 'image'; text?: string; data?: string }>
  isError?: boolean
}
```

### 4.2 Tool Coverage by Rewrite

#### fsx MCP Tools (12 tools)
```
fs_read, fs_write, fs_append, fs_delete, fs_move, fs_copy,
fs_list, fs_mkdir, fs_stat, fs_exists, fs_search, fs_tree
```

#### gitx MCP Tools (18 tools)
```
git_status, git_log, git_diff, git_commit, git_branch, git_checkout,
git_push, git_pull, git_clone, git_init, git_add, git_reset,
git_merge, git_rebase, git_stash, git_tag, git_remote, git_fetch
```

#### nats MCP Tools (3+ tools)
```
nats_publish, nats_consumer, nats_stream
```

### 4.3 MCP Architecture Diagram

```
+-------------------+
|    AI Agent       |
|  (Claude, etc.)   |
+-------------------+
         |
         | MCP Protocol
         v
+-------------------+
|   MCP Server      |
| (tool registry)   |
+-------------------+
         |
         | invokeTool(name, params)
         v
+-------------------+
|  Tool Handler     |
| (validateInput,   |
|  execute)         |
+-------------------+
         |
         v
+-------------------+
|  Repository/      |
|  Service Context  |
+-------------------+
```

### 4.4 gitx MCP Implementation Quality

The gitx MCP implementation is exemplary:

1. **Security**: Comprehensive input validation
   ```typescript
   function validatePath(path: string): string {
     if (path.includes('..') || path.startsWith('/') || /[<>|&;$`]/.test(path)) {
       throw new Error('Invalid path: contains forbidden characters')
     }
     return path
   }
   ```

2. **Context Management**: Global repository context
   ```typescript
   let globalRepositoryContext: RepositoryContext | null = null

   export function setRepositoryContext(ctx: RepositoryContext | null): void {
     globalRepositoryContext = ctx
   }
   ```

3. **Comprehensive Tools**: Full git workflow coverage

---

## 5. Cross-Rewrite Dependencies

### 5.1 Dependency Graph

```
                    +-------------------+
                    |       fsx         |
                    | (File System DO)  |
                    +-------------------+
                           ^
                           |
                           | imports CAS, compression, git-object
                           |
                    +-------------------+
                    |       gitx        |
                    |    (Git DO)       |
                    +-------------------+
                           ^
                           |
                           | (potential future dependency)
                           |
                    +-------------------+
                    |     supabase      |
                    |   (Database DO)   |
                    +-------------------+
```

### 5.2 gitx -> fsx Coupling Analysis

**Location**: `rewrites/gitx/src/storage/fsx-adapter.ts`

```typescript
// Current (PROBLEMATIC) - Direct source imports
import { putObject as fsxPutObject } from '../../../fsx/src/cas/put-object'
import { getObject as fsxGetObject } from '../../../fsx/src/cas/get-object'
import { hashToPath } from '../../../fsx/src/cas/path-mapping'
import { sha1 } from '../../../fsx/src/cas/hash'
import { createGitObject, parseGitObject } from '../../../fsx/src/cas/git-object'
import { compress, decompress } from '../../../fsx/src/cas/compression'
```

**Issues**:
1. Path-based imports (`../../../`) are fragile
2. No npm package boundary
3. Changes in fsx can break gitx silently
4. Cannot version dependencies independently

### 5.3 Recommended Dependency Pattern

```
Option A: Package Dependencies
------------------------------
packages/
  fsx/                   # npm: fsx.do
    src/cas/
      index.ts          # Public API exports
  gitx/                  # npm: gitx.do
    package.json        # "dependencies": { "fsx.do": "^1.0.0" }

gitx imports:
import { putObject, sha1, compress } from 'fsx.do/cas'


Option B: Shared Primitives
---------------------------
primitives/
  cas/                   # npm: @workers.do/cas
    put-object.ts
    get-object.ts
    hash.ts
    compression.ts

Both fsx and gitx import from:
import { sha1, compress } from '@workers.do/cas'
```

**Recommendation**: Option B (Shared Primitives) is cleaner for shared functionality like CAS operations.

---

## 6. Scalability Analysis

### 6.1 DO Scalability Characteristics

| Factor | Analysis | Score |
|--------|----------|-------|
| **Horizontal Scale** | Each DO instance is independent; millions can run in parallel | Excellent |
| **Per-Instance Memory** | Limited to DO memory limits (128MB); SQLite helps | Good |
| **Storage Limits** | 10GB per DO (SQLite); unlimited via R2 | Excellent |
| **Global Distribution** | DOs automatically locate near users | Excellent |
| **Cost at Scale** | Pay per request/duration; efficient for sparse access | Excellent |

### 6.2 Bottleneck Analysis

```
Potential Bottlenecks:
+------------------------------------------------------------------+
|                                                                  |
|  1. Hot Path Serialization (RPC JSON encoding)                   |
|     - Impact: High for small frequent requests                   |
|     - Mitigation: Batch operations, streaming                    |
|                                                                  |
|  2. Single-Threaded DO Execution                                 |
|     - Impact: High for CPU-intensive operations                  |
|     - Mitigation: Offload to Workers, use hibernation            |
|                                                                  |
|  3. SQLite Row Limits                                            |
|     - Impact: Medium for large datasets                          |
|     - Mitigation: Tiered storage, pagination                     |
|                                                                  |
|  4. R2 Request Latency                                           |
|     - Impact: Medium for cold reads                              |
|     - Mitigation: Hot cache, prefetch                            |
|                                                                  |
+------------------------------------------------------------------+
```

### 6.3 Scale Projections

| Scenario | DOs Required | Feasibility |
|----------|--------------|-------------|
| 1M AI agents, each with own filesystem | 1M FileSystemDO instances | Feasible |
| 1M AI agents, each with own git repo | 1M GitDO instances | Feasible |
| 100K topics, 10 partitions each | 1M TopicPartitionDO instances | Feasible |
| Global NATS mesh | Coordinator + per-region DOs | Feasible |

---

## 7. Consistency Analysis

### 7.1 Pattern Consistency Matrix

| Pattern | fsx | gitx | kafka | nats | Consistent? |
|---------|-----|------|-------|------|-------------|
| DO extends DurableObject | Yes | Yes | Yes | Yes | Yes |
| Hono routing | Yes | Yes | Yes | Yes | Yes |
| Lazy init with `ensureInitialized` | Yes | Yes | Yes | Yes | Yes |
| SQLite for metadata | Yes | Yes | Yes | Yes | Yes |
| R2 for large data | Yes | Yes | No | No | Partial |
| MCP tools | Yes | Yes | No | Yes | Partial |
| Client SDK | Yes | No | Yes | Yes | Partial |
| Tiered storage | Yes | Yes | No | No | Partial |
| JSON-RPC format | Custom | Custom | REST | JSON-RPC 2.0 | No |

### 7.2 Naming Convention Consistency

| Rewrite | DO Class Name | Table Names | Route Prefix |
|---------|---------------|-------------|--------------|
| fsx | `FileSystemDO` | files, blobs | `/rpc`, `/stream/*` |
| gitx | (implicit) | objects, refs, hot_objects, wal | (various) |
| kafka | `TopicPartitionDO` | messages, watermarks | `/append`, `/read`, `/offsets` |
| nats | `NatsCoordinator` | consumers | `/` (RPC) |

**Recommendation**: Standardize on:
- DO naming: `{Service}DO` (e.g., `FileSystemDO`, `GitDO`, `KafkaDO`, `NatsDO`)
- Route prefix: `/rpc` for main operations, `/stream/*` for streaming
- RPC format: JSON-RPC 2.0 standard

---

## 8. Recommendations

### 8.1 High Priority

1. **Extract Base DO Class**
   - Create `objects/do/base.ts` with common initialization, routing patterns
   - All rewrites extend this base class

2. **Standardize RPC Format**
   - Adopt JSON-RPC 2.0 across all rewrites
   - Create shared middleware in `middleware/rpc/`

3. **Fix gitx -> fsx Coupling**
   - Extract CAS operations to `primitives/cas/` or `packages/cas/`
   - Both fsx and gitx import from shared package

### 8.2 Medium Priority

4. **Standardize Client SDKs**
   - Create `sdks/{service}.do/` for each rewrite
   - Consistent pattern: `new ServiceClient(binding | config)`

5. **Add Tiered Storage to kafka/nats**
   - kafka: Archive old messages to R2
   - nats: Archive old streams to R2

6. **Expand MCP Coverage**
   - Add MCP tools to kafka (`kafka_produce`, `kafka_consume`, `kafka_admin`)
   - Complete supabase MCP tools

### 8.3 Low Priority

7. **Add Health/Metrics Endpoints**
   - Standard `/health` and `/metrics` routes
   - Export to Cloudflare Analytics

8. **Add OpenTelemetry Tracing**
   - Trace requests across DO hops
   - Integration with Cloudflare tracing

---

## 9. Appendix: Quick Reference

### 9.1 Key File Locations

| Rewrite | DO Implementation | Client SDK | MCP Tools |
|---------|-------------------|------------|-----------|
| fsx | `src/durable-object/index.ts` | `src/core/fsx.ts` | `src/mcp/index.ts` |
| gitx | `src/durable-object/schema.ts` | N/A | `src/mcp/tools.ts` |
| kafka | `src/durable-objects/topic-partition.ts` | `src/client/client.ts` | N/A |
| nats | `src/durable-objects/nats-coordinator.ts` | `src/rpc/rpc-client.ts` | `src/mcp/tools/` |
| supabase | (planned) | (planned) | (planned) |

### 9.2 SQLite Schema Quick Reference

**fsx**:
```sql
CREATE TABLE files (id, path UNIQUE, name, parent_id, type, mode, ...);
CREATE TABLE blobs (id, data BLOB, size, tier, created_at);
```

**gitx**:
```sql
CREATE TABLE objects (sha PRIMARY KEY, type, size, data BLOB, created_at);
CREATE TABLE object_index (sha PRIMARY KEY, tier, pack_id, offset, ...);
CREATE TABLE hot_objects (sha PRIMARY KEY, type, data BLOB, accessed_at, ...);
CREATE TABLE wal (id AUTO, operation, payload BLOB, flushed);
CREATE TABLE refs (name PRIMARY KEY, target, type, updated_at);
```

**kafka**:
```sql
CREATE TABLE messages (offset AUTO PRIMARY KEY, key, value, headers, timestamp, ...);
CREATE TABLE watermarks (partition PRIMARY KEY, high_watermark, log_start_offset, ...);
```

**nats**:
```sql
CREATE TABLE consumers (stream_name, name, config, durable, created_at, ...);
```

---

## 10. Conclusion

The workers.do rewrites platform demonstrates a solid architectural foundation with Durable Objects providing the per-instance isolation and SQLite/R2 providing the storage tiers. The patterns established in fsx and gitx should be formalized and applied consistently across all rewrites.

Key strengths:
- Scalable DO-based architecture
- Sophisticated tiered storage in mature rewrites
- Comprehensive MCP integration for AI-native access

Key areas for improvement:
- Cross-rewrite dependency management
- Client SDK standardization
- RPC format consistency

With the recommended improvements, the platform will be well-positioned to support millions of concurrent AI agent instances, each with their own isolated infrastructure services.
