-- MDX Assets Platform - R2 SQL Schema
-- Initialization script for R2 SQL database

-- ============================================================================
-- MDX Files (source metadata)
-- ============================================================================
CREATE TABLE IF NOT EXISTS mdx_files (
  id TEXT PRIMARY KEY,
  repo TEXT NOT NULL,
  path TEXT NOT NULL,
  hash TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  metadata TEXT -- JSON
);

CREATE INDEX IF NOT EXISTS idx_mdx_files_repo ON mdx_files(repo);
CREATE INDEX IF NOT EXISTS idx_mdx_files_path ON mdx_files(path);
CREATE INDEX IF NOT EXISTS idx_mdx_files_hash ON mdx_files(hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mdx_files_repo_path ON mdx_files(repo, path);

-- ============================================================================
-- MDX Assets (compiled artifacts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS mdx_assets (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('json', 'ast', 'esm', 'html', 'source')),
  hash TEXT NOT NULL,
  size INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  metadata TEXT, -- JSON
  FOREIGN KEY (file_id) REFERENCES mdx_files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mdx_assets_file_id ON mdx_assets(file_id);
CREATE INDEX IF NOT EXISTS idx_mdx_assets_type ON mdx_assets(type);
CREATE INDEX IF NOT EXISTS idx_mdx_assets_hash ON mdx_assets(hash);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mdx_assets_file_type ON mdx_assets(file_id, type);

-- ============================================================================
-- MDX Dependencies (graph)
-- ============================================================================
CREATE TABLE IF NOT EXISTS mdx_dependencies (
  id TEXT PRIMARY KEY,
  source_file_id TEXT NOT NULL,
  target_file_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('import', 'component', 'link', 'image')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (source_file_id) REFERENCES mdx_files(id) ON DELETE CASCADE,
  FOREIGN KEY (target_file_id) REFERENCES mdx_files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mdx_dependencies_source ON mdx_dependencies(source_file_id);
CREATE INDEX IF NOT EXISTS idx_mdx_dependencies_target ON mdx_dependencies(target_file_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mdx_dependencies_unique ON mdx_dependencies(source_file_id, target_file_id, type);

-- ============================================================================
-- MDX Versions (history)
-- ============================================================================
CREATE TABLE IF NOT EXISTS mdx_versions (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  hash TEXT NOT NULL,
  tag TEXT,
  author TEXT,
  message TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (file_id) REFERENCES mdx_files(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mdx_versions_file_id ON mdx_versions(file_id);
CREATE INDEX IF NOT EXISTS idx_mdx_versions_tag ON mdx_versions(tag);
CREATE UNIQUE INDEX IF NOT EXISTS idx_mdx_versions_file_version ON mdx_versions(file_id, version);

-- ============================================================================
-- MDX Deployments (tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS mdx_deployments (
  id TEXT PRIMARY KEY,
  environment TEXT NOT NULL CHECK(environment IN ('development', 'staging', 'production')),
  version_ids TEXT NOT NULL, -- JSON array
  status TEXT NOT NULL CHECK(status IN ('pending', 'deploying', 'deployed', 'failed')),
  deployed_by TEXT,
  deployed_at TEXT NOT NULL,
  metadata TEXT -- JSON
);

CREATE INDEX IF NOT EXISTS idx_mdx_deployments_environment ON mdx_deployments(environment);
CREATE INDEX IF NOT EXISTS idx_mdx_deployments_status ON mdx_deployments(status);
CREATE INDEX IF NOT EXISTS idx_mdx_deployments_deployed_at ON mdx_deployments(deployed_at);

-- ============================================================================
-- Views for common queries
-- ============================================================================

-- Latest version of each file
CREATE VIEW IF NOT EXISTS mdx_files_latest AS
SELECT
  f.*,
  v.version as latest_version,
  v.hash as latest_hash,
  v.tag as latest_tag
FROM mdx_files f
LEFT JOIN mdx_versions v ON v.file_id = f.id
WHERE v.version = (
  SELECT MAX(version) FROM mdx_versions WHERE file_id = f.id
);

-- Asset statistics per file
CREATE VIEW IF NOT EXISTS mdx_asset_stats AS
SELECT
  file_id,
  COUNT(*) as asset_count,
  SUM(size) as total_size,
  GROUP_CONCAT(type) as asset_types
FROM mdx_assets
GROUP BY file_id;

-- Dependency counts
CREATE VIEW IF NOT EXISTS mdx_dependency_stats AS
SELECT
  source_file_id,
  COUNT(*) as dependency_count,
  GROUP_CONCAT(type) as dependency_types
FROM mdx_dependencies
GROUP BY source_file_id;
