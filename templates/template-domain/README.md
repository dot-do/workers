# {{SERVICE_NAME}}

{{SERVICE_DESCRIPTION}}

## Features

- ✅ RPC interface for service-to-service communication
- ✅ HTTP API with Hono
- ✅ MCP server for AI tool integration
- ✅ Queue handler for async processing
- ✅ Type-safe with TypeScript
- ✅ Shared middleware (CORS, auth, rate limiting, logging)
- ✅ Zod validation schemas

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Deploy to production
pnpm deploy
```

## API Endpoints

### HTTP Routes

- `GET /health` - Health check
- `GET /items` - List items (paginated)
- `GET /items/:id` - Get item by ID
- `POST /items` - Create new item
- `PUT /items/:id` - Update item
- `DELETE /items/:id` - Delete item

### RPC Methods

Other services can call these methods via service bindings:

```typescript
const result = await env.{{SERVICE_BINDING}}.getItem('123')
const items = await env.{{SERVICE_BINDING}}.listItems({ page: 1, limit: 20 })
const item = await env.{{SERVICE_BINDING}}.createItem({ name: 'Example' })
const updated = await env.{{SERVICE_BINDING}}.updateItem('123', { name: 'Updated' })
const deleted = await env.{{SERVICE_BINDING}}.deleteItem('123')
```

### MCP Tools

Available for AI agents via MCP protocol:

- `{{NAMESPACE}}_get_item` - Get item by ID
- `{{NAMESPACE}}_list_items` - List items with pagination
- `{{NAMESPACE}}_create_item` - Create new item

### Queue Messages

Consumes and produces messages on these topics:

- `{{NAMESPACE}}.item.created` - When an item is created
- `{{NAMESPACE}}.item.updated` - When an item is updated
- `{{NAMESPACE}}.item.deleted` - When an item is deleted

## Configuration

### Environment Variables

Add these to your `.dev.vars` file:

```bash
# Optional: Add your secrets here
# ANTHROPIC_API_KEY=sk-...
```

### Bindings

Configure in `wrangler.jsonc`:

```jsonc
{
  // Service bindings (RPC)
  "services": [
    { "binding": "DB_SERVICE", "service": "db" }
  ],

  // Database
  "d1_databases": [
    { "binding": "DB", "database_name": "production", "database_id": "xxx" }
  ],

  // KV namespace
  "kv_namespaces": [
    { "binding": "KV", "id": "xxx" }
  ],

  // R2 bucket
  "r2_buckets": [
    { "binding": "BUCKET", "bucket_name": "production" }
  ],

  // Queue consumer
  "queues": {
    "consumers": [
      { "queue": "{{NAMESPACE}}-queue", "max_batch_size": 10 }
    ]
  }
}
```

## Architecture

```
{{SERVICE_NAME}}/
├── src/
│   ├── index.ts    # Main entrypoint, HTTP routes
│   ├── rpc.ts      # RPC interface
│   ├── mcp.ts      # MCP server (tools + resources)
│   └── queue.ts    # Queue message handlers
├── tests/
│   └── index.test.ts
├── package.json
├── wrangler.jsonc
├── tsconfig.json
└── README.md
```

## Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test -- --watch

# Coverage
pnpm test -- --coverage
```

## Deployment

```bash
# Deploy to production
pnpm deploy

# Deploy to staging
wrangler deploy --env staging
```

## Related Services

- [db](../db) - Database service
- [ai](../ai) - AI generation service
- [auth](../auth) - Authentication service
