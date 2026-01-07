/**
 * Event Store Implementation for Stream-Based Event Sourcing
 *
 * Provides stream-based event storage with:
 * - Monotonic versioning within streams
 * - Optimistic concurrency control via expectedVersion
 * - Causation and correlation tracking
 * - JSON serialization for payloads and metadata
 *
 * @module event-store
 */

import type { SqlStorage } from './core.js'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Event metadata for tracking causation and correlation
 */
export interface EventMetadata {
  /** ID of the event that caused this event */
  causationId?: string
  /** Correlation ID for distributed tracing */
  correlationId?: string
  /** ID of the user who triggered this event */
  userId?: string
  /** Additional custom metadata */
  [key: string]: unknown
}

/**
 * Domain event structure for stream-based event sourcing
 *
 * Events are immutable records of things that happened in the system.
 * They are stored in streams (identified by streamId) with monotonic versions.
 */
export interface StreamDomainEvent<T = unknown> {
  /** Unique event ID (UUID) */
  id: string
  /** Stream identifier (e.g., 'order-123', 'user-456') */
  streamId: string
  /** Event type (e.g., 'OrderCreated', 'ItemAdded') */
  type: string
  /** Event version within the stream (1, 2, 3, ...) */
  version: number
  /** Unix timestamp (ms) when event was recorded */
  timestamp: number
  /** Event payload data */
  payload: T
  /** Optional metadata */
  metadata?: EventMetadata
}

/**
 * Input for appending a new event to a stream
 */
export interface AppendEventInput<T = unknown> {
  /** Stream identifier */
  streamId: string
  /** Event type */
  type: string
  /** Event payload */
  payload: T
  /** Expected version (for optimistic concurrency) */
  expectedVersion?: number
  /** Optional metadata */
  metadata?: EventMetadata
}

/**
 * Options for reading events from a stream
 */
export interface ReadStreamOptions {
  /** Start reading from this version (inclusive) */
  fromVersion?: number
  /** Read up to this version (inclusive) */
  toVersion?: number
  /** Maximum number of events to return */
  limit?: number
  /** Read in reverse order (newest first) */
  reverse?: boolean
}

/**
 * Result of appending events
 */
export interface AppendResult {
  /** The appended event */
  event: StreamDomainEvent
  /** Current stream version after append */
  currentVersion: number
}

/**
 * Event Store interface for stream-based event sourcing
 */
export interface IEventStore {
  /**
   * Append an event to a stream
   * @throws ConcurrencyError if expectedVersion doesn't match
   */
  append<T>(input: AppendEventInput<T>): Promise<AppendResult>

  /**
   * Read events from a stream
   */
  readStream(streamId: string, options?: ReadStreamOptions): Promise<StreamDomainEvent[]>

  /**
   * Get the current version of a stream
   * Returns 0 if stream doesn't exist
   */
  getStreamVersion(streamId: string): Promise<number>

  /**
   * Check if a stream exists
   */
  streamExists(streamId: string): Promise<boolean>
}

// ============================================================================
// ConcurrencyError
// ============================================================================

/**
 * Concurrency error thrown when expectedVersion doesn't match
 */
export class ConcurrencyError extends Error {
  constructor(
    public readonly streamId: string,
    public readonly expectedVersion: number,
    public readonly actualVersion: number
  ) {
    super(
      `Concurrency conflict on stream '${streamId}': expected version ${expectedVersion}, but actual version is ${actualVersion}`
    )
    this.name = 'ConcurrencyError'
  }
}

// ============================================================================
// Schema
// ============================================================================

/**
 * SQL schema for the events table
 *
 * Key features:
 * - UNIQUE(stream_id, version) ensures monotonic versioning per stream
 * - timestamp allows time-based queries
 * - metadata stored as JSON for flexibility
 */
export const EVENT_STORE_SCHEMA_SQL = `
-- Events table for stream-based event sourcing
CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  stream_id TEXT NOT NULL,
  type TEXT NOT NULL,
  version INTEGER NOT NULL,
  timestamp INTEGER NOT NULL,
  payload TEXT NOT NULL,
  metadata TEXT,
  UNIQUE(stream_id, version)
);

-- Index for efficient stream queries
CREATE INDEX IF NOT EXISTS idx_events_stream ON events(stream_id, version);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);

-- Index for event type queries
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
`

// ============================================================================
// Database Row Type
// ============================================================================

interface EventRow {
  id: string
  stream_id: string
  type: string
  version: number
  timestamp: number
  payload: string
  metadata: string | null
}

// ============================================================================
// EventStore Implementation
// ============================================================================

/**
 * Event Store implementation using SQL storage.
 *
 * Provides stream-based event sourcing with optimistic concurrency control.
 *
 * @example
 * ```typescript
 * const store = new EventStore(ctx.storage.sql)
 *
 * // Append event to stream
 * const result = await store.append({
 *   streamId: 'order-123',
 *   type: 'OrderCreated',
 *   payload: { customerId: 'cust-456', total: 99.99 },
 *   expectedVersion: 0, // New stream
 * })
 *
 * // Read events from stream
 * const events = await store.readStream('order-123')
 *
 * // Check stream version
 * const version = await store.getStreamVersion('order-123')
 * ```
 */
export class EventStore implements IEventStore {
  protected readonly sql: SqlStorage
  private schemaInitialized = false

  constructor(sql: SqlStorage) {
    this.sql = sql
  }

  /**
   * Ensure the events table exists
   */
  private ensureSchema(): void {
    if (this.schemaInitialized) return

    // Execute schema creation (idempotent via IF NOT EXISTS)
    this.sql.exec(EVENT_STORE_SCHEMA_SQL)
    this.schemaInitialized = true
  }

  /**
   * Append an event to a stream with optimistic concurrency control.
   *
   * @param input - Event data to append
   * @returns The appended event and current stream version
   * @throws ConcurrencyError if expectedVersion doesn't match actual version
   */
  async append<T>(input: AppendEventInput<T>): Promise<AppendResult> {
    this.ensureSchema()

    const { streamId, type, payload, expectedVersion, metadata } = input

    // Get current version
    const currentVersion = await this.getStreamVersion(streamId)

    // Check expected version if provided
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw new ConcurrencyError(streamId, expectedVersion, currentVersion)
    }

    // Calculate next version
    const nextVersion = currentVersion + 1

    // Generate event ID and timestamp
    const id = crypto.randomUUID()
    const timestamp = Date.now()

    // Serialize payload and metadata
    const payloadJson = JSON.stringify(payload)
    const metadataJson = metadata ? JSON.stringify(metadata) : null

    // Insert event
    this.sql.exec(
      `INSERT INTO events (id, stream_id, type, version, timestamp, payload, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      id,
      streamId,
      type,
      nextVersion,
      timestamp,
      payloadJson,
      metadataJson
    )

    // Create event object
    const event: StreamDomainEvent<T> = {
      id,
      streamId,
      type,
      version: nextVersion,
      timestamp,
      payload,
      metadata,
    }

    return {
      event: event as StreamDomainEvent,
      currentVersion: nextVersion,
    }
  }

  /**
   * Read events from a stream.
   *
   * @param streamId - Stream identifier
   * @param options - Read options (fromVersion, toVersion, limit, reverse)
   * @returns Array of events in version order (or reverse order if specified)
   */
  async readStream(streamId: string, options?: ReadStreamOptions): Promise<StreamDomainEvent[]> {
    this.ensureSchema()

    const conditions: string[] = ['stream_id = ?']
    const params: unknown[] = [streamId]

    // Add version filters
    if (options?.fromVersion !== undefined) {
      conditions.push('version >= ?')
      params.push(options.fromVersion)
    }

    if (options?.toVersion !== undefined) {
      conditions.push('version <= ?')
      params.push(options.toVersion)
    }

    // Build query
    const orderDirection = options?.reverse ? 'DESC' : 'ASC'
    let query = `SELECT id, stream_id, type, version, timestamp, payload, metadata
                 FROM events
                 WHERE ${conditions.join(' AND ')}
                 ORDER BY version ${orderDirection}`

    if (options?.limit !== undefined) {
      query += ' LIMIT ?'
      params.push(options.limit)
    }

    const rows = this.sql.exec<EventRow>(query, ...params).toArray()

    return rows.map((row) => this.rowToEvent(row))
  }

  /**
   * Get the current version of a stream.
   *
   * @param streamId - Stream identifier
   * @returns Current version (0 if stream doesn't exist)
   */
  async getStreamVersion(streamId: string): Promise<number> {
    this.ensureSchema()

    const result = this.sql
      .exec<{ max_version: number | null }>(
        'SELECT MAX(version) as max_version FROM events WHERE stream_id = ?',
        streamId
      )
      .one()

    return result?.max_version ?? 0
  }

  /**
   * Check if a stream exists.
   *
   * @param streamId - Stream identifier
   * @returns true if stream has at least one event
   */
  async streamExists(streamId: string): Promise<boolean> {
    this.ensureSchema()

    const result = this.sql
      .exec<{ count: number }>('SELECT COUNT(*) as count FROM events WHERE stream_id = ? LIMIT 1', streamId)
      .one()

    return (result?.count ?? 0) > 0
  }

  /**
   * Convert a database row to a StreamDomainEvent
   */
  private rowToEvent(row: EventRow): StreamDomainEvent {
    return {
      id: row.id,
      streamId: row.stream_id,
      type: row.type,
      version: row.version,
      timestamp: row.timestamp,
      payload: JSON.parse(row.payload),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }
  }
}
