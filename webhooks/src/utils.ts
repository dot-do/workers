import { ulid } from 'ulid'
import type { DatabaseService } from './types'

/**
 * Store webhook event in database
 */
export async function storeWebhookEvent(
  db: DatabaseService,
  event: {
    provider: string
    eventId: string
    eventType: string
    payload: string
    signature?: string
  }
): Promise<void> {
  const id = ulid()

  await db.query({
    sql: `INSERT INTO webhook_events (id, provider, event_id, event_type, payload, signature, processed, created_at)
          VALUES (?, ?, ?, ?, ?, ?, FALSE, NOW())`,
    params: [id, event.provider, event.eventId, event.eventType, event.payload, event.signature || null],
  })
}

/**
 * Check if webhook event has already been processed (idempotency)
 */
export async function checkIdempotency(db: DatabaseService, provider: string, eventId: string): Promise<boolean> {
  const result = await db.query({
    sql: `SELECT id FROM webhook_events WHERE provider = ? AND event_id = ?`,
    params: [provider, eventId],
  })

  return result.rows.length > 0
}

/**
 * Format success response
 */
export function success(data: any = {}) {
  return {
    success: true,
    ...data,
  }
}

/**
 * Format error response
 */
export function error(message: string, details?: any) {
  return {
    success: false,
    error: message,
    ...(details && { details }),
  }
}

/**
 * Safely parse JSON
 */
export function safeParseJSON(text: string): any {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/**
 * Extract domain from email
 */
export function getDomainFromEmail(email: string): string {
  const parts = email.split('@')
  return parts.length === 2 ? parts[1] : ''
}

/**
 * Format webhook event for logging
 */
export function formatWebhookEvent(provider: string, eventType: string, eventId: string): string {
  return `[${provider.toUpperCase()}] ${eventType} (${eventId})`
}

/**
 * Calculate time since timestamp
 */
export function timeSince(timestamp: string | number): number {
  const then = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp
  return Date.now() - then
}

/**
 * Check if webhook is too old (replay protection)
 * Returns true if webhook is older than maxAgeMs
 */
export function isWebhookTooOld(timestamp: string | number, maxAgeMs: number = 5 * 60 * 1000): boolean {
  return timeSince(timestamp) > maxAgeMs
}
