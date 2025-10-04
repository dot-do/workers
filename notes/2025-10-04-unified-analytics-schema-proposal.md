# Unified Analytics Schema Proposal

**Date:** 2025-10-04
**Status:** 🔶 Awaiting Approval
**Purpose:** Design unified schema for R2 SQL, ClickHouse, and Vectorize integration

## Executive Summary

This proposal outlines a unified analytics schema that can be used across:
1. **R2 SQL** - Cost-effective log storage with SQL querying
2. **ClickHouse** - High-performance analytics database
3. **Vectorize** - Vector embeddings for semantic search

The goal is to benchmark all three and choose the optimal architecture based on real performance data.

---

## Current State Analysis

### ✅ What's Working

**Pipeline Worker:**
- Captures tail events from all workers
- Enriches with metadata and error classification
- Sends to Cloudflare Pipeline → R2

**Analytics Worker:**
- Has error analytics queries ready
- Can query R2 SQL (when schema is configured)

### ❌ What's Missing

**ClickHouse Integration:**
- db service has ClickHouse client code
- **Not actually hitting ClickHouse** (connection not configured)
- No data flowing to ClickHouse yet

**Vectorize Integration:**
- Not integrated into db service
- No benchmarks comparing Vectorize vs pgvector

**R2 SQL Schema:**
- Pipeline worker creates enriched events
- **R2 Data Catalog schema not configured yet**
- Need to define table structure

---

## Proposed Unified Schema

### 1. Core Logs Table

This table structure works for **both R2 SQL and ClickHouse** with minimal differences.

#### Table: `logs`

```sql
-- Optimized for both R2 SQL (Parquet) and ClickHouse

CREATE TABLE logs (
  -- Identity (Primary Key)
  ulid String,                    -- ULID for unique event identification
  timestamp DateTime64(3),        -- Event capture time (milliseconds)
  event_timestamp DateTime64(3),  -- Original event timestamp

  -- Source Information
  script_name String,              -- Worker name (e.g., 'gateway', 'db')
  dispatch_namespace String,       -- Dispatch namespace (e.g., 'production')
  worker_name String,              -- Full worker name
  event_type String,               -- Detailed event type (e.g., 'gateway.fetch.ok')

  -- Request Information
  url Nullable(String),            -- Request URL
  method Nullable(String),         -- HTTP method (GET, POST, etc.)
  cf_ray Nullable(String),         -- Cloudflare Ray ID
  user_agent Nullable(String),     -- User agent string
  ip Nullable(String),             -- Client IP address

  -- Response Information
  status Nullable(UInt16),         -- HTTP status code
  outcome String,                  -- Event outcome (ok, exception, exceededCpu)

  -- RPC Information
  rpc_method Nullable(String),     -- RPC method name

  -- Queue Information
  queue_name Nullable(String),     -- Queue name for queue consumers

  -- Email Information
  email_to Nullable(String),       -- Email recipient

  -- Scheduled Task Information
  scheduled_time Nullable(DateTime64(3)),  -- Scheduled execution time
  cron Nullable(String),           -- Cron expression

  -- Error Information
  severity String,                 -- critical, error, warning, info
  category String,                 -- exception, runtime, http, application, success
  error_type Nullable(String),     -- Specific error type
  error_message Nullable(String),  -- Error message (truncated to 1000 chars)
  has_exception Boolean,           -- True if exceptions present

  -- Performance Metrics
  cpu_time UInt32,                 -- CPU time in milliseconds
  wall_time UInt32,                -- Wall clock time in milliseconds

  -- Logs and Exceptions (JSON)
  log_count UInt16,                -- Number of log entries
  logs Nullable(String),           -- JSON array of logs
  exception_count UInt16,          -- Number of exceptions
  exceptions Nullable(String),     -- JSON array of exceptions

  -- Pipeline Metadata
  pipeline_instance String,        -- Pipeline worker instance ID
  pipeline_batch_id String,        -- Batch ID (ULID)
  retry_count UInt8                -- Number of retries
)
-- ClickHouse specific optimizations
ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (timestamp, script_name, severity, event_type)
SETTINGS index_granularity = 8192;

-- R2 SQL will automatically partition by timestamp when stored in Parquet
```

#### Indexes (ClickHouse)

```sql
-- Materialized views for fast aggregations
CREATE MATERIALIZED VIEW logs_by_service_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (script_name, toStartOfHour(timestamp), severity)
AS SELECT
  script_name,
  toStartOfHour(timestamp) as hour,
  severity,
  count() as event_count,
  sum(cpu_time) as total_cpu_time,
  sum(wall_time) as total_wall_time,
  countIf(has_exception) as exception_count
FROM logs
GROUP BY script_name, hour, severity;

-- Errors by type
CREATE MATERIALIZED VIEW errors_by_type_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMMDD(timestamp)
ORDER BY (error_type, toStartOfHour(timestamp))
AS SELECT
  error_type,
  toStartOfHour(timestamp) as hour,
  severity,
  count() as error_count
FROM logs
WHERE error_type IS NOT NULL
GROUP BY error_type, hour, severity;
```

### 2. Vector Embeddings Table

For semantic search capabilities with Vectorize.

#### Table: `embeddings`

```sql
-- For Vectorize (Cloudflare native)
-- Vectorize doesn't use SQL - it's a vector database API
-- We store metadata in SQL and vector IDs

CREATE TABLE embedding_metadata (
  -- Identity
  vector_id String,                -- Vectorize vector ID
  entity_type String,              -- 'log', 'thing', 'relationship'
  entity_ns String,                -- Namespace
  entity_id String,                -- Entity ID

  -- Content
  content String,                  -- Original text content
  content_hash String,             -- Hash for deduplication

  -- Vector Properties
  dimension UInt16,                -- Vector dimension (e.g., 768, 1536)
  model String,                    -- Model used (e.g., 'text-embedding-3-small')

  -- Metadata
  created_at DateTime64(3),
  updated_at DateTime64(3)
)
ENGINE = MergeTree()
ORDER BY (entity_type, entity_ns, entity_id, updated_at)
SETTINGS index_granularity = 8192;

-- For pgvector (PostgreSQL) - existing
-- Already defined in things table as embedding vector(768)
```

**Vectorize Usage:**

```typescript
// Insert vector
await env.VECTORIZE.insert([
  {
    id: vectorId,
    values: embedding, // Float32Array
    metadata: {
      entity_type: 'log',
      entity_ns: 'workers',
      entity_id: ulid,
      content: errorMessage,
    }
  }
])

// Query similar vectors
const results = await env.VECTORIZE.query(queryEmbedding, {
  topK: 20,
  filter: { entity_type: 'log' }
})
```

### 3. Analytics Aggregation Tables

Pre-aggregated tables for fast dashboard queries.

#### Table: `service_metrics_hourly`

```sql
CREATE TABLE service_metrics_hourly (
  hour DateTime,
  script_name String,

  -- Request metrics
  total_requests UInt64,
  successful_requests UInt64,
  failed_requests UInt64,

  -- Error metrics by severity
  critical_errors UInt32,
  errors UInt32,
  warnings UInt32,

  -- Performance metrics
  avg_cpu_time Float32,
  p50_cpu_time UInt32,
  p95_cpu_time UInt32,
  p99_cpu_time UInt32,
  avg_wall_time Float32,
  p50_wall_time UInt32,
  p95_wall_time UInt32,
  p99_wall_time UInt32,

  -- HTTP status codes
  status_2xx UInt32,
  status_4xx UInt32,
  status_5xx UInt32
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (script_name, hour)
SETTINGS index_granularity = 8192;
```

#### Table: `error_trends_5min`

```sql
CREATE TABLE error_trends_5min (
  bucket DateTime,
  script_name String,
  error_type String,

  error_count UInt32,
  unique_messages UInt32,
  avg_frequency Float32  -- errors per minute
)
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMMDD(bucket)
ORDER BY (bucket, script_name, error_count DESC)
SETTINGS index_granularity = 8192;
```

---

## Schema Comparison: R2 SQL vs ClickHouse

| Feature | R2 SQL | ClickHouse | Winner |
|---------|---------|------------|--------|
| **Storage Cost** | $0.015/GB/month | $0.02/GB/month (self-hosted) | R2 SQL ✅ |
| **Query Performance** | Good (Parquet scan) | Excellent (columnar) | ClickHouse ✅ |
| **Ingestion Rate** | High (streaming) | Very High | ClickHouse ✅ |
| **SQL Compatibility** | Standard SQL | ClickHouse dialect | R2 SQL ✅ |
| **Materialized Views** | No | Yes | ClickHouse ✅ |
| **Partitioning** | Automatic (time) | Manual (configurable) | Tie |
| **Vector Search** | No | Limited | Neither ❌ |
| **Setup Complexity** | Low (managed) | Medium (self-hosted) | R2 SQL ✅ |
| **Cloudflare Integration** | Native | External | R2 SQL ✅ |
| **Data Retention** | Unlimited (cheap) | Limited by cost | R2 SQL ✅ |

**Recommendation:** Use **both** for different purposes:
- **R2 SQL** - Long-term log storage, cost-effective retention, ad-hoc queries
- **ClickHouse** - Real-time analytics, pre-aggregated metrics, dashboards
- **Vectorize** - Vector embeddings for semantic search

---

## Vectorize vs pgvector Comparison

| Feature | Vectorize (Cloudflare) | pgvector (PostgreSQL) | Winner |
|---------|----------------------|----------------------|--------|
| **Latency** | ~10-50ms (edge) | ~50-200ms (Neon) | Vectorize ✅ |
| **Throughput** | High | Medium | Vectorize ✅ |
| **Cost** | $0.040 per million queries | Included in DB | pgvector ✅ |
| **Dimension Limit** | 1536 | 2000 | pgvector ✅ |
| **Index Types** | Optimized | HNSW, IVFFlat | Tie |
| **Metadata Filtering** | Limited | Full SQL | pgvector ✅ |
| **Setup** | Simple (API) | Complex (extension) | Vectorize ✅ |
| **Multi-tenancy** | Native | Manual | Vectorize ✅ |

**Recommendation:** Use **both** for different use cases:
- **Vectorize** - Real-time semantic search, log similarity, error grouping
- **pgvector** - Entity search with complex filters, relationship queries

---

## Data Flow Architecture

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      All Workers (30+)                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
            ┌────────────────────┐
            │  Tail Consumers    │
            └────────┬───────────┘
                     │
                     ▼
            ┌────────────────────┐
            │  Pipeline Worker   │  ← Enriches & Classifies
            └────┬───────────────┘
                 │
                 ├─────────────────────┬─────────────────────┐
                 ▼                     ▼                     ▼
        ┌────────────────┐   ┌────────────────┐   ┌─────────────────┐
        │ Cloudflare     │   │  ClickHouse    │   │   Vectorize     │
        │ Pipeline       │   │  Direct Write  │   │   (Semantic)    │
        │      ↓         │   │                │   │                 │
        │  R2 Data       │   │  Real-time     │   │  Similar Logs   │
        │  Catalog       │   │  Analytics     │   │  Error Grouping │
        └────────────────┘   └────────────────┘   └─────────────────┘
                 │                     │                     │
                 └─────────────────────┴─────────────────────┘
                                       │
                                       ▼
                            ┌──────────────────────┐
                            │  Analytics Worker    │
                            │  - R2 SQL queries    │
                            │  - ClickHouse agg    │
                            │  - Vectorize search  │
                            └──────────────────────┘
                                       │
                                       ▼
                            ┌──────────────────────┐
                            │   Dashboard / API    │
                            └──────────────────────┘
```

### Pipeline Worker Updates

```typescript
export default {
  async tail(events: TailEvent[], env: Env): Promise<void> {
    const enrichedEvents = events.map(event => enrichEvent(event))

    // 1. Send to Cloudflare Pipeline (→ R2 SQL)
    await env.PIPELINE.send(enrichedEvents)

    // 2. Send to ClickHouse (real-time analytics)
    if (env.CLICKHOUSE_URL) {
      await sendToClickHouse(enrichedEvents, env)
    }

    // 3. Send to Vectorize (semantic search)
    if (env.VECTORIZE && shouldIndexVector(enrichedEvents)) {
      await sendToVectorize(enrichedEvents, env)
    }
  }
}
```

---

## Benchmarking Plan

### 1. Write Performance Benchmark

**Test:** Insert 10,000 log events

| Metric | R2 SQL | ClickHouse | Vectorize |
|--------|---------|------------|-----------|
| Throughput | ? events/sec | ? events/sec | ? vectors/sec |
| Latency p50 | ? ms | ? ms | ? ms |
| Latency p99 | ? ms | ? ms | ? ms |
| Cost per 1M | $0.36 | ? | $0.05 |

### 2. Query Performance Benchmark

**Test:** Run common analytics queries

**Query 1: Error summary (last hour)**
```sql
SELECT
  severity,
  count(*) as count
FROM logs
WHERE timestamp >= NOW() - INTERVAL '1 hour'
GROUP BY severity
```

**Query 2: Error rate by service (5-min buckets)**
```sql
SELECT
  toStartOfInterval(timestamp, INTERVAL 5 MINUTE) as bucket,
  script_name,
  count(*) as error_count
FROM logs
WHERE timestamp >= NOW() - INTERVAL '24 hours'
  AND severity IN ('critical', 'error')
GROUP BY bucket, script_name
ORDER BY bucket, error_count DESC
```

**Query 3: Top error messages**
```sql
SELECT
  error_type,
  error_message,
  count(*) as count
FROM logs
WHERE timestamp >= NOW() - INTERVAL '24 hours'
  AND error_type IS NOT NULL
GROUP BY error_type, error_message
ORDER BY count DESC
LIMIT 100
```

**Query 4: Vector similarity (Vectorize)**
```typescript
// Find similar error messages
const results = await env.VECTORIZE.query(errorEmbedding, {
  topK: 20,
  filter: { entity_type: 'log', severity: 'critical' }
})
```

### 3. Cost Benchmark

**Scenario:** 1M events/day, 30-day retention

| Component | Storage | Queries | Total |
|-----------|---------|---------|-------|
| R2 SQL | $? | $? | $? |
| ClickHouse | $? | $? | $? |
| Vectorize | N/A | $? | $? |
| **Total** | | | $? |

---

## Questions for Approval

### 1. Schema Design

**Q:** Does the proposed `logs` table schema cover all necessary fields?
- ✅ All current fields from pipeline worker
- ✅ Optimized column names (snake_case)
- ✅ Appropriate data types
- ❓ Missing any fields?

**Q:** Should we add additional fields?
- User ID (if authenticated)
- Session ID
- Request headers (as JSON)
- Response headers (as JSON)
- Custom metadata fields

### 2. Partitioning Strategy

**Q:** Is daily partitioning (YYYYMMDD) sufficient?
- **Current:** Daily partitions
- **Alternative:** Hourly partitions (for high volume)
- **Trade-off:** More partitions = faster queries, more overhead

**Q:** Should we partition by service as well?
- **Benefit:** Faster per-service queries
- **Drawback:** Many more partitions to manage

### 3. Data Retention

**Q:** How long should we retain logs?

| Tier | R2 SQL | ClickHouse | Vectorize |
|------|---------|------------|-----------|
| Hot (real-time) | 7 days | 7 days | 30 days |
| Warm (queryable) | 30 days | 30 days | N/A |
| Cold (archived) | 1+ years | Delete | Delete |

**Q:** Should we implement TTL policies?

### 4. Vector Search

**Q:** Which use cases need vector search?
- Error message similarity (group similar errors)
- Log pattern detection (anomaly detection)
- Semantic log search ("find logs about database timeouts")

**Q:** What dimension should we use?
- 768 (text-embedding-ada-002, cheaper)
- 1536 (text-embedding-3-small, better quality)

### 5. ClickHouse Setup

**Q:** Should we use ClickHouse Cloud or self-hosted?
- **Cloud:** $0.31/hour ($223/month minimum)
- **Self-hosted:** Infrastructure + maintenance

**Q:** What's the budget for analytics infrastructure?

### 6. Materialized Views

**Q:** Which pre-aggregations should we create?
- ✅ Service metrics by hour
- ✅ Error trends by 5 minutes
- ❓ User activity metrics
- ❓ Performance percentiles
- ❓ Cost attribution

### 7. Benchmark Priorities

**Q:** What's most important to optimize?
1. Write throughput (events/sec)
2. Query latency (ms)
3. Cost efficiency ($/1M events)
4. Storage efficiency (compression)

**Q:** What's acceptable performance?
- Write: ? events/sec minimum
- Query: ? ms maximum latency
- Cost: $? per 1M events maximum

---

## Implementation Plan (After Approval)

### Phase 1: Schema Setup (1-2 days)
1. ✅ Configure R2 Data Catalog with logs table
2. ✅ Setup ClickHouse instance and create tables
3. ✅ Create Vectorize index
4. ✅ Update pipeline worker to write to all three

### Phase 2: Integration (2-3 days)
1. ✅ Update db service with ClickHouse queries
2. ✅ Add Vectorize integration to db service
3. ✅ Create query wrappers for R2 SQL
4. ✅ Update analytics worker with all data sources

### Phase 3: Benchmarking (3-5 days)
1. ✅ Write performance benchmarks
2. ✅ Query performance benchmarks
3. ✅ Cost analysis
4. ✅ Comparison report
5. ✅ Architecture decision

### Phase 4: Optimization (3-5 days)
1. ✅ Implement chosen architecture
2. ✅ Remove unused components
3. ✅ Create materialized views
4. ✅ Setup retention policies
5. ✅ Documentation

### Phase 5: Testing (2-3 days)
1. ✅ Increase db service test coverage to 80%+
2. ✅ Integration tests for all data sources
3. ✅ Load testing
4. ✅ Failure mode testing

---

## Approval Checklist

Please review and approve:

- [ ] **Schema Design** - `logs` table structure
- [ ] **Partitioning Strategy** - Daily partitions, order by fields
- [ ] **Data Retention** - 7d hot, 30d warm, 1yr+ cold
- [ ] **Vector Search** - Use cases and dimensions
- [ ] **ClickHouse Setup** - Cloud vs self-hosted, budget
- [ ] **Materialized Views** - Which pre-aggregations
- [ ] **Benchmark Priorities** - What to optimize for
- [ ] **Implementation Plan** - 2-3 week timeline

---

## Next Steps

**After approval:**
1. Setup ClickHouse instance
2. Configure R2 Data Catalog schema
3. Create Vectorize index
4. Update pipeline worker
5. Run benchmarks
6. Make final architecture decision

**Questions to answer:**
1. Should we proceed with this schema?
2. Any fields to add/remove/modify?
3. ClickHouse Cloud or self-hosted?
4. What's the analytics infrastructure budget?
5. Any specific performance requirements?

---

**Status:** 🔶 Awaiting Approval
**Author:** Claude Code (AI)
**Last Updated:** 2025-10-04
