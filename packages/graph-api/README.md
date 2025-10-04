# @dot-do/graph-api

Core CRUD operations for graph database (Things & Relationships).

## Features

- ✅ **Multiple Backend Support** - D1, R2 SQL (DuckDB), ClickHouse, Durable Object SQLite
- ✅ **Type-Safe** - Full TypeScript support with strict types
- ✅ **Optimized Queries** - Inbound relationship queries are the primary use case
- ✅ **Bulk Operations** - Efficient bulk inserts for large datasets
- ✅ **Generic Schema** - Works for any graph data (ONET, Wikipedia, patents, etc.)

## Supported Backends

### 1. D1 (Cloudflare D1)
**Best for:** Production deployments, global read replicas

```typescript
import { createThing, getThing } from '@dot-do/graph-api'

// D1 binding from wrangler.jsonc
const thing = await createThing({
  ns: 'onet',
  id: 'javascript',
  type: 'skill',
  data: { name: 'JavaScript', category: 'technical' }
}, env.DB)
```

### 2. R2 SQL (DuckDB)
**Best for:** Analytics queries, medium datasets (<10M rows), cost optimization

```typescript
import { createR2SQLDatabase, initR2SQLSchemas, createThing } from '@dot-do/graph-api'

const db = createR2SQLDatabase(
  'your-account-id',
  'your-api-token',
  'your-bucket-name'
)

await initR2SQLSchemas(db)

const thing = await createThing({
  ns: 'onet',
  id: 'javascript',
  type: 'skill',
  data: { name: 'JavaScript', category: 'technical' }
}, db)
```

**R2 SQL Characteristics:**
- ✅ Columnar storage (efficient for analytics)
- ✅ Vectorized execution engine
- ✅ Lower cost than ClickHouse
- ✅ Simple setup (just an R2 bucket)
- ⚠️  Limited to 10M rows per dataset
- ⚠️  Query latency ~50-200ms

### 3. ClickHouse
**Best for:** Large datasets (>10M rows), complex aggregations, high-throughput analytics

```typescript
import { createClickHouseDatabase, initClickHouseSchemas, createThing } from '@dot-do/graph-api'

const db = createClickHouseDatabase(
  'your-account-id',
  'your-api-token',
  'your-database-id'
)

await initClickHouseSchemas(db)

const thing = await createThing({
  ns: 'onet',
  id: 'javascript',
  type: 'skill',
  data: { name: 'JavaScript', category: 'technical' }
}, db)
```

**ClickHouse Characteristics:**
- ✅ Purpose-built for analytics
- ✅ Scales to billions of rows
- ✅ Sub-10ms queries at scale
- ✅ Advanced features (materialized views, aggregations)
- ⚠️  More complex setup
- ⚠️  Higher cost at scale

### 4. Durable Object SQLite
**Best for:** Per-user/per-tenant graphs, strong consistency, transactional guarantees

```typescript
import { GraphDO } from '@dot-do/graph'

// Access via Durable Object stub
const id = env.GRAPH_DO.idFromName('user-123')
const stub = env.GRAPH_DO.get(id)

const thing = await stub.createThing({
  ns: 'user-123',
  id: 'javascript',
  type: 'skill',
  data: { name: 'JavaScript', category: 'technical' }
})
```

**Durable Object Characteristics:**
- ✅ Strongly consistent (ACID transactions)
- ✅ Isolated per-user/tenant
- ✅ Fast within region
- ⚠️  Single-region (not global)
- ⚠️  Limited to small datasets per DO

## Backend Selection Guide

| Use Case | Dataset Size | Queries/sec | Consistency | Recommended Backend |
|----------|-------------|-------------|-------------|---------------------|
| ONET occupations & skills | 50K things, 500K rels | <100/sec | Eventual OK | **R2 SQL** |
| Wikipedia knowledge graph | 10M+ things | <1000/sec | Eventual OK | **ClickHouse** |
| Patent citations | 100M+ things | >1000/sec | Eventual OK | **ClickHouse** |
| Per-user task graphs | <10K things per user | Any | Strong needed | **Durable Object** |
| Public API (global reads) | Any size | High | Eventual OK | **D1** |

## Performance Comparison

Run benchmarks:
```bash
cd workers
pnpm tsx scripts/benchmark-databases.ts
```

**Expected Results** (sample ONET data):

| Operation | R2 SQL | ClickHouse | Winner |
|-----------|--------|------------|--------|
| Bulk insert things (9 records) | ~50ms | ~30ms | ClickHouse (1.7x) |
| Bulk insert relationships (13 records) | ~60ms | ~35ms | ClickHouse (1.7x) |
| Query by type | ~25ms | ~15ms | ClickHouse (1.7x) |
| Inbound relationships | ~30ms | ~20ms | ClickHouse (1.5x) |

**Cost Comparison** (estimated):
- **R2 SQL**: ~$0.015/GB storage + $0.36/million reads = ~$0.40/month for ONET
- **ClickHouse**: ~$0.05/GB storage + $0.50/million queries = ~$2.00/month for ONET
- **D1**: ~$0.75/GB storage + $0.001/read = ~$1.50/month for ONET

## Core Operations

### Things (Entities)

```typescript
import {
  createThing,
  getThing,
  updateThing,
  deleteThing,
  queryThings,
  bulkCreateThings
} from '@dot-do/graph-api'

// Create
const thing = await createThing({
  ns: 'onet',
  id: 'javascript',
  type: 'skill',
  data: { name: 'JavaScript', category: 'technical' },
  content: '# JavaScript\n\nProgramming language...'
}, db)

// Read
const found = await getThing('onet', 'javascript', db)

// Update
const updated = await updateThing('onet', 'javascript', {
  data: { name: 'JavaScript', category: 'technical', level: 5 }
}, db)

// Delete
await deleteThing('onet', 'javascript', db)

// Query
const skills = await queryThings({
  type: 'skill',
  contentLike: 'programming'
}, { limit: 100 }, db)

// Bulk insert
await bulkCreateThings([thing1, thing2, thing3], db)
```

### Relationships (Edges)

```typescript
import {
  createRelationship,
  getInboundRelationships,
  getOutboundRelationships,
  queryRelationships,
  bulkCreateRelationships
} from '@dot-do/graph-api'

// Create
const rel = await createRelationship({
  fromNs: 'onet',
  fromId: '15-1252.00',
  fromType: 'occupation',
  predicate: 'requires_skill',
  toNs: 'onet',
  toId: 'javascript',
  toType: 'skill',
  data: { level: 5, importance: 5 }
}, db)

// Inbound (PRIMARY USE CASE: "What requires JavaScript?")
const requiring = await getInboundRelationships('onet', 'javascript', {
  predicate: 'requires_skill',
  limit: 100
}, db)

// Outbound ("What does Software Developer require?")
const required = await getOutboundRelationships('onet', '15-1252.00', {
  predicate: 'requires_skill'
}, db)

// Query
const allSkillRels = await queryRelationships({
  predicate: 'requires_skill',
  toType: 'skill'
}, { limit: 1000 }, db)

// Bulk insert
await bulkCreateRelationships([rel1, rel2, rel3], db)
```

## Schema

### Things Table

```sql
CREATE TABLE things (
  ulid TEXT PRIMARY KEY,
  ns TEXT NOT NULL,
  id TEXT NOT NULL,
  type TEXT NOT NULL,
  data TEXT NOT NULL,  -- JSON
  content TEXT,        -- Markdown content
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(ns, id)
)

CREATE INDEX idx_things_ns_id ON things(ns, id)
CREATE INDEX idx_things_type ON things(type)
CREATE INDEX idx_things_content ON things(content)
```

### Relationships Table

```sql
CREATE TABLE relationships (
  ulid TEXT PRIMARY KEY,
  fromNs TEXT NOT NULL,
  fromId TEXT NOT NULL,
  fromType TEXT NOT NULL,
  predicate TEXT NOT NULL,
  toNs TEXT NOT NULL,
  toId TEXT NOT NULL,
  toType TEXT NOT NULL,
  data TEXT,  -- JSON
  createdAt TEXT NOT NULL,
  UNIQUE(fromNs, fromId, predicate, toNs, toId)
)

-- Optimized for inbound queries (PRIMARY USE CASE)
CREATE INDEX idx_relationships_inbound ON relationships(toNs, toId, predicate)
CREATE INDEX idx_relationships_outbound ON relationships(fromNs, fromId, predicate)
CREATE INDEX idx_relationships_predicate ON relationships(predicate)
```

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test:watch

# Type check
pnpm typecheck
```

## Related Packages

- `@dot-do/graph-types` - TypeScript types for Things & Relationships
- `@dot-do/graph` - Graph service worker (RPC, REST, MCP interfaces)
- `@dot-do/onet-importer` - ONET data importer

## License

MIT
