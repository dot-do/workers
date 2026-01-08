/**
 * Todo App Example - CRUD Operations with Durable Objects
 *
 * Demonstrates:
 * - Basic CRUD operations
 * - Real-time sync via WebSocket
 * - Multi-user support with DO-per-user pattern
 *
 * @module examples/todo-app
 */

import { DOCore, type DOState, type DOEnv } from '@dotdo/do'

// ============================================================================
// Types
// ============================================================================

interface Todo {
  id: string
  title: string
  completed: boolean
  createdAt: number
  updatedAt: number
  userId: string
}

interface TodoEnv extends DOEnv {
  TODO_DO: DurableObjectNamespace
}

interface WebSocketMessage {
  type: 'create' | 'update' | 'delete' | 'list' | 'sync'
  payload?: Partial<Todo> | { id: string } | Todo[]
}

// ============================================================================
// Todo Durable Object
// ============================================================================

export class TodoDO extends DOCore<TodoEnv> {
  private connectedClients: Set<WebSocket> = new Set()

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)

    // WebSocket upgrade for real-time sync
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocketUpgrade(request)
    }

    // REST API endpoints
    const method = request.method
    const pathParts = url.pathname.split('/').filter(Boolean)

    // GET /todos - List all todos
    if (method === 'GET' && pathParts[0] === 'todos' && !pathParts[1]) {
      return this.handleListTodos()
    }

    // GET /todos/:id - Get single todo
    if (method === 'GET' && pathParts[0] === 'todos' && pathParts[1]) {
      return this.handleGetTodo(pathParts[1])
    }

    // POST /todos - Create todo
    if (method === 'POST' && pathParts[0] === 'todos') {
      return this.handleCreateTodo(request)
    }

    // PUT /todos/:id - Update todo
    if (method === 'PUT' && pathParts[0] === 'todos' && pathParts[1]) {
      return this.handleUpdateTodo(pathParts[1], request)
    }

    // DELETE /todos/:id - Delete todo
    if (method === 'DELETE' && pathParts[0] === 'todos' && pathParts[1]) {
      return this.handleDeleteTodo(pathParts[1])
    }

    // DELETE /todos - Clear completed
    if (method === 'DELETE' && pathParts[0] === 'todos' && !pathParts[1]) {
      return this.handleClearCompleted()
    }

    return new Response('Not Found', { status: 404 })
  }

  // ============================================================================
  // WebSocket Handling
  // ============================================================================

  private handleWebSocketUpgrade(_request: Request): Response {
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    // Accept WebSocket with hibernation
    this.ctx.acceptWebSocket(server)
    this.connectedClients.add(server)

    // Send current todos on connect
    this.sendInitialState(server)

    return new Response(null, {
      status: 101,
      webSocket: client,
    })
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const data: WebSocketMessage = JSON.parse(message.toString())

      switch (data.type) {
        case 'create':
          await this.wsCreateTodo(ws, data.payload as Partial<Todo>)
          break
        case 'update':
          await this.wsUpdateTodo(ws, data.payload as Partial<Todo>)
          break
        case 'delete':
          await this.wsDeleteTodo(ws, (data.payload as { id: string }).id)
          break
        case 'sync':
          await this.sendInitialState(ws)
          break
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.connectedClients.delete(ws)
  }

  async webSocketError(ws: WebSocket): Promise<void> {
    this.connectedClients.delete(ws)
  }

  private async sendInitialState(ws: WebSocket): Promise<void> {
    const todos = await this.getAllTodos()
    ws.send(JSON.stringify({ type: 'sync', todos }))
  }

  private broadcast(message: object, exclude?: WebSocket): void {
    const payload = JSON.stringify(message)
    for (const client of this.ctx.getWebSockets()) {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(payload)
      }
    }
  }

  // ============================================================================
  // WebSocket Operations
  // ============================================================================

  private async wsCreateTodo(ws: WebSocket, data: Partial<Todo>): Promise<void> {
    const todo = await this.createTodo(data)
    this.broadcast({ type: 'created', todo })
  }

  private async wsUpdateTodo(ws: WebSocket, data: Partial<Todo>): Promise<void> {
    if (!data.id) return
    const todo = await this.updateTodo(data.id, data)
    if (todo) {
      this.broadcast({ type: 'updated', todo })
    }
  }

  private async wsDeleteTodo(ws: WebSocket, id: string): Promise<void> {
    const deleted = await this.deleteTodo(id)
    if (deleted) {
      this.broadcast({ type: 'deleted', id })
    }
  }

  // ============================================================================
  // Storage Operations
  // ============================================================================

  private async getAllTodos(): Promise<Todo[]> {
    const entries = await this.ctx.storage.list<Todo>({ prefix: 'todo:' })
    return Array.from(entries.values()).sort((a, b) => b.createdAt - a.createdAt)
  }

  private async getTodo(id: string): Promise<Todo | undefined> {
    return this.ctx.storage.get<Todo>(`todo:${id}`)
  }

  private async createTodo(data: Partial<Todo>): Promise<Todo> {
    const id = crypto.randomUUID()
    const now = Date.now()
    const todo: Todo = {
      id,
      title: data.title || 'Untitled',
      completed: data.completed || false,
      createdAt: now,
      updatedAt: now,
      userId: data.userId || 'anonymous',
    }
    await this.ctx.storage.put(`todo:${id}`, todo)
    return todo
  }

  private async updateTodo(id: string, updates: Partial<Todo>): Promise<Todo | null> {
    const existing = await this.getTodo(id)
    if (!existing) return null

    const updated: Todo = {
      ...existing,
      ...updates,
      id, // Cannot change id
      updatedAt: Date.now(),
    }
    await this.ctx.storage.put(`todo:${id}`, updated)
    return updated
  }

  private async deleteTodo(id: string): Promise<boolean> {
    return this.ctx.storage.delete(`todo:${id}`)
  }

  private async clearCompleted(): Promise<number> {
    const todos = await this.getAllTodos()
    const completed = todos.filter(t => t.completed)
    const keys = completed.map(t => `todo:${t.id}`)
    if (keys.length > 0) {
      await this.ctx.storage.delete(keys)
    }
    return completed.length
  }

  // ============================================================================
  // HTTP Handlers
  // ============================================================================

  private async handleListTodos(): Promise<Response> {
    const todos = await this.getAllTodos()
    return Response.json({ todos, count: todos.length })
  }

  private async handleGetTodo(id: string): Promise<Response> {
    const todo = await this.getTodo(id)
    if (!todo) {
      return Response.json({ error: 'Todo not found' }, { status: 404 })
    }
    return Response.json({ todo })
  }

  private async handleCreateTodo(request: Request): Promise<Response> {
    const data = await request.json() as Partial<Todo>
    const todo = await this.createTodo(data)
    this.broadcast({ type: 'created', todo })
    return Response.json({ todo }, { status: 201 })
  }

  private async handleUpdateTodo(id: string, request: Request): Promise<Response> {
    const data = await request.json() as Partial<Todo>
    const todo = await this.updateTodo(id, data)
    if (!todo) {
      return Response.json({ error: 'Todo not found' }, { status: 404 })
    }
    this.broadcast({ type: 'updated', todo })
    return Response.json({ todo })
  }

  private async handleDeleteTodo(id: string): Promise<Response> {
    const deleted = await this.deleteTodo(id)
    if (!deleted) {
      return Response.json({ error: 'Todo not found' }, { status: 404 })
    }
    this.broadcast({ type: 'deleted', id })
    return Response.json({ deleted: true })
  }

  private async handleClearCompleted(): Promise<Response> {
    const count = await this.clearCompleted()
    this.broadcast({ type: 'cleared', count })
    return Response.json({ cleared: count })
  }
}

// ============================================================================
// Worker Entry Point
// ============================================================================

export default {
  async fetch(request: Request, env: TodoEnv): Promise<Response> {
    const url = new URL(request.url)

    // Route to user-specific Durable Object
    // In a real app, you'd get userId from auth
    const userId = request.headers.get('X-User-Id') || 'default'
    const id = env.TODO_DO.idFromName(userId)
    const stub = env.TODO_DO.get(id)

    return stub.fetch(request)
  },
}
