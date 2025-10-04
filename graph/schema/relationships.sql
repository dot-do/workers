-- Relationships Table
-- Stores graph edges between things
--
-- Design:
-- - Primary sort: (to_ns, to_id) for efficient inbound lookups
-- - Reason: Outbound relationships already in Thing.data
-- - Most common query: "What points TO this thing?" (inbound)
-- - Secondary indexes for FROM and predicate queries

CREATE TABLE relationships (
  -- Identity
  ulid VARCHAR PRIMARY KEY,

  -- Source (FROM)
  from_ns VARCHAR NOT NULL,
  from_id VARCHAR NOT NULL,
  from_type VARCHAR,                -- optional, for context

  -- Relationship type
  predicate VARCHAR NOT NULL,       -- e.g., "requires_skill", "part_of"
  reverse VARCHAR,                  -- e.g., "required_by", "contains"

  -- Target (TO) - PRIMARY SORT KEY
  to_ns VARCHAR NOT NULL,
  to_id VARCHAR NOT NULL,

  -- Relationship metadata
  data TEXT,                        -- JSON string
  content TEXT,                     -- optional description

  -- Metadata
  meta TEXT                         -- JSON string with timestamps, strength, etc.
);

-- PRIMARY index: Inbound lookups (what points TO this thing)
-- This is the MOST COMMON query pattern
CREATE INDEX idx_relationships_inbound ON relationships(to_ns, to_id, predicate);

-- Secondary index: Outbound lookups (what this thing points TO)
CREATE INDEX idx_relationships_outbound ON relationships(from_ns, from_id, predicate);

-- Index for predicate queries
CREATE INDEX idx_relationships_predicate ON relationships(predicate);

-- Example queries:
--
-- 1. Inbound Relationships (MOST COMMON, index-optimized):
--    SELECT * FROM relationships
--    WHERE to_ns = 'onet.org' AND to_id = '2.B.4.a'  -- Programming skill
--    AND predicate = 'requires_skill'
--    ORDER BY JSON_EXTRACT(meta, '$.strength') DESC
--
-- 2. Outbound Relationships:
--    SELECT * FROM relationships
--    WHERE from_ns = 'onet.org' AND from_id = '15-1252.00'  -- Software Developer
--    AND predicate = 'requires_skill'
--
-- 3. Find all occupations requiring a specific skill with high strength:
--    SELECT r.*, t.data as occupation_data
--    FROM relationships r
--    JOIN things t ON t.ns = r.from_ns AND t.id = r.from_id
--    WHERE r.to_ns = 'onet.org'
--      AND r.to_id = '2.B.4.a'  -- Programming skill
--      AND r.predicate = 'requires_skill'
--      AND JSON_EXTRACT(r.meta, '$.strength') >= 4.0
--    ORDER BY JSON_EXTRACT(r.meta, '$.strength') DESC
