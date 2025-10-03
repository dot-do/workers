# Database Service (@db)

Comprehensive database abstraction layer that handles ALL data access for the platform.

## Overview

The `@db` service is a Unix philosophy microservice - it does one thing (data access) and does it very well. It provides a clean abstraction over PostgreSQL and ClickHouse databases with three interfaces:

1. **RPC Interface** - WorkerEntrypoint for service-to-service communication
2. **HTTP Interface** - REST API for health checks and debugging
3. **MCP Interface** - AI agent tools for database operations

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Database Service (@db)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  RPC (WorkerEntrypoint)     HTTP (Hono)      MCP (Tools)    │
│  ├─ get()                   ├─ /health       ├─ db_query    │
│  ├─ list()                  ├─ /stats        ├─ db_get      │
│  ├─ search()                ├─ /types        ├─ db_search   │
│  ├─ upsert()                ├─ /activity     ├─ db_list     │
│  ├─ delete()                └─ /rpc          └─ db_stats    │
│  ├─ query()                                                  │
│  └─ transaction()                                            │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                       Query Modules                          │
│  ├─ things.ts          - Thing CRUD operations              │
│  ├─ relationships.ts   - Relationship CRUD                  │
│  ├─ search.ts          - Full-text + vector search          │
│  └─ analytics.ts       - Database statistics                │
├─────────────────────────────────────────────────────────────┤
│                      Database Clients                        │
│  ├─ PostgreSQL/Neon    - Primary data store (Drizzle ORM)  │
│  └─ ClickHouse         - Analytics & event streaming        │
└─────────────────────────────────────────────────────────────┘
```

## Installation

```bash
pnpm install
```

## Configuration

### Environment Variables

Required in `.dev.vars` or Wrangler secrets:

```bash
# PostgreSQL/Neon connection
DATABASE_URL=postgresql://user:pass@host/database

# ClickHouse connection (optional)
CLICKHOUSE_URL=https://...
CLICKHOUSE_DATABASE=default
CLICKHOUSE_USERNAME=default
CLICKHOUSE_PASSWORD=...
```

### Wrangler Configuration

Service bindings in `wrangler.jsonc`:

```jsonc
{
  "services": [
    { "binding": "DB", "service": "db" }
  ]
}
```

## Usage

### RPC Interface (Service-to-Service)

Most efficient for service-to-service communication:

```typescript
// Get a thing
const thing = await env.DB.get('onet', 'software-developers')

// List things with pagination
const result = await env.DB.list('onet', {
  type: 'Occupation',
  limit: 100,
  offset: 0
})

// Search (full-text or hybrid)
const results = await env.DB.search('software engineer', embedding, {
  ns: 'onet',
  limit: 20
})

// Upsert a thing
await env.DB.upsert({
  ns: 'onet',
  id: 'software-developers',
  type: 'Occupation',
  data: { title: 'Software Developers', code: '15-1252.00' },
  content: '# Software Developers\n\nDesign and develop software...'
})

// Delete a thing
await env.DB.delete('onet', 'software-developers')

// Get relationships
const rels = await env.DB.getRelationships('onet', 'software-developers')

// Database statistics
const stats = await env.DB.stats()

// Count entities
const count = await env.DB.count('onet', { type: 'Occupation' })
```

### HTTP Interface (REST API)

For health checks, monitoring, and debugging:

```bash
# Health check
GET /health

# Database statistics
GET /stats

# Type distribution
GET /types?ns=onet

# Recent activity (ClickHouse)
GET /activity?limit=100

# RPC over HTTP (debugging)
POST /rpc
{
  "method": "get",
  "params": ["onet", "software-developers"]
}
```

### MCP Tools (AI Agents)

For AI agents and Claude Code integration:

**db_query** - Execute SQL query
```json
{
  "query": "SELECT * FROM things WHERE ns = 'onet' LIMIT 10",
  "database": "postgres"
}
```

**db_get** - Get entity by ID
```json
{
  "ns": "onet",
  "id": "software-developers",
  "includeRelationships": true
}
```

**db_search** - Search entities
```json
{
  "query": "software engineer",
  "ns": "onet",
  "limit": 20,
  "searchMode": "hybrid"
}
```

**db_list** - List entities
```json
{
  "ns": "onet",
  "type": "Occupation",
  "limit": 100,
  "offset": 0
}
```

**db_stats** - Get database statistics
```json
{
  "includeClickHouse": true
}
```

## Query Modules

### things.ts

CRUD operations for things (entities):

- `get(ns, id, options)` - Get single thing
- `list(ns, options)` - List things with pagination
- `upsert(thing)` - Insert or update thing
- `del(ns, id)` - Delete thing
- `search(query, options)` - Text search
- `count(ns, filters)` - Count things

### relationships.ts

CRUD operations for relationships:

- `getRelationships(ns, id, options)` - Get outgoing relationships
- `getIncomingRelationships(ns, id, options)` - Get incoming relationships
- `upsert(relationship)` - Insert or update relationship
- `del(ns, id)` - Delete relationship
- `list(ns, options)` - List relationships

### search.ts

Advanced search operations:

- `vectorSearch(embedding, options)` - Semantic search with pgvector
- `fullTextSearch(query, options)` - PostgreSQL full-text search
- `hybridSearch(query, embedding, options)` - Combines both with RRF

### analytics.ts

Database analytics and statistics:

- `getDatabaseStats()` - Counts, types, namespace distribution
- `getTypeDistribution(ns?)` - Entity type distribution
- `getClickHouseStats()` - ClickHouse analytics (if available)
- `getRecentActivity(limit)` - Recent events from ClickHouse

## Database Schema

### things

Primary entity table with composite key:

```sql
CREATE TABLE things (
  ns TEXT NOT NULL,
  id TEXT NOT NULL,
  type TEXT NOT NULL,
  content TEXT,
  code TEXT,
  data JSONB NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public',
  embedding vector(768),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ns, id)
);
```

### relationships

Graph relationships with composite key:

```sql
CREATE TABLE relationships (
  ns TEXT NOT NULL,
  id TEXT NOT NULL,
  type TEXT NOT NULL,
  from_ns TEXT NOT NULL,
  from_id TEXT NOT NULL,
  to_ns TEXT NOT NULL,
  to_id TEXT NOT NULL,
  data JSONB NOT NULL,
  code TEXT,
  visibility TEXT NOT NULL DEFAULT 'public',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (ns, id)
);
```

## Performance Characteristics

**Target Latencies (p95)**:
- `get()` / `list()`: < 10ms
- `search()`: < 50ms
- `vectorSearch()`: < 100ms
- `hybridSearch()`: < 150ms

**Optimization Features**:
- Connection pooling via Neon HTTP driver
- Lazy client initialization (singleton pattern)
- Parameterized queries (SQL injection prevention)
- Indexed columns for fast lookups
- HNSW indexes for vector search
- Query result pagination (max 1000 items)

## Testing

```bash
# Run test suite
pnpm test

# Watch mode
pnpm test -- --watch

# Coverage report
pnpm test -- --coverage
```

**Test Coverage Target**: 80%+

## Development

```bash
# Start development server
pnpm dev

# Type check
pnpm types

# Deploy to production
pnpm deploy
```

## Dependencies

**Core**:
- `drizzle-orm` - PostgreSQL ORM
- `@neondatabase/serverless` - Neon HTTP driver
- `@clickhouse/client-web` - ClickHouse client
- `hono` - HTTP framework

**Dev**:
- `vitest` - Testing framework
- `@cloudflare/vitest-pool-workers` - Workers test pool
- `drizzle-kit` - Database migrations

## Architecture Decisions

**1. Dual Database Support**
- PostgreSQL for structured data, transactions, consistency
- ClickHouse for analytics, events, time-series data
- Both accessible via single service interface

**2. Query Module Organization**
- Separate files for domain concerns (things, relationships, search, analytics)
- Each module exports focused, reusable functions
- Shared PostgreSQL client via singleton pattern

**3. Three Interfaces**
- RPC for efficiency (typed, fast, service-to-service)
- HTTP for debugging (health checks, monitoring)
- MCP for AI agents (Claude Code, LLMs)

**4. No Business Logic**
- Pure data access layer - no business rules
- Validation and business logic belong in calling services
- Focus on fast, reliable data operations

**5. Pagination Required**
- All list operations require limit/offset
- Maximum 1000 items per query
- Prevents memory exhaustion on large datasets

## Migration from Legacy

This service replaces the legacy `worker.ts` implementation with:

1. **Better Organization** - Query modules instead of monolithic file
2. **Type Safety** - Full TypeScript with Drizzle ORM
3. **Three Interfaces** - RPC + HTTP + MCP instead of just HTTP
4. **Better Testing** - Comprehensive test suite with 80%+ coverage
5. **Performance** - Optimized queries, connection pooling, caching

## Future Enhancements

- [ ] D1 integration for edge data
- [ ] Durable Objects for stateful operations
- [ ] R2 integration for blob storage
- [ ] MongoDB integration for document storage
- [ ] Redis/KV caching layer
- [ ] Query result streaming
- [ ] Transaction logging
- [ ] Automatic schema migrations
- [ ] Query performance monitoring

## API Reference

See [src/index.ts](./src/index.ts) for complete RPC interface documentation.

## License

Private - Dot-Do Organization

## Contact

Issues: https://github.com/dot-do/workers/issues
