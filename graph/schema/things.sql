-- Things Table
-- Stores current state of all entities in the graph
--
-- Design:
-- - Primary key: (ns, id) for direct lookups
-- - Flexible data/meta as JSON
-- - Multiple content representations

CREATE TABLE things (
  -- Identity
  ulid VARCHAR PRIMARY KEY,
  ns VARCHAR NOT NULL,              -- namespace (e.g., "onet.org", "en.wikipedia.org")
  id VARCHAR NOT NULL,              -- entity identifier (e.g., "15-1252.00", "TypeScript")
  type VARCHAR NOT NULL,            -- entity type (e.g., "occupation", "skill", "page")

  -- Flexible structured data
  data TEXT,                        -- JSON string

  -- Content representations
  code TEXT,                        -- extracted code/ESM
  content TEXT,                     -- main content (markdown, text)

  -- Metadata
  meta TEXT,                        -- JSON string with timestamps, hash, etc.

  -- Composite unique constraint
  UNIQUE(ns, id)
);

-- Primary index for direct ns+id lookups
CREATE INDEX idx_things_ns_id ON things(ns, id);

-- Index for type queries
CREATE INDEX idx_things_type ON things(type);

-- Full-text search index (if supported)
CREATE INDEX idx_things_content ON things(content);

-- Example queries:
--
-- 1. Direct Lookup (MOST COMMON):
--    SELECT * FROM things WHERE ns = 'onet.org' AND id = '15-1252.00'
--
-- 2. List by Namespace + Type:
--    SELECT * FROM things WHERE ns = 'onet.org' AND type = 'occupation' LIMIT 100
--
-- 3. Search Content:
--    SELECT * FROM things WHERE content LIKE '%software developer%' LIMIT 100
