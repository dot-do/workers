/**
 * R2 SQL Schema for MDX Asset Metadata
 *
 * Tables:
 * - mdx_files: Source MDX file metadata
 * - mdx_assets: Compiled artifacts (JSON, AST, ESM, HTML)
 * - mdx_dependencies: Dependency graph
 * - mdx_versions: Version history
 * - mdx_deployments: Deployment tracking
 */

import { z } from 'zod'

// ============================================================================
// Asset Types
// ============================================================================

export const AssetType = z.enum(['json', 'ast', 'esm', 'html', 'source'])

export type AssetType = z.infer<typeof AssetType>

// ============================================================================
// Schemas
// ============================================================================

export const MdxFileSchema = z.object({
  id: z.string().uuid(),
  repo: z.string(), // e.g., 'apps', 'brands', 'functions'
  path: z.string(), // e.g., 'apps/crm/index.mdx'
  hash: z.string(), // SHA-256 of source content
  size: z.number(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(), // Frontmatter, etc.
})

export const MdxAssetSchema = z.object({
  id: z.string().uuid(),
  file_id: z.string().uuid(),
  type: AssetType,
  hash: z.string(), // SHA-256 of artifact content
  size: z.number(),
  r2_key: z.string(), // Content-addressed: {type}/{hash}
  created_at: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(), // Compiler version, options, etc.
})

export const MdxDependencySchema = z.object({
  id: z.string().uuid(),
  source_file_id: z.string().uuid(),
  target_file_id: z.string().uuid(),
  type: z.enum(['import', 'component', 'link', 'image']),
  created_at: z.string().datetime(),
})

export const MdxVersionSchema = z.object({
  id: z.string().uuid(),
  file_id: z.string().uuid(),
  version: z.number().int().positive(),
  hash: z.string(),
  tag: z.string().optional(), // e.g., 'v1.0.0', 'production', 'staging'
  author: z.string().optional(),
  message: z.string().optional(),
  created_at: z.string().datetime(),
})

export const MdxDeploymentSchema = z.object({
  id: z.string().uuid(),
  environment: z.enum(['development', 'staging', 'production']),
  version_ids: z.array(z.string().uuid()),
  status: z.enum(['pending', 'deploying', 'deployed', 'failed']),
  deployed_by: z.string().optional(),
  deployed_at: z.string().datetime(),
  metadata: z.record(z.unknown()).optional(),
})

export type MdxFile = z.infer<typeof MdxFileSchema>
export type MdxAsset = z.infer<typeof MdxAssetSchema>
export type MdxDependency = z.infer<typeof MdxDependencySchema>
export type MdxVersion = z.infer<typeof MdxVersionSchema>
export type MdxDeployment = z.infer<typeof MdxDeploymentSchema>

// ============================================================================
// R2 SQL Table Definitions
// ============================================================================

export const R2_SQL_SCHEMA = `
-- MDX Files (source metadata)
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

CREATE INDEX idx_mdx_files_repo ON mdx_files(repo);
CREATE INDEX idx_mdx_files_path ON mdx_files(path);
CREATE INDEX idx_mdx_files_hash ON mdx_files(hash);
CREATE UNIQUE INDEX idx_mdx_files_repo_path ON mdx_files(repo, path);

-- MDX Assets (compiled artifacts)
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

CREATE INDEX idx_mdx_assets_file_id ON mdx_assets(file_id);
CREATE INDEX idx_mdx_assets_type ON mdx_assets(type);
CREATE INDEX idx_mdx_assets_hash ON mdx_assets(hash);
CREATE UNIQUE INDEX idx_mdx_assets_file_type ON mdx_assets(file_id, type);

-- MDX Dependencies (graph)
CREATE TABLE IF NOT EXISTS mdx_dependencies (
  id TEXT PRIMARY KEY,
  source_file_id TEXT NOT NULL,
  target_file_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK(type IN ('import', 'component', 'link', 'image')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (source_file_id) REFERENCES mdx_files(id) ON DELETE CASCADE,
  FOREIGN KEY (target_file_id) REFERENCES mdx_files(id) ON DELETE CASCADE
);

CREATE INDEX idx_mdx_dependencies_source ON mdx_dependencies(source_file_id);
CREATE INDEX idx_mdx_dependencies_target ON mdx_dependencies(target_file_id);
CREATE UNIQUE INDEX idx_mdx_dependencies_unique ON mdx_dependencies(source_file_id, target_file_id, type);

-- MDX Versions (history)
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

CREATE INDEX idx_mdx_versions_file_id ON mdx_versions(file_id);
CREATE INDEX idx_mdx_versions_tag ON mdx_versions(tag);
CREATE UNIQUE INDEX idx_mdx_versions_file_version ON mdx_versions(file_id, version);

-- MDX Deployments (tracking)
CREATE TABLE IF NOT EXISTS mdx_deployments (
  id TEXT PRIMARY KEY,
  environment TEXT NOT NULL CHECK(environment IN ('development', 'staging', 'production')),
  version_ids TEXT NOT NULL, -- JSON array
  status TEXT NOT NULL CHECK(status IN ('pending', 'deploying', 'deployed', 'failed')),
  deployed_by TEXT,
  deployed_at TEXT NOT NULL,
  metadata TEXT -- JSON
);

CREATE INDEX idx_mdx_deployments_environment ON mdx_deployments(environment);
CREATE INDEX idx_mdx_deployments_status ON mdx_deployments(status);
CREATE INDEX idx_mdx_deployments_deployed_at ON mdx_deployments(deployed_at);

-- Views for common queries

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
`

// ============================================================================
// Content-Addressed Storage Keys
// ============================================================================

export function generateR2Key(type: AssetType, hash: string): string {
  return `${type}/${hash.substring(0, 2)}/${hash.substring(2, 4)}/${hash}`
}

export async function hashContent(content: string | ArrayBuffer): Promise<string> {
  const encoder = new TextEncoder()
  const data = typeof content === 'string' ? encoder.encode(content) : content
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
