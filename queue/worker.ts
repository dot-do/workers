/**
 * Queue Worker - Consumer for background job processing
 *
 * This worker consumes messages from the Cloudflare Queue and processes them
 * using the job processor. It includes retry logic with exponential backoff.
 */

import { QueueService } from './src/index'
import { processJob, validateJob } from './src/processor'
import type { QueueJobRecord } from './src/index'

// ============================================================================
// Configuration
// ============================================================================

const MAX_RETRIES = 3
const BASE_DELAY_SECONDS = 60 // Base delay for exponential backoff

/**
 * Calculate exponential backoff delay in seconds
 */
function calculateBackoff(attempt: number): number {
  return Math.min(BASE_DELAY_SECONDS * Math.pow(2, attempt), 3600) // Max 1 hour
}

// ============================================================================
// Queue Consumer
// ============================================================================

interface QueueMessage {
  jobId: string
  type: string
  payload: any
  priority?: number
  retryAttempt?: number
  scheduledFor?: string
}

export default {
  /**
   * HTTP fetch handler (serves the HTTP API)
   */
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { default: app } = await import('./src/index')
    return app.fetch(request, env, ctx)
  },

  /**
   * Queue consumer handler
   */
  async queue(batch: MessageBatch<QueueMessage>, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[Queue Consumer] Processing batch of ${batch.messages.length} messages`)

    const service = new QueueService(ctx, env)
    const results = []

    // Process all messages in the batch
    for (const message of batch.messages) {
      try {
        const { jobId, type, payload, retryAttempt = 0 } = message.body

        console.log(`[Queue Consumer] Processing job ${jobId} (type: ${type}, attempt: ${retryAttempt})`)

        // Get job from database
        const job = await service.getJob(jobId)

        if (!job) {
          console.error(`[Queue Consumer] Job ${jobId} not found in database`)
          message.ack() // Acknowledge to remove from queue
          results.push({ jobId, status: 'error', error: 'Job not found' })
          continue
        }

        // Validate job
        const validation = validateJob(job)
        if (!validation.valid) {
          console.error(`[Queue Consumer] Job ${jobId} validation failed: ${validation.error}`)

          await service.updateJobStatus(jobId, 'failed', {
            error: validation.error,
            attempts: job.attempts + 1,
          })

          message.ack()
          results.push({ jobId, status: 'invalid', error: validation.error })
          continue
        }

        // Update job status to processing
        await service.updateJobStatus(jobId, 'processing', {
          attempts: job.attempts + 1,
        })

        try {
          // Process the job
          const result = await processJob(type, payload, env)

          // Update job status to completed
          await service.updateJobStatus(jobId, 'completed', {
            result,
            attempts: job.attempts + 1,
          })

          // Acknowledge message (removes from queue)
          message.ack()

          console.log(`[Queue Consumer] Job ${jobId} completed successfully`)
          results.push({ jobId, status: 'completed', result })
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'
          console.error(`[Queue Consumer] Job ${jobId} failed:`, errorMessage)

          const newAttempts = job.attempts + 1

          // Check if we should retry
          if (newAttempts < job.maxAttempts) {
            // Update job status to pending for retry
            await service.updateJobStatus(jobId, 'pending', {
              error: errorMessage,
              attempts: newAttempts,
            })

            // Calculate retry delay
            const delaySeconds = calculateBackoff(newAttempts)
            console.log(`[Queue Consumer] Retrying job ${jobId} in ${delaySeconds}s (attempt ${newAttempts}/${job.maxAttempts})`)

            // Retry with delay
            message.retry({ delaySeconds })

            results.push({
              jobId,
              status: 'retrying',
              attempt: newAttempts,
              maxAttempts: job.maxAttempts,
              delaySeconds,
            })
          } else {
            // Max retries exceeded - mark as failed
            await service.updateJobStatus(jobId, 'failed', {
              error: `Max retries exceeded. Last error: ${errorMessage}`,
              attempts: newAttempts,
            })

            // Acknowledge to send to DLQ
            message.ack()

            console.error(`[Queue Consumer] Job ${jobId} exceeded max retries (${job.maxAttempts})`)
            results.push({
              jobId,
              status: 'failed',
              error: 'Max retries exceeded',
              attempts: newAttempts,
            })
          }
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`[Queue Consumer] Failed to process message:`, errorMessage)

        // Retry the message with default behavior
        message.retry()

        results.push({
          jobId: 'unknown',
          status: 'error',
          error: errorMessage,
        })
      }
    }

    // Log batch summary
    const completed = results.filter((r) => r.status === 'completed').length
    const retrying = results.filter((r) => r.status === 'retrying').length
    const failed = results.filter((r) => r.status === 'failed').length
    const errors = results.filter((r) => r.status === 'error').length

    console.log(`[Queue Consumer] Batch complete: ${completed} completed, ${retrying} retrying, ${failed} failed, ${errors} errors`)
  },
}
