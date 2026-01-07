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
/**
 * Query builder for fluent query construction
 */
export class Query {
    _filters = [];
    _orderBy;
    _order = 'desc';
    _limit;
    _offset;
    /**
     * Add an equality filter
     */
    where(field, value) {
        this._filters.push({ field, operator: 'eq', value });
        return this;
    }
    /**
     * Add a comparison filter
     */
    whereOp(field, operator, value) {
        this._filters.push({ field, operator, value });
        return this;
    }
    /**
     * Set order by field
     */
    orderBy(field, order = 'desc') {
        this._orderBy = field;
        this._order = order;
        return this;
    }
    /**
     * Set result limit
     */
    limit(n) {
        this._limit = n;
        return this;
    }
    /**
     * Set result offset
     */
    offset(n) {
        this._offset = n;
        return this;
    }
    /**
     * Build query options
     */
    build() {
        return {
            filters: this._filters.length > 0 ? this._filters : undefined,
            orderBy: this._orderBy,
            order: this._order,
            limit: this._limit,
            offset: this._offset,
        };
    }
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
export class BaseKVRepository {
    storage;
    prefix;
    constructor(storage, prefix) {
        this.storage = storage;
        this.prefix = prefix;
    }
    /**
     * Generate storage key from entity ID
     */
    makeKey(id) {
        return `${this.prefix}:${id}`;
    }
    /**
     * Extract entity ID from storage key
     */
    extractId(key) {
        return key.replace(`${this.prefix}:`, '');
    }
    /**
     * Get entity ID from entity (for polymorphism)
     * Subclasses can override for custom ID extraction
     */
    getId(entity) {
        return entity.id;
    }
    async get(id) {
        const key = this.makeKey(id);
        const entity = await this.storage.get(key);
        return entity ?? null;
    }
    async save(entity) {
        const id = this.getId(entity);
        const key = this.makeKey(id);
        await this.storage.put(key, entity);
        return entity;
    }
    async delete(id) {
        const key = this.makeKey(id);
        return this.storage.delete(key);
    }
    async find(query) {
        const entries = await this.storage.list({ prefix: `${this.prefix}:` });
        let results = Array.from(entries.values());
        // Apply filters
        if (query?.filters) {
            for (const filter of query.filters) {
                results = results.filter((entity) => {
                    const value = entity[filter.field];
                    return this.matchesFilter(value, filter);
                });
            }
        }
        // Apply ordering
        if (query?.orderBy) {
            const orderField = query.orderBy;
            const orderMultiplier = query.order === 'asc' ? 1 : -1;
            results.sort((a, b) => {
                const aVal = a[orderField];
                const bVal = b[orderField];
                if (aVal < bVal)
                    return -1 * orderMultiplier;
                if (aVal > bVal)
                    return 1 * orderMultiplier;
                return 0;
            });
        }
        // Apply pagination
        const offset = query?.offset ?? 0;
        const limit = query?.limit ?? results.length;
        return results.slice(offset, offset + limit);
    }
    async getMany(ids) {
        const keys = ids.map((id) => this.makeKey(id));
        const entries = await this.storage.get(keys);
        const result = new Map();
        for (const [key, value] of entries) {
            const id = this.extractId(key);
            result.set(id, value);
        }
        return result;
    }
    async saveMany(entities) {
        const entries = {};
        for (const entity of entities) {
            const id = this.getId(entity);
            const key = this.makeKey(id);
            entries[key] = entity;
        }
        await this.storage.put(entries);
        return entities;
    }
    async deleteMany(ids) {
        const keys = ids.map((id) => this.makeKey(id));
        return this.storage.delete(keys);
    }
    async count(query) {
        const entities = await this.find(query);
        return entities.length;
    }
    /**
     * Clear all entities in this repository
     */
    async clear() {
        const entries = await this.storage.list({ prefix: `${this.prefix}:` });
        const keys = Array.from(entries.keys());
        if (keys.length === 0)
            return 0;
        return this.storage.delete(keys);
    }
    /**
     * Check if filter matches value
     */
    matchesFilter(value, filter) {
        switch (filter.operator) {
            case 'eq':
                return value === filter.value;
            case 'ne':
                return value !== filter.value;
            case 'gt':
                return value > filter.value;
            case 'gte':
                return value >= filter.value;
            case 'lt':
                return value < filter.value;
            case 'lte':
                return value <= filter.value;
            case 'like':
                return String(value).includes(String(filter.value));
            case 'in':
                return Array.isArray(filter.value) && filter.value.includes(value);
            default:
                return false;
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
export class BaseSQLRepository {
    sql;
    tableName;
    constructor(sql, tableName) {
        this.sql = sql;
        this.tableName = tableName;
    }
    /**
     * Get the primary key column name (default: 'id')
     */
    getIdColumn() {
        return 'id';
    }
    async get(id) {
        const columns = this.getSelectColumns().join(', ');
        const idColumn = this.getIdColumn();
        const result = this.sql.exec(`SELECT ${columns} FROM ${this.tableName} WHERE ${idColumn} = ?`, id).toArray();
        const row = result[0];
        if (result.length === 0 || !row)
            return null;
        return this.rowToEntity(row);
    }
    async delete(id) {
        const idColumn = this.getIdColumn();
        const result = this.sql.exec(`DELETE FROM ${this.tableName} WHERE ${idColumn} = ?`, id);
        return result.rowsWritten > 0;
    }
    async find(query) {
        const columns = this.getSelectColumns().join(', ');
        let sql = `SELECT ${columns} FROM ${this.tableName}`;
        const params = [];
        // Build WHERE clause
        if (query?.filters && query.filters.length > 0) {
            const conditions = query.filters.map((f) => {
                params.push(f.value);
                return `${f.field} ${this.operatorToSQL(f.operator)} ?`;
            });
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }
        // Build ORDER BY clause
        if (query?.orderBy) {
            sql += ` ORDER BY ${query.orderBy} ${query.order === 'asc' ? 'ASC' : 'DESC'}`;
        }
        // Build LIMIT/OFFSET clause
        if (query?.limit !== undefined) {
            sql += ` LIMIT ?`;
            params.push(query.limit);
        }
        if (query?.offset !== undefined) {
            sql += ` OFFSET ?`;
            params.push(query.offset);
        }
        const result = this.sql.exec(sql, ...params).toArray();
        return result.map((row) => this.rowToEntity(row));
    }
    async getMany(ids) {
        const result = new Map();
        // SQLite doesn't support array binding well, so we query individually
        // For better performance, subclasses can override with IN clause
        for (const id of ids) {
            const entity = await this.get(id);
            if (entity) {
                result.set(id, entity);
            }
        }
        return result;
    }
    async saveMany(entities) {
        const saved = [];
        for (const entity of entities) {
            saved.push(await this.save(entity));
        }
        return saved;
    }
    async deleteMany(ids) {
        let count = 0;
        for (const id of ids) {
            if (await this.delete(id)) {
                count++;
            }
        }
        return count;
    }
    async count(query) {
        let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
        const params = [];
        if (query?.filters && query.filters.length > 0) {
            const conditions = query.filters.map((f) => {
                params.push(f.value);
                return `${f.field} ${this.operatorToSQL(f.operator)} ?`;
            });
            sql += ` WHERE ${conditions.join(' AND ')}`;
        }
        const result = this.sql.exec(sql, ...params).one();
        return result?.count ?? 0;
    }
    /**
     * Convert filter operator to SQL operator
     */
    operatorToSQL(op) {
        switch (op) {
            case 'eq':
                return '=';
            case 'ne':
                return '!=';
            case 'gt':
                return '>';
            case 'gte':
                return '>=';
            case 'lt':
                return '<';
            case 'lte':
                return '<=';
            case 'like':
                return 'LIKE';
            case 'in':
                return 'IN';
            default:
                return '=';
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
    storage;
    newEntities = new Map();
    dirtyEntities = new Map();
    deletedIds = new Map();
    constructor(storage) {
        this.storage = storage;
    }
    /**
     * Register a new entity to be created
     */
    registerNew(repository, entity) {
        const entities = this.newEntities.get(repository) ?? [];
        entities.push(entity);
        this.newEntities.set(repository, entities);
    }
    /**
     * Register an entity to be updated
     */
    registerDirty(repository, entity) {
        const entities = this.dirtyEntities.get(repository) ?? [];
        entities.push(entity);
        this.dirtyEntities.set(repository, entities);
    }
    /**
     * Register an entity to be deleted
     */
    registerDeleted(repository, id) {
        const ids = this.deletedIds.get(repository) ?? [];
        ids.push(id);
        this.deletedIds.set(repository, ids);
    }
    /**
     * Commit all changes atomically
     */
    async commit() {
        await this.storage.transaction(async (_txn) => {
            // Save new entities
            for (const [repo, entities] of this.newEntities) {
                for (const entity of entities) {
                    await repo.save(entity);
                }
            }
            // Save dirty entities
            for (const [repo, entities] of this.dirtyEntities) {
                for (const entity of entities) {
                    await repo.save(entity);
                }
            }
            // Delete entities
            for (const [repo, ids] of this.deletedIds) {
                for (const id of ids) {
                    await repo.delete(id);
                }
            }
        });
        // Clear after commit
        this.clear();
    }
    /**
     * Rollback (clear) all pending changes
     */
    rollback() {
        this.clear();
    }
    clear() {
        this.newEntities.clear();
        this.dirtyEntities.clear();
        this.deletedIds.clear();
    }
}
