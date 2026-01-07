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
import { DOCore } from './core.js';
import { ThingsRepository } from './things-repository.js';
// ============================================================================
// Schema Definition for Things (re-exported from repository)
// ============================================================================
// Re-export schema SQL for compatibility
export { THINGS_SCHEMA_SQL } from './things-repository.js';
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
export function applyThingsMixin(Base) {
    return class ThingsMixin extends Base {
        _thingEventHandlers = new Set();
        _thingsRepository = null;
        /**
         * Get or create the Things repository
         */
        getThingsRepository() {
            if (!this._thingsRepository) {
                this._thingsRepository = new ThingsRepository(this.ctx.storage.sql);
            }
            return this._thingsRepository;
        }
        /**
         * Get the Things repository for direct access if needed
         */
        getRepository() {
            return this.getThingsRepository();
        }
        /**
         * Emit a Thing event to all registered handlers
         */
        async emitThingEvent(event) {
            for (const handler of this._thingEventHandlers) {
                try {
                    await handler(event);
                }
                catch (error) {
                    console.error('Thing event handler error:', error);
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
        async getThing(ns, type, id) {
            return this.getThingsRepository().getByKey(ns, type, id);
        }
        /**
         * Create a new Thing
         *
         * @param input - Thing creation input
         * @returns The created Thing
         * @throws Error if Thing already exists
         */
        async createThing(input) {
            const repo = this.getThingsRepository();
            const thing = await repo.create(input);
            // Emit event
            await this.emitThingEvent({
                type: 'thing:created',
                thing,
                timestamp: thing.createdAt,
            });
            return thing;
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
        async updateThing(ns, type, id, input) {
            const repo = this.getThingsRepository();
            const thing = await repo.update(ns, type, id, input);
            if (thing) {
                // Emit event
                await this.emitThingEvent({
                    type: 'thing:updated',
                    thing,
                    timestamp: thing.updatedAt,
                });
            }
            return thing;
        }
        /**
         * Delete a Thing
         *
         * @param ns - Namespace
         * @param type - Type/collection
         * @param id - Unique identifier
         * @returns true if deleted, false if not found
         */
        async deleteThing(ns, type, id) {
            const repo = this.getThingsRepository();
            // Get existing thing for event
            const existing = await repo.getByKey(ns, type, id);
            if (!existing)
                return false;
            // Delete via repository
            const deleted = await repo.deleteByKey(ns, type, id);
            if (deleted) {
                // Emit event
                await this.emitThingEvent({
                    type: 'thing:deleted',
                    thing: existing,
                    timestamp: Date.now(),
                });
            }
            return deleted;
        }
        /**
         * List Things with optional filtering
         *
         * @param filter - Optional filter criteria
         * @returns Array of Things matching the filter
         */
        async listThings(filter) {
            return this.getThingsRepository().findThings(filter);
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
        async searchThings(query, options) {
            return this.getThingsRepository().search(query, options);
        }
        // ========================================================================
        // Event Handling
        // ========================================================================
        /**
         * Register a handler for Thing events
         *
         * @param handler - Event handler function
         */
        onThingEvent(handler) {
            this._thingEventHandlers.add(handler);
        }
        /**
         * Unregister a handler for Thing events
         *
         * @param handler - Event handler function to remove
         */
        offThingEvent(handler) {
            this._thingEventHandlers.delete(handler);
        }
    };
}
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
export class ThingsBase extends applyThingsMixin(DOCore) {
    constructor(ctx, env) {
        super(ctx, env);
    }
}
