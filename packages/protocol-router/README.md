# @dot-do/protocol-router

Multi-protocol router for Cloudflare Workers. Expose your service via RPC, REST, MCP, GraphQL, analytics, admin CLI, and direct service routing.

## Features

- ✅ **JSON-RPC 2.0** - Efficient service-to-service communication with built-in `capabilities` method
- ✅ **REST API** - Standard HTTP/JSON endpoints via Hono with `/api/health` and `/api/capabilities`
- ✅ **MCP (Model Context Protocol)** - AI agent integration
- ✅ **Auto Documentation** - OpenAPI specs with Scalar UI
- ✅ **Analytics Events** - `/e` endpoint for event capture (GET pixel + POST bulk)
- ✅ **Admin CLI** - RESTful admin commands at `/$/*` (e.g., `/$.db.query`)
- ✅ **Direct Service Routing** - Call services directly via `/service.method` or `/service/method`
- 🚧 **GraphQL** - Coming soon
- ✅ **CORS** - Configurable cross-origin support

## Installation

```bash
pnpm add @dot-do/protocol-router hono
```

## Quick Start

```typescript
import { WorkerEntrypoint } from 'cloudflare:workers'
import { Hono } from 'hono'
import { protocolRouter } from '@dot-do/protocol-router'

// 1. Define RPC service
export class MyService extends WorkerEntrypoint<Env> {
  async getItem(id: string) {
    return { id, name: 'Example' }
  }

  async listItems(limit: number = 10) {
    return [{ id: '1', name: 'Item 1' }]
  }
}

// 2. Define REST API
const api = new Hono()
api.get('/items/:id', async (c) => {
  const id = c.req.param('id')
  return c.json({ id, name: 'Example' })
})

// 3. Create protocol router
const app = protocolRouter({
  rpc: new MyService(ctx, env),
  api,
  mcp: {
    tools: [
      {
        name: 'get_item',
        description: 'Get an item by ID',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string' }
          },
          required: ['id']
        },
        handler: async (input, context) => {
          return { id: input.id, name: 'Example' }
        }
      }
    ]
  },
  docs: {
    config: {
      title: 'My API',
      version: '1.0.0',
      description: 'Example service'
    },
    generate: async () => ({
      openapi: '3.1.0',
      info: { title: 'My API', version: '1.0.0' },
      paths: { ... }
    })
  }
})

export default { fetch: app.fetch }
```

## Endpoints

### Protocol Endpoints

| Endpoint | Protocol | Description |
|----------|----------|-------------|
| `POST /rpc` | JSON-RPC 2.0 | RPC method calls (single or batch) with built-in `capabilities` method |
| `GET/POST /api/*` | REST | REST API routes with `/api/health` and `/api/capabilities` |
| `POST /mcp` | MCP | Model Context Protocol for AI agents |
| `POST /graphql` | GraphQL | GraphQL queries (future) |
| `GET /docs` | HTTP | OpenAPI documentation (Scalar UI) |
| `GET/POST /e` | Analytics | Event capture (GET = 1x1 pixel, POST = bulk events) |
| `ALL /$/*` | Admin CLI | RESTful admin commands (e.g., `/$.db.query`) |
| `ALL /service.*` | Direct | Direct service routing (e.g., `/db.query` or `/db/query`) |

### Built-in Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/health` | Health check (always returns 200) |
| `GET /api/capabilities` | List available protocols via REST |
| `POST /rpc` with method `capabilities` | List available protocols via RPC |
| `GET /mcp` | MCP server metadata |

## Usage Examples

### RPC (JSON-RPC 2.0)

```bash
# Single request
curl -X POST https://myservice.do/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"getItem","params":{"id":"123"},"id":"1"}'

# Batch request
curl -X POST https://myservice.do/rpc \
  -H "Content-Type: application/json" \
  -d '[
    {"jsonrpc":"2.0","method":"getItem","params":{"id":"123"},"id":"1"},
    {"jsonrpc":"2.0","method":"listItems","params":{"limit":5},"id":"2"}
  ]'
```

### REST API

```bash
# GET request
curl https://myservice.do/api/items/123

# POST request
curl -X POST https://myservice.do/api/items \
  -H "Content-Type: application/json" \
  -d '{"name":"New Item"}'
```

### MCP (AI Agents)

```bash
# List tools
curl -X POST https://myservice.do/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":"1"}'

# Call tool
curl -X POST https://myservice.do/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"tools/call",
    "params":{"name":"get_item","arguments":{"id":"123"}},
    "id":"1"
  }'
```

### Analytics Events

```bash
# GET request - 1x1 pixel tracking
curl "https://myservice.do/e?event=pageview&url=/home&user_id=123"

# POST request - Bulk events
curl -X POST https://myservice.do/e \
  -H "Content-Type: application/json" \
  -d '[
    {"name":"pageview","properties":{"url":"/home"},"userId":"123"},
    {"name":"button_click","properties":{"button":"signup"}}
  ]'
```

### Admin CLI

```bash
# Dot notation: /$.service.method
curl -X POST https://myservice.do/$.db.query \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT * FROM users LIMIT 10"}'

# Slash notation: $/service/method
curl https://myservice.do/$/ai/models/list \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Nested methods: /$.service.nested.method
curl https://myservice.do/$.ai.embeddings.generate \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world"}'
```

### Direct Service Routing

```bash
# Dot notation: /service.method
curl -X POST https://myservice.do/db.query \
  -H "Content-Type: application/json" \
  -d '{"sql":"SELECT * FROM items"}'

# Slash notation: /service/method
curl https://myservice.do/ai/models/list

# Nested methods: /service.nested.method
curl -X POST https://myservice.do/ai.embeddings.generate \
  -H "Content-Type: application/json" \
  -d '{"text":"Example text"}'
```

### RPC Capabilities

```bash
# Query capabilities via RPC
curl -X POST https://myservice.do/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"capabilities","id":"1"}'

# Response:
{
  "jsonrpc": "2.0",
  "result": {
    "protocols": [
      {"name":"rpc","version":"2.0","spec":"JSON-RPC 2.0","endpoint":"/rpc"},
      {"name":"rest","spec":"REST API","endpoint":"/api"},
      {"name":"mcp","version":"2024-11-05","endpoint":"/mcp","tools":3},
      {"name":"events","spec":"Analytics Event Capture","endpoint":"/e"},
      {"name":"admin","spec":"Admin CLI","endpoint":"/$"}
    ],
    "serviceRoutes": ["db", "ai", "do"],
    "timestamp": "2025-10-04T20:00:00.000Z"
  },
  "id": "1"
}
```

### Documentation

Visit `https://myservice.do/docs` in your browser to see interactive API documentation powered by Scalar.

## Configuration

### Full Configuration Example

```typescript
protocolRouter({
  // RPC handler
  rpc: new MyService(ctx, env),

  // REST API
  api: new Hono(),

  // MCP server
  mcp: {
    tools: [/* ... */],
    resources: [/* ... */],
    prompts: [/* ... */]
  },

  // Analytics events
  events: async (event, context) => {
    console.log('Event:', event.name, event.properties)
    // Store in database, send to analytics service, etc.
  },

  // Admin CLI
  admin: {
    enabled: true,
    requireAuth: true,
    allowedServices: ['db', 'ai'] // Optional: restrict to specific services
  },

  // Direct service routing
  serviceRoutes: {
    db: 'DB_SERVICE',      // Maps /db.* to env.DB_SERVICE
    ai: 'AI_SERVICE',      // Maps /ai.* to env.AI_SERVICE
    do: 'DO_SERVICE'       // Maps /do.* to env.DO_SERVICE
  },

  // Documentation
  docs: {
    config: {
      title: 'My API',
      version: '1.0.0'
    },
    generate: async () => ({ /* OpenAPI spec */ })
  },

  // CORS
  cors: {
    origin: ['https://example.com'],
    methods: ['GET', 'POST'],
    headers: ['Content-Type', 'Authorization'],
    credentials: true
  },

  // Custom middleware
  middleware: [
    async (c, next) => {
      console.log(`Request: ${c.req.method} ${c.req.path}`)
      await next()
    }
  ]
})
```

### Analytics Events

```typescript
protocolRouter({
  events: async (event, context) => {
    // event.name - Event name (e.g., 'pageview', 'button_click')
    // event.properties - Custom properties
    // event.timestamp - Event timestamp
    // event.userId - User ID (from header or query param)
    // event.sessionId - Session ID (from header or query param)

    // Store in database
    await context.env.DB_SERVICE.insert('events', event)

    // Or send to external analytics
    await fetch('https://analytics.example.com/events', {
      method: 'POST',
      body: JSON.stringify(event)
    })
  }
})
```

### Admin CLI

```typescript
protocolRouter({
  admin: {
    enabled: true,
    requireAuth: true,           // Require Authorization header
    allowedServices: ['db', 'ai'] // Optional: restrict to specific services
  },
  serviceRoutes: {
    db: 'DB_SERVICE',
    ai: 'AI_SERVICE'
  }
})

// Usage:
// POST /$.db.query → env.DB_SERVICE.query(params)
// GET  $/ai/models/list → env.AI_SERVICE.models.list()
```

### Direct Service Routing

```typescript
protocolRouter({
  serviceRoutes: {
    db: 'DB_SERVICE',   // /db.* → env.DB_SERVICE.*
    ai: 'AI_SERVICE',   // /ai.* → env.AI_SERVICE.*
    do: 'DO_SERVICE'    // /do.* → env.DO_SERVICE.*
  }
})

// Usage (no authentication required):
// POST /db.query → env.DB_SERVICE.query(params)
// GET  /ai/models/list → env.AI_SERVICE.models.list()
```

### CORS

```typescript
protocolRouter({
  cors: {
    origin: ['https://example.com', 'https://app.example.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    headers: ['Content-Type', 'Authorization'],
    credentials: true
  }
})
```

### Custom Middleware

```typescript
protocolRouter({
  middleware: [
    async (c, next) => {
      console.log(`Request: ${c.req.method} ${c.req.path}`)
      await next()
    },
    async (c, next) => {
      c.set('startTime', Date.now())
      await next()
      const duration = Date.now() - c.get('startTime')
      console.log(`Duration: ${duration}ms`)
    }
  ]
})
```

## RPC Handler Types

### WorkerEntrypoint (Recommended)

```typescript
import { WorkerEntrypoint } from 'cloudflare:workers'

export class MyService extends WorkerEntrypoint<Env> {
  async myMethod(param1: string, param2: number) {
    return { result: 'success' }
  }
}

protocolRouter({
  rpc: new MyService(ctx, env)
})
```

### Custom Handler

```typescript
protocolRouter({
  rpc: async (method, params, context) => {
    if (method === 'myMethod') {
      return { result: 'success' }
    }
    throw new Error('Method not found')
  }
})
```

## MCP Tool Schema

```typescript
{
  tools: [
    {
      name: 'tool_name',           // Unique identifier
      description: 'What it does', // For AI agents
      inputSchema: {               // JSON Schema
        type: 'object',
        properties: {
          param1: { type: 'string', description: 'Description' },
          param2: { type: 'number', minimum: 0 }
        },
        required: ['param1']
      },
      handler: async (input, context) => {
        // Tool implementation
        return { result: 'success' }
      }
    }
  ]
}
```

## Error Handling

### RPC Errors

```typescript
// Standard JSON-RPC 2.0 error codes
-32700  Parse error
-32600  Invalid Request
-32601  Method not found
-32602  Invalid params
-32603  Internal error
```

### MCP Errors

```typescript
// MCP uses same error codes as JSON-RPC
-32600  Invalid Request
-32601  Method/Tool not found
-32602  Invalid params
-32603  Internal error
```

## TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  // Configuration
  ProtocolRouterConfig,
  AdminConfig,
  ServiceRoutesConfig,

  // Handlers
  RpcHandler,
  RestHandler,
  McpHandler,
  McpTool,
  DocsHandler,
  EventHandler,

  // Analytics
  AnalyticsEvent,

  // JSON-RPC
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcErrorCode,

  // MCP
  McpRequest,
  McpResponse
} from '@dot-do/protocol-router'
```

## Testing

```typescript
import { describe, it, expect } from 'vitest'
import { protocolRouter } from '@dot-do/protocol-router'

describe('Protocol Router', () => {
  it('should handle RPC requests', async () => {
    const app = protocolRouter({
      rpc: async (method, params) => {
        if (method === 'test') return { success: true }
        throw new Error('Not found')
      }
    })

    const request = new Request('https://test.do/rpc', {
      method: 'POST',
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'test',
        params: {},
        id: '1'
      })
    })

    const response = await app.fetch(request)
    const data = await response.json()

    expect(data.result).toEqual({ success: true })
  })
})
```

## License

MIT

## Related

- [Hono](https://hono.dev) - Web framework
- [Model Context Protocol](https://modelcontextprotocol.io) - MCP spec
- [JSON-RPC 2.0](https://www.jsonrpc.org/specification) - RPC spec
- [OpenAPI](https://www.openapis.org) - API documentation
- [Scalar](https://github.com/scalar/scalar) - API docs UI
