/**
 * Job Processor - Handles different job types
 *
 * This module processes various background job types including:
 * - Email sending
 * - Embedding generation
 * - Website crawling
 * - Custom job handlers
 */

import type { QueueJobRecord } from './index'

// ============================================================================
// Job Type Handlers
// ============================================================================

/**
 * Process send-email job
 */
async function processSendEmailJob(payload: any, env: Env): Promise<any> {
  const { to, subject, body, from } = payload

  if (!to || !subject || !body) {
    throw new Error('Missing required email fields: to, subject, body')
  }

  // Send email via email service
  // Note: This would integrate with an email service binding
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

  // This would integrate with a crawling service
  // For now, return mock data
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

// ============================================================================
// Main Job Processor
// ============================================================================

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
