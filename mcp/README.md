# MCP Proxy Worker

A Cloudflare Worker that proxies Model Context Protocol (MCP) servers and provides built-in GitHub integration and knowledge graph memory storage.

## Features

- **MCP Server Proxy**: Forward requests to external MCP servers (Context7, DeepWiki, Slack, etc.)
- **GitHub Integration**: Built-in GitHub MCP tools for repository operations
- **Knowledge Graph Memory**: Anthropic-compatible graph memory store with KV persistence
- **RPC Interface**: Service-to-service communication via Workers RPC
- **HTTP API**: REST endpoints for tool discovery and execution

## Architecture

### Supported MCP Servers

- **context7**: https://context7.liam.sh/sse
- **deepwiki**: https://mcp.deepwiki.com/sse
- **memory**: Built-in knowledge graph memory store
- **slack**: https://mcp.slack.com/sse
- **github**: Built-in GitHub API integration
- *More servers can be added to the registry*

### Built-in Servers

#### GitHub MCP Server

Provides GitHub API integration with these tools:
- `github_search_repositories` - Search GitHub repositories
- `github_get_file_contents` - Get file contents from a repository
- `github_list_issues` - List issues in a repository

**Requirements**: Set `GITHUB_TOKEN` secret via `wrangler secret put GITHUB_TOKEN`

#### Memory MCP Server

Knowledge graph memory store with Anthropic-compatible API:
- `create_entities` - Create entities in the knowledge graph
- `create_relations` - Create relations between entities
- `add_observations` - Add observations to entities
- `delete_entities` - Remove entities and their relations
- `delete_observations` - Remove specific observations
- `delete_relations` - Remove specific relations
- `read_graph` - Read the entire knowledge graph
- `search_nodes` - Search for nodes based on query

**Storage**: Persisted to Cloudflare KV

## Setup

### 1. Create KV Namespace

```bash
wrangler kv:namespace create "KV"
wrangler kv:namespace create "KV" --preview
```

Update `wrangler.jsonc` with the namespace IDs.

### 2. Set Secrets

```bash
wrangler secret put GITHUB_TOKEN
# Enter your GitHub personal access token
```

### 3. Deploy

```bash
pnpm deploy
```

## API Reference

### HTTP Endpoints

#### GET /servers
List all available MCP servers.

```bash
curl https://mcp.YOUR_WORKER.workers.dev/servers
```

Response:
```json
{
  "servers": ["context7", "deepwiki", "memory", "slack", "github", "linear", "stripe", "cloudflare"]
}
```

#### GET /{server}/tools
Get available tools for a specific server.

```bash
curl https://mcp.YOUR_WORKER.workers.dev/github/tools
```

Response:
```json
{
  "tools": [
    {
      "name": "github_search_repositories",
      "description": "Search GitHub repositories",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string", "description": "Search query" }
        },
        "required": ["query"]
      }
    }
  ]
}
```

#### POST /{server}/call
Execute a tool on a specific server.

```bash
curl -X POST https://mcp.YOUR_WORKER.workers.dev/github/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "github_search_repositories",
    "args": { "query": "cloudflare workers" }
  }'
```

Response:
```json
{
  "result": {
    "items": [...]
  }
}
```

### RPC Methods

#### getTools(server: ServerName): Promise<any>

Get tools from an MCP server.

```typescript
const tools = await env.MCP.getTools('github')
```

#### callTool(server: ServerName, toolName: string, args: any): Promise<any>

Execute a tool on an MCP server.

```typescript
const result = await env.MCP.callTool('github', 'github_search_repositories', {
  query: 'cloudflare workers'
})
```

## Usage Examples

### Memory Store: Create Entities

```bash
curl -X POST https://mcp.YOUR_WORKER.workers.dev/memory/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "create_entities",
    "args": {
      "entities": [
        {
          "name": "Alice",
          "entityType": "person",
          "observations": ["Works at Acme Corp", "Expert in TypeScript"]
        },
        {
          "name": "Acme Corp",
          "entityType": "organization",
          "observations": ["Tech company", "Based in San Francisco"]
        }
      ]
    }
  }'
```

### Memory Store: Create Relations

```bash
curl -X POST https://mcp.YOUR_WORKER.workers.dev/memory/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "create_relations",
    "args": {
      "relations": [
        {
          "from": "Alice",
          "to": "Acme Corp",
          "relationType": "works at"
        }
      ]
    }
  }'
```

### Memory Store: Search Nodes

```bash
curl -X POST https://mcp.YOUR_WORKER.workers.dev/memory/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "search_nodes",
    "args": { "query": "TypeScript" }
  }'
```

### GitHub: Search Repositories

```bash
curl -X POST https://mcp.YOUR_WORKER.workers.dev/github/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "github_search_repositories",
    "args": { "query": "model context protocol" }
  }'
```

### GitHub: Get File Contents

```bash
curl -X POST https://mcp.YOUR_WORKER.workers.dev/github/call \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "github_get_file_contents",
    "args": {
      "owner": "modelcontextprotocol",
      "repo": "servers",
      "path": "README.md"
    }
  }'
```

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

### Type Checking

```bash
pnpm typecheck
```

## Configuration

### Environment Variables

Set via `wrangler secret put`:
- `GITHUB_TOKEN` - GitHub personal access token (required for GitHub tools)

### KV Namespace

The memory store persists data to Cloudflare KV. Configure in `wrangler.jsonc`:

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "YOUR_KV_NAMESPACE_ID",
      "preview_id": "YOUR_PREVIEW_KV_NAMESPACE_ID"
    }
  ]
}
```

## Adding New MCP Servers

To add a new external MCP server:

1. Update the `servers` registry in `worker.ts`:

```typescript
const servers = {
  // ... existing servers
  yourserver: 'https://your-mcp-server.com/sse',
} as const
```

2. Deploy the worker:

```bash
pnpm deploy
```

## References

- [Model Context Protocol](https://modelcontextprotocol.io)
- [Cloudflare Workers](https://workers.cloudflare.com)
- [Anthropic Memory MCP Server](https://github.com/modelcontextprotocol/servers/tree/main/src/memory)
- [WorkOS + Cloudflare MCP](https://workos.com/blog/workos-cloudflare-mcp-auth-for-agentic-ai)
