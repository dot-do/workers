# ClickHouse Vector Search Architecture

**Date:** 2025-10-04
**Status:** 🏗️ Design Phase
**Goal:** Implement vector search with ClickHouse using existing embeddings infrastructure

---

## Summary

Design and implement vector search capabilities using ClickHouse's new vector similarity indexes (beta as of v25.5), leveraging our existing embeddings service for generating vectors.

---

## Research Findings

### ClickHouse Vector Capabilities

**Status:** Beta (as of v25.5, Jan 2025)

**Key Features:**
- **Vector Similarity Index** - ANN search using HNSW algorithm
- **Distance Functions** - L2Distance (Euclidean), cosineDistance
- **Quantization** - bf16 (default), i8, b1 for memory efficiency
- **Pre/Post Filtering** - Hybrid search with SQL filters
- **Multi-TB Scale** - Not memory-bound like dedicated vector DBs

**Syntax:**
```sql
CREATE TABLE things (
  vectors Array(Float32),
  INDEX vectors_idx vectors TYPE vector_similarity(
    'hnsw',
    'L2Distance',
    768
  ) GRANULARITY 4
) ENGINE = MergeTree ORDER BY id;
```

**Query:**
```sql
WITH [0.1, 0.2, ...] AS query_vec
SELECT id, L2Distance(vectors, query_vec) AS distance
FROM things
ORDER BY distance ASC
LIMIT 10;
```

---

## Existing Infrastructure

### ✅ Embeddings Service (`/workers/embeddings/`)

**Capabilities:**
- Generates embeddings via Workers AI (768 dims) or OpenAI (1536 dims)
- RPC, HTTP, Queue interfaces
- Backfill support for missing embeddings
- Cosine similarity comparison

**RPC Methods:**
```typescript
await env.EMBEDDINGS_SERVICE.generateEmbedding(text, 'workers-ai') // Returns number[]
await env.EMBEDDINGS_SERVICE.embedThing(ns, id, model)
await env.EMBEDDINGS_SERVICE.backfillEmbeddings({ ns, limit, model })
```

**Models:**
- **Workers AI:** `@cf/google/embeddinggemma-300m` (768 dims, free)
- **OpenAI:** `text-embedding-3-small` (1536 dims, $0.00002/1K tokens)

### ✅ Schedule Service (`/workers/schedule/`)

**Existing Task:** `generateMissingEmbeddings`
- Runs daily
- Queries DB for entities without embeddings
- Queues up to 100 entities for processing

**Location:** `/workers/schedule/src/tasks/embeddings.ts`

### ✅ Database Service (`/workers/db/`)

**Current State:**
- PostgreSQL has embedding columns (assumed)
- ClickHouse has `graph_things` and `graph_relationships` tables
- ❌ No vector columns in ClickHouse yet

---

## Design: ClickHouse Vector Search Pipeline

### Architecture Overview

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
   ├─ Splits into batches (max 1000 subrequests)
   ├─ Streams batches to embeddings service
   └─ Handles failures/retries
          ↓
3. EMBEDDINGS SERVICE
   ├─ Receives batch via RPC
   ├─ Generates embeddings (Workers AI or OpenAI)
   ├─ Returns embeddings array
   └─ Logs usage/costs
          ↓
4. DB SERVICE
   ├─ Receives embeddings batch
   ├─ Updates ClickHouse with vectors
   └─ Tracks progress/errors

SEARCH FLOW:
   User Query → Generate embedding → ClickHouse vector search → Results
```

### Key Design Decisions

#### 1. **Vector Storage Location**

**Decision:** Create separate `graph_embeddings` table

**Schema:**
```sql
CREATE TABLE IF NOT EXISTS graph_embeddings (
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
  -- Indexes for fast lookups
  nsHash UInt32 MATERIALIZED xxHash32(ns),
  idHash UInt32 MATERIALIZED xxHash32(id),
  INDEX bf_ns (nsHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX bf_id (idHash) TYPE bloom_filter() GRANULARITY 4,
  -- Vector similarity indexes (one per model)
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
PRIMARY KEY (ns, id)
SETTINGS index_granularity = 8192;
```

**Rationale:**
- ✅ Separate table = clean data model
- ✅ Multiple embedding models per entity (Workers AI + OpenAI)
- ✅ Independent indexes for each model dimensionality
- ✅ Easy to add new models without altering graph_things
- ✅ ReplacingMergeTree for upsert semantics
- ✅ Can query embeddings without loading full entity data

#### 2. **Handling 1000 Subrequest Limit**

**Problem:** Workers are limited to 1000 subrequests per invocation

**Solutions:**

**Option A: Batch Processing (Simple)**
```typescript
// Process in chunks of 100 entities
async function embedBatch(entities: Entity[], env: Env) {
  const BATCH_SIZE = 100

  for (let i = 0; i < entities.length; i += BATCH_SIZE) {
    const batch = entities.slice(i, i + BATCH_SIZE)

    // Generate embeddings (1 subrequest per entity to Workers AI)
    const embeddings = await Promise.all(
      batch.map(e => env.EMBEDDINGS_SERVICE.generateEmbedding(e.content))
    )

    // Update ClickHouse (1 batch insert)
    await updateClickHouseEmbeddings(batch, embeddings)
  }
}
```

**Subrequest count:** 100 (embeddings) + 1 (batch insert) = 101 per batch

**Option B: Streaming via Durable Objects (Complex)**
```typescript
// Use DO to coordinate long-running embedding jobs
class EmbeddingCoordinator extends DurableObject {
  async embed(entities: Entity[]) {
    // Process entities with retries, rate limiting, etc.
    // Not limited by subrequest count
    // Can run for hours if needed
  }
}
```

**Recommendation:** **Option A** - Batch processing
- Simpler implementation
- Sufficient for most use cases (100K entities = 1K batches)
- Can trigger via cron job or queue
- Option B only if we need >1M entities per job

#### 3. **Embedding Models**

**Primary:** Workers AI (`@cf/google/embeddinggemma-300m`)
- 768 dimensions
- Free (Workers AI quota)
- Fast (edge compute)

**Alternative:** OpenAI (`text-embedding-3-small`)
- 1536 dimensions
- Higher quality
- Costs money

**Schema Support:** Store both models in same table:
```sql
-- For Workers AI
embedding Array(Float32) DEFAULT []  -- 768 dims

-- For OpenAI (future)
embeddingOpenAI Array(Float32) DEFAULT []  -- 1536 dims
```

#### 4. **Backfill Strategy**

**Approaches:**

1. **Full Backfill** (one-time)
   - Embed all existing entities
   - Run in batches of 100
   - May take hours for large datasets

2. **Incremental Backfill** (daily cron)
   - Find 100 entities without embeddings
   - Generate embeddings
   - Repeat daily until complete

3. **On-Demand** (RPC trigger)
   - Admin can trigger backfill for specific namespace
   - Useful for new data sources

**Recommendation:** Implement all three
- Full backfill for initial population
- Incremental for maintenance
- On-demand for flexibility

---

## Implementation Plan

### Phase 1: Schema Migration (15 min)

**Create embeddings table in ClickHouse:**

```sql
-- Create graph_embeddings table with vector indexes
CREATE TABLE IF NOT EXISTS graph_embeddings (
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
  -- Hash indexes for fast lookups
  nsHash UInt32 MATERIALIZED xxHash32(ns),
  idHash UInt32 MATERIALIZED xxHash32(id),
  INDEX bf_ns (nsHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX bf_id (idHash) TYPE bloom_filter() GRANULARITY 4,
  -- Vector similarity indexes (one per model)
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
PRIMARY KEY (ns, id)
SETTINGS index_granularity = 8192;

-- Helper View: Join embeddings with things
CREATE VIEW IF NOT EXISTS v_things_with_embeddings AS
SELECT
  t.*,
  e.embeddingWorkersAI,
  e.workersAIGeneratedAt,
  e.embeddingOpenAI,
  e.openAIGeneratedAt
FROM graph_things t
LEFT JOIN graph_embeddings e ON t.ns = e.ns AND t.id = e.id;
```

**Create admin endpoint in db service:**
```typescript
app.post('/admin/migrate-vector-schema', async (c) => {
  // Execute schema migration (CREATE TABLE + VIEW)
})
```

### Phase 2: Update Embeddings Service (30 min)

**Add ClickHouse support:**

```typescript
// New RPC method
async generateBatchEmbeddings(
  entities: Array<{ ns: string; id: string; content: string }>,
  model: 'workers-ai' | 'openai' = 'workers-ai'
): Promise<Array<{ ns: string; id: string; embedding: number[] }>> {
  const results = []

  for (const entity of entities) {
    try {
      const embedding = await this.generateEmbedding(entity.content, model)
      results.push({ ns: entity.ns, id: entity.id, embedding })
    } catch (error) {
      console.error(`Failed to embed ${entity.ns}:${entity.id}`, error)
      results.push({ ns: entity.ns, id: entity.id, embedding: null })
    }
  }

  return results
}
```

### Phase 3: Update DB Service (45 min)

**Add batch embedding methods:**

```typescript
// RPC method: Get entities without embeddings
async getEntitiesWithoutEmbeddings(
  limit: number = 100,
  ns?: string,
  model: 'workers-ai' | 'openai' = 'workers-ai'
): Promise<Array<{ ns: string; id: string; content: string }>> {
  const embeddingColumn = model === 'openai' ? 'embeddingOpenAI' : 'embeddingWorkersAI'

  const query = `
    SELECT t.ns, t.id,
           coalesce(t.content, toString(t.data)) AS content
    FROM graph_things t
    LEFT JOIN graph_embeddings e ON t.ns = e.ns AND t.id = e.id
    WHERE (e.ns IS NULL OR length(e.${embeddingColumn}) = 0)
      ${ns ? `AND t.ns = {ns:String}` : ''}
    LIMIT {limit:UInt32}
  `

  const result = await clickhouse.query({
    query,
    query_params: { limit, ns },
    format: 'JSON'
  })

  return result.json()
}

// RPC method: Update embeddings
async updateEmbeddingsBatch(
  embeddings: Array<{ ns: string; id: string; embedding: number[]; model: string }>
): Promise<{ updated: number; failed: number }> {
  let updated = 0
  let failed = 0

  for (const item of embeddings) {
    if (!item.embedding) {
      failed++
      continue
    }

    try {
      const embeddingColumn = item.model === 'openai' ? 'embeddingOpenAI' : 'embeddingWorkersAI'
      const timestampColumn = item.model === 'openai' ? 'openAIGeneratedAt' : 'workersAIGeneratedAt'

      await clickhouse.insert({
        table: 'graph_embeddings',
        values: [{
          ns: item.ns,
          id: item.id,
          [embeddingColumn]: item.embedding,
          [timestampColumn]: Date.now(),
          updatedAt: Date.now()
        }],
        format: 'JSONEachRow'
      })
      updated++
    } catch (error) {
      console.error(`Failed to update ${item.ns}:${item.id}`, error)
      failed++
    }
  }

  return { updated, failed }
}

// RPC method: Trigger embedding batch
async generateEmbeddingsBatch(
  limit: number = 100,
  ns?: string,
  model: 'workers-ai' | 'openai' = 'workers-ai'
): Promise<{ processed: number; updated: number; failed: number }> {
  // 1. Get entities without embeddings
  const entities = await this.getEntitiesWithoutEmbeddings(limit, ns)

  if (entities.length === 0) {
    return { processed: 0, updated: 0, failed: 0 }
  }

  // 2. Generate embeddings via EMBEDDINGS_SERVICE
  const embeddings = await this.env.EMBEDDINGS_SERVICE.generateBatchEmbeddings(
    entities,
    model
  )

  // 3. Update ClickHouse
  const result = await this.updateEmbeddingsBatch(embeddings)

  return {
    processed: entities.length,
    updated: result.updated,
    failed: result.failed
  }
}

// RPC method: Vector search
async vectorSearch(
  queryEmbedding: number[],
  options: {
    limit?: number
    ns?: string
    type?: string
    threshold?: number
    model?: 'workers-ai' | 'openai'
  } = {}
): Promise<Array<{ ns: string; id: string; distance: number; thing: any }>> {
  const { limit = 10, ns, type, threshold, model = 'workers-ai' } = options
  const embeddingColumn = model === 'openai' ? 'embeddingOpenAI' : 'embeddingWorkersAI'
  const expectedDim = model === 'openai' ? 1536 : 768

  const query = `
    SELECT
      t.ns, t.id, t.type, t.data, t.content,
      L2Distance(e.${embeddingColumn}, {queryEmbedding:Array(Float32)}) AS distance
    FROM graph_embeddings e
    INNER JOIN graph_things t ON e.ns = t.ns AND e.id = t.id
    WHERE length(e.${embeddingColumn}) = ${expectedDim}
      ${ns ? `AND t.ns = {ns:String}` : ''}
      ${type ? `AND t.type = {type:String}` : ''}
      ${threshold ? `AND L2Distance(e.${embeddingColumn}, {queryEmbedding:Array(Float32)}) < {threshold:Float32}` : ''}
    ORDER BY distance ASC
    LIMIT {limit:UInt32}
  `

  const result = await clickhouse.query({
    query,
    query_params: {
      queryEmbedding,
      limit,
      ns,
      type,
      threshold
    },
    format: 'JSON'
  })

  return result.json()
}
```

### Phase 4: Update Schedule Service (20 min)

**Update existing embeddings task:**

```typescript
// /workers/schedule/src/tasks/embeddings.ts

export async function generateMissingEmbeddings(env: Env) {
  const startTime = Date.now()

  try {
    // Use db service to generate embeddings in batches
    const result = await env.DB.generateEmbeddingsBatch(
      100,        // limit
      undefined,  // ns (all namespaces)
      'workers-ai' // model
    )

    return {
      success: true,
      ...result,
      duration: Date.now() - startTime,
      message: `Embedded ${result.updated} entities, ${result.failed} failed`
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime,
    }
  }
}

// NEW: Full backfill task (admin-triggered)
export async function backfillAllEmbeddings(env: Env) {
  const startTime = Date.now()
  let totalProcessed = 0
  let totalUpdated = 0
  let totalFailed = 0

  try {
    // Process in batches until no more entities
    while (true) {
      const result = await env.DB.generateEmbeddingsBatch(100, undefined, 'workers-ai')

      totalProcessed += result.processed
      totalUpdated += result.updated
      totalFailed += result.failed

      if (result.processed === 0) {
        break // No more entities
      }

      // Prevent infinite loop
      if (totalProcessed >= 10000) {
        return {
          success: false,
          error: 'Max limit reached (10K entities)',
          processed: totalProcessed,
          updated: totalUpdated,
          failed: totalFailed,
          duration: Date.now() - startTime
        }
      }
    }

    return {
      success: true,
      processed: totalProcessed,
      updated: totalUpdated,
      failed: totalFailed,
      duration: Date.now() - startTime,
      message: `Backfill complete: ${totalUpdated} embedded, ${totalFailed} failed`
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      processed: totalProcessed,
      updated: totalUpdated,
      failed: totalFailed,
      duration: Date.now() - startTime,
    }
  }
}
```

### Phase 5: Testing (30 min)

**Test vector search with sample data:**

```typescript
// 1. Generate embedding for query
const queryText = "software development and programming"
const queryEmbedding = await env.EMBEDDINGS_SERVICE.generateEmbedding(
  queryText,
  'workers-ai'
)

// 2. Search ClickHouse
const results = await env.DB.vectorSearch(queryEmbedding, {
  limit: 10,
  ns: 'onet',
  type: 'Occupation'
})

// 3. Verify results
console.log('Found', results.length, 'similar occupations')
results.forEach(r => {
  console.log(`${r.ns}:${r.id} - Distance: ${r.distance}`)
})
```

---

## Subrequest Optimization

### Batch Size Calculation

**Workers AI Embedding Generation:**
- 1 subrequest per entity
- Safe batch size: 100 entities = 100 subrequests

**ClickHouse Batch Insert:**
- 1 subrequest per batch (can insert 100s of rows)

**Total per batch:** ~101 subrequests

**Max batches per worker:** 1000 / 101 ≈ 9 batches = 900 entities per invocation

**For larger datasets:**
- Use cron job to trigger multiple times
- Or use Durable Objects for coordination

### Alternative: Streaming Architecture (Future)

**If we hit limits:**

```typescript
// Use Durable Object to coordinate long-running jobs
export class EmbeddingCoordinator extends DurableObject {
  async embed(request: { ns?: string; limit?: number }) {
    let processed = 0

    while (true) {
      const batch = await this.env.DB.getEntitiesWithoutEmbeddings(100, request.ns)
      if (batch.length === 0) break

      // Generate embeddings
      const embeddings = await this.env.EMBEDDINGS_SERVICE.generateBatchEmbeddings(batch)

      // Update ClickHouse
      await this.env.DB.updateEmbeddingsBatch(embeddings)

      processed += batch.length

      // Store progress
      await this.env.storage.put('progress', processed)
    }

    return { processed }
  }

  async getProgress() {
    return await this.env.storage.get('progress') || 0
  }
}
```

**Benefits:**
- No subrequest limit
- Can run for hours
- Stores progress
- Supports pause/resume

---

## API Endpoints

### Admin Endpoints

```bash
# Migrate schema
POST /admin/migrate-vector-schema

# Trigger embedding batch (100 entities)
POST /admin/embed-batch?ns=onet&model=workers-ai

# Full backfill (all entities, runs until complete)
POST /admin/backfill-embeddings?ns=onet&model=workers-ai

# Check embedding progress
GET /admin/embedding-progress?ns=onet
```

### Search Endpoints

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
  "ns": "onet"
}
```

---

## Performance Expectations

### Embedding Generation

| Model | Throughput | Latency | Cost |
|-------|-----------|---------|------|
| Workers AI | ~100/min | ~600ms | Free |
| OpenAI | ~500/min | ~200ms | $0.02/10K |

### Vector Search

Based on ClickHouse benchmarks:

| Dataset Size | Query Time | Index Size |
|--------------|-----------|------------|
| 100K vectors | <50ms | ~300MB |
| 1M vectors | <100ms | ~3GB |
| 10M vectors | <200ms | ~30GB |

**Expected Performance:**
- Faster than PostgreSQL pgvector
- Comparable to dedicated vector DBs
- Better for hybrid search (vectors + SQL filters)

---

## Migration Checklist

### Phase 1: Schema ✅
- [ ] Add embedding columns to graph_things
- [ ] Add vector similarity index
- [ ] Create migration endpoint
- [ ] Test schema changes

### Phase 2: Embeddings Service ✅
- [ ] Add generateBatchEmbeddings RPC method
- [ ] Test with sample batch
- [ ] Deploy updated service

### Phase 3: DB Service ✅
- [ ] Add getEntitiesWithoutEmbeddings RPC method
- [ ] Add updateEmbeddingsBatch RPC method
- [ ] Add generateEmbeddingsBatch RPC method
- [ ] Add vectorSearch RPC method
- [ ] Test all methods
- [ ] Deploy updated service

### Phase 4: Schedule Service ✅
- [ ] Update generateMissingEmbeddings task
- [ ] Add backfillAllEmbeddings task
- [ ] Test cron triggers
- [ ] Deploy updated service

### Phase 5: Testing & Validation ✅
- [ ] Generate embeddings for sample data
- [ ] Run vector search queries
- [ ] Benchmark query performance
- [ ] Verify results accuracy
- [ ] Document API usage

---

## Success Metrics

### Embedding Coverage
- **Goal:** 95%+ entities with embeddings
- **Measurement:** `SELECT COUNT(*) WHERE length(embedding) > 0 / COUNT(*)`

### Search Performance
- **Goal:** <100ms for 10-result queries
- **Measurement:** `ORDER BY L2Distance(...) LIMIT 10` latency

### Quality
- **Goal:** Relevant results in top 10
- **Measurement:** Manual evaluation of sample queries

---

## Next Steps

1. ✅ Research ClickHouse vector search
2. ✅ Review existing embeddings infrastructure
3. ⏳ Design architecture (this document)
4. ⏳ Implement Phase 1: Schema migration
5. ⏳ Implement Phase 2: Embeddings service updates
6. ⏳ Implement Phase 3: DB service updates
7. ⏳ Implement Phase 4: Schedule service updates
8. ⏳ Phase 5: Test and validate

---

## Related Documentation

- **[ClickHouse Vector Search Docs](https://clickhouse.com/docs/engines/table-engines/mergetree-family/annindexes)** - Official docs
- **[embeddings/README.md](../embeddings/README.md)** - Embeddings service overview
- **[schedule/src/tasks/embeddings.ts](../schedule/src/tasks/embeddings.ts)** - Current task
- **[db/MIGRATION-READY.md](../db/MIGRATION-READY.md)** - Previous migration

---

**Status:** 🏗️ Architecture designed, ready for implementation
**Estimated Time:** 2-3 hours total (all phases)
**Dependencies:** Existing embeddings service, ClickHouse 25.5+

---

**Last Updated:** 2025-10-04
**Author:** Claude Code
**Session:** ClickHouse Vector Search Design
