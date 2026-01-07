/**
 * ThingsMixin - Thing Management Operations for Durable Objects
 *
 * This module provides Thing-specific operations as a mixin that can be
 * composed into DO classes. Things are the fundamental data entities
 * in the DO system, representing graph nodes with typed data.
 *
 * ## Features
 * - CRUD operations for Things (get, create, update, delete, list)
 * - Type-safe Thing management
 * - Event emission for Thing operations
 * - Search capabilities
 * - Relationship support via rowid references
 * - Repository-based storage abstraction
 *
 * ## Usage
 *
 * ```typescript
 * import { applyThingsMixin, ThingsMixin } from './things-mixin'
 *
 * class MyDO extends applyThingsMixin(DOCore) {
 *   async handleRequest(req: Request) {
 *     const thing = await this.createThing({
 *       ns: 'myapp',
 *       type: 'user',
 *       data: { name: 'John' }
 *     })
 *     return Response.json(thing)
 *   }
 * }
 * ```
 *
 * @module things-mixin
 */

import { DOCore, type DOState, type DOEnv } from './core.js'
import { ThingsRepository } from './things-repository.js'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Base Thing entity representing a graph node
 */
export interface Thing {
  /** Internal row ID for efficient relationships */
  rowid?: number
  /** Namespace for multi-tenant isolation */
  ns: string
  /** Type/collection of the thing */
  type: string
  /** Unique identifier within ns/type */
  id: string
  /** Optional URL identifier (for LinkedData compatibility) */
  url?: string
  /** The thing's data payload (JSON) */
  data: Record<string, unknown>
  /** JSON-LD context for semantic web compatibility */
  context?: string
  /** Creation timestamp (Unix ms) */
  createdAt: number
  /** Last update timestamp (Unix ms) */
  updatedAt: number
}

/**
 * Input for creating a new Thing
 */
export interface CreateThingInput {
  /** Namespace (defaults to 'default') */
  ns?: string
  /** Type/collection of the thing (required) */
  type: string
  /** Unique identifier (auto-generated if not provided) */
  id?: string
  /** Optional URL identifier */
  url?: string
  /** The thing's data payload */
  data: Record<string, unknown>
  /** JSON-LD context */
  context?: string
}

/**
 * Input for updating an existing Thing
 */
export interface UpdateThingInput {
  /** URL to update */
  url?: string
  /** Data fields to update (merged with existing) */
  data?: Record<string, unknown>
  /** JSON-LD context to update */
  context?: string
}

/**
 * Filter options for listing Things
 */
export interface ThingFilter {
  /** Filter by namespace */
  ns?: string
  /** Filter by type */
  type?: string
  /** Maximum number of results */
  limit?: number
  /** Number of results to skip */
  offset?: number
  /** Order by field */
  orderBy?: 'createdAt' | 'updatedAt' | 'id'
  /** Order direction */
  order?: 'asc' | 'desc'
}

/**
 * Search options for Things
 */
export interface ThingSearchOptions {
  /** Namespace to search within */
  ns?: string
  /** Type to search within */
  type?: string
  /** Maximum number of results */
  limit?: number
}

/**
 * Event types emitted by ThingsMixin
 */
export type ThingEventType =
  | 'thing:created'
  | 'thing:updated'
  | 'thing:deleted'

/**
 * Event payload for Thing operations
 */
export interface ThingEvent {
  type: ThingEventType
  thing: Thing
  timestamp: number
}

/**
 * Event handler function type
 */
export type ThingEventHandler = (event: ThingEvent) => void | Promise<void>

// ============================================================================
// ThingsMixin Interface
// ============================================================================

/**
 * Interface for classes that provide Things operations
 */
export interface IThingsMixin {
  // CRUD Operations
  getThing(ns: string, type: string, id: string): Promise<Thing | null>
  createThing(input: CreateThingInput): Promise<Thing>
  updateThing(ns: string, type: string, id: string, input: UpdateThingInput): Promise<Thing | null>
  deleteThing(ns: string, type: string, id: string): Promise<boolean>
  listThings(filter?: ThingFilter): Promise<Thing[]>

  // Search
  searchThings(query: string, options?: ThingSearchOptions): Promise<Thing[]>

  // Events
  onThingEvent(handler: ThingEventHandler): void
  offThingEvent(handler: ThingEventHandler): void
}

// ============================================================================
// Schema Definition for Things (re-exported from repository)
// ============================================================================

// Re-export schema SQL for compatibility
export { THINGS_SCHEMA_SQL } from './things-repository.js'

// ============================================================================
// ThingsMixin Implementation
// ============================================================================

/**
 * Constructor type for mixin application
 */
type Constructor<T = object> = new (...args: unknown[]) => T

/**
 * Base interface required by ThingsMixin
 */
interface ThingsMixinBase {
  readonly ctx: DOState
}

/**
 * Apply ThingsMixin to a base class
 *
 * This function returns a new class that extends the base class
 * with Things management capabilities.
 *
 * @param Base - The base class to extend
 * @returns A new class with Things operations
 *
 * @example
 * ```typescript
 * class MyDO extends applyThingsMixin(DOCore) {
 *   // Now has getThing, createThing, etc.
 * }
 * ```
 */
export function applyThingsMixin<TBase extends Constructor<ThingsMixinBase>>(Base: TBase) {
  return class ThingsMixin extends Base implements IThingsMixin {
    private _thingEventHandlers: Set<ThingEventHandler> = new Set()
    private _thingsRepository: ThingsRepository | null = null

    /**
     * Get or create the Things repository
     */
    private getThingsRepository(): ThingsRepository {
      if (!this._thingsRepository) {
        this._thingsRepository = new ThingsRepository(this.ctx.storage.sql)
      }
      return this._thingsRepository
    }

    /**
     * Get the Things repository for direct access if needed
     */
    protected getRepository(): ThingsRepository {
      return this.getThingsRepository()
    }

    /**
     * Emit a Thing event to all registered handlers
     */
    private async emitThingEvent(event: ThingEvent): Promise<void> {
      for (const handler of this._thingEventHandlers) {
        try {
          await handler(event)
        } catch (error) {
          console.error('Thing event handler error:', error)
        }
      }
    }

    // ========================================================================
    // CRUD Operations
    // ========================================================================

    /**
     * Get a Thing by namespace, type, and ID
     *
     * @param ns - Namespace
     * @param type - Type/collection
     * @param id - Unique identifier
     * @returns The Thing or null if not found
     */
    async getThing(ns: string, type: string, id: string): Promise<Thing | null> {
      return this.getThingsRepository().getByKey(ns, type, id)
    }

    /**
     * Create a new Thing
     *
     * @param input - Thing creation input
     * @returns The created Thing
     * @throws Error if Thing already exists
     */
    async createThing(input: CreateThingInput): Promise<Thing> {
      const repo = this.getThingsRepository()
      const thing = await repo.create(input)

      // Emit event
      await this.emitThingEvent({
        type: 'thing:created',
        thing,
        timestamp: thing.createdAt,
      })

      return thing
    }

    /**
     * Update an existing Thing
     *
     * @param ns - Namespace
     * @param type - Type/collection
     * @param id - Unique identifier
     * @param input - Update input
     * @returns The updated Thing or null if not found
     */
    async updateThing(
      ns: string,
      type: string,
      id: string,
      input: UpdateThingInput
    ): Promise<Thing | null> {
      const repo = this.getThingsRepository()
      const thing = await repo.update(ns, type, id, input)

      if (thing) {
        // Emit event
        await this.emitThingEvent({
          type: 'thing:updated',
          thing,
          timestamp: thing.updatedAt,
        })
      }

      return thing
    }

    /**
     * Delete a Thing
     *
     * @param ns - Namespace
     * @param type - Type/collection
     * @param id - Unique identifier
     * @returns true if deleted, false if not found
     */
    async deleteThing(ns: string, type: string, id: string): Promise<boolean> {
      const repo = this.getThingsRepository()

      // Get existing thing for event
      const existing = await repo.getByKey(ns, type, id)
      if (!existing) return false

      // Delete via repository
      const deleted = await repo.deleteByKey(ns, type, id)

      if (deleted) {
        // Emit event
        await this.emitThingEvent({
          type: 'thing:deleted',
          thing: existing,
          timestamp: Date.now(),
        })
      }

      return deleted
    }

    /**
     * List Things with optional filtering
     *
     * @param filter - Optional filter criteria
     * @returns Array of Things matching the filter
     */
    async listThings(filter?: ThingFilter): Promise<Thing[]> {
      return this.getThingsRepository().findThings(filter)
    }

    // ========================================================================
    // Search
    // ========================================================================

    /**
     * Search Things by text query
     *
     * @param query - Search query string
     * @param options - Search options
     * @returns Array of matching Things
     */
    async searchThings(query: string, options?: ThingSearchOptions): Promise<Thing[]> {
      return this.getThingsRepository().search(query, options)
    }

    // ========================================================================
    // Event Handling
    // ========================================================================

    /**
     * Register a handler for Thing events
     *
     * @param handler - Event handler function
     */
    onThingEvent(handler: ThingEventHandler): void {
      this._thingEventHandlers.add(handler)
    }

    /**
     * Unregister a handler for Thing events
     *
     * @param handler - Event handler function to remove
     */
    offThingEvent(handler: ThingEventHandler): void {
      this._thingEventHandlers.delete(handler)
    }
  }
}

/**
 * Type helper for the ThingsMixin result
 */
export type ThingsMixinClass<TBase extends Constructor<ThingsMixinBase>> =
  ReturnType<typeof applyThingsMixin<TBase>>

// ============================================================================
// Convenience Base Class
// ============================================================================

/**
 * ThingsBase - Convenience base class with Things operations
 *
 * Pre-composed class that extends DOCore with ThingsMixin.
 * Use this when you only need Things operations without additional mixins.
 *
 * @example
 * ```typescript
 * import { ThingsBase } from '@dotdo/do-core'
 *
 * class MyDO extends ThingsBase {
 *   async fetch(request: Request) {
 *     const thing = await this.createThing({
 *       type: 'user',
 *       data: { name: 'John' }
 *     })
 *     return Response.json(thing)
 *   }
 * }
 * ```
 */
export class ThingsBase<Env extends DOEnv = DOEnv> extends applyThingsMixin(DOCore)<Env> {
  constructor(ctx: DOState, env: Env) {
    super(ctx, env)
  }
}

