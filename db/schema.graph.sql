-- ============================================================================
-- ClickHouse Graph Database Schema (Optimized for MDXLD)
-- ============================================================================
--
-- This schema adds lightweight graph-optimized tables alongside the existing
-- full MDX content system. The dual-purpose design provides:
--
-- 1. Fast graph queries (backlinks, relationships, traversal)
-- 2. Full content system (versions, compilation artifacts)
--
-- Architecture:
--   events (S3Queue from R2)
--     ├─> graph_things (materialized view - lightweight)
--     ├─> graph_relationships (materialized view - optimized for inbound queries)
--     ├─> versions (existing - full history)
--     └─> data (existing - current state)
--
-- ============================================================================

SET enable_json_type = 1;
SET allow_experimental_vector_similarity_index = 1;

-- ============================================================================
-- GRAPH THINGS TABLE (Optimized for Performance)
-- ============================================================================
--
-- Simple, lightweight table for graph entity queries
-- Matches proven D1 schema design (88-122ms query latency)
--
CREATE TABLE IF NOT EXISTS graph_things (
  -- Core identity (matches MDXLD format)
  ns String,                              -- Namespace (e.g., "onet.org", "github.com")
  id String,                              -- ID within namespace (e.g., "/occupations/15-1252.00")

  -- Entity metadata
  type String,                            -- Entity type (e.g., "Occupation", "Skill")
  data JSON,                              -- JSON data blob (Schema.org properties)
  content String DEFAULT '',              -- Optional markdown/text content

  -- Timestamps
  createdAt DateTime64(3) DEFAULT now64(), -- Creation timestamp
  updatedAt DateTime64(3) DEFAULT now64(), -- Last update timestamp

  -- Computed fields for performance
  nsHash UInt32 MATERIALIZED xxHash32(ns),
  idHash UInt32 MATERIALIZED xxHash32(id),
  typeHash UInt32 MATERIALIZED xxHash32(type),

  -- Indexes for fast lookups
  INDEX bf_ns (nsHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX bf_id (idHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX bf_type (typeHash) TYPE bloom_filter() GRANULARITY 4,
  INDEX tk_content (content) TYPE tokenbf_v1(4096, 3, 0) GRANULARITY 8
)
ENGINE = ReplacingMergeTree(updatedAt)
ORDER BY (ns, id)
PRIMARY KEY (ns, id)
SETTINGS index_granularity = 8192;

-- ============================================================================
-- GRAPH RELATIONSHIPS TABLE (Optimized for Backlink Queries)
-- ============================================================================
--
-- Optimized for the PRIMARY USE CASE: inbound relationship queries
-- "What links TO this thing?" (backlinks)
--
-- Sort order: (toNs, toId, predicate) - O(1) lookups for inbound queries
--
CREATE TABLE IF NOT EXISTS graph_relationships (
  -- Source entity (what points FROM)
  fromNs String,                          -- Source namespace
  fromId String,                          -- Source ID
  fromType String,                        -- Source type (for filtering)

  -- Relationship type
  predicate String,                       -- Relationship name (e.g., "requires_skill", "part_of")

  -- Target entity (what points TO)
  toNs String,                            -- Target namespace
  toId String,                            -- Target ID
  toType String,                          -- Target type (for filtering)

  -- Metadata
  data JSON DEFAULT '{}',                 -- Optional relationship metadata
  createdAt DateTime64(3) DEFAULT now64(), -- Creation timestamp

  -- Computed fields for performance
  fromNsHash UInt32 MATERIALIZED xxHash32(fromNs),
  fromIdHash UInt32 MATERIALIZED xxHash32(fromId),
  toNsHash UInt32 MATERIALIZED xxHash32(toNs),
  toIdHash UInt32 MATERIALIZED xxHash32(toId),
  predicateHash UInt32 MATERIALIZED xxHash32(predicate),

  -- Indexes optimized for graph queries
  INDEX bf_to_ns (toNsHash) TYPE bloom_filter() GRANULARITY 4,      -- Inbound query primary
  INDEX bf_to_id (toIdHash) TYPE bloom_filter() GRANULARITY 4,      -- Inbound query primary
  INDEX bf_from_ns (fromNsHash) TYPE bloom_filter() GRANULARITY 4,  -- Outbound queries
  INDEX bf_from_id (fromIdHash) TYPE bloom_filter() GRANULARITY 4,  -- Outbound queries
  INDEX bf_predicate (predicateHash) TYPE bloom_filter() GRANULARITY 4
)
ENGINE = ReplacingMergeTree(createdAt)
ORDER BY (toNs, toId, predicate, fromNs, fromId)  -- Optimized for inbound queries!
PRIMARY KEY (toNs, toId, predicate)
SETTINGS index_granularity = 8192;

-- ============================================================================
-- MATERIALIZED VIEW: Events → Graph Things
-- ============================================================================
--
-- Streams Thing entities from events table into graph_things
-- Filters for events where type is a Thing type (not a relationship)
--
CREATE MATERIALIZED VIEW IF NOT EXISTS graph_things_stream TO graph_things
AS
SELECT
  ns,
  id,
  type,
  data,
  content,
  ts AS createdAt,
  ts AS updatedAt
FROM events
WHERE type != 'Relationship'  -- Exclude relationship events
  AND type IS NOT NULL;

-- ============================================================================
-- MATERIALIZED VIEW: Events → Graph Relationships
-- ============================================================================
--
-- Streams Relationship entities from events table into graph_relationships
-- Extracts from/to/predicate from the event data
--
CREATE MATERIALIZED VIEW IF NOT EXISTS graph_relationships_stream TO graph_relationships
AS
SELECT
  JSONExtractString(data, 'fromNs') AS fromNs,
  JSONExtractString(data, 'fromId') AS fromId,
  JSONExtractString(data, 'fromType') AS fromType,
  JSONExtractString(data, 'predicate') AS predicate,
  JSONExtractString(data, 'toNs') AS toNs,
  JSONExtractString(data, 'toId') AS toId,
  JSONExtractString(data, 'toType') AS toType,
  data,
  ts AS createdAt
FROM events
WHERE type = 'Relationship'
  AND JSONHas(data, 'fromNs')  -- Validate required fields
  AND JSONHas(data, 'toNs');

-- ============================================================================
-- HELPER VIEWS: Common Graph Query Patterns
-- ============================================================================

-- Get inbound relationships (what links TO this thing)
CREATE VIEW IF NOT EXISTS v_inbound_relationships AS
SELECT
  fromNs,
  fromId,
  fromType,
  predicate,
  toNs,
  toId,
  toType,
  data,
  createdAt
FROM graph_relationships
ORDER BY toNs, toId, predicate, createdAt DESC;

-- Get outbound relationships (what this thing links TO)
CREATE VIEW IF NOT EXISTS v_outbound_relationships AS
SELECT
  fromNs,
  fromId,
  fromType,
  predicate,
  toNs,
  toId,
  toType,
  data,
  createdAt
FROM graph_relationships
ORDER BY fromNs, fromId, predicate, createdAt DESC;

-- Get relationship counts by predicate
CREATE VIEW IF NOT EXISTS v_predicate_stats AS
SELECT
  predicate,
  COUNT(*) AS count,
  COUNT(DISTINCT fromNs || '/' || fromId) AS unique_sources,
  COUNT(DISTINCT toNs || '/' || toId) AS unique_targets,
  MIN(createdAt) AS first_seen,
  MAX(createdAt) AS last_seen
FROM graph_relationships
GROUP BY predicate
ORDER BY count DESC;

-- Get thing counts by type
CREATE VIEW IF NOT EXISTS v_type_stats AS
SELECT
  type,
  COUNT(*) AS count,
  COUNT(DISTINCT ns) AS unique_namespaces,
  MIN(createdAt) AS first_seen,
  MAX(createdAt) AS last_seen
FROM graph_things
GROUP BY type
ORDER BY count DESC;

-- ============================================================================
-- SAMPLE QUERIES
-- ============================================================================
--
-- -- Inbound relationships (PRIMARY USE CASE - backlinks)
-- SELECT fromNs, fromId, fromType, predicate, data
-- FROM graph_relationships
-- WHERE toNs = 'onet.org'
--   AND toId = '/skills/2.A.1.a'
--   AND predicate = 'requires_skill'
-- ORDER BY createdAt DESC
-- LIMIT 100;
--
-- -- Outbound relationships (what this thing links to)
-- SELECT toNs, toId, toType, predicate, data
-- FROM graph_relationships
-- WHERE fromNs = 'onet.org'
--   AND fromId = '/occupations/15-1252.00'
-- ORDER BY createdAt DESC
-- LIMIT 100;
--
-- -- Get thing by ID
-- SELECT *
-- FROM graph_things
-- WHERE ns = 'onet.org'
--   AND id = '/occupations/15-1252.00';
--
-- -- List things by type
-- SELECT ns, id, data
-- FROM graph_things
-- WHERE type = 'Occupation'
-- ORDER BY createdAt DESC
-- LIMIT 100;
--
-- ============================================================================
