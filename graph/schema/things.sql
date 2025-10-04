-- Things Table
--
-- Generic storage for all entities: occupations, skills, knowledge, abilities, etc.
-- Uses ULID for primary key and (ns, id) for logical identity

CREATE TABLE IF NOT EXISTS things (
  ulid TEXT PRIMARY KEY,
  ns TEXT NOT NULL,
  id TEXT NOT NULL,
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  content TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  UNIQUE(ns, id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_things_ns_id ON things(ns, id);
CREATE INDEX IF NOT EXISTS idx_things_type ON things(type);
CREATE INDEX IF NOT EXISTS idx_things_content ON things(content);
