# R2 Data Catalog Setup Guide

**Date:** 2025-10-04
**Status:** Setup Instructions
**Prerequisites:** Cloudflare account with R2 access

## Overview

This guide walks through setting up Cloudflare Pipelines with R2 Data Catalog to enable SQL queries over event data stored in Parquet format.

## Architecture

```
Workers → Pipeline Consumer → R2 Bucket (Parquet) → R2 SQL Query Engine
```

**Components:**
1. **Pipeline Consumer** - Enriches tail events and streams to R2
2. **R2 Bucket** - Stores events in Parquet format
3. **R2 Data Catalog** - Enables SQL queries over Parquet data
4. **Benchmark Worker** - Tests query performance

## Step 1: Create R2 Bucket

```bash
# Create R2 bucket for events
npx wrangler r2 bucket create events-realtime \
  --account-id b6641681fe423910342b9ffa1364c76d

# Verify bucket created
npx wrangler r2 bucket list
```

**Expected Output:**
```
✅ Created bucket 'events-realtime' successfully
```

## Step 2: Create Pipeline

```bash
# Create pipeline with R2 destination
npx wrangler pipelines create events-realtime \
  --account-id b6641681fe423910342b9ffa1364c76d \
  --destination r2://events-realtime/events/ \
  --format parquet
```

**Configuration:**
- **Pipeline Name:** events-realtime
- **Destination:** R2 bucket `events-realtime` with prefix `events/`
- **Format:** Parquet (columnar format optimized for SQL queries)
- **Partitioning:** Automatic by ingestion time

## Step 3: Configure R2 Data Catalog

Currently, R2 Data Catalog configuration requires using the Cloudflare Dashboard or API:

### Via Dashboard

1. Go to **Cloudflare Dashboard** → **R2** → **events-realtime bucket**
2. Click **"Enable Data Catalog"**
3. Configure schema detection:
   - **Auto-detect schema:** Enabled
   - **Schema evolution:** Enabled (handles new fields)
   - **Partition strategy:** By date (default)

### Via API (Alternative)

```bash
curl -X POST \
  "https://api.cloudflare.com/client/v4/accounts/b6641681fe423910342b9ffa1364c76d/r2/buckets/events-realtime/catalog" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "schema_detection": "auto",
    "partition_strategy": "date"
  }'
```

## Step 4: Define Events Table Schema

The events table will be auto-detected from Parquet files, but here's the expected schema:

**Schema File:** `schema/events.sql`

```sql
CREATE TABLE events (
  -- Identity
  ulid VARCHAR NOT NULL,
  timestamp BIGINT NOT NULL,
  event_timestamp BIGINT NOT NULL,

  -- Event Classification
  event_type VARCHAR NOT NULL,
  mutation_type VARCHAR,

  -- Entity Reference
  entity_ns VARCHAR,
  entity_id VARCHAR,
  entity_type VARCHAR,

  -- Source
  script_name VARCHAR NOT NULL,
  dispatch_namespace VARCHAR,
  worker_name VARCHAR NOT NULL,

  -- Request info
  url VARCHAR,
  method VARCHAR,
  cf_ray VARCHAR,
  user_agent VARCHAR,
  ip VARCHAR,

  -- Response info
  status INTEGER,
  outcome VARCHAR NOT NULL,

  -- RPC info
  rpc_method VARCHAR,

  -- Queue info
  queue_name VARCHAR,

  -- Email info
  email_to VARCHAR,

  -- Scheduled info
  scheduled_time BIGINT,
  cron VARCHAR,

  -- Web Content (5 formats) ⭐
  content_json VARCHAR,      -- Structured metadata
  content_code VARCHAR,      -- Extracted ESM/JavaScript
  content_markdown VARCHAR,  -- Markdown/MDX with frontmatter
  content_html VARCHAR,      -- Rendered HTML
  content_ast VARCHAR,       -- Abstract Syntax Tree (JSON string)

  -- Content Metadata
  content_length INTEGER,
  content_hash VARCHAR,
  content_language VARCHAR,
  content_format VARCHAR,

  -- Error information
  severity VARCHAR NOT NULL,
  category VARCHAR NOT NULL,
  error_type VARCHAR,
  error_message VARCHAR,
  has_exception BOOLEAN NOT NULL,

  -- Performance metrics
  cpu_time INTEGER NOT NULL,
  wall_time INTEGER NOT NULL,

  -- Logs
  log_count INTEGER NOT NULL,
  logs VARCHAR,

  -- Exceptions
  exception_count INTEGER NOT NULL,
  exceptions VARCHAR,

  -- Pipeline metadata
  pipeline_instance VARCHAR NOT NULL,
  pipeline_batch_id VARCHAR NOT NULL,
  retry_count INTEGER NOT NULL,

  -- Partitioning (auto-added by R2 Data Catalog)
  __partition_date DATE
)
PARTITIONED BY (__partition_date)
STORED AS PARQUET
```

**Key Indexes (R2 SQL doesn't support explicit indexes, but these columns should be queried efficiently):**
- `entity_ns + entity_id` - Direct lookup (most critical)
- `event_type` - Filter by event type
- `timestamp` - Time-range queries
- `content_hash` - Deduplication queries

## Step 5: Deploy Pipeline Worker

```bash
cd /Users/nathanclevenger/Projects/.do/workers/pipeline

# Deploy pipeline consumer
npx wrangler deploy

# Verify deployment
curl https://pipeline.do/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "pipeline": "events-realtime"
}
```

## Step 6: Test Pipeline with Sample Event

```bash
# Send test event to pipeline
curl -X POST https://pipeline.do/test \
  -H "Content-Type: application/json" \
  -d '{
    "scriptName": "test",
    "eventTimestamp": 1696320000000,
    "outcome": "ok"
  }'
```

**Check R2 Bucket:**
```bash
# List files in bucket (should see Parquet files)
npx wrangler r2 object list events-realtime --prefix events/

# Expected output: events/2025/10/04/batch-01JXXXXXX.parquet
```

## Step 7: Deploy Benchmark Worker

```bash
cd /Users/nathanclevenger/Projects/.do/workers/benchmark

# Deploy benchmark worker
npx wrangler deploy

# Verify deployment
curl https://benchmark.do/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "benchmark"
}
```

## Step 8: Generate Test Data

```bash
# Generate 100 test pages (for quick test)
curl -X POST https://benchmark.do/generate \
  -H "Content-Type: application/json" \
  -d '{
    "count": 100,
    "avgSizeKB": 225
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "generated": 100,
  "duration": 5000,
  "throughput": 20,
  "avgSizeKB": 225
}
```

**Wait 5-10 minutes** for Pipeline to write Parquet files to R2.

## Step 9: Verify Data in R2

```bash
# Check bucket for Parquet files
npx wrangler r2 object list events-realtime --prefix events/

# Expected: Multiple .parquet files
# Example: events/2025/10/04/batch-01JXXXXXX.parquet
```

**File Size Check:**
```bash
# Download sample file
npx wrangler r2 object get events-realtime events/2025/10/04/batch-01JXXXXXX.parquet

# Inspect with Parquet tools (optional)
pip install pyarrow
python -c "import pyarrow.parquet as pq; print(pq.read_table('batch-01JXXXXXX.parquet').schema)"
```

## Step 10: Configure R2 SQL Binding

Add R2 SQL binding to benchmark worker:

**File:** `benchmark/wrangler.jsonc`

```jsonc
{
  "name": "benchmark",
  "main": "src/index.ts",
  "compatibility_date": "2025-07-08",
  "account_id": "b6641681fe423910342b9ffa1364c76d",
  "observability": {
    "enabled": true
  },
  "pipelines": [
    {
      "pipeline": "events-realtime",
      "binding": "PIPELINE"
    }
  ],
  // ADD THIS:
  "r2_buckets": [
    {
      "binding": "R2_SQL",
      "bucket_name": "events-realtime",
      "jurisdiction": "us"
    }
  ]
}
```

**Redeploy:**
```bash
npx wrangler deploy
```

## Step 11: Run Benchmarks

### Test Direct Lookup (MOST CRITICAL)

```bash
curl https://benchmark.do/benchmark?type=lookup
```

**Expected Response:**
```json
{
  "success": true,
  "results": [
    {
      "name": "Direct Lookup",
      "description": "Get single document by ns+id (MOST CRITICAL)",
      "durationMs": 450,
      "threshold": 500,
      "passed": true,
      "details": {
        "query": "SELECT ... FROM events WHERE entity_ns = 'en.wikipedia.org' AND entity_id = 'TypeScript'",
        "entity_ns": "en.wikipedia.org",
        "entity_id": "TypeScript",
        "note": "ClickHouse does this in < 100ms"
      }
    }
  ],
  "passed": true
}
```

### Run All Benchmarks

```bash
curl https://benchmark.do/benchmark?type=all
```

**This will take 30-60 seconds** and run all 6 benchmarks:
1. Direct Lookup (< 500ms)
2. Recent Content (< 500ms)
3. Full-Text Search (< 5s)
4. Aggregations (< 10s)
5. Deduplication (< 15s)
6. Historical Queries (< 2s)

## Step 12: Analyze Results

### Check Status

```bash
curl https://benchmark.do/status
```

**Response includes:**
- All benchmark thresholds
- 3 architecture options with costs
- Decision framework

### Make Architecture Decision

Based on Direct Lookup benchmark results:

**If < 500ms:**
```
✅ Use R2 SQL Only ($34/month)
No caching needed, acceptable performance
```

**If 500-2000ms:**
```
✅ Use R2 SQL + Cache Layer ($35/month) ⭐ RECOMMENDED
Implement Cloudflare Cache API with SWR
- First hit: 500-2000ms (cold)
- Subsequent: < 50ms (hot, 80-90% hit ratio)
```

**If > 2000ms:**
```
⚠️ Use ClickHouse + R2 SQL ($432/month)
R2 SQL too slow for direct lookups
- Hot data: ClickHouse (< 100ms)
- Cold data: R2 SQL (< 5s archive)
```

## Step 13: Generate Full Test Dataset (Optional)

For comprehensive benchmarking with 10,000 pages:

```bash
# Generate 10K test pages (takes ~5 minutes)
curl -X POST https://benchmark.do/generate \
  -H "Content-Type: application/json" \
  -d '{
    "count": 10000,
    "avgSizeKB": 225
  }'
```

**Wait 30 minutes** for Pipeline to write all data to R2.

**Data Size:**
- 10,000 pages × 225 KB = 2.25 GB
- Parquet compressed: ~600 MB (4:1 compression)
- R2 Storage cost: ~$0.01/month

## Troubleshooting

### No Parquet Files in R2

**Check Pipeline Status:**
```bash
npx wrangler tail pipeline --format json | jq
```

**Verify Pipeline Binding:**
```bash
# Check wrangler.jsonc has correct pipeline binding
cat pipeline/wrangler.jsonc | grep -A 3 pipelines
```

### R2 SQL Queries Failing

**Check Data Catalog is Enabled:**
```bash
curl -X GET \
  "https://api.cloudflare.com/client/v4/accounts/b6641681fe423910342b9ffa1364c76d/r2/buckets/events-realtime/catalog" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN"
```

**Verify Schema Detection:**
- Go to Cloudflare Dashboard → R2 → events-realtime
- Check "Data Catalog" tab
- Ensure schema is detected

### Slow Query Performance

**Check Partition Pruning:**
```sql
-- Bad: Full scan
SELECT * FROM events WHERE entity_id = 'TypeScript'

-- Good: Partition pruning
SELECT * FROM events
WHERE __partition_date >= '2025-10-01'
  AND entity_id = 'TypeScript'
```

**Check File Sizes:**
```bash
# Files should be 10-100 MB each
# Too small (< 1 MB) = inefficient queries
# Too large (> 500 MB) = slow scans
npx wrangler r2 object list events-realtime --prefix events/
```

## Cost Tracking

Monitor costs in Cloudflare Dashboard:

**R2 Storage:**
- Dashboard → R2 → events-realtime bucket → Analytics
- Check storage usage (should be ~600 MB for 10K pages)
- Cost: 0.6 GB × $0.015/GB = $0.009/month

**R2 Operations:**
- Class A (writes): 10K × $4.50/1M = $0.045
- Class B (reads): 100 queries × $0.36/1M = negligible
- Total: ~$0.05/month for testing

**Pipeline:**
- Included in Workers Paid plan
- No additional cost

**R2 SQL:**
- Query execution: Free (included in R2 pricing)
- No per-query fees

## Next Steps

1. ✅ Create R2 bucket
2. ✅ Create pipeline
3. ✅ Enable R2 Data Catalog
4. ✅ Deploy pipeline worker
5. ✅ Deploy benchmark worker
6. ✅ Generate test data (100-10K pages)
7. ✅ Run benchmarks
8. ⏳ Analyze results
9. ⏳ Make architecture decision
10. ⏳ Implement chosen architecture

## Related Documentation

- [Cloudflare Pipelines Docs](https://developers.cloudflare.com/pipelines/)
- [R2 Data Catalog Docs](https://developers.cloudflare.com/r2/data-catalog/)
- [R2 SQL Query Reference](https://developers.cloudflare.com/r2/data-catalog/query-reference/)
- [Parquet Format Spec](https://parquet.apache.org/docs/)
- [Benchmark Worker README](../benchmark/README.md)
- [Phase 1 MVP Implementation](./2025-10-04-phase1-mvp-implementation.md)
- [Caching Strategy Update](./2025-10-04-caching-strategy-update.md)

---

**Created:** 2025-10-04
**Status:** Ready for implementation
**Estimated Time:** 2-3 hours for full setup and benchmarking
