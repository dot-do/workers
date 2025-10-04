/**
 * Queue Handler for Background/Async AI Generation
 * Processes AI generation requests asynchronously via Cloudflare Queues
 */

import type { AIServiceEnv, BackgroundJobRequest, BackgroundJobResult } from './types'
import AIService from './index'

/**
 * Process a background job from the queue
 */
async function processBackgroundJob(job: BackgroundJobRequest, env: AIServiceEnv): Promise<BackgroundJobResult> {
  const startTime = Date.now()

  try {
    // Create AI service instance
    const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as ExecutionContext
    const service = new AIService(ctx, env)

    let result: any

    // Execute the appropriate method based on job type
    switch (job.type) {
      case 'generate':
        result = await service.generate(job.input, job.options)
        break

      case 'analyze':
        result = await service.analyze(job.input.content, job.input.analysis, job.options)
        break

      case 'embed':
        result = await service.embed(job.input, job.options)
        break

      case 'generateImage':
        result = await service.generateImage(job.input, job.options)
        break

      case 'generateSpeech':
        result = await service.generateSpeech(job.input, job.options)
        break

      case 'list':
        result = await service.list(job.input, job.options)
        break

      case 'research':
        result = await service.research(job.input, job.options)
        break

      case 'code':
        result = await service.code(job.input, job.options)
        break

      default:
        throw new Error(`Unknown job type: ${job.type}`)
    }

    // Store result in KV or database (optional, for job status checking)
    // For now, we'll just return the result
    // In production, you'd store this in KV or D1 for retrieval

    return {
      id: job.id,
      type: job.type,
      status: 'completed',
      result,
      createdAt: job.createdAt,
      completedAt: Date.now(),
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return {
      id: job.id,
      type: job.type,
      status: 'failed',
      error: errorMessage,
      createdAt: job.createdAt,
      completedAt: Date.now(),
    }
  }
}

/**
 * Queue consumer handler
 * Processes batches of background jobs
 */
export async function handleQueueBatch(batch: MessageBatch<BackgroundJobRequest>, env: AIServiceEnv): Promise<void> {
  // Process all messages in parallel
  const results = await Promise.allSettled(batch.messages.map(async (message) => {
    try {
      const result = await processBackgroundJob(message.body, env)

      // Store result (in production, you'd store this in KV or D1)
      // For now, we'll just log it
      console.log(`Job ${message.body.id} completed:`, result)

      // Acknowledge the message
      message.ack()
    } catch (error) {
      console.error(`Job ${message.body.id} failed:`, error)

      // Retry the message (up to max_retries)
      message.retry()
    }
  }))

  // Log batch processing summary
  const completed = results.filter((r) => r.status === 'fulfilled').length
  const failed = results.filter((r) => r.status === 'rejected').length
  console.log(`Batch processed: ${completed} completed, ${failed} failed`)
}
