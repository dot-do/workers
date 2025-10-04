/**
 * ONET Importer Worker
 *
 * Imports ONET occupation data from MDX files into graph database
 * Uses mdxdb parser + graph API for structured import
 *
 * Exposes via:
 * - RPC (WorkerEntrypoint for service-to-service calls)
 * - REST (Hono HTTP API)
 * - MCP (Model Context Protocol for AI agents)
 */

import { Hono } from 'hono'
import { WorkerEntrypoint } from 'cloudflare:workers'
import { bulkCreateThings, bulkCreateRelationships } from '@do/graph-api'
import { parseOnetFiles } from './parser.js'
import type { ImportStats } from './types.js'
import { mcpTools } from './mcp.js'

/**
 * Environment bindings
 */
interface Env {
  GRAPH: Service // Graph service binding
  DB: D1Database // Database for graph storage
}

/**
 * ONET Importer RPC Service
 */
export class OnetImporter extends WorkerEntrypoint<Env> {
  /**
   * Import ONET data from MDX files
   *
   * @param mdxFiles - Array of parsed MDX files
   * @returns Import statistics
   */
  async importFromMdx(mdxFiles: any[]): Promise<ImportStats> {
    const startTime = Date.now()

    // Parse MDX files into Things & Relationships
    const { things, relationships, errors } = parseOnetFiles(mdxFiles)

    // Bulk create Things
    const thingsResult = await bulkCreateThings(this.env.DB, things)

    // Bulk create Relationships
    const relsResult = await bulkCreateRelationships(this.env.DB, relationships)

    const duration = Date.now() - startTime

    // Count by type
    const stats: ImportStats = {
      occupations: things.filter((t) => t.type === 'occupation').length,
      skills: things.filter((t) => t.type === 'skill').length,
      knowledge: things.filter((t) => t.type === 'knowledge').length,
      abilities: things.filter((t) => t.type === 'ability').length,
      technologies: things.filter((t) => t.type === 'technology').length,
      relationships: relsResult.successful,
      errors: errors.length + thingsResult.failed + relsResult.failed,
      duration_ms: duration,
    }

    return stats
  }

  /**
   * Import ONET data from R2 bucket
   *
   * @param bucket - R2 bucket name
   * @param prefix - Optional prefix for MDX files
   * @returns Import statistics
   */
  async importFromR2(bucket: string, prefix?: string): Promise<ImportStats> {
    // TODO: Implement R2 fetching
    throw new Error('Not implemented yet')
  }

  /**
   * Import ONET data from URL
   *
   * @param url - URL to ONET data archive
   * @returns Import statistics
   */
  async importFromUrl(url: string): Promise<ImportStats> {
    // TODO: Implement URL fetching
    throw new Error('Not implemented yet')
  }

  /**
   * Get import status
   *
   * @returns Current database statistics
   */
  async getStatus(): Promise<{
    occupations: number
    skills: number
    knowledge: number
    abilities: number
    technologies: number
    relationships: number
  }> {
    // Query database for counts
    const result = await this.env.DB.prepare(
      `
      SELECT
        COUNT(CASE WHEN type = 'occupation' THEN 1 END) as occupations,
        COUNT(CASE WHEN type = 'skill' THEN 1 END) as skills,
        COUNT(CASE WHEN type = 'knowledge' THEN 1 END) as knowledge,
        COUNT(CASE WHEN type = 'ability' THEN 1 END) as abilities,
        COUNT(CASE WHEN type = 'technology' THEN 1 END) as technologies
      FROM things
      WHERE ns = 'onet'
    `
    ).first()

    const relsResult = await this.env.DB.prepare(
      `
      SELECT COUNT(*) as count
      FROM relationships
      WHERE from_ns = 'onet' OR to_ns = 'onet'
    `
    ).first()

    return {
      occupations: (result?.occupations as number) || 0,
      skills: (result?.skills as number) || 0,
      knowledge: (result?.knowledge as number) || 0,
      abilities: (result?.abilities as number) || 0,
      technologies: (result?.technologies as number) || 0,
      relationships: (relsResult?.count as number) || 0,
    }
  }

  /**
   * Clear all ONET data
   *
   * @returns Number of items deleted
   */
  async clear(): Promise<{ deleted: number }> {
    // Delete relationships first (foreign key constraints)
    const relsResult = await this.env.DB.prepare(
      `
      DELETE FROM relationships
      WHERE from_ns = 'onet' OR to_ns = 'onet'
    `
    ).run()

    // Delete things
    const thingsResult = await this.env.DB.prepare(
      `
      DELETE FROM things
      WHERE ns = 'onet'
    `
    ).run()

    return {
      deleted: (relsResult.meta?.changes || 0) + (thingsResult.meta?.changes || 0),
    }
  }
}

/**
 * HTTP API
 */
const app = new Hono<{ Bindings: Env }>()

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'onet-importer' })
})

// Import from MDX (POST with JSON body)
app.post('/import/mdx', async (c) => {
  const mdxFiles = await c.req.json()
  const importer = new OnetImporter(c.env as any, 'default')
  const stats = await importer.importFromMdx(mdxFiles)
  return c.json(stats)
})

// Import from R2
app.post('/import/r2', async (c) => {
  const { bucket, prefix } = await c.req.json<{ bucket: string; prefix?: string }>()
  const importer = new OnetImporter(c.env as any, 'default')
  const stats = await importer.importFromR2(bucket, prefix)
  return c.json(stats)
})

// Import from URL
app.post('/import/url', async (c) => {
  const { url } = await c.req.json<{ url: string }>()
  const importer = new OnetImporter(c.env as any, 'default')
  const stats = await importer.importFromUrl(url)
  return c.json(stats)
})

// Get status
app.get('/status', async (c) => {
  const importer = new OnetImporter(c.env as any, 'default')
  const status = await importer.getStatus()
  return c.json(status)
})

// Clear data
app.delete('/clear', async (c) => {
  const importer = new OnetImporter(c.env as any, 'default')
  const result = await importer.clear()
  return c.json(result)
})

// MCP endpoint (JSON-RPC 2.0)
app.post('/mcp', async (c) => {
  const request = await c.req.json()

  // Basic JSON-RPC 2.0 handling
  if (request.method === 'tools/list') {
    return c.json({
      jsonrpc: '2.0',
      id: request.id,
      result: { tools: mcpTools },
    })
  }

  if (request.method === 'tools/call') {
    const { name, arguments: args } = request.params
    const importer = new OnetImporter(c.env as any, 'default')

    try {
      let result
      switch (name) {
        case 'import_onet_mdx':
          result = await importer.importFromMdx(args.mdxFiles)
          break
        case 'import_onet_r2':
          result = await importer.importFromR2(args.bucket, args.prefix)
          break
        case 'import_onet_url':
          result = await importer.importFromUrl(args.url)
          break
        case 'get_onet_status':
          result = await importer.getStatus()
          break
        case 'clear_onet_data':
          result = await importer.clear()
          break
        default:
          throw new Error(`Unknown tool: ${name}`)
      }

      return c.json({
        jsonrpc: '2.0',
        id: request.id,
        result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
      })
    } catch (error) {
      return c.json({
        jsonrpc: '2.0',
        id: request.id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }

  return c.json({
    jsonrpc: '2.0',
    id: request.id,
    error: { code: -32601, message: 'Method not found' },
  })
})

// Export HTTP handler
export default {
  fetch: app.fetch,
}
