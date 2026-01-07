/**
 * LazySchemaManager - Lazy Schema Initialization for Durable Objects
 *
 * This module provides lazy schema initialization that optimizes DO performance by:
 * - Deferring schema initialization until first use
 * - Caching schema after first load (eliminates redundant SQL calls)
 * - Validating schema definitions on first access
 * - Using memory-efficient patterns
 * - Ensuring thread-safe initialization with blockConcurrencyWhile
 *
 * ## Schema Lifecycle
 *
 * 1. **Construction**: Manager is created but schema is NOT loaded
 *    - No SQL calls are made
 *    - `isInitialized()` returns false
 *
 * 2. **First Access**: Schema is loaded and cached when:
 *    - `ensureInitialized()` is called explicitly
 *    - `getSchema()` is called (triggers ensureInitialized internally)
 *
 * 3. **Initialization**: When triggered:
 *    - Schema definition is validated
 *    - CREATE TABLE statements are executed
 *    - CREATE INDEX statements are executed
 *    - Schema is cached in memory
 *    - Statistics are updated
 *
 * 4. **Cached Access**: Subsequent calls:
 *    - Return immediately without SQL calls
 *    - Use cached schema instance
 *    - `isInitialized()` returns true
 *
 * 5. **Reset (Optional)**: For testing or migrations:
 *    - Clears cached schema
 *    - Next access triggers re-initialization
 *
 * ## Performance Characteristics
 *
 * - First initialization: ~1-5ms (depends on schema complexity)
 * - Subsequent access: <0.1ms (flag check only)
 * - Memory overhead: ~1KB per cached schema
 * - Thread safety: Guaranteed via blockConcurrencyWhile
 *
 * ## Usage Example
 *
 * ```typescript
 * class MyDurableObject extends DOCore {
 *   private schemaManager: LazySchemaManager
 *
 *   constructor(ctx: DOState, env: Env) {
 *     super(ctx, env)
 *     // Schema NOT initialized here - just creates manager
 *     this.schemaManager = createLazySchemaManager(ctx.storage, { state: ctx })
 *   }
 *
 *   async handleRequest(req: Request): Promise<Response> {
 *     // Schema initialized on first CRUD operation
 *     await this.schemaManager.ensureInitialized()
 *     // ... perform database operations
 *   }
 * }
 * ```
 *
 * @module
 */
// ============================================================================
// LazySchemaManager Class
// ============================================================================
/**
 * LazySchemaManager - Lazy initialization for DO schemas
 *
 * Provides lazy schema initialization that:
 * - Defers initialization until first use
 * - Caches schema after initialization
 * - Validates schema definitions
 * - Uses blockConcurrencyWhile for thread safety
 *
 * @example
 * ```typescript
 * const manager = new LazySchemaManager(storage)
 *
 * // Schema is NOT initialized yet
 * console.log(manager.isInitialized()) // false
 *
 * // First access triggers initialization
 * await manager.ensureInitialized()
 *
 * // Now initialized and cached
 * console.log(manager.isInitialized()) // true
 * ```
 */
export class LazySchemaManager {
    storage;
    options;
    _initialized = false;
    _cachedSchema = null;
    _initializingPromise = null;
    _stats = {
        initializationCount: 0,
        lastInitTime: null,
        lastInitDurationMs: null,
    };
    constructor(storage, options = {}) {
        this.storage = storage;
        this.options = options;
    }
    /**
     * Check if schema has been initialized
     *
     * @returns true if schema is initialized, false otherwise
     */
    isInitialized() {
        return this._initialized;
    }
    /**
     * Validate a schema definition
     */
    validateSchema(schema) {
        for (const table of schema.tables) {
            if (!table.name || table.name.trim() === '') {
                throw new Error('Invalid schema: table name cannot be empty');
            }
            for (const column of table.columns) {
                if (!column.name || column.name.trim() === '') {
                    throw new Error(`Invalid schema: column name cannot be empty in table ${table.name}`);
                }
            }
        }
    }
    /**
     * Generate CREATE TABLE SQL for a table definition
     */
    generateCreateTableSql(table) {
        const columns = table.columns.map((col) => {
            let def = `${col.name} ${col.type}`;
            if (col.primaryKey)
                def += ' PRIMARY KEY';
            if (col.notNull)
                def += ' NOT NULL';
            if (col.unique)
                def += ' UNIQUE';
            if (col.defaultValue !== undefined) {
                if (typeof col.defaultValue === 'string') {
                    def += ` DEFAULT '${col.defaultValue}'`;
                }
                else {
                    def += ` DEFAULT ${col.defaultValue}`;
                }
            }
            return def;
        });
        return `CREATE TABLE IF NOT EXISTS ${table.name} (${columns.join(', ')})`;
    }
    /**
     * Generate CREATE INDEX SQL for an index definition
     */
    generateCreateIndexSql(tableName, index) {
        const uniqueStr = index.unique ? 'UNIQUE ' : '';
        return `CREATE ${uniqueStr}INDEX IF NOT EXISTS ${index.name} ON ${tableName} (${index.columns.join(', ')})`;
    }
    /**
     * Ensure schema is initialized (lazy initialization)
     *
     * If schema is already initialized, returns immediately.
     * Otherwise, initializes the schema using blockConcurrencyWhile
     * to ensure thread safety.
     *
     * @throws Error if schema validation fails
     * @throws Error if SQL execution fails
     */
    async ensureInitialized() {
        // Already initialized - return immediately
        if (this._initialized) {
            return;
        }
        // Handle concurrent initialization requests by reusing the same promise
        if (this._initializingPromise) {
            return this._initializingPromise;
        }
        const doInit = async () => {
            const startTime = Date.now();
            // Get schema definition
            const schema = this.options.schema ?? DEFAULT_SCHEMA;
            // Validate schema
            this.validateSchema(schema);
            // Execute CREATE TABLE statements
            for (const table of schema.tables) {
                const sql = this.generateCreateTableSql(table);
                this.storage.sql.exec(sql);
                // Create indexes
                if (table.indexes) {
                    for (const index of table.indexes) {
                        const indexSql = this.generateCreateIndexSql(table.name, index);
                        this.storage.sql.exec(indexSql);
                    }
                }
            }
            // Cache the initialized schema
            this._cachedSchema = {
                ...schema,
                version: schema.version ?? 1,
                initializedAt: Date.now(),
            };
            // Update stats
            const endTime = Date.now();
            this._stats = {
                initializationCount: this._stats.initializationCount + 1,
                lastInitTime: endTime,
                lastInitDurationMs: endTime - startTime,
            };
            this._initialized = true;
        };
        // Use blockConcurrencyWhile if state is provided for thread safety
        if (this.options.state) {
            this._initializingPromise = new Promise((resolve, reject) => {
                this.options.state.blockConcurrencyWhile(async () => {
                    // Double-check after acquiring lock
                    if (this._initialized) {
                        resolve();
                        return;
                    }
                    try {
                        await doInit();
                        resolve();
                    }
                    catch (error) {
                        reject(error);
                    }
                });
            });
        }
        else {
            this._initializingPromise = doInit();
        }
        try {
            await this._initializingPromise;
        }
        finally {
            this._initializingPromise = null;
        }
    }
    /**
     * Get the initialized schema
     *
     * Triggers initialization if not already done.
     * Returns cached schema on subsequent calls.
     *
     * @returns The initialized schema with version information
     */
    async getSchema() {
        await this.ensureInitialized();
        return this._cachedSchema;
    }
    /**
     * Reset the manager to allow re-initialization
     *
     * Used primarily for testing or schema migrations.
     * After reset, the next access will trigger re-initialization.
     */
    reset() {
        this._initialized = false;
        this._cachedSchema = null;
        this._initializingPromise = null;
    }
    /**
     * Get statistics about schema initialization
     *
     * @returns Statistics including initialization count and timing
     */
    getStats() {
        return { ...this._stats };
    }
}
// ============================================================================
// Factory Function
// ============================================================================
/**
 * Factory function to create a LazySchemaManager
 *
 * @param storage - DO storage instance
 * @param options - Optional configuration
 * @returns A new LazySchemaManager instance
 *
 * @example
 * ```typescript
 * const manager = createLazySchemaManager(ctx.storage, {
 *   state: ctx,
 *   cacheStrategy: 'weak'
 * })
 * ```
 */
export function createLazySchemaManager(storage, options = {}) {
    return new LazySchemaManager(storage, options);
}
// ============================================================================
// Default Schema
// ============================================================================
/**
 * Default schema for DO storage
 *
 * Includes:
 * - documents: Main collection storage (generic documents)
 * - things: Graph nodes with rowid-based relationships
 * - schema_version: Migration tracking
 */
export const DEFAULT_SCHEMA = {
    version: 2,
    tables: [
        {
            name: 'documents',
            columns: [
                { name: 'collection', type: 'TEXT', notNull: true },
                { name: '_id', type: 'TEXT', notNull: true },
                { name: 'data', type: 'TEXT', notNull: true },
                { name: 'created_at', type: 'INTEGER', notNull: true },
                { name: 'updated_at', type: 'INTEGER', notNull: true },
            ],
            indexes: [
                { name: 'idx_documents_collection', columns: ['collection'] },
                { name: 'idx_documents_id', columns: ['collection', '_id'], unique: true },
            ],
        },
        {
            name: 'things',
            columns: [
                { name: 'ns', type: 'TEXT', notNull: true, defaultValue: 'default' },
                { name: 'type', type: 'TEXT', notNull: true },
                { name: 'id', type: 'TEXT', notNull: true },
                { name: 'url', type: 'TEXT' },
                { name: 'data', type: 'TEXT', notNull: true },
                { name: 'context', type: 'TEXT' },
                { name: 'created_at', type: 'INTEGER', notNull: true },
                { name: 'updated_at', type: 'INTEGER', notNull: true },
            ],
            indexes: [
                { name: 'idx_things_ns_type_id', columns: ['ns', 'type', 'id'], unique: true },
                { name: 'idx_things_url', columns: ['url'] },
                { name: 'idx_things_type', columns: ['ns', 'type'] },
                { name: 'idx_things_ns', columns: ['ns'] },
            ],
        },
        {
            name: 'schema_version',
            columns: [
                { name: 'version', type: 'INTEGER', primaryKey: true },
                { name: 'applied_at', type: 'INTEGER', notNull: true },
            ],
        },
    ],
};
