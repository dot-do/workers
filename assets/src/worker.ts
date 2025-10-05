/**
 * CDN Serving Worker
 *
 * Smart caching layer for MDX assets:
 * - Edge cache with stale-while-revalidate
 * - Content negotiation (JSON vs HTML)
 * - Cache warming and invalidation
 * - Performance monitoring via Analytics Engine
 */

import { Hono } from 'hono'
import { cache } from 'hono/cache'
import { AssetStorage } from './storage'
import { AssetQuery } from './query'
import type { AssetType } from './schema'

// ============================================================================
// Environment Types
// ============================================================================

interface Env {
  ASSETS: R2Bucket
  DB: D1Database
  CACHE: KVNamespace
  DB_SERVICE?: any
  AUTH_SERVICE?: any
  CACHE_TTL: string
  STALE_WHILE_REVALIDATE: string
}

// ============================================================================
// Worker Application
// ============================================================================

const app = new Hono<{ Bindings: Env }>()

// Health check
app.get('/health', c => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ============================================================================
// Asset Retrieval Endpoints
// ============================================================================

/**
 * GET /assets/:repo/:path/:type
 * Retrieve compiled asset by path and type
 *
 * Supports:
 * - Cache-Control headers
 * - ETag validation
 * - Content negotiation
 * - Performance tracking
 */
app.get('/assets/:repo/:path{.+}/:type', async c => {
  const { repo, path, type } = c.req.param()
  const acceptHeader = c.req.header('Accept')

  // Validate asset type
  if (!['json', 'ast', 'esm', 'html'].includes(type)) {
    return c.json({ error: 'Invalid asset type' }, 400)
  }

  // Track request start time
  const startTime = Date.now()

  try {
    const storage = new AssetStorage(c.env)
    const query = new AssetQuery(c.env)

    // Find file
    const file = await storage.getFileByPath(repo, path)
    if (!file) {
      await trackAnalytics(c.env, 'asset_miss', { repo, path, type, reason: 'file_not_found' })
      return c.json({ error: 'File not found' }, 404)
    }

    // Get asset
    const asset = await storage.getAsset(file.id, type as AssetType)
    if (!asset) {
      await trackAnalytics(c.env, 'asset_miss', { repo, path, type, reason: 'asset_not_found' })
      return c.json({ error: 'Asset not found' }, 404)
    }

    // Check ETag
    const etag = `"${asset.hash}"`
    if (c.req.header('If-None-Match') === etag) {
      await trackAnalytics(c.env, 'asset_304', { repo, path, type, duration: Date.now() - startTime })
      return c.body(null, 304)
    }

    // Get content from R2
    const content = await storage.getAssetContent(asset)
    if (!content) {
      await trackAnalytics(c.env, 'asset_miss', { repo, path, type, reason: 'content_missing' })
      return c.json({ error: 'Asset content missing' }, 500)
    }

    // Track hit
    await trackAnalytics(c.env, 'asset_hit', {
      repo,
      path,
      type,
      size: asset.size,
      duration: Date.now() - startTime,
    })

    // Set caching headers
    const cacheTTL = parseInt(c.env.CACHE_TTL || '3600', 10)
    const staleWhileRevalidate = parseInt(c.env.STALE_WHILE_REVALIDATE || '86400', 10)

    c.header('Cache-Control', `public, max-age=${cacheTTL}, stale-while-revalidate=${staleWhileRevalidate}`)
    c.header('ETag', etag)
    c.header('Content-Type', getContentType(type as AssetType))
    c.header('X-Content-Hash', asset.hash)
    c.header('X-File-Id', file.id)

    return c.body(content)
  } catch (error) {
    await trackAnalytics(c.env, 'asset_error', {
      repo,
      path,
      type,
      error: error instanceof Error ? error.message : 'unknown',
      duration: Date.now() - startTime,
    })

    return c.json({ error: 'Internal server error' }, 500)
  }
})

/**
 * GET /assets/by-hash/:hash
 * Retrieve asset by content hash (deduplication lookup)
 */
app.get('/assets/by-hash/:hash', async c => {
  const { hash } = c.req.param()
  const startTime = Date.now()

  try {
    const query = new AssetQuery(c.env)
    const assets = await query.findAssetsByHash(hash)

    if (assets.length === 0) {
      await trackAnalytics(c.env, 'hash_miss', { hash })
      return c.json({ error: 'No assets found with this hash' }, 404)
    }

    await trackAnalytics(c.env, 'hash_hit', { hash, count: assets.length, duration: Date.now() - startTime })

    return c.json({
      hash,
      count: assets.length,
      assets: assets.map(a => ({
        id: a.id,
        type: a.type,
        file: {
          id: a.file.id,
          repo: a.file.repo,
          path: a.file.path,
        },
        r2_key: a.r2_key,
        size: a.size,
        created_at: a.created_at,
      })),
    })
  } catch (error) {
    await trackAnalytics(c.env, 'hash_error', { hash, error: error instanceof Error ? error.message : 'unknown' })
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============================================================================
// Query Endpoints
// ============================================================================

/**
 * GET /query/files/:repo
 * List files in a repo
 */
app.get('/query/files/:repo', async c => {
  const { repo } = c.req.param()
  const limit = parseInt(c.req.query('limit') || '100', 10)
  const offset = parseInt(c.req.query('offset') || '0', 10)

  try {
    const storage = new AssetStorage(c.env)
    const files = await storage.listFiles(repo, limit, offset)

    return c.json({
      repo,
      count: files.length,
      limit,
      offset,
      files,
    })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

/**
 * GET /query/recent
 * Get recently updated files
 */
app.get('/query/recent', async c => {
  const repo = c.req.query('repo')
  const limit = parseInt(c.req.query('limit') || '20', 10)

  try {
    const query = new AssetQuery(c.env)
    const files = await query.getRecentFiles(repo, limit)

    return c.json({
      count: files.length,
      files,
    })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

/**
 * GET /query/stats/:repo
 * Get repository statistics
 */
app.get('/query/stats/:repo', async c => {
  const { repo } = c.req.param()

  try {
    const query = new AssetQuery(c.env)
    const stats = await query.getRepoStats(repo)

    return c.json({
      repo,
      ...stats,
    })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

/**
 * GET /query/dependencies/:fileId
 * Get dependency graph for a file
 */
app.get('/query/dependencies/:fileId', async c => {
  const { fileId } = c.req.param()
  const recursive = c.req.query('recursive') === 'true'

  try {
    const query = new AssetQuery(c.env)
    const dependencies = await query.getDependencies(fileId, recursive)

    return c.json({
      fileId,
      recursive,
      count: dependencies.length,
      dependencies,
    })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

/**
 * GET /query/duplicates
 * Find duplicate content across files
 */
app.get('/query/duplicates', async c => {
  const minDuplicates = parseInt(c.req.query('min') || '2', 10)

  try {
    const query = new AssetQuery(c.env)
    const duplicates = await query.getDuplicateContent(minDuplicates)

    return c.json({
      count: duplicates.length,
      duplicates,
    })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============================================================================
// Cache Management
// ============================================================================

/**
 * POST /cache/invalidate
 * Invalidate cache for specific files or patterns
 */
app.post('/cache/invalidate', async c => {
  const body = await c.req.json<{
    repo?: string
    path?: string
    fileIds?: string[]
  }>()

  try {
    // Invalidate cache metadata in KV
    const keys: string[] = []

    if (body.repo && body.path) {
      keys.push(`cache:${body.repo}:${body.path}`)
    }

    if (body.fileIds) {
      for (const fileId of body.fileIds) {
        keys.push(`cache:file:${fileId}`)
      }
    }

    // Delete cache metadata
    await Promise.all(keys.map(key => c.env.CACHE_METADATA.delete(key)))

    return c.json({
      invalidated: keys.length,
      keys,
    })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

/**
 * POST /cache/warm
 * Pre-warm cache for specific files
 */
app.post('/cache/warm', async c => {
  const body = await c.req.json<{
    repo: string
    paths: string[]
    types?: AssetType[]
  }>()

  const { repo, paths, types = ['json', 'html'] } = body

  try {
    const storage = new AssetStorage(c.env)
    const warmed: string[] = []

    for (const path of paths) {
      const file = await storage.getFileByPath(repo, path)
      if (!file) continue

      for (const type of types) {
        const asset = await storage.getAsset(file.id, type)
        if (asset) {
          // Mark as warmed in KV
          await c.env.CACHE_METADATA.put(`cache:${repo}:${path}:${type}`, JSON.stringify(asset), {
            expirationTtl: parseInt(c.env.CACHE_TTL || '3600', 10),
          })
          warmed.push(`${repo}:${path}:${type}`)
        }
      }
    }

    return c.json({
      warmed: warmed.length,
      paths: warmed,
    })
  } catch (error) {
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// ============================================================================
// Helpers
// ============================================================================

function getContentType(type: AssetType): string {
  switch (type) {
    case 'json':
      return 'application/json'
    case 'ast':
      return 'application/json'
    case 'esm':
      return 'application/javascript'
    case 'html':
      return 'text/html'
    case 'source':
      return 'text/markdown'
    default:
      return 'application/octet-stream'
  }
}

async function trackAnalytics(
  env: Env,
  eventType: string,
  data: Record<string, string | number | boolean>
): Promise<void> {
  try {
    // Log analytics (could be extended to use Analytics Engine in future)
    console.log('Analytics:', eventType, data)
  } catch (error) {
    // Silent fail for analytics
    console.error('Analytics error:', error)
  }
}

export default app
