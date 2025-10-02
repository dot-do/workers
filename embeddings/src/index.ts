import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { z } from 'zod'

/**
 * Embeddings Service - RPC + HTTP + Queue Interface
 *
 * Generates and manages vector embeddings for semantic search using:
 * - Workers AI (@cf/google/embeddinggemma-300m - 768 dims)
 * - OpenAI (text-embedding-3-small - 1536 dims)
 * - Batch processing via queue
 * - Automatic backfill for missing embeddings
 * - Cosine similarity comparison
 */

// Environment bindings
export interface Env {
  DB: any // Database RPC service binding
  AI: Ai // Workers AI binding
  OPENAI_API_KEY: string // OpenAI API key secret
  EMBEDDINGS_QUEUE?: Queue // Queue for async embedding generation
}

// Zod schemas for validation
const generateEmbeddingSchema = z.object({
  text: z.string().min(1).max(8000),
  model: z.enum(['openai', 'workers-ai']).default('workers-ai'),
})

const embedThingSchema = z.object({
  ns: z.string().min(1),
  id: z.string().min(1),
})

const backfillOptionsSchema = z.object({
  ns: z.string().optional(),
  limit: z.number().int().min(1).max(1000).default(100),
  model: z.enum(['openai', 'workers-ai']).default('workers-ai'),
})

const compareEmbeddingsSchema = z.object({
  embedding1: z.array(z.number()),
  embedding2: z.array(z.number()),
})

type GenerateEmbeddingInput = z.infer<typeof generateEmbeddingSchema>
type EmbedThingInput = z.infer<typeof embedThingSchema>
type BackfillOptions = z.infer<typeof backfillOptionsSchema>
type CompareEmbeddingsInput = z.infer<typeof compareEmbeddingsSchema>

/**
 * EmbeddingsService RPC Class
 *
 * Called by other services via service bindings
 */
export class EmbeddingsService extends WorkerEntrypoint<Env> {
  /**
   * Generate embedding for text using specified model
   */
  async generateEmbedding(text: string, model: 'openai' | 'workers-ai' = 'workers-ai'): Promise<number[]> {
    const validated = generateEmbeddingSchema.parse({ text, model })

    switch (validated.model) {
      case 'openai':
        return await this.generateOpenAI(validated.text)
      case 'workers-ai':
        return await this.generateWorkersAI(validated.text)
      default:
        throw new Error(`Unknown model: ${validated.model}`)
    }
  }

  /**
   * Generate embedding using OpenAI API
   */
  private async generateOpenAI(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text.slice(0, 8000),
        model: 'text-embedding-3-small',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} - ${error}`)
    }

    const data = await response.json<any>()
    const embedding = data.data[0].embedding

    if (!embedding || embedding.length !== 1536) {
      throw new Error(`Invalid OpenAI embedding dimension: expected 1536, got ${embedding?.length}`)
    }

    return embedding
  }

  /**
   * Generate embedding using Workers AI
   */
  private async generateWorkersAI(text: string): Promise<number[]> {
    const result = await this.env.AI.run('@cf/google/embeddinggemma-300m', {
      text: [text.slice(0, 8000)],
    }) as any

    const embedding = result.data?.[0]

    if (!embedding || embedding.length !== 768) {
      throw new Error(`Invalid Workers AI embedding dimension: expected 768, got ${embedding?.length}`)
    }

    return embedding
  }

  /**
   * Generate and store embedding for a thing
   */
  async embedThing(ns: string, id: string, model: 'openai' | 'workers-ai' = 'workers-ai'): Promise<boolean> {
    const validated = embedThingSchema.parse({ ns, id })

    // Get thing from database
    const thing = await this.env.DB.getThing(validated.ns, validated.id)
    if (!thing) {
      throw new Error(`Thing not found: ${validated.ns}:${validated.id}`)
    }

    // Generate embedding text from thing data
    const text = this.generateEmbeddingText(thing)
    if (!text || text.trim().length === 0) {
      throw new Error('No text content to embed')
    }

    // Generate embedding
    const embedding = await this.generateEmbedding(text, model)

    // Update thing with embedding
    await this.env.DB.updateThingEmbedding(validated.ns, validated.id, embedding)

    return true
  }

  /**
   * Backfill embeddings for things without them
   */
  async backfillEmbeddings(options?: BackfillOptions): Promise<{ total: number; successful: number; failed: number }> {
    const opts = backfillOptionsSchema.parse(options || {})

    // Get things without embeddings
    const things = await this.env.DB.getThingsWithoutEmbeddings(opts.ns, opts.limit)

    let successful = 0
    let failed = 0

    for (const thing of things) {
      try {
        await this.embedThing(thing.ns, thing.id, opts.model)
        successful++
      } catch (error) {
        console.error(`Failed to embed ${thing.ns}:${thing.id}:`, error)
        failed++
      }
    }

    return {
      total: things.length,
      successful,
      failed,
    }
  }

  /**
   * Compare two embeddings using cosine similarity
   */
  compareEmbeddings(emb1: number[], emb2: number[]): number {
    const validated = compareEmbeddingsSchema.parse({ embedding1: emb1, embedding2: emb2 })

    if (validated.embedding1.length !== validated.embedding2.length) {
      throw new Error('Embeddings must have same length')
    }

    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < validated.embedding1.length; i++) {
      dotProduct += validated.embedding1[i] * validated.embedding2[i]
      norm1 += validated.embedding1[i] * validated.embedding1[i]
      norm2 += validated.embedding2[i] * validated.embedding2[i]
    }

    if (norm1 === 0 || norm2 === 0) {
      return 0
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2))
  }

  /**
   * Queue embedding job for async processing
   */
  async queueEmbeddingJob(ns: string, id: string, model: 'openai' | 'workers-ai' = 'workers-ai'): Promise<boolean> {
    if (!this.env.EMBEDDINGS_QUEUE) {
      throw new Error('Embeddings queue not configured')
    }

    await this.env.EMBEDDINGS_QUEUE.send({ ns, id, model })
    return true
  }

  /**
   * Generate embedding text from thing object
   */
  private generateEmbeddingText(thing: any): string {
    const parts: string[] = []

    // Add ID (human-readable)
    if (thing.id) {
      parts.push(thing.id.replace(/-/g, ' '))
    }

    // Add type
    if (thing.type) {
      parts.push(thing.type)
    }

    // Add common data fields
    const data = thing.data || {}
    const meaningfulFields = ['name', 'title', 'description', 'summary', 'content', 'text']

    for (const field of meaningfulFields) {
      if (data[field]) {
        parts.push(String(data[field]))
      }
    }

    // Add content if available
    if (thing.content) {
      parts.push(thing.content)
    }

    // If no meaningful fields found, stringify the whole data object
    if (parts.length <= 2 && Object.keys(data).length > 0) {
      parts.push(JSON.stringify(data).slice(0, 5000))
    }

    return parts.join(' ').slice(0, 8000)
  }
}

/**
 * HTTP API Interface using Hono
 */
const app = new Hono<{ Bindings: Env }>()

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'healthy', service: 'embeddings' })
})

// Generate embedding for text
app.post('/embed', async (c) => {
  const service = new EmbeddingsService(c.executionCtx, c.env)

  try {
    const { text, model } = await c.req.json<GenerateEmbeddingInput>()
    const embedding = await service.generateEmbedding(text, model)

    return c.json({
      embedding,
      dimensions: embedding.length,
      model: model || 'workers-ai',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400)
    }
    throw error
  }
})

// Embed a specific thing
app.post('/embed/thing/:ns/:id', async (c) => {
  const service = new EmbeddingsService(c.executionCtx, c.env)

  try {
    const model = (c.req.query('model') as 'openai' | 'workers-ai') || 'workers-ai'
    const success = await service.embedThing(c.req.param('ns'), c.req.param('id'), model)

    return c.json({ success, ns: c.req.param('ns'), id: c.req.param('id') })
  } catch (error) {
    if (error instanceof Error && error.message.includes('not found')) {
      return c.notFound()
    }
    throw error
  }
})

// Queue thing embedding job
app.post('/embed/queue/:ns/:id', async (c) => {
  const service = new EmbeddingsService(c.executionCtx, c.env)

  try {
    const model = (c.req.query('model') as 'openai' | 'workers-ai') || 'workers-ai'
    const queued = await service.queueEmbeddingJob(c.req.param('ns'), c.req.param('id'), model)

    return c.json({ queued, ns: c.req.param('ns'), id: c.req.param('id') })
  } catch (error) {
    if (error instanceof Error && error.message.includes('queue not configured')) {
      return c.json({ error: 'Queue not configured' }, 503)
    }
    throw error
  }
})

// Backfill embeddings for things without them
app.post('/embed/backfill', async (c) => {
  const service = new EmbeddingsService(c.executionCtx, c.env)

  try {
    const options = await c.req.json<BackfillOptions>()
    const result = await service.backfillEmbeddings(options)

    return c.json(result)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400)
    }
    throw error
  }
})

// Compare two embeddings
app.post('/embed/compare', async (c) => {
  const service = new EmbeddingsService(c.executionCtx, c.env)

  try {
    const { embedding1, embedding2 } = await c.req.json<CompareEmbeddingsInput>()
    const similarity = service.compareEmbeddings(embedding1, embedding2)

    return c.json({
      similarity,
      match: similarity > 0.8 ? 'high' : similarity > 0.6 ? 'medium' : similarity > 0.4 ? 'low' : 'none',
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return c.json({ error: 'Validation error', details: error.errors }, 400)
    }
    throw error
  }
})

/**
 * Queue Handler for async embedding generation
 */
export async function queue(batch: MessageBatch, env: Env, ctx: ExecutionContext): Promise<void> {
  const service = new EmbeddingsService(ctx, env)

  console.log(`Processing batch of ${batch.messages.length} embedding jobs`)

  for (const message of batch.messages) {
    try {
      const { ns, id, model } = message.body as { ns: string; id: string; model?: 'openai' | 'workers-ai' }

      await service.embedThing(ns, id, model || 'workers-ai')
      message.ack()
    } catch (error) {
      console.error(`Failed to process embedding job:`, error)
      message.retry()
    }
  }
}

// Export HTTP interface as default
export default {
  fetch: app.fetch,
  queue,
}
