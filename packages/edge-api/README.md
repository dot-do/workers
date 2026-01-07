# @dotdo/edge-api

HATEOAS API framework for building explorable, self-documenting APIs on Cloudflare Workers.

Inspired by [apis.vin](https://apis.vin) - every response includes navigable links, available actions, and contextual information about the authenticated user.

## Installation

```bash
npm install @dotdo/edge-api
# or
pnpm add @dotdo/edge-api
```

## Quick Start

```typescript
import { EdgeAPI } from '@dotdo/edge-api'

export default EdgeAPI({
  users: {
    list: () => db.query('SELECT * FROM users'),
    get: (id: string) => db.query('SELECT * FROM users WHERE id = ?', [id]),
    create: (data: UserInput) => db.insert('users', data),
  },
  posts: {
    list: () => db.query('SELECT * FROM posts'),
    get: (id: string) => db.query('SELECT * FROM posts WHERE id = ?', [id]),
  },
})
```

## Response Shape

All responses follow a consistent HATEOAS structure:

```typescript
interface EdgeAPIResponse<T> {
  api: {
    name: string
    version: string
    description?: string
    url?: string
    docs?: string
  }
  links: {
    self: string
    home: string
    [key: string]: string
  }
  actions: {
    [key: string]: {
      method: 'GET' | 'POST' | 'PUT' | 'DELETE'
      href: string
      fields?: Array<{ name: string; type: string; required?: boolean }>
    }
  }
  data: T
  user: {
    authenticated: boolean
    id?: string
    email?: string
    roles?: string[]
  }
}
```

### Example Response

```json
{
  "api": {
    "name": "my-api",
    "version": "1.0.0",
    "url": "https://my-api.workers.do",
    "docs": "https://my-api.workers.do/docs"
  },
  "links": {
    "self": "/users",
    "home": "/",
    "users": "/users",
    "users.list": "/users/list",
    "users.get": "/users/:id",
    "posts": "/posts",
    "posts.list": "/posts/list"
  },
  "actions": {
    "users.create": {
      "method": "POST",
      "href": "/users",
      "fields": [
        { "name": "email", "type": "string", "required": true },
        { "name": "name", "type": "string", "required": true }
      ]
    }
  },
  "data": [
    { "id": "1", "name": "Alice", "email": "alice@example.com" }
  ],
  "user": {
    "authenticated": true,
    "id": "user_123",
    "email": "admin@example.com",
    "roles": ["admin"]
  }
}
```

## Features

### Auto-Generated Links

EdgeAPI automatically generates navigable links from your API structure:

```typescript
EdgeAPI({
  users: {
    list: () => [...],
    get: (id) => {...},
  },
  posts: {
    list: () => [...],
  },
})
```

Produces:

```json
{
  "links": {
    "self": "/",
    "home": "/",
    "users": "/users",
    "users.list": "/users/list",
    "users.get": "/users/:id",
    "posts": "/posts",
    "posts.list": "/posts/list"
  }
}
```

### Content Negotiation

Responses automatically adapt based on the `Accept` header:

| Accept Header | Response Format |
|---------------|-----------------|
| `application/json` | JSON (default) |
| `text/html` | Rendered HTML with clickable links |
| `text/plain` | Plain text representation |

```typescript
// JSON response (default)
fetch('/users', {
  headers: { 'Accept': 'application/json' }
})

// HTML response - browsable in browser
fetch('/users', {
  headers: { 'Accept': 'text/html' }
})
```

### HTTP Layer on RPC

EdgeAPI serves as the HTTP presentation layer on top of the RPC method dispatch:

```
Request -> EdgeAPI (HATEOAS shell) -> RPC (method dispatch) -> handler -> response
```

This separation allows the same methods to be accessible via:

- **REST** - `GET /users/list`, `POST /users`
- **Workers RPC** - `env.MY_API.users.list()`
- **MCP JSON-RPC** - `{ jsonrpc: '2.0', method: 'users.list' }`
- **CapnWeb** - WebSocket-based RPC

## Configuration

```typescript
import { EdgeAPI } from '@dotdo/edge-api'

export default EdgeAPI({
  // API metadata
  $config: {
    name: 'my-api',
    version: '1.0.0',
    description: 'My API description',
  },

  // Define your endpoints
  users: {
    list: () => [...],
    get: (id: string) => {...},
    create: (data: UserInput) => {...},
  },
})
```

## Integration with @dotdo/rpc

EdgeAPI works seamlessly with the RPC wrapper for multi-transport support:

```typescript
import { EdgeAPI } from '@dotdo/edge-api'
import { RPC } from '@dotdo/rpc'

const api = {
  users: {
    list: () => db.query('SELECT * FROM users'),
    get: (id: string) => db.query('SELECT * FROM users WHERE id = ?', [id]),
  },
}

// Export for HTTP with HATEOAS
export default EdgeAPI(api)

// The same API is also available via Workers RPC
export const rpc = RPC(api)
```

## Discovery Endpoint

The root endpoint (`GET /`) returns full API discovery information:

```typescript
// GET /
{
  "api": {
    "name": "my-api",
    "version": "1.0.0"
  },
  "links": { ... },
  "discover": {
    "methods": [
      { "name": "users.list", "description": "List all users" },
      { "name": "users.get", "description": "Get user by ID" },
      { "name": "posts.list", "description": "List all posts" }
    ]
  },
  "actions": { ... },
  "user": { ... }
}
```

## Best Practices

1. **Return data, not responses** - Let EdgeAPI handle serialization

```typescript
// Good
users: {
  list: () => db.query('SELECT * FROM users')
}

// Avoid
users: {
  list: (c) => c.json(db.query('SELECT * FROM users'))
}
```

2. **Use nested objects for namespacing** - Creates clean URL hierarchies

```typescript
EdgeAPI({
  users: {
    list: () => [...],
    profile: {
      get: (userId) => {...},
      update: (userId, data) => {...},
    },
  },
})
// Generates: /users, /users/list, /users/profile/:userId, etc.
```

3. **Add input validation with zod** - For type-safe endpoints

```typescript
import { z } from 'zod'

const UserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
})

EdgeAPI({
  users: {
    create: (data: unknown) => {
      const validated = UserSchema.parse(data)
      return db.insert('users', validated)
    },
  },
})
```

## Related Packages

- [`@dotdo/rpc`](../rpc) - Universal RPC wrapper for multi-transport support
- [`dotdo`](../../objects/do) - Base Durable Object class
- [`workers.do`](../../workers/workers) - Umbrella package with tree-shakable imports

## License

MIT
