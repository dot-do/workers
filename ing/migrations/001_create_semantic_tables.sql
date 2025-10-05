-- Migration: Create Semantic Triple Tables
-- Date: 2025-10-04
-- Description: Create tables for semantic triple network storage

-- ===== Semantic Triples Table =====

CREATE TABLE IF NOT EXISTS semantic_triples (
  id TEXT PRIMARY KEY,

  -- Core triple (Subject, Predicate, Object)
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,

  -- Context (5W1H) stored as JSON
  context JSONB,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,

  -- Versioning and confidence
  version INTEGER DEFAULT 1,
  confidence NUMERIC(3,2) DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_triples_subject ON semantic_triples(subject) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_triples_predicate ON semantic_triples(predicate) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_triples_object ON semantic_triples(object) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_triples_created_at ON semantic_triples(created_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_triples_created_by ON semantic_triples(created_by) WHERE deleted_at IS NULL;

-- GIN index for JSON context queries
CREATE INDEX IF NOT EXISTS idx_triples_context ON semantic_triples USING gin(context) WHERE deleted_at IS NULL;

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_triples_sp ON semantic_triples(subject, predicate) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_triples_po ON semantic_triples(predicate, object) WHERE deleted_at IS NULL;

-- ===== Triple Index Table (For Fast Graph Traversal) =====

CREATE TABLE IF NOT EXISTS triple_index (
  node TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('subject', 'object', 'predicate')),
  triple_id TEXT NOT NULL REFERENCES semantic_triples(id) ON DELETE CASCADE,

  PRIMARY KEY (node, direction, triple_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_triple_index_node ON triple_index(node);
CREATE INDEX IF NOT EXISTS idx_triple_index_triple ON triple_index(triple_id);

-- ===== Verbs Registry Table =====

CREATE TABLE IF NOT EXISTS verbs (
  id TEXT PRIMARY KEY,
  gerund TEXT NOT NULL UNIQUE,
  base_form TEXT NOT NULL,
  category TEXT,

  -- Source mapping
  gs1_step TEXT,
  onet_task_id TEXT,

  -- Permissions
  required_role TEXT[], -- Array of required roles
  danger_level TEXT DEFAULT 'safe' CHECK (danger_level IN ('safe', 'low', 'medium', 'high', 'critical')),
  requires_approval BOOLEAN DEFAULT false,

  -- Metadata
  description TEXT,
  examples JSONB,
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_verbs_category ON verbs(category);
CREATE INDEX IF NOT EXISTS idx_verbs_danger_level ON verbs(danger_level);
CREATE INDEX IF NOT EXISTS idx_verbs_gs1_step ON verbs(gs1_step);

-- ===== Roles Registry Table =====

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,

  -- Capabilities
  capabilities TEXT[] NOT NULL, -- Array of allowed verbs
  forbidden_verbs TEXT[], -- Array of explicitly forbidden verbs

  -- Hierarchy
  parent_role TEXT REFERENCES roles(id) ON DELETE SET NULL,

  -- O*NET mapping
  onet_code TEXT,

  -- Metadata
  description TEXT,
  metadata JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_roles_parent ON roles(parent_role);
CREATE INDEX IF NOT EXISTS idx_roles_onet ON roles(onet_code);

-- ===== Audit Log Table =====

CREATE TABLE IF NOT EXISTS triple_audit_log (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ DEFAULT NOW(),

  -- Who performed the action
  user_id TEXT NOT NULL,

  -- What action was performed
  action TEXT NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete')),

  -- On which triple
  triple_id TEXT NOT NULL,
  triple_data JSONB, -- Snapshot of triple at time of action

  -- Result
  result TEXT NOT NULL CHECK (result IN ('success', 'denied', 'error')),
  reason TEXT,

  -- Additional metadata
  metadata JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_user ON triple_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON triple_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_triple ON triple_audit_log(triple_id);
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON triple_audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_result ON triple_audit_log(result);

-- ===== Comments =====

COMMENT ON TABLE semantic_triples IS 'Semantic triple storage (Subject, Predicate, Object) with 5W1H context';
COMMENT ON TABLE triple_index IS 'Fast graph traversal index for semantic triples';
COMMENT ON TABLE verbs IS 'Registry of verbs/predicates with permissions and metadata';
COMMENT ON TABLE roles IS 'Registry of roles with capabilities and RBAC';
COMMENT ON TABLE triple_audit_log IS 'Audit trail of all triple operations';

COMMENT ON COLUMN semantic_triples.context IS '5W1H context: temporal, spatial, causal, relational, instrumental';
COMMENT ON COLUMN semantic_triples.confidence IS 'Confidence score for inferred/predicted triples (0-1)';
COMMENT ON COLUMN verbs.danger_level IS 'Risk level: safe, low, medium, high, critical';
COMMENT ON COLUMN roles.capabilities IS 'Array of verbs this role can perform';
COMMENT ON COLUMN roles.forbidden_verbs IS 'Array of verbs explicitly forbidden for this role';
