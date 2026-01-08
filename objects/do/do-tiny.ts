/**
 * DOTiny - Minimal Durable Object Base Class
 *
 * The smallest possible DO implementation with zero external dependencies.
 * Provides core Cloudflare Durable Objects functionality only:
 *
 * - HTTP request handling (fetch)
 * - Alarm scheduling
 * - WebSocket hibernation
 * - Basic state persistence (KV-style)
 *
 * Use this when you need the lightest possible bundle size and don't
 * need Drizzle ORM, auth, or AI capabilities.
 *
 * @example
 * ```typescript
 * import { DO } from 'dotdo/tiny'
 *
 * export class SimpleCounter extends DO {
 *   async fetch(request: Request): Promise<Response> {
 *     const count = await this.ctx.storage.get<number>('count') ?? 0
 *     await this.ctx.storage.put('count', count + 1)
 *     return Response.json({ count: count + 1 })
 *   }
 * }
 * ```
 */

import type {
  DOState,
  DOEnv,
  DOStorage,
  DOConfig,
  Document,
  StorageProvider,
} from './types'

// ============================================================================
// DOTiny Class
// ============================================================================

/**
 * Minimal Durable Object base class
 *
 * Provides the essential DO interface with no external dependencies.
 * Extend this class for the smallest possible bundle size.
 */
export class DO<Env extends DOEnv = DOEnv> implements StorageProvider {
  /** Durable Object state (id, storage, etc.) */
  protected readonly ctx: DOState

  /** Environment bindings */
  protected readonly env: Env

  /** Optional configuration */
  protected readonly config?: DOConfig

  constructor(ctx: DOState, env: Env, config?: DOConfig) {
    this.ctx = ctx
    this.env = env
    this.config = config
  }

  // ==========================================================================
  // Core DO Interface
  // ==========================================================================

  /**
   * Get the unique DO ID as a string
   */
  get id(): string {
    return this.ctx.id.toString()
  }

  /**
   * Get the storage interface for CRUD operations
   */
  getStorage(): DOStorage {
    return this.ctx.storage
  }

  /**
   * Handle incoming HTTP requests
   *
   * Override this method to implement your DO's HTTP API.
   *
   * @param request - The incoming HTTP request
   * @returns HTTP response
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // Default discovery endpoint
    if (url.pathname === '/' && request.method === 'GET') {
      return this.jsonResponse({
        id: this.id,
        type: this.constructor.name,
        version: this.config?.version ?? '0.0.1',
        paths: {
          '/': 'Discovery (this response)',
          '/health': 'Health check',
        },
      })
    }

    // Health check
    if (url.pathname === '/health') {
      return this.jsonResponse({ status: 'ok', id: this.id })
    }

    return new Response('Not Found', { status: 404 })
  }

  /**
   * Handle scheduled alarms
   *
   * Override this method to implement scheduled tasks.
   */
  async alarm(): Promise<void> {
    // Default: no-op
  }

  /**
   * Handle WebSocket messages (hibernation-compatible)
   *
   * Override this method to handle WebSocket messages.
   *
   * @param ws - The WebSocket that received the message
   * @param message - The message content
   */
  async webSocketMessage(_ws: WebSocket, _message: string | ArrayBuffer): Promise<void> {
    // Default: no-op
  }

  /**
   * Handle WebSocket close events (hibernation-compatible)
   *
   * @param ws - The WebSocket being closed
   * @param code - Close code
   * @param reason - Close reason
   * @param wasClean - Whether the close was clean
   */
  async webSocketClose(
    _ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean
  ): Promise<void> {
    // Default: no-op
  }

  /**
   * Handle WebSocket errors (hibernation-compatible)
   *
   * @param ws - The WebSocket with the error
   * @param error - The error that occurred
   */
  async webSocketError(_ws: WebSocket, _error: unknown): Promise<void> {
    // Default: no-op
  }

  // ==========================================================================
  // Simple CRUD Operations (KV-style)
  // ==========================================================================

  /**
   * Get a document by collection and id
   *
   * @param collection - The collection name
   * @param id - The document id
   * @returns The document or null if not found
   */
  async get<T extends Document>(collection: string, docId: string): Promise<T | null> {
    const key = `${collection}:${docId}`
    const doc = await this.ctx.storage.get<T>(key)
    return doc ?? null
  }

  /**
   * Create or update a document
   *
   * @param collection - The collection name
   * @param data - The document data (id will be generated if not provided)
   * @returns The created/updated document
   */
  async put<T extends Partial<Document>>(
    collection: string,
    data: T
  ): Promise<T & Document> {
    const id = data.id ?? crypto.randomUUID()
    const now = Date.now()

    const doc: T & Document = {
      ...data,
      id,
      createdAt: data.createdAt ?? now,
      updatedAt: now,
    }

    const key = `${collection}:${id}`
    await this.ctx.storage.put(key, doc)

    return doc
  }

  /**
   * Delete a document
   *
   * @param collection - The collection name
   * @param id - The document id
   * @returns true if deleted
   */
  async del(collection: string, docId: string): Promise<boolean> {
    const key = `${collection}:${docId}`
    return this.ctx.storage.delete(key)
  }

  /**
   * List documents in a collection
   *
   * @param collection - The collection name
   * @param options - List options
   * @returns Array of documents
   */
  async list<T extends Document>(
    collection: string,
    options: { limit?: number; reverse?: boolean } = {}
  ): Promise<T[]> {
    const { limit = 100, reverse = false } = options
    const prefix = `${collection}:`

    const entries = await this.ctx.storage.list<T>({ prefix, limit, reverse })
    return Array.from(entries.values())
  }

  // ==========================================================================
  // Alarm Helpers
  // ==========================================================================

  /**
   * Schedule an alarm
   *
   * @param time - When to trigger (Date or Unix ms)
   */
  async scheduleAlarm(time: Date | number): Promise<void> {
    await this.ctx.storage.setAlarm(time)
  }

  /**
   * Get the next scheduled alarm
   *
   * @returns Alarm time in Unix ms, or null if none scheduled
   */
  async getAlarm(): Promise<number | null> {
    return this.ctx.storage.getAlarm()
  }

  /**
   * Cancel the scheduled alarm
   */
  async cancelAlarm(): Promise<void> {
    await this.ctx.storage.deleteAlarm()
  }

  /**
   * Schedule an alarm for a duration from now
   *
   * @param ms - Milliseconds from now
   */
  async scheduleAlarmIn(ms: number): Promise<void> {
    await this.ctx.storage.setAlarm(Date.now() + ms)
  }

  // ==========================================================================
  // WebSocket Helpers
  // ==========================================================================

  /**
   * Accept a WebSocket for hibernation
   *
   * @param ws - The WebSocket to accept
   * @param tags - Optional tags for grouping
   */
  acceptWebSocket(ws: WebSocket, tags?: string[]): void {
    this.ctx.acceptWebSocket(ws, tags)
  }

  /**
   * Get all WebSockets, optionally filtered by tag
   *
   * @param tag - Optional tag to filter by
   * @returns Array of WebSockets
   */
  getWebSockets(tag?: string): WebSocket[] {
    return this.ctx.getWebSockets(tag)
  }

  /**
   * Broadcast a message to all connected WebSockets
   *
   * @param message - The message to send
   * @param tag - Optional tag to filter recipients
   */
  broadcast(message: string | ArrayBuffer, tag?: string): void {
    const sockets = this.getWebSockets(tag)
    for (const ws of sockets) {
      try {
        ws.send(message)
      } catch {
        // Socket may have closed
      }
    }
  }

  // ==========================================================================
  // Response Helpers
  // ==========================================================================

  /**
   * Create a JSON response
   *
   * @param data - The data to serialize
   * @param status - HTTP status code
   * @returns JSON Response
   */
  protected jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  /**
   * Create an error response
   *
   * @param message - Error message
   * @param status - HTTP status code
   * @returns JSON error Response
   */
  protected errorResponse(message: string, status = 500): Response {
    return this.jsonResponse({ error: message }, status)
  }

  /**
   * Create a WebSocket upgrade response
   *
   * @param request - The upgrade request
   * @param tags - Optional WebSocket tags
   * @returns WebSocket upgrade Response
   */
  protected upgradeWebSocket(request: Request, tags?: string[]): Response {
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    this.ctx.acceptWebSocket(server, tags)

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }
}

// ============================================================================
// Exports
// ============================================================================

export type { DOState, DOEnv, DOStorage, DOConfig, Document, StorageProvider }

// Default export for convenience
export default DO
