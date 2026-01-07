/**
 * Repository Pattern Implementation for Durable Objects
 *
 * Provides a consistent data access layer abstraction for DO storage.
 * Repositories encapsulate storage operations and provide:
 * - Consistent interface across different storage backends (KV, SQL)
 * - Transaction support via unit of work pattern
 * - Query building and filtering
 * - Type-safe data access
 *
 * @module repository
 */

import type { DOStorage, SqlStorage } from './core'

// ============================================================================
// Query Types
// ============================================================================

/**
 * Query filter operators
 */
export type FilterOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'like' | 'in'

/**
 * Single filter condition
 */
export interface FilterCondition<T = unknown> {
  field: string
  operator: FilterOperator
  value: T
}

/**
 * Query options for repository operations
 */
export interface QueryOptions<T = unknown> {
  /** Filter conditions (AND logic) */
  filters?: FilterCondition<T>[]
  /** Order by field */
  orderBy?: string
  /** Order direction */
  order?: 'asc' | 'desc'
  /** Maximum results */
  limit?: number
  /** Results to skip */
  offset?: number
}

/**
 * Query builder for fluent query construction
 */
export class Query<T> {
  private _filters: FilterCondition[] = []
  private _orderBy?: string
  private _order: 'asc' | 'desc' = 'desc'
  private _limit?: number
  private _offset?: number

  /**
   * Add an equality filter
   */
  where(field: keyof T & string, value: unknown): this {
    this._filters.push({ field, operator: 'eq', value })
    return this
  }

  /**
   * Add a comparison filter
   */
  whereOp(field: keyof T & string, operator: FilterOperator, value: unknown): this {
    this._filters.push({ field, operator, value })
    return this
  }

  /**
   * Set order by field
   */
  orderBy(field: keyof T & string, order: 'asc' | 'desc' = 'desc'): this {
    this._orderBy = field
    this._order = order
    return this
  }

  /**
   * Set result limit
   */
  limit(n: number): this {
    this._limit = n
    return this
  }

  /**
   * Set result offset
   */
  offset(n: number): this {
    this._offset = n
    return this
  }

  /**
   * Build query options
   */
  build(): QueryOptions {
    return {
      filters: this._filters.length > 0 ? this._filters : undefined,
      orderBy: this._orderBy,
      order: this._order,
      limit: this._limit,
      offset: this._offset,
    }
  }
}

// ============================================================================
// Repository Interface
// ============================================================================

/**
 * Base repository interface defining the data access contract.
 *
 * All repositories must implement these core operations.
 * Type parameter T represents the entity type being stored.
 *
 * @example
 * ```typescript
 * interface User { id: string; name: string; email: string }
 *
 * class UserRepository implements IRepository<User> {
 *   async get(id: string): Promise<User | null> { ... }
 *   async save(entity: User): Promise<User> { ... }
 *   async delete(id: string): Promise<boolean> { ... }
 *   async find(query: QueryOptions<User>): Promise<User[]> { ... }
 * }
 * ```
 */
export interface IRepository<T> {
  /**
   * Get a single entity by ID
   *
   * @param id - Entity identifier
   * @returns The entity or null if not found
   */
  get(id: string): Promise<T | null>

  /**
   * Save (create or update) an entity
   *
   * @param entity - Entity to save
   * @returns The saved entity
   */
  save(entity: T): Promise<T>

  /**
   * Delete an entity by ID
   *
   * @param id - Entity identifier
   * @returns true if deleted, false if not found
   */
  delete(id: string): Promise<boolean>

  /**
   * Find entities matching query criteria
   *
   * @param query - Query options for filtering and pagination
   * @returns Array of matching entities
   */
  find(query?: QueryOptions<T>): Promise<T[]>
}

/**
 * Extended repository interface with batch operations
 */
export interface IBatchRepository<T> extends IRepository<T> {
  /**
   * Get multiple entities by IDs
   *
   * @param ids - Array of entity identifiers
   * @returns Map of id to entity (missing entities not included)
   */
  getMany(ids: string[]): Promise<Map<string, T>>

  /**
   * Save multiple entities
   *
   * @param entities - Array of entities to save
   * @returns Array of saved entities
   */
  saveMany(entities: T[]): Promise<T[]>

  /**
   * Delete multiple entities by IDs
   *
   * @param ids - Array of entity identifiers
   * @returns Number of entities deleted
   */
  deleteMany(ids: string[]): Promise<number>

  /**
   * Count entities matching query criteria
   *
   * @param query - Optional query options for filtering
   * @returns Number of matching entities
   */
  count(query?: QueryOptions<T>): Promise<number>
}

// ============================================================================
// Storage Providers
// ============================================================================

/**
 * Storage provider for KV-based repositories
 */
export interface KVStorageProvider {
  storage: DOStorage
  prefix: string
}

/**
 * Storage provider for SQL-based repositories
 */
export interface SQLStorageProvider {
  sql: SqlStorage
  tableName: string
}

// ============================================================================
// Base KV Repository
// ============================================================================

/**
 * Entity with required ID field for KV storage
 */
export interface KVEntity {
  id: string
  [key: string]: unknown
}

/**
 * Base repository implementation for KV storage.
 *
 * Provides CRUD operations using Durable Object KV storage
 * with prefix-based namespacing.
 *
 * @example
 * ```typescript
 * interface Event { id: string; type: string; data: unknown; timestamp: number }
 *
 * class EventRepository extends BaseKVRepository<Event> {
 *   constructor(storage: DOStorage) {
 *     super(storage, 'events')
 *   }
 *
 *   protected getId(entity: Event): string {
 *     return entity.id
 *   }
 * }
 * ```
 */
export abstract class BaseKVRepository<T extends KVEntity> implements IBatchRepository<T> {
  protected readonly storage: DOStorage
  protected readonly prefix: string

  constructor(storage: DOStorage, prefix: string) {
    this.storage = storage
    this.prefix = prefix
  }

  /**
   * Generate storage key from entity ID
   */
  protected makeKey(id: string): string {
    return `${this.prefix}:${id}`
  }

  /**
   * Extract entity ID from storage key
   */
  protected extractId(key: string): string {
    return key.replace(`${this.prefix}:`, '')
  }

  /**
   * Get entity ID from entity (for polymorphism)
   * Subclasses can override for custom ID extraction
   */
  protected getId(entity: T): string {
    return entity.id
  }

  async get(id: string): Promise<T | null> {
    const key = this.makeKey(id)
    const entity = await this.storage.get<T>(key)
    return entity ?? null
  }

  async save(entity: T): Promise<T> {
    const id = this.getId(entity)
    const key = this.makeKey(id)
    await this.storage.put(key, entity)
    return entity
  }

  async delete(id: string): Promise<boolean> {
    const key = this.makeKey(id)
    return this.storage.delete(key)
  }

  async find(query?: QueryOptions<T>): Promise<T[]> {
    const entries = await this.storage.list<T>({ prefix: `${this.prefix}:` })
    let results = Array.from(entries.values())

    // Apply filters
    if (query?.filters) {
      for (const filter of query.filters) {
        results = results.filter((entity) => {
          const value = (entity as Record<string, unknown>)[filter.field]
          return this.matchesFilter(value, filter)
        })
      }
    }

    // Apply ordering
    if (query?.orderBy) {
      const orderField = query.orderBy
      const orderMultiplier = query.order === 'asc' ? 1 : -1
      results.sort((a, b) => {
        const aVal = (a as Record<string, unknown>)[orderField] as number | string
        const bVal = (b as Record<string, unknown>)[orderField] as number | string
        if (aVal < bVal) return -1 * orderMultiplier
        if (aVal > bVal) return 1 * orderMultiplier
        return 0
      })
    }

    // Apply pagination
    const offset = query?.offset ?? 0
    const limit = query?.limit ?? results.length
    return results.slice(offset, offset + limit)
  }

  async getMany(ids: string[]): Promise<Map<string, T>> {
    const keys = ids.map((id) => this.makeKey(id))
    const entries = await this.storage.get<T>(keys)

    const result = new Map<string, T>()
    for (const [key, value] of entries) {
      const id = this.extractId(key)
      result.set(id, value)
    }
    return result
  }

  async saveMany(entities: T[]): Promise<T[]> {
    const entries: Record<string, T> = {}
    for (const entity of entities) {
      const id = this.getId(entity)
      const key = this.makeKey(id)
      entries[key] = entity
    }
    await this.storage.put(entries)
    return entities
  }

  async deleteMany(ids: string[]): Promise<number> {
    const keys = ids.map((id) => this.makeKey(id))
    return this.storage.delete(keys)
  }

  async count(query?: QueryOptions<T>): Promise<number> {
    const entities = await this.find(query)
    return entities.length
  }

  /**
   * Clear all entities in this repository
   */
  async clear(): Promise<number> {
    const entries = await this.storage.list({ prefix: `${this.prefix}:` })
    const keys = Array.from(entries.keys())
    if (keys.length === 0) return 0
    return this.storage.delete(keys)
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
}

// ============================================================================
// Base SQL Repository
// ============================================================================

/**
 * Base repository implementation for SQL storage.
 *
 * Provides CRUD operations using Durable Object SQL storage
 * with typed query building.
 *
 * @example
 * ```typescript
 * interface Thing { rowid?: number; ns: string; type: string; id: string; data: string }
 *
 * class ThingRepository extends BaseSQLRepository<Thing> {
 *   constructor(sql: SqlStorage) {
 *     super(sql, 'things')
 *   }
 *
 *   protected getId(entity: Thing): string {
 *     return entity.id
 *   }
 *
 *   protected rowToEntity(row: Record<string, unknown>): Thing {
 *     return { ... }
 *   }
 *
 *   protected entityToRow(entity: Thing): Record<string, unknown> {
 *     return { ... }
 *   }
 * }
 * ```
 */
export abstract class BaseSQLRepository<T> implements IBatchRepository<T> {
  protected readonly sql: SqlStorage
  protected readonly tableName: string

  constructor(sql: SqlStorage, tableName: string) {
    this.sql = sql
    this.tableName = tableName
  }

  /**
   * Get entity ID from entity
   */
  protected abstract getId(entity: T): string

  /**
   * Convert database row to entity
   */
  protected abstract rowToEntity(row: Record<string, unknown>): T

  /**
   * Convert entity to database row values
   */
  protected abstract entityToRow(entity: T): Record<string, unknown>

  /**
   * Get the primary key column name (default: 'id')
   */
  protected getIdColumn(): string {
    return 'id'
  }

  /**
   * Get column names for SELECT queries
   */
  protected abstract getSelectColumns(): string[]

  async get(id: string): Promise<T | null> {
    const columns = this.getSelectColumns().join(', ')
    const idColumn = this.getIdColumn()
    const result = this.sql.exec<Record<string, unknown>>(
      `SELECT ${columns} FROM ${this.tableName} WHERE ${idColumn} = ?`,
      id
    ).toArray()

    const row = result[0]
    if (result.length === 0 || !row) return null
    return this.rowToEntity(row)
  }

  abstract save(entity: T): Promise<T>

  async delete(id: string): Promise<boolean> {
    const idColumn = this.getIdColumn()
    const result = this.sql.exec(
      `DELETE FROM ${this.tableName} WHERE ${idColumn} = ?`,
      id
    )
    return result.rowsWritten > 0
  }

  async find(query?: QueryOptions<T>): Promise<T[]> {
    const columns = this.getSelectColumns().join(', ')
    let sql = `SELECT ${columns} FROM ${this.tableName}`
    const params: unknown[] = []

    // Build WHERE clause
    if (query?.filters && query.filters.length > 0) {
      const conditions = query.filters.map((f) => {
        params.push(f.value)
        return `${f.field} ${this.operatorToSQL(f.operator)} ?`
      })
      sql += ` WHERE ${conditions.join(' AND ')}`
    }

    // Build ORDER BY clause
    if (query?.orderBy) {
      sql += ` ORDER BY ${query.orderBy} ${query.order === 'asc' ? 'ASC' : 'DESC'}`
    }

    // Build LIMIT/OFFSET clause
    if (query?.limit !== undefined) {
      sql += ` LIMIT ?`
      params.push(query.limit)
    }

    if (query?.offset !== undefined) {
      sql += ` OFFSET ?`
      params.push(query.offset)
    }

    const result = this.sql.exec<Record<string, unknown>>(sql, ...params).toArray()
    return result.map((row) => this.rowToEntity(row))
  }

  async getMany(ids: string[]): Promise<Map<string, T>> {
    const result = new Map<string, T>()
    // SQLite doesn't support array binding well, so we query individually
    // For better performance, subclasses can override with IN clause
    for (const id of ids) {
      const entity = await this.get(id)
      if (entity) {
        result.set(id, entity)
      }
    }
    return result
  }

  async saveMany(entities: T[]): Promise<T[]> {
    const saved: T[] = []
    for (const entity of entities) {
      saved.push(await this.save(entity))
    }
    return saved
  }

  async deleteMany(ids: string[]): Promise<number> {
    let count = 0
    for (const id of ids) {
      if (await this.delete(id)) {
        count++
      }
    }
    return count
  }

  async count(query?: QueryOptions<T>): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`
    const params: unknown[] = []

    if (query?.filters && query.filters.length > 0) {
      const conditions = query.filters.map((f) => {
        params.push(f.value)
        return `${f.field} ${this.operatorToSQL(f.operator)} ?`
      })
      sql += ` WHERE ${conditions.join(' AND ')}`
    }

    const result = this.sql.exec<{ count: number }>(sql, ...params).one()
    return result?.count ?? 0
  }

  /**
   * Convert filter operator to SQL operator
   */
  protected operatorToSQL(op: FilterOperator): string {
    switch (op) {
      case 'eq':
        return '='
      case 'ne':
        return '!='
      case 'gt':
        return '>'
      case 'gte':
        return '>='
      case 'lt':
        return '<'
      case 'lte':
        return '<='
      case 'like':
        return 'LIKE'
      case 'in':
        return 'IN'
      default:
        return '='
    }
  }
}

// ============================================================================
// Unit of Work Pattern
// ============================================================================

/**
 * Unit of work for transactional operations across repositories.
 *
 * Collects changes and commits them atomically.
 *
 * @example
 * ```typescript
 * const uow = new UnitOfWork(storage)
 * uow.registerNew(userRepo, newUser)
 * uow.registerDirty(userRepo, existingUser)
 * uow.registerDeleted(orderRepo, oldOrderId)
 * await uow.commit()
 * ```
 */
export class UnitOfWork {
  private readonly storage: DOStorage
  private readonly newEntities: Map<IRepository<unknown>, unknown[]> = new Map()
  private readonly dirtyEntities: Map<IRepository<unknown>, unknown[]> = new Map()
  private readonly deletedIds: Map<IRepository<unknown>, string[]> = new Map()

  constructor(storage: DOStorage) {
    this.storage = storage
  }

  /**
   * Register a new entity to be created
   */
  registerNew<T>(repository: IRepository<T>, entity: T): void {
    const entities = this.newEntities.get(repository as IRepository<unknown>) ?? []
    entities.push(entity)
    this.newEntities.set(repository as IRepository<unknown>, entities)
  }

  /**
   * Register an entity to be updated
   */
  registerDirty<T>(repository: IRepository<T>, entity: T): void {
    const entities = this.dirtyEntities.get(repository as IRepository<unknown>) ?? []
    entities.push(entity)
    this.dirtyEntities.set(repository as IRepository<unknown>, entities)
  }

  /**
   * Register an entity to be deleted
   */
  registerDeleted<T>(repository: IRepository<T>, id: string): void {
    const ids = this.deletedIds.get(repository as IRepository<unknown>) ?? []
    ids.push(id)
    this.deletedIds.set(repository as IRepository<unknown>, ids)
  }

  /**
   * Commit all changes atomically
   */
  async commit(): Promise<void> {
    await this.storage.transaction(async (_txn) => {
      // Save new entities
      for (const [repo, entities] of this.newEntities) {
        for (const entity of entities) {
          await repo.save(entity)
        }
      }

      // Save dirty entities
      for (const [repo, entities] of this.dirtyEntities) {
        for (const entity of entities) {
          await repo.save(entity)
        }
      }

      // Delete entities
      for (const [repo, ids] of this.deletedIds) {
        for (const id of ids) {
          await repo.delete(id)
        }
      }
    })

    // Clear after commit
    this.clear()
  }

  /**
   * Rollback (clear) all pending changes
   */
  rollback(): void {
    this.clear()
  }

  private clear(): void {
    this.newEntities.clear()
    this.dirtyEntities.clear()
    this.deletedIds.clear()
  }
}
