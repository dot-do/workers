# Benchmark Worker - R2 SQL Performance Testing

## Overview

The **benchmark** worker tests R2 SQL performance with web content storage to determine if we need ClickHouse for the analytics layer.

## Purpose

We're evaluating whether **R2 SQL** (Parquet + Apache DataFusion) is performant enough for web content search at scale, or if we need to add **ClickHouse** (~$223/month additional cost).

**Decision Criteria:**
- If R2 SQL meets performance thresholds → Use R2 SQL only ($34/month)
- If R2 SQL is too slow → Add ClickHouse ($432/month)

## Benchmarks

### 1. Direct Lookup (Threshold: < 500ms) ⭐ MOST CRITICAL

**Query a single document by namespace and ID** - the most common operation.

**ClickHouse baseline:** < 100ms
**R2 SQL acceptable:** < 500ms
**Region:** us-east-1

```sql
SELECT
  ulid, timestamp, mutation_type,
  content_json, content_code, content_markdown, content_html, content_ast,
  content_length, content_hash, content_language
FROM events
WHERE event_type = 'content'
  AND entity_ns = 'en.wikipedia.org'
  AND entity_id = 'TypeScript'
ORDER BY timestamp DESC
LIMIT 1
```

**If R2 SQL is 500-2000ms:** Consider Cloudflare Cache API + SWR pattern (first hit slow, subsequent < 50ms)
**If R2 SQL > 2000ms:** Need ClickHouse

### 2. Recent Content (Threshold: < 500ms)

Fetch the 100 most recent content items.

```sql
SELECT
  ulid, timestamp, entity_ns, entity_id,
  content_markdown, content_length, content_language
FROM events
WHERE event_type = 'content'
ORDER BY timestamp DESC
LIMIT 100
```

### 3. Full-Text Search (Threshold: < 5 seconds)

Search markdown content for keywords.

```sql
SELECT
  ulid, timestamp, entity_ns, entity_id,
  content_markdown, content_length
FROM events
WHERE event_type = 'content'
  AND (
    content_markdown LIKE '%TypeScript%'
    OR content_markdown LIKE '%guide%'
    OR content_markdown LIKE '%tutorial%'
  )
ORDER BY timestamp DESC
LIMIT 100
```

### 4. Aggregations (Threshold: < 10 seconds)

Count content by namespace and language.

```sql
SELECT
  entity_ns,
  content_language,
  COUNT(*) as count,
  AVG(content_length) as avg_length
FROM events
WHERE event_type = 'content'
GROUP BY entity_ns, content_language
ORDER BY count DESC
```

### 5. Deduplication (Threshold: < 15 seconds)

Find duplicate content by hash.

```sql
SELECT
  content_hash,
  COUNT(*) as duplicate_count,
  MIN(timestamp) as first_seen,
  MAX(timestamp) as last_seen,
  ARRAY_AGG(ulid) as event_ids
FROM events
WHERE event_type = 'content'
GROUP BY content_hash
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC
```

### 6. Historical Queries (Threshold: < 2 seconds)

Get all versions of a document by entity_ns + entity_id.

```sql
SELECT
  ulid, timestamp, mutation_type,
  content_markdown, content_length, content_hash
FROM events
WHERE event_type = 'content'
  AND entity_ns = 'en.wikipedia.org'
  AND entity_id = 'TypeScript'
ORDER BY timestamp ASC
```

## Usage

### Step 1: Generate Test Data

Generate 10,000 synthetic web pages with realistic content:

```bash
curl -X POST https://benchmark.do/generate \
  -H "Content-Type: application/json" \
  -d '{
    "count": 10000,
    "avgSizeKB": 225
  }'
```

**Response:**
```json
{
  "success": true,
  "generated": 10000,
  "duration": 45000,
  "throughput": 222,
  "avgSizeKB": 225
}
```

**Test Data Characteristics:**
- **Total Size:** 10,000 pages × 225 KB = 2.25 GB
- **Per Page:**
  - 50 KB Markdown (with YAML frontmatter)
  - 75 KB HTML (rendered)
  - 100 KB AST (Abstract Syntax Tree)
- **Content:** Realistic Lorem Ipsum with code examples
- **Namespaces:** wikipedia.org, github.com, stackoverflow.com, medium.com, dev.to
- **Languages:** English (en)

### Step 2: Run Benchmarks

Run all benchmarks:

```bash
curl https://benchmark.do/benchmark?type=all
```

Run specific benchmark:

```bash
curl https://benchmark.do/benchmark?type=search
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "name": "Recent Content",
      "description": "Fetch 100 most recent content items",
      "durationMs": 856,
      "threshold": 1000,
      "passed": true
    },
    {
      "name": "Full-Text Search",
      "description": "Keyword search across markdown content",
      "durationMs": 4234,
      "threshold": 5000,
      "passed": true
    },
    {
      "name": "Aggregations",
      "description": "Count content by namespace and language",
      "durationMs": 8901,
      "threshold": 10000,
      "passed": true
    },
    {
      "name": "Deduplication",
      "description": "Find duplicate content by hash",
      "durationMs": 12345,
      "threshold": 15000,
      "passed": true
    },
    {
      "name": "Historical Queries",
      "description": "Get all versions of a document",
      "durationMs": 1234,
      "threshold": 2000,
      "passed": true
    }
  ],
  "passed": true
}
```

### Step 3: Check Status

View thresholds and recommendations:

```bash
curl https://benchmark.do/status
```

**Response:**
```json
{
  "thresholds": {
    "recentContent": {
      "maxMs": 1000,
      "description": "Fetch 100 recent items"
    },
    "fullTextSearch": {
      "maxMs": 5000,
      "description": "Keyword search across markdown"
    },
    "aggregations": {
      "maxMs": 10000,
      "description": "Count content by namespace and language"
    },
    "deduplication": {
      "maxMs": 15000,
      "description": "Find duplicate content by hash"
    },
    "historicalQueries": {
      "maxMs": 2000,
      "description": "Get all versions of a document"
    }
  },
  "recommendation": {
    "r2SqlOnly": "All benchmarks under thresholds - use R2 SQL ($34/month)",
    "withClickHouse": "Some benchmarks over thresholds - add ClickHouse ($432/month)"
  }
}
```

## Architecture

### Content Event Schema

Each content event includes 5 formats:

```typescript
interface ContentEvent {
  // ... identity, classification, entity reference

  // Web Content (5 formats) ⭐
  contentJson: string | null      // Structured metadata
  contentCode: string | null      // Extracted ESM/JavaScript
  contentMarkdown: string | null  // Markdown/MDX with frontmatter
  contentHtml: string | null      // Rendered HTML
  contentAst: string | null       // Abstract Syntax Tree

  // Content Metadata
  contentLength: number           // Size in bytes
  contentHash: string             // SHA256 for deduplication
  contentLanguage: string | null  // ISO language code (en, es, etc)
  contentFormat: string | null    // Format type (mdx, html, etc)

  // ... other fields
}
```

### Data Flow

```
1. Benchmark Worker generates synthetic content
   ↓
2. Sends to Pipeline via PIPELINE.send()
   ↓
3. Pipeline writes to R2 Data Catalog (Parquet)
   ↓
4. R2 SQL queries Parquet files
   ↓
5. Benchmark measures query performance
   ↓
6. Compare against thresholds
```

## Development

### Install Dependencies

```bash
pnpm install
```

### Local Development

```bash
pnpm dev
```

### Deploy

```bash
pnpm deploy
```

### Type Check

```bash
pnpm typecheck
```

## Cost Analysis

### R2 SQL Only ($34/month)

- **R2 Storage:** 60 GB × $0.015 = $0.90/month
- **R2 Writes:** 30M × $4.50/1M = $135/month
- **R2 Reads:** 10M × $0.36/1M = $3.60/month
- **R2 SQL Queries:** Free (included in R2 pricing)
- **PostgreSQL (Neon):** $19/month (Launch plan)
- **Total:** ~$34/month

### With ClickHouse ($432/month)

- **R2 SQL:** $140/month (same as above)
- **ClickHouse:** $223/month (minimum 24/7)
- **PostgreSQL:** $69/month (Scale plan for additional load)
- **Total:** ~$432/month

## Architecture Options

### Option 1: R2 SQL Only ($34/month)

**Condition:** All benchmarks pass, including Direct Lookup < 500ms

**Latency:**
- Direct Lookup: < 500ms (cold)
- Recent Content: < 500ms
- Full-Text Search: < 5s

**Cost:** $34/month

**Best for:** Low traffic, cold data, batch processing

### Option 2: R2 SQL + Cache Layer ($34/month + cache storage) ⭐ RECOMMENDED

**Condition:** Direct Lookup 500-2000ms, other benchmarks pass

**Strategy:** Cloudflare Cache API with Stale-While-Revalidate (SWR)

**Latency:**
- Direct Lookup: 500-2000ms (cold, first hit)
- Direct Lookup: < 50ms (hot, from edge cache)
- Cache hit ratio: ~80-90% for popular content

**Implementation:**
```typescript
// Cache-first with SWR pattern
const cache = caches.default
const cacheKey = new Request(`https://cache/${ns}/${id}`)

// Try cache first
let response = await cache.match(cacheKey)

if (response) {
  // Cache hit - return immediately
  // Optionally: revalidate in background if stale
  return response
}

// Cache miss - fetch from R2 SQL
response = await fetchFromR2SQL(ns, id)

// Cache for 1 hour, stale-while-revalidate for 24 hours
response.headers.set('Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
await cache.put(cacheKey, response.clone())

return response
```

**Cost:** $34/month + ~$0.50/month cache storage

**Best for:** Medium-high traffic, popular content gets cached, acceptable first-hit latency

### Option 3: ClickHouse + R2 SQL ($432/month)

**Condition:** Direct Lookup > 2000ms OR Full-Text Search > 5000ms

**Strategy:** Hot data in ClickHouse, cold data in R2 SQL

**Latency:**
- Direct Lookup: < 100ms (ClickHouse hot data)
- Full-Text Search: < 1000ms (ClickHouse)
- Cold Data: < 5000ms (R2 SQL archive)

**Data Flow:**
```
Pipeline → ClickHouse (last 30 days, hot queries)
         ↘ R2 SQL (all data, cold archive)

Queries:
- Recent/Popular → ClickHouse (< 100ms)
- Historical/Rare → R2 SQL (< 5000ms)
```

**Cost:** $432/month

**Best for:** High traffic, real-time analytics, sub-100ms latency required

## Decision Framework

```
┌─────────────────────────────────────┐
│ Direct Lookup Benchmark Results     │
└─────────────────────────────────────┘
              ↓
         < 500ms?
              ↓
        Yes ──┴── No
         ↓          ↓
    Option 1    500-2000ms?
    R2 SQL           ↓
    $34/mo     Yes ──┴── No
                ↓          ↓
           Option 2   Option 3
           + Cache    ClickHouse
           $34/mo     $432/mo
```

## Next Steps

1. ✅ Create benchmark worker
2. ⏳ Configure R2 Data Catalog with events schema
3. ⏳ Deploy benchmark worker
4. ⏳ Generate test data (10,000 pages)
5. ⏳ Run benchmarks
6. ⏳ Analyze results
7. ⏳ Make architecture decision
8. ⏳ Update db service with chosen architecture

## Related Documentation

- [Schema Proposal](../notes/2025-10-04-schema-with-web-content.md)
- [Unified Schema v2](../notes/2025-10-04-unified-schema-proposal-v2.md)
- [Analytics Schema](../notes/2025-10-04-unified-analytics-schema-proposal.md)
- [Pipeline Worker](../pipeline/README.md)
- [DB Service](../db/README.md)

---

**Status:** Phase 1 MVP Implementation Complete
**Next:** Configure R2 Data Catalog and run benchmarks
