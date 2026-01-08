/**
 * EventMixin - Event Sourcing Operations for Durable Objects
 *
 * This module provides event sourcing capabilities as a mixin that can be
 * composed into DO classes. Events are append-only entries with monotonically
 * increasing version numbers per stream.
 *
 * ## Features
 * - Append events with auto-incrementing versions
 * - Get events by stream ID with filtering options
 * - Optimistic locking via expectedVersion
 * - Optional dual-write to Cloudflare Streams
 * - Lazy schema initialization
 *
 * ## Usage
 *
 * ```typescript
 * import { applyEventMixin } from './event-mixin'
 *
 * class MyDO extends applyEventMixin(DOCore) {
 *   async handleRequest(req: Request) {
 *     const event = await this.appendEvent({
 *       streamId: 'order-123',
 *       type: 'order.created',
 *       data: { customerId: 'cust-456' }
 *     })
 *     return Response.json(event)
 *   }
 * }
 * ```
 *
 * @module event-mixin
 */

import { DOCore, type DOState, type DOEnv } from './core.js'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * A stored event in the event store (EventMixin variant)
 */
export interface StoredEvent<T = unknown> {
  /** Unique event identifier */
  id: string
  /** Stream/aggregate ID this event belongs to */
  streamId: string
  /** Event type (e.g., 'order.created', 'item.added') */
  type: string
  /** Event payload data */
  data: T
  /** Monotonically increasing version number within stream */
  version: number
  /** Unix timestamp when event was created */
  timestamp: number
  /** Optional metadata (correlationId, userId, source, etc.) */
  metadata?: Record<string, unknown>
}

/**
 * Input for appending a new event (EventMixin variant)
 *
 * Note: This differs from event-store.ts AppendEventInput by using 'data' instead of 'payload'
 */
export interface AppendEventInput<T = unknown> {
  /** Stream/aggregate ID this event belongs to */
  streamId: string
  /** Event type (e.g., 'order.created', 'item.added') */
  type: string
  /** Event payload data */
  data: T
  /** Optional metadata */
  metadata?: Record<string, unknown>
  /** Expected version for optimistic locking (optional) */
  expectedVersion?: number
}

/**
 * Options for getting events (EventMixin variant)
 */
export interface GetEventsOptions {
  /** Filter by event type */
  type?: string
  /** Get events after this version */
  afterVersion?: number
  /** Limit number of events returned */
  limit?: number
}

/**
 * Configuration for the EventMixin
 */
export interface EventMixinConfig {
  /** Name of the env binding for Cloudflare Streams (optional) */
  streamBinding?: string
}

/**
 * Interface for classes that provide event sourcing operations
 */
export interface IEventMixin {
  appendEvent<T = unknown>(input: AppendEventInput<T>): Promise<StoredEvent<T>>
  getEvents<T = unknown>(streamId: string, options?: GetEventsOptions): Promise<StoredEvent<T>[]>
  getLatestVersion(streamId: string): Promise<number>
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error thrown when expectedVersion doesn't match actual version
 */
export class VersionConflictError extends Error {
  readonly streamId: string
  readonly expectedVersion: number
  readonly actualVersion: number

  constructor(streamId: string, expectedVersion: number, actualVersion: number) {
    super(
      `Version conflict for stream ${streamId}: expected ${expectedVersion}, actual ${actualVersion}`
    )
    this.name = 'VersionConflictError'
    this.streamId = streamId
    this.expectedVersion = expectedVersion
    this.actualVersion = actualVersion
  }
}

// ============================================================================
// Schema Definition
// ============================================================================

const EVENTS_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  stream_id TEXT NOT NULL,
  type TEXT NOT NULL,
  data TEXT NOT NULL,
  version INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  metadata TEXT,
  UNIQUE(stream_id, version)
);

CREATE INDEX IF NOT EXISTS idx_events_stream_id ON events(stream_id);
CREATE INDEX IF NOT EXISTS idx_events_stream_version ON events(stream_id, version);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
`

// ============================================================================
// EventMixin Implementation
// ============================================================================

/**
 * Constructor type for mixin application.
 * Note: TypeScript requires any[] for mixin constructors (TS2545)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T

/**
 * Base interface required by EventMixin
 */
interface EventMixinBase {
  readonly ctx: DOState
  readonly env: DOEnv
}

/**
 * Stream binding interface for dual-write pattern
 */
interface StreamBinding {
  send(event: StoredEvent): Promise<void>
}

/**
 * Apply EventMixin to a base class
 *
 * This function returns a new class that extends the base class
 * with event sourcing capabilities.
 *
 * @param Base - The base class to extend
 * @param config - Optional configuration for the mixin
 * @returns A new class with event sourcing operations
 *
 * @example
 * ```typescript
 * class MyDO extends applyEventMixin(DOCore) {
 *   // Now has appendEvent, getEvents, getLatestVersion
 * }
 * ```
 */
export function applyEventMixin<TBase extends Constructor<EventMixinBase>>(
  Base: TBase,
  config?: EventMixinConfig
) {
  return class EventMixin extends Base implements IEventMixin {
    private _schemaInitialized = false
    private _versionCache: Map<string, number> = new Map()

    /**
     * Initialize the events schema if not already done
     */
    private initializeSchema(): void {
      if (this._schemaInitialized) return

      // Split and execute each statement separately
      const statements = EVENTS_SCHEMA_SQL.split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)

      for (const statement of statements) {
        this.ctx.storage.sql.exec(statement)
      }

      this._schemaInitialized = true
    }

    /**
     * Generate a unique event ID
     */
    private generateEventId(): string {
      return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    }

    /**
     * Load the latest version from the database for a stream
     */
    private loadLatestVersionFromDb(streamId: string): number {
      const result = this.ctx.storage.sql.exec<{ max_version: number | null }>(
        'SELECT max(version) as max_version FROM events WHERE stream_id = ?',
        streamId
      )

      const row = result.one()
      return row?.max_version ?? 0
    }

    /**
     * Get the latest version for a stream
     */
    async getLatestVersion(streamId: string): Promise<number> {
      this.initializeSchema()

      // Check cache first
      if (this._versionCache.has(streamId)) {
        return this._versionCache.get(streamId)!
      }

      // Load from database
      const version = this.loadLatestVersionFromDb(streamId)
      this._versionCache.set(streamId, version)
      return version
    }

    /**
     * Append an event to a stream
     *
     * @param input - Event input data
     * @returns The stored event with assigned id, version, and timestamp
     * @throws VersionConflictError if expectedVersion doesn't match
     */
    async appendEvent<T = unknown>(input: AppendEventInput<T>): Promise<StoredEvent<T>> {
      this.initializeSchema()

      const currentVersion = await this.getLatestVersion(input.streamId)

      // Check optimistic locking if expectedVersion is provided
      if (input.expectedVersion !== undefined && input.expectedVersion !== currentVersion) {
        throw new VersionConflictError(input.streamId, input.expectedVersion, currentVersion)
      }

      const newVersion = currentVersion + 1
      const timestamp = Date.now()
      const id = this.generateEventId()

      const event: StoredEvent<T> = {
        id,
        streamId: input.streamId,
        type: input.type,
        data: input.data,
        version: newVersion,
        timestamp,
        metadata: input.metadata,
      }

      // Insert into SQL storage
      this.ctx.storage.sql.exec(
        `INSERT INTO events (id, stream_id, type, data, version, timestamp, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id,
        input.streamId,
        input.type,
        JSON.stringify(input.data),
        newVersion,
        timestamp,
        input.metadata ? JSON.stringify(input.metadata) : null
      )

      // Update the version cache
      this._versionCache.set(input.streamId, newVersion)

      // Emit to stream binding if configured (dual-write pattern)
      if (config?.streamBinding) {
        const binding = this.env[config.streamBinding] as StreamBinding | undefined
        if (binding) {
          try {
            await binding.send(event)
          } catch (error) {
            // Log but don't fail - event is already persisted
            console.error('Failed to emit event to stream binding:', error)
          }
        }
      }

      return event
    }

    /**
     * Get events for a stream with optional filtering
     *
     * @param streamId - The stream ID to get events for
     * @param options - Optional filtering options
     * @returns Array of events in version order
     */
    async getEvents<T = unknown>(
      streamId: string,
      options?: GetEventsOptions
    ): Promise<StoredEvent<T>[]> {
      this.initializeSchema()

      let query = 'SELECT * FROM events WHERE stream_id = ?'
      const params: unknown[] = [streamId]

      if (options?.afterVersion !== undefined) {
        query += ' AND version > ?'
        params.push(options.afterVersion)
      }

      if (options?.type !== undefined) {
        query += ' AND type = ?'
        params.push(options.type)
      }

      query += ' ORDER BY version ASC'

      if (options?.limit !== undefined) {
        query += ' LIMIT ?'
        params.push(options.limit)
      }

      const result = this.ctx.storage.sql.exec<{
        id: string
        stream_id: string
        type: string
        data: string
        version: number
        timestamp: number
        metadata: string | null
      }>(query, ...params)

      let events = result.toArray().map((row) => {
        let data: T
        let metadata: Record<string, unknown> | undefined

        try {
          data = JSON.parse(row.data) as T
        } catch (error) {
          console.error(`Failed to parse event data for event ${row.id}:`, error)
          data = {} as T
        }

        if (row.metadata) {
          try {
            metadata = JSON.parse(row.metadata)
          } catch (error) {
            console.error(`Failed to parse event metadata for event ${row.id}:`, error)
            metadata = undefined
          }
        }

        return {
          id: row.id,
          streamId: row.stream_id,
          type: row.type,
          data,
          version: row.version,
          timestamp: row.timestamp,
          metadata,
        }
      })

      // Apply limit in JavaScript as well (for mock compatibility)
      // Real SQL already applies LIMIT, so this is a no-op in production
      if (options?.limit !== undefined && events.length > options.limit) {
        events = events.slice(0, options.limit)
      }

      return events
    }
  }
}

/**
 * Type helper for the EventMixin result
 */
export type EventMixinClass<TBase extends Constructor<EventMixinBase>> = ReturnType<
  typeof applyEventMixin<TBase>
>

// ============================================================================
// Convenience Base Class
// ============================================================================

/**
 * EventBase - Convenience base class with event sourcing operations
 *
 * Pre-composed class that extends DOCore with EventMixin.
 * Use this when you only need event sourcing without additional mixins.
 *
 * @example
 * ```typescript
 * import { EventBase } from '@dotdo/do'
 *
 * class MyDO extends EventBase {
 *   async fetch(request: Request) {
 *     const event = await this.appendEvent({
 *       streamId: 'order-123',
 *       type: 'order.created',
 *       data: { customerId: 'cust-456' }
 *     })
 *     return Response.json(event)
 *   }
 * }
 * ```
 */
export class EventBase<Env extends DOEnv = DOEnv> extends applyEventMixin(DOCore)<Env> {
  constructor(ctx: DOState, env: Env) {
    super(ctx, env)
  }
}
