/**
 * Sources Worker - Data Source Browser & Import Trigger API
 *
 * Provides HATEOAS REST API for:
 * - Browsing imported data sources (MCP Registry, Public APIs, etc.)
 * - Browsing resources by source and type
 * - Triggering manual data imports
 * - Monitoring import status
 *
 * Interfaces:
 * - HTTP: Hono routes with full HATEOAS navigation
 * - RPC: WorkerEntrypoint methods for service-to-service calls
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { wrapEntity, wrapCollection, wrapError, type HateoasOptions } from './hateoas'

// ============================================================================
// Types
// ============================================================================

interface Env {
  DB_SERVICE: any
  LOAD_SERVICE: any
  SCHEDULE_SERVICE: any
}

interface Source {
  id: string
  name: string
  description: string
  type: string
  endpoint: string
  updateFrequency: string
  lastImported?: string
  status: 'active' | 'pending' | 'error'
  stats?: {
    totalResources: number
    lastImportDuration?: number
    lastError?: string
  }
}

// ============================================================================
// Data Sources Registry
// ============================================================================

export const SOURCES: Record<string, Source> = {
  'mcp-registry': {
    id: 'mcp-registry',
    name: 'Model Context Protocol Registry',
    description: 'Official registry of MCP servers from Anthropic',
    type: 'API',
    endpoint: 'https://registry.modelcontextprotocol.io/api',
    updateFrequency: 'daily',
    status: 'active',
  },
  'public-apis': {
    id: 'public-apis',
    name: 'Public APIs Directory',
    description: 'Community-maintained directory of 1400+ free public APIs',
    type: 'API',
    endpoint: 'https://api.publicapis.org/entries',
    updateFrequency: 'daily',
    status: 'active',
  },
  'rapidapi': {
    id: 'rapidapi',
    name: 'RapidAPI Hub',
    description: 'Marketplace with 40,000+ APIs',
    type: 'Marketplace',
    endpoint: 'https://rapidapi.com/hub',
    updateFrequency: 'weekly',
    status: 'pending',
  },
  'publicapis-io': {
    id: 'publicapis-io',
    name: 'PublicAPIs.io',
    description: 'Searchable directory of 1000+ curated APIs',
    type: 'Directory',
    endpoint: 'https://publicapis.io',
    updateFrequency: 'daily',
    status: 'active',
  },
  'openrouter': {
    id: 'openrouter',
    name: 'OpenRouter Models',
    description: 'AI model directory from OpenRouter',
    type: 'API',
    endpoint: 'https://openrouter.ai/api/frontend/models',
    updateFrequency: 'daily',
    status: 'active',
  },
}

// ============================================================================
// RPC INTERFACE - For service-to-service communication
// ============================================================================

export class SourcesService extends WorkerEntrypoint<Env> {
  /**
   * Get all data sources
   */
  async listSources() {
    return Object.values(SOURCES)
  }

  /**
   * Get a specific source by ID
   */
  async getSource(sourceId: string) {
    return SOURCES[sourceId] || null
  }

  /**
   * Trigger import for a source
   */
  async triggerImport(sourceId: string) {
    const source = SOURCES[sourceId]
    if (!source) {
      throw new Error(`Source not found: ${sourceId}`)
    }

    // Trigger appropriate import task
    switch (sourceId) {
      case 'mcp-registry':
        return await this.env.SCHEDULE_SERVICE.runTaskNow('import-mcp-servers')
      case 'public-apis':
      case 'publicapis-io':
        return await this.env.SCHEDULE_SERVICE.runTaskNow('import-public-apis')
      case 'openrouter':
        return await this.env.LOAD_SERVICE.models()
      default:
        throw new Error(`Import not implemented for source: ${sourceId}`)
    }
  }

  /**
   * Get resources from a source
   */
  async getSourceResources(sourceId: string, options?: { type?: string; limit?: number; page?: number }) {
    const { type, limit = 20, page = 1 } = options || {}

    // Map source to namespace
    const nsMap: Record<string, string> = {
      'mcp-registry': 'mcp',
      'public-apis': 'api',
      'publicapis-io': 'api',
      'rapidapi': 'api',
      'openrouter': 'models.do',
    }

    const ns = nsMap[sourceId]
    if (!ns) {
      throw new Error(`Unknown source: ${sourceId}`)
    }

    // Query database
    const where: any = { ns }
    if (type) where.type = type

    const results = await this.env.DB_SERVICE.query({
      table: 'things',
      where,
      limit,
      offset: (page - 1) * limit,
    })

    return results
  }

  /**
   * Get import status for a source
   */
  async getImportStatus(sourceId: string) {
    // Get recent task executions
    const taskNames = {
      'mcp-registry': 'import-mcp-servers',
      'public-apis': 'import-public-apis',
      'publicapis-io': 'import-public-apis',
    }

    const taskName = taskNames[sourceId as keyof typeof taskNames]
    if (!taskName) {
      return null
    }

    const history = await this.env.SCHEDULE_SERVICE.getTaskHistory(taskName, 5)
    return history
  }
}

// ============================================================================
// HTTP API - Hono routes with HATEOAS
// ============================================================================

const app = new Hono<{ Bindings: Env }>()

// CORS middleware
app.use('*', cors())

// ============================================================================
// Root & Info Endpoints
// ============================================================================

/**
 * GET / - API root with HATEOAS navigation
 */
app.get('/', async c => {
  const baseUrl = new URL(c.req.url).origin

  return c.json({
    '@context': 'https://schema.org',
    '@type': 'WebAPI',
    '@id': baseUrl,
    name: 'Sources API',
    description: 'Browse and manage data source imports',
    version: '1.0.0',
    _links: {
      self: { href: baseUrl },
      sources: { href: `${baseUrl}/sources`, title: 'List all data sources' },
      mcp: { href: `${baseUrl}/mcp`, title: 'Browse MCP servers' },
      apis: { href: `${baseUrl}/apis`, title: 'Browse public APIs' },
      models: { href: `${baseUrl}/models`, title: 'Browse AI models' },
      imports: { href: `${baseUrl}/imports`, title: 'Import management' },
      health: { href: `${baseUrl}/health` },
    },
  })
})

/**
 * GET /health - Health check
 */
app.get('/health', async c => {
  return c.json({ status: 'healthy', timestamp: new Date().toISOString() })
})

// ============================================================================
// Sources Endpoints
// ============================================================================

/**
 * GET /sources - List all data sources
 */
app.get('/sources', async c => {
  const baseUrl = new URL(c.req.url).origin
  const sources = Object.values(SOURCES)

  // Enhance with stats from database
  const enhancedSources = await Promise.all(
    sources.map(async source => {
      try {
        // Get resource count from database
        const nsMap: Record<string, string> = {
          'mcp-registry': 'mcp',
          'public-apis': 'api',
          'publicapis-io': 'api',
          'rapidapi': 'api',
          'openrouter': 'models.do',
        }

        const ns = nsMap[source.id]
        if (ns) {
          const stats = await c.env.DB_SERVICE.count({
            table: 'things',
            where: { ns },
          })

          source.stats = {
            totalResources: stats || 0,
          }
        }
      } catch (error) {
        console.error(`Error fetching stats for ${source.id}:`, error)
      }

      return source
    })
  )

  const options: HateoasOptions = { baseUrl }
  const wrapped = wrapCollection(
    enhancedSources.map(s => ({
      ns: 'sources',
      id: s.id,
      type: 'DataCatalog',
      data: s,
    })),
    {
      ...options,
      path: '/sources',
    }
  )

  return c.json(wrapped)
})

/**
 * GET /sources/:sourceId - Get specific source details
 */
app.get('/sources/:sourceId', async c => {
  const { sourceId } = c.req.param()
  const baseUrl = new URL(c.req.url).origin

  const source = SOURCES[sourceId]
  if (!source) {
    const error = wrapError(
      { code: 'NOT_FOUND', message: `Source not found: ${sourceId}` },
      { baseUrl, path: `/sources/${sourceId}` }
    )
    return c.json(error, 404)
  }

  // Get stats
  const nsMap: Record<string, string> = {
    'mcp-registry': 'mcp',
    'public-apis': 'api',
    'publicapis-io': 'api',
    'rapidapi': 'api',
    'openrouter': 'models.do',
  }

  const ns = nsMap[sourceId]
  if (ns) {
    const stats = await c.env.DB_SERVICE.count({
      table: 'things',
      where: { ns },
    })

    source.stats = {
      totalResources: stats || 0,
    }
  }

  const options: HateoasOptions = { baseUrl }
  const wrapped = wrapEntity(
    {
      ns: 'sources',
      id: sourceId,
      type: 'DataCatalog',
      data: source,
    },
    options
  )

  // Add custom links for this source
  wrapped._links.resources = {
    href: `${baseUrl}/sources/${sourceId}/resources`,
    title: 'Browse resources',
  }
  wrapped._links.import = {
    href: `${baseUrl}/sources/${sourceId}/import`,
    method: 'POST',
    title: 'Trigger import',
  }
  wrapped._links.status = {
    href: `${baseUrl}/sources/${sourceId}/status`,
    title: 'Import status',
  }

  return c.json(wrapped)
})

/**
 * GET /sources/:sourceId/resources - Browse resources from a source
 */
app.get('/sources/:sourceId/resources', async c => {
  const { sourceId } = c.req.param()
  const baseUrl = new URL(c.req.url).origin
  const type = c.req.query('type')
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')

  const source = SOURCES[sourceId]
  if (!source) {
    const error = wrapError(
      { code: 'NOT_FOUND', message: `Source not found: ${sourceId}` },
      { baseUrl, path: `/sources/${sourceId}/resources` }
    )
    return c.json(error, 404)
  }

  // Get resources from database
  const service = new SourcesService(c.env.ctx, c.env)
  const resources = await service.getSourceResources(sourceId, { type, limit, page })

  const options: HateoasOptions = { baseUrl }
  const wrapped = wrapCollection(resources, {
    ...options,
    path: `/sources/${sourceId}/resources`,
    params: { type, page, limit },
  })

  return c.json(wrapped)
})

/**
 * POST /sources/:sourceId/import - Trigger import for a source
 */
app.post('/sources/:sourceId/import', async c => {
  const { sourceId } = c.req.param()
  const baseUrl = new URL(c.req.url).origin

  const source = SOURCES[sourceId]
  if (!source) {
    const error = wrapError(
      { code: 'NOT_FOUND', message: `Source not found: ${sourceId}` },
      { baseUrl, path: `/sources/${sourceId}/import` }
    )
    return c.json(error, 404)
  }

  try {
    const service = new SourcesService(c.env.ctx, c.env)
    const result = await service.triggerImport(sourceId)

    return c.json({
      '@context': 'https://schema.org',
      '@type': 'Action',
      '@id': `${baseUrl}/sources/${sourceId}/import`,
      actionStatus: 'CompletedActionStatus',
      result,
      _links: {
        self: { href: `${baseUrl}/sources/${sourceId}/import` },
        source: { href: `${baseUrl}/sources/${sourceId}` },
        status: { href: `${baseUrl}/sources/${sourceId}/status` },
      },
    })
  } catch (error) {
    const wrappedError = wrapError(
      {
        code: 'IMPORT_FAILED',
        message: error instanceof Error ? error.message : 'Import failed',
        details: error,
      },
      { baseUrl, path: `/sources/${sourceId}/import` }
    )
    return c.json(wrappedError, 500)
  }
})

/**
 * GET /sources/:sourceId/status - Get import status
 */
app.get('/sources/:sourceId/status', async c => {
  const { sourceId } = c.req.param()
  const baseUrl = new URL(c.req.url).origin

  const source = SOURCES[sourceId]
  if (!source) {
    const error = wrapError(
      { code: 'NOT_FOUND', message: `Source not found: ${sourceId}` },
      { baseUrl, path: `/sources/${sourceId}/status` }
    )
    return c.json(error, 404)
  }

  const service = new SourcesService(c.env.ctx, c.env)
  const history = await service.getImportStatus(sourceId)

  return c.json({
    '@context': 'https://schema.org',
    '@type': 'StatusReport',
    '@id': `${baseUrl}/sources/${sourceId}/status`,
    source: {
      id: sourceId,
      name: source.name,
    },
    history,
    _links: {
      self: { href: `${baseUrl}/sources/${sourceId}/status` },
      source: { href: `${baseUrl}/sources/${sourceId}` },
      import: { href: `${baseUrl}/sources/${sourceId}/import`, method: 'POST' },
    },
  })
})

// ============================================================================
// Resource Type Endpoints (Shortcuts)
// ============================================================================

/**
 * GET /mcp - Browse all MCP servers
 */
app.get('/mcp', async c => {
  const baseUrl = new URL(c.req.url).origin
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')

  const results = await c.env.DB_SERVICE.query({
    table: 'things',
    where: { ns: 'mcp', type: 'SoftwareApplication' },
    limit,
    offset: (page - 1) * limit,
  })

  const options: HateoasOptions = { baseUrl }
  const wrapped = wrapCollection(results, {
    ...options,
    path: '/mcp',
    params: { page, limit },
  })

  return c.json(wrapped)
})

/**
 * GET /mcp/:namespace/:name - Get specific MCP server
 */
app.get('/mcp/:namespace/:name', async c => {
  const { namespace, name } = c.req.param()
  const baseUrl = new URL(c.req.url).origin
  const id = `${namespace}/${name}`

  const result = await c.env.DB_SERVICE.getOne({
    ns: 'mcp',
    id,
  })

  if (!result) {
    const error = wrapError(
      { code: 'NOT_FOUND', message: `MCP server not found: ${id}` },
      { baseUrl, path: `/mcp/${namespace}/${name}` }
    )
    return c.json(error, 404)
  }

  const options: HateoasOptions = { baseUrl }
  const wrapped = wrapEntity(result, options)

  return c.json(wrapped)
})

/**
 * GET /apis - Browse all public APIs
 */
app.get('/apis', async c => {
  const baseUrl = new URL(c.req.url).origin
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')
  const category = c.req.query('category')

  const where: any = { ns: 'api', type: 'WebAPI' }
  if (category) where['data.category'] = category

  const results = await c.env.DB_SERVICE.query({
    table: 'things',
    where,
    limit,
    offset: (page - 1) * limit,
  })

  const options: HateoasOptions = { baseUrl }
  const wrapped = wrapCollection(results, {
    ...options,
    path: '/apis',
    params: { page, limit, category },
  })

  return c.json(wrapped)
})

/**
 * GET /apis/categories - List API categories
 */
app.get('/apis/categories', async c => {
  const baseUrl = new URL(c.req.url).origin

  const results = await c.env.DB_SERVICE.query({
    table: 'things',
    where: { ns: 'api', type: 'DefinedTerm' },
    limit: 100,
  })

  const options: HateoasOptions = { baseUrl }
  const wrapped = wrapCollection(results, {
    ...options,
    path: '/apis/categories',
  })

  return c.json(wrapped)
})

/**
 * GET /models - Browse AI models
 */
app.get('/models', async c => {
  const baseUrl = new URL(c.req.url).origin
  const page = parseInt(c.req.query('page') || '1')
  const limit = parseInt(c.req.query('limit') || '20')

  const results = await c.env.DB_SERVICE.query({
    table: 'things',
    where: { ns: 'models.do', type: 'Model' },
    limit,
    offset: (page - 1) * limit,
  })

  const options: HateoasOptions = { baseUrl }
  const wrapped = wrapCollection(results, {
    ...options,
    path: '/models',
    params: { page, limit },
  })

  return c.json(wrapped)
})

// ============================================================================
// Import Management Endpoints
// ============================================================================

/**
 * GET /imports - List all import tasks
 */
app.get('/imports', async c => {
  const baseUrl = new URL(c.req.url).origin

  const tasks = await c.env.SCHEDULE_SERVICE.listTasks()
  const importTasks = tasks.filter((t: any) => t.metadata?.category === 'imports')

  return c.json({
    '@context': 'https://schema.org',
    '@type': 'Collection',
    '@id': `${baseUrl}/imports`,
    items: importTasks,
    totalItems: importTasks.length,
    _links: {
      self: { href: `${baseUrl}/imports` },
      home: { href: baseUrl },
    },
  })
})

/**
 * POST /imports/all - Trigger comprehensive import of all sources
 */
app.post('/imports/all', async c => {
  const baseUrl = new URL(c.req.url).origin

  try {
    const result = await c.env.SCHEDULE_SERVICE.runTaskNow('import-all-sources')

    return c.json({
      '@context': 'https://schema.org',
      '@type': 'Action',
      '@id': `${baseUrl}/imports/all`,
      actionStatus: 'CompletedActionStatus',
      result,
      _links: {
        self: { href: `${baseUrl}/imports/all` },
        imports: { href: `${baseUrl}/imports` },
      },
    })
  } catch (error) {
    const wrappedError = wrapError(
      {
        code: 'IMPORT_FAILED',
        message: error instanceof Error ? error.message : 'Import failed',
        details: error,
      },
      { baseUrl, path: '/imports/all' }
    )
    return c.json(wrappedError, 500)
  }
})

// ============================================================================
// Export
// ============================================================================

export default {
  fetch: app.fetch,
}
