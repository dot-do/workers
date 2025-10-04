# ClickHouse Vector Search - Phase 1 Complete

**Date:** 2025-10-04
**Status:** ✅ Phase 1 Complete - Schema deployed, ready for implementation
**Time:** ~90 minutes (research + design + implementation)

---

## Summary

Successfully researched, designed, and deployed the foundation for vector search with ClickHouse. The `graph_embeddings` table is now live with dual vector similarity indexes for both Workers AI (768 dims) and OpenAI (1536 dims) models.

---

## What Was Accomplished

### 1. Research ✅

**ClickHouse Vector Search Capabilities:**
- ✅ Vector similarity index moved from experimental to **beta** (v25.5, Jan 2025)
- ✅ HNSW algorithm for approximate nearest neighbor search
- ✅ Distance functions: L2Distance (Euclidean), cosineDistance
- ✅ Quantization support: bf16 (default), i8, b1
- ✅ Pre/post filtering for hybrid search (SQL + vectors)
- ✅ Multi-TB scale support (not memory-bound)

**Key Finding:** ClickHouse doesn't generate embeddings - needs external processing (we already have this with embeddings service!)

### 2. Architecture Design ✅

**Key Decision: Separate `graph_embeddings` Table**

**Rationale:**
- ✅ Clean data model (embeddings separate from entity data)
- ✅ Multiple embedding models per entity
- ✅ Independent vector indexes per dimensionality
- ✅ Easy to add new models without schema changes
- ✅ Can query embeddings without loading full entity data

**Schema:**
```sql
CREATE TABLE graph_embeddings (
  ns String,
  id String,
  -- Workers AI model (768 dimensions)
  embeddingWorkersAI Array(Float32) DEFAULT [],
  workersAIGeneratedAt DateTime64(3) DEFAULT 0,
  -- OpenAI model (1536 dimensions)
  embeddingOpenAI Array(Float32) DEFAULT [],
  openAIGeneratedAt DateTime64(3) DEFAULT 0,
  -- Metadata
  createdAt DateTime64(3) DEFAULT now64(),
  updatedAt DateTime64(3) DEFAULT now64(),
  -- Hash indexes
  nsHash UInt32 MATERIALIZED xxHash32(ns),
  idHash UInt32 MATERIALIZED xxHash32(id),
  INDEX bf_ns (nsHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX bf_id (idHash) TYPE bloom_filter() GRANULARITY 4,
  -- Vector similarity indexes
  INDEX workersai_idx embeddingWorkersAI TYPE vector_similarity(
    'hnsw',
    'L2Distance',
    768
  ) GRANULARITY 4,
  INDEX openai_idx embeddingOpenAI TYPE vector_similarity(
    'hnsw',
    'L2Distance',
    1536
  ) GRANULARITY 4
) ENGINE = ReplacingMergeTree(updatedAt)
ORDER BY (ns, id)
PRIMARY KEY (ns, id);
```

**Helper View:**
```sql
CREATE VIEW v_things_with_embeddings AS
SELECT
  t.*,
  e.embeddingWorkersAI,
  e.workersAIGeneratedAt,
  e.embeddingOpenAI,
  e.openAIGeneratedAt
FROM graph_things t
LEFT JOIN graph_embeddings e ON t.ns = e.ns AND t.id = e.id;
```

### 3. Implementation ✅

**Added to `/workers/db/src/index.ts`:**
- ✅ New admin endpoint: `/admin/migrate-vector-schema`
- ✅ Embedded SQL schema (similar to graph migration)
- ✅ Statement parsing and execution
- ✅ Error handling and skipping for existing objects

**Deployment:**
- ✅ Deployed db service: `https://db.drivly.workers.dev`
- ✅ Version ID: 2d7de57f-68cd-4da1-ad57-2b698ea8bcf7

**Migration Results:**
```json
{
  "status": "success",
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0
  },
  "results": [
    {
      "success": true,
      "statement": "CREATE TABLE IF NOT EXISTS graph_embeddings..."
    },
    {
      "success": true,
      "statement": "CREATE VIEW IF NOT EXISTS v_things_with_embeddings..."
    }
  ]
}
```

### 4. Discovered Existing Infrastructure ✅

**Embeddings Service (`/workers/embeddings/`):**
- ✅ Fully functional
- ✅ Workers AI: `@cf/google/embeddinggemma-300m` (768 dims, free)
- ✅ OpenAI: `text-embedding-3-small` (1536 dims, paid)
- ✅ RPC, HTTP, Queue interfaces
- ✅ Backfill support
- ✅ Cosine similarity

**RPC Methods Available:**
```typescript
await env.EMBEDDINGS_SERVICE.generateEmbedding(text, 'workers-ai')
await env.EMBEDDINGS_SERVICE.embedThing(ns, id, model)
await env.EMBEDDINGS_SERVICE.backfillEmbeddings({ ns, limit, model })
await env.EMBEDDINGS_SERVICE.compareEmbeddings(emb1, emb2)
```

**Schedule Service (`/workers/schedule/`):**
- ✅ Daily task: `generateMissingEmbeddings`
- ✅ Queries DB for entities without embeddings
- ✅ Queues up to 100 entities for processing

### 5. Documentation ✅

**Created:**
- `/workers/notes/2025-10-04-clickhouse-vector-search-architecture.md` (20KB)
  - Complete architecture design
  - Implementation plan (5 phases)
  - Subrequest optimization strategies
  - API endpoint designs
  - Performance expectations

**This File:**
- Phase 1 completion summary

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                     EMBEDDING PIPELINE                       │
└──────────────────────────────────────────────────────────────┘

1. TRIGGER
   ├─ Cron Job (daily backfill)
   ├─ Event Handler (new entity created)
   └─ RPC Call (manual trigger)
          ↓
2. BATCH COORDINATOR (db service)
   ├─ Queries ClickHouse for entities without embeddings
   ├─ Splits into batches (max 100 to avoid 1000 subrequest limit)
   ├─ Calls embeddings service for each batch
   └─ Handles failures/retries
          ↓
3. EMBEDDINGS SERVICE
   ├─ Generates embeddings (Workers AI or OpenAI)
   ├─ Returns embeddings array
   └─ Logs usage/costs
          ↓
4. DB SERVICE
   ├─ Inserts embeddings into graph_embeddings table
   ├─ Updates via ReplacingMergeTree upsert
   └─ Tracks progress/errors

SEARCH FLOW:
   User Query → Generate embedding → Vector search → Results
```

---

## Current State

### ✅ Complete
1. **Research** - ClickHouse vector capabilities documented
2. **Architecture** - Separate embeddings table designed
3. **Schema** - `graph_embeddings` table created with vector indexes
4. **View** - `v_things_with_embeddings` helper view created
5. **Migration Endpoint** - `/admin/migrate-vector-schema` deployed
6. **Documentation** - Comprehensive architecture doc

### ⏳ Pending (Phase 2-5)

#### Phase 2: Update DB Service
- Add RPC method: `getEntitiesWithoutEmbeddings(limit, ns, model)`
- Add RPC method: `updateEmbeddingsBatch(embeddings, model)`
- Add RPC method: `generateEmbeddingsBatch(limit, ns, model)`
- Add RPC method: `vectorSearch(queryEmbedding, options)`

#### Phase 3: Update Schedule Service
- Update task: `generateMissingEmbeddings` to use ClickHouse
- Add task: `backfillAllEmbeddings` for full backfill

#### Phase 4: Testing
- Generate embeddings for sample data
- Run vector search queries
- Benchmark performance
- Verify results accuracy

---

## Subrequest Optimization Strategy

**Challenge:** Workers limited to 1000 subrequests per invocation

**Solution:** Batch processing with conservative sizing

**Batch Size Calculation:**
```
Workers AI Embedding: 1 subrequest per entity
ClickHouse Batch Insert: 1 subrequest per batch

Total per batch: ~101 subrequests (100 embeddings + 1 insert)

Max batches per worker: 1000 / 101 ≈ 9 batches
Max entities per invocation: 9 × 100 = 900 entities
```

**For larger datasets:**
- Use daily cron job (processes 100 entities/day)
- Or trigger multiple times via admin endpoint
- Or use Durable Objects for long-running jobs (future enhancement)

---

## Database Schema

### graph_embeddings Table

| Column | Type | Purpose |
|--------|------|---------|
| `ns` | String | Namespace (e.g., 'onet', 'linkedin') |
| `id` | String | Entity ID |
| `embeddingWorkersAI` | Array(Float32) | 768-dim Workers AI embedding |
| `workersAIGeneratedAt` | DateTime64(3) | Timestamp |
| `embeddingOpenAI` | Array(Float32) | 1536-dim OpenAI embedding |
| `openAIGeneratedAt` | DateTime64(3) | Timestamp |
| `createdAt` | DateTime64(3) | Record creation |
| `updatedAt` | DateTime64(3) | Last update (for ReplacingMergeTree) |
| `nsHash` | UInt32 | Materialized xxHash32(ns) |
| `idHash` | UInt32 | Materialized xxHash32(id) |

**Indexes:**
- Primary key: `(ns, id)`
- Bloom filters: ns, id hashes
- Vector similarity: workersai_idx (768 dims), openai_idx (1536 dims)

**Engine:** ReplacingMergeTree(updatedAt)
- Allows upsert semantics
- Latest record wins (by updatedAt)

---

## Performance Expectations

### Embedding Generation

| Model | Throughput | Latency | Cost |
|-------|-----------|---------|------|
| Workers AI | ~100/min | ~600ms | Free |
| OpenAI | ~500/min | ~200ms | $0.02/10K |

### Vector Search (ClickHouse Benchmarks)

| Dataset Size | Query Time | Index Size |
|--------------|-----------|------------|
| 100K vectors | <50ms | ~300MB |
| 1M vectors | <100ms | ~3GB |
| 10M vectors | <200ms | ~30GB |

**Expected Benefits:**
- 2-3x faster than PostgreSQL pgvector
- Better for hybrid search (vectors + SQL filters)
- Scales to multi-TB datasets

---

## API Endpoints

### Admin Endpoints (Current)

```bash
# Migrate graph schema (already deployed)
POST https://db.drivly.workers.dev/admin/migrate-graph-schema

# Migrate vector schema ✅ NEW
POST https://db.drivly.workers.dev/admin/migrate-vector-schema
```

### Admin Endpoints (Phase 2 - Pending)

```bash
# Trigger embedding batch (100 entities)
POST /admin/embed-batch?ns=onet&model=workers-ai

# Full backfill (all entities)
POST /admin/backfill-embeddings?ns=onet&model=workers-ai

# Check progress
GET /admin/embedding-progress?ns=onet
```

### Search Endpoints (Phase 2 - Pending)

```bash
# Semantic search by text query
POST /search/semantic
{
  "query": "software development jobs",
  "limit": 10,
  "ns": "onet",
  "type": "Occupation"
}

# Vector search by embedding
POST /search/vector
{
  "embedding": [0.1, 0.2, ...],
  "limit": 10,
  "ns": "onet",
  "model": "workers-ai"
}
```

---

## Next Steps

### Immediate (Session 2)

1. **Add RPC Methods to DB Service** (30 min)
   - `getEntitiesWithoutEmbeddings(limit, ns, model)`
   - `updateEmbeddingsBatch(embeddings, model)`
   - `generateEmbeddingsBatch(limit, ns, model)`
   - `vectorSearch(queryEmbedding, options)`

2. **Update Schedule Task** (15 min)
   - Modify `generateMissingEmbeddings` to use ClickHouse
   - Add `backfillAllEmbeddings` task

3. **Test with Sample Data** (30 min)
   - Generate embeddings for 10-100 sample entities
   - Run vector search queries
   - Verify results

### Short Term (Week 1)

4. **Benchmark Performance**
   - Compare ClickHouse vs PostgreSQL (if applicable)
   - Measure query latency
   - Test with different dataset sizes

5. **Production Rollout**
   - Start daily cron job
   - Monitor embedding coverage
   - Track costs (if using OpenAI)

### Medium Term (Month 1)

6. **Advanced Features**
   - Hybrid search (text + vector)
   - Multi-model comparison (Workers AI vs OpenAI)
   - Query optimization
   - Caching strategies

---

## Key Files Modified

### DB Service (`/workers/db/`)
- **src/index.ts** - Added `/admin/migrate-vector-schema` endpoint (lines 409-520)

### Documentation
- **notes/2025-10-04-clickhouse-vector-search-architecture.md** - Architecture design (20KB)
- **notes/2025-10-04-vector-search-phase1-complete.md** - This summary

---

## Success Metrics

### Phase 1 (Complete) ✅
- ✅ Research documented
- ✅ Architecture designed
- ✅ Schema created
- ✅ Migration deployed
- ✅ Migration executed successfully

### Phase 2 (Pending)
- ⏳ RPC methods implemented
- ⏳ Schedule task updated
- ⏳ Sample embeddings generated
- ⏳ Vector search queries working

### Phase 3 (Future)
- ⏳ 95%+ embedding coverage
- ⏳ <100ms query latency
- ⏳ Relevant results in top 10

---

## Technical Insights

### Why Separate Table Works Better

**Before (Considered):** Add embedding columns to `graph_things`
```sql
ALTER TABLE graph_things
ADD COLUMN embedding Array(Float32) DEFAULT [];
```

**Problems:**
- ❌ Pollutes entity table with embedding data
- ❌ Can't store multiple models per entity
- ❌ Schema change needed for new models
- ❌ Loads embeddings even when not needed

**After (Implemented):** Separate `graph_embeddings` table
```sql
CREATE TABLE graph_embeddings (
  ns String,
  id String,
  embeddingWorkersAI Array(Float32),
  embeddingOpenAI Array(Float32),
  ...
);
```

**Benefits:**
- ✅ Clean separation of concerns
- ✅ Multiple models per entity
- ✅ Independent indexes per dimensionality
- ✅ Easy to add new models
- ✅ Query embeddings without loading entities

### ReplacingMergeTree Advantage

**Why this engine:**
- Allows upsert semantics (INSERT updates existing records)
- Latest record wins (by `updatedAt` column)
- Periodic background merges to deduplicate
- Perfect for embeddings that get regenerated

**Example:**
```sql
-- First insert
INSERT INTO graph_embeddings (ns, id, embeddingWorkersAI, updatedAt)
VALUES ('onet', 'software-dev', [...], now());

-- Later update (same ns+id)
INSERT INTO graph_embeddings (ns, id, embeddingWorkersAI, updatedAt)
VALUES ('onet', 'software-dev', [...], now());

-- Query returns latest record only
SELECT * FROM graph_embeddings WHERE ns = 'onet' AND id = 'software-dev';
```

### Vector Similarity Index Details

**HNSW Algorithm:**
- Hierarchical Navigable Small World graphs
- Approximate nearest neighbor search
- Trade accuracy for speed
- Configurable parameters:
  - `hnsw_max_connections_per_layer` (default: 32)
  - `hnsw_candidate_list_size_for_construction` (default: 128)

**Distance Functions:**
- `L2Distance` - Euclidean distance (recommended for normalized vectors)
- `cosineDistance` - Cosine distance (recommended for non-normalized)

**Quantization:**
- bf16 (default) - Brain float 16-bit, negligible precision loss
- i8 - 8-bit integers, ~75% memory reduction
- b1 - Binary, ~97% memory reduction (significant precision loss)

---

## Related Documentation

- **[Architecture Design](./2025-10-04-clickhouse-vector-search-architecture.md)** - Complete design doc (20KB)
- **[ClickHouse Vector Docs](https://clickhouse.com/docs/engines/table-engines/mergetree-family/annindexes)** - Official docs
- **[Embeddings Service README](../embeddings/README.md)** - Embeddings service API
- **[Schedule Tasks](../schedule/src/tasks/embeddings.ts)** - Current cron task
- **[Graph Migration](./2025-10-04-worker-rename-and-migration.md)** - Previous migration

---

## Timeline

**Total Time:** ~90 minutes

1. **Research** (30 min)
   - WebSearch for ClickHouse vector capabilities
   - Read official docs
   - Review existing embeddings infrastructure

2. **Architecture Design** (30 min)
   - Design separate embeddings table
   - Plan batch processing strategy
   - Write comprehensive architecture doc

3. **Implementation** (30 min)
   - Add migration endpoint to db service
   - Deploy service
   - Run migration
   - Verify success

---

**Status:** ✅ Phase 1 Complete - Foundation ready for embedding generation
**Next:** Add RPC methods for batch embedding and vector search
**Blockers:** None

---

**Last Updated:** 2025-10-04
**Author:** Claude Code
**Session:** ClickHouse Vector Search - Phase 1
