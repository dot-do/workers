# @dotdo/workers Architecture

## Overview

A monorepo of Cloudflare Workers deployed on the .do account, providing RPC-accessible AI primitives. Each worker is both:
1. **An RPC server** - accessible via Cloudflare service bindings internally
2. **A CapnWeb server** - accessible externally via HTTP and WebSocket

All workers use Durable Objects with WebSocket hibernation for cost-effective, stateful connections.

## Research Summary

### Key Technologies

| Technology | Purpose |
|-----------|---------|
| **Workers RPC** | Service bindings for internal worker-to-worker calls |
| **RpcTarget** | Base class for objects callable via RPC |
| **WorkerEntrypoint** | Base class for Workers as RPC servers |
| **WebSocket Hibernation** | Cost-effective long-lived connections |
| **agents** (npm) | Cloudflare's Agent SDK (extends partyserver) |

### Inheritance Chain (agents package)
```
Agent<Env, State, Props> extends Server extends DurableObject
```

## Proposed Architecture

### 1. Base Classes

```
┌─────────────────────────────────────────────────────────────┐
│                    cloudflare:workers                        │
│                      DurableObject                           │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      agents (npm)                            │
│                        Server                                │
│   • WebSocket handling (partyserver)                        │
│   • Connection management                                    │
│   • Room-based messaging                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      agents (npm)                            │
│                        Agent                                 │
│   • State management (SQL-backed)                           │
│   • @callable() decorator for RPC                           │
│   • Scheduling & queuing                                     │
│   • MCP integration                                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              @dotdo/workers/db (alias: @dotdo/db)            │
│                         DB                                   │
│   • RpcTarget implementation (capnweb style)                │
│   • HTTP + WS dual transport                                │
│   • WebSocket hibernation handlers                          │
│   • Auth context propagation                                 │
│   • Simple CRUD primitives (get, list, create, update, del) │
│   • ai-database compatible interface                         │
│   • SMALL BUNDLE (~20-30KB treeshaken)                      │
└─────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    MongoDB      │  │   Other .do     │  │   Other .do     │
│   (mongo.do)    │  │    Workers      │  │    Workers      │
│ • Full MongoDB  │  │ • Functions     │  │ • Agents        │
│   compatibility │  │ • Workflows     │  │ • Humans        │
│ • Aggregation   │  │ • Workers       │  │ • OAuth         │
│ • Wire protocol │  │                 │  │                 │
│ • BSON, etc.    │  │ Use DB for      │  │ Use DB for      │
│ • ~176KB bundle │  │ simple storage  │  │ simple storage  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Key Design: DB as the Core Base Class

The `DB` class is the foundational layer that:
1. **Extends Agent** from Cloudflare's `agents` package (getting state, scheduling, WebSocket)
2. **Adds RpcTarget** capabilities (capnweb-style HTTP/WS/RPC transport)
3. **Provides simple CRUD** that's ai-database compatible
4. **Stays lightweight** - workers that just need simple storage don't get MongoDB bloat

**mongo.do refactor**: Currently `MondoDatabase` is a plain DurableObject.
We'll refactor it to extend `DB`, inheriting all the base capabilities while
adding full MongoDB compatibility (aggregation, wire protocol, BSON, etc.).

### 1b. DB Class Specification

```typescript
// @dotdo/workers/db (also published as @dotdo/db)
import { Agent, callable } from 'agents'
import { RpcTarget } from 'capnweb'

/**
 * DB - Base class for all .do workers
 *
 * Extends Cloudflare's Agent with:
 * - Workers RPC (service bindings)
 * - Capnweb RPC (HTTP + WS)
 * - MCP (HTTP with optional OAuth 2.1)
 * - Simple CRUD operations (ai-database compatible)
 * - WebSocket hibernation support
 * - Auth context propagation
 *
 * Built-in MCP Tools (required by OpenAI ChatGPT/Deep Research):
 * - search: Full-text search across collections
 * - fetch: Retrieve documents/resources
 * - do: Secure arbitrary code execution via ai-evaluate
 */
export class DB<Env = unknown, State = unknown> extends Agent<Env, State>
  implements RpcTarget {

  // ============================================
  // RpcTarget Implementation (capnweb style)
  // ============================================

  protected allowedMethods = new Set<string>()

  /** Check if method is callable via RPC */
  hasMethod(name: string): boolean {
    return this.allowedMethods.has(name)
  }

  /** Invoke method by name (for RPC) */
  async invoke(method: string, params: unknown[]): Promise<unknown> {
    if (!this.allowedMethods.has(method)) {
      throw new Error(`Method not allowed: ${method}`)
    }
    const fn = (this as any)[method]
    if (typeof fn !== 'function') {
      throw new Error(`Method not found: ${method}`)
    }
    return fn.apply(this, params)
  }

  // ============================================
  // Simple CRUD (ai-database compatible)
  // ============================================

  @callable()
  async get<T>(collection: string, id: string): Promise<T | null> {
    const sql = this.ctx.storage.sql
    const result = sql.exec(
      `SELECT data FROM documents WHERE collection = ? AND _id = ?`,
      collection, id
    ).toArray()
    return result[0] ? JSON.parse(result[0].data) : null
  }

  @callable()
  async list<T>(collection: string, options?: ListOptions): Promise<T[]> {
    const sql = this.ctx.storage.sql
    const { limit = 100, offset = 0, where } = options ?? {}
    // Simple list with optional limit/offset
    const result = sql.exec(
      `SELECT data FROM documents WHERE collection = ? LIMIT ? OFFSET ?`,
      collection, limit, offset
    ).toArray()
    return result.map(r => JSON.parse(r.data))
  }

  @callable()
  async create<T extends { _id?: string }>(collection: string, doc: T): Promise<T> {
    const sql = this.ctx.storage.sql
    const id = doc._id ?? crypto.randomUUID()
    const data = { ...doc, _id: id }
    sql.exec(
      `INSERT INTO documents (collection, _id, data) VALUES (?, ?, json(?))`,
      collection, id, JSON.stringify(data)
    )
    return data as T
  }

  @callable()
  async update<T>(collection: string, id: string, updates: Partial<T>): Promise<T | null> {
    const existing = await this.get<T>(collection, id)
    if (!existing) return null
    const updated = { ...existing, ...updates }
    const sql = this.ctx.storage.sql
    sql.exec(
      `UPDATE documents SET data = json(?) WHERE collection = ? AND _id = ?`,
      JSON.stringify(updated), collection, id
    )
    return updated
  }

  @callable()
  async delete(collection: string, id: string): Promise<boolean> {
    const sql = this.ctx.storage.sql
    sql.exec(
      `DELETE FROM documents WHERE collection = ? AND _id = ?`,
      collection, id
    )
    return true
  }

  // ============================================
  // WebSocket Hibernation Support
  // ============================================

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    // Restore session from attachment
    const session = ws.deserializeAttachment()

    // Handle RPC-style messages
    const data = JSON.parse(message as string)
    if (data.type === 'rpc') {
      try {
        const result = await this.invoke(data.method, data.args ?? [])
        ws.send(JSON.stringify({ id: data.id, result }))
      } catch (error) {
        ws.send(JSON.stringify({
          id: data.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        }))
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    // Cleanup - subclasses can override
  }

  async webSocketError(ws: WebSocket, error: unknown) {
    console.error('WebSocket error:', error)
  }

  // ============================================
  // Multi-Transport Support (Hono Router)
  // ============================================

  private router = this.createRouter()

  /**
   * Create Hono router with all routes
   * Using Hono for lightweight, fast routing with middleware support
   */
  private createRouter() {
    const app = new Hono<{ Bindings: Env }>()

    // Middleware: Add DB instance to context
    app.use('*', async (c, next) => {
      c.set('db', this)
      await next()
    })

    // 1. WebSocket upgrade (Capnweb WS transport)
    app.get('/ws', (c) => this.handleWebSocketUpgrade(c.req.raw))

    // 2. MCP endpoint (with optional OAuth 2.1)
    app.route('/mcp', this.createMcpRoutes())

    // 3. Capnweb HTTP RPC
    app.post('/rpc', (c) => this.handleRpc(c.req.raw))
    app.post('/rpc/batch', (c) => this.handleRpcBatch(c.req.raw))

    // 4. Monaco Editor UI: /~/:resource/:id
    app.get('/~', (c) => this.handleCollectionPicker(c))
    app.get('/~/:resource', (c) => this.handleDocumentList(c))
    app.get('/~/:resource/:id', (c) => this.handleMonacoEditor(c))

    // 5. HATEOAS REST API: /api/:resource/:id
    app.get('/api', (c) => this.handleApiRoot(c))
    app.get('/api/.schema/:method?', (c) => this.handleSchemaRequest(c))
    app.get('/api/:resource', (c) => this.handleRestList(c))
    app.get('/api/:resource/:id', (c) => this.handleRestGet(c))
    app.post('/api/:resource', (c) => this.handleRestCreate(c))
    app.put('/api/:resource/:id', (c) => this.handleRestUpdate(c))
    app.delete('/api/:resource/:id', (c) => this.handleRestDelete(c))

    // 6. Root: GET for HATEOAS discovery, POST for MCP
    app.get('/', (c) => this.handleHateoasDiscovery(c))
    app.post('/', (c) => this.handleMcp(c.req.raw))  // POST / = MCP (simple server config)

    // Health check
    app.get('/health', (c) => c.json({ status: 'ok' }))

    return app
  }

  override async fetch(request: Request): Promise<Response> {
    // Check for WebSocket upgrade first (before Hono)
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocketUpgrade(request)
    }

    // Use Hono router for all other requests
    return this.router.fetch(request, this.env)
  }

  protected async handleWebSocketUpgrade(request: Request): Promise<Response> {
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    // Use ctx.acceptWebSocket for hibernation
    this.ctx.acceptWebSocket(server)
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('ping', 'pong')
    )

    return new Response(null, { status: 101, webSocket: client })
  }

  protected async handleRpc(request: Request): Promise<Response> {
    const body = await request.json() as { method: string; params?: unknown[] }

    if (!this.hasMethod(body.method)) {
      return Response.json({ error: `Method not found: ${body.method}` }, { status: 400 })
    }

    try {
      const result = await this.invoke(body.method, body.params ?? [])
      return Response.json({ result })
    } catch (error) {
      return Response.json({
        error: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 })
    }
  }

  protected async handleMcp(request: Request): Promise<Response> {
    // MCP protocol handler with OAuth 2.1 support
    // Uses Agent's built-in MCP capabilities + our custom tools
    return this.mcpHandler.handle(request)
  }

  // ============================================
  // HATEOAS REST API (apis.vin style)
  // ============================================

  /**
   * Root discovery endpoint - HATEOAS style API navigation
   * Returns clickable links to all available resources and methods
   */
  protected async handleHateoasDiscovery(request: Request, url: URL): Promise<Response> {
    const baseUrl = `${url.protocol}//${url.host}`
    const collections = await this.listCollections()

    const discovery = {
      api: {
        name: this.constructor.name,
        version: '1.0.0',
        documentation: `${baseUrl}/docs`,
      },
      links: {
        self: baseUrl,
        api: `${baseUrl}/api`,
        rpc: `${baseUrl}/rpc`,
        mcp: `${baseUrl}/mcp`,
        websocket: `ws://${url.host}/ws`,
      },
      discover: {
        // Collections (data resources)
        collections: collections.map(c => ({
          name: c,
          icon: '📁',
          href: `${baseUrl}/api/${c}`,
          edit: `${baseUrl}/~/${c}`,
        })),
        // Available RPC methods
        methods: Array.from(this.allowedMethods).map(m => ({
          name: m,
          icon: this.getMethodIcon(m),
          href: `${baseUrl}/rpc`,
          schema: `${baseUrl}/api/.schema/${m}`,
        })),
        // MCP tools
        tools: ['search', 'fetch', 'do'].map(t => ({
          name: t,
          icon: t === 'search' ? '🔍' : t === 'fetch' ? '📥' : '⚡',
          href: `${baseUrl}/mcp/tools/${t}`,
        })),
      },
      request: {
        origin: request.headers.get('CF-Connecting-IP'),
        country: request.headers.get('CF-IPCountry'),
        userAgent: request.headers.get('User-Agent'),
      },
    }

    return Response.json(discovery, {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  /**
   * REST API handler - CRUD operations on resources
   * Routes: GET/POST/PUT/DELETE /api/:resource/:id?
   */
  protected async handleRestApi(request: Request, url: URL): Promise<Response> {
    const pathParts = url.pathname.replace('/api/', '').split('/').filter(Boolean)
    const [resource, id, ...rest] = pathParts
    const method = request.method

    // Special routes
    if (resource === '.schema') {
      return this.handleSchemaRequest(id)
    }

    if (!resource) {
      // GET /api - list all collections
      const collections = await this.listCollections()
      return Response.json({
        collections: collections.map(c => ({
          name: c,
          href: `${url.origin}/api/${c}`,
        }))
      })
    }

    switch (method) {
      case 'GET':
        if (id) {
          // GET /api/:resource/:id - get single document
          const doc = await this.get(resource, id)
          if (!doc) {
            return Response.json({ error: 'Not found' }, { status: 404 })
          }
          return Response.json({
            data: doc,
            links: {
              self: `${url.origin}/api/${resource}/${id}`,
              edit: `${url.origin}/~/${resource}/${id}`,
              collection: `${url.origin}/api/${resource}`,
            }
          })
        } else {
          // GET /api/:resource - list documents
          const docs = await this.list(resource, this.parseListOptions(url))
          return Response.json({
            data: docs,
            links: {
              self: `${url.origin}/api/${resource}`,
              create: `${url.origin}/api/${resource}`,
            }
          })
        }

      case 'POST':
        // POST /api/:resource - create document
        const createData = await request.json()
        const created = await this.create(resource, createData)
        return Response.json({
          data: created,
          links: {
            self: `${url.origin}/api/${resource}/${created.id}`,
            edit: `${url.origin}/~/${resource}/${created.id}`,
          }
        }, { status: 201 })

      case 'PUT':
        // PUT /api/:resource/:id - update document
        if (!id) {
          return Response.json({ error: 'ID required for PUT' }, { status: 400 })
        }
        const updateData = await request.json()
        const updated = await this.update(resource, id, updateData)
        if (!updated) {
          return Response.json({ error: 'Not found' }, { status: 404 })
        }
        return Response.json({
          data: updated,
          links: {
            self: `${url.origin}/api/${resource}/${id}`,
            edit: `${url.origin}/~/${resource}/${id}`,
          }
        })

      case 'DELETE':
        // DELETE /api/:resource/:id - delete document
        if (!id) {
          return Response.json({ error: 'ID required for DELETE' }, { status: 400 })
        }
        const deleted = await this.delete(resource, id)
        if (!deleted) {
          return Response.json({ error: 'Not found' }, { status: 404 })
        }
        return Response.json({ success: true }, { status: 200 })

      default:
        return Response.json({ error: 'Method not allowed' }, { status: 405 })
    }
  }

  /**
   * Monaco Editor UI - inline document editing
   * Route: /~/:resource/:id
   */
  protected async handleMonacoEditor(request: Request, url: URL): Promise<Response> {
    const pathParts = url.pathname.replace('/~/', '').split('/').filter(Boolean)
    const [resource, id] = pathParts

    if (!resource) {
      // /~ - show collection picker
      const collections = await this.listCollections()
      return new Response(this.renderCollectionPicker(collections, url.origin), {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    if (!id) {
      // /~/:resource - show document list for collection
      const docs = await this.list(resource, { limit: 100 })
      return new Response(this.renderDocumentList(resource, docs, url.origin), {
        headers: { 'Content-Type': 'text/html' }
      })
    }

    // /~/:resource/:id - Monaco editor for specific document
    const doc = await this.get(resource, id)
    const content = doc ? JSON.stringify(doc, null, 2) : '{}'

    return new Response(this.renderMonacoEditor(resource, id, content, url.origin), {
      headers: { 'Content-Type': 'text/html' }
    })
  }

  /**
   * Render Monaco Editor HTML
   */
  private renderMonacoEditor(resource: string, id: string, content: string, origin: string): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>Edit ${resource}/${id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 16px;
      background: #1e1e1e;
      color: #fff;
    }
    .header h1 { font-size: 14px; font-weight: 500; }
    .header .path { opacity: 0.7; }
    .save-btn {
      background: #0e639c;
      color: white;
      border: none;
      padding: 6px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    .save-btn:hover { background: #1177bb; }
    .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    #editor { height: calc(100vh - 40px); }
    .status { position: fixed; bottom: 8px; right: 16px; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="header">
    <h1><span class="path">${resource}/</span>${id}</h1>
    <button class="save-btn" id="saveBtn">Save</button>
  </div>
  <div id="editor"></div>
  <div class="status" id="status">Ready</div>

  <script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js"></script>
  <script>
    require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], function() {
      const editor = monaco.editor.create(document.getElementById('editor'), {
        value: ${JSON.stringify(content)},
        language: 'json',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
      });

      let isDirty = false;
      editor.onDidChangeModelContent(() => {
        isDirty = true;
        document.getElementById('status').textContent = 'Modified';
      });

      document.getElementById('saveBtn').onclick = async () => {
        const btn = document.getElementById('saveBtn');
        btn.disabled = true;
        btn.textContent = 'Saving...';

        try {
          const response = await fetch('${origin}/api/${resource}/${id}', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: editor.getValue()
          });

          if (response.ok) {
            isDirty = false;
            document.getElementById('status').textContent = 'Saved';
          } else {
            const err = await response.json();
            alert('Save failed: ' + (err.error || 'Unknown error'));
          }
        } catch (e) {
          alert('Save failed: ' + e.message);
        } finally {
          btn.disabled = false;
          btn.textContent = 'Save';
        }
      };

      // Ctrl+S to save
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        document.getElementById('saveBtn').click();
      });
    });
  </script>
</body>
</html>`
  }

  /**
   * Render collection picker HTML
   */
  private renderCollectionPicker(collections: string[], origin: string): string {
    const items = collections.map(c =>
      `<a href="${origin}/~/${c}" class="item">📁 ${c}</a>`
    ).join('')

    return `<!DOCTYPE html>
<html><head><title>Collections</title>
<style>
  body { font-family: system-ui; padding: 20px; background: #1e1e1e; color: #fff; }
  h1 { margin-bottom: 16px; }
  .item { display: block; padding: 8px 12px; color: #4fc3f7; text-decoration: none; }
  .item:hover { background: #333; }
</style>
</head><body>
  <h1>Collections</h1>
  ${items || '<p>No collections yet</p>'}
</body></html>`
  }

  /**
   * Render document list HTML
   */
  private renderDocumentList(resource: string, docs: unknown[], origin: string): string {
    const items = (docs as Array<{id: string}>).map(d =>
      `<a href="${origin}/~/${resource}/${d.id}" class="item">📄 ${d.id}</a>`
    ).join('')

    return `<!DOCTYPE html>
<html><head><title>${resource}</title>
<style>
  body { font-family: system-ui; padding: 20px; background: #1e1e1e; color: #fff; }
  h1 { margin-bottom: 16px; }
  .item { display: block; padding: 8px 12px; color: #4fc3f7; text-decoration: none; }
  .item:hover { background: #333; }
  .back { margin-bottom: 16px; }
</style>
</head><body>
  <a href="${origin}/~/" class="back">← Back</a>
  <h1>📁 ${resource}</h1>
  ${items || '<p>No documents yet</p>'}
</body></html>`
  }

  /** List all collections in the database */
  private async listCollections(): Promise<string[]> {
    const sql = this.ctx.storage.sql
    const result = sql.exec(
      `SELECT DISTINCT collection FROM documents ORDER BY collection`
    ).toArray()
    return result.map((r: any) => r.collection as string)
  }

  /** Parse list options from URL query params */
  private parseListOptions(url: URL): ListOptions {
    return {
      limit: Number(url.searchParams.get('limit')) || undefined,
      offset: Number(url.searchParams.get('offset')) || undefined,
      orderBy: url.searchParams.get('orderBy') || undefined,
      order: (url.searchParams.get('order') as 'asc' | 'desc') || undefined,
    }
  }

  /** Get icon for RPC method */
  private getMethodIcon(method: string): string {
    const icons: Record<string, string> = {
      get: '📖', list: '📋', create: '➕', update: '✏️', delete: '🗑️',
      search: '🔍', fetch: '📥', do: '⚡',
    }
    return icons[method] || '🔧'
  }

  /** Handle schema requests */
  private async handleSchemaRequest(methodName?: string): Promise<Response> {
    // Return JSON schema for methods
    const schemas: Record<string, object> = {
      get: { params: ['collection', 'id'], returns: 'Document | null' },
      list: { params: ['collection', 'options?'], returns: 'Document[]' },
      create: { params: ['collection', 'data'], returns: 'Document' },
      update: { params: ['collection', 'id', 'data'], returns: 'Document | null' },
      delete: { params: ['collection', 'id'], returns: 'boolean' },
    }

    if (methodName && schemas[methodName]) {
      return Response.json(schemas[methodName])
    }
    return Response.json(schemas)
  }

  // ============================================
  // MCP Tools (OpenAI ChatGPT/Deep Research compatible)
  // ============================================

  /** MCP Tool: search - Full-text search across collections */
  @callable()
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const sql = this.ctx.storage.sql
    const { collection, limit = 10 } = options ?? {}

    // Full-text search using SQLite FTS or LIKE
    let sqlQuery = `
      SELECT collection, _id, data,
             CASE WHEN data LIKE ? THEN 1 ELSE 0 END as relevance
      FROM documents
      WHERE data LIKE ?
    `
    const params: unknown[] = [`%${query}%`, `%${query}%`]

    if (collection) {
      sqlQuery += ` AND collection = ?`
      params.push(collection)
    }

    sqlQuery += ` ORDER BY relevance DESC LIMIT ?`
    params.push(limit)

    const results = sql.exec(sqlQuery, ...params).toArray()
    return results.map(r => ({
      collection: r.collection,
      id: r._id,
      data: JSON.parse(r.data),
      score: r.relevance
    }))
  }

  /** MCP Tool: fetch - Retrieve document/resource by ID or URL */
  @callable()
  async fetch(target: string, options?: FetchOptions): Promise<FetchResult> {
    // If target looks like a URL, fetch external resource
    if (target.startsWith('http://') || target.startsWith('https://')) {
      const response = await globalThis.fetch(target, options)
      const contentType = response.headers.get('content-type') ?? ''

      if (contentType.includes('application/json')) {
        return { type: 'json', data: await response.json() }
      } else if (contentType.includes('text/')) {
        return { type: 'text', data: await response.text() }
      } else {
        return { type: 'binary', data: await response.arrayBuffer() }
      }
    }

    // Otherwise, fetch from local collection
    // Format: "collection/id" or just "id" (searches all collections)
    const parts = target.split('/')
    if (parts.length === 2) {
      const doc = await this.get(parts[0], parts[1])
      return { type: 'document', data: doc }
    }

    // Search all collections for this ID
    const sql = this.ctx.storage.sql
    const result = sql.exec(
      `SELECT collection, data FROM documents WHERE _id = ? LIMIT 1`,
      target
    ).toArray()

    if (result[0]) {
      return { type: 'document', data: JSON.parse(result[0].data) }
    }

    return { type: 'not_found', data: null }
  }

  /** MCP Tool: do - Secure arbitrary code execution via ai-evaluate */
  @callable()
  async do(code: string, options?: DoOptions): Promise<DoResult> {
    const { context = {}, timeout = 5000 } = options ?? {}

    // Use ai-evaluate for sandboxed execution
    // This provides secure arbitrary code execution in Workers
    const evaluator = this.getEvaluator()

    // Build execution context with RPC access
    const execContext = {
      ...context,
      // Expose all RPC methods to the sandbox
      rpc: this.createRpcProxy(),
      // Expose simple DB operations
      db: {
        get: this.get.bind(this),
        list: this.list.bind(this),
        create: this.create.bind(this),
        update: this.update.bind(this),
        delete: this.delete.bind(this),
        search: this.search.bind(this),
      }
    }

    try {
      const result = await evaluator.evaluate(code, {
        context: execContext,
        timeout,
      })

      return {
        success: true,
        result: result.value,
        logs: result.logs,
        duration: result.duration,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Execution failed',
        logs: [],
        duration: 0,
      }
    }
  }

  /** Create proxy for RPC method access from sandbox */
  private createRpcProxy(): Record<string, (...args: unknown[]) => Promise<unknown>> {
    const proxy: Record<string, (...args: unknown[]) => Promise<unknown>> = {}

    for (const method of this.allowedMethods) {
      proxy[method] = async (...args: unknown[]) => {
        return this.invoke(method, args)
      }
    }

    return proxy
  }

  /** Get or create evaluator instance */
  private getEvaluator(): Evaluator {
    if (!this._evaluator) {
      // Uses ai-evaluate package for sandboxed execution
      this._evaluator = createEvaluator({
        // Can use worker_loaders or miniflare depending on environment
      })
    }
    return this._evaluator
  }

  private _evaluator?: Evaluator
}

// Type definitions
interface ListOptions {
  limit?: number
  offset?: number
  where?: Record<string, unknown>
}

interface SearchOptions {
  collection?: string
  limit?: number
}

interface SearchResult {
  collection: string
  id: string
  data: unknown
  score: number
}

interface FetchOptions extends RequestInit {}

interface FetchResult {
  type: 'json' | 'text' | 'binary' | 'document' | 'not_found'
  data: unknown
}

interface DoOptions {
  context?: Record<string, unknown>
  timeout?: number
}

interface DoResult {
  success: boolean
  result?: unknown
  error?: string
  logs: string[]
  duration: number
}
```

### 1c. MongoDB Class (refactored mongo.do)

```typescript
// mongo.do/src/mondo-database.ts (refactored)
import { DB } from '@dotdo/workers/base'
import { ObjectId } from './types/objectid'
import { AggregationExecutor } from './executor/aggregation-executor'

/**
 * MongoDB - Full MongoDB-compatible database
 *
 * Extends DB base class with:
 * - Full MongoDB query language
 * - Aggregation pipeline
 * - Wire protocol support
 * - BSON types
 * - Index management
 */
export class MongoDB<Env = MondoEnv> extends DB<Env> {
  private schemaManager: SchemaManager

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.schemaManager = new SchemaManager(ctx.storage)

    // Extended allowed methods for MongoDB operations
    this.allowedMethods = new Set([
      // Inherited from DB
      'get', 'list', 'create', 'update', 'delete',
      // MongoDB-specific
      'insertOne', 'insertMany',
      'findOne', 'find',
      'updateOne', 'updateMany',
      'deleteOne', 'deleteMany',
      'aggregate',
      'countDocuments',
      'createIndex', 'dropIndex', 'listIndexes',
    ])

    ctx.blockConcurrencyWhile(async () => {
      await this.schemaManager.initializeSchema()
    })
  }

  // Full MongoDB operations...
  @callable()
  async insertOne(collection: string, document: Document): Promise<InsertOneResult> {
    // ... existing implementation
  }

  @callable()
  async aggregate(collection: string, pipeline: PipelineStage[]): Promise<unknown[]> {
    // ... existing implementation with AggregationExecutor
  }

  // ... rest of MongoDB methods
}

// Export as default for Workers
export { MongoDB as MondoDatabase }
```

### 2. Workers Deployment Map

| Domain | Worker | Package | Purpose |
|--------|--------|---------|---------|
| `database.do` | Database Worker | `@dotdo/workers/database` | ai-database RPC implementation |
| `functions.do` | Functions Worker | `@dotdo/workers/functions` | ai-functions RPC implementation |
| `workflows.do` | Workflows Worker | `@dotdo/workers/workflows` | ai-workflows RPC implementation |
| `workers.do` | Digital Workers | `@dotdo/workers/workers` | digital-workers RPC implementation |
| `agents.do` | Agents Worker | `@dotdo/workers/agents` | autonomous-agents RPC implementation |
| `humans.do` | Humans Worker | `@dotdo/workers/humans` | human-in-the-loop RPC implementation |
| `oauth.do` | OAuth Worker | `@dotdo/workers/oauth` | WorkOS AuthKit integration |

**Note**: Auth is not a separate worker - it's middleware/RPC that all workers use via `@dotdo/middleware/auth`.

### 3. Transport Architecture

Each worker supports three access patterns:

```
┌─────────────────────────────────────────────────────────────┐
│                       Client                                 │
└─────────────────────────────────────────────────────────────┘
        │                    │                    │
        ▼                    ▼                    ▼
   ┌─────────┐         ┌─────────┐         ┌─────────┐
   │  HTTP   │         │   WS    │         │  RPC    │
   │ /api/*  │         │ /ws/*   │         │ binding │
   └─────────┘         └─────────┘         └─────────┘
        │                    │                    │
        └────────────────────┼────────────────────┘
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                      Worker Entry                            │
│                  (WorkerEntrypoint + Hono)                   │
│   • Route HTTP to DO                                         │
│   • Upgrade WS to DO                                         │
│   • Forward RPC to DO                                        │
└─────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│                    Durable Object                            │
│                     (DotDoAgent)                             │
│   • fetch() for HTTP                                         │
│   • webSocketMessage() for WS (hibernation)                 │
│   • RPC methods via @callable()                              │
└─────────────────────────────────────────────────────────────┘
```

### 4. WebSocket Hibernation Pattern

```typescript
import { DurableObject } from 'cloudflare:workers'
import { Agent, callable } from 'agents'

export class DotDoAgent extends Agent {
  // HTTP handler
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocketUpgrade(request)
    }
    return this.handleHttp(request)
  }

  // Hibernation-compatible WS upgrade
  async handleWebSocketUpgrade(request: Request): Promise<Response> {
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    // Use ctx.acceptWebSocket for hibernation
    this.ctx.acceptWebSocket(server)
    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('ping', 'pong')
    )

    return new Response(null, { status: 101, webSocket: client })
  }

  // Hibernation handlers (not addEventListener)
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    // Restore session from attachment
    const session = ws.deserializeAttachment() ?? this.createSession()

    // Handle RPC-style messages
    const data = JSON.parse(message as string)
    if (data.type === 'rpc') {
      const result = await this[data.method](...data.args)
      ws.send(JSON.stringify({ id: data.id, result }))
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    // Cleanup session
  }

  async webSocketError(ws: WebSocket, error: any) {
    console.error('WebSocket error:', error)
  }

  // RPC-callable methods
  @callable()
  async myMethod(arg: string): Promise<string> {
    // Available via HTTP, WS, and service binding RPC
  }
}
```

### 5. NPM Package Structure

```
packages/
├── base/                      # @dotdo/workers/base
│   ├── src/
│   │   ├── index.ts          # Main exports
│   │   ├── agent.ts          # DotDoAgent base class
│   │   ├── store.ts          # DotDoStore with SQLite
│   │   ├── transport.ts      # HTTP/WS/RPC transport layer
│   │   ├── hibernation.ts    # WebSocket hibernation helpers
│   │   └── auth.ts           # Auth context propagation
│   └── package.json
│
├── middleware/               # @dotdo/middleware
│   ├── src/
│   │   ├── index.ts
│   │   ├── auth.ts           # Auth middleware (Hono + RPC)
│   │   ├── rpc-context.ts    # Context propagation for RPC
│   │   ├── rate-limit.ts     # Rate limiting
│   │   └── cors.ts           # CORS handling
│   └── package.json
│
├── db/                       # @dotdo/workers/db
│   ├── src/
│   │   ├── index.ts          # Worker entrypoint
│   │   ├── database.ts       # DatabaseDO implementation
│   │   └── schema.ts         # ai-database schema support
│   └── wrangler.toml
│
├── fn/                       # @dotdo/workers/fn
│   ├── src/
│   │   ├── index.ts
│   │   └── functions.ts      # FunctionsDO implementation
│   └── wrangler.toml
│
├── workflow/                 # @dotdo/workers/workflow
│   ├── src/
│   │   ├── index.ts
│   │   └── workflow.ts       # WorkflowDO implementation
│   └── wrangler.toml
│
├── worker/                   # @dotdo/workers/worker
│   ├── src/
│   │   ├── index.ts
│   │   └── digital-worker.ts # DigitalWorkerDO
│   └── wrangler.toml
│
├── agent/                    # @dotdo/workers/agent
│   ├── src/
│   │   ├── index.ts
│   │   └── agent.ts          # AgentDO implementation
│   └── wrangler.toml
│
├── hitl/                     # @dotdo/workers/hitl
│   ├── src/
│   │   ├── index.ts
│   │   └── hitl.ts           # HumanInTheLoopDO
│   └── wrangler.toml
│
├── auth/                     # @dotdo/workers/auth
│   ├── src/
│   │   ├── index.ts
│   │   ├── auth.ts           # AuthDO - token validation
│   │   └── authz.ts          # Authorization (RBAC/FGA)
│   └── wrangler.toml
│
├── oauth/                    # @dotdo/workers/oauth
│   ├── src/
│   │   ├── index.ts
│   │   ├── oauth.ts          # OAuthDO
│   │   └── workos.ts         # WorkOS AuthKit integration
│   └── wrangler.toml
│
└── eval/                     # @dotdo/workers/eval
    ├── src/
    │   ├── index.ts
    │   └── evaluate.ts       # EvaluateDO - sandboxed execution
    └── wrangler.toml
```

### 6. Middleware over RPC Architecture

The key challenge: how to share Hono middleware (like auth) across Workers without bundling dependencies.

**Solution: RPC-based middleware pattern**

```typescript
// @dotdo/middleware/auth.ts
import { Context, MiddlewareHandler } from 'hono'

// For HTTP routes with Hono
export function authMiddleware(authBinding: AuthService): MiddlewareHandler {
  return async (c: Context, next) => {
    const token = c.req.header('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    // Call auth worker via RPC
    const result = await authBinding.validate(token)
    if (!result.valid) {
      return c.json({ error: 'Invalid token' }, 401)
    }

    c.set('user', result.user)
    c.set('permissions', result.permissions)
    await next()
  }
}

// For RPC methods - decorator pattern
export function requireAuth(permissions?: string[]) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const original = descriptor.value
    descriptor.value = async function(this: DotDoAgent, ...args: any[]) {
      // Get auth context from RPC headers or session
      const authContext = this.getAuthContext()
      if (!authContext) {
        throw new Error('Unauthorized')
      }
      if (permissions) {
        const hasPermission = permissions.every(p => authContext.permissions.includes(p))
        if (!hasPermission) {
          throw new Error('Forbidden')
        }
      }
      return original.apply(this, args)
    }
    return descriptor
  }
}
```

**Context propagation for RPC:**

```typescript
// @dotdo/middleware/rpc-context.ts
export interface RPCContext {
  user?: User
  permissions?: string[]
  traceId?: string
  correlationId?: string
}

// Worker entrypoint wraps RPC with context
export class WorkerWithContext extends WorkerEntrypoint {
  // RPC methods receive context as first hidden parameter
  async callWithContext<T>(
    method: string,
    args: any[],
    context: RPCContext
  ): Promise<T> {
    // Context is serialized in RPC headers
    const stub = this.env.TARGET.get(this.env.TARGET.idFromName('default'))
    return stub[method](...args, { __rpcContext: context })
  }
}

// In DotDoAgent base
export class DotDoAgent extends Agent {
  protected rpcContext?: RPCContext

  // Extract context from RPC call
  protected getAuthContext(): RPCContext | undefined {
    return this.rpcContext
  }
}
```

### 7. Service Binding Configuration

**wrangler.toml for a consuming worker:**

```toml
name = "my-app"

# Service bindings to other .do workers
[[services]]
binding = "AUTH"
service = "auth-do"

[[services]]
binding = "DB"
service = "db-do"

[[services]]
binding = "FN"
service = "fn-do"

[[services]]
binding = "WORKFLOW"
service = "workflow-do"

[[services]]
binding = "AGENT"
service = "agent-do"

[[services]]
binding = "HITL"
service = "hitl-do"

[[services]]
binding = "OAUTH"
service = "oauth-do"

[[services]]
binding = "EVAL"
service = "eval-do"
```

### 8. Type Definitions

**Environment bindings type:**

```typescript
// @dotdo/workers/types
export interface DotDoBindings {
  AUTH: AuthService
  DB: DatabaseService
  FN: FunctionsService
  WORKFLOW: WorkflowService
  AGENT: AgentService
  HITL: HumanInTheLoopService
  OAUTH: OAuthService
  EVAL: EvaluateService
}

// Each service type defines the RPC interface
export interface AuthService {
  validate(token: string): Promise<AuthResult>
  authorize(user: string, resource: string, action: string): Promise<boolean>
  createSession(userId: string, metadata?: Record<string, any>): Promise<Session>
}

export interface DatabaseService {
  // ai-database compatible interface
  get<T>(collection: string, id: string): Promise<T | null>
  list<T>(collection: string, options?: ListOptions): Promise<T[]>
  create<T>(collection: string, data: T): Promise<T>
  update<T>(collection: string, id: string, data: Partial<T>): Promise<T>
  delete(collection: string, id: string): Promise<void>
  query<T>(collection: string, query: string): Promise<T[]>
}

// ... etc for other services
```

### 9. Workers Mapping to Primitives Packages

| Worker | Implements | Key Features |
|--------|-----------|--------------|
| **db.do** | `ai-database` | Schema-first DB, promise pipelining, NL queries, Events/Actions/Artifacts, Authorization engine |
| **fn.do** | `ai-functions` | AI primitives (generate, list, extract, etc.), AIPromise, batch processing, providers |
| **workflow.do** | `ai-workflows` | Event-driven workflows, `$.on.*`, `$.every.*`, scheduling, context |
| **worker.do** | `digital-workers` | Worker interface, Role/Team/Goals, notify/ask/approve/decide/do |
| **agent.do** | `autonomous-agents` | Agent creation, roles, teams, goals, KPIs/OKRs, autonomous execution |
| **hitl.do** | `human-in-the-loop` | Human oversight, approval gates, review queues, escalation |
| **auth.do** | `ai-database/authorization` | RBAC/FGA, permissions, roles, assignments |
| **oauth.do** | - | WorkOS AuthKit, session management, cookies |
| **eval.do** | `ai-evaluate` | Sandboxed code execution, test runner |

### 10. External Client Access (CapnWeb Style)

For external clients (browser, CLI), each worker exposes:

```typescript
// HTTP endpoints
GET  /api/:collection            # List
GET  /api/:collection/:id        # Get
POST /api/:collection            # Create
PUT  /api/:collection/:id        # Update
DELETE /api/:collection/:id      # Delete
POST /api/rpc/:method            # Direct RPC call

// WebSocket
WS /ws                           # Real-time connection
   -> { type: 'rpc', id: string, method: string, args: any[] }
   <- { id: string, result: any } | { id: string, error: string }
   -> { type: 'subscribe', channel: string }
   <- { type: 'event', channel: string, data: any }
```

### 11. Implementation Priorities

**Phase 1: Core Infrastructure**
- [ ] `@dotdo/workers/base` - DotDoAgent base class
- [ ] `@dotdo/middleware` - Auth middleware
- [ ] `@dotdo/workers/auth` - Authentication worker
- [ ] `@dotdo/workers/db` - Database worker

**Phase 2: AI Primitives**
- [ ] `@dotdo/workers/fn` - Functions worker
- [ ] `@dotdo/workers/eval` - Evaluation worker
- [ ] `@dotdo/workers/workflow` - Workflows worker

**Phase 3: Human/Agent Integration**
- [ ] `@dotdo/workers/worker` - Digital workers
- [ ] `@dotdo/workers/agent` - Autonomous agents
- [ ] `@dotdo/workers/hitl` - Human-in-the-loop

**Phase 4: OAuth & Polish**
- [ ] `@dotdo/workers/oauth` - WorkOS integration
- [ ] External client libraries
- [ ] Documentation

## Key Design Decisions

### 1. Not Extending dot-do/mongo
The `dot-do/mongo` repository doesn't exist publicly. Instead, we'll create a new `@dotdo/workers/db` that:
- Implements the `ai-database` API directly
- Uses SQLite (via DO storage) as the primary store
- Supports the full ai-database interface (Things, Events, Actions, Artifacts)

### 2. agents vs Custom Base
We'll extend the `agents` package (`Agent` class) rather than building from scratch because:
- Already handles WebSocket via partyserver
- Provides `@callable()` decorator for RPC
- Has state management, scheduling, queuing built-in
- Active Cloudflare support

We add `DotDoAgent` as a thin layer for:
- Hibernation-compatible WebSocket handlers
- Auth context propagation
- HTTP routing integration
- ai-database primitives bridge

### 3. Middleware Over RPC
Instead of bundling middleware in every worker:
- Auth validation calls `auth.do` via RPC
- Each worker only needs the service binding
- Shared middleware package provides patterns but not implementations
- Zero duplicate code, single source of truth for auth logic

### 4. Dual Transport (HTTP + WS)
Every DO supports both:
- HTTP for simple request/response
- WebSocket for streaming and real-time
- Same methods accessible via both
- Client chooses based on use case
