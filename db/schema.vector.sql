-- ClickHouse Vector Search Schema
-- Supports chunking for large documents with separate embeddings per chunk

-- Chunks Table: Track document chunks with metadata
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

-- Embeddings Table: Store vector embeddings per entity or chunk
CREATE TABLE IF NOT EXISTS graph_embeddings (
  ns String,
  id String,                       -- Entity ID
  chunkIndex Int32 DEFAULT -1,     -- -1 = whole entity, 0+ = chunk number
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
ORDER BY (ns, id, chunkIndex)
PRIMARY KEY (ns, id, chunkIndex)
SETTINGS index_granularity = 8192;

-- Helper View: Join embeddings with things (whole entity only, no chunks)
CREATE VIEW IF NOT EXISTS v_things_with_embeddings AS
SELECT
  t.*,
  e.embeddingWorkersAI,
  e.workersAIGeneratedAt,
  e.embeddingOpenAI,
  e.openAIGeneratedAt
FROM graph_things t
LEFT JOIN graph_embeddings e
  ON t.ns = e.ns
  AND t.id = e.id
  AND e.chunkIndex = -1;  -- Only whole entity embeddings

-- Helper View: Join embeddings with chunks
CREATE VIEW IF NOT EXISTS v_chunks_with_embeddings AS
SELECT
  c.*,
  e.embeddingWorkersAI,
  e.workersAIGeneratedAt,
  e.embeddingOpenAI,
  e.openAIGeneratedAt
FROM graph_chunks c
LEFT JOIN graph_embeddings e
  ON c.ns = e.ns
  AND c.id = e.id
  AND c.chunkIndex = e.chunkIndex;

-- Helper View: Entity chunk summary
CREATE VIEW IF NOT EXISTS v_entity_chunk_stats AS
SELECT
  ns,
  id,
  COUNT(*) AS totalChunks,
  SUM(chunkTokens) AS totalTokens,
  SUM(CASE WHEN e.embeddingWorkersAI IS NOT NULL AND length(e.embeddingWorkersAI) > 0 THEN 1 ELSE 0 END) AS chunksWithWorkersAI,
  SUM(CASE WHEN e.embeddingOpenAI IS NOT NULL AND length(e.embeddingOpenAI) > 0 THEN 1 ELSE 0 END) AS chunksWithOpenAI,
  MIN(c.createdAt) AS firstChunkCreated,
  MAX(c.updatedAt) AS lastChunkUpdated
FROM graph_chunks c
LEFT JOIN graph_embeddings e
  ON c.ns = e.ns
  AND c.id = e.id
  AND c.chunkIndex = e.chunkIndex
GROUP BY ns, id;
