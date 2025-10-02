/**
 * Batch Service - Bulk Data Processing
 *
 * RPC-based batch processing service for bulk imports, exports, and transformations.
 * Handles large-scale operations with progress tracking and queue-based processing.
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

// ============================================================================
// Types
// ============================================================================

export type BatchType = 'import-things' | 'import-relationships' | 'generate-embeddings' | 'export-things' | 'transform-data'

export type BatchStatus = 'pending' | 'processing' | 'completed' | 'failed'

export type ExportFormat = 'json' | 'csv' | 'ndjson'

export interface BatchJob {
  type: BatchType
  input?: any
  items?: any[]
  options?: Record<string, any>
}

export interface BatchJobRecord {
  id: string
  type: BatchType
  status: BatchStatus
  total: number
  processed: number
  failed: number
  input?: any
  results?: any[]
  errors?: Array<{ index: number; error: string }>
  createdAt: string
  updatedAt: string
  completedAt?: string
}

// ============================================================================
// BatchService RPC Class
// ============================================================================

export class BatchService extends WorkerEntrypoint<Env> {
  /**
   * Create a batch processing job
   */
  async createBatchJob(job: BatchJob): Promise<string> {
    const jobId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Validate batch type
    const validTypes: BatchType[] = ['import-things', 'import-relationships', 'generate-embeddings', 'export-things', 'transform-data']
    if (!validTypes.includes(job.type)) {
      throw new Error(`Invalid batch type: ${job.type}`)
    }

    // Store job metadata in database
    await this.env.DB.upsert(
      [
        {
          $id: `batch/${jobId}`,
          data: {
            id: jobId,
            type: job.type,
            status: 'pending' as BatchStatus,
            total: job.items?.length || 0,
            processed: 0,
            failed: 0,
            input: job.input,
            results: [],
            errors: [],
            createdAt: now,
            updatedAt: now,
          },
        },
      ],
      {
        ns: 'batch',
        $context: 'https://batch.do',
        type: 'BatchJob',
        $type: 'BatchJob',
      }
    )

    // Queue for processing
    await this.env.BATCH_QUEUE.send({
      jobId,
      type: job.type,
      items: job.items,
      input: job.input,
      options: job.options,
    })

    return jobId
  }

  /**
   * Get batch job status and details
   */
  async getBatchJob(jobId: string): Promise<BatchJobRecord | null> {
    const result = await this.env.DB.get(`batch/${jobId}`)

    if (!result?.data) {
      return null
    }

    return result.data.data as BatchJobRecord
  }

  /**
   * Process batch items
   */
  async processBatch(jobId: string, items: any[]): Promise<void> {
    const job = await this.getBatchJob(jobId)
    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    // Update status to processing
    await this.updateJobStatus(jobId, 'processing')

    let processed = 0
    let failed = 0
    const results: any[] = []
    const errors: Array<{ index: number; error: string }> = []

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      try {
        const result = await this.processItem(job.type, item)
        results.push({ success: true, result })
        processed++
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        results.push({ success: false, error: errorMessage })
        errors.push({ index: i, error: errorMessage })
        failed++
      }

      // Update progress every 100 items
      if ((i + 1) % 100 === 0) {
        await this.updateJobProgress(jobId, processed, failed, results, errors)
      }
    }

    // Final update
    const finalStatus: BatchStatus = failed > 0 ? 'failed' : 'completed'
    await this.updateJobProgress(jobId, processed, failed, results, errors, finalStatus)
  }

  /**
   * Process a single item based on batch type
   */
  private async processItem(type: BatchType, item: any): Promise<any> {
    switch (type) {
      case 'import-things':
        return await this.importThing(item)

      case 'import-relationships':
        return await this.importRelationship(item)

      case 'generate-embeddings':
        return await this.generateEmbedding(item)

      case 'export-things':
        return await this.exportThing(item.ns, item.id)

      case 'transform-data':
        return await this.transformData(item)

      default:
        throw new Error(`Unknown batch type: ${type}`)
    }
  }

  /**
   * Import a single thing
   */
  private async importThing(item: any): Promise<any> {
    const { ns, id, type, data, content, visibility } = item

    await this.env.DB.upsert(
      [
        {
          $id: `${ns}/${id}`,
          data: {
            ...data,
            content,
          },
        },
      ],
      {
        ns,
        $context: `https://${ns}.do`,
        type,
        $type: type,
        visibility: visibility || 'public',
      }
    )

    return { ns, id, type }
  }

  /**
   * Import a single relationship
   */
  private async importRelationship(item: any): Promise<any> {
    const { ns, id, type, fromNs, fromId, toNs, toId, data } = item

    await this.env.DB.upsert(
      [
        {
          $id: `${ns}/${id}`,
          data: {
            type,
            fromNs,
            fromId,
            toNs,
            toId,
            ...data,
          },
        },
      ],
      {
        ns,
        $context: `https://${ns}.do`,
        type: 'Relationship',
        $type: 'Relationship',
      }
    )

    return { ns, id, type, fromNs, fromId, toNs, toId }
  }

  /**
   * Generate embedding for an item
   */
  private async generateEmbedding(item: { ns: string; id: string }): Promise<any> {
    // Call EMBEDDINGS service to generate embeddings
    const result = await this.env.EMBEDDINGS.embedThing(item.ns, item.id)
    return result
  }

  /**
   * Export a single thing
   */
  private async exportThing(ns: string, id: string): Promise<any> {
    const result = await this.env.DB.get(`${ns}/${id}`)
    return result?.data || null
  }

  /**
   * Transform data using custom transformation
   */
  private async transformData(item: any): Promise<any> {
    // This is a placeholder for custom transformations
    // Could be extended to support custom JS functions
    return item
  }

  /**
   * Update job status
   */
  private async updateJobStatus(jobId: string, status: BatchStatus): Promise<void> {
    const job = await this.getBatchJob(jobId)
    if (!job) return

    const now = new Date().toISOString()

    await this.env.DB.upsert(
      [
        {
          $id: `batch/${jobId}`,
          data: {
            ...job,
            status,
            updatedAt: now,
            ...(status === 'completed' && { completedAt: now }),
          },
        },
      ],
      {
        ns: 'batch',
        $context: 'https://batch.do',
        type: 'BatchJob',
        $type: 'BatchJob',
      }
    )
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(
    jobId: string,
    processed: number,
    failed: number,
    results: any[],
    errors: Array<{ index: number; error: string }>,
    status?: BatchStatus
  ): Promise<void> {
    const job = await this.getBatchJob(jobId)
    if (!job) return

    const now = new Date().toISOString()

    await this.env.DB.upsert(
      [
        {
          $id: `batch/${jobId}`,
          data: {
            ...job,
            processed,
            failed,
            results,
            errors,
            updatedAt: now,
            ...(status && { status }),
            ...(status === 'completed' && { completedAt: now }),
          },
        },
      ],
      {
        ns: 'batch',
        $context: 'https://batch.do',
        type: 'BatchJob',
        $type: 'BatchJob',
      }
    )
  }

  /**
   * Export namespace to specific format
   */
  async exportToFormat(ns: string, format: ExportFormat): Promise<ReadableStream> {
    const result = await this.env.DB.list(ns, { limit: 10000 })
    const things = result?.data || []

    return new ReadableStream({
      start(controller) {
        if (format === 'json') {
          controller.enqueue(JSON.stringify(things, null, 2))
        } else if (format === 'ndjson') {
          for (const thing of things) {
            controller.enqueue(JSON.stringify(thing) + '\n')
          }
        } else if (format === 'csv') {
          // Convert to CSV
          const csv = convertToCSV(things)
          controller.enqueue(csv)
        }
        controller.close()
      },
    })
  }

  /**
   * Get batch job statistics
   */
  async getStats(): Promise<{
    total: number
    pending: number
    processing: number
    completed: number
    failed: number
    successRate: string
  }> {
    const result = await this.env.DB.list('batch', { limit: 10000 })
    const jobs = (result?.data || []).map((item: any) => item.data as BatchJobRecord)

    const total = jobs.length
    const pending = jobs.filter((j) => j.status === 'pending').length
    const processing = jobs.filter((j) => j.status === 'processing').length
    const completed = jobs.filter((j) => j.status === 'completed').length
    const failed = jobs.filter((j) => j.status === 'failed').length

    const totalProcessed = completed + failed
    const successRate = totalProcessed > 0 ? `${((completed / totalProcessed) * 100).toFixed(2)}%` : '0%'

    return {
      total,
      pending,
      processing,
      completed,
      failed,
      successRate,
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convert objects to CSV format
 */
function convertToCSV(objects: any[]): string {
  if (objects.length === 0) return ''

  // Get headers from first object
  const headers = Object.keys(objects[0].data || {})
  const csvHeaders = headers.join(',')

  // Convert each object to CSV row
  const csvRows = objects.map((obj) => {
    const data = obj.data || {}
    return headers
      .map((header) => {
        const value = data[header]
        // Escape quotes and wrap in quotes if contains comma
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
        return stringValue.includes(',') ? `"${stringValue.replace(/"/g, '""')}"` : stringValue
      })
      .join(',')
  })

  return [csvHeaders, ...csvRows].join('\n')
}

// ============================================================================
// HTTP API
// ============================================================================

const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors())

/**
 * POST /batch - Create a new batch job
 */
app.post('/batch', async (c) => {
  try {
    const service = new BatchService(c.env.ctx, c.env)
    const job = await c.req.json<BatchJob>()

    const jobId = await service.createBatchJob(job)

    return c.json({
      success: true,
      jobId,
      message: 'Batch job created and queued',
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create batch job',
      },
      500
    )
  }
})

/**
 * GET /batch/:id - Get batch job status
 */
app.get('/batch/:id', async (c) => {
  try {
    const service = new BatchService(c.env.ctx, c.env)
    const jobId = c.req.param('id')

    const job = await service.getBatchJob(jobId)

    if (!job) {
      return c.json({ success: false, error: 'Job not found' }, 404)
    }

    return c.json({ success: true, job })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get batch job',
      },
      500
    )
  }
})

/**
 * GET /export/:ns - Export namespace to format
 */
app.get('/export/:ns', async (c) => {
  try {
    const service = new BatchService(c.env.ctx, c.env)
    const ns = c.req.param('ns')
    const format = (c.req.query('format') || 'json') as ExportFormat

    const stream = await service.exportToFormat(ns, format)

    return new Response(stream, {
      headers: {
        'Content-Type': format === 'json' ? 'application/json' : format === 'csv' ? 'text/csv' : 'application/x-ndjson',
        'Content-Disposition': `attachment; filename="${ns}.${format}"`,
      },
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export',
      },
      500
    )
  }
})

/**
 * GET /stats - Get batch statistics
 */
app.get('/stats', async (c) => {
  try {
    const service = new BatchService(c.env.ctx, c.env)
    const stats = await service.getStats()

    return c.json({
      success: true,
      stats,
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get stats',
      },
      500
    )
  }
})

/**
 * GET /health - Health check
 */
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'batch',
    timestamp: new Date().toISOString(),
  })
})

// ============================================================================
// Queue Consumer
// ============================================================================

async function handleQueue(batch: MessageBatch, env: Env, ctx: ExecutionContext) {
  const service = new BatchService(ctx, env)

  for (const message of batch.messages) {
    try {
      const { jobId, type, items } = message.body as { jobId: string; type: BatchType; items: any[] }

      await service.processBatch(jobId, items)
      message.ack()
    } catch (error) {
      console.error('Failed to process batch message:', error)
      message.retry()
    }
  }
}

// ============================================================================
// Worker Export
// ============================================================================

export default {
  fetch: app.fetch,
  queue: handleQueue,
}
