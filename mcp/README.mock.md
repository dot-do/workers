# Mock MCP Server - Quick Start

AI-powered mock MCP server POC using Cloudflare Workers AI.

## What is this?

A proof-of-concept MCP server that uses AI to generate realistic mock responses instead of executing real code. Perfect for testing, prototyping, and demos.

## Quick Start

```bash
# 1. Start dev server
pnpm dev:mock

# 2. Test with automated script (another terminal)
pnpm test:mock

# 3. Interactive testing with MCP Inspector (another terminal)
pnpm inspect:mock

# 4. Deploy
pnpm deploy:mock
```

## Access Methods

### 1. REST API (Simple & Browser-Friendly)

```bash
# GET - Clickable in browser!
curl 'http://localhost:8787/mock/eval?code=return%20%22Hello%22'

# POST - Complex code
curl -X POST http://localhost:8787/mock/eval \
  -H "Content-Type: application/json" \
  -d '{"code": "const repos = await api.github.searchRepositories({ query: \"mcp\" }); return repos[0];"}'
```

**HATEOAS Features:**
- Open http://localhost:8787 in browser for clickable links
- `/docs/quickstart` - Interactive step-by-step guide
- `/docs/examples` - Catalog of clickable examples
- `/docs/api` - Complete API reference

### 2. MCP JSON-RPC (Protocol Compliant)

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "eval",
      "arguments": {"code": "return \"Hello\""}
    },
    "id": 1
  }'
```

## Single Tool: eval

Execute code with access to mock APIs:
- `fetch()` - HTTP requests
- `ai.*` - AI operations
- `api.*` - External APIs (GitHub, Stripe, etc.)
- `db.*` - Database operations
- `on()` / `every()` / `send()` - Events & scheduling

## Example

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "eval",
      "arguments": {
        "code": "const repos = await api.github.searchRepositories({ query: \"mcp\" }); return repos[0];"
      }
    },
    "id": 1
  }'
```

AI generates realistic mock response:
```json
{
  "success": true,
  "result": {
    "name": "modelcontextprotocol/servers",
    "stars": 1234,
    "description": "MCP reference servers"
  },
  "logs": [
    "Searching GitHub repositories for 'mcp'",
    "Found 156 repositories",
    "Returning top result"
  ],
  "sideEffects": [
    {
      "type": "api",
      "provider": "github",
      "action": "searchRepositories",
      "results": 156
    }
  ]
}
```

## Configuration

Update `wrangler.mock.jsonc`:

```jsonc
{
  "vars": {
    "AI_GATEWAY_URL": "https://gateway.ai.cloudflare.com/v1/YOUR_ACCOUNT_ID/YOUR_GATEWAY_ID/workers-ai"
  }
}
```

## How It Works

1. **MCP Client** sends code to eval tool
2. **Mock Server** forwards to Cloudflare Workers AI (gpt-oss-120b)
3. **AI Model** generates realistic mock response with logs and side effects
4. **AI Gateway** provides observability
5. **Response** returned as if code actually executed

## Full Documentation

See [MOCK_POC.md](./MOCK_POC.md) for:
- Complete API reference
- TypeScript types
- Multiple examples
- Production considerations
- Testing guide

## Testing

### REST API Tests (New!)
```bash
# Test REST endpoints with HATEOAS
pnpm test:rest

# Or open in browser for clickable links
open http://localhost:8787
```

### MCP Protocol Tests
```bash
pnpm test:mock
```

### Interactive Testing with MCP Inspector
```bash
# Terminal 1: Start server
pnpm dev:mock

# Terminal 2: Launch inspector
pnpm inspect:mock

# Open http://localhost:6274 in browser
```

See [TESTING.mock.md](./TESTING.mock.md) and [REST_API.md](./REST_API.md) for complete guides.

## Files

**Implementation:**
- `src/mock-server.ts` - Mock MCP server with REST API + HATEOAS
- `wrangler.mock.jsonc` - Configuration for mock server

**Documentation:**
- `MOCK_POC.md` - Complete MCP protocol documentation
- `REST_API.md` - REST API guide with HATEOAS examples
- `TESTING.mock.md` - Complete testing guide
- `QUICKSTART.md` - Visual quick start guide

**Testing:**
- `test-mock.sh` - MCP protocol tests
- `test-rest.sh` - REST API tests
- `inspect-mock.mjs` - MCP Inspector launcher
- `examples/mock-client.ts` - Example TypeScript client

## Why?

- **Testing**: Test MCP clients without real backends
- **Prototyping**: Rapid development without infrastructure
- **Demos**: Showcase capabilities without complexity
- **Development**: Simulate production APIs safely
