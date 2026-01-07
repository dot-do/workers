/**
 * EventsRepository - Repository for event sourcing storage
 *
 * Provides a consistent data access layer for domain events,
 * using KV storage with timestamp-based keys for ordering.
 *
 * @module events-repository
 */

import type { DOStorage } from './core'
import type { DomainEvent } from './events'
import type { IRepository, QueryOptions, FilterCondition } from './repository'

// ============================================================================
// Events Repository
// ============================================================================

/**
 * Options for querying events
 */
export interface EventQueryOptions {
  /** Get events after this timestamp */
  since?: number
  /** Filter by event type */
  type?: string
  /** Filter by aggregate ID */
  aggregateId?: string
  /** Maximum number of events to return */
  limit?: number
}

/**
 * Repository for managing domain events in KV storage.
 *
 * Events are stored with timestamp-based keys for ordered retrieval:
 * `{prefix}:{timestamp}:{id}`
 *
 * @example
 * ```typescript
 * const repo = new EventsRepository(storage, 'events')
 *
 * // Save an event
 * await repo.save({
 *   id: 'evt-123',
 *   type: 'user:created',
 *   data: { userId: '456', name: 'Alice' },
 *   timestamp: Date.now()
 * })
 *
 * // Query events
 * const events = await repo.findSince(lastKnownTimestamp)
 * ```
 */
export class EventsRepository implements IRepository<DomainEvent> {
  protected readonly storage: DOStorage
  protected readonly prefix: string
  private eventCache: DomainEvent[] = []
  private cacheLoaded = false
  private readonly maxEventsInMemory: number

  constructor(
    storage: DOStorage,
    prefix: string = 'events',
    options?: { maxEventsInMemory?: number }
  ) {
    this.storage = storage
    this.prefix = prefix
    this.maxEventsInMemory = options?.maxEventsInMemory ?? 1000
  }

  /**
   * Generate a storage key for an event (timestamp-based for ordering)
   */
  private makeEventKey(event: DomainEvent): string {
    return `${this.prefix}:${event.timestamp}:${event.id}`
  }

  /**
   * Save an event to storage and update cache
   */
  async save(event: DomainEvent): Promise<DomainEvent> {
    const key = this.makeEventKey(event)
    await this.storage.put(key, event)

    // Update cache
    this.eventCache.push(event)
    if (this.eventCache.length > this.maxEventsInMemory) {
      this.eventCache = this.eventCache.slice(-this.maxEventsInMemory)
    }

    return event
  }

  /**
   * Get event by ID (requires searching all events)
   */
  async get(id: string): Promise<DomainEvent | null> {
    await this.ensureCacheLoaded()
    return this.eventCache.find((e) => e.id === id) ?? null
  }

  /**
   * Delete event by ID
   */
  async delete(id: string): Promise<boolean> {
    const event = await this.get(id)
    if (!event) return false

    const key = this.makeEventKey(event)
    const deleted = await this.storage.delete(key)

    if (deleted) {
      this.eventCache = this.eventCache.filter((e) => e.id !== id)
    }

    return deleted
  }

  /**
   * Find events matching query options
   */
  async find(query?: QueryOptions<DomainEvent>): Promise<DomainEvent[]> {
    await this.ensureCacheLoaded()

    let events = [...this.eventCache]

    // Apply filters
    if (query?.filters) {
      for (const filter of query.filters) {
        events = events.filter((event) => {
          const value = (event as unknown as Record<string, unknown>)[filter.field]
          return this.matchesFilter(value, filter)
        })
      }
    }

    // Apply ordering (default: by timestamp ascending)
    const orderField = query?.orderBy ?? 'timestamp'
    const orderMultiplier = query?.order === 'desc' ? -1 : 1
    events.sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[orderField] as number
      const bVal = (b as unknown as Record<string, unknown>)[orderField] as number
      if (aVal < bVal) return -1 * orderMultiplier
      if (aVal > bVal) return 1 * orderMultiplier
      return 0
    })

    // Apply pagination
    const offset = query?.offset ?? 0
    const limit = query?.limit ?? events.length
    return events.slice(offset, offset + limit)
  }

  /**
   * Check if filter matches value
   */
  protected matchesFilter(value: unknown, filter: FilterCondition): boolean {
    switch (filter.operator) {
      case 'eq':
        return value === filter.value
      case 'ne':
        return value !== filter.value
      case 'gt':
        return (value as number) > (filter.value as number)
      case 'gte':
        return (value as number) >= (filter.value as number)
      case 'lt':
        return (value as number) < (filter.value as number)
      case 'lte':
        return (value as number) <= (filter.value as number)
      case 'like':
        return String(value).includes(String(filter.value))
      case 'in':
        return Array.isArray(filter.value) && filter.value.includes(value)
      default:
        return false
    }
  }

  /**
   * Find events since a timestamp with optional type/aggregate filtering
   */
  async findSince(options: EventQueryOptions = {}): Promise<DomainEvent[]> {
    await this.ensureCacheLoaded()

    let events = [...this.eventCache]

    // Filter by timestamp
    if (options.since !== undefined) {
      events = events.filter((e) => e.timestamp > options.since!)
    }

    // Filter by type
    if (options.type) {
      events = events.filter((e) => e.type === options.type)
    }

    // Filter by aggregate ID
    if (options.aggregateId) {
      events = events.filter((e) => e.aggregateId === options.aggregateId)
    }

    // Apply limit
    if (options.limit) {
      events = events.slice(0, options.limit)
    }

    return events
  }

  /**
   * Get all events (alias for find with no options)
   */
  async getAll(): Promise<DomainEvent[]> {
    return this.find()
  }

  /**
   * Count events matching optional filters
   */
  async count(query?: QueryOptions<DomainEvent>): Promise<number> {
    const events = await this.find(query)
    return events.length
  }

  /**
   * Clear all events from storage and cache
   */
  async clear(): Promise<number> {
    const entries = await this.storage.list({ prefix: `${this.prefix}:` })
    const keys = Array.from(entries.keys())

    if (keys.length > 0) {
      await this.storage.delete(keys)
    }

    this.eventCache = []
    this.cacheLoaded = true

    return keys.length
  }

  /**
   * Get the in-memory event cache (for testing/debugging)
   */
  getCache(): DomainEvent[] {
    return [...this.eventCache]
  }

  /**
   * Force reload cache from storage
   */
  async reloadCache(): Promise<void> {
    this.cacheLoaded = false
    await this.ensureCacheLoaded()
  }

  /**
   * Check if cache is loaded
   */
  isCacheLoaded(): boolean {
    return this.cacheLoaded
  }

  /**
   * Ensure event cache is loaded from storage
   */
  private async ensureCacheLoaded(): Promise<void> {
    if (this.cacheLoaded) return

    const entries = await this.storage.list<DomainEvent>({
      prefix: `${this.prefix}:`,
    })

    // Convert to array and sort by timestamp
    this.eventCache = Array.from(entries.values()).sort(
      (a, b) => a.timestamp - b.timestamp
    )

    // Trim to max size
    if (this.eventCache.length > this.maxEventsInMemory) {
      this.eventCache = this.eventCache.slice(-this.maxEventsInMemory)
    }

    this.cacheLoaded = true
  }
}
