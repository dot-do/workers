await env.QUEUE.enqueue({
  type: 'send-email',
  payload: {...},
  priority: 10 // High priority
})


await env.QUEUE.enqueue({
  type: 'generate-report',
  payload: {...},
  scheduledFor: new Date('2025-12-25T00:00:00Z')
})


const stats = await env.QUEUE.getStats()
// {
//   total: 1000,
//   pending: 50,
//   processing: 10,
//   completed: 920,
//   failed: 20,
//   completionRate: "92.00%",
//   failureRate: "2.00%"
// }


export class QueueService extends WorkerEntrypoint<Env> {
  // Enqueue a new job
  async enqueue(job: QueueJob): Promise<string>

  // Get job details
  async getJob(jobId: string): Promise<QueueJobRecord | null>

  // Update job status
  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    updates?: { result?: any; error?: string; attempts?: number }
  ): Promise<void>

  // Retry a failed job
  async retryJob(jobId: string): Promise<boolean>

  // List jobs with filtering
  async listJobs(options?: {
    status?: JobStatus
    type?: string
    limit?: number
    offset?: number
  }): Promise<QueueJobRecord[]>

  // Get queue statistics
  async getStats(): Promise<{
    total: number
    pending: number
    processing: number
    completed: number
    failed: number
    completionRate: string
    failureRate: string
  }>

  // Cancel a job
  async cancelJob(jobId: string): Promise<boolean>
}


// From another worker service
const jobId = await env.QUEUE.enqueue({
  type: 'send-email',
  payload: {
    to: 'user@example.com',
    subject: 'Welcome!',
    body: 'Thanks for signing up!'
  }
})

// Check job status
const job = await env.QUEUE.getJob(jobId)
console.log('Job status:', job.status)

// Get queue stats
const stats = await env.QUEUE.getStats()
console.log('Completion rate:', stats.completionRate)


// Enqueue from external client
const response = await fetch('https://queue.services.do/jobs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer sk_live_...'
  },
  body: JSON.stringify({
    type: 'generate-embedding',
    payload: {
      text: 'This is sample text for embedding',
      model: '@cf/baai/bge-base-en-v1.5'
    }
  })
})

const { jobId } = await response.json()


async function processCustomJob(payload: any, env: Env): Promise<any> {
  // Your custom logic here
  const result = await doSomething(payload)
  return result
}

// Add to processJob switch statement
case 'custom-job':
  return await processCustomJob(payload, env)


/**
 * Queue Service - Background Job Processing
 *
 * RPC-based queue service for enqueueing and tracking background jobs.
 * Jobs are stored in the database and processed by Cloudflare Queue consumers.
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'

// ============================================================================
// Types
// ============================================================================

export interface QueueJob {
  type: string
  payload: any
  priority?: number
  maxAttempts?: number
  scheduledFor?: Date
  metadata?: Record<string, any>
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface QueueJobRecord {
  id: string
  type: string
  payload: any
  status: JobStatus
  priority: number
  attempts: number
  maxAttempts: number
  result?: any
  error?: string
  scheduledFor?: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

export interface EnqueueResult {
  jobId: string
  status: JobStatus
  queuedAt: string
}

// ============================================================================
// QueueService RPC Class
// ============================================================================

export class QueueService extends WorkerEntrypoint<Env> {
  /**
   * Enqueue a new background job
   */
  async enqueue(job: QueueJob): Promise<string> {
    const jobId = crypto.randomUUID()
    const now = new Date().toISOString()

    // Create job record in database
    await this.env.DB.upsert(
      [
        {
          $id: `queue/${jobId}`,
          data: {
            id: jobId,
            type: job.type,
            payload: job.payload,
            status: 'pending' as JobStatus,
            priority: job.priority || 0,
            attempts: 0,
            maxAttempts: job.maxAttempts || 3,
            metadata: job.metadata || {},
            scheduledFor: job.scheduledFor?.toISOString(),
            createdAt: now,
            updatedAt: now,
          },
        },
      ],
      {
        ns: 'queue',
        $context: 'https://queue.do',
        type: 'QueueJob',
        $type: 'QueueJob',
      }
    )

    // Send to Cloudflare Queue for processing
    await this.env.JOB_QUEUE.send({
      jobId,
      type: job.type,
      payload: job.payload,
      priority: job.priority || 0,
      scheduledFor: job.scheduledFor?.toISOString(),
    })

    return jobId
  }

  /**
   * Get job status and details
   */
  async getJob(jobId: string): Promise<QueueJobRecord | null> {
    const result = await this.env.DB.get(`queue/${jobId}`)

    if (!result?.data) {
      return null
    }

    return result.data.data as QueueJobRecord
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    updates?: {
      result?: any
      error?: string
      attempts?: number
    }
  ): Promise<void> {
    const job = await this.getJob(jobId)
    if (!job) {
      throw new Error(`Job ${jobId} not found`)
    }

    const now = new Date().toISOString()
    const updatedJob = {
      ...job,
      status,
      updatedAt: now,
      ...(updates?.result !== undefined && { result: updates.result }),
      ...(updates?.error !== undefined && { error: updates.error }),
      ...(updates?.attempts !== undefined && { attempts: updates.attempts }),
      ...(status === 'completed' && { completedAt: now }),
    }

    await this.env.DB.upsert(
      [
        {
          $id: `queue/${jobId}`,
          data: updatedJob,
        },
      ],
      {
        ns: 'queue',
        $context: 'https://queue.do',
        type: 'QueueJob',
        $type: 'QueueJob',
      }
    )
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId)

    if (!job) {
      return false
    }

    if (job.attempts >= job.maxAttempts) {
      return false
    }

    // Update job status to pending
    await this.updateJobStatus(jobId, 'pending', {
      attempts: job.attempts,
    })

    // Re-enqueue the job
    await this.env.JOB_QUEUE.send({
      jobId,
      type: job.type,
      payload: job.payload,
      priority: job.priority,
      retryAttempt: job.attempts + 1,
    })

    return true
  }

  /**
   * List jobs with optional filtering
   */
  async listJobs(options?: {
    status?: JobStatus
    type?: string
    limit?: number
    offset?: number
  }): Promise<QueueJobRecord[]> {
    const result = await this.env.DB.list('queue', {
      ...options,
    })

    if (!result?.data) {
      return []
    }

    // Filter and map results
    let jobs = result.data
      .map((item: any) => item.data as QueueJobRecord)
      .filter((job: QueueJobRecord) => {
        if (options?.status && job.status !== options.status) return false
        if (options?.type && job.type !== options.type) return false
        return true
      })

    // Apply pagination
    const offset = options?.offset || 0
    const limit = options?.limit || 100
    jobs = jobs.slice(offset, offset + limit)

    return jobs
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    total: number
    pending: number
    processing: number
    completed: number
    failed: number
    completionRate: string
    failureRate: string
  }> {
    const jobs = await this.listJobs({ limit: 10000 })

    const total = jobs.length
    const pending = jobs.filter((j) => j.status === 'pending').length
    const processing = jobs.filter((j) => j.status === 'processing').length
    const completed = jobs.filter((j) => j.status === 'completed').length
    const failed = jobs.filter((j) => j.status === 'failed').length

    return {
      total,
      pending,
      processing,
      completed,
      failed,
      completionRate: total > 0 ? `${((completed / total) * 100).toFixed(2)}%` : '0%',
      failureRate: total > 0 ? `${((failed / total) * 100).toFixed(2)}%` : '0%',
    }
  }

  /**
   * Cancel a pending or processing job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.getJob(jobId)

    if (!job) {
      return false
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return false
    }

    await this.updateJobStatus(jobId, 'failed', {
      error: 'Job cancelled by user',
    })

    return true
  }
}

// ============================================================================
// Job Processor
// ============================================================================

/**
 * Process send-email job
 */
async function processSendEmailJob(payload: any, env: Env): Promise<any> {
  const { to, subject, body, from } = payload

  if (!to || !subject || !body) {
    throw new Error('Missing required email fields: to, subject, body')
  }

  console.log(`[Queue] Sending email to ${to}: ${subject}`)

  return {
    sent: true,
    to,
    subject,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Process generate-embedding job
 */
async function processGenerateEmbeddingJob(payload: any, env: Env): Promise<any> {
  const { text, model } = payload

  if (!text) {
    throw new Error('Missing required field: text')
  }

  // Generate embedding using AI service
  const result = await env.AI.generateEmbedding(text, {
    model: model || '@cf/baai/bge-base-en-v1.5',
  })

  return {
    embedding: result.embedding,
    dimensions: result.embedding.length,
    model: model || '@cf/baai/bge-base-en-v1.5',
  }
}

/**
 * Process crawl-website job
 */
async function processCrawlWebsiteJob(payload: any, env: Env): Promise<any> {
  const { url, maxPages, selectors } = payload

  if (!url) {
    throw new Error('Missing required field: url')
  }

  console.log(`[Queue] Crawling website: ${url}`)

  return {
    url,
    crawled: true,
    pages: maxPages || 10,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Process generate-content job (AI text generation)
 */
async function processGenerateContentJob(payload: any, env: Env): Promise<any> {
  const { prompt, type, model } = payload

  if (!prompt) {
    throw new Error('Missing required field: prompt')
  }

  // Generate content using AI service
  const result = await env.AI.generateText({
    prompt,
    model: model || '@cf/meta/llama-3.1-8b-instruct',
  })

  return {
    content: result.text,
    type: type || 'text',
    model: model || '@cf/meta/llama-3.1-8b-instruct',
    tokens: result.tokens,
  }
}

/**
 * Process batch-import job
 */
async function processBatchImportJob(payload: any, env: Env): Promise<any> {
  const { items, namespace } = payload

  if (!items || !Array.isArray(items)) {
    throw new Error('Missing or invalid field: items (must be array)')
  }

  console.log(`[Queue] Batch importing ${items.length} items to namespace: ${namespace || 'default'}`)

  // Batch import items to database
  const results = []
  for (const item of items) {
    try {
      await env.DB.upsert(
        [
          {
            $id: item.id || crypto.randomUUID(),
            data: item.data || item,
          },
        ],
        {
          ns: namespace || 'default',
          $context: 'https://queue.do/batch-import',
          type: item.type || 'ImportedItem',
          $type: item.type || 'ImportedItem',
        }
      )
      results.push({ id: item.id, success: true })
    } catch (error) {
      results.push({
        id: item.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  const successCount = results.filter((r) => r.success).length
  const failureCount = results.filter((r) => !r.success).length

  return {
    total: items.length,
    success: successCount,
    failed: failureCount,
    results,
  }
}

/**
 * Process webhook-delivery job
 */
async function processWebhookDeliveryJob(payload: any, env: Env): Promise<any> {
  const { url, method, body, headers } = payload

  if (!url) {
    throw new Error('Missing required field: url')
  }

  console.log(`[Queue] Delivering webhook to: ${url}`)

  // Make HTTP request to webhook URL
  const response = await fetch(url, {
    method: method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })

  return {
    url,
    status: response.status,
    statusText: response.statusText,
    success: response.ok,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Process a job based on its type
 */
export async function processJob(type: string, payload: any, env: Env): Promise<any> {
  console.log(`[Queue] Processing job type: ${type}`)

  switch (type) {
    case 'send-email':
      return await processSendEmailJob(payload, env)

    case 'generate-embedding':
      return await processGenerateEmbeddingJob(payload, env)

    case 'crawl-website':
      return await processCrawlWebsiteJob(payload, env)

    case 'generate-content':
      return await processGenerateContentJob(payload, env)

    case 'batch-import':
      return await processBatchImportJob(payload, env)

    case 'webhook-delivery':
      return await processWebhookDeliveryJob(payload, env)

    default:
      throw new Error(`Unknown job type: ${type}`)
  }
}

/**
 * Validate job before processing
 */
export function validateJob(job: QueueJobRecord): { valid: boolean; error?: string } {
  if (!job.type) {
    return { valid: false, error: 'Job type is required' }
  }

  if (!job.payload) {
    return { valid: false, error: 'Job payload is required' }
  }

  if (job.attempts >= job.maxAttempts) {
    return { valid: false, error: 'Job has exceeded maximum retry attempts' }
  }

  return { valid: true }
}

// ============================================================================
// Queue Consumer
// ============================================================================

/**
 * Queue consumer - processes jobs from Cloudflare Queue
 */
export async function queue(batch: MessageBatch<any>, env: Env): Promise<void> {
  const service = new QueueService({} as any, env)

  for (const message of batch.messages) {
    const { jobId, type, payload } = message.body

    try {
      console.log(`[Queue] Processing job ${jobId} of type ${type}`)

      // Get job from database
      const job = await service.getJob(jobId)
      if (!job) {
        console.error(`[Queue] Job ${jobId} not found`)
        message.ack()
        continue
      }

      // Validate job
      const validation = validateJob(job)
      if (!validation.valid) {
        console.error(`[Queue] Job ${jobId} validation failed: ${validation.error}`)
        await service.updateJobStatus(jobId, 'failed', {
          error: validation.error,
        })
        message.ack()
        continue
      }

      // Update status to processing
      await service.updateJobStatus(jobId, 'processing', {
        attempts: job.attempts + 1,
      })

      // Process the job
      const result = await processJob(type, payload, env)

      // Mark as completed
      await service.updateJobStatus(jobId, 'completed', {
        result,
      })

      console.log(`[Queue] Job ${jobId} completed successfully`)
      message.ack()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`[Queue] Job ${jobId} failed:`, errorMessage)

      try {
        const job = await service.getJob(jobId)
        if (job) {
          const newAttempts = job.attempts + 1
          if (newAttempts >= job.maxAttempts) {
            // Max retries exceeded - mark as failed
            await service.updateJobStatus(jobId, 'failed', {
              error: errorMessage,
              attempts: newAttempts,
            })
            message.ack() // Don't retry
          } else {
            // Retry the job
            await service.updateJobStatus(jobId, 'pending', {
              error: errorMessage,
              attempts: newAttempts,
            })
            message.retry() // Cloudflare will retry
          }
        }
      } catch (updateError) {
        console.error(`[Queue] Failed to update job ${jobId} status:`, updateError)
        message.retry()
      }
    }
  }
}

// ============================================================================
// HTTP API (Optional)
// ============================================================================

import { protocolRouter } from '@dot-do/protocol-router'

const app = new Hono<{ Bindings: Env }>()

/**
 * POST /jobs - Enqueue a new job
 */
app.post('/jobs', async (c) => {
  try {
    const service = new QueueService(c.env.ctx, c.env)
    const job = await c.req.json<QueueJob>()

    const jobId = await service.enqueue(job)

    return c.json({
      success: true,
      jobId,
      message: 'Job enqueued successfully',
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enqueue job',
      },
      500
    )
  }
})

/**
 * GET /api/jobs/:id - Get job status
 */
app.get('/api/jobs/:id', async (c) => {
  try {
    const service = new QueueService(c.env.ctx, c.env)
    const jobId = c.req.param('id')

    const job = await service.getJob(jobId)

    if (!job) {
      return c.json({ success: false, error: 'Job not found' }, 404)
    }

    return c.json({ success: true, job })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get job',
      },
      500
    )
  }
})

/**
 * GET /api/jobs - List jobs
 */
app.get('/api/jobs', async (c) => {
  try {
    const service = new QueueService(c.env.ctx, c.env)

    const status = c.req.query('status') as JobStatus | undefined
    const type = c.req.query('type')
    const limit = parseInt(c.req.query('limit') || '100')
    const offset = parseInt(c.req.query('offset') || '0')

    const jobs = await service.listJobs({
      status,
      type,
      limit,
      offset,
    })

    return c.json({
      success: true,
      count: jobs.length,
      jobs,
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list jobs',
      },
      500
    )
  }
})

/**
 * POST /api/jobs/:id/retry - Retry a failed job
 */
app.post('/api/jobs/:id/retry', async (c) => {
  try {
    const service = new QueueService(c.env.ctx, c.env)
    const jobId = c.req.param('id')

    const success = await service.retryJob(jobId)

    if (!success) {
      return c.json(
        {
          success: false,
          error: 'Job not found or max retries exceeded',
        },
        400
      )
    }

    return c.json({
      success: true,
      message: 'Job retry queued',
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retry job',
      },
      500
    )
  }
})

/**
 * DELETE /api/jobs/:id - Cancel a job
 */
app.delete('/api/jobs/:id', async (c) => {
  try {
    const service = new QueueService(c.env.ctx, c.env)
    const jobId = c.req.param('id')

    const success = await service.cancelJob(jobId)

    if (!success) {
      return c.json(
        {
          success: false,
          error: 'Job not found or already completed',
        },
        400
      )
    }

    return c.json({
      success: true,
      message: 'Job cancelled',
    })
  } catch (error) {
    return c.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel job',
      },
      500
    )
  }
})

/**
 * GET /api/stats - Get queue statistics
 */
app.get('/api/stats', async (c) => {
  try {
    const service = new QueueService(c.env.ctx, c.env)
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

const router = protocolRouter({
  api: app,
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    headers: ['Content-Type', 'Authorization'],
  },
})

export default {
  fetch: router.fetch,
  queue,
}
