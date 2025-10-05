# @dot-do/protocol-router

Multi-protocol router for Cloudflare Workers. Expose your service via RPC, REST, MCP, GraphQL, and auto-generated documentation.

## Features

- ✅ **JSON-RPC 2.0** - Efficient service-to-service communication
- ✅ **REST API** - Standard HTTP/JSON endpoints via Hono
- ✅ **MCP (Model Context Protocol)** - AI agent integration
- ✅ **Auto Documentation** - OpenAPI specs with Scalar UI
- 🚧 **GraphQL** - Coming soon
- ✅ **CORS** - Configurable cross-origin support
- ✅ **Health Checks** - `/health` and `/capabilities` endpoints

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
| `POST /rpc` | JSON-RPC 2.0 | RPC method calls (single or batch) |
| `GET /api/*` | REST | REST API routes |
| `POST /api/*` | REST | REST API routes |
| `POST /mcp` | MCP | Model Context Protocol for AI agents |
| `POST /graphql` | GraphQL | GraphQL queries (future) |
| `GET /docs` | HTTP | OpenAPI documentation (Scalar UI) |

### Meta Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check (always returns 200) |
| `GET /capabilities` | List available protocols and versions |

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

### Documentation

Visit `https://myservice.do/docs` in your browser to see interactive API documentation powered by Scalar.

## Configuration

### CORS

```typescript
protocolRouter({
  // ... handlers
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
  // ... handlers
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
  ProtocolRouterConfig,
  RpcHandler,
  RestHandler,
  McpHandler,
  McpTool,
  DocsHandler,
  JsonRpcRequest,
  JsonRpcResponse,
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
