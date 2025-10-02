import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { z } from 'zod'

/**
 * Things Service - RPC + HTTP Interface
 *
 * Provides CRUD operations for entities (things) with:
 * - Relationship enrichment
 * - AI generation enrichment
 * - Multiple response formats (JSON, MDX, JSON-LD)
 * - Pagination and sorting
 * - Full-text search fallback
 */

// Environment bindings
export interface Env {
  DB: any // Database RPC service binding
  AI?: any // AI service binding (optional)
}

// Zod schemas for validation
const createThingSchema = z.object({
  ns: z.string().min(1),
  id: z.string().optional(),
  type: z.string().min(1),
  data: z.record(z.any()),
  content: z.string().optional(),
  visibility: z.enum(['public', 'private', 'unlisted']).default('public'),
})

const updateThingSchema = z.object({
  type: z.string().optional(),
  data: z.record(z.any()).optional(),
  content: z.string().optional(),
  visibility: z.enum(['public', 'private', 'unlisted']).optional(),
})

const listOptionsSchema = z.object({
  type: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(100),
  offset: z.number().int().min(0).default(0),
  sort: z.string().optional(),
})

type CreateThingInput = z.infer<typeof createThingSchema>
type UpdateThingInput = z.infer<typeof updateThingSchema>
type ListOptions = z.infer<typeof listOptionsSchema>

/**
 * ThingsService RPC Class
 *
 * Called by other services via service bindings
 */
export class ThingsService extends WorkerEntrypoint<Env> {
  /**
   * Get thing by namespace and ID with optional format conversion
   */
  async getThing(ns: string, id: string, format?: 'json' | 'mdx' | 'json-ld'): Promise<any> {
    const db = this.env.DB

    // Get base thing
    const thing = await db.getThing(ns, id)
    if (!thing) return null

    // Enrich with relationships
    const relationships = await db.getRelationshipsFrom(ns, id)

    // Enrich with AI generations if available (query generations table)
    // For now, mock this - in production would query generations table
    const aiEnrichments: any[] = [] // TODO: await db.getGenerations(ns, id)

    const enriched = {
      ...thing,
      relationships: relationships || [],
      generations: aiEnrichments,
    }

    // Format response
    if (format === 'mdx') {
      return this.formatMDX(enriched)
    }
    if (format === 'json-ld') {
      return this.formatJSONLD(enriched)
    }

    return enriched
  }

  /**
   * Create new thing with validation
   */
  async createThing(data: CreateThingInput): Promise<any> {
    const validated = createThingSchema.parse(data)
    const db = this.env.DB

    // Generate ID if not provided
    const id = validated.id || this.slugify(validated.data.name || 'untitled')

    return await db.createThing({
      ns: validated.ns,
      id,
      type: validated.type,
      data: validated.data,
      content: validated.content,
      visibility: validated.visibility,
    })
  }

  /**
   * Update existing thing
   */
  async updateThing(ns: string, id: string, updates: UpdateThingInput): Promise<any> {
    const validated = updateThingSchema.parse(updates)
    return await this.env.DB.updateThing(ns, id, validated)
  }

  /**
   * Delete thing by namespace and ID
   */
  async deleteThing(ns: string, id: string): Promise<boolean> {
    await this.env.DB.deleteThing(ns, id)
    return true
  }

  /**
   * List things with pagination and filtering
   */
  async listThings(ns: string, options?: ListOptions): Promise<any[]> {
    const opts = listOptionsSchema.parse(options || {})
    return await this.env.DB.listThings(ns, opts.type, opts.limit, opts.offset)
  }

  /**
   * Search things using full-text search
   */
  async searchThings(query: string, ns?: string, limit = 10): Promise<any[]> {
    return await this.env.DB.searchThings(query, ns, limit)
  }

  /**
   * Format thing as MDX (YAML frontmatter + markdown)
   */
  private formatMDX(thing: any): string {
    const { ns, id, type, data, content, relationships } = thing

    return `---
ns: ${ns}
id: ${id}
type: ${type}
${Object.entries(data || {}).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}
---

# ${data?.name || id}

${content || ''}

## Relationships

${relationships.map((rel: any) => `- **${rel.type}**: ${rel.toId}`).join('\n')}

## Data

\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`
`
  }

  /**
   * Format thing as JSON-LD
   */
  private formatJSONLD(thing: any): any {
    const { ns, id, type, data } = thing

    return {
      '@context': 'https://schema.org',
      '@type': type,
      '@id': `https://${ns}.do/${id}`,
      ...data,
    }
  }

  /**
   * Convert text to URL-safe slug
   */
  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
}

/**
 * HTTP API Interface using Hono
 */
const app = new Hono<{ Bindings: Env }>()

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'healthy', service: 'things' })
})

// Get thing by namespace and ID
app.get('/things/:ns/:id', async (c) => {
  const service = new ThingsService(c.executionCtx, c.env)
  const format = c.req.query('format') as 'json' | 'mdx' | 'json-ld' | undefined

  const thing = await service.getThing(
    c.req.param('ns'),
    c.req.param('id'),
    format
  )

  if (!thing) {
    return c.notFound()
  }

  // Return MDX as text/markdown
  if (format === 'mdx') {
    return c.text(thing, 200, { 'Content-Type': 'text/markdown' })
  }

  return c.json(thing)
})

// List things in namespace
app.get('/things/:ns', async (c) => {
  const service = new ThingsService(c.executionCtx, c.env)
  const type = c.req.query('type')
  const limit = parseInt(c.req.query('limit') || '100')
  const offset = parseInt(c.req.query('offset') || '0')
  const sort = c.req.query('sort')

  const things = await service.listThings(c.req.param('ns'), {
    type,
    limit,
    offset,
    sort,
  })

  return c.json({
    things,
    total: things.length,
    limit,
    offset,
  })
})

// Search things
app.get('/search', async (c) => {
  const service = new ThingsService(c.executionCtx, c.env)
  const query = c.req.query('q')
  const ns = c.req.query('ns')
  const limit = parseInt(c.req.query('limit') || '10')

  if (!query) {
    return c.json({ error: 'Query parameter "q" is required' }, 400)
  }

  const results = await service.searchThings(query, ns, limit)

  return c.json({
    query,
    results,
    total: results.length,
  })
})

// Create thing
app.post('/things', async (c) => {
  const service = new ThingsService(c.executionCtx, c.env)

  try {
    const data = await c.req.json()
    const thing = await service.createThing(data)

    return c.json(thing, 201)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400)
    }
    throw error
  }
})

// Update thing
app.put('/things/:ns/:id', async (c) => {
  const service = new ThingsService(c.executionCtx, c.env)

  try {
    const updates = await c.req.json()
    const thing = await service.updateThing(
      c.req.param('ns'),
      c.req.param('id'),
      updates
    )

    if (!thing) {
      return c.notFound()
    }

    return c.json(thing)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400)
    }
    throw error
  }
})

// Delete thing
app.delete('/things/:ns/:id', async (c) => {
  const service = new ThingsService(c.executionCtx, c.env)

  const deleted = await service.deleteThing(
    c.req.param('ns'),
    c.req.param('id')
  )

  if (!deleted) {
    return c.notFound()
  }

  return c.json({ success: true })
})

// Export HTTP interface as default
export default app
