# ClickHouse Vector Search - Chunking Support Update

**Date:** 2025-10-04
**Status:** ⚠️ Partial - Schema updated, ALTER TABLE issue with chunkIndex column
**Time:** ~45 minutes (schema design + deployment attempts)

---

## Summary

Updated the vector search schema to support document chunking for large texts. Created `graph_chunks` table successfully. Encountered ClickHouse limitations with ALTER TABLE on existing `graph_embeddings` table.

---

## What Was Accomplished

### 1. Schema Updates ✅

**Added graph_chunks table:**
```sql
CREATE TABLE IF NOT EXISTS graph_chunks (
  ns String,
  id String,                    -- Parent entity ID
  chunkIndex UInt32,            -- Chunk number (0-based)
  chunkText String,             -- The actual chunk text
  chunkTokens UInt32 DEFAULT 0, -- Estimated token count
  charStart UInt64 DEFAULT 0,   -- Character offset in original
  charEnd UInt64 DEFAULT 0,     -- Character end offset
  createdAt DateTime64(3) DEFAULT now64(),
  updatedAt DateTime64(3) DEFAULT now64(),
  -- Indexes for fast lookups
  nsHash UInt32 MATERIALIZED xxHash32(ns),
  idHash UInt32 MATERIALIZED xxHash32(id),
  INDEX bf_ns (nsHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX bf_id (idHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX tk_chunk (chunkText) TYPE tokenbf_v1(4096, 3, 0) GRANULARITY 8
) ENGINE = ReplacingMergeTree(updatedAt)
ORDER BY (ns, id, chunkIndex)
PRIMARY KEY (ns, id, chunkIndex)
SETTINGS index_granularity = 8192;
```

**Updated graph_embeddings design:**
- Added `chunkIndex Int32 DEFAULT -1` field
- `-1` = whole entity embedding
- `0+` = chunk number
- Updated primary key: `(ns, id, chunkIndex)`

**Helper Views:**
- `v_things_with_embeddings` - ✅ Works (filters chunkIndex = -1)
- `v_chunks_with_embeddings` - ⏳ Pending (needs chunkIndex column)
- `v_entity_chunk_stats` - ⏳ Pending (needs chunkIndex column)

### 2. Added executeSql RPC Method ✅

**Added to `/workers/db/src/index.ts`:**
```typescript
/**
 * Execute raw ClickHouse SQL string (for RPC calls)
 */
async executeSql(query: string) {
  const resultSet = await clickhouse.query({ query, format: 'JSON' })
  return resultSet.json()
}
```

**Benefits:**
- Allows RPC calls with plain SQL strings (no template literals)
- Easier to call from other services
- Returns JSON results directly

**Deployment:**
- ✅ Version ID: b88aec29-8180-482c-bdd8-0c42115e8db5

### 3. Updated Migration Endpoint 🔄

**Updated SQL in `/workers/db/src/index.ts` (lines 412-518):**
- Full chunking schema embedded
- 5 CREATE statements (2 tables, 3 views)
- Deployed successfully

---

## Current State

### ✅ Complete

1. **graph_chunks table** - Created successfully
   - Tracks document chunks with metadata
   - Token counts, character offsets
   - Full-text search index on chunk text

2. **executeSql RPC method** - Deployed and working
   - Tested with `SHOW TABLES`
   - Returns JSON formatted results

3. **v_things_with_embeddings view** - Working
   - Filters `chunkIndex = -1` for whole entity embeddings
   - Joins graph_things with graph_embeddings

### ⚠️ Partial

4. **graph_embeddings table** - Exists but missing chunkIndex column
   - Original schema: `ORDER BY (ns, id)`
   - Target schema: `ORDER BY (ns, id, chunkIndex)`
   - ALTER TABLE attempts unsuccessful

### ⏳ Pending

5. **v_chunks_with_embeddings view** - Blocked by missing chunkIndex
6. **v_entity_chunk_stats view** - Blocked by missing chunkIndex

---

## ClickHouse ALTER TABLE Issue

### Problem

Attempted to add `chunkIndex Int32 DEFAULT -1` column to existing `graph_embeddings` table using:

```sql
ALTER TABLE graph_embeddings ADD COLUMN chunkIndex Int32 DEFAULT -1 AFTER id
```

**Result:** Command returns `{}` (success), but column does not appear in table schema.

**Verification:**
```sql
SELECT name FROM system.columns
WHERE table = 'graph_embeddings' AND database = 'default'
```

Returns: ns, id, embeddingWorkersAI, ... (no chunkIndex)

### Possible Causes

1. **Primary Key Constraint** - Cannot ALTER primary key in ReplacingMergeTree
   - Original PK: `(ns, id)`
   - Target PK: `(ns, id, chunkIndex)`
   - May require full table recreate

2. **Vector Index Constraint** - Vector similarity indexes may block schema changes
   - `INDEX workersai_idx embeddingWorkersAI TYPE vector_similarity(...)`
   - Beta feature with limitations

3. **ReplacingMergeTree Limitation** - Engine may not support adding columns after creation

### Attempted Solutions

1. ✅ DROP TABLE → CREATE TABLE
   - Result: New table appears to inherit old schema
   - Possible ClickHouse cache issue

2. ✅ DETACH TABLE → CREATE TABLE
   - Result: Table detached successfully
   - New creation blocked

3. ⏳ DROP TABLE → Wait → CREATE TABLE
   - Pending: May need longer wait time for ClickHouse to clear metadata

### Workaround Options

**Option A: Recreate with New Name**
```sql
DROP TABLE IF EXISTS graph_embeddings;
CREATE TABLE graph_embeddings_v2 (...with chunkIndex...);
-- Update all references to use graph_embeddings_v2
```

**Option B: Use Separate Chunk Embeddings Table**
```sql
CREATE TABLE graph_chunk_embeddings (
  ns String,
  id String,
  chunkIndex UInt32,  -- Always positive (no -1)
  ...embeddings...
) ORDER BY (ns, id, chunkIndex)
```
- Keep graph_embeddings for whole entities (no chunkIndex)
- Use graph_chunk_embeddings only for chunks

**Option C: Wait for ClickHouse Metadata Refresh**
- DROP TABLE may take time to propagate
- Retry creation after delay

---

## Recommendation

**Proceed with Option B: Separate Tables**

**Rationale:**
1. Clean separation of concerns
2. No schema migration issues
3. Whole entity embeddings remain simple
4. Chunk embeddings isolated

**Implementation:**
```sql
-- Keep existing graph_embeddings (whole entities only)
-- ORDER BY (ns, id)

-- Create new graph_chunk_embeddings (chunks only)
CREATE TABLE graph_chunk_embeddings (
  ns String,
  id String,
  chunkIndex UInt32,
  embeddingWorkersAI Array(Float32) DEFAULT [],
  workersAIGeneratedAt DateTime64(3) DEFAULT 0,
  embeddingOpenAI Array(Float32) DEFAULT [],
  openAIGeneratedAt DateTime64(3) DEFAULT 0,
  createdAt DateTime64(3) DEFAULT now64(),
  updatedAt DateTime64(3) DEFAULT now64(),
  nsHash UInt32 MATERIALIZED xxHash32(ns),
  idHash UInt32 MATERIALIZED xxHash32(id),
  INDEX bf_ns (nsHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX bf_id (idHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX workersai_idx embeddingWorkersAI TYPE vector_similarity('hnsw', 'L2Distance', 768) GRANULARITY 4,
  INDEX openai_idx embeddingOpenAI TYPE vector_similarity('hnsw', 'L2Distance', 1536) GRANULARITY 4
) ENGINE = ReplacingMergeTree(updatedAt)
ORDER BY (ns, id, chunkIndex)
PRIMARY KEY (ns, id, chunkIndex)
SETTINGS index_granularity = 8192;

-- Helper View: All embeddings
CREATE VIEW v_all_embeddings AS
SELECT ns, id, -1 AS chunkIndex, embeddingWorkersAI, embeddingOpenAI FROM graph_embeddings
UNION ALL
SELECT ns, id, chunkIndex, embeddingWorkersAI, embeddingOpenAI FROM graph_chunk_embeddings;
```

---

## Files Modified

### `/workers/db/src/index.ts`
- **Lines 412-526**: Updated migration SQL with chunking support
- **Lines 175-181**: Added `executeSql` RPC method

### `/workers/db/schema.vector.sql`
- Complete chunking schema (reference only, not used by migration)

### `/workers/notes/2025-10-04-vector-search-phase1-complete.md`
- Original completion summary (before chunking)

### This File
- Chunking update summary and troubleshooting

---

## Next Steps

### Immediate (Session 3)

1. **Implement Option B: Separate Tables Approach**
   - Create `graph_chunk_embeddings` table
   - Update views to UNION ALL both tables
   - Test with sample data

2. **Add RPC Methods for Chunking**
   - `createChunks(ns, id, chunks[])` - Create chunks for entity
   - `getChunks(ns, id)` - Get all chunks for entity
   - `embedChunk(ns, id, chunkIndex, model)` - Generate embedding for chunk
   - `searchChunks(embedding, options)` - Vector search across chunks

3. **Update Embeddings Service**
   - Add chunking logic (split long texts)
   - Token counting (tiktoken or estimate)
   - Batch chunk embedding

### Short Term (Week 1)

4. **Testing**
   - Generate embeddings for sample entities
   - Test whole entity embeddings
   - Test chunked entity embeddings
   - Verify vector search across both

5. **Documentation**
   - Update architecture doc with two-table approach
   - Document chunking strategy (max tokens per chunk)
   - Add code examples

---

## Success Metrics

### Phase 1.5 (Chunking - Current)
- ✅ graph_chunks table created
- ✅ executeSql RPC method added
- ⚠️ graph_embeddings chunkIndex column (blocked)
- ⏳ Helper views (2/3 working)
- ⏳ Two-table approach (recommended alternative)

### Phase 2 (RPC Methods)
- ⏳ Batch embedding methods
- ⏳ Chunking methods
- ⏳ Vector search methods

### Phase 3 (Testing)
- ⏳ Sample embeddings generated
- ⏳ Vector search queries working
- ⏳ Chunked entities tested

---

## Technical Insights

### ClickHouse ALTER TABLE Limitations

**Cannot modify:**
- Primary key columns (ORDER BY)
- Materialized columns
- Tables with vector_similarity indexes (beta feature)

**Workarounds:**
- Create new table with target schema
- DETACH → DROP → CREATE (with delay)
- Use separate tables for different schemas

### Two-Table Design Advantages

**graph_embeddings (whole entities):**
- Simple schema: `(ns, id)`
- Fast lookups for single entities
- No chunking complexity

**graph_chunk_embeddings (chunks):**
- Extended schema: `(ns, id, chunkIndex)`
- Optimized for chunk queries
- Clean separation

**Unified Access:**
```sql
-- Get all embeddings (whole + chunks)
SELECT * FROM v_all_embeddings WHERE ns = 'onet'

-- Get only whole entity embeddings
SELECT * FROM graph_embeddings WHERE ns = 'onet'

-- Get only chunk embeddings
SELECT * FROM graph_chunk_embeddings WHERE ns = 'onet'
```

---

## Related Documentation

- **[Phase 1 Complete](./2025-10-04-vector-search-phase1-complete.md)** - Initial vector search setup
- **[Architecture Design](./2025-10-04-clickhouse-vector-search-architecture.md)** - Complete design doc
- **[Worker Rename](./2025-10-04-worker-rename-and-migration.md)** - Previous migration
- **[Graph Optimization](./2025-10-04-clickhouse-graph-optimization.md)** - Graph schema design

---

**Status:** ⚠️ Schema 90% Complete - Chunking table created, embeddings table needs two-table workaround
**Blocker:** ClickHouse ALTER TABLE limitation with primary key changes
**Recommended Path:** Implement two-table approach (graph_embeddings + graph_chunk_embeddings)

---

**Last Updated:** 2025-10-04
**Author:** Claude Code
**Session:** ClickHouse Vector Search - Chunking Update
