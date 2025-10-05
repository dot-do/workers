-- Database Schema for MCP Dynamic Worker Registry
-- Run with: wrangler d1 execute worker-registry-db --file=./schema.sql

-- Worker configurations table
CREATE TABLE IF NOT EXISTS worker_configs (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL,
  organizationId TEXT,
  name TEXT NOT NULL,
  description TEXT,
  mainModule TEXT NOT NULL,
  modules TEXT NOT NULL, -- JSON string: { "index.js": "code...", "utils.js": "..." }
  env TEXT, -- JSON string: user-defined environment variables
  bindings TEXT, -- JSON string: service bindings configuration
  status TEXT NOT NULL DEFAULT 'active', -- active, paused, error
  version INTEGER NOT NULL DEFAULT 1,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL,
  lastLoadedAt TEXT -- Last time worker was instantiated
);

-- Index for finding user's workers
CREATE INDEX IF NOT EXISTS idx_worker_configs_userId ON worker_configs(userId);
CREATE INDEX IF NOT EXISTS idx_worker_configs_organizationId ON worker_configs(organizationId);
CREATE INDEX IF NOT EXISTS idx_worker_configs_status ON worker_configs(status);

-- Worker execution logs
CREATE TABLE IF NOT EXISTS execution_logs (
  id TEXT PRIMARY KEY,
  workerId TEXT NOT NULL,
  userId TEXT NOT NULL,
  method TEXT NOT NULL, -- HTTP method or RPC method name
  path TEXT, -- Request path
  statusCode INTEGER,
  executionTime INTEGER, -- milliseconds
  memoryUsed INTEGER, -- bytes
  cpuTime INTEGER, -- milliseconds
  error TEXT,
  createdAt TEXT NOT NULL,
  FOREIGN KEY (workerId) REFERENCES worker_configs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_execution_logs_workerId ON execution_logs(workerId);
CREATE INDEX IF NOT EXISTS idx_execution_logs_userId ON execution_logs(userId);
CREATE INDEX IF NOT EXISTS idx_execution_logs_createdAt ON execution_logs(createdAt);
CREATE INDEX IF NOT EXISTS idx_execution_logs_error ON execution_logs(error);

-- Worker versions (for rollback capability)
CREATE TABLE IF NOT EXISTS worker_versions (
  id TEXT PRIMARY KEY,
  workerId TEXT NOT NULL,
  version INTEGER NOT NULL,
  mainModule TEXT NOT NULL,
  modules TEXT NOT NULL,
  env TEXT,
  bindings TEXT,
  createdAt TEXT NOT NULL,
  createdBy TEXT NOT NULL,
  description TEXT,
  FOREIGN KEY (workerId) REFERENCES worker_configs(id) ON DELETE CASCADE,
  UNIQUE(workerId, version)
);

CREATE INDEX IF NOT EXISTS idx_worker_versions_workerId ON worker_versions(workerId);
CREATE INDEX IF NOT EXISTS idx_worker_versions_version ON worker_versions(workerId, version);

-- Worker hot-reload tracking
CREATE TABLE IF NOT EXISTS worker_reload_log (
  id TEXT PRIMARY KEY,
  workerId TEXT NOT NULL,
  oldVersion INTEGER,
  newVersion INTEGER NOT NULL,
  reloadType TEXT NOT NULL, -- 'hot', 'cold', 'forced'
  success INTEGER NOT NULL DEFAULT 1, -- 1 = success, 0 = failed
  error TEXT,
  executionTime INTEGER, -- milliseconds to reload
  createdAt TEXT NOT NULL,
  FOREIGN KEY (workerId) REFERENCES worker_configs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_worker_reload_log_workerId ON worker_reload_log(workerId);
CREATE INDEX IF NOT EXISTS idx_worker_reload_log_createdAt ON worker_reload_log(createdAt);
CREATE INDEX IF NOT EXISTS idx_worker_reload_log_success ON worker_reload_log(success);

-- Worker metrics (aggregated statistics)
CREATE TABLE IF NOT EXISTS worker_metrics (
  id TEXT PRIMARY KEY,
  workerId TEXT NOT NULL,
  date TEXT NOT NULL, -- YYYY-MM-DD
  hour INTEGER NOT NULL, -- 0-23
  totalRequests INTEGER NOT NULL DEFAULT 0,
  successfulRequests INTEGER NOT NULL DEFAULT 0,
  failedRequests INTEGER NOT NULL DEFAULT 0,
  avgExecutionTime INTEGER, -- milliseconds
  maxExecutionTime INTEGER, -- milliseconds
  minExecutionTime INTEGER, -- milliseconds
  totalCpuTime INTEGER, -- milliseconds
  totalMemoryUsed INTEGER, -- bytes
  FOREIGN KEY (workerId) REFERENCES worker_configs(id) ON DELETE CASCADE,
  UNIQUE(workerId, date, hour)
);

CREATE INDEX IF NOT EXISTS idx_worker_metrics_workerId ON worker_metrics(workerId);
CREATE INDEX IF NOT EXISTS idx_worker_metrics_date ON worker_metrics(workerId, date);
