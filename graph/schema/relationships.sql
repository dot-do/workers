-- Relationships Table
--
-- Generic storage for all relationships between things
-- Optimized for inbound queries (what requires this skill?)

CREATE TABLE IF NOT EXISTS relationships (
  ulid TEXT PRIMARY KEY,
  fromNs TEXT NOT NULL,
  fromId TEXT NOT NULL,
  fromType TEXT NOT NULL,
  predicate TEXT NOT NULL,
  toNs TEXT NOT NULL,
  toId TEXT NOT NULL,
  toType TEXT NOT NULL,
  data TEXT,
  createdAt TEXT NOT NULL,
  UNIQUE(fromNs, fromId, predicate, toNs, toId)
);

-- Indexes optimized for inbound relationship queries
-- PRIMARY USE CASE: "What requires this skill?" (toNs, toId lookup)
CREATE INDEX IF NOT EXISTS idx_relationships_inbound ON relationships(toNs, toId, predicate);
CREATE INDEX IF NOT EXISTS idx_relationships_outbound ON relationships(fromNs, fromId, predicate);
CREATE INDEX IF NOT EXISTS idx_relationships_predicate ON relationships(predicate);
