/**
 * RelationshipMixin - Cascade Operations for Durable Objects
 *
 * This mixin provides relationship cascade support for DOCore classes,
 * enabling automatic propagation of operations across related entities.
 *
 * ## Relationship Types
 *
 * - `->` (hard cascade to): Synchronous cascade to target
 * - `<-` (hard cascade from): Synchronous cascade from source
 * - `~>` (soft cascade to): Async/eventual cascade to target
 * - `<~` (soft cascade from): Async/eventual cascade from source
 *
 * ## Features
 *
 * - Define relationships between entities
 * - Automatic cascade on create/update/delete
 * - Hard cascades execute synchronously
 * - Soft cascades queue for eventual processing
 * - Configurable onDelete and onUpdate behaviors
 *
 * ## Usage
 *
 * ```typescript
 * import { RelationshipMixin } from '@dotdo/do'
 *
 * class MyDO extends RelationshipMixin(DOCore) {
 *   constructor(ctx: DOState, env: Env) {
 *     super(ctx, env)
 *
 *     // When a user is deleted, cascade delete their posts
 *     this.defineRelation('user-posts', {
 *       type: '->',
 *       targetDOBinding: 'POSTS',
 *       targetIdResolver: (user) => (user as any).id,
 *       onDelete: 'cascade',
 *     })
 *   }
 * }
 * ```
 *
 * @module relationship-mixin
 */

import type { DOEnv, DOState } from './core.js'
import { DOCore } from './core.js'

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Relationship direction and cascade type
 *
 * - `->` Hard cascade to target (synchronous)
 * - `<-` Hard cascade from source (synchronous)
 * - `~>` Soft cascade to target (eventual/queued)
 * - `<~` Soft cascade from source (eventual/queued)
 */
export type RelationshipType = '->' | '<-' | '~>' | '<~'

/**
 * Behavior when the source entity is deleted
 *
 * - `cascade`: Delete related entities
 * - `nullify`: Set foreign key to null
 * - `restrict`: Prevent deletion if related entities exist
 */
export type OnDeleteBehavior = 'cascade' | 'nullify' | 'restrict'

/**
 * Behavior when the source entity is updated
 *
 * - `cascade`: Propagate updates to related entities
 * - `ignore`: Do not propagate updates
 */
export type OnUpdateBehavior = 'cascade' | 'ignore'

/**
 * Operation types that can trigger cascades
 */
export type CascadeOperation = 'create' | 'update' | 'delete'

/**
 * Complete relationship definition
 */
export interface RelationshipDefinition {
  /**
   * Type of relationship and cascade behavior
   * - `->` Hard cascade to target (synchronous)
   * - `<-` Hard cascade from source (synchronous)
   * - `~>` Soft cascade to target (eventual/queued)
   * - `<~` Soft cascade from source (eventual/queued)
   */
  type: RelationshipType

  /**
   * Name of the Durable Object binding for the target
   * e.g., 'POSTS_DO', 'COMMENTS_DO'
   */
  targetDOBinding: string

  /**
   * Function to extract the target DO id from the source entity
   * @param entity - The source entity
   * @returns The ID to use for the target DO
   */
  targetIdResolver: (entity: unknown) => string

  /**
   * Fields to cascade when updating
   * If not specified, all changed fields are cascaded
   */
  cascadeFields?: string[]

  /**
   * Behavior when source entity is deleted
   * @default 'cascade'
   */
  onDelete?: OnDeleteBehavior

  /**
   * Behavior when source entity is updated
   * @default 'cascade'
   */
  onUpdate?: OnUpdateBehavior
}

/**
 * Registered relationship with name
 */
interface RegisteredRelationship {
  name: string
  definition: RelationshipDefinition
}

/**
 * Queued cascade operation for soft cascades
 */
export interface QueuedCascade {
  /** Unique ID for this cascade operation */
  id: string
  /** Relationship name */
  relationshipName: string
  /** Operation that triggered the cascade */
  operation: CascadeOperation
  /** Source entity data */
  entity: unknown
  /** Target DO ID */
  targetId: string
  /** Timestamp when queued */
  queuedAt: number
  /** Number of retry attempts */
  retryCount: number
}

/**
 * Result of a cascade operation
 */
export interface CascadeResult {
  /** Relationship name */
  relationshipName: string
  /** Whether the cascade was successful */
  success: boolean
  /** Whether this was a hard or soft cascade */
  isHard: boolean
  /** Target DO ID */
  targetId: string
  /** Error message if failed */
  error?: string
  /** Duration in milliseconds */
  durationMs: number
}

/**
 * Event types for cascade operations
 */
export type CascadeEventType =
  | 'cascade:started'
  | 'cascade:completed'
  | 'cascade:failed'
  | 'cascade:queued'

/**
 * Cascade event payload
 */
export interface CascadeEvent {
  type: CascadeEventType
  relationshipName: string
  operation: CascadeOperation
  entity: unknown
  targetId: string
  timestamp: number
  error?: string
}

/**
 * Handler function for cascade events
 */
export type CascadeEventHandler = (event: CascadeEvent) => void | Promise<void>

/**
 * Interface for classes that implement RelationshipMixin
 */
export interface IRelationshipMixin {
  // Relationship definition
  defineRelation(name: string, definition: RelationshipDefinition): void
  undefineRelation(name: string): boolean
  hasRelation(name: string): boolean
  getRelation(name: string): RelationshipDefinition | undefined
  listRelations(): RegisteredRelationship[]

  // Cascade operations
  triggerCascade(operation: CascadeOperation, entity: unknown): Promise<CascadeResult[]>
  processSoftCascades(): Promise<CascadeResult[]>
  getQueuedCascades(): Promise<QueuedCascade[]>

  // Events
  onCascadeEvent(handler: CascadeEventHandler): void
  offCascadeEvent(handler: CascadeEventHandler): void
}

// ============================================================================
// Storage Keys
// ============================================================================

const CASCADE_QUEUE_PREFIX = '__cascade_queue:'

// ============================================================================
// RelationshipMixin Implementation
// ============================================================================

/**
 * Constructor type for mixin application
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Constructor<T = object> = new (...args: any[]) => T

/**
 * Base interface required by RelationshipMixin
 */
interface RelationshipMixinBase {
  readonly ctx: DOState
  readonly env: DOEnv
}

/**
 * Apply RelationshipMixin to a base class
 *
 * This function returns a new class that extends the base class
 * with relationship cascade capabilities.
 *
 * @param Base - The base class to extend
 * @returns A new class with relationship cascade operations
 *
 * @example
 * ```typescript
 * class MyDO extends applyRelationshipMixin(DOCore) {
 *   // Now has defineRelation, triggerCascade, etc.
 * }
 * ```
 */
export function applyRelationshipMixin<TBase extends Constructor<RelationshipMixinBase>>(
  Base: TBase
) {
  return class RelationshipMixin extends Base implements IRelationshipMixin {
    /** Registered relationships by name */
    private _relationships: Map<string, RelationshipDefinition> = new Map()

    /** Event handlers for cascade events */
    private _cascadeEventHandlers: Set<CascadeEventHandler> = new Set()

    // ========================================================================
    // Relationship Definition
    // ========================================================================

    /**
     * Define a relationship with cascade behavior
     *
     * @param name - Unique name for this relationship
     * @param definition - Relationship definition
     *
     * @example
     * ```typescript
     * this.defineRelation('user-posts', {
     *   type: '->',
     *   targetDOBinding: 'POSTS',
     *   targetIdResolver: (user) => (user as User).id,
     *   onDelete: 'cascade',
     * })
     * ```
     */
    defineRelation(name: string, definition: RelationshipDefinition): void {
      // Validate definition
      if (!definition.type || !['->','<-','~>','<~'].includes(definition.type)) {
        throw new Error(`Invalid relationship type: ${definition.type}`)
      }
      if (!definition.targetDOBinding) {
        throw new Error('targetDOBinding is required')
      }
      if (typeof definition.targetIdResolver !== 'function') {
        throw new Error('targetIdResolver must be a function')
      }

      this._relationships.set(name, {
        ...definition,
        onDelete: definition.onDelete ?? 'cascade',
        onUpdate: definition.onUpdate ?? 'cascade',
      })
    }

    /**
     * Remove a relationship definition
     *
     * @param name - Name of the relationship to remove
     * @returns true if the relationship was removed
     */
    undefineRelation(name: string): boolean {
      return this._relationships.delete(name)
    }

    /**
     * Check if a relationship is defined
     *
     * @param name - Name of the relationship
     * @returns true if the relationship exists
     */
    hasRelation(name: string): boolean {
      return this._relationships.has(name)
    }

    /**
     * Get a relationship definition
     *
     * @param name - Name of the relationship
     * @returns The relationship definition or undefined
     */
    getRelation(name: string): RelationshipDefinition | undefined {
      return this._relationships.get(name)
    }

    /**
     * List all registered relationships
     *
     * @returns Array of registered relationships with names
     */
    listRelations(): RegisteredRelationship[] {
      const result: RegisteredRelationship[] = []
      for (const [name, definition] of this._relationships) {
        result.push({ name, definition })
      }
      return result
    }

    // ========================================================================
    // Cascade Operations
    // ========================================================================

    /**
     * Check if a relationship type is a hard cascade (synchronous)
     */
    private isHardCascade(type: RelationshipType): boolean {
      return type === '->' || type === '<-'
    }

    /**
     * Emit a cascade event to all registered handlers
     */
    private async emitCascadeEvent(event: CascadeEvent): Promise<void> {
      for (const handler of this._cascadeEventHandlers) {
        try {
          await handler(event)
        } catch (error) {
          console.error('Cascade event handler error:', error)
        }
      }
    }

    /**
     * Queue a soft cascade for later processing
     */
    private async queueSoftCascade(
      relationshipName: string,
      operation: CascadeOperation,
      entity: unknown,
      targetId: string
    ): Promise<void> {
      const queuedCascade: QueuedCascade = {
        id: crypto.randomUUID(),
        relationshipName,
        operation,
        entity,
        targetId,
        queuedAt: Date.now(),
        retryCount: 0,
      }

      const key = `${CASCADE_QUEUE_PREFIX}${queuedCascade.id}`
      await this.ctx.storage.put(key, queuedCascade)

      await this.emitCascadeEvent({
        type: 'cascade:queued',
        relationshipName,
        operation,
        entity,
        targetId,
        timestamp: Date.now(),
      })
    }

    /**
     * Execute a hard cascade synchronously
     */
    private async executeHardCascade(
      relationshipName: string,
      definition: RelationshipDefinition,
      operation: CascadeOperation,
      entity: unknown,
      targetId: string
    ): Promise<CascadeResult> {
      const startTime = Date.now()

      await this.emitCascadeEvent({
        type: 'cascade:started',
        relationshipName,
        operation,
        entity,
        targetId,
        timestamp: startTime,
      })

      try {
        // Get the target DO binding from env
        const doNamespace = this.env[definition.targetDOBinding] as DurableObjectNamespace | undefined
        if (!doNamespace) {
          throw new Error(`DO binding not found: ${definition.targetDOBinding}`)
        }

        // Get the target DO stub
        const targetDoId = doNamespace.idFromName(targetId)
        const targetStub = doNamespace.get(targetDoId)

        // Build the cascade request based on operation and behavior
        let cascadeAction: string
        let cascadePayload: unknown

        if (operation === 'delete') {
          switch (definition.onDelete) {
            case 'cascade':
              cascadeAction = 'cascade-delete'
              cascadePayload = { sourceEntity: entity }
              break
            case 'nullify':
              cascadeAction = 'cascade-nullify'
              cascadePayload = { sourceEntity: entity, fields: definition.cascadeFields }
              break
            case 'restrict':
              // For restrict, we check if cascade should be prevented
              cascadeAction = 'cascade-check-restrict'
              cascadePayload = { sourceEntity: entity }
              break
            default:
              cascadeAction = 'cascade-delete'
              cascadePayload = { sourceEntity: entity }
          }
        } else if (operation === 'update') {
          if (definition.onUpdate === 'cascade') {
            cascadeAction = 'cascade-update'
            cascadePayload = {
              sourceEntity: entity,
              fields: definition.cascadeFields,
            }
          } else {
            // onUpdate: 'ignore' - no cascade needed
            return {
              relationshipName,
              success: true,
              isHard: true,
              targetId,
              durationMs: Date.now() - startTime,
            }
          }
        } else {
          // create operation
          cascadeAction = 'cascade-create'
          cascadePayload = { sourceEntity: entity }
        }

        // Send the cascade request to the target DO
        const response = await targetStub.fetch(
          new Request('http://internal/__cascade', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Cascade-Action': cascadeAction,
              'X-Cascade-Relationship': relationshipName,
            },
            body: JSON.stringify(cascadePayload),
          })
        )

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Cascade failed: ${response.status} - ${errorText}`)
        }

        const durationMs = Date.now() - startTime

        await this.emitCascadeEvent({
          type: 'cascade:completed',
          relationshipName,
          operation,
          entity,
          targetId,
          timestamp: Date.now(),
        })

        return {
          relationshipName,
          success: true,
          isHard: true,
          targetId,
          durationMs,
        }
      } catch (error) {
        const durationMs = Date.now() - startTime
        const errorMessage = error instanceof Error ? error.message : String(error)

        await this.emitCascadeEvent({
          type: 'cascade:failed',
          relationshipName,
          operation,
          entity,
          targetId,
          timestamp: Date.now(),
          error: errorMessage,
        })

        return {
          relationshipName,
          success: false,
          isHard: true,
          targetId,
          error: errorMessage,
          durationMs,
        }
      }
    }

    /**
     * Trigger cascade operations for an entity operation
     *
     * Hard cascades (`->` and `<-`) execute synchronously.
     * Soft cascades (`~>` and `<~`) are queued for eventual processing.
     *
     * @param operation - The operation that triggered the cascade
     * @param entity - The entity involved in the operation
     * @returns Results from hard cascades (soft cascades return immediately as queued)
     *
     * @example
     * ```typescript
     * // After deleting a user
     * const results = await this.triggerCascade('delete', deletedUser)
     * const failed = results.filter(r => !r.success)
     * if (failed.length > 0) {
     *   console.error('Some cascades failed:', failed)
     * }
     * ```
     */
    async triggerCascade(
      operation: CascadeOperation,
      entity: unknown
    ): Promise<CascadeResult[]> {
      const results: CascadeResult[] = []

      for (const [name, definition] of this._relationships) {
        // Resolve target ID
        let targetId: string
        try {
          targetId = definition.targetIdResolver(entity)
        } catch (error) {
          results.push({
            relationshipName: name,
            success: false,
            isHard: this.isHardCascade(definition.type),
            targetId: 'unknown',
            error: `Failed to resolve target ID: ${error instanceof Error ? error.message : String(error)}`,
            durationMs: 0,
          })
          continue
        }

        // Check if we should skip based on operation and behavior
        if (operation === 'update' && definition.onUpdate === 'ignore') {
          continue
        }

        if (this.isHardCascade(definition.type)) {
          // Execute hard cascade synchronously
          const result = await this.executeHardCascade(
            name,
            definition,
            operation,
            entity,
            targetId
          )
          results.push(result)

          // If restrict mode and cascade-check failed, we should throw
          if (operation === 'delete' && definition.onDelete === 'restrict' && !result.success) {
            throw new Error(`Delete restricted by relationship '${name}': related entities exist`)
          }
        } else {
          // Queue soft cascade for eventual processing
          await this.queueSoftCascade(name, operation, entity, targetId)
          results.push({
            relationshipName: name,
            success: true,
            isHard: false,
            targetId,
            durationMs: 0,
          })
        }
      }

      return results
    }

    /**
     * Process queued soft cascades
     *
     * This should be called periodically (e.g., in an alarm handler)
     * to process soft cascades that were queued for eventual processing.
     *
     * @returns Results from processed cascades
     *
     * @example
     * ```typescript
     * async alarm() {
     *   const results = await this.processSoftCascades()
     *   // Re-schedule if there are more to process
     *   const remaining = await this.getQueuedCascades()
     *   if (remaining.length > 0) {
     *     await this.ctx.storage.setAlarm(Date.now() + 1000)
     *   }
     * }
     * ```
     */
    async processSoftCascades(): Promise<CascadeResult[]> {
      const results: CascadeResult[] = []
      const queued = await this.getQueuedCascades()

      for (const cascade of queued) {
        const definition = this._relationships.get(cascade.relationshipName)
        if (!definition) {
          // Relationship no longer exists, remove from queue
          await this.ctx.storage.delete(`${CASCADE_QUEUE_PREFIX}${cascade.id}`)
          continue
        }

        // Execute the cascade (using hard cascade execution logic)
        const result = await this.executeHardCascade(
          cascade.relationshipName,
          definition,
          cascade.operation,
          cascade.entity,
          cascade.targetId
        )

        if (result.success) {
          // Remove from queue on success
          await this.ctx.storage.delete(`${CASCADE_QUEUE_PREFIX}${cascade.id}`)
        } else {
          // Increment retry count and keep in queue
          cascade.retryCount++
          await this.ctx.storage.put(`${CASCADE_QUEUE_PREFIX}${cascade.id}`, cascade)
        }

        // Mark as soft cascade in result
        results.push({
          ...result,
          isHard: false,
        })
      }

      return results
    }

    /**
     * Get all queued soft cascades
     *
     * @returns Array of queued cascade operations
     */
    async getQueuedCascades(): Promise<QueuedCascade[]> {
      const entries = await this.ctx.storage.list<QueuedCascade>({
        prefix: CASCADE_QUEUE_PREFIX,
      })
      return Array.from(entries.values())
    }

    // ========================================================================
    // Event Handling
    // ========================================================================

    /**
     * Register a handler for cascade events
     *
     * @param handler - Event handler function
     */
    onCascadeEvent(handler: CascadeEventHandler): void {
      this._cascadeEventHandlers.add(handler)
    }

    /**
     * Unregister a handler for cascade events
     *
     * @param handler - Event handler function to remove
     */
    offCascadeEvent(handler: CascadeEventHandler): void {
      this._cascadeEventHandlers.delete(handler)
    }
  }
}

/**
 * Type helper for the RelationshipMixin result
 */
export type RelationshipMixinClass<TBase extends Constructor<RelationshipMixinBase>> =
  ReturnType<typeof applyRelationshipMixin<TBase>>

// ============================================================================
// Convenience Base Class
// ============================================================================

/**
 * RelationshipBase - Convenience base class with Relationship operations
 *
 * Pre-composed class that extends DOCore with RelationshipMixin.
 * Use this when you only need relationship operations without additional mixins.
 *
 * @example
 * ```typescript
 * import { RelationshipBase } from '@dotdo/do'
 *
 * class MyDO extends RelationshipBase {
 *   constructor(ctx: DOState, env: Env) {
 *     super(ctx, env)
 *     this.defineRelation('user-posts', {
 *       type: '->',
 *       targetDOBinding: 'POSTS',
 *       targetIdResolver: (user) => (user as any).id,
 *       onDelete: 'cascade',
 *     })
 *   }
 * }
 * ```
 */
export class RelationshipBase<Env extends DOEnv = DOEnv> extends applyRelationshipMixin(DOCore)<Env> {
  constructor(ctx: DOState, env: Env) {
    super(ctx, env)
  }
}

// ============================================================================
// Durable Object Namespace Type (for type safety)
// ============================================================================

/**
 * Interface for Durable Object namespace binding
 * Used for type-safe access to DO bindings in env
 */
interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId
  idFromString(hexId: string): DurableObjectId
  newUniqueId(): DurableObjectId
  get(id: DurableObjectId): DurableObjectStub
}

interface DurableObjectId {
  toString(): string
  equals(other: DurableObjectId): boolean
}

interface DurableObjectStub {
  fetch(request: Request): Promise<Response>
}
