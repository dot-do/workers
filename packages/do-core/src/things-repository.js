/**
 * ThingsRepository - Repository for Thing entities using SQL storage
 *
 * Provides a consistent data access layer for Things,
 * using SQL storage for efficient querying and relationships.
 *
 * @module things-repository
 */
import { BaseSQLRepository } from './repository';
// ============================================================================
// Schema Definition
// ============================================================================
/**
 * SQL statements for Things table initialization
 */
export const THINGS_SCHEMA_SQL = `
-- Things table (graph nodes with rowid for lightweight relationships)
CREATE TABLE IF NOT EXISTS things (
  rowid INTEGER PRIMARY KEY AUTOINCREMENT,
  ns TEXT NOT NULL DEFAULT 'default',
  type TEXT NOT NULL,
  id TEXT NOT NULL,
  url TEXT,
  data TEXT NOT NULL,
  context TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(ns, type, id)
);

-- Indexes for Things
CREATE INDEX IF NOT EXISTS idx_things_url ON things(url);
CREATE INDEX IF NOT EXISTS idx_things_type ON things(ns, type);
CREATE INDEX IF NOT EXISTS idx_things_ns ON things(ns);
`;
// ============================================================================
// Things Repository
// ============================================================================
/**
 * Repository for managing Thing entities in SQL storage.
 *
 * Things are stored in a SQL table with support for:
 * - Namespace isolation (ns)
 * - Type-based collections
 * - JSON data payload
 * - Efficient querying and filtering
 *
 * @example
 * ```typescript
 * const repo = new ThingsRepository(sql)
 * await repo.ensureSchema()
 *
 * // Create a thing
 * const thing = await repo.create({
 *   type: 'user',
 *   data: { name: 'Alice', email: 'alice@example.com' }
 * })
 *
 * // Query things
 * const users = await repo.findByType('default', 'user')
 * ```
 */
export class ThingsRepository extends BaseSQLRepository {
    schemaInitialized = false;
    constructor(sql) {
        super(sql, 'things');
    }
    /**
     * Ensure the things schema is initialized
     */
    async ensureSchema() {
        if (this.schemaInitialized)
            return;
        const statements = THINGS_SCHEMA_SQL.split(';').filter((s) => s.trim());
        for (const statement of statements) {
            if (statement.trim()) {
                this.sql.exec(statement);
            }
        }
        this.schemaInitialized = true;
    }
    getId(entity) {
        return entity.id;
    }
    getSelectColumns() {
        return ['rowid', 'ns', 'type', 'id', 'url', 'data', 'context', 'created_at', 'updated_at'];
    }
    rowToEntity(row) {
        return {
            rowid: row.rowid,
            ns: row.ns,
            type: row.type,
            id: row.id,
            url: row.url,
            data: JSON.parse(row.data),
            context: row.context,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };
    }
    entityToRow(entity) {
        return {
            ns: entity.ns,
            type: entity.type,
            id: entity.id,
            url: entity.url ?? null,
            data: JSON.stringify(entity.data),
            context: entity.context ?? null,
            created_at: entity.createdAt,
            updated_at: entity.updatedAt,
        };
    }
    /**
     * Get a thing by namespace, type, and ID
     */
    async getByKey(ns, type, id) {
        await this.ensureSchema();
        const columns = this.getSelectColumns().join(', ');
        const result = this.sql.exec(`SELECT ${columns} FROM things WHERE ns = ? AND type = ? AND id = ?`, ns, type, id).toArray();
        const row = result[0];
        if (result.length === 0 || !row)
            return null;
        return this.rowToEntity(row);
    }
    /**
     * Override get to require schema
     */
    async get(id) {
        await this.ensureSchema();
        return super.get(id);
    }
    /**
     * Create a new thing from input
     */
    async create(input) {
        await this.ensureSchema();
        const now = Date.now();
        const ns = input.ns ?? 'default';
        const id = input.id ?? crypto.randomUUID();
        // Insert the thing
        this.sql.exec(`INSERT INTO things (ns, type, id, url, data, context, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, ns, input.type, id, input.url ?? null, JSON.stringify(input.data), input.context ?? null, now, now);
        // Return the created thing
        const thing = await this.getByKey(ns, input.type, id);
        if (!thing) {
            throw new Error('Failed to retrieve created thing');
        }
        return thing;
    }
    /**
     * Save (insert or update) a thing
     */
    async save(entity) {
        await this.ensureSchema();
        const existing = await this.getByKey(entity.ns, entity.type, entity.id);
        if (existing) {
            // Update existing
            const now = Date.now();
            this.sql.exec(`UPDATE things
         SET url = ?, data = ?, context = ?, updated_at = ?
         WHERE ns = ? AND type = ? AND id = ?`, entity.url ?? null, JSON.stringify(entity.data), entity.context ?? null, now, entity.ns, entity.type, entity.id);
            return {
                ...entity,
                updatedAt: now,
            };
        }
        else {
            // Insert new
            return this.create({
                ns: entity.ns,
                type: entity.type,
                id: entity.id,
                url: entity.url,
                data: entity.data,
                context: entity.context,
            });
        }
    }
    /**
     * Update an existing thing
     */
    async update(ns, type, id, input) {
        await this.ensureSchema();
        const existing = await this.getByKey(ns, type, id);
        if (!existing)
            return null;
        const now = Date.now();
        // Merge data if provided
        const newData = input.data
            ? { ...existing.data, ...input.data }
            : existing.data;
        // Update the thing
        this.sql.exec(`UPDATE things
       SET url = COALESCE(?, url),
           data = ?,
           context = COALESCE(?, context),
           updated_at = ?
       WHERE ns = ? AND type = ? AND id = ?`, input.url ?? null, JSON.stringify(newData), input.context ?? null, now, ns, type, id);
        return this.getByKey(ns, type, id);
    }
    /**
     * Delete a thing by namespace, type, and ID
     */
    async deleteByKey(ns, type, id) {
        await this.ensureSchema();
        const result = this.sql.exec(`DELETE FROM things WHERE ns = ? AND type = ? AND id = ?`, ns, type, id);
        return result.rowsWritten > 0;
    }
    /**
     * Override delete to require schema
     */
    async delete(id) {
        await this.ensureSchema();
        return super.delete(id);
    }
    /**
     * Find things with filtering options
     */
    async findThings(filter) {
        await this.ensureSchema();
        const columns = this.getSelectColumns().join(', ');
        const conditions = [];
        const params = [];
        if (filter?.ns) {
            conditions.push('ns = ?');
            params.push(filter.ns);
        }
        if (filter?.type) {
            conditions.push('type = ?');
            params.push(filter.type);
        }
        const whereClause = conditions.length > 0
            ? `WHERE ${conditions.join(' AND ')}`
            : '';
        // Validate orderBy to prevent SQL injection
        const validOrderBy = ['createdAt', 'updatedAt', 'id'];
        const orderByMap = {
            createdAt: 'created_at',
            updatedAt: 'updated_at',
            id: 'id',
        };
        const orderBy = filter?.orderBy && validOrderBy.includes(filter.orderBy)
            ? orderByMap[filter.orderBy]
            : 'created_at';
        const order = filter?.order === 'asc' ? 'ASC' : 'DESC';
        const limit = filter?.limit ?? 100;
        const offset = filter?.offset ?? 0;
        const query = `
      SELECT ${columns}
      FROM things
      ${whereClause}
      ORDER BY ${orderBy} ${order}
      LIMIT ? OFFSET ?
    `;
        const result = this.sql.exec(query, ...params, limit, offset).toArray();
        return result.map((row) => this.rowToEntity(row));
    }
    /**
     * Override find to use ensureSchema
     */
    async find(query) {
        await this.ensureSchema();
        return super.find(query);
    }
    /**
     * Search things by text query in data field
     */
    async search(queryText, options) {
        await this.ensureSchema();
        const columns = this.getSelectColumns().join(', ');
        const conditions = ['data LIKE ?'];
        const params = [`%${queryText}%`];
        if (options?.ns) {
            conditions.push('ns = ?');
            params.push(options.ns);
        }
        if (options?.type) {
            conditions.push('type = ?');
            params.push(options.type);
        }
        const whereClause = `WHERE ${conditions.join(' AND ')}`;
        const limit = options?.limit ?? 100;
        const sql = `
      SELECT ${columns}
      FROM things
      ${whereClause}
      ORDER BY updated_at DESC
      LIMIT ?
    `;
        const result = this.sql.exec(sql, ...params, limit).toArray();
        return result.map((row) => this.rowToEntity(row));
    }
    /**
     * Find things by type in a namespace
     */
    async findByType(ns, type, limit) {
        return this.findThings({ ns, type, limit });
    }
    /**
     * Find things by namespace
     */
    async findByNamespace(ns, limit) {
        return this.findThings({ ns, limit });
    }
    /**
     * Count things matching filter
     */
    async countThings(filter) {
        await this.ensureSchema();
        const conditions = [];
        const params = [];
        if (filter?.ns) {
            conditions.push('ns = ?');
            params.push(filter.ns);
        }
        if (filter?.type) {
            conditions.push('type = ?');
            params.push(filter.type);
        }
        const whereClause = conditions.length > 0
            ? `WHERE ${conditions.join(' AND ')}`
            : '';
        const sql = `SELECT COUNT(*) as count FROM things ${whereClause}`;
        const result = this.sql.exec(sql, ...params).one();
        return result?.count ?? 0;
    }
    /**
     * Override count to use ensureSchema
     */
    async count(query) {
        await this.ensureSchema();
        return super.count(query);
    }
    /**
     * Check if schema has been initialized
     */
    isSchemaInitialized() {
        return this.schemaInitialized;
    }
}
