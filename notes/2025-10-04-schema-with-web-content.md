# Schema with Web Content Support

**Date:** 2025-10-04
**Status:** 🚀 Ready for Implementation
**Focus:** R2 SQL performance benchmarking for web content search

## Executive Summary

Updated schema to support **web content storage and search** across multiple formats:
- JSON (structured data)
- Code (extracted ESM/JavaScript)
- Markdown/MDX (with YAML frontmatter)
- HTML (rendered)
- AST (Abstract Syntax Tree)

**Key Decision Point:** Can R2 SQL handle content search at scale, or do we need ClickHouse?

---

## Updated Schema

### Events Table (with Web Content)

```sql
CREATE TABLE events (
  -- Identity (Primary Key)
  ulid String,
  timestamp DateTime64(3),
  event_timestamp DateTime64(3),

  -- Event Classification
  event_type String,              -- 'log', 'content', 'mutation', 'metric', 'error'
  mutation_type Nullable(String), -- 'create', 'update', 'delete' (for mutations)

  -- Entity Reference (composite key)
  entity_ns Nullable(String),     -- Namespace
  entity_id Nullable(String),     -- ID
  entity_type Nullable(String),   -- Type (e.g., 'Article', 'Page', 'Document')

  -- Source Information (for logs)
  script_name String,
  dispatch_namespace String,
  worker_name String,

  -- Request Context (for logs)
  url Nullable(String),
  method Nullable(String),
  cf_ray Nullable(String),
  user_agent Nullable(String),
  ip Nullable(String),
  status Nullable(UInt16),
  outcome String,
  rpc_method Nullable(String),

  -- Error Information (for logs)
  severity String,
  category String,
  error_type Nullable(String),
  error_message Nullable(String),
  has_exception Boolean,

  -- Performance Metrics (for logs)
  cpu_time UInt32,
  wall_time UInt32,
  log_count UInt16,
  logs Nullable(String),
  exception_count UInt16,
  exceptions Nullable(String),

  -- Web Content (for content events) ⭐ NEW
  content_json Nullable(String),      -- Structured data (JSON)
  content_code Nullable(String),      -- Extracted ESM/JavaScript
  content_markdown Nullable(String),  -- Markdown/MDX with frontmatter
  content_html Nullable(String),      -- Rendered HTML
  content_ast Nullable(String),       -- Abstract Syntax Tree (JSON)

  -- Content Metadata
  content_length UInt32,              -- Total content size (bytes)
  content_hash String,                -- Hash for deduplication (SHA256)
  content_language Nullable(String),  -- Language (en, es, etc.)
  content_format Nullable(String),    -- Format (mdx, html, json, etc.)

  -- Event Data (for mutations)
  data String,                    -- Generic event data (JSON)
  metadata Nullable(String),      -- Additional metadata (JSON)

  -- Pipeline Metadata
  pipeline_instance String,
  pipeline_batch_id String,
  retry_count UInt8

-- ClickHouse (if needed)
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (timestamp, event_type, entity_ns, entity_id)
SETTINGS index_granularity = 8192;

-- R2 SQL (Parquet) will automatically partition by timestamp
```

### Content Search Indexes (ClickHouse)

```sql
-- Full-text search on markdown content
ALTER TABLE events ADD INDEX idx_content_markdown_fts content_markdown TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 1;

-- Full-text search on HTML content
ALTER TABLE events ADD INDEX idx_content_html_fts content_html TYPE tokenbf_v1(32768, 3, 0) GRANULARITY 1;

-- Hash index for deduplication
ALTER TABLE events ADD INDEX idx_content_hash content_hash TYPE bloom_filter() GRANULARITY 1;

-- Language filter
ALTER TABLE events ADD INDEX idx_content_language content_language TYPE set(100) GRANULARITY 1;
```

**Note:** R2 SQL doesn't support custom indexes - relies on Parquet columnar format and partitioning

---

## Event Type Separation

### 1. Log Events

**event_type:** `'log'`

**Purpose:** Worker logs, errors, metrics

**Fields Used:**
- script_name, worker_name, dispatch_namespace
- url, method, cf_ray, status, outcome
- severity, category, error_type, error_message
- cpu_time, wall_time, logs, exceptions

**Example:**
```json
{
  "ulid": "01HQ...",
  "timestamp": "2025-10-04T10:00:00.000Z",
  "event_type": "log",
  "script_name": "gateway",
  "severity": "error",
  "error_type": "server_error",
  "error_message": "HTTP 500",
  "cpu_time": 125,
  "wall_time": 234
}
```

### 2. Content Events

**event_type:** `'content'`

**Purpose:** Web content ingestion, scraping, processing

**Fields Used:**
- entity_ns, entity_id, entity_type
- content_json, content_code, content_markdown, content_html, content_ast
- content_length, content_hash, content_language, content_format

**Example:**
```json
{
  "ulid": "01HQ...",
  "timestamp": "2025-10-04T10:00:00.000Z",
  "event_type": "content",
  "entity_ns": "en.wikipedia.org",
  "entity_id": "Software_developer",
  "entity_type": "Article",
  "content_markdown": "---\ntitle: Software Developer\n---\n# Software Developer\n\nA software developer is...",
  "content_html": "<h1>Software Developer</h1><p>A software developer is...</p>",
  "content_ast": "{\"type\":\"root\",\"children\":[...]}",
  "content_length": 45678,
  "content_hash": "sha256:abc123...",
  "content_language": "en",
  "content_format": "mdx"
}
```

### 3. Mutation Events

**event_type:** `'mutation'`

**Purpose:** Data changes, audit trail

**Fields Used:**
- mutation_type (create, update, delete)
- entity_ns, entity_id, entity_type
- data (before/after state)

**Example:**
```json
{
  "ulid": "01HQ...",
  "timestamp": "2025-10-04T10:00:00.000Z",
  "event_type": "mutation",
  "mutation_type": "update",
  "entity_ns": "onet",
  "entity_id": "15-1252.00",
  "entity_type": "Occupation",
  "data": "{\"before\":{...},\"after\":{...}}"
}
```

---

## Things Table (Current State)

**No changes needed** - already supports content via `content` and `data` fields

```sql
CREATE TABLE things (
  ns TEXT NOT NULL,
  id TEXT NOT NULL,
  PRIMARY KEY (ns, id),

  type TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'public',

  -- Content (current state only)
  content TEXT,                   -- Markdown/MDX (latest version)
  code TEXT,                      -- Code (latest version)
  data JSONB NOT NULL DEFAULT '{}',  -- Structured data (latest version)

  -- Search
  embedding vector(768),
  search_vector tsvector,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

**Rationale:**
- Things table = current state only
- Events table = full history with all content formats
- To get historical content: query events table

---

## Benchmark Plan

### Goal

Determine if **R2 SQL** can handle:
1. Large content storage (MB-sized documents)
2. Full-text search across content
3. Fast queries at scale (millions of documents)

If R2 SQL is too slow → Use **ClickHouse** instead

### Benchmark 1: Content Storage

**Test:** Store 10,000 web pages with all content formats

**Content Sizes:**
- Markdown: 50 KB average
- HTML: 75 KB average
- AST: 100 KB average
- Total: ~225 KB per page

**Metrics:**
- Write throughput (pages/sec)
- Storage efficiency (compression ratio)
- Query time for recent content

**R2 SQL:**
```sql
-- Query: Get recent content
SELECT
  entity_ns,
  entity_id,
  content_markdown,
  content_html,
  content_length
FROM events
WHERE event_type = 'content'
  AND timestamp >= NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC
LIMIT 100
```

**ClickHouse:**
```sql
-- Same query with ClickHouse optimizations
SELECT
  entity_ns,
  entity_id,
  content_markdown,
  content_html,
  content_length
FROM events
WHERE event_type = 'content'
  AND timestamp >= NOW() - INTERVAL 7 DAY
ORDER BY timestamp DESC
LIMIT 100
```

**Expected Results:**
- R2 SQL: ? ms (need to test)
- ClickHouse: < 100ms (optimized columnar storage)

### Benchmark 2: Full-Text Search

**Test:** Search for keywords across markdown content

**Query 1: Simple keyword search**
```sql
-- R2 SQL
SELECT
  entity_ns,
  entity_id,
  content_markdown,
  content_length
FROM events
WHERE event_type = 'content'
  AND content_markdown LIKE '%software developer%'
LIMIT 100

-- ClickHouse with full-text index
SELECT
  entity_ns,
  entity_id,
  content_markdown,
  content_length
FROM events
WHERE event_type = 'content'
  AND hasToken(content_markdown, 'software')
  AND hasToken(content_markdown, 'developer')
LIMIT 100
```

**Query 2: Complex search with filters**
```sql
-- R2 SQL
SELECT
  entity_ns,
  entity_id,
  content_markdown,
  content_length
FROM events
WHERE event_type = 'content'
  AND entity_ns = 'en.wikipedia.org'
  AND content_language = 'en'
  AND content_markdown LIKE '%programming%'
  AND timestamp >= NOW() - INTERVAL '30 days'
ORDER BY timestamp DESC
LIMIT 100
```

**Expected Results:**
- R2 SQL: ? ms (Parquet scan, no indexes)
- ClickHouse: < 500ms (with tokenbf_v1 index)

### Benchmark 3: Aggregations

**Test:** Count content by namespace and language

```sql
-- R2 SQL
SELECT
  entity_ns,
  content_language,
  COUNT(*) as count,
  SUM(content_length) as total_bytes
FROM events
WHERE event_type = 'content'
  AND timestamp >= NOW() - INTERVAL '30 days'
GROUP BY entity_ns, content_language
ORDER BY count DESC

-- ClickHouse (same query)
```

**Expected Results:**
- R2 SQL: ? seconds (scan entire dataset)
- ClickHouse: < 1 second (columnar aggregation)

### Benchmark 4: Content Deduplication

**Test:** Find duplicate content by hash

```sql
-- R2 SQL
SELECT
  content_hash,
  COUNT(*) as duplicate_count,
  ARRAY_AGG(entity_ns || '/' || entity_id) as entities
FROM events
WHERE event_type = 'content'
GROUP BY content_hash
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
LIMIT 100

-- ClickHouse with bloom filter
```

**Expected Results:**
- R2 SQL: ? seconds
- ClickHouse: < 2 seconds

### Benchmark 5: Historical Content Queries

**Test:** Get all versions of a document over time

```sql
-- R2 SQL
SELECT
  timestamp,
  content_markdown,
  content_length,
  content_hash
FROM events
WHERE event_type = 'content'
  AND entity_ns = 'en.wikipedia.org'
  AND entity_id = 'Software_developer'
ORDER BY timestamp ASC

-- ClickHouse (same query)
```

**Expected Results:**
- R2 SQL: ? ms (filter by partition + entity)
- ClickHouse: < 50ms (indexed by entity)

---

## Performance Thresholds

### Acceptable Performance (R2 SQL)

If R2 SQL achieves these, we don't need ClickHouse:

| Query Type | Acceptable | Ideal |
|------------|-----------|-------|
| Recent content (100 items) | < 1 second | < 500ms |
| Full-text search | < 5 seconds | < 2 seconds |
| Aggregations | < 10 seconds | < 5 seconds |
| Deduplication | < 15 seconds | < 10 seconds |
| Historical content | < 2 seconds | < 1 second |

### When to Use ClickHouse

Use ClickHouse if:
- ✅ R2 SQL queries > 5 seconds consistently
- ✅ Need real-time dashboards (< 1 second updates)
- ✅ Complex aggregations are critical
- ✅ Budget allows ($223+/month)

### When to Stay with R2 SQL Only

Stay with R2 SQL if:
- ✅ Queries are "fast enough" (< 5 seconds acceptable)
- ✅ Batch processing OK (not real-time critical)
- ✅ Cost optimization is priority ($34/month vs $432/month)
- ✅ Content search is occasional, not constant

---

## Implementation Plan

### Phase 1: R2 SQL Setup (1-2 days)

**1. Configure R2 Data Catalog**
```bash
# Create R2 bucket
wrangler r2 bucket create events-catalog

# Configure Parquet schema
# (Cloudflare automatically infers from Pipeline data)
```

**2. Update Pipeline Worker**
```typescript
// Add content event support
function createContentEvent(
  ns: string,
  id: string,
  content: {
    markdown?: string
    html?: string
    ast?: string
    code?: string
    json?: string
  }
): EnrichedEvent {
  return {
    ulid: generateULID(),
    timestamp: Date.now(),
    event_type: 'content',
    entity_ns: ns,
    entity_id: id,
    content_markdown: content.markdown,
    content_html: content.html,
    content_ast: content.ast,
    content_code: content.code,
    content_json: content.json,
    content_length: calculateLength(content),
    content_hash: hashContent(content),
    content_format: detectFormat(content),
    // ... other fields
  }
}
```

**3. Create Test Data Generator**
```typescript
// Generate 10,000 synthetic web pages
async function generateTestContent() {
  const pages = []
  for (let i = 0; i < 10000; i++) {
    pages.push({
      ns: 'test.example.com',
      id: `page-${i}`,
      markdown: generateMarkdown(50 * 1024), // 50 KB
      html: generateHTML(75 * 1024),         // 75 KB
      ast: generateAST(100 * 1024),          // 100 KB
    })
  }
  return pages
}
```

### Phase 2: Benchmarking (3-5 days)

**Day 1: Storage Benchmarks**
- Write 10K pages to R2 SQL
- Measure write throughput
- Check storage size and compression

**Day 2: Query Benchmarks**
- Run Benchmark 1-5 queries
- Measure latency (p50, p95, p99)
- Test with different dataset sizes

**Day 3: ClickHouse Setup (if needed)**
- Setup ClickHouse Cloud
- Import same test data
- Run same benchmarks

**Day 4-5: Analysis & Decision**
- Compare R2 SQL vs ClickHouse
- Cost analysis
- Make architecture decision

### Phase 3: Implementation (2-3 days)

**If R2 SQL is sufficient:**
- ✅ Use R2 SQL only
- ✅ Implement content search queries
- ✅ Add caching layer if needed
- ✅ Total cost: $34/month

**If ClickHouse is needed:**
- ✅ Deploy ClickHouse Cloud
- ✅ Dual-write to R2 SQL + ClickHouse
- ✅ R2 SQL = long-term storage
- ✅ ClickHouse = fast queries
- ✅ Total cost: $432/month

---

## Benchmark Results Template

### R2 SQL Performance

| Benchmark | Latency (p50) | Latency (p95) | Latency (p99) | Pass/Fail |
|-----------|---------------|---------------|---------------|-----------|
| Storage (10K pages) | ? ms | ? ms | ? ms | ? |
| Recent content (100) | ? ms | ? ms | ? ms | ? |
| Full-text search | ? ms | ? ms | ? ms | ? |
| Aggregations | ? ms | ? ms | ? ms | ? |
| Deduplication | ? ms | ? ms | ? ms | ? |
| Historical content | ? ms | ? ms | ? ms | ? |

### ClickHouse Performance

| Benchmark | Latency (p50) | Latency (p95) | Latency (p99) | Improvement |
|-----------|---------------|---------------|---------------|-------------|
| Storage (10K pages) | ? ms | ? ms | ? ms | ?x faster |
| Recent content (100) | ? ms | ? ms | ? ms | ?x faster |
| Full-text search | ? ms | ? ms | ? ms | ?x faster |
| Aggregations | ? ms | ? ms | ? ms | ?x faster |
| Deduplication | ? ms | ? ms | ? ms | ?x faster |
| Historical content | ? ms | ? ms | ? ms | ?x faster |

### Cost Comparison

| Scenario | R2 SQL | ClickHouse | Winner |
|----------|--------|------------|--------|
| 10K pages/day | $? | $? | ? |
| 100K pages/day | $? | $? | ? |
| 1M pages/day | $? | $? | ? |

### Recommendation

Based on benchmarks:
- [ ] **Use R2 SQL only** - Performance acceptable, cost optimized
- [ ] **Use ClickHouse** - Need real-time performance, budget available
- [ ] **Use both** - R2 SQL for storage, ClickHouse for queries

---

## Open Questions

### 1. Content Size
**Q:** What's the typical/maximum content size?
- Average page: ?KB
- Large pages: ?MB
- Maximum: ?MB

### 2. Query Frequency
**Q:** How often will content be searched?
- Searches per day: ?
- Real-time requirement: Yes/No?
- Batch processing acceptable: Yes/No?

### 3. Dataset Size
**Q:** How many web pages to store?
- Initial: ?K pages
- Growth rate: ?K pages/day
- Total expected: ?M pages

### 4. Search Requirements
**Q:** What search capabilities are needed?
- Simple keyword search: Yes
- Fuzzy search: ?
- Semantic search (vector): ?
- Complex filters: ?

### 5. Budget
**Q:** What's the acceptable monthly cost?
- Minimum: $34/month (R2 SQL only)
- Maximum: $? /month

---

## Next Steps

**Immediate:**
1. ✅ Confirm schema design
2. ✅ Confirm benchmark plan
3. ✅ Confirm performance thresholds
4. 🚀 **Proceed with implementation**

**Timeline:**
- Schema implementation: 1-2 days
- Test data generation: 1 day
- R2 SQL benchmarking: 2-3 days
- ClickHouse comparison (if needed): 2-3 days
- Final decision: 1 day
- **Total: 7-10 days**

**Deliverables:**
1. Updated events table schema
2. 10K+ test web pages
3. Benchmark results (R2 SQL)
4. Benchmark results (ClickHouse, if needed)
5. Cost analysis
6. Architecture decision

---

**Status:** 🚀 Ready to Implement
**Waiting for:** Final approval to proceed
**Author:** Claude Code (AI)
**Last Updated:** 2025-10-04
