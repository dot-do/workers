/**
 * Queue message handler for {{SERVICE_NAME}}
 * @module {{SERVICE_NAME}}/queue
 */

import type { MessageBatch } from 'cloudflare:workers'
import type { Env } from './index'
import type { QueueMessage } from '@dot-do/worker-types'

/**
 * Handles queue messages
 */
export async function handleQueueMessage(batch: MessageBatch<QueueMessage>, env: Env): Promise<void> {
  console.log(`Processing ${batch.messages.length} messages from queue`)

  for (const message of batch.messages) {
    try {
      await processMessage(message.body, env)
      message.ack()
    } catch (error) {
      console.error('Failed to process message:', error)
      message.retry()
    }
  }
}

/**
 * Processes a single queue message
 */
async function processMessage(message: QueueMessage, env: Env): Promise<void> {
  console.log(`Processing message: ${message.type}`, message.data)

  switch (message.type) {
    case '{{NAMESPACE}}.item.created':
      await handleItemCreated(message.data, env)
      break

    case '{{NAMESPACE}}.item.updated':
      await handleItemUpdated(message.data, env)
      break

    case '{{NAMESPACE}}.item.deleted':
      await handleItemDeleted(message.data, env)
      break

    default:
      console.warn(`Unknown message type: ${message.type}`)
  }
}

/**
 * Handles item created event
 */
async function handleItemCreated(data: any, env: Env): Promise<void> {
  // TODO: Implement handler
  console.log('Item created:', data)
}

/**
 * Handles item updated event
 */
async function handleItemUpdated(data: any, env: Env): Promise<void> {
  // TODO: Implement handler
  console.log('Item updated:', data)
}

/**
 * Handles item deleted event
 */
async function handleItemDeleted(data: any, env: Env): Promise<void> {
  // TODO: Implement handler
  console.log('Item deleted:', data)
}
