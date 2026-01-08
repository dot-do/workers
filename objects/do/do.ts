/**
 * DO - Full-Featured Durable Object Base Class
 *
 * The complete DO implementation with all capabilities:
 *
 * - Drizzle ORM integration for type-safe SQL
 * - Lazy schema initialization for optimal cold starts
 * - CRUD operations (KV-style and collection-based)
 * - Event sourcing support
 * - Multi-transport API (HTTP, WebSocket, JSON-RPC)
 * - Agentic capabilities (natural language execution)
 *
 * This is the default import from 'dotdo'.
 *
 * @example
 * ```typescript
 * import { DO } from 'dotdo'
 * import { drizzle } from 'drizzle-orm/d1'
 * import * as schema from './schema'
 *
 * export class MyDatabase extends DO {
 *   db = drizzle(this.ctx.storage.sql, { schema })
 *
 *   async getUsers() {
 *     return this.db.select().from(schema.users)
 *   }
 * }
 * ```
 */

import { DO as DOTiny } from './do-tiny'
import type {
  DOState,
  DOEnv,
  DOStorage,
  DOConfig,
  Document,
  StorageProvider,
  SchemaConfig,
  TableDefinition,
  ColumnDefinition,
  IndexDefinition,
  RPCHandler,
  RPCRegistry,
  WebSocketMessage,
} from './types'

// ============================================================================
// Schema Manager (Lazy Initialization)
// ============================================================================

/**
 * Lazy schema initialization manager
 *
 * Defers schema creation until first database access, optimizing cold starts.
 */
class SchemaManager {
  private readonly storage: DOStorage
  private readonly config: SchemaConfig
  private readonly state?: DOState
  private initialized = false
  private initPromise: Promise<void> | null = null

  constructor(storage: DOStorage, config: SchemaConfig = {}, state?: DOState) {
    this.storage = storage
    this.config = config
    this.state = state
  }

  /**
   * Check if schema has been initialized
   */
  isInitialized(): boolean {
    return this.initialized
  }

  /**
   * Ensure schema is initialized (lazy)
   */
  async ensureInitialized(): Promise<void> {
    if (this.initialized) return
    if (this.initPromise) return this.initPromise

    const doInit = async () => {
      const tables = this.config.tables ?? DEFAULT_TABLES

      for (const table of tables) {
        const sql = this.generateCreateTableSql(table)
        this.storage.sql.exec(sql)

        if (table.indexes) {
          for (const index of table.indexes) {
            const indexSql = this.generateCreateIndexSql(table.name, index)
            this.storage.sql.exec(indexSql)
          }
        }
      }

      this.initialized = true
    }

    if (this.state) {
      this.initPromise = new Promise<void>((resolve, reject) => {
        this.state!.blockConcurrencyWhile(async () => {
          if (this.initialized) {
            resolve()
            return
          }
          try {
            await doInit()
            resolve()
          } catch (error) {
            reject(error)
          }
        })
      })
    } else {
      this.initPromise = doInit()
    }

    try {
      await this.initPromise
    } finally {
      this.initPromise = null
    }
  }

  private generateCreateTableSql(table: TableDefinition): string {
    const columns = table.columns.map((col) => {
      let def = `${col.name} ${col.type}`
      if (col.primaryKey) def += ' PRIMARY KEY'
      if (col.notNull) def += ' NOT NULL'
      if (col.unique) def += ' UNIQUE'
      if (col.defaultValue !== undefined) {
        if (typeof col.defaultValue === 'string') {
          def += ` DEFAULT '${col.defaultValue}'`
        } else {
          def += ` DEFAULT ${col.defaultValue}`
        }
      }
      return def
    })
    return `CREATE TABLE IF NOT EXISTS ${table.name} (${columns.join(', ')})`
  }

  private generateCreateIndexSql(tableName: string, index: IndexDefinition): string {
    const unique = index.unique ? 'UNIQUE ' : ''
    return `CREATE ${unique}INDEX IF NOT EXISTS ${index.name} ON ${tableName} (${index.columns.join(', ')})`
  }
}

/**
 * Default tables for schema initialization
 */
const DEFAULT_TABLES: TableDefinition[] = [
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
    ],
  },
  {
    name: 'events',
    columns: [
      { name: 'id', type: 'INTEGER', primaryKey: true },
      { name: 'stream_id', type: 'TEXT', notNull: true },
      { name: 'stream_type', type: 'TEXT', notNull: true },
      { name: 'event_type', type: 'TEXT', notNull: true },
      { name: 'payload', type: 'TEXT', notNull: true },
      { name: 'metadata', type: 'TEXT' },
      { name: 'version', type: 'INTEGER', notNull: true },
      { name: 'timestamp', type: 'INTEGER', notNull: true },
    ],
    indexes: [
      { name: 'idx_events_stream', columns: ['stream_id', 'stream_type'] },
      { name: 'idx_events_version', columns: ['stream_id', 'version'], unique: true },
    ],
  },
  {
    name: 'kv',
    columns: [
      { name: 'key', type: 'TEXT', primaryKey: true },
      { name: 'value', type: 'TEXT', notNull: true },
      { name: 'expires_at', type: 'INTEGER' },
      { name: 'updated_at', type: 'INTEGER', notNull: true },
    ],
  },
]

// ============================================================================
// DO Class
// ============================================================================

/**
 * Full-featured Durable Object base class
 *
 * Extends DOTiny with:
 * - Lazy schema initialization
 * - Collection-based CRUD
 * - Event sourcing
 * - JSON-RPC handling
 * - Agentic capabilities
 */
export class DO<Env extends DOEnv = DOEnv> extends DOTiny<Env> {
  /** Schema manager for lazy initialization */
  private _schemaManager?: SchemaManager

  /** RPC method registry */
  private readonly _rpcMethods: RPCRegistry = {}

  /**
   * Get the schema manager (lazy creation)
   */
  protected get schemaManager(): SchemaManager {
    if (!this._schemaManager) {
      this._schemaManager = new SchemaManager(
        this.ctx.storage,
        this.getSchemaConfig?.() ?? {},
        this.ctx
      )
    }
    return this._schemaManager
  }

  /**
   * Override to provide custom schema configuration
   */
  protected getSchemaConfig?(): SchemaConfig

  /**
   * Ensure schema is initialized before database operations
   */
  protected async ensureSchema(): Promise<void> {
    await this.schemaManager.ensureInitialized()
  }

  // ==========================================================================
  // Enhanced HTTP Handling
  // ==========================================================================

  /**
   * Handle incoming HTTP requests with routing
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const method = request.method

    try {
      // Discovery endpoint
      if (url.pathname === '/' && method === 'GET') {
        return this.handleDiscovery()
      }

      // Health check
      if (url.pathname === '/health') {
        return this.jsonResponse({ status: 'ok', id: this.id })
      }

      // JSON-RPC endpoint
      if (url.pathname === '/rpc' && method === 'POST') {
        return this.handleJsonRpc(request)
      }

      // WebSocket upgrade
      if (request.headers.get('Upgrade') === 'websocket') {
        return this.handleWebSocketUpgrade(request)
      }

      // Agentic endpoint
      if (url.pathname === '/do' && method === 'POST') {
        return this.handleAgenticRequest(request)
      }

      // Let subclass handle other routes
      return this.handleRequest(request)
    } catch (error) {
      if (this.config?.debug) {
        console.error('[DO] Request error:', error)
      }
      return this.errorResponse(
        error instanceof Error ? error.message : 'Internal error',
        500
      )
    }
  }

  /**
   * Override this to handle custom routes
   */
  protected async handleRequest(_request: Request): Promise<Response> {
    return new Response('Not Found', { status: 404 })
  }

  /**
   * Handle discovery endpoint
   */
  protected handleDiscovery(): Response {
    return this.jsonResponse({
      id: this.id,
      type: this.constructor.name,
      version: this.config?.version ?? '0.0.1',
      api: 'dotdo',
      endpoints: {
        '/': 'Discovery (this response)',
        '/health': 'Health check',
        '/rpc': 'JSON-RPC endpoint (POST)',
        '/do': 'Agentic endpoint (POST)',
      },
      methods: Object.keys(this._rpcMethods),
    })
  }

  // ==========================================================================
  // JSON-RPC Handling
  // ==========================================================================

  /**
   * Register an RPC method
   */
  protected registerRpc<TParams = unknown, TResult = unknown>(
    name: string,
    handler: RPCHandler<TParams, TResult>
  ): void {
    this._rpcMethods[name] = handler as RPCHandler
  }

  /**
   * Check if an RPC method exists
   */
  hasMethod(name: string): boolean {
    return name in this._rpcMethods || typeof (this as any)[name] === 'function'
  }

  /**
   * Invoke an RPC method
   */
  async invoke(method: string, params?: unknown): Promise<unknown> {
    // Check registered handlers first
    if (this._rpcMethods[method]) {
      return this._rpcMethods[method](params)
    }

    // Check instance methods
    const fn = (this as any)[method]
    if (typeof fn === 'function') {
      if (Array.isArray(params)) {
        return fn.apply(this, params)
      }
      return fn.call(this, params)
    }

    throw new Error(`Method not found: ${method}`)
  }

  /**
   * Handle JSON-RPC request
   */
  protected async handleJsonRpc(request: Request): Promise<Response> {
    let body: any
    try {
      body = await request.json()
    } catch {
      return this.jsonResponse({
        jsonrpc: '2.0',
        error: { code: -32700, message: 'Parse error' },
        id: null,
      })
    }

    // Handle batch requests
    if (Array.isArray(body)) {
      const results = await Promise.all(
        body.map((req) => this.processRpcRequest(req))
      )
      return this.jsonResponse(results)
    }

    const result = await this.processRpcRequest(body)
    return this.jsonResponse(result)
  }

  /**
   * Process a single JSON-RPC request
   */
  private async processRpcRequest(request: {
    jsonrpc?: string
    method?: string
    params?: unknown
    id?: string | number | null
  }): Promise<object> {
    const { method, params, id } = request

    if (!method) {
      return {
        jsonrpc: '2.0',
        error: { code: -32600, message: 'Invalid request' },
        id: id ?? null,
      }
    }

    try {
      const result = await this.invoke(method, params)
      return {
        jsonrpc: '2.0',
        result,
        id: id ?? null,
      }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Internal error',
        },
        id: id ?? null,
      }
    }
  }

  // ==========================================================================
  // WebSocket Handling
  // ==========================================================================

  /**
   * Handle WebSocket upgrade request
   */
  protected handleWebSocketUpgrade(request: Request): Response {
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    this.ctx.acceptWebSocket(server)

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  /**
   * Handle WebSocket messages with JSON-RPC support
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== 'string') {
      return
    }

    let parsed: WebSocketMessage
    try {
      parsed = JSON.parse(message)
    } catch {
      ws.send(JSON.stringify({ error: 'Invalid JSON' }))
      return
    }

    switch (parsed.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }))
        break

      case 'rpc': {
        const { method, params, id } = parsed
        try {
          const result = await this.invoke(method, params)
          ws.send(JSON.stringify({ type: 'rpc', result, id }))
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'rpc',
            error: error instanceof Error ? error.message : 'Error',
            id,
          }))
        }
        break
      }

      default:
        await this.handleCustomWebSocketMessage(ws, parsed)
    }
  }

  /**
   * Override to handle custom WebSocket message types
   */
  protected async handleCustomWebSocketMessage(
    _ws: WebSocket,
    _message: WebSocketMessage
  ): Promise<void> {
    // Default: no-op
  }

  // ==========================================================================
  // Agentic Capabilities
  // ==========================================================================

  /**
   * Execute a natural language instruction
   *
   * This is the core "DO" method that makes every instance agentic.
   * Override to provide custom AI integration.
   *
   * @param prompt - Natural language instruction
   * @returns Execution result
   */
  async do(prompt: string): Promise<unknown> {
    // Default implementation: look for matching method names
    // Real implementation would use LLM binding
    const words = prompt.toLowerCase().split(/\s+/)

    // Simple heuristic: find first matching method name
    for (const word of words) {
      if (this.hasMethod(word)) {
        return this.invoke(word)
      }
    }

    throw new Error(`Could not understand instruction: ${prompt}`)
  }

  /**
   * Handle agentic HTTP request
   */
  protected async handleAgenticRequest(request: Request): Promise<Response> {
    const body = await request.json() as { prompt?: string }

    if (!body.prompt) {
      return this.errorResponse('Missing prompt', 400)
    }

    try {
      const result = await this.do(body.prompt)
      return this.jsonResponse({ result })
    } catch (error) {
      return this.errorResponse(
        error instanceof Error ? error.message : 'Execution failed',
        500
      )
    }
  }

  // ==========================================================================
  // Collection-Based CRUD
  // ==========================================================================

  /**
   * Create a document in a collection
   */
  async create<T extends Partial<Document>>(
    collection: string,
    data: T
  ): Promise<T & Document> {
    await this.ensureSchema()

    const id = data.id ?? crypto.randomUUID()
    const now = Date.now()

    const doc: T & Document = {
      ...data,
      id,
      createdAt: data.createdAt ?? now,
      updatedAt: now,
    }

    this.ctx.storage.sql.exec(
      `INSERT INTO documents (collection, _id, data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      collection,
      id,
      JSON.stringify(doc),
      now,
      now
    )

    return doc
  }

  /**
   * Get a document from a collection
   */
  async getDoc<T extends Document>(collection: string, id: string): Promise<T | null> {
    await this.ensureSchema()

    const result = this.ctx.storage.sql.exec<{ data: string }>(
      `SELECT data FROM documents WHERE collection = ? AND _id = ?`,
      collection,
      id
    ).one()

    if (!result) return null
    return JSON.parse(result.data) as T
  }

  /**
   * Update a document in a collection
   */
  async update<T extends Document>(
    collection: string,
    id: string,
    updates: Partial<T>
  ): Promise<T | null> {
    const existing = await this.getDoc<T>(collection, id)
    if (!existing) return null

    const now = Date.now()
    const updated: T = {
      ...existing,
      ...updates,
      id,
      updatedAt: now,
    }

    this.ctx.storage.sql.exec(
      `UPDATE documents SET data = ?, updated_at = ? WHERE collection = ? AND _id = ?`,
      JSON.stringify(updated),
      now,
      collection,
      id
    )

    return updated
  }

  /**
   * Delete a document from a collection
   */
  async deleteDoc(collection: string, id: string): Promise<boolean> {
    await this.ensureSchema()

    const cursor = this.ctx.storage.sql.exec(
      `DELETE FROM documents WHERE collection = ? AND _id = ?`,
      collection,
      id
    )

    return cursor.rowsWritten > 0
  }

  /**
   * List documents in a collection
   */
  async listDocs<T extends Document>(
    collection: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<T[]> {
    await this.ensureSchema()

    const { limit = 100, offset = 0 } = options

    const results = this.ctx.storage.sql.exec<{ data: string }>(
      `SELECT data FROM documents WHERE collection = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      collection,
      limit,
      offset
    ).toArray()

    return results.map((row) => JSON.parse(row.data) as T)
  }

  // ==========================================================================
  // Event Sourcing
  // ==========================================================================

  /**
   * Append an event to a stream
   */
  async appendEvent(
    streamId: string,
    streamType: string,
    eventType: string,
    payload: unknown,
    metadata?: unknown
  ): Promise<{ id: number; version: number }> {
    await this.ensureSchema()

    // Get current version
    const latest = this.ctx.storage.sql.exec<{ version: number }>(
      `SELECT MAX(version) as version FROM events WHERE stream_id = ?`,
      streamId
    ).one()

    const version = (latest?.version ?? 0) + 1
    const timestamp = Date.now()

    this.ctx.storage.sql.exec(
      `INSERT INTO events (stream_id, stream_type, event_type, payload, metadata, version, timestamp)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      streamId,
      streamType,
      eventType,
      JSON.stringify(payload),
      metadata ? JSON.stringify(metadata) : null,
      version,
      timestamp
    )

    // Get the inserted ID
    const result = this.ctx.storage.sql.exec<{ id: number }>(
      `SELECT last_insert_rowid() as id`
    ).one()

    return { id: result?.id ?? 0, version }
  }

  /**
   * Get events for a stream
   */
  async getEvents(
    streamId: string,
    options: { fromVersion?: number; limit?: number } = {}
  ): Promise<Array<{
    id: number
    streamId: string
    streamType: string
    eventType: string
    payload: unknown
    metadata?: unknown
    version: number
    timestamp: number
  }>> {
    await this.ensureSchema()

    const { fromVersion = 0, limit = 1000 } = options

    const results = this.ctx.storage.sql.exec<{
      id: number
      stream_id: string
      stream_type: string
      event_type: string
      payload: string
      metadata: string | null
      version: number
      timestamp: number
    }>(
      `SELECT * FROM events WHERE stream_id = ? AND version > ? ORDER BY version LIMIT ?`,
      streamId,
      fromVersion,
      limit
    ).toArray()

    return results.map((row) => ({
      id: row.id,
      streamId: row.stream_id,
      streamType: row.stream_type,
      eventType: row.event_type,
      payload: JSON.parse(row.payload),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      version: row.version,
      timestamp: row.timestamp,
    }))
  }

  // ==========================================================================
  // Things (Schema.org Compatible Entities)
  // ==========================================================================

  /**
   * Store a Schema.org compatible thing
   */
  async putThing<T extends Record<string, unknown>>(
    type: string,
    id: string,
    data: T,
    options: { ns?: string; url?: string; context?: string } = {}
  ): Promise<T & { '@type': string; '@id': string }> {
    await this.ensureSchema()

    const { ns = 'default', url, context } = options
    const now = Date.now()

    const thing = {
      '@type': type,
      '@id': id,
      ...data,
    }

    this.ctx.storage.sql.exec(
      `INSERT OR REPLACE INTO things (ns, type, id, url, data, context, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, COALESCE((SELECT created_at FROM things WHERE ns = ? AND type = ? AND id = ?), ?), ?)`,
      ns, type, id, url ?? null, JSON.stringify(thing), context ?? null,
      ns, type, id, now, now
    )

    return thing
  }

  /**
   * Get a thing by type and id
   */
  async getThing<T extends Record<string, unknown>>(
    type: string,
    id: string,
    ns = 'default'
  ): Promise<(T & { '@type': string; '@id': string }) | null> {
    await this.ensureSchema()

    const result = this.ctx.storage.sql.exec<{ data: string }>(
      `SELECT data FROM things WHERE ns = ? AND type = ? AND id = ?`,
      ns, type, id
    ).one()

    if (!result) return null
    return JSON.parse(result.data) as T & { '@type': string; '@id': string }
  }

  /**
   * List things by type
   */
  async listThings<T extends Record<string, unknown>>(
    type: string,
    options: { ns?: string; limit?: number; offset?: number } = {}
  ): Promise<Array<T & { '@type': string; '@id': string }>> {
    await this.ensureSchema()

    const { ns = 'default', limit = 100, offset = 0 } = options

    const results = this.ctx.storage.sql.exec<{ data: string }>(
      `SELECT data FROM things WHERE ns = ? AND type = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      ns, type, limit, offset
    ).toArray()

    return results.map((row) => JSON.parse(row.data) as T & { '@type': string; '@id': string })
  }
}

// ============================================================================
// Exports
// ============================================================================

export type {
  DOState,
  DOEnv,
  DOStorage,
  DOConfig,
  Document,
  StorageProvider,
  SchemaConfig,
  TableDefinition,
  ColumnDefinition,
  IndexDefinition,
  RPCHandler,
  RPCRegistry,
  WebSocketMessage,
}

// Re-export from do-core for advanced usage
export {
  DOTiny,
}

// Default export
export default DO
