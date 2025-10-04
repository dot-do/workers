# Unified Schema Proposal v2

**Date:** 2025-10-04
**Status:** 🔶 Awaiting Approval
**Version:** 2.0 - Events vs Data separation

## Executive Summary

This proposal separates our data model into **two fundamental concepts**:

1. **EVENTS** - Immutable, temporal records (logs, mutations, changes)
2. **DATA** - Current state (things, entities, relationships)

With proper composite keys (`ns` + `id`) and complete Cloudflare pricing analysis.

---

## Core Concepts

### 1. Events (Immutable, Temporal)

**What are events?**
- Log entries from workers
- State mutations (create, update, delete)
- Error events
- Performance metrics
- User actions
- System events

**Characteristics:**
- ✅ Immutable (never modified after creation)
- ✅ Temporal (timestamped, ordered)
- ✅ Append-only (only inserts, no updates/deletes)
- ✅ High volume (millions per day)
- ✅ Time-series queries

**Storage Options:**
- **R2 SQL** - Cost-effective long-term storage
- **ClickHouse** - Real-time analytics, fast aggregations
- **Both** - Use for different purposes

### 2. Data (Mutable, Current State)

**What is data?**
- Things (entities, objects)
- Relationships (connections between things)
- Current state (not history)
- User-facing entities

**Characteristics:**
- ❌ Mutable (updated in place)
- ✅ Current state (latest version)
- ✅ Lower volume (thousands to millions)
- ✅ Entity queries (by ID, type, namespace)
- ✅ Vector embeddings (semantic search)

**Storage Options:**
- **PostgreSQL** - Primary data store (Neon)
- **Vectorize** - Vector embeddings for semantic search
- **pgvector** - Alternative for vector search with SQL filters

---

## Versioning Strategy

### Option 1: Events as History (Recommended)

**Approach:** Data table has current state, events table has mutation history

```
┌─────────────────┐       ┌──────────────────┐
│   things        │       │   events         │
│  (current)      │       │  (history)       │
├─────────────────┤       ├──────────────────┤
│ ns: "onet"      │  ◄──  │ timestamp: T1    │
│ id: "15-1252"   │       │ type: "create"   │
│ type: "Occ."    │       │ ns: "onet"       │
│ data: {...}     │       │ id: "15-1252"    │
│ updated_at: T3  │       │ data: {...}      │
│                 │  ◄──  ├──────────────────┤
│                 │       │ timestamp: T2    │
│                 │       │ type: "update"   │
│                 │       │ ns: "onet"       │
│                 │       │ id: "15-1252"    │
│                 │       │ data: {...}      │
│                 │  ◄──  ├──────────────────┤
│                 │       │ timestamp: T3    │
│                 │       │ type: "update"   │
│                 │       │ ns: "onet"       │
│                 │       │ id: "15-1252"    │
│                 │       │ data: {...}      │
└─────────────────┘       └──────────────────┘
```

**Pros:**
- ✅ Simple queries for current state
- ✅ Full history available in events
- ✅ Can reconstruct any point in time
- ✅ No version field needed in data table

**Cons:**
- ❌ Two tables to maintain
- ❌ Must replay events to get historical state

### Option 2: Variants in ID Field

**Approach:** Use variant syntax in ID for alternatives

```
things
├── ns: "en.wikipedia.org"
│   ├── id: "Software_developer"           (canonical)
│   ├── id: "Software_developer#mobile"    (variant: mobile version)
│   └── id: "Software_developer#simplified" (variant: simplified)
```

**Syntax:**
- Canonical: `{id}`
- Variant: `{id}#{variant}`
- Version: Could use `{id}@{version}` but NOT recommended

**Pros:**
- ✅ Single table
- ✅ Variants co-located with canonical
- ✅ No separate versioning system

**Cons:**
- ❌ Queries must handle variant syntax
- ❌ Not suitable for temporal versioning
- ❌ Complex to reconstruct history

### Recommendation: **Option 1 (Events as History)**

**Rationale:**
1. Events exist anyway (logs, mutations)
2. Temporal versioning != variants (different use cases)
3. Simpler data table queries
4. Full audit trail automatically

**Use variants for:**
- Different representations (mobile vs desktop)
- Different languages (en vs es)
- Different formats (json vs yaml)

**NOT for:**
- Temporal versions (use events)
- History tracking (use events)
- Audit trail (use events)

---

## Composite Key: `ns` + `id`

### Rules

**Namespace (`ns`):**
- Domain: `example.com`
- Subdomain: `en.wikipedia.org`
- Domain + path: `github.com/repos`
- **No leading slash**
- **No trailing slash**
- **Spaces NOT allowed** (use domain-safe characters)

**ID (`id`):**
- Simple: `15-1252.00`
- Path-like: `users/123/profile`
- **No leading slash** (path starts without /)
- **Spaces allowed** (e.g., "Software developer")
- **URL encoding:** Spaces → underscores (Wikipedia style)

### Examples

| ns | id | URL | Description |
|----|----|-----|-------------|
| `onet` | `15-1252.00` | `/onet/15-1252.00` | ONET occupation code |
| `en.wikipedia.org` | `Software developer` | `/en.wikipedia.org/Software_developer` | Wikipedia article |
| `github.com/repos` | `dot-do/workers` | `/github.com/repos/dot-do/workers` | GitHub repo |
| `stripe.com/api` | `customers/cus_123` | `/stripe.com/api/customers/cus_123` | Stripe customer |
| `onet` | `Software developer` | `/onet/Software_developer` | ONET title with spaces |

### URL Generation

```typescript
function toURL(ns: string, id: string): string {
  // Replace spaces with underscores (Wikipedia style)
  const urlId = id.replace(/ /g, '_')
  return `/${ns}/${urlId}`
}

function fromURL(url: string): { ns: string; id: string } {
  const parts = url.split('/').filter(Boolean)
  const ns = parts.slice(0, -1).join('/')
  const urlId = parts[parts.length - 1]
  // Restore spaces from underscores
  const id = urlId.replace(/_/g, ' ')
  return { ns, id }
}
```

**Examples:**
```typescript
toURL("en.wikipedia.org", "Software developer")
// → "/en.wikipedia.org/Software_developer"

fromURL("/en.wikipedia.org/Software_developer")
// → { ns: "en.wikipedia.org", id: "Software developer" }

toURL("onet", "15-1252.00")
// → "/onet/15-1252.00"

toURL("github.com/repos", "dot-do/workers")
// → "/github.com/repos/dot-do/workers"
```

### Database Constraints

```sql
-- ns + id composite primary key
PRIMARY KEY (ns, id)

-- Constraints
CONSTRAINT valid_ns CHECK (ns ~ '^[a-z0-9.-]+(/[a-z0-9.-]+)*$')  -- domain/path format
CONSTRAINT valid_id CHECK (length(id) > 0 AND length(id) <= 2048)  -- reasonable length
```

---

## Schema Design

### Table 1: Events (Immutable, Temporal)

**Purpose:** All mutations, logs, changes over time

```sql
CREATE TABLE events (
  -- Identity (Primary Key)
  ulid String,                    -- ULID (time-sortable, unique)
  timestamp DateTime64(3),        -- Event creation time
  event_timestamp DateTime64(3),  -- Original event timestamp (if different)

  -- Event Classification
  event_type String,              -- 'log', 'mutation', 'metric', 'error'
  mutation_type Nullable(String), -- 'create', 'update', 'delete' (for mutations)

  -- Entity Reference (composite key)
  entity_ns Nullable(String),     -- Namespace (for mutations)
  entity_id Nullable(String),     -- ID (for mutations)
  entity_type Nullable(String),   -- Type (for mutations)

  -- Source Information
  script_name String,             -- Worker name
  dispatch_namespace String,      -- 'production', 'staging', 'development'
  worker_name String,             -- Full worker name

  -- Request Context
  url Nullable(String),
  method Nullable(String),        -- HTTP method
  cf_ray Nullable(String),        -- Cloudflare Ray ID
  user_agent Nullable(String),
  ip Nullable(String),

  -- Response
  status Nullable(UInt16),        -- HTTP status code
  outcome String,                 -- 'ok', 'exception', 'exceededCpu'

  -- RPC Context
  rpc_method Nullable(String),    -- RPC method name

  -- Error Information
  severity String,                -- 'critical', 'error', 'warning', 'info'
  category String,                -- 'exception', 'runtime', 'http', 'application', 'success'
  error_type Nullable(String),    -- Specific error type
  error_message Nullable(String), -- Error message (max 1000 chars)
  has_exception Boolean,

  -- Performance Metrics
  cpu_time UInt32,                -- CPU time in milliseconds
  wall_time UInt32,               -- Wall clock time in milliseconds

  -- Event Data
  data String,                    -- JSON data (for mutations: before/after state)
  metadata Nullable(String),      -- Additional metadata (JSON)

  -- Logs and Exceptions (JSON)
  log_count UInt16,
  logs Nullable(String),          -- JSON array of logs
  exception_count UInt16,
  exceptions Nullable(String),    -- JSON array of exceptions

  -- Pipeline Metadata
  pipeline_instance String,
  pipeline_batch_id String,
  retry_count UInt8

-- ClickHouse
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (timestamp, script_name, event_type, severity)
SETTINGS index_granularity = 8192;

-- R2 SQL (Parquet) will automatically partition by timestamp
```

### Table 2: Things (Mutable, Current State)

**Purpose:** Current state of all entities

```sql
-- PostgreSQL (Neon) with pgvector
CREATE TABLE things (
  -- Composite Primary Key
  ns TEXT NOT NULL,               -- Namespace (domain/subdomain/path)
  id TEXT NOT NULL,               -- ID (can contain spaces, paths)
  PRIMARY KEY (ns, id),

  -- Entity Metadata
  type TEXT NOT NULL,             -- Entity type (e.g., 'Occupation', 'Article')
  visibility TEXT NOT NULL DEFAULT 'public',  -- 'public', 'private', 'unlisted'

  -- Content
  content TEXT,                   -- Markdown/text content
  code TEXT,                      -- Machine-readable code (e.g., '15-1252.00')
  data JSONB NOT NULL DEFAULT '{}',  -- Structured data

  -- Search & Embeddings
  embedding vector(768),          -- pgvector embedding
  search_vector tsvector,         -- Full-text search vector

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_ns CHECK (ns ~ '^[a-z0-9.-]+(/[a-z0-9.-]+)*$'),
  CONSTRAINT valid_id CHECK (length(id) > 0 AND length(id) <= 2048)
);

-- Indexes
CREATE INDEX idx_things_type ON things(type);
CREATE INDEX idx_things_ns ON things(ns);
CREATE INDEX idx_things_visibility ON things(visibility);
CREATE INDEX idx_things_updated ON things(updated_at DESC);
CREATE INDEX idx_things_search ON things USING GIN(search_vector);
CREATE INDEX idx_things_embedding ON things USING ivfflat(embedding vector_cosine_ops);
```

### Table 3: Relationships (Current State)

```sql
CREATE TABLE relationships (
  -- Composite Primary Key
  ns TEXT NOT NULL,
  id TEXT NOT NULL,
  PRIMARY KEY (ns, id),

  -- Relationship Metadata
  type TEXT NOT NULL,             -- Relationship type (e.g., 'requires', 'related_to')
  visibility TEXT NOT NULL DEFAULT 'public',

  -- From/To (composite keys)
  from_ns TEXT NOT NULL,
  from_id TEXT NOT NULL,
  to_ns TEXT NOT NULL,
  to_id TEXT NOT NULL,

  -- Content
  code TEXT,
  data JSONB NOT NULL DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Foreign Keys
  FOREIGN KEY (from_ns, from_id) REFERENCES things(ns, id) ON DELETE CASCADE,
  FOREIGN KEY (to_ns, to_id) REFERENCES things(ns, id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_relationships_type ON relationships(type);
CREATE INDEX idx_relationships_from ON relationships(from_ns, from_id);
CREATE INDEX idx_relationships_to ON relationships(to_ns, to_id);
```

---

## Cloudflare Pricing (Complete)

### R2 Storage

**Storage:**
- **$0.015 per GB per month**
- No egress fees (huge savings)

**Operations:**
- **Class A (writes):** $4.50 per million requests
- **Class B (reads):** $0.36 per million requests

**Example (1M events/day, 30-day retention):**
```
Events/day: 1,000,000
Event size: 2 KB average
Storage: 1M × 2 KB × 30 days = 60 GB

Monthly costs:
- Storage: 60 GB × $0.015 = $0.90
- Writes: 30M × $4.50/1M = $135.00
- Reads: 10M × $0.36/1M = $3.60
Total: ~$139.50/month
```

### R2 SQL (Data Catalog)

**Pricing:** Currently in beta, no additional cost beyond R2 storage
- Uses existing R2 storage
- SQL queries billed as Class B operations ($0.36/1M)
- Scanning charged per data scanned (estimated $5/TB scanned)

**Example (100 queries/day):**
```
Queries/day: 100
Data scanned: 10 GB average per query

Monthly costs:
- Queries: 3,000 × $0.36/1M = $0.001
- Scanning: 3,000 × 10 GB = 30 TB × $5/TB = $150.00
Total: ~$150/month
```

**Note:** Scanning costs depend heavily on query optimization and partitioning

### ClickHouse Cloud

**Development Tier:**
- **Free** - Up to 50 GB storage
- Good for testing/prototyping

**Production Tier:**
- **Minimum: $0.31/hour** = ~$223/month (24/7)
- Scales based on compute + storage
- **Storage:** $0.02/GB/month (compressed)
- **Compute:** Billed per hour when running

**Example (1M events/day):**
```
Events/day: 1,000,000
Event size: 2 KB (compressed to ~500 bytes)
Storage: 1M × 500 bytes × 30 days = 15 GB

Monthly costs:
- Compute: $223 minimum (24/7 service)
- Storage: 15 GB × $0.02 = $0.30
Total: ~$223/month minimum
```

**Note:** Can reduce costs by pausing cluster when not needed

### Vectorize

**Storage:**
- **Free** - Vector storage included

**Operations:**
- **Queries:** $0.040 per million vector dimensions queried
- **Writes:** Free

**Example (100K queries/day, 768 dimensions):**
```
Queries/day: 100,000
Dimensions: 768
Vectors per query: 100K (to scan)

Monthly costs:
- Dimensions queried: 100K queries × 100K vectors × 768 dims = 7.68 trillion dims
- Cost: 7.68M million × $0.040 = $307.20
Total: ~$307/month
```

**Note:** Costs scale with query volume and topK parameter

### pgvector (PostgreSQL/Neon)

**Included in database costs:**
- No additional fees
- Uses existing database storage
- Performance depends on instance size

**Neon Pricing:**
- **Free Tier:** 0.5 GB storage (for testing)
- **Launch:** $19/month - 10 GB storage, 300 compute hours
- **Scale:** $69/month - 50 GB storage, 750 compute hours
- **Business:** Custom pricing

**Example (10 GB database with vectors):**
```
Database size: 10 GB
Compute: ~100 hours/month

Monthly costs:
- Plan: Launch $19/month
- Additional storage: $0
Total: $19/month
```

---

## Cost Comparison

### Scenario 1: Low Volume (100K events/day)

| Component | Monthly Cost | Purpose |
|-----------|-------------|---------|
| **R2 SQL** | $15 | Event storage (3M events) |
| **PostgreSQL (Neon)** | $19 | Things + relationships |
| **pgvector** | $0 | Vector search (included) |
| **Total** | **$34/month** | Minimal setup |

### Scenario 2: Medium Volume (1M events/day)

| Component | Monthly Cost | Purpose |
|-----------|-------------|---------|
| **R2 SQL** | $140 | Event storage (30M events) |
| **ClickHouse Cloud** | $223 | Real-time analytics |
| **PostgreSQL (Neon)** | $69 | Things + relationships |
| **pgvector** | $0 | Vector search (included) |
| **Total** | **$432/month** | Production setup |

### Scenario 3: High Volume (10M events/day)

| Component | Monthly Cost | Purpose |
|-----------|-------------|---------|
| **R2 SQL** | $1,400 | Event storage (300M events) |
| **ClickHouse Cloud** | $500+ | Real-time analytics (scaled) |
| **PostgreSQL (Neon)** | $200+ | Things + relationships (scaled) |
| **Vectorize** | $300 | Vector search (high query volume) |
| **Total** | **$2,400+/month** | High-scale setup |

### Cost Optimization Strategies

**1. R2 SQL Query Optimization:**
- Partition data aggressively (hourly vs daily)
- Use materialized views (pre-aggregate)
- Limit query time ranges
- Cache frequent queries

**2. ClickHouse Optimization:**
- Use materialized views for dashboards
- Pause cluster during low traffic
- Use TTL policies (auto-delete old data)
- Compress historical data

**3. Vectorize Optimization:**
- Cache vector search results
- Use pgvector for low-volume queries
- Limit topK parameter
- Pre-filter before vector search

**4. PostgreSQL Optimization:**
- Keep data table lean (offload history to events)
- Use appropriate indexes
- Archive old relationships
- Vacuum regularly

---

## Recommended Architecture

### Phase 1: MVP (Low Cost)

```
All Workers → Pipeline → R2 SQL (events)
                      → PostgreSQL (things + relationships)
                      → pgvector (semantic search)
```

**Cost:** ~$34/month
**Use for:** Testing, prototyping, low volume

### Phase 2: Production (Balanced)

```
All Workers → Pipeline → R2 SQL (events, long-term)
                      → ClickHouse (events, real-time)
                      → PostgreSQL (things + relationships)
                      → pgvector (semantic search)
```

**Cost:** ~$432/month
**Use for:** Production, real-time analytics

### Phase 3: High Scale (Optimized)

```
All Workers → Pipeline → R2 SQL (events, long-term)
                      → ClickHouse (events, real-time, aggregated)
                      → PostgreSQL (things + relationships)
                      → Vectorize (high-volume semantic search)
                      → pgvector (filtered semantic search)
```

**Cost:** $2,400+/month
**Use for:** High volume, complex analytics

---

## Open Questions

### 1. Versioning Strategy
**Q:** Confirm: Events for history, variants for alternatives?
- ✅ Events = temporal versioning (mutations over time)
- ✅ Variants = content alternatives (mobile, languages, formats)
- ❓ Any other versioning needs?

### 2. Composite Key Rules
**Q:** Approve `ns` + `id` rules?
- ✅ ns: domain/subdomain/path (no slashes, no spaces)
- ✅ id: anything (spaces allowed, paths allowed)
- ✅ URL: spaces → underscores (Wikipedia style)
- ❓ Any edge cases missing?

### 3. Budget
**Q:** What's the acceptable monthly cost?
- Phase 1: $34/month (MVP)
- Phase 2: $432/month (Production)
- Phase 3: $2,400/month (High scale)

### 4. Query Performance
**Q:** What's acceptable latency?
- Events queries (R2 SQL): ? ms
- Events aggregations (ClickHouse): ? ms
- Things queries (PostgreSQL): ? ms
- Vector search: ? ms

### 5. Data Retention
**Q:** How long to keep events?
- Hot (real-time): 7 days
- Warm (queryable): 30 days
- Cold (archived): 90 days, 1 year, forever?

### 6. Vector Search Priority
**Q:** Which use cases need vector search?
- Error similarity (group similar errors)
- Log pattern detection
- Semantic entity search ("find occupations related to programming")
- Document similarity

---

## Approval Checklist

Please review:

- [ ] **Events vs Data** - Separation makes sense?
- [ ] **Versioning** - Events for history, variants for alternatives?
- [ ] **Composite Keys** - `ns` + `id` rules work?
- [ ] **URL Generation** - Wikipedia-style space → underscore?
- [ ] **Schema Design** - Events + things + relationships tables?
- [ ] **Pricing Analysis** - Cost projections accurate?
- [ ] **Architecture** - Phase 1 → 2 → 3 progression?
- [ ] **Budget** - What phase should we target?

---

## Next Steps

**After approval:**

1. **Immediate:**
   - Implement events table (R2 SQL schema)
   - Update pipeline worker to write events
   - Keep things table as-is (already good)

2. **Phase 1 MVP** ($34/month):
   - R2 SQL for events
   - PostgreSQL for things
   - pgvector for search
   - **Start here** ✅

3. **Phase 2 Production** ($432/month):
   - Add ClickHouse for real-time analytics
   - Keep R2 SQL for long-term storage
   - Run benchmarks to validate

4. **Phase 3 High Scale** ($2,400/month):
   - Add Vectorize for high-volume search
   - Scale ClickHouse
   - Implement all optimizations

**Timeline:**
- Schema approval: Today
- Phase 1 implementation: 2-3 days
- Benchmarking: 3-5 days
- Phase 2 (if needed): 3-5 days
- Test coverage 80%+: Ongoing

---

**Status:** 🔶 Awaiting Approval
**Author:** Claude Code (AI)
**Last Updated:** 2025-10-04
