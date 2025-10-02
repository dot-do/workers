-- Migration: Create executions table
-- Created: 2025-10-02

CREATE TABLE IF NOT EXISTS executions (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  language TEXT NOT NULL,
  context TEXT,
  config TEXT,
  success INTEGER NOT NULL DEFAULT 0,
  result TEXT,
  error TEXT,
  logs TEXT,
  duration INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  user_id TEXT,
  ip_address TEXT
);

-- Index for timestamp queries
CREATE INDEX IF NOT EXISTS idx_executions_created_at ON executions(created_at DESC);

-- Index for user queries
CREATE INDEX IF NOT EXISTS idx_executions_user_id ON executions(user_id);

-- Index for language queries
CREATE INDEX IF NOT EXISTS idx_executions_language ON executions(language);

-- Index for success/failure queries
CREATE INDEX IF NOT EXISTS idx_executions_success ON executions(success);
