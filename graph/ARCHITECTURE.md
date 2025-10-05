# Architecture Documentation

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Client Applications                          │
│  (Web App, Mobile, CLI, AI Agents, MDX Repositories)            │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP/HTTPS
                         │ REST API
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│               Cloudflare Workers (Hono Framework)                │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     API Endpoints                          │ │
│  │  /things | /relationships | /query | /mdx                 │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────┐  ┌──────────────────┐  ┌─────────────┐  │
│  │  Things CRUD      │  │ Relationships    │  │ Query       │  │
│  │  - create()       │  │ CRUD             │  │ Engine      │  │
│  │  - read()         │  │ - create()       │  │ - traverse()│  │
│  │  - update()       │  │ - read()         │  │ - path()    │  │
│  │  - delete()       │  │ - update()       │  │ - subgraph()│  │
│  │  - search()       │  │ - delete()       │  │ - stats()   │  │
│  └───────────────────┘  └──────────────────┘  └─────────────┘  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │             Schema.org Validation (Zod)                    │ │
│  │  Person | Organization | Product | CreativeWork | ...     │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                  MDX Sync Engine                           │ │
│  │  - frontmatter → properties                                │ │
│  │  - properties → MDX                                        │ │
│  │  - webhook handler                                         │ │
│  └────────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────────┘
                         │ D1 Client API
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare D1 (SQLite)                        │
│  ┌──────────────────────┐       ┌──────────────────────┐        │
│  │  Things Table        │       │  Relationships Table │        │
│  ├──────────────────────┤       ├──────────────────────┤        │
│  │ id (URI)             │       │ id (auto-increment)  │        │
│  │ type                 │◄──────┤ subject (URI)        │        │
│  │ properties (JSONB)   │       │ predicate (URI)      │        │
│  │ source               │       │ object (URI)         │────────┤
│  │ namespace            │       │ properties (JSONB)   │        │
│  │ created_at           │       │ namespace            │        │
│  │ updated_at           │       │ created_at           │        │
│  └──────────────────────┘       │ updated_at           │        │
│                                 └──────────────────────┘        │
│                                                                  │
│  Indexes:                                                        │
│  - idx_things_type (type)                                       │
│  - idx_things_source (source)                                   │
│  - idx_rel_subject (subject, predicate) ← Forward traversal     │
│  - idx_rel_object (object, predicate)   ← Backward traversal    │
│  - idx_rel_predicate (predicate)                                │
└─────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                R2 Backup Storage (Optional)                      │
│  - Database dumps                                                │
│  - Export archives                                               │
│  - MDX files                                                     │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. Create Entity Flow

```
Client
  │
  │ POST /things
  │ { id, type, properties }
  ▼
API Handler
  │
  │ 1. Validate input (Zod)
  ▼
Schema.org Validator
  │
  │ 2. Check type schema
  ▼
Things CRUD
  │
  │ 3. INSERT INTO things
  ▼
D1 Database
  │
  │ 4. Return created entity
  ▼
Client
```

### 2. Graph Traversal Flow

```
Client
  │
  │ GET /query/traverse/:id?depth=2
  ▼
API Handler
  │
  │ 1. Parse parameters
  ▼
Query Engine
  │
  │ 2. Build recursive CTE
  │ WITH RECURSIVE graph_traversal AS (
  │   SELECT id, type, depth FROM things WHERE id = ?
  │   UNION ALL
  │   SELECT t.id, t.type, gt.depth+1
  │   FROM graph_traversal gt
  │   JOIN relationships r ON gt.id = r.subject
  │   JOIN things t ON r.object = t.id
  │   WHERE gt.depth < 2
  │ )
  ▼
D1 Database
  │
  │ 3. Execute query with indexes
  │    idx_rel_subject for forward edges
  │    idx_rel_object for backward edges
  ▼
Query Engine
  │
  │ 4. Fetch all edges between discovered nodes
  ▼
D1 Database
  │
  │ 5. Return { nodes, edges, stats }
  ▼
Client
```

### 3. Shortest Path Flow

```
Client
  │
  │ GET /query/shortest-path?from=A&to=B
  ▼
API Handler
  │
  │ 1. Parse source and target
  ▼
Query Engine
  │
  │ 2. Build path-finding CTE
  │ WITH RECURSIVE paths AS (
  │   SELECT current_node, path, depth
  │   UNION ALL
  │   SELECT r.object, path || ' -> ' || r.object, depth+1
  │   FROM paths
  │   JOIN relationships r ON current_node = r.subject
  │   WHERE path NOT LIKE '%' || r.object || '%' -- Prevent cycles
  │ )
  │ SELECT * FROM paths WHERE current_node = B
  │ ORDER BY depth ASC LIMIT 1
  ▼
D1 Database
  │
  │ 3. Return shortest path
  ▼
Query Engine
  │
  │ 4. Reconstruct path with node/edge details
  ▼
Client
```

### 4. MDX Sync Flow

```
GitHub MDX Repo
  │
  │ git push
  ▼
GitHub Webhook
  │
  │ POST /mdx/webhook
  │ { repository, files: [{slug, frontmatter, content}] }
  ▼
API Handler
  │
  │ 1. Verify signature (HMAC-SHA256)
  ▼
MDX Sync Engine
  │
  │ 2. For each file:
  │    - Map frontmatter → Schema.org properties
  │    - Determine type from repository
  │    - Extract relationship references
  ▼
Schema.org Validator
  │
  │ 3. Validate properties
  ▼
Things CRUD
  │
  │ 4. Upsert entity
  ▼
Relationships CRUD
  │
  │ 5. Upsert relationships
  ▼
D1 Database
  │
  │ 6. Return sync status
  ▼
GitHub Webhook Response
```

## Component Interactions

### Things CRUD → D1

```typescript
// Create operation
async function create(db: D1Database, input: CreateThingInput) {
  // Validate
  validateThing(input.type, input.properties)

  // Insert
  const stmt = db.prepare(`
    INSERT INTO things (id, type, properties, source, namespace)
    VALUES (?1, ?2, ?3, ?4, ?5)
    RETURNING *
  `)

  return await stmt.bind(
    input.id,
    input.type,
    JSON.stringify(input.properties),
    input.source,
    input.namespace
  ).first()
}
```

### Query Engine → D1

```typescript
// N-hop traversal
async function traverse(db: D1Database, startId: string, maxDepth: number) {
  const query = `
    WITH RECURSIVE graph_traversal AS (
      SELECT id, type, properties, 0 as depth
      FROM things WHERE id = ?1

      UNION ALL

      SELECT t.id, t.type, t.properties, gt.depth + 1
      FROM graph_traversal gt
      JOIN relationships r ON gt.id = r.subject
      JOIN things t ON r.object = t.id
      WHERE gt.depth < ?2
    )
    SELECT * FROM graph_traversal
  `

  const result = await db.prepare(query).bind(startId, maxDepth).all()
  return processResults(result)
}
```

### MDX Sync → Schema.org

```typescript
// Convert frontmatter to Schema.org properties
function frontmatterToProperties(frontmatter: MDXFrontmatter, repo: string) {
  const properties = {
    name: frontmatter.title,
    description: frontmatter.description,
  }

  // Repo-specific mappings
  if (repo === 'apps') {
    if (frontmatter.url) properties.url = frontmatter.url
    if (frontmatter.platform) properties.operatingSystem = frontmatter.platform
    if (frontmatter.techStack) properties.programmingLanguage = frontmatter.techStack
  }

  return properties
}
```

## Index Strategy

### Things Table Indexes

```sql
-- Type-based queries
CREATE INDEX idx_things_type ON things(type);
-- Query: SELECT * FROM things WHERE type = 'Person'
-- Performance: O(log n) + O(k) where k = number of matching rows

-- Source-based queries (MDX repos)
CREATE INDEX idx_things_source ON things(source);
-- Query: SELECT * FROM things WHERE source = 'apps'
-- Performance: O(log n) + O(k)

-- Namespace filtering
CREATE INDEX idx_things_namespace ON things(namespace);
-- Query: SELECT * FROM things WHERE namespace = 'default'
-- Performance: O(log n) + O(k)

-- Recent updates
CREATE INDEX idx_things_updated ON things(updated_at);
-- Query: SELECT * FROM things ORDER BY updated_at DESC LIMIT 20
-- Performance: O(log n) + O(20)
```

### Relationships Table Indexes

```sql
-- Forward traversal (outgoing edges)
CREATE INDEX idx_rel_subject ON relationships(subject, predicate);
-- Query: SELECT * FROM relationships WHERE subject = 'uri'
-- Performance: O(log n) + O(k) where k = out-degree
-- Use case: Find all entities this entity points to

-- Backward traversal (incoming edges)
CREATE INDEX idx_rel_object ON relationships(object, predicate);
-- Query: SELECT * FROM relationships WHERE object = 'uri'
-- Performance: O(log n) + O(k) where k = in-degree
-- Use case: Find all entities pointing to this entity

-- Predicate filtering
CREATE INDEX idx_rel_predicate ON relationships(predicate);
-- Query: SELECT * FROM relationships WHERE predicate = 'worksFor'
-- Performance: O(log n) + O(k)
-- Use case: Find all relationships of a specific type

-- Bidirectional queries
CREATE INDEX idx_rel_subject_object ON relationships(subject, object);
-- Query: SELECT * FROM relationships WHERE subject = 'A' AND object = 'B'
-- Performance: O(log n)
-- Use case: Check if specific relationship exists
```

## Query Complexity

### Operations by Complexity

**O(1) - Constant Time:**
- Get thing by ID: `SELECT * FROM things WHERE id = ?`
- Get relationship by ID: `SELECT * FROM relationships WHERE id = ?`
- Health check: `SELECT 1`

**O(log n) - Logarithmic:**
- Count by type: `SELECT COUNT(*) FROM things WHERE type = ?`
- Check relationship exists: Using `idx_rel_subject_object`
- Recent items: Using `idx_things_updated`

**O(k) - Linear in Result Size:**
- List things with limit: `SELECT * FROM things LIMIT 20`
- Get outgoing edges: Using `idx_rel_subject`
- Get incoming edges: Using `idx_rel_object`

**O(k * d) - Graph Traversal:**
- N-hop traversal: `k` = avg degree, `d` = depth
- Shortest path: Best case O(k), worst case O(n)
- Subgraph extraction: O(k^d) where d = radius

**O(n) - Linear:**
- Full table scan: `SELECT * FROM things` (avoid!)
- Count all: `SELECT COUNT(*) FROM things`
- Search with LIKE: `WHERE properties LIKE '%term%'` (slow!)

## Scalability Considerations

### Vertical Scaling (Single Database)

**D1 Limits:**
- Database size: ~10GB (beta, subject to change)
- Queries per second: ~1000 QPS
- Query timeout: 30 seconds
- Connection pool: Managed by Cloudflare

**Optimizations:**
- Use indexes for all queries
- Limit traversal depth (2-3 hops)
- Paginate large result sets
- Cache frequently accessed subgraphs
- Batch operations when possible

### Horizontal Scaling (Multiple Databases)

**Sharding by Namespace:**
```typescript
// Route to correct database based on namespace
function getDatabaseForNamespace(namespace: string): D1Database {
  const shard = hashNamespace(namespace) % NUM_SHARDS
  return databases[shard]
}
```

**Sharding by Entity Type:**
```typescript
// Route to correct database based on type
function getDatabaseForType(type: string): D1Database {
  if (type === 'Person' || type === 'Organization') {
    return peopleDatabase
  } else if (type === 'Product' || type === 'Offer') {
    return catalogDatabase
  }
  return defaultDatabase
}
```

**Cross-Shard Queries:**
- Avoid when possible
- Use application-level joins
- Consider eventual consistency

### Alternative Architectures

**For Very Large Graphs (>1M nodes):**
1. **Specialized Graph Database**
   - Neo4j, TigerGraph, DGraph
   - Native graph storage and algorithms
   - Better for complex queries

2. **Hybrid Approach**
   - D1 for metadata and simple queries
   - Vectorize for semantic search
   - ClickHouse for analytics
   - Durable Objects for real-time updates

3. **Distributed Graph**
   - Partition by community/cluster
   - Cross-partition queries via federation
   - CAP theorem trade-offs

## Security Considerations

### Input Validation

```typescript
// Always validate URIs
const uriSchema = z.string().url()

// Validate Schema.org types
const typeSchema = z.enum(['Person', 'Organization', ...])

// Sanitize JSONB properties
function sanitizeProperties(props: unknown): Record<string, any> {
  // Remove dangerous keys
  // Validate data types
  // Limit nesting depth
  return cleanProps
}
```

### Access Control (Future Enhancement)

```typescript
// Namespace-based access
function checkAccess(user: User, namespace: string): boolean {
  return user.namespaces.includes(namespace)
}

// Entity-level permissions
interface AccessControl {
  read: string[]   // User/role IDs
  write: string[]
  admin: string[]
}
```

### Rate Limiting

```typescript
// Per-user rate limits
const rateLimiter = new Map<string, number>()

function checkRateLimit(userId: string, limit: number): boolean {
  const count = rateLimiter.get(userId) || 0
  if (count >= limit) return false

  rateLimiter.set(userId, count + 1)
  return true
}
```

## Monitoring and Observability

### Key Metrics

**Performance Metrics:**
- Query latency (p50, p95, p99)
- Database connection time
- Query execution time
- Cache hit rate

**Business Metrics:**
- Total entities by type
- Total relationships by predicate
- Graph growth rate
- Active namespaces

**Health Metrics:**
- Database availability
- Error rate
- Webhook success rate
- MDX sync status

### Logging Strategy

```typescript
// Structured logging
interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error'
  operation: string
  duration?: number
  metadata?: Record<string, any>
}

function logQuery(query: string, duration: number) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level: 'info',
    operation: 'query',
    duration,
    metadata: { query }
  }))
}
```

---

**Last Updated:** 2025-10-03
**Version:** 1.0.0
