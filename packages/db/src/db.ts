/**
 * @dotdo/db - Core DB Base Class
 *
 * Extends Cloudflare's Agent class with:
 * - RpcTarget implementation (capnweb style)
 * - Multi-transport support (Workers RPC, HTTP, WebSocket, MCP)
 * - Simple CRUD operations (ai-database compatible)
 * - MCP tools (search, fetch, do)
 * - WebSocket hibernation
 * - HATEOAS REST API
 * - Monaco Editor UI
 */

import { Hono } from 'hono'
import type {
  ListOptions,
  Document,
  SearchOptions,
  SearchResult,
  FetchOptions,
  FetchResult,
  DoOptions,
  DoResult,
} from './types'

// Placeholder types until we can import from agents package
type ExecutionContext = {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}

type DurableObjectState = {
  storage: {
    sql: {
      exec(query: string, ...params: unknown[]): { toArray(): unknown[] }
    }
  }
  acceptWebSocket?(ws: WebSocket): void
  setWebSocketAutoResponse?(pair: unknown): void
}

/**
 * DB - Core Database Base Class
 *
 * The foundational layer for all .do workers that need database capabilities.
 * Designed to be lightweight (~20-30KB treeshaken) while providing:
 * - Multi-transport RPC (Workers RPC, HTTP, WebSocket, MCP)
 * - Simple CRUD operations
 * - MCP tools for AI integration
 */
export class DB<Env = unknown, State = unknown> {
  protected ctx: DurableObjectState
  protected env: Env

  /**
   * Allowlist of methods that can be invoked via RPC.
   * Prevents invocation of inherited methods like constructor, __proto__, etc.
   */
  protected allowedMethods = new Set([
    // CRUD operations
    'get',
    'list',
    'create',
    'update',
    'delete',
    // MCP tools
    'search',
    'fetch',
    'do',
  ])

  constructor(ctx: DurableObjectState, env: Env) {
    this.ctx = ctx
    this.env = env
  }

  // ============================================
  // RpcTarget Implementation
  // ============================================

  /**
   * Check if a method is allowed to be invoked via RPC
   */
  hasMethod(name: string): boolean {
    return this.allowedMethods.has(name)
  }

  /**
   * Invoke a method by name
   */
  async invoke(method: string, params: unknown[]): Promise<unknown> {
    if (!this.allowedMethods.has(method)) {
      throw new Error(`Method not allowed: ${method}`)
    }

    const fn = (this as unknown as Record<string, unknown>)[method]
    if (typeof fn !== 'function') {
      throw new Error(`Method not found: ${method}`)
    }

    return (fn as (...args: unknown[]) => Promise<unknown>).apply(this, params)
  }

  // ============================================
  // Simple CRUD Operations
  // ============================================

  /**
   * Get a document by ID
   */
  async get<T extends Document>(collection: string, id: string): Promise<T | null> {
    // TODO: Implement with SQLite storage
    throw new Error('Not implemented')
  }

  /**
   * List documents in a collection
   */
  async list<T extends Document>(collection: string, options?: ListOptions): Promise<T[]> {
    // TODO: Implement with SQLite storage
    throw new Error('Not implemented')
  }

  /**
   * Create a new document
   */
  async create<T extends Document>(collection: string, doc: Omit<T, 'id'> | T): Promise<T> {
    // TODO: Implement with SQLite storage
    throw new Error('Not implemented')
  }

  /**
   * Update an existing document
   */
  async update<T extends Document>(
    collection: string,
    id: string,
    updates: Partial<T>
  ): Promise<T | null> {
    // TODO: Implement with SQLite storage
    throw new Error('Not implemented')
  }

  /**
   * Delete a document
   */
  async delete(collection: string, id: string): Promise<boolean> {
    // TODO: Implement with SQLite storage
    throw new Error('Not implemented')
  }

  // ============================================
  // MCP Tools
  // ============================================

  /**
   * Search across collections
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    // TODO: Implement full-text search
    throw new Error('Not implemented')
  }

  /**
   * Fetch a URL or document
   */
  async fetch(target: string, options?: FetchOptions): Promise<FetchResult> {
    // TODO: Implement fetch tool
    throw new Error('Not implemented')
  }

  /**
   * Execute code in sandbox (via ai-evaluate)
   */
  async do(code: string, options?: DoOptions): Promise<DoResult> {
    // TODO: Implement secure code execution
    throw new Error('Not implemented')
  }

  // ============================================
  // WebSocket Hibernation
  // ============================================

  /**
   * Handle incoming WebSocket message
   */
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // TODO: Implement WebSocket message handling
  }

  /**
   * Handle WebSocket close
   */
  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean
  ): Promise<void> {
    // TODO: Implement WebSocket close handling
  }

  /**
   * Handle WebSocket error
   */
  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error('WebSocket error:', error)
  }

  // ============================================
  // Multi-Transport fetch (Hono Router)
  // ============================================

  /**
   * Handle incoming HTTP requests
   */
  async fetch(request: Request): Promise<Response> {
    // TODO: Implement Hono router
    return new Response('Not implemented', { status: 501 })
  }
}
