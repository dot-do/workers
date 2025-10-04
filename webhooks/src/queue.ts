/**
 * Queue handler for automatic GitHub sync
 * Processes sync jobs triggered by database changes
 */

import type { Env } from './types'
import { syncToGitHub } from './handlers/github'

/**
 * Sync job message format
 */
export interface SyncJobMessage {
  type: 'sync' | 'delete'
  ns: string
  id: string
  repository?: string
  path?: string
  branch?: string
  createPR?: boolean
  content?: string
}

/**
 * Queue handler for sync jobs
 *
 * Triggered when entities are created/updated/deleted in database
 * Automatically syncs changes to GitHub
 */
export async function handleQueueMessage(batch: MessageBatch<SyncJobMessage>, env: Env): Promise<void> {
  console.log(`[QUEUE] Processing ${batch.messages.length} sync jobs`)

  for (const message of batch.messages) {
    try {
      const job = message.body

      console.log(`[QUEUE] Processing ${job.type} job for ${job.ns}/${job.id}`)

      if (job.type === 'sync') {
        // Get entity from database if content not provided
        let content = job.content
        let repository = job.repository
        let path = job.path

        if (!content || !repository || !path) {
          const result = await env.DB.query({
            sql: `SELECT * FROM things WHERE ns = ? AND id = ?`,
            params: [job.ns, job.id],
          })

          if (!result.results || result.results.length === 0) {
            console.warn(`[QUEUE] Entity not found: ${job.ns}/${job.id}`)
            message.ack() // Ack to avoid retries
            continue
          }

          const entity = result.results[0] as any

          // Reconstruct MDX content
          const data = typeof entity.data === 'string' ? JSON.parse(entity.data) : entity.data
          content = reconstructMDX(data, entity.content, entity)

          // Extract repository and path from entity
          repository = repository || entity.github_url?.replace('https://github.com/', '')
          path = path || entity.github_path
        }

        if (!repository || !path) {
          console.warn(`[QUEUE] Missing repository or path for ${job.ns}/${job.id}`)
          message.ack() // Ack to avoid infinite retries
          continue
        }

        // Sync to GitHub
        await syncToGitHub(
          {
            repository,
            path,
            content: content!,
            message: `chore: Auto-sync ${job.ns}/${job.id} from database\n\n🤖 Automated sync via database.do`,
            branch: job.branch || 'main',
            createPR: job.createPR || false,
          },
          env
        )

        console.log(`[QUEUE] Successfully synced ${job.ns}/${job.id} to ${repository}:${path}`)
      } else if (job.type === 'delete') {
        // TODO: Handle delete sync (delete file from GitHub)
        console.log(`[QUEUE] Delete sync not yet implemented for ${job.ns}/${job.id}`)
      }

      // Acknowledge successful processing
      message.ack()
    } catch (error) {
      console.error(`[QUEUE] Failed to process job:`, error)

      // Retry the message (will be retried by Cloudflare Queues)
      message.retry()
    }
  }

  console.log(`[QUEUE] Finished processing batch`)
}

/**
 * Reconstruct MDX content from entity data
 * Same logic as in api/routes/integrations/sync.ts
 */
function reconstructMDX(data: Record<string, any>, content: string, entity?: any): string {
  const frontmatterFields: Record<string, any> = {}

  // MDXLD required fields (using $ prefix for JS/TS/YAML compatibility)
  if (entity) {
    frontmatterFields.$id = `${entity.ns}/${entity.id}`
    frontmatterFields.$type = entity.type
  }

  // Add all data fields (excluding content)
  for (const [key, value] of Object.entries(data)) {
    if (key !== 'content') {
      frontmatterFields[key] = value
    }
  }

  // Convert to YAML
  const yamlLines = Object.entries(frontmatterFields).map(([key, value]) => {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Handle nested objects (simplified)
      const nested = Object.entries(value)
        .map(([k, v]) => `  ${k}: ${formatYAMLValue(v)}`)
        .join('\n')
      return `${key}:\n${nested}`
    }
    return `${key}: ${formatYAMLValue(value)}`
  })

  const frontmatter = yamlLines.join('\n')

  return `---
${frontmatter}
---

${content}`
}

/**
 * Format value for YAML output
 */
function formatYAMLValue(value: any): string {
  if (value === null || value === undefined) {
    return ''
  }
  if (typeof value === 'string') {
    // Quote strings with special characters
    if (value.includes(':') || value.includes('#') || value.includes('\n')) {
      return `"${value.replace(/"/g, '\\"')}"`
    }
    return value
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => formatYAMLValue(v)).join(', ')}]`
  }
  return String(value)
}
