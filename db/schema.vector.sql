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

-- Embeddings Table: Store vector embeddings per whole entity (not chunks)
-- Note: Due to ClickHouse ReplacingMergeTree + vector index limitations,
-- we use separate tables for entity vs chunk embeddings
CREATE TABLE IF NOT EXISTS graph_embeddings (
  ns String,
  id String,                       -- Entity ID

  -- Original Models (Legacy)
  -- Workers AI @cf/google/embeddinggemma-300m (768 dimensions, legacy)
  embeddingWorkersAI Array(Float32) DEFAULT [],
  workersAIGeneratedAt DateTime64(3) DEFAULT 0,
  -- OpenAI text-embedding-ada-002 (1536 dimensions, legacy)
  embeddingOpenAI Array(Float32) DEFAULT [],
  openAIGeneratedAt DateTime64(3) DEFAULT 0,

  -- EmbeddingGemma (Cloudflare Workers AI) - Matryoshka Representation Learning
  -- @cf/google/embeddinggemma-300m with variable dimensions (128, 256, 512, 768)
  -- Truncate from 768 to smaller sizes for storage/speed optimization
  embeddingGemma128 Array(Float32) DEFAULT [],
  gemma128GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemma256 Array(Float32) DEFAULT [],
  gemma256GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemma512 Array(Float32) DEFAULT [],
  gemma512GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemma768 Array(Float32) DEFAULT [],
  gemma768GeneratedAt DateTime64(3) DEFAULT 0,

  -- Gemini (Google Gemini API) - Variable dimensions via output_dimensionality
  -- gemini-embedding-001 supports 128-3072 dimensions
  -- Recommended: 768, 1536, 3072 for optimal performance
  embeddingGemini128 Array(Float32) DEFAULT [],
  gemini128GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemini768 Array(Float32) DEFAULT [],
  gemini768GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemini1536 Array(Float32) DEFAULT [],
  gemini1536GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemini3072 Array(Float32) DEFAULT [],
  gemini3072GeneratedAt DateTime64(3) DEFAULT 0,

  -- Metadata
  createdAt DateTime64(3) DEFAULT now64(),
  updatedAt DateTime64(3) DEFAULT now64(),

  -- Hash indexes for fast lookups
  nsHash UInt32 MATERIALIZED xxHash32(ns),
  idHash UInt32 MATERIALIZED xxHash32(id),
  INDEX bf_ns (nsHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX bf_id (idHash) TYPE bloom_filter() GRANULARITY 4,

  -- Vector similarity indexes (one per model/dimension combination)
  -- Legacy models
  INDEX workersai_idx embeddingWorkersAI TYPE vector_similarity('hnsw', 'L2Distance', 768) GRANULARITY 4,
  INDEX openai_idx embeddingOpenAI TYPE vector_similarity('hnsw', 'L2Distance', 1536) GRANULARITY 4,

  -- EmbeddingGemma indexes
  INDEX gemma128_idx embeddingGemma128 TYPE vector_similarity('hnsw', 'L2Distance', 128) GRANULARITY 4,
  INDEX gemma256_idx embeddingGemma256 TYPE vector_similarity('hnsw', 'L2Distance', 256) GRANULARITY 4,
  INDEX gemma512_idx embeddingGemma512 TYPE vector_similarity('hnsw', 'L2Distance', 512) GRANULARITY 4,
  INDEX gemma768_idx embeddingGemma768 TYPE vector_similarity('hnsw', 'L2Distance', 768) GRANULARITY 4,

  -- Gemini indexes
  INDEX gemini128_idx embeddingGemini128 TYPE vector_similarity('hnsw', 'L2Distance', 128) GRANULARITY 4,
  INDEX gemini768_idx embeddingGemini768 TYPE vector_similarity('hnsw', 'L2Distance', 768) GRANULARITY 4,
  INDEX gemini1536_idx embeddingGemini1536 TYPE vector_similarity('hnsw', 'L2Distance', 1536) GRANULARITY 4,
  INDEX gemini3072_idx embeddingGemini3072 TYPE vector_similarity('hnsw', 'L2Distance', 3072) GRANULARITY 4
) ENGINE = ReplacingMergeTree(updatedAt)
ORDER BY (ns, id)
PRIMARY KEY (ns, id)
SETTINGS index_granularity = 8192;

-- Chunk Embeddings Table: Store vector embeddings per document chunk
-- Note: Separate from graph_embeddings due to ClickHouse limitations
-- Chunks use (ns, id, chunkIndex) primary key vs (ns, id) for whole entities
CREATE TABLE IF NOT EXISTS graph_chunk_embeddings (
  ns String,
  id String,                       -- Parent entity ID
  chunkIndex UInt32,               -- Chunk number (0-based)

  -- Original Models (Legacy)
  embeddingWorkersAI Array(Float32) DEFAULT [],
  workersAIGeneratedAt DateTime64(3) DEFAULT 0,
  embeddingOpenAI Array(Float32) DEFAULT [],
  openAIGeneratedAt DateTime64(3) DEFAULT 0,

  -- EmbeddingGemma (Cloudflare Workers AI) - Matryoshka Representation Learning
  embeddingGemma128 Array(Float32) DEFAULT [],
  gemma128GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemma256 Array(Float32) DEFAULT [],
  gemma256GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemma512 Array(Float32) DEFAULT [],
  gemma512GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemma768 Array(Float32) DEFAULT [],
  gemma768GeneratedAt DateTime64(3) DEFAULT 0,

  -- Gemini (Google Gemini API) - Variable dimensions
  embeddingGemini128 Array(Float32) DEFAULT [],
  gemini128GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemini768 Array(Float32) DEFAULT [],
  gemini768GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemini1536 Array(Float32) DEFAULT [],
  gemini1536GeneratedAt DateTime64(3) DEFAULT 0,
  embeddingGemini3072 Array(Float32) DEFAULT [],
  gemini3072GeneratedAt DateTime64(3) DEFAULT 0,

  -- Metadata
  createdAt DateTime64(3) DEFAULT now64(),
  updatedAt DateTime64(3) DEFAULT now64(),

  -- Hash indexes for fast lookups
  nsHash UInt32 MATERIALIZED xxHash32(ns),
  idHash UInt32 MATERIALIZED xxHash32(id),
  INDEX bf_ns (nsHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX bf_id (idHash) TYPE bloom_filter() GRANULARITY 4,

  -- Vector similarity indexes
  INDEX workersai_idx embeddingWorkersAI TYPE vector_similarity('hnsw', 'L2Distance', 768) GRANULARITY 4,
  INDEX openai_idx embeddingOpenAI TYPE vector_similarity('hnsw', 'L2Distance', 1536) GRANULARITY 4,
  INDEX gemma128_idx embeddingGemma128 TYPE vector_similarity('hnsw', 'L2Distance', 128) GRANULARITY 4,
  INDEX gemma256_idx embeddingGemma256 TYPE vector_similarity('hnsw', 'L2Distance', 256) GRANULARITY 4,
  INDEX gemma512_idx embeddingGemma512 TYPE vector_similarity('hnsw', 'L2Distance', 512) GRANULARITY 4,
  INDEX gemma768_idx embeddingGemma768 TYPE vector_similarity('hnsw', 'L2Distance', 768) GRANULARITY 4,
  INDEX gemini128_idx embeddingGemini128 TYPE vector_similarity('hnsw', 'L2Distance', 128) GRANULARITY 4,
  INDEX gemini768_idx embeddingGemini768 TYPE vector_similarity('hnsw', 'L2Distance', 768) GRANULARITY 4,
  INDEX gemini1536_idx embeddingGemini1536 TYPE vector_similarity('hnsw', 'L2Distance', 1536) GRANULARITY 4,
  INDEX gemini3072_idx embeddingGemini3072 TYPE vector_similarity('hnsw', 'L2Distance', 3072) GRANULARITY 4
) ENGINE = ReplacingMergeTree(updatedAt)
ORDER BY (ns, id, chunkIndex)
PRIMARY KEY (ns, id, chunkIndex)
SETTINGS index_granularity = 8192;

-- Helper View: Join embeddings with things (whole entity only)
CREATE VIEW IF NOT EXISTS v_things_with_embeddings AS
SELECT
  t.*,
  e.embeddingWorkersAI,
  e.workersAIGeneratedAt,
  e.embeddingOpenAI,
  e.openAIGeneratedAt,
  e.embeddingGemma128,
  e.gemma128GeneratedAt,
  e.embeddingGemma256,
  e.gemma256GeneratedAt,
  e.embeddingGemma512,
  e.gemma512GeneratedAt,
  e.embeddingGemma768,
  e.gemma768GeneratedAt,
  e.embeddingGemini128,
  e.gemini128GeneratedAt,
  e.embeddingGemini768,
  e.gemini768GeneratedAt,
  e.embeddingGemini1536,
  e.gemini1536GeneratedAt,
  e.embeddingGemini3072,
  e.gemini3072GeneratedAt
FROM graph_things t
LEFT JOIN graph_embeddings e
  ON t.ns = e.ns
  AND t.id = e.id;

-- Helper View: Join chunks with their embeddings
CREATE VIEW IF NOT EXISTS v_chunks_with_embeddings AS
SELECT
  c.*,
  e.embeddingWorkersAI,
  e.workersAIGeneratedAt,
  e.embeddingOpenAI,
  e.openAIGeneratedAt,
  e.embeddingGemma128,
  e.gemma128GeneratedAt,
  e.embeddingGemma256,
  e.gemma256GeneratedAt,
  e.embeddingGemma512,
  e.gemma512GeneratedAt,
  e.embeddingGemma768,
  e.gemma768GeneratedAt,
  e.embeddingGemini128,
  e.gemini128GeneratedAt,
  e.embeddingGemini768,
  e.gemini768GeneratedAt,
  e.embeddingGemini1536,
  e.gemini1536GeneratedAt,
  e.embeddingGemini3072,
  e.gemini3072GeneratedAt
FROM graph_chunks c
LEFT JOIN graph_chunk_embeddings e
  ON c.ns = e.ns
  AND c.id = e.id
  AND c.chunkIndex = e.chunkIndex;

-- Helper View: Entity chunk summary with all embedding models
CREATE VIEW IF NOT EXISTS v_entity_chunk_stats AS
SELECT
  ns,
  id,
  COUNT(*) AS totalChunks,
  SUM(chunkTokens) AS totalTokens,
  -- Legacy models
  SUM(CASE WHEN e.embeddingWorkersAI IS NOT NULL AND length(e.embeddingWorkersAI) > 0 THEN 1 ELSE 0 END) AS chunksWithWorkersAI,
  SUM(CASE WHEN e.embeddingOpenAI IS NOT NULL AND length(e.embeddingOpenAI) > 0 THEN 1 ELSE 0 END) AS chunksWithOpenAI,
  -- Gemma variants
  SUM(CASE WHEN e.embeddingGemma128 IS NOT NULL AND length(e.embeddingGemma128) > 0 THEN 1 ELSE 0 END) AS chunksWithGemma128,
  SUM(CASE WHEN e.embeddingGemma256 IS NOT NULL AND length(e.embeddingGemma256) > 0 THEN 1 ELSE 0 END) AS chunksWithGemma256,
  SUM(CASE WHEN e.embeddingGemma512 IS NOT NULL AND length(e.embeddingGemma512) > 0 THEN 1 ELSE 0 END) AS chunksWithGemma512,
  SUM(CASE WHEN e.embeddingGemma768 IS NOT NULL AND length(e.embeddingGemma768) > 0 THEN 1 ELSE 0 END) AS chunksWithGemma768,
  -- Gemini variants
  SUM(CASE WHEN e.embeddingGemini128 IS NOT NULL AND length(e.embeddingGemini128) > 0 THEN 1 ELSE 0 END) AS chunksWithGemini128,
  SUM(CASE WHEN e.embeddingGemini768 IS NOT NULL AND length(e.embeddingGemini768) > 0 THEN 1 ELSE 0 END) AS chunksWithGemini768,
  SUM(CASE WHEN e.embeddingGemini1536 IS NOT NULL AND length(e.embeddingGemini1536) > 0 THEN 1 ELSE 0 END) AS chunksWithGemini1536,
  SUM(CASE WHEN e.embeddingGemini3072 IS NOT NULL AND length(e.embeddingGemini3072) > 0 THEN 1 ELSE 0 END) AS chunksWithGemini3072,
  MIN(c.createdAt) AS firstChunkCreated,
  MAX(c.updatedAt) AS lastChunkUpdated
FROM graph_chunks c
LEFT JOIN graph_chunk_embeddings e
  ON c.ns = e.ns
  AND c.id = e.id
  AND c.chunkIndex = e.chunkIndex
GROUP BY ns, id;

-- Model Summary: Count of embeddings by model
CREATE VIEW IF NOT EXISTS v_embedding_model_summary AS
SELECT
  'workersai' AS model,
  '768' AS dimensions,
  COUNT(*) AS entityEmbeddings,
  (SELECT COUNT(*) FROM graph_chunk_embeddings WHERE length(embeddingWorkersAI) > 0) AS chunkEmbeddings
FROM graph_embeddings
WHERE length(embeddingWorkersAI) > 0
UNION ALL
SELECT 'openai', '1536', COUNT(*), (SELECT COUNT(*) FROM graph_chunk_embeddings WHERE length(embeddingOpenAI) > 0)
FROM graph_embeddings WHERE length(embeddingOpenAI) > 0
UNION ALL
SELECT 'gemma', '128', COUNT(*), (SELECT COUNT(*) FROM graph_chunk_embeddings WHERE length(embeddingGemma128) > 0)
FROM graph_embeddings WHERE length(embeddingGemma128) > 0
UNION ALL
SELECT 'gemma', '256', COUNT(*), (SELECT COUNT(*) FROM graph_chunk_embeddings WHERE length(embeddingGemma256) > 0)
FROM graph_embeddings WHERE length(embeddingGemma256) > 0
UNION ALL
SELECT 'gemma', '512', COUNT(*), (SELECT COUNT(*) FROM graph_chunk_embeddings WHERE length(embeddingGemma512) > 0)
FROM graph_embeddings WHERE length(embeddingGemma512) > 0
UNION ALL
SELECT 'gemma', '768', COUNT(*), (SELECT COUNT(*) FROM graph_chunk_embeddings WHERE length(embeddingGemma768) > 0)
FROM graph_embeddings WHERE length(embeddingGemma768) > 0
UNION ALL
SELECT 'gemini', '128', COUNT(*), (SELECT COUNT(*) FROM graph_chunk_embeddings WHERE length(embeddingGemini128) > 0)
FROM graph_embeddings WHERE length(embeddingGemini128) > 0
UNION ALL
SELECT 'gemini', '768', COUNT(*), (SELECT COUNT(*) FROM graph_chunk_embeddings WHERE length(embeddingGemini768) > 0)
FROM graph_embeddings WHERE length(embeddingGemini768) > 0
UNION ALL
SELECT 'gemini', '1536', COUNT(*), (SELECT COUNT(*) FROM graph_chunk_embeddings WHERE length(embeddingGemini1536) > 0)
FROM graph_embeddings WHERE length(embeddingGemini1536) > 0
UNION ALL
SELECT 'gemini', '3072', COUNT(*), (SELECT COUNT(*) FROM graph_chunk_embeddings WHERE length(embeddingGemini3072) > 0)
FROM graph_embeddings WHERE length(embeddingGemini3072) > 0;
