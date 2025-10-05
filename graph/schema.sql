-- Schema.org URI-based Graph Database Schema for Cloudflare D1
-- 2-table design optimized for graph queries and traversal

-- ============================================================================
-- THINGS TABLE - URI-based entities with Schema.org types
-- ============================================================================

CREATE TABLE IF NOT EXISTS things (
  -- Primary identifier: URI (e.g., https://schema.org/Person/john-doe)
  id TEXT PRIMARY KEY,

  -- Schema.org type (e.g., 'Person', 'Organization', 'Product')
  type TEXT NOT NULL,

  -- All Schema.org properties as JSONB
  properties TEXT NOT NULL DEFAULT '{}', -- D1 stores JSON as TEXT

  -- Source repository (apps, brands, functions, etc.)
  source TEXT,

  -- Namespace for grouping (optional)
  namespace TEXT,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_things_type ON things(type);
CREATE INDEX IF NOT EXISTS idx_things_source ON things(source);
CREATE INDEX IF NOT EXISTS idx_things_namespace ON things(namespace);
CREATE INDEX IF NOT EXISTS idx_things_updated ON things(updated_at);

-- Full-text search index on properties (for name, description, etc.)
-- Note: D1 doesn't support JSON indexing, we'll extract searchable text
CREATE INDEX IF NOT EXISTS idx_things_search ON things(id, type);

-- ============================================================================
-- RELATIONSHIPS TABLE - Subject-Predicate-Object triples
-- ============================================================================

CREATE TABLE IF NOT EXISTS relationships (
  -- Auto-increment ID
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  -- Triple structure
  subject TEXT NOT NULL,    -- URI of source entity
  predicate TEXT NOT NULL,  -- URI of relationship type (Schema.org property)
  object TEXT NOT NULL,     -- URI of target entity

  -- Relationship metadata as JSONB
  properties TEXT NOT NULL DEFAULT '{}', -- Additional metadata

  -- Namespace for grouping (optional)
  namespace TEXT,

  -- Timestamps
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key constraints
  FOREIGN KEY (subject) REFERENCES things(id) ON DELETE CASCADE,
  FOREIGN KEY (object) REFERENCES things(id) ON DELETE CASCADE
);

-- Indexes for graph traversal
-- Forward traversal: find all relationships FROM a thing
CREATE INDEX IF NOT EXISTS idx_rel_subject ON relationships(subject, predicate);

-- Backward traversal: find all relationships TO a thing
CREATE INDEX IF NOT EXISTS idx_rel_object ON relationships(object, predicate);

-- Find all relationships of a specific type
CREATE INDEX IF NOT EXISTS idx_rel_predicate ON relationships(predicate);

-- Composite index for bidirectional queries
CREATE INDEX IF NOT EXISTS idx_rel_subject_object ON relationships(subject, object);

-- Namespace filtering
CREATE INDEX IF NOT EXISTS idx_rel_namespace ON relationships(namespace);

-- ============================================================================
-- TRIGGERS - Auto-update timestamps
-- ============================================================================

-- Update things.updated_at on UPDATE
CREATE TRIGGER IF NOT EXISTS update_things_timestamp
AFTER UPDATE ON things
BEGIN
  UPDATE things SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Update relationships.updated_at on UPDATE
CREATE TRIGGER IF NOT EXISTS update_relationships_timestamp
AFTER UPDATE ON relationships
BEGIN
  UPDATE relationships SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================================================
-- VIEWS - Common graph patterns
-- ============================================================================

-- View: All outgoing relationships with thing details
CREATE VIEW IF NOT EXISTS outgoing_relationships AS
SELECT
  r.id,
  r.subject,
  r.predicate,
  r.object,
  r.properties as rel_properties,
  t.type as object_type,
  t.properties as object_properties,
  r.created_at,
  r.updated_at
FROM relationships r
JOIN things t ON r.object = t.id;

-- View: All incoming relationships with thing details
CREATE VIEW IF NOT EXISTS incoming_relationships AS
SELECT
  r.id,
  r.subject,
  r.predicate,
  r.object,
  r.properties as rel_properties,
  t.type as subject_type,
  t.properties as subject_properties,
  r.created_at,
  r.updated_at
FROM relationships r
JOIN things t ON r.subject = t.id;

-- ============================================================================
-- SAMPLE DATA - Example Schema.org entities
-- ============================================================================

-- Example: Person
INSERT OR IGNORE INTO things (id, type, properties, source, namespace) VALUES (
  'https://schema.org/Person/john-doe',
  'Person',
  json_object(
    'name', 'John Doe',
    'email', 'john@example.com',
    'jobTitle', 'Software Engineer',
    'description', 'Full-stack developer with expertise in TypeScript and Cloudflare Workers'
  ),
  'apps',
  'default'
);

-- Example: Organization
INSERT OR IGNORE INTO things (id, type, properties, source, namespace) VALUES (
  'https://schema.org/Organization/acme-corp',
  'Organization',
  json_object(
    'name', 'ACME Corporation',
    'url', 'https://acme.com',
    'description', 'Leading provider of innovative solutions',
    'foundingDate', '2020-01-01'
  ),
  'brands',
  'default'
);

-- Example: Product
INSERT OR IGNORE INTO things (id, type, properties, source, namespace) VALUES (
  'https://schema.org/Product/task-manager',
  'Product',
  json_object(
    'name', 'Task Manager Pro',
    'description', 'Professional task management application',
    'brand', 'ACME Corporation',
    'category', 'Software'
  ),
  'apps',
  'default'
);

-- Example relationships
INSERT OR IGNORE INTO relationships (subject, predicate, object, properties, namespace) VALUES
  -- John works at ACME
  (
    'https://schema.org/Person/john-doe',
    'https://schema.org/worksFor',
    'https://schema.org/Organization/acme-corp',
    '{}',
    'default'
  ),
  -- ACME makes Task Manager
  (
    'https://schema.org/Organization/acme-corp',
    'https://schema.org/makesOffer',
    'https://schema.org/Product/task-manager',
    json_object('since', '2020-01-01'),
    'default'
  ),
  -- John authored Task Manager
  (
    'https://schema.org/Person/john-doe',
    'https://schema.org/author',
    'https://schema.org/Product/task-manager',
    json_object('role', 'lead developer'),
    'default'
  );

-- ============================================================================
-- PERFORMANCE NOTES
-- ============================================================================

/*
QUERY OPTIMIZATION:

1. Graph Traversal (1-hop):
   - Subject → Object: Use idx_rel_subject
   - Object → Subject: Use idx_rel_object

2. Graph Traversal (n-hop):
   - Use recursive CTEs (WITH RECURSIVE)
   - Limit depth to prevent infinite loops

3. Subgraph Extraction:
   - Combine forward + backward traversal
   - Use UNION for bidirectional queries

4. Type Filtering:
   - Use idx_things_type
   - Combine with graph traversal for typed queries

5. Full-text Search:
   - Extract JSON fields for searching
   - Use LIKE with wildcards (limited in D1)
   - Consider external search index for production

LIMITATIONS:

- D1 doesn't support native JSON indexing
- Full-text search is basic (LIKE-based)
- Vector similarity requires external service
- Complex graph algorithms need application-level logic

RECOMMENDATIONS:

- Keep graphs shallow (2-3 hops max)
- Use pagination for large result sets
- Cache frequently accessed subgraphs
- Consider R2 for backup/export
- Use ClickHouse for analytics queries
*/
