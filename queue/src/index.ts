/**
 * Queue Service - Background Job Processing
 *
 * RPC-based queue service for enqueueing and tracking background jobs.
 * Jobs are stored in the database and processed by Cloudflare Queue consumers.
 */

import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

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
// HTTP API (Optional)
// ============================================================================

const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors())

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
 * GET /jobs/:id - Get job status
 */
app.get('/jobs/:id', async (c) => {
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
 * GET /jobs - List jobs
 */
app.get('/jobs', async (c) => {
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
 * POST /jobs/:id/retry - Retry a failed job
 */
app.post('/jobs/:id/retry', async (c) => {
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
 * DELETE /jobs/:id - Cancel a job
 */
app.delete('/jobs/:id', async (c) => {
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
 * GET /stats - Get queue statistics
 */
app.get('/stats', async (c) => {
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

/**
 * GET /health - Health check
 */
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    service: 'queue',
    timestamp: new Date().toISOString(),
  })
})

export default {
  fetch: app.fetch,
}
