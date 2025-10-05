/**
 * Event Capture System
 * Captures content lifecycle events and stores in D1 + pipelines to R2
 */

import type { ContentEvent, EventEnvelope } from '../types/events'
import type { Env } from '../types/env'

export class EventCapture {
  constructor(
    private db: D1Database,
    private pipeline: Fetcher | null,
    private queue: Queue | null,
  ) {}

  /**
   * Capture a content lifecycle event
   */
  async captureEvent(event: ContentEvent, source: string = 'content-supply-chain'): Promise<void> {
    const envelope: EventEnvelope = {
      envelope: {
        version: '1.0',
        timestamp: Date.now(),
        source,
        correlationId: crypto.randomUUID(),
      },
      event,
    }

    // Store in D1 for recent events and queries
    await this.storeInD1(envelope)

    // Send to pipeline for long-term R2 storage
    if (this.pipeline) {
      await this.sendToPipeline(envelope)
    }

    // Queue for async processing (analytics, notifications, etc.)
    if (this.queue) {
      await this.queue.send({
        type: 'content_event',
        envelope,
      })
    }
  }

  /**
   * Store event in D1 database
   */
  private async storeInD1(envelope: EventEnvelope): Promise<void> {
    const { event } = envelope

    await this.db
      .prepare(`
        INSERT INTO content_events (
          id, event_type, content_id, timestamp, actor_id, actor_type,
          action, biz_step, disposition, read_point, biz_location,
          version, changes, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        event.id,
        event.eventType,
        event.contentId,
        event.timestamp,
        event.actorId,
        event.actorType,
        event.action,
        event.bizStep || null,
        event.disposition || null,
        event.readPoint || null,
        event.bizLocation || null,
        event.version || null,
        JSON.stringify(event.changes || {}),
        JSON.stringify(event.metadata || {}),
      )
      .run()

    // Update content metadata based on event type
    await this.updateContentFromEvent(event)
  }

  /**
   * Update content table based on event
   */
  private async updateContentFromEvent(event: ContentEvent): Promise<void> {
    switch (event.eventType) {
      case 'creation':
        await this.db
          .prepare(`
            INSERT INTO content (
              id, type, title, status, creator_id, creator_type,
              ai_model, created_at, updated_at, version
            ) VALUES (?, ?, ?, 'draft', ?, ?, ?, ?, ?, 1)
          `)
          .bind(
            event.contentId,
            event.contentType,
            event.title,
            event.actorId,
            event.creatorType,
            event.aiModel || null,
            event.timestamp,
            event.timestamp,
          )
          .run()
        break

      case 'edit':
        await this.db
          .prepare(`
            UPDATE content
            SET version = ?, updated_at = ?
            WHERE id = ?
          `)
          .bind(event.newVersion, event.timestamp, event.contentId)
          .run()
        break

      case 'publish':
        await this.db
          .prepare(`
            UPDATE content
            SET status = 'published', published_at = ?, updated_at = ?
            WHERE id = ?
          `)
          .bind(event.actualTime, event.timestamp, event.contentId)
          .run()
        break

      case 'archive':
        await this.db
          .prepare(`
            UPDATE content
            SET status = 'archived', archived_at = ?, updated_at = ?
            WHERE id = ?
          `)
          .bind(event.timestamp, event.timestamp, event.contentId)
          .run()
        break
    }
  }

  /**
   * Send event to pipeline for R2 archival
   */
  private async sendToPipeline(envelope: EventEnvelope): Promise<void> {
    if (!this.pipeline) return

    const date = new Date(envelope.envelope.timestamp)
    const path = `events/${date.getUTCFullYear()}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${String(date.getUTCDate()).padStart(2, '0')}/${envelope.event.id}.json`

    await this.pipeline.fetch('https://pipeline', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Path': path,
      },
      body: JSON.stringify(envelope),
    })
  }

  /**
   * Query recent events for a content item
   */
  async getContentEvents(
    contentId: string,
    options: {
      eventTypes?: string[]
      limit?: number
      offset?: number
    } = {},
  ): Promise<ContentEvent[]> {
    const { eventTypes, limit = 100, offset = 0 } = options

    let query = `
      SELECT * FROM content_events
      WHERE content_id = ?
    `
    const params: any[] = [contentId]

    if (eventTypes && eventTypes.length > 0) {
      query += ` AND event_type IN (${eventTypes.map(() => '?').join(', ')})`
      params.push(...eventTypes)
    }

    query += ` ORDER BY timestamp DESC LIMIT ? OFFSET ?`
    params.push(limit, offset)

    const { results } = await this.db.prepare(query).bind(...params).all()

    return results.map(row => ({
      id: row.id as string,
      eventType: row.event_type as any,
      contentId: row.content_id as string,
      timestamp: row.timestamp as number,
      actorId: row.actor_id as string,
      actorType: row.actor_type as any,
      action: row.action as any,
      bizStep: row.biz_step as string | undefined,
      disposition: row.disposition as string | undefined,
      readPoint: row.read_point as string | undefined,
      bizLocation: row.biz_location as string | undefined,
      version: row.version as number | undefined,
      changes: row.changes ? JSON.parse(row.changes as string) : undefined,
      metadata: row.metadata ? JSON.parse(row.metadata as string) : undefined,
    }))
  }

  /**
   * Get event timeline for content
   */
  async getContentTimeline(contentId: string): Promise<{
    created: number
    lastEdited?: number
    approved?: number
    published?: number
    distributed?: number[]
    archived?: number
  }> {
    const events = await this.getContentEvents(contentId)

    const timeline: any = {}

    for (const event of events) {
      switch (event.eventType) {
        case 'creation':
          timeline.created = event.timestamp
          break
        case 'edit':
          if (!timeline.lastEdited || event.timestamp > timeline.lastEdited) {
            timeline.lastEdited = event.timestamp
          }
          break
        case 'approval':
          if (!timeline.approved || event.timestamp > timeline.approved) {
            timeline.approved = event.timestamp
          }
          break
        case 'publish':
          if (!timeline.published || event.timestamp > timeline.published) {
            timeline.published = event.timestamp
          }
          break
        case 'distribution':
          if (!timeline.distributed) timeline.distributed = []
          timeline.distributed.push(event.timestamp)
          break
        case 'archive':
          timeline.archived = event.timestamp
          break
      }
    }

    return timeline
  }

  /**
   * Archive old events to R2 and delete from D1
   */
  async archiveOldEvents(olderThanDays: number = 30): Promise<number> {
    const cutoffTimestamp = Date.now() - olderThanDays * 24 * 60 * 60 * 1000

    const { results } = await this.db
      .prepare('SELECT COUNT(*) as count FROM content_events WHERE timestamp < ?')
      .bind(cutoffTimestamp)
      .all()

    const count = (results[0] as any).count

    // Events should already be in R2 via pipeline
    // Just delete from D1
    await this.db
      .prepare('DELETE FROM content_events WHERE timestamp < ?')
      .bind(cutoffTimestamp)
      .run()

    return count
  }
}
