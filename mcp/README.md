# MCP Server

A Cloudflare Worker that implements the Model Context Protocol (MCP) JSON-RPC 2.0 server, providing AI agents with access to platform capabilities through a universal Business-as-Code tool.

## Features

- **Universal `do` Tool**: Single MCP tool that accepts TypeScript code using the $ runtime
- **Business-as-Code Runtime**: 8 core primitives (ai, db, api, on, send, every, decide, user)
- **Code Mode Philosophy**: AI writes code instead of calling dozens of individual tools
- **Comprehensive Documentation**: HTTP endpoints and MCP resources for all primitives
- **OAuth 2.1 Authentication**: Secure token-based authentication
- **V8 Isolate Execution**: Sandboxed code execution with automatic rollback
- **Type-Safe**: Full TypeScript support with intellisense

## Architecture

### Code Mode Philosophy

> "LLMs are better at writing code to call MCP, than at calling MCP directly"
>
> — [Cloudflare Code Mode Blog Post](https://blog.cloudflare.com/code-mode/)

Instead of exposing 100+ MCP tools, we provide a **single universal `do` tool** that accepts TypeScript code. The AI writes code using the $ runtime, which executes in a secure V8 isolate.

**Benefits:**
- **Simpler for AI** - One tool instead of dozens
- **More flexible** - Can combine primitives in any way
- **Type-safe** - Full TypeScript intellisense
- **Secure** - Sandboxed with automatic rollback

### Business-as-Code Runtime ($)

The $ runtime provides 8 core primitives for building business logic:

```typescript
interface BusinessRuntime {
  ai: AIOperations        // AI generation, embeddings, classification
  db: DatabaseOperations  // CRUD, queries, bulk operations
  api: APIOperations      // HTTP client for external APIs
  on: EventOperations     // Event handlers and custom events
  send: SendOperations    // Email, SMS, push, webhooks
  every: EveryOperations  // Cron tasks, collection iteration
  decide: DecisionOperations // If/then/else, switch/case, rules
  user: UserContext       // Authentication, roles, permissions
}
```

### Usage Patterns

**Pattern 1: Evaluate Statement**
```typescript
// Execute a single expression or statement
await ai.generateText('Write a haiku about coding')
await db.users.find({ role: 'admin' })
await db.forEvery.industry.occupations.tasks.generateService()
```

**Pattern 2: Business Module**
```typescript
// Define complete business logic as a module
export default $ => {
  const { ai, api, db, decide, every, on, send, user } = $

  // Event-driven logic
  on.user.created(async (user) => {
    const welcome = await ai.generateWelcomeEmail(user)
    await send.email(user.email, 'Welcome!', welcome)
  })

  // Scheduled tasks
  every.hour.reviewKPIs()
  every.month.forEvery.user.sendMonthlyReport()

  // Decision logic
  decide.switch(user.tier, {
    free: () => db.usage.limit(user.id, { requests: 100 }),
    pro: () => db.usage.limit(user.id, { requests: 10000 }),
    enterprise: () => db.usage.unlimited(user.id)
  })
}
```

## Setup

### 1. Prerequisites

- Cloudflare account
- Wrangler CLI: `npm install -g wrangler`
- Service bindings configured for DO_SERVICE, AUTH_SERVICE, DB_SERVICE

### 2. Configure Bindings

Update `wrangler.jsonc` with your service bindings:

```jsonc
{
  "services": [
    { "binding": "DO_SERVICE", "service": "do" },
    { "binding": "AUTH_SERVICE", "service": "auth" },
    { "binding": "DB_SERVICE", "service": "db" }
  ]
}
```

### 3. Deploy

```bash
pnpm deploy
```

## API Reference

### Well-Known Endpoints (No Auth)

#### GET /.well-known/oauth-protected-resource
OAuth 2.1 discovery endpoint. MCP clients use this to discover the authorization server.

```bash
curl https://mcp.do/.well-known/oauth-protected-resource
```

Response:
```json
{
  "resource": "https://mcp.do",
  "authorization_servers": ["https://auth.do"],
  "authorization_endpoint": "https://auth.do/oauth/authorize",
  "token_endpoint": "https://auth.do/oauth/token"
}
```

### Health & Info Endpoints (No Auth)

#### GET /api/health
Service health check (provided by protocol-router).

```bash
curl https://mcp.do/api/health
```

Response:
```json
{
  "status": "ok",
  "service": "mcp-server",
  "version": "1.0.0",
  "timestamp": 1234567890
}
```

#### GET /
Server information and capabilities.

```bash
curl https://mcp.do/
```

Response:
```json
{
  "name": "mcp-server",
  "version": "1.0.0",
  "protocol": "mcp/2024-11-05",
  "description": "MCP server exposing platform capabilities as AI-accessible tools",
  "authentication": {
    "type": "oauth2.1",
    "discovery": "https://mcp.do/.well-known/oauth-protected-resource"
  },
  "capabilities": {
    "tools": { "listChanged": true },
    "resources": { "subscribe": true, "listChanged": true }
  },
  "categories": [
    "Database Tools",
    "AI Tools",
    "Auth Tools",
    "Search Tools",
    "Queue Tools",
    "Workflow Tools",
    "CLI Tools",
    "Code Execution"
  ],
  "transport": ["http", "sse", "stdio"],
  "documentation": {
    "index": "https://mcp.do/docs",
    "primitives": [
      "https://mcp.do/$.md",
      "https://mcp.do/ai.md",
      "https://mcp.do/db.md",
      "https://mcp.do/api.md",
      "https://mcp.do/on.md",
      "https://mcp.do/send.md",
      "https://mcp.do/every.md",
      "https://mcp.do/decide.md",
      "https://mcp.do/user.md"
    ]
  }
}
```

### Documentation Endpoints (No Auth)

#### GET /api/docs
Documentation index with links to all primitives.

```bash
curl https://mcp.do/api/docs
```

Returns markdown with:
- Overview of the $ runtime
- Quick start examples
- Links to all primitive documentation
- Security information
- Code Mode philosophy

#### GET /api/$.md
Complete $ runtime documentation.

```bash
curl https://mcp.do/api/$.md
```

Returns comprehensive markdown documentation for the BusinessRuntime interface with TypeScript definitions and usage examples.

#### GET /api/:primitive.md
Documentation for a specific primitive (ai, db, api, on, send, every, decide, user).

```bash
curl https://mcp.do/api/ai.md
curl https://mcp.do/api/db.md
curl https://mcp.do/api/api.md
```

Returns detailed markdown documentation with:
- TypeScript interface definitions
- JSDoc comments for all methods
- Usage examples
- Best practices

### MCP JSON-RPC Endpoint (Requires Auth)

#### POST /api/mcp
MCP protocol endpoint. All requests require OAuth 2.1 access token.

**Authentication:**
```bash
Authorization: Bearer <access_token>
```

**MCP Methods:**
- `initialize` - Initialize MCP session
- `tools/list` - List available tools
- `tools/call` - Execute a tool
- `resources/list` - List available resources
- `resources/read` - Read a resource

**Example: List Tools**
```bash
curl -X POST https://mcp.do/api/mcp \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/list"
  }'
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "do",
        "description": "Universal Business-as-Code tool - execute TypeScript with $ runtime",
        "inputSchema": {
          "type": "object",
          "properties": {
            "code": {
              "type": "string",
              "description": "TypeScript code to execute using $ runtime"
            },
            "timeout": {
              "type": "number",
              "description": "Execution timeout in milliseconds (max 30000)"
            },
            "cacheKey": {
              "type": "string",
              "description": "Optional cache key for result caching"
            }
          },
          "required": ["code"]
        }
      }
    ]
  }
}
```

**Example: Execute Code**
```bash
curl -X POST https://mcp.do/api/mcp \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "do",
      "arguments": {
        "code": "return await ai.generateText(\"Write a haiku about coding\")"
      }
    }
  }'
```

Response:
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\":true,\"result\":\"Code writes itself\\nIn midnight's gentle glow\\nBugs become features\"}"
      }
    ]
  }
}
```

**Example: List Resources**
```bash
curl -X POST https://mcp.do/api/mcp \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "resources/list"
  }'
```

Response includes 9 documentation resources:
- `doc://$` - Business-as-Code Runtime
- `doc://ai` - AI Operations
- `doc://db` - Database Operations
- `doc://api` - API Operations
- `doc://on` - Event Operations
- `doc://send` - Send Operations
- `doc://every` - Every Operations
- `doc://decide` - Decide Operations
- `doc://user` - User Context

**Example: Read Resource**
```bash
curl -X POST https://mcp.do/api/mcp \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "resources/read",
    "params": {
      "uri": "doc://ai"
    }
  }'
```

Returns complete AI operations documentation in markdown format.

## Development

### Local Development

```bash
pnpm dev
```

The worker will be available at `http://localhost:8787`

### Testing

```bash
pnpm test
```

Test files:
- `tests/code.test.ts` - Tests for the universal `do` tool
- `tests/docs.test.ts` - Tests for documentation generation
- `tests/resources.test.ts` - Tests for MCP resources
- `tests/server.test.ts` - Tests for JSON-RPC server

### Type Checking

```bash
pnpm typecheck
```

## Security

### V8 Isolate Sandboxing

All code executed via the `do` tool runs in secure V8 isolates with:
- ✅ **Automatic rollback** - Failed operations roll back automatically
- ✅ **Non-destructive mutations** - Database changes are versioned
- ✅ **Rate limiting** - Tier-based execution limits
- ✅ **Namespace isolation** - Tenant data is isolated
- ✅ **Timeout protection** - Max 30 seconds execution time

### OAuth 2.1 Authentication

The MCP endpoint requires a valid OAuth 2.1 access token. Tokens are validated via the AUTH_SERVICE binding.

**Token Requirements:**
- Bearer token in Authorization header
- Valid WorkOS or API key authentication
- Appropriate permissions for requested operations

### User Context

All code executes with user context:
```typescript
user.id          // User ID
user.email       // User email
user.name        // User name
user.roles       // User roles (e.g., ['admin'])
user.permissions // User permissions
user.hasRole(role)       // Check role
user.hasPermission(perm) // Check permission
```

## Documentation

### Available Documentation

- **HTTP Endpoints**: Public documentation endpoints (no auth required)
  - `GET /api/docs` - Documentation index
  - `GET /api/$.md` - $ runtime documentation
  - `GET /api/:primitive.md` - Primitive-specific documentation

- **MCP Resources**: Documentation via MCP protocol (auth required)
  - `doc://$` - $ runtime
  - `doc://ai` - AI operations
  - `doc://db` - Database operations
  - `doc://api` - API operations
  - `doc://on` - Event operations
  - `doc://send` - Send operations
  - `doc://every` - Every operations
  - `doc://decide` - Decide operations
  - `doc://user` - User context

### Documentation Format

All documentation includes:
- **TypeScript Interfaces** - Complete type definitions
- **JSDoc Comments** - Method descriptions and parameters
- **Usage Examples** - Both evaluation and module patterns
- **Best Practices** - Security, performance, patterns

## Examples

### Example 1: Simple AI Generation

```typescript
// MCP tool call
{
  "name": "do",
  "arguments": {
    "code": "return await ai.generateText('Write a haiku about coding')"
  }
}
```

### Example 2: Database Query

```typescript
// MCP tool call
{
  "name": "do",
  "arguments": {
    "code": "return await db.users.find({ role: 'admin', active: true }).limit(10)"
  }
}
```

### Example 3: Chained Operations

```typescript
// MCP tool call
{
  "name": "do",
  "arguments": {
    "code": `
      const users = await db.users.find({ role: 'admin' })
      const summaries = await Promise.all(
        users.map(user => ai.generateText(\`Summarize user: \${user.name}\`))
      )
      return summaries
    `
  }
}
```

### Example 4: Business Module

```typescript
// MCP tool call
{
  "name": "do",
  "arguments": {
    "code": `
      export default $ => {
        const { ai, db, on, send } = $

        on.user.created(async (user) => {
          const welcome = await ai.generateWelcomeEmail(user)
          await send.email(user.email, 'Welcome!', welcome)
        })

        return { registered: true }
      }
    `
  }
}
```

### Example 5: Custom Timeout

```typescript
// MCP tool call
{
  "name": "do",
  "arguments": {
    "code": "return await db.forEvery.user.processMonthlyReport()",
    "timeout": 30000  // 30 second timeout
  }
}
```

## Configuration

### Environment Variables

Set via `wrangler secret put`:
- None required (uses service bindings)

### Service Bindings

Required bindings in `wrangler.jsonc`:
```jsonc
{
  "services": [
    { "binding": "DO_SERVICE", "service": "do" },
    { "binding": "AUTH_SERVICE", "service": "auth" },
    { "binding": "DB_SERVICE", "service": "db" }
  ]
}
```

## References

- [Model Context Protocol](https://modelcontextprotocol.io)
- [Cloudflare Workers](https://workers.cloudflare.com)
- [Code Mode Blog Post](https://blog.cloudflare.com/code-mode/)
- [OAuth 2.1 Spec](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-v2-1-10)
- [WorkOS + Cloudflare MCP](https://workos.com/blog/workos-cloudflare-mcp-auth-for-agentic-ai)

## Status

- ✅ Universal `do` tool implemented
- ✅ Business-as-Code runtime integrated
- ✅ Documentation system complete (HTTP + MCP resources)
- ✅ OAuth 2.1 authentication configured
- ✅ V8 isolate execution enabled
- ✅ 100+ tests written (infrastructure issue prevents execution)
- ⏳ Ready for deployment

## License

MIT
