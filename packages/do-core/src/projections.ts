/**
 * Projections - CQRS read model system for event sourcing
 *
 * Projections transform event streams into queryable read models.
 * Each projection tracks its position in the event stream and can be rebuilt.
 *
 * @module projections
 */

import type { DomainEvent } from './events.js'
import type { DOStorage } from './core.js'

// ============================================================================
// Types and Interfaces
// ============================================================================

/**
 * Handler function that processes an event and updates projection state
 */
export type ProjectionHandler<TEventData = unknown, TState = unknown> = (
  event: DomainEvent<TEventData>,
  state: TState
) => TState | Promise<TState>

/**
 * Options for creating a projection
 */
export interface ProjectionOptions<TState> {
  /** Factory function to create initial state */
  initialState: () => TState
  /** Optional storage for persisting projection position */
  storage?: DOStorage
}

/**
 * Read-only view of projection state
 */
export type ProjectionState<TState> = Readonly<TState>

// ============================================================================
// Projection Class
// ============================================================================

/**
 * A projection that transforms events into a read model.
 *
 * Projections:
 * - Register handlers for specific event types
 * - Apply events to build/update state
 * - Track position in event stream for catch-up
 * - Support full rebuilds from event history
 *
 * @example
 * ```typescript
 * const userProjection = new Projection<Map<string, User>>('users', {
 *   initialState: () => new Map(),
 * })
 *
 * userProjection.when<UserCreatedEvent>('user:created', (event, state) => {
 *   state.set(event.data.userId, {
 *     id: event.data.userId,
 *     name: event.data.name,
 *   })
 *   return state
 * })
 *
 * await userProjection.apply(event)
 * const users = userProjection.getState()
 * ```
 */
export class Projection<TState = unknown> {
  readonly name: string

  /** Factory to create initial state */
  private readonly initialState: () => TState

  /** Optional storage for persistence */
  private readonly storage?: DOStorage

  /** Current projection state */
  private state: TState

  /** Current position (timestamp of last processed event) */
  private position: number = 0

  /** Registered handlers by event type */
  private readonly handlers: Map<string, ProjectionHandler<unknown, TState>> = new Map()

  constructor(name: string, options: ProjectionOptions<TState>) {
    this.name = name
    this.initialState = options.initialState
    this.storage = options.storage
    this.state = this.initialState()
  }

  /**
   * Register a handler for a specific event type
   */
  when<TEventData = unknown>(
    eventType: string,
    handler: ProjectionHandler<TEventData, TState>
  ): this {
    if (this.handlers.has(eventType)) {
      throw new Error(`Handler for event type '${eventType}' already registered`)
    }
    this.handlers.set(eventType, handler as ProjectionHandler<unknown, TState>)
    return this
  }

  /**
   * Get all registered handlers
   */
  getHandlers(): Record<string, ProjectionHandler> {
    const result: Record<string, ProjectionHandler> = {}
    for (const [eventType, handler] of this.handlers) {
      result[eventType] = handler as ProjectionHandler
    }
    return result
  }

  /**
   * Get the number of registered handlers
   */
  getHandlerCount(): number {
    return this.handlers.size
  }

  /**
   * Apply a single event to update projection state
   */
  async apply<TEventData = unknown>(event: DomainEvent<TEventData>): Promise<void> {
    const handler = this.handlers.get(event.type)
    if (handler) {
      const result = handler(event as DomainEvent<unknown>, this.state)
      this.state = result instanceof Promise ? await result : result
    }
    // Update position to the event's timestamp
    this.position = event.timestamp
  }

  /**
   * Apply multiple events in batch
   */
  async applyBatch<TEventData = unknown>(events: DomainEvent<TEventData>[]): Promise<void> {
    for (const event of events) {
      await this.apply(event)
    }
  }

  /**
   * Get the current projection state
   */
  getState(): TState {
    return this.state
  }

  /**
   * Get a read-only view of the state
   */
  getReadOnlyState(): ProjectionState<TState> {
    // Return a shallow copy for primitive objects, or the state itself
    // This provides some protection against accidental mutation
    if (this.state === null || typeof this.state !== 'object') {
      return this.state as ProjectionState<TState>
    }
    if (this.state instanceof Map || this.state instanceof Set) {
      return this.state as ProjectionState<TState>
    }
    // For plain objects, return a shallow copy
    return { ...this.state } as ProjectionState<TState>
  }

  /**
   * Get the current position (timestamp of last processed event)
   */
  getPosition(): number {
    return this.position
  }

  /**
   * Catch up by processing events since last position
   */
  async catchUp<TEventData = unknown>(events: DomainEvent<TEventData>[]): Promise<void> {
    await this.applyBatch(events)
  }

  /**
   * Save the current position to storage
   */
  async savePosition(): Promise<void> {
    if (this.storage) {
      await this.storage.put(`projection:${this.name}:position`, this.position)
    }
  }

  /**
   * Load the position from storage
   */
  async loadPosition(): Promise<void> {
    if (this.storage) {
      const savedPosition = await this.storage.get<number>(`projection:${this.name}:position`)
      if (savedPosition !== undefined) {
        this.position = savedPosition
      }
    }
  }

  /**
   * Rebuild projection from scratch using provided events
   */
  async rebuild<TEventData = unknown>(events: DomainEvent<TEventData>[]): Promise<void> {
    // Reset to initial state
    this.state = this.initialState()
    this.position = 0
    // Apply all events
    await this.applyBatch(events)
  }
}

// ============================================================================
// ProjectionRegistry Class
// ============================================================================

/**
 * Registry for managing multiple projections.
 *
 * Allows:
 * - Registering projections by name
 * - Applying events to all projections
 * - Rebuilding all projections from event history
 *
 * @example
 * ```typescript
 * const registry = new ProjectionRegistry()
 * registry.register(userProjection)
 * registry.register(orderProjection)
 *
 * // Apply event to all projections
 * await registry.applyToAll(event)
 *
 * // Rebuild all from history
 * await registry.rebuildAll(allEvents)
 * ```
 */
export class ProjectionRegistry {
  /** Registered projections by name */
  private readonly projections: Map<string, Projection<unknown>> = new Map()

  constructor() {
    // Initialize empty registry
  }

  /**
   * Register a projection
   */
  register<TState>(projection: Projection<TState>): void {
    this.projections.set(projection.name, projection as Projection<unknown>)
  }

  /**
   * Get a projection by name
   */
  get<TState = unknown>(name: string): Projection<TState> | undefined {
    return this.projections.get(name) as Projection<TState> | undefined
  }

  /**
   * Get all registered projection names
   */
  getNames(): string[] {
    return Array.from(this.projections.keys())
  }

  /**
   * Apply an event to all registered projections
   */
  async applyToAll<TEventData = unknown>(event: DomainEvent<TEventData>): Promise<void> {
    for (const projection of this.projections.values()) {
      await projection.apply(event)
    }
  }

  /**
   * Rebuild all projections from event history
   */
  async rebuildAll<TEventData = unknown>(events: DomainEvent<TEventData>[]): Promise<void> {
    for (const projection of this.projections.values()) {
      await projection.rebuild(events)
    }
  }
}
