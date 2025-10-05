-- Feature Flags Schema for D1
-- OpenFeature-compliant flag storage

-- Flags table
CREATE TABLE IF NOT EXISTS flags (
  key TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK(type IN ('boolean', 'string', 'number', 'object')),
  defaultValue TEXT NOT NULL, -- JSON-encoded
  enabled BOOLEAN NOT NULL DEFAULT 1,
  description TEXT,
  tags TEXT, -- JSON array
  targeting TEXT, -- JSON array of targeting rules
  variants TEXT, -- JSON array of variants
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Targeting rules table (denormalized for performance)
CREATE TABLE IF NOT EXISTS targeting_rules (
  id TEXT PRIMARY KEY,
  flagKey TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT 1,
  priority INTEGER NOT NULL DEFAULT 0,
  conditions TEXT NOT NULL, -- JSON array of conditions
  variant TEXT,
  value TEXT, -- JSON-encoded
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (flagKey) REFERENCES flags(key) ON DELETE CASCADE
);

-- Variants table (for A/B testing)
CREATE TABLE IF NOT EXISTS variants (
  id TEXT PRIMARY KEY,
  flagKey TEXT NOT NULL,
  name TEXT NOT NULL,
  value TEXT NOT NULL, -- JSON-encoded
  weight INTEGER NOT NULL DEFAULT 0, -- 0-100
  description TEXT,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (flagKey) REFERENCES flags(key) ON DELETE CASCADE,
  UNIQUE(flagKey, name)
);

-- Flag evaluation events (for analytics)
CREATE TABLE IF NOT EXISTS flag_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flagKey TEXT NOT NULL,
  targetingKey TEXT,
  value TEXT, -- JSON-encoded
  variant TEXT,
  reason TEXT,
  evaluationTimeMs REAL,
  cacheHit BOOLEAN,
  error TEXT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (flagKey) REFERENCES flags(key) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_flags_enabled ON flags(enabled);
CREATE INDEX IF NOT EXISTS idx_flags_type ON flags(type);
CREATE INDEX IF NOT EXISTS idx_flags_updated ON flags(updatedAt);

CREATE INDEX IF NOT EXISTS idx_targeting_rules_flag ON targeting_rules(flagKey);
CREATE INDEX IF NOT EXISTS idx_targeting_rules_priority ON targeting_rules(priority);

CREATE INDEX IF NOT EXISTS idx_variants_flag ON variants(flagKey);

CREATE INDEX IF NOT EXISTS idx_events_flag ON flag_events(flagKey);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON flag_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_events_targeting ON flag_events(targetingKey);

-- Example seed data
INSERT OR IGNORE INTO flags (key, type, defaultValue, enabled, description, tags) VALUES
  ('welcome-message', 'string', '"Welcome to our app!"', 1, 'Welcome message shown to users', '["onboarding", "ui"]'),
  ('enable-new-dashboard', 'boolean', 'false', 1, 'Enable new dashboard UI', '["feature", "ui"]'),
  ('max-items-per-page', 'number', '20', 1, 'Maximum items to show per page', '["performance", "ui"]'),
  ('theme-config', 'object', '{"mode":"light","primaryColor":"blue"}', 1, 'UI theme configuration', '["ui", "theme"]');

-- Example targeting rule with variants
INSERT OR IGNORE INTO variants (id, flagKey, name, value, weight, description) VALUES
  ('v1', 'enable-new-dashboard', 'control', 'false', 50, 'Control group - old dashboard'),
  ('v2', 'enable-new-dashboard', 'treatment', 'true', 50, 'Treatment group - new dashboard');
