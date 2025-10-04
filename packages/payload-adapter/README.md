# @dot-do/payload-adapter

Payload CMS database adapter package for the dot-do platform with support for multiple backends and dynamic collection loading from MDX files.

## Features

- **Multiple Database Backends**
  - D1 (Cloudflare serverless SQLite)
  - SQLite (libSQL/Turso with replication)
  - RPC (connects to db worker via Workers RPC)

- **Dynamic Collection Loading**
  - Define collections as MDX files with YAML frontmatter
  - Auto-scan directories for `.mdx` collection definitions
  - Hot-reload support for development

- **Vector Embeddings**
  - Optional vector support for semantic search
  - Configurable dimensions (768, 1536, 3072)
  - Automatic indexing

## Installation

```bash
pnpm add @dot-do/payload-adapter
```

## Usage

### D1 Adapter (Cloudflare)

```typescript
import { createPayloadAdapter } from '@dot-do/payload-adapter'

const adapter = createPayloadAdapter({
  type: 'd1',
  d1: {
    binding: env.D1, // D1 database binding
  },
})
```

### SQLite Adapter (Local/Turso)

```typescript
import { createPayloadAdapter } from '@dot-do/payload-adapter'

const adapter = createPayloadAdapter({
  type: 'sqlite',
  sqlite: {
    url: 'file:./payload.db',
    syncUrl: 'libsql://your-db.turso.io', // Optional Turso replica
    authToken: process.env.TURSO_AUTH_TOKEN,
  },
  enableVectors: true,
  vectorDimensions: 768,
})
```

### RPC Adapter (DB Worker)

```typescript
import { createPayloadAdapter } from '@dot-do/payload-adapter'

const adapter = createPayloadAdapter({
  type: 'rpc',
  rpc: {
    dbWorker: env.DB_SERVICE, // Service binding to db worker
    namespace: 'payload', // Optional namespace (default: 'payload')
  },
})
```

## Dynamic Collections from MDX

Define collections as MDX files:

```mdx
---
name: posts
slug: posts
access:
  read: true
  create: authenticated
  update: authenticated
  delete: admin
fields:
  - name: title
    type: text
    required: true
  - name: slug
    type: text
    required: true
    unique: true
  - name: content
    type: richText
    required: true
  - name: author
    type: relationship
    relationTo: users
    required: true
admin:
  useAsTitle: title
  defaultColumns:
    - title
    - author
    - publishedAt
hooks:
  beforeChange:
    - autoGenerateSlug
  afterChange:
    - invalidateCache
---

# Posts Collection

Documentation for the posts collection...
```

Load collections in Payload config:

```typescript
import { buildConfig } from 'payload'
import { loadCollectionsFromMDX } from '@dot-do/payload-adapter'

const collections = loadCollectionsFromMDX([
  './collections',
  './apps',
])

export default buildConfig({
  collections,
  // ... rest of config
})
```

## MDX Collection Schema

### Required Fields

- `name` - Human-readable collection name
- `slug` - URL-friendly collection identifier
- `fields` - Array of field definitions

### Optional Fields

- `access` - Access control rules (read, create, update, delete)
- `admin` - Admin UI configuration
- `hooks` - Lifecycle hooks (beforeChange, afterChange, etc.)
- `timestamps` - Enable createdAt/updatedAt (default: true)

### Field Types

Supports all Payload field types:
- `text`, `textarea`, `email`, `number`, `checkbox`
- `select`, `radio`, `relationship`, `upload`
- `richText`, `json`, `array`, `blocks`
- Custom fields

### Access Rules

Access rules can be boolean or string presets:

- `true` - Public access
- `false` - No access
- `'authenticated'` - Requires authentication
- `'admin'` - Admin only
- Custom function strings (future)

## Vector Embeddings

When enabled, adds an `embedding` column to all collections:

```typescript
const adapter = createPayloadAdapter({
  type: 'sqlite',
  sqlite: { url: 'file:./db.sqlite' },
  enableVectors: true,
  vectorDimensions: 768, // BGE-M3, Gemma-768, etc.
})
```

Embeddings are stored as Float32 arrays and indexed for fast similarity search.

## RPC Interface

When using the RPC adapter, data is stored in the db worker's `things` table with composite keys:

```typescript
{
  ns: 'payload',         // Namespace
  id: 'doc-123',         // Document ID
  type: 'posts',         // Collection slug
  data: { ... },         // Document data
  content: '...',        // Serialized JSON
  visibility: 'private'  // Access level
}
```

### Benefits

- Unified data storage across platform
- PostgreSQL + ClickHouse backends
- Full-text and vector search
- Relationship graph support
- Multi-tenant isolation

## Development

```bash
# Build
pnpm build

# Watch mode
pnpm dev

# Tests
pnpm test

# Type check
pnpm typecheck
```

## Examples

See `projects/app/collections/` for example MDX collection definitions.

## Related Packages

- `workers/db` - Database worker with PostgreSQL/ClickHouse
- `workers/gateway` - API gateway with routing
- `mdx/packages/mdxdb` - MDX database sync tools

## License

MIT
