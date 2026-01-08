# Extension Patterns Guide

A comprehensive guide to extending the `@dotdo/do` Durable Object platform. This guide covers mixins, event handling, actions, storage extensions, and transport mechanisms.

## Table of Contents

1. [Creating Custom Mixins](#1-creating-custom-mixins)
2. [Custom Event Handlers](#2-custom-event-handlers)
3. [Adding New Actions](#3-adding-new-actions)
4. [Storage Extensions](#4-storage-extensions)
5. [Transport Extensions](#5-transport-extensions)

---

## 1. Creating Custom Mixins

Mixins provide a composable way to add functionality to Durable Objects. The platform uses the mixin pattern extensively for capabilities like events, actions, CRUD operations, and Things management.

### Mixin Architecture

The mixin pattern in `@dotdo/do` follows a factory function approach that returns a class extending a base class:

```typescript
// Constructor type required for TypeScript mixin compatibility
type Constructor<T = object> = new (...args: any[]) => T

// Base interface the mixin requires from the host class
interface MyMixinBase {
  readonly ctx: DOState
  readonly env: DOEnv
}

/**
 * Mixin factory function
 */
export function applyMyMixin<TBase extends Constructor<MyMixinBase>>(Base: TBase) {
  return class MyMixin extends Base {
    private _myState: Map<string, unknown> = new Map()

    // Add your methods here
    async myMethod(): Promise<void> {
      // Implementation using this.ctx or this.env
    }
  }
}
```

### Implementing Abstract Methods

When creating mixins that extend other mixins, you may need to implement or override abstract methods:

```typescript
import { DOCore, type DOState, type DOEnv } from '@dotdo/do'

export function applyLoggingMixin<TBase extends Constructor<DOCore>>(Base: TBase) {
  return class LoggingMixin extends Base {
    private _logs: string[] = []

    // Override the fetch method to add logging
    async fetch(request: Request): Promise<Response> {
      this._logs.push(`[${new Date().toISOString()}] ${request.method} ${request.url}`)
      return super.fetch(request)
    }

    getLogs(): string[] {
      return [...this._logs]
    }
  }
}
```

### Composing Multiple Mixins

Mixins can be composed by chaining them together:

```typescript
import { DOCore } from '@dotdo/do'
import { applyEventMixin } from '@dotdo/do'
import { ActionsMixin } from '@dotdo/do'
import { applyThingsMixin } from '@dotdo/do'

// Compose multiple mixins
const EventActionThingsBase = applyThingsMixin(
  ActionsMixin(
    applyEventMixin(DOCore)
  )
)

// Your DO class with all capabilities
class MyDO extends EventActionThingsBase {
  constructor(ctx: DOState, env: Env) {
    super(ctx, env)

    // Now has: appendEvent, getEvents, registerAction, executeAction,
    // createThing, getThing, etc.
  }
}
```

### Creating a Convenience Base Class

For commonly used mixin combinations, provide a pre-composed base class:

```typescript
import { DOCore, type DOState, type DOEnv } from '@dotdo/do'

// Create the mixin outside the generic class
const MyMixinBase = applyMyMixin(DOCore)

/**
 * Convenience base class with your mixin pre-applied
 */
export class MyBase<Env extends DOEnv = DOEnv> extends MyMixinBase {
  protected readonly env: Env

  constructor(ctx: DOState, env: Env) {
    super(ctx, env)
    this.env = env
  }
}
```

### Mixin Interface Pattern

Define an interface for your mixin's public API to enable type checking:

```typescript
/**
 * Interface for classes that provide caching operations
 */
export interface ICacheMixin {
  getCached<T>(key: string): Promise<T | null>
  setCached<T>(key: string, value: T, ttlMs?: number): Promise<void>
  invalidate(key: string): Promise<boolean>
}

export function applyCacheMixin<TBase extends Constructor<CacheMixinBase>>(Base: TBase) {
  return class CacheMixin extends Base implements ICacheMixin {
    // Implementation
  }
}
```

---

## 2. Custom Event Handlers

The platform provides two event systems: pub/sub for in-memory events and event sourcing for persisted events.

### Event System Overview

**Pub/Sub Events (EventsMixin):**
- In-memory event emission
- Subscribe/unsubscribe pattern
- WebSocket broadcast integration
- No persistence by default

**Event Sourcing (EventMixin, EventStore):**
- Persisted append-only log
- Stream-based with monotonic versioning
- Optimistic concurrency control
- State reconstruction from events

### Creating Event Handlers with Pub/Sub

```typescript
import { EventsMixin } from '@dotdo/do'

class MyDO extends EventsMixin {
  constructor(ctx: DOState, env: Env) {
    super(ctx, env)

    // Register event handlers in constructor
    this.on('user:created', async (data) => {
      const { userId, email } = data as { userId: string; email: string }
      console.log(`User created: ${userId} (${email})`)
      // Trigger side effects
      await this.sendWelcomeEmail(email)
    })

    // One-time handler
    this.once('system:initialized', () => {
      console.log('System initialized - this handler runs once')
    })
  }

  async createUser(email: string): Promise<string> {
    const userId = crypto.randomUUID()
    // Emit event - all handlers will be notified
    await this.emit('user:created', { userId, email })
    return userId
  }
}
```

### Type-Safe Event Definitions

Define your event types for compile-time safety:

```typescript
interface MyEvents {
  'user:created': { userId: string; email: string }
  'user:deleted': { userId: string }
  'order:placed': { orderId: string; amount: number }
}

class MyDO extends EventsMixin {
  async createUser(email: string): Promise<void> {
    // Type-safe event emission
    await this.emit<MyEvents['user:created']>('user:created', {
      userId: crypto.randomUUID(),
      email,
    })
  }
}
```

### Event Sourcing Patterns

For durability and state reconstruction, use the event sourcing approach:

```typescript
import { applyEventMixin, DOCore } from '@dotdo/do'

class OrderDO extends applyEventMixin(DOCore) {
  private total = 0
  private items: Item[] = []

  // Append events instead of direct state mutation
  async addItem(item: Item): Promise<void> {
    await this.appendEvent({
      streamId: this.ctx.id.toString(),
      type: 'item:added',
      data: item,
    })
    // Apply event to local state
    this.applyItemAdded(item)
  }

  private applyItemAdded(item: Item): void {
    this.items.push(item)
    this.total += item.price
  }

  // Rebuild state from event history
  async rebuildState(): Promise<void> {
    this.total = 0
    this.items = []

    const events = await this.getEvents(this.ctx.id.toString())
    for (const event of events) {
      if (event.type === 'item:added') {
        this.applyItemAdded(event.data as Item)
      }
    }
  }
}
```

### Stream-Based Event Store

For advanced event sourcing with optimistic concurrency:

```typescript
import { EventStore, ConcurrencyError } from '@dotdo/do'

class AggregateRoot {
  private store: EventStore
  private streamId: string
  private version = 0

  constructor(sql: SqlStorage, streamId: string) {
    this.store = new EventStore(sql)
    this.streamId = streamId
  }

  async loadEvents(): Promise<void> {
    const events = await this.store.readStream(this.streamId)
    for (const event of events) {
      this.apply(event)
    }
    this.version = await this.store.getStreamVersion(this.streamId)
  }

  async save(type: string, payload: unknown): Promise<void> {
    try {
      const result = await this.store.append({
        streamId: this.streamId,
        type,
        payload,
        expectedVersion: this.version, // Optimistic locking
      })
      this.version = result.currentVersion
    } catch (error) {
      if (error instanceof ConcurrencyError) {
        // Handle concurrent modification
        await this.loadEvents() // Reload and retry
        throw new Error('Concurrent modification - please retry')
      }
      throw error
    }
  }
}
```

### WebSocket Broadcast Integration

Combine events with WebSocket broadcasting:

```typescript
class ChatRoom extends EventsMixin {
  async sendMessage(userId: string, content: string): Promise<void> {
    const message = { userId, content, timestamp: Date.now() }

    // Broadcast to all connected WebSockets
    await this.broadcast('message:sent', message)

    // Or broadcast to a specific room
    await this.broadcastToRoom('general', 'message:sent', message)
  }

  // Combined: persist event and broadcast
  async persistAndBroadcastMessage(userId: string, content: string): Promise<void> {
    const message = { userId, content }

    const { event, sockets } = await this.appendAndBroadcast({
      type: 'message:sent',
      data: message,
    })

    console.log(`Event ${event.id} sent to ${sockets} sockets`)
  }
}
```

---

## 3. Adding New Actions

Actions provide a structured way to define and execute operations with validation, middleware, and workflow support.

### Action Registration

Register actions with schemas and handlers:

```typescript
import { ActionsMixin, DOCore } from '@dotdo/do'

class MyAgent extends ActionsMixin(DOCore) {
  constructor(ctx: DOState, env: Env) {
    super(ctx, env)

    // Register a simple action
    this.registerAction('greet', {
      description: 'Greet a user by name',
      parameters: {
        name: { type: 'string', required: true, description: 'User name' },
        formal: { type: 'boolean', default: false, description: 'Use formal greeting' },
      },
      handler: async ({ name, formal }) => {
        return formal ? `Good day, ${name}.` : `Hello, ${name}!`
      },
    })

    // Register an action that requires authentication
    this.registerAction('deleteUser', {
      description: 'Delete a user account',
      requiresAuth: true,
      parameters: {
        userId: { type: 'string', required: true },
      },
      handler: async ({ userId }) => {
        await this.deleteUserById(userId)
        return { success: true, deletedId: userId }
      },
    })
  }
}
```

### Action Middleware

Add cross-cutting concerns like logging, authentication, or rate limiting:

```typescript
class MyAgent extends ActionsMixin(DOCore) {
  constructor(ctx: DOState, env: Env) {
    super(ctx, env)

    // Logging middleware
    this.useMiddleware(async (actionName, params, next) => {
      const startTime = Date.now()
      console.log(`[ACTION] Starting: ${actionName}`)

      const result = await next()

      const duration = Date.now() - startTime
      console.log(`[ACTION] Completed: ${actionName} in ${duration}ms`)

      return result
    })

    // Error handling middleware
    this.useMiddleware(async (actionName, params, next) => {
      try {
        return await next()
      } catch (error) {
        console.error(`[ACTION] Error in ${actionName}:`, error)
        // Transform error or re-throw
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: 'MIDDLEWARE_CAUGHT',
        }
      }
    })

    // Authentication middleware
    this.useMiddleware(async (actionName, params, next) => {
      const action = this.__actions.get(actionName)
      if (action?.requiresAuth) {
        const { authToken } = params as { authToken?: string }
        if (!authToken || !await this.validateToken(authToken)) {
          return {
            success: false,
            error: 'Authentication required',
            errorCode: 'AUTH_REQUIRED',
          }
        }
      }
      return next()
    })
  }
}
```

### Async Action Patterns

Handle long-running actions with progress tracking:

```typescript
class ProcessingAgent extends ActionsMixin(DOCore) {
  constructor(ctx: DOState, env: Env) {
    super(ctx, env)

    this.registerAction('processLargeFile', {
      description: 'Process a large file asynchronously',
      parameters: {
        fileUrl: { type: 'string', required: true },
        notifyUrl: { type: 'string', description: 'Webhook for completion notification' },
      },
      handler: async ({ fileUrl, notifyUrl }) => {
        // Start async processing
        const jobId = crypto.randomUUID()

        // Store job state
        await this.ctx.storage.put(`job:${jobId}`, {
          status: 'processing',
          fileUrl,
          notifyUrl,
          startedAt: Date.now(),
        })

        // Schedule alarm for processing (non-blocking)
        await this.ctx.storage.setAlarm(Date.now() + 100)

        return { jobId, status: 'processing' }
      },
    })

    this.registerAction('getJobStatus', {
      parameters: {
        jobId: { type: 'string', required: true },
      },
      handler: async ({ jobId }) => {
        const job = await this.ctx.storage.get(`job:${jobId}`)
        if (!job) {
          return { success: false, error: 'Job not found' }
        }
        return { success: true, job }
      },
    })
  }

  async alarm(): Promise<void> {
    // Process pending jobs
    const jobs = await this.ctx.storage.list<Job>({ prefix: 'job:' })
    for (const [key, job] of jobs) {
      if (job.status === 'processing') {
        await this.processJob(key, job)
      }
    }
  }
}
```

### Workflow Orchestration

Chain multiple actions into workflows:

```typescript
class OnboardingAgent extends ActionsMixin(DOCore) {
  async runOnboarding(userId: string): Promise<WorkflowResult> {
    return this.runWorkflow({
      id: `onboarding-${userId}`,
      timeout: 60000, // 1 minute max
      context: { userId },
      steps: [
        {
          id: 'create-account',
          action: 'createAccount',
          params: { userId },
        },
        {
          id: 'setup-profile',
          action: 'setupProfile',
          params: { userId },
          dependsOn: ['create-account'],
        },
        {
          id: 'send-welcome',
          action: 'sendWelcomeEmail',
          params: { userId },
          dependsOn: ['setup-profile'],
          onError: 'continue', // Don't fail workflow if email fails
        },
        {
          id: 'setup-billing',
          action: 'setupBilling',
          params: { userId },
          dependsOn: ['create-account'],
          onError: 'retry',
          maxRetries: 3,
        },
      ],
    })
  }
}
```

---

## 4. Storage Extensions

The platform provides multiple storage patterns: KV-style, SQL-based, and repository abstractions.

### Custom Repositories

Extend the base repository classes for domain-specific storage:

```typescript
import { BaseSQLRepository, type SqlStorage } from '@dotdo/do'

interface User {
  id: string
  email: string
  name: string
  createdAt: number
  updatedAt: number
}

class UserRepository extends BaseSQLRepository<User> {
  constructor(sql: SqlStorage) {
    super(sql, 'users')
    this.ensureSchema()
  }

  private ensureSchema(): void {
    this.sql.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `)
  }

  protected getId(entity: User): string {
    return entity.id
  }

  protected getSelectColumns(): string[] {
    return ['id', 'email', 'name', 'created_at', 'updated_at']
  }

  protected rowToEntity(row: Record<string, unknown>): User {
    return {
      id: row.id as string,
      email: row.email as string,
      name: row.name as string,
      createdAt: row.created_at as number,
      updatedAt: row.updated_at as number,
    }
  }

  protected entityToRow(entity: User): Record<string, unknown> {
    return {
      id: entity.id,
      email: entity.email,
      name: entity.name,
      created_at: entity.createdAt,
      updated_at: entity.updatedAt,
    }
  }

  async save(entity: User): Promise<User> {
    const row = this.entityToRow(entity)
    this.sql.exec(
      `INSERT OR REPLACE INTO users (id, email, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      row.id, row.email, row.name, row.created_at, row.updated_at
    )
    return entity
  }

  // Custom query methods
  async findByEmail(email: string): Promise<User | null> {
    const result = this.sql.exec<Record<string, unknown>>(
      `SELECT ${this.getSelectColumns().join(', ')} FROM users WHERE email = ?`,
      email
    ).one()

    return result ? this.rowToEntity(result) : null
  }
}
```

### Index Strategies

Create efficient indexes for your query patterns:

```typescript
class IndexedRepository extends BaseSQLRepository<Document> {
  private ensureIndexes(): void {
    // Single-column indexes for equality searches
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_docs_type ON documents(type)`)
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_docs_status ON documents(status)`)

    // Composite index for common query patterns
    this.sql.exec(`CREATE INDEX IF NOT EXISTS idx_docs_type_status ON documents(type, status)`)

    // Partial index for active documents only
    this.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_docs_active
      ON documents(created_at) WHERE status = 'active'
    `)

    // Covering index to avoid table lookups
    this.sql.exec(`
      CREATE INDEX IF NOT EXISTS idx_docs_list
      ON documents(type, status, created_at, id, title)
    `)
  }

  // Query using the composite index
  async findByTypeAndStatus(type: string, status: string): Promise<Document[]> {
    const result = this.sql.exec<Record<string, unknown>>(
      `SELECT * FROM documents WHERE type = ? AND status = ? ORDER BY created_at DESC`,
      type, status
    ).toArray()

    return result.map(row => this.rowToEntity(row))
  }
}
```

### Query Optimization

Use the Query builder for complex queries:

```typescript
import { Query } from '@dotdo/do'

class OptimizedRepository extends BaseKVRepository<Item> {
  async findItems(filters: ItemFilters): Promise<Item[]> {
    const query = new Query<Item>()
      .where('status', 'active')
      .whereOp('price', 'gte', filters.minPrice)
      .whereOp('price', 'lte', filters.maxPrice)
      .orderBy('createdAt', 'desc')
      .limit(filters.limit ?? 100)
      .offset(filters.offset ?? 0)

    return this.find(query.build())
  }
}
```

### Unit of Work Pattern

Use transactions for atomic operations across repositories:

```typescript
import { UnitOfWork } from '@dotdo/do'

class OrderService {
  private orderRepo: OrderRepository
  private inventoryRepo: InventoryRepository
  private storage: DOStorage

  async placeOrder(items: OrderItem[]): Promise<Order> {
    const uow = new UnitOfWork(this.storage)

    // Create order
    const order: Order = {
      id: crypto.randomUUID(),
      items,
      status: 'pending',
      createdAt: Date.now(),
    }
    uow.registerNew(this.orderRepo, order)

    // Update inventory for each item
    for (const item of items) {
      const inventory = await this.inventoryRepo.get(item.productId)
      if (!inventory || inventory.quantity < item.quantity) {
        uow.rollback()
        throw new Error(`Insufficient inventory for ${item.productId}`)
      }

      inventory.quantity -= item.quantity
      uow.registerDirty(this.inventoryRepo, inventory)
    }

    // Commit atomically
    await uow.commit()
    return order
  }
}
```

### Projection Storage (CQRS)

Store read models separately from event streams:

```typescript
import { Projection, ProjectionRegistry } from '@dotdo/do'

// Define read model
interface OrderSummary {
  totalOrders: number
  totalRevenue: number
  ordersByStatus: Map<string, number>
}

// Create projection
const orderSummaryProjection = new Projection<OrderSummary>('order-summary', {
  initialState: () => ({
    totalOrders: 0,
    totalRevenue: 0,
    ordersByStatus: new Map(),
  }),
})

// Register handlers
orderSummaryProjection
  .when<OrderCreated>('order:created', (event, state) => {
    state.totalOrders++
    state.totalRevenue += event.data.total
    const current = state.ordersByStatus.get('pending') ?? 0
    state.ordersByStatus.set('pending', current + 1)
    return state
  })
  .when<OrderShipped>('order:shipped', (event, state) => {
    const pending = state.ordersByStatus.get('pending') ?? 0
    const shipped = state.ordersByStatus.get('shipped') ?? 0
    state.ordersByStatus.set('pending', Math.max(0, pending - 1))
    state.ordersByStatus.set('shipped', shipped + 1)
    return state
  })

// Use in DO
class OrdersDO extends EventsMixin {
  private projection = orderSummaryProjection

  async getOrderStats(): Promise<OrderSummary> {
    return this.projection.getReadOnlyState()
  }

  async rebuildProjection(): Promise<void> {
    const events = await this.getEvents()
    await this.projection.rebuild(events)
  }
}
```

---

## 5. Transport Extensions

The platform supports multiple transport mechanisms: HTTP/fetch, WebSocket, JSON-RPC, and Workers RPC.

### Custom WebSocket Handlers

Implement custom WebSocket message handling with hibernation support:

```typescript
import { DOCore } from '@dotdo/do'

interface WSMessage {
  type: string
  payload: unknown
  correlationId?: string
}

class RealtimeDO extends DOCore {
  // Message handlers by type
  private wsHandlers = new Map<string, (ws: WebSocket, payload: unknown) => Promise<unknown>>()

  constructor(ctx: DOState, env: Env) {
    super(ctx, env)

    // Register message handlers
    this.registerWSHandler('subscribe', async (ws, payload) => {
      const { channel } = payload as { channel: string }
      // Use hibernation-compatible tagging
      this.ctx.acceptWebSocket(ws, [`channel:${channel}`])
      return { subscribed: channel }
    })

    this.registerWSHandler('publish', async (ws, payload) => {
      const { channel, message } = payload as { channel: string; message: unknown }
      // Broadcast to channel subscribers
      const sockets = this.ctx.getWebSockets(`channel:${channel}`)
      for (const socket of sockets) {
        if (socket !== ws && socket.readyState === 1) {
          socket.send(JSON.stringify({ type: 'message', channel, message }))
        }
      }
      return { published: true }
    })
  }

  registerWSHandler(type: string, handler: (ws: WebSocket, payload: unknown) => Promise<unknown>): void {
    this.wsHandlers.set(type, handler)
  }

  // Handle WebSocket upgrade
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)

      // Accept with hibernation support
      this.ctx.acceptWebSocket(server)

      return new Response(null, {
        status: 101,
        webSocket: client,
      })
    }

    return new Response('Expected WebSocket', { status: 400 })
  }

  // Hibernation-compatible message handler
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const msg = JSON.parse(String(message)) as WSMessage
      const handler = this.wsHandlers.get(msg.type)

      if (handler) {
        const result = await handler(ws, msg.payload)
        ws.send(JSON.stringify({
          type: `${msg.type}:response`,
          payload: result,
          correlationId: msg.correlationId,
        }))
      } else {
        ws.send(JSON.stringify({
          type: 'error',
          payload: { message: `Unknown message type: ${msg.type}` },
          correlationId: msg.correlationId,
        }))
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        payload: { message: 'Invalid message format' },
      }))
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    console.log(`WebSocket closed: ${code} ${reason}`)
  }
}
```

### JSON-RPC Extensions

Create a custom JSON-RPC handler with method registration:

```typescript
import { createJsonRpcHandler, type JsonRpcEnv } from '@dotdo/do'

// Define method handlers
const methods: Record<string, (params: unknown, env: JsonRpcEnv) => Promise<unknown>> = {
  ping: async () => 'pong',

  'users.get': async (params, env) => {
    const { userId } = params as { userId: string }
    // Access env bindings
    const user = await (env.USERS as DurableObjectNamespace).get(userId)
    return user
  },

  'orders.create': async (params, env) => {
    const { items, customerId } = params as { items: unknown[]; customerId: string }
    // Create order via another DO
    const stub = (env.ORDERS as DurableObjectNamespace).get(
      (env.ORDERS as DurableObjectNamespace).idFromName(customerId)
    )
    return stub.fetch('/create', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }).then(r => r.json())
  },
}

// Custom JSON-RPC handler class
class ExtendedJsonRpcHandler {
  private baseHandler = createJsonRpcHandler()

  async handle(request: Request, env: JsonRpcEnv): Promise<Response> {
    // Parse request
    const body = await request.json() as { method: string; params?: unknown; id?: string | number }

    // Check custom methods first
    const methodHandler = methods[body.method]
    if (methodHandler) {
      try {
        const result = await methodHandler(body.params, env)
        return Response.json({
          jsonrpc: '2.0',
          result,
          id: body.id ?? null,
        })
      } catch (error) {
        return Response.json({
          jsonrpc: '2.0',
          error: {
            code: -32603,
            message: error instanceof Error ? error.message : 'Internal error',
          },
          id: body.id ?? null,
        })
      }
    }

    // Fall back to built-in handler
    return this.baseHandler.handle(request, env)
  }
}
```

### Custom Protocol Implementation

Build a custom binary protocol for high-performance communication:

```typescript
import { DOCore } from '@dotdo/do'

// Message format: [1 byte type][4 bytes length][payload]
const MESSAGE_TYPES = {
  PING: 0x01,
  PONG: 0x02,
  DATA: 0x03,
  ERROR: 0x04,
} as const

class BinaryProtocolDO extends DOCore {
  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message === 'string') {
      // Handle text messages
      return this.handleTextMessage(ws, message)
    }

    // Binary protocol handling
    const buffer = new Uint8Array(message)
    const type = buffer[0]
    const length = new DataView(buffer.buffer).getUint32(1, false) // big-endian
    const payload = buffer.slice(5, 5 + length)

    switch (type) {
      case MESSAGE_TYPES.PING:
        ws.send(this.createMessage(MESSAGE_TYPES.PONG, new Uint8Array(0)))
        break

      case MESSAGE_TYPES.DATA:
        const result = await this.processData(payload)
        ws.send(this.createMessage(MESSAGE_TYPES.DATA, result))
        break

      default:
        ws.send(this.createMessage(MESSAGE_TYPES.ERROR,
          new TextEncoder().encode('Unknown message type')))
    }
  }

  private createMessage(type: number, payload: Uint8Array): ArrayBuffer {
    const buffer = new ArrayBuffer(5 + payload.length)
    const view = new DataView(buffer)
    const bytes = new Uint8Array(buffer)

    bytes[0] = type
    view.setUint32(1, payload.length, false) // big-endian
    bytes.set(payload, 5)

    return buffer
  }

  private async processData(payload: Uint8Array): Promise<Uint8Array> {
    // Process binary data
    return payload // Echo for demo
  }
}
```

### RPC Extension with Service Bindings

Leverage Cloudflare Workers RPC for internal communication:

```typescript
import { DOCore } from '@dotdo/do'

// Define RPC interface
interface UserServiceRPC {
  getUser(id: string): Promise<User | null>
  createUser(data: CreateUserInput): Promise<User>
  updateUser(id: string, data: UpdateUserInput): Promise<User>
}

// Create RPC-compatible DO
class UserServiceDO extends DOCore implements UserServiceRPC {
  async getUser(id: string): Promise<User | null> {
    return this.ctx.storage.get(`user:${id}`)
  }

  async createUser(data: CreateUserInput): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: Date.now(),
    }
    await this.ctx.storage.put(`user:${user.id}`, user)
    return user
  }

  async updateUser(id: string, data: UpdateUserInput): Promise<User> {
    const existing = await this.getUser(id)
    if (!existing) throw new Error('User not found')

    const updated = { ...existing, ...data, updatedAt: Date.now() }
    await this.ctx.storage.put(`user:${id}`, updated)
    return updated
  }

  // Also support HTTP for external access
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const parts = url.pathname.split('/').filter(Boolean)

    if (parts[0] === 'users') {
      if (request.method === 'GET' && parts[1]) {
        const user = await this.getUser(parts[1])
        return user ? Response.json(user) : new Response('Not found', { status: 404 })
      }
      if (request.method === 'POST') {
        const data = await request.json() as CreateUserInput
        const user = await this.createUser(data)
        return Response.json(user, { status: 201 })
      }
    }

    return new Response('Not found', { status: 404 })
  }
}

// Using the RPC service from another Worker/DO
class ConsumerDO extends DOCore {
  async consumeUserService(): Promise<void> {
    // Access via service binding (env.USER_SERVICE)
    const userService = this.env.USER_SERVICE as DurableObjectNamespace
    const stub = userService.get(userService.idFromName('singleton'))

    // RPC call (if using Workers RPC)
    // const user = await stub.getUser('123')

    // HTTP fallback
    const response = await stub.fetch('/users/123')
    const user = await response.json()
  }
}
```

---

## Summary

The `@dotdo/do` platform provides flexible extension points:

| Extension Type | Primary Pattern | Use Case |
|---------------|-----------------|----------|
| **Mixins** | Factory function returning class | Add reusable capabilities |
| **Events** | EventsMixin / EventMixin | Pub/sub and event sourcing |
| **Actions** | ActionsMixin | Structured operations with middleware |
| **Storage** | Repository pattern | Domain-specific data access |
| **Transport** | WebSocket / JSON-RPC / RPC | Custom communication protocols |

Choose the appropriate pattern based on your needs:

- Use **mixins** to compose capabilities from multiple sources
- Use **events** for decoupled communication and audit logging
- Use **actions** when you need validation, middleware, and workflows
- Use **repositories** for clean data access abstraction
- Use **transport extensions** for custom protocols or integrations

Each pattern is designed to work together. A typical DO might combine several mixins, use events for internal communication, expose actions via JSON-RPC, and persist data through custom repositories.
