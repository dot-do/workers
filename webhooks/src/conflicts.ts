/**
 * Conflict resolution utilities
 * Handles conflicts between database and GitHub versions
 */

import type { Env } from './types'
import { Octokit } from '@octokit/rest'

/**
 * Conflict resolution strategies
 */
export type ConflictStrategy = 'manual' | 'theirs' | 'ours' | 'merge'

/**
 * Conflict information
 */
export interface Conflict {
  id: string
  ns: string
  entityId: string
  repository: string
  path: string
  branch: string
  databaseSha: string // SHA we expected
  githubSha: string // SHA currently on GitHub
  databaseContent: string
  githubContent: string
  createdAt: number
  status: 'pending' | 'resolved' | 'failed'
  strategy?: ConflictStrategy
  resolvedAt?: number
  error?: string
}

/**
 * Detect if there's a conflict between database and GitHub
 * Returns conflict object if conflict exists, null otherwise
 */
export async function detectConflict(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  branch: string,
  expectedSha: string | undefined,
  env: Env
): Promise<Conflict | null> {
  // No expected SHA means no previous sync, so no conflict
  if (!expectedSha) {
    return null
  }

  try {
    // Get current file SHA from GitHub
    const { data: fileData } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    })

    if (!('sha' in fileData)) {
      return null // Not a file
    }

    const currentSha = fileData.sha

    // If SHAs match, no conflict
    if (currentSha === expectedSha) {
      return null
    }

    // SHAs differ - there's a conflict!
    console.warn(`[CONFLICT] Detected conflict for ${owner}/${repo}:${path}`)
    console.warn(`[CONFLICT] Expected SHA: ${expectedSha}, Current SHA: ${currentSha}`)

    // Get entity from database
    const result = await env.DB.query({
      sql: `SELECT * FROM things WHERE github_url = ? AND github_path = ?`,
      params: [`https://github.com/${owner}/${repo}`, path],
    })

    if (!result.results || result.results.length === 0) {
      console.warn(`[CONFLICT] Entity not found in database for ${path}`)
      return null
    }

    const entity = result.results[0] as any
    const data = typeof entity.data === 'string' ? JSON.parse(entity.data) : entity.data

    // Reconstruct database content
    const databaseContent = reconstructMDX(data, entity.content, entity)

    // Get GitHub content (decode base64)
    const githubContent =
      'content' in fileData ? Buffer.from(fileData.content, 'base64').toString('utf-8') : ''

    // Create conflict record
    const conflict: Conflict = {
      id: `conflict_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      ns: entity.ns,
      entityId: entity.id,
      repository: `${owner}/${repo}`,
      path,
      branch,
      databaseSha: expectedSha,
      githubSha: currentSha,
      databaseContent,
      githubContent,
      createdAt: Date.now(),
      status: 'pending',
    }

    // Store conflict in database
    await storeConflict(conflict, env)

    return conflict
  } catch (error: any) {
    if (error.status === 404) {
      // File doesn't exist on GitHub, not a conflict
      return null
    }
    throw error
  }
}

/**
 * Resolve a conflict using the specified strategy
 */
export async function resolveConflict(
  conflictId: string,
  strategy: ConflictStrategy,
  env: Env
): Promise<{ success: boolean; message: string; result?: any }> {
  // Get conflict from database
  const result = await env.DB.query({
    sql: `SELECT * FROM sync_conflicts WHERE id = ?`,
    params: [conflictId],
  })

  if (!result.results || result.results.length === 0) {
    return { success: false, message: 'Conflict not found' }
  }

  const conflict = result.results[0] as any

  if (conflict.status === 'resolved') {
    return { success: false, message: 'Conflict already resolved' }
  }

  try {
    let resolution

    switch (strategy) {
      case 'ours':
        resolution = await resolveWithOurs(conflict, env)
        break

      case 'theirs':
        resolution = await resolveWithTheirs(conflict, env)
        break

      case 'merge':
        resolution = await resolveWithMerge(conflict, env)
        break

      case 'manual':
        // Manual resolution requires external intervention
        return {
          success: false,
          message: 'Manual resolution not yet implemented',
        }

      default:
        return { success: false, message: `Unknown strategy: ${strategy}` }
    }

    // Mark conflict as resolved
    await env.DB.query({
      sql: `UPDATE sync_conflicts SET status = 'resolved', strategy = ?, resolved_at = ?, error = NULL WHERE id = ?`,
      params: [strategy, Date.now(), conflictId],
    })

    return {
      success: true,
      message: `Conflict resolved using '${strategy}' strategy`,
      result: resolution,
    }
  } catch (error) {
    // Mark conflict as failed
    await env.DB.query({
      sql: `UPDATE sync_conflicts SET status = 'failed', strategy = ?, error = ? WHERE id = ?`,
      params: [strategy, error instanceof Error ? error.message : 'Unknown error', conflictId],
    })

    return {
      success: false,
      message: `Failed to resolve conflict: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

/**
 * Resolve with "ours" strategy - use database version
 */
async function resolveWithOurs(conflict: any, env: Env): Promise<any> {
  console.log(`[CONFLICT] Resolving with 'ours' (database version)`)

  const octokit = new Octokit({ auth: env.GITHUB_TOKEN })
  const [owner, repo] = conflict.repository.split('/')

  // Encode database content to base64
  const contentBase64 = btoa(unescape(encodeURIComponent(conflict.database_content)))

  // Force update to GitHub with database version
  const { data: commit } = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: conflict.path,
    message: `chore: Resolve conflict - use database version

Conflict ID: ${conflict.id}
Strategy: ours (database version)

🤖 Automated conflict resolution via database.do`,
    content: contentBase64,
    branch: conflict.branch,
    sha: conflict.github_sha, // Use current GitHub SHA
  })

  // Update database with new SHA
  await env.DB.query({
    sql: `UPDATE things SET github_sha = ?, sync_status = 'synced', last_synced_at = ? WHERE ns = ? AND id = ?`,
    params: [commit.commit.sha, Date.now(), conflict.ns, conflict.entity_id],
  })

  return { commit: commit.commit.sha, strategy: 'ours' }
}

/**
 * Resolve with "theirs" strategy - use GitHub version
 */
async function resolveWithTheirs(conflict: any, env: Env): Promise<any> {
  console.log(`[CONFLICT] Resolving with 'theirs' (GitHub version)`)

  // Parse GitHub content
  const frontmatterMatch = conflict.github_content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)

  if (!frontmatterMatch) {
    throw new Error('Invalid MDX format in GitHub version')
  }

  const [, frontmatterYaml, content] = frontmatterMatch

  // Simple YAML parsing (reuse from mdx.ts)
  const frontmatter = parseYAML(frontmatterYaml)

  // Extract $id and $type
  const dollarId = frontmatter.$id || frontmatter.id
  const type = frontmatter.$type || frontmatter.type

  // Remove $id and $type from data
  const data = { ...frontmatter }
  delete data.$id
  delete data.id
  delete data.$type
  delete data.type

  // Update database with GitHub version
  await env.DB.query({
    sql: `UPDATE things SET type = ?, data = ?, content = ?, github_sha = ?, sync_status = 'synced', last_synced_at = ? WHERE ns = ? AND id = ?`,
    params: [type, JSON.stringify(data), content.trim(), conflict.github_sha, Date.now(), conflict.ns, conflict.entity_id],
  })

  return { strategy: 'theirs', sha: conflict.github_sha }
}

/**
 * Resolve with "merge" strategy - attempt three-way merge
 */
async function resolveWithMerge(conflict: any, env: Env): Promise<any> {
  console.log(`[CONFLICT] Resolving with 'merge' strategy`)

  // For now, implement simple merge by preferring database content fields
  // In a production system, you'd use a proper three-way merge algorithm

  // Parse both versions
  const dbMatch = conflict.database_content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  const ghMatch = conflict.github_content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)

  if (!dbMatch || !ghMatch) {
    throw new Error('Invalid MDX format in one or both versions')
  }

  const [, dbFrontmatter, dbContent] = dbMatch
  const [, ghFrontmatter, ghContent] = ghMatch

  const dbData = parseYAML(dbFrontmatter)
  const ghData = parseYAML(ghFrontmatter)

  // Simple merge: combine fields from both, preferring database
  const mergedData = { ...ghData, ...dbData }

  // Use database content if they differ
  const mergedContent = dbContent.trim()

  // Reconstruct merged MDX
  const mergedMDX = reconstructMDX(mergedData, mergedContent, {
    ns: conflict.ns,
    id: conflict.entity_id,
    type: dbData.$type || ghData.$type,
  })

  // Push merged version to GitHub
  const octokit = new Octokit({ auth: env.GITHUB_TOKEN })
  const [owner, repo] = conflict.repository.split('/')
  const contentBase64 = btoa(unescape(encodeURIComponent(mergedMDX)))

  const { data: commit } = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path: conflict.path,
    message: `chore: Resolve conflict - merge versions

Conflict ID: ${conflict.id}
Strategy: merge (combined database + GitHub)

🤖 Automated conflict resolution via database.do`,
    content: contentBase64,
    branch: conflict.branch,
    sha: conflict.github_sha,
  })

  // Update database with merged version
  const data = { ...mergedData }
  delete data.$id
  delete data.id
  delete data.$type
  delete data.type

  await env.DB.query({
    sql: `UPDATE things SET type = ?, data = ?, content = ?, github_sha = ?, sync_status = 'synced', last_synced_at = ? WHERE ns = ? AND id = ?`,
    params: [
      dbData.$type || ghData.$type,
      JSON.stringify(data),
      mergedContent,
      commit.commit.sha,
      Date.now(),
      conflict.ns,
      conflict.entity_id,
    ],
  })

  return { commit: commit.commit.sha, strategy: 'merge' }
}

/**
 * Store conflict in database
 */
async function storeConflict(conflict: Conflict, env: Env): Promise<void> {
  await env.DB.query({
    sql: `INSERT INTO sync_conflicts (
      id, ns, entity_id, repository, path, branch,
      database_sha, github_sha, database_content, github_content,
      created_at, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    params: [
      conflict.id,
      conflict.ns,
      conflict.entityId,
      conflict.repository,
      conflict.path,
      conflict.branch,
      conflict.databaseSha,
      conflict.githubSha,
      conflict.databaseContent,
      conflict.githubContent,
      conflict.createdAt,
      conflict.status,
    ],
  })

  console.log(`[CONFLICT] Stored conflict: ${conflict.id}`)
}

/**
 * Reconstruct MDX from data and content
 */
function reconstructMDX(data: Record<string, any>, content: string, entity?: any): string {
  const frontmatterFields: Record<string, any> = {}

  if (entity) {
    frontmatterFields.$id = `${entity.ns}/${entity.id}`
    frontmatterFields.$type = entity.type
  }

  for (const [key, value] of Object.entries(data)) {
    if (key !== 'content' && key !== '$id' && key !== '$type') {
      frontmatterFields[key] = value
    }
  }

  const yamlLines = Object.entries(frontmatterFields).map(([key, value]) => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nested = Object.entries(value)
        .map(([k, v]) => `  ${k}: ${formatYAMLValue(v)}`)
        .join('\n')
      return `${key}:\n${nested}`
    }
    return `${key}: ${formatYAMLValue(value)}`
  })

  return `---\n${yamlLines.join('\n')}\n---\n\n${content}`
}

/**
 * Format YAML value
 */
function formatYAMLValue(value: any): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') {
    if (value.includes(':') || value.includes('#') || value.includes('\n')) {
      return `"${value.replace(/"/g, '\\"')}"`
    }
    return value
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => formatYAMLValue(v)).join(', ')}]`
  }
  return String(value)
}

/**
 * Simple YAML parser
 */
function parseYAML(yaml: string): Record<string, any> {
  const result: Record<string, any> = {}
  const lines = yaml.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = trimmed.match(/^(\w+):\s*(.*)$/)
    if (match) {
      const [, key, value] = match
      result[key] = parseValue(value)
    }
  }

  return result
}

/**
 * Parse YAML value
 */
function parseValue(value: string): any {
  value = value.trim()
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  if (!isNaN(Number(value))) return Number(value)
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }
  return value
}
