# Mock MCP Server POC

A proof-of-concept Cloudflare Worker that implements a Model Context Protocol (MCP) server with AI-powered mock responses.

## Concept

Instead of implementing actual tool execution, this MCP server uses Cloudflare Workers AI to generate realistic mock responses. This is useful for:

- **Testing MCP clients** without implementing real backend logic
- **Rapid prototyping** of AI agent interactions
- **Development** environments that simulate production APIs
- **Demos** that showcase capabilities without infrastructure

## Features

### Single "eval" Tool

The server exposes one powerful tool: **eval**

This tool accepts arbitrary JavaScript/TypeScript code and returns AI-generated mock results as if the code actually executed with access to:

- `fetch()` - HTTP requests
- `ai.*` - AI operations (textGeneration, embedding, imageGeneration, objectGeneration, etc.)
- `api.*` - External API integrations (GitHub, Stripe, Slack, OpenAI, Anthropic, Google, etc.)
- `db.*` - Database collections (get, find, search, put, delete, list)
- `on(event, callback)` - Event listeners
- `every(interval, callback)` - Scheduled tasks
- `send(event, data)` - Event emitter
- `env` - Environment variables

### AI-Powered Mock Responses

Every request is sent to Cloudflare Workers AI (gpt-oss-120b) which:

1. Analyzes the code
2. Understands the API calls being made
3. Generates realistic mock responses
4. Includes logs, side effects, and errors
5. Maintains conversation context across requests

### Conversation Context

The server maintains session state, allowing the AI to remember previous executions and provide contextual responses.

### AI Gateway Integration

All AI requests route through Cloudflare AI Gateway for:
- Request/response observability
- Rate limiting
- Analytics
- Cost tracking
- Caching

## Architecture

```
┌─────────────┐
│ MCP Client  │
│ (Claude)    │
└──────┬──────┘
       │ JSON-RPC 2.0
       ▼
┌─────────────────┐
│  Mock MCP       │
│  Server         │
│                 │
│  • eval tool    │
│  • Session mgmt │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐      ┌──────────────┐
│  AI Gateway     │─────▶│ Workers AI   │
│  (Observability)│      │ gpt-oss-120b │
└─────────────────┘      └──────────────┘
```

## Setup

### 1. Configure AI Gateway

Create an AI Gateway in your Cloudflare dashboard:

1. Go to AI → AI Gateway
2. Create a new gateway
3. Note your account ID and gateway ID

### 2. Update Configuration

Edit `wrangler.mock.jsonc`:

```jsonc
{
  "vars": {
    "AI_GATEWAY_URL": "https://gateway.ai.cloudflare.com/v1/YOUR_ACCOUNT_ID/YOUR_GATEWAY_ID/workers-ai",
    "AI_GATEWAY_TOKEN": ""
  }
}
```

### 3. Deploy

```bash
# Development
wrangler dev --config wrangler.mock.jsonc

# Production
wrangler deploy --config wrangler.mock.jsonc
```

## Usage Examples

### Example 1: Database Operations

**Input:**
```javascript
// Search for documents
const docs = await db.documents.search('machine learning papers', {
  limit: 5,
  vector: true
})

// Get the first one
const doc = await db.documents.get(docs[0].id)

// Generate summary
const summary = await ai.textGeneration({
  prompt: \`Summarize this document: \${doc.content}\`,
  max_tokens: 200
})

// Store summary
await db.documents.put(doc.id, {
  ...doc,
  summary: summary.response
})
```

**AI-Generated Mock Response:**
```json
{
  "success": true,
  "result": {
    "id": "doc-123",
    "title": "Attention Is All You Need",
    "content": "...",
    "summary": "This paper introduces the Transformer architecture..."
  },
  "logs": [
    "Searching documents with query 'machine learning papers'",
    "Found 5 matching documents",
    "Retrieved document doc-123",
    "Generated text summary (156 tokens)",
    "Updated document doc-123 with summary"
  ],
  "sideEffects": [
    {
      "type": "database",
      "operation": "search",
      "collection": "documents",
      "results": 5
    },
    {
      "type": "database",
      "operation": "get",
      "collection": "documents",
      "id": "doc-123"
    },
    {
      "type": "ai",
      "operation": "textGeneration",
      "tokens": 156
    },
    {
      "type": "database",
      "operation": "put",
      "collection": "documents",
      "id": "doc-123"
    }
  ]
}
```

### Example 2: External API Calls

**Input:**
```javascript
// Fetch GitHub repos
const repos = await api.github.searchRepositories({
  query: 'cloudflare workers',
  sort: 'stars',
  limit: 3
})

// Get issues for top repo
const issues = await api.github.listIssues({
  owner: repos[0].owner,
  repo: repos[0].name,
  state: 'open'
})

// Send notification
await send('github.analysis.complete', {
  repo: repos[0].name,
  openIssues: issues.length
})
```

**AI-Generated Mock Response:**
```json
{
  "success": true,
  "result": {
    "repo": "cloudflare/workers-sdk",
    "openIssues": 247
  },
  "logs": [
    "Searching GitHub repositories for 'cloudflare workers'",
    "Found 3 repositories",
    "Listing issues for cloudflare/workers-sdk",
    "Found 247 open issues",
    "Sent event 'github.analysis.complete'"
  ],
  "sideEffects": [
    {
      "type": "api",
      "provider": "github",
      "action": "searchRepositories",
      "results": 3
    },
    {
      "type": "api",
      "provider": "github",
      "action": "listIssues",
      "results": 247
    },
    {
      "type": "event",
      "name": "github.analysis.complete",
      "data": {
        "repo": "cloudflare/workers-sdk",
        "openIssues": 247
      }
    }
  ]
}
```

### Example 3: AI Pipeline

**Input:**
```javascript
// Fetch article
const response = await fetch('https://example.com/article.html')
const html = await response.text()

// Extract text content (simulated)
const text = html.replace(/<[^>]*>/g, '').slice(0, 5000)

// Generate embedding
const embedding = await ai.embedding({ text })

// Store with embedding
await db.documents.put('article-456', {
  id: 'article-456',
  url: 'https://example.com/article.html',
  content: text,
  embedding: embedding.data[0]
})

// Schedule summarization
every('1 day', async () => {
  const docs = await db.documents.find({ summarized: false })
  for (const doc of docs) {
    const summary = await ai.textGeneration({
      prompt: \`Summarize: \${doc.content}\`
    })
    await db.documents.put(doc.id, { ...doc, summary: summary.response, summarized: true })
  }
})
```

**AI-Generated Mock Response:**
```json
{
  "success": true,
  "result": "article-456",
  "logs": [
    "Fetching https://example.com/article.html",
    "Extracted 4823 characters of text",
    "Generated 384-dimensional embedding",
    "Stored document article-456 with embedding",
    "Scheduled daily summarization task"
  ],
  "sideEffects": [
    {
      "type": "http",
      "url": "https://example.com/article.html",
      "method": "GET"
    },
    {
      "type": "ai",
      "operation": "embedding",
      "dimensions": 384
    },
    {
      "type": "database",
      "operation": "put",
      "collection": "documents",
      "id": "article-456"
    },
    {
      "type": "schedule",
      "interval": "1 day",
      "task": "summarization"
    }
  ]
}
```

## API Reference

### MCP Tool: eval

**Description:** Execute code with platform API access

**Input Schema:**
```typescript
{
  code: string        // JavaScript/TypeScript code to execute
  context?: object    // Optional context/variables
}
```

**Output:**
```typescript
{
  content: [
    {
      type: 'text',
      text: string    // JSON-formatted mock result
    }
  ]
}
```

**Mock Result Format:**
```typescript
{
  success: boolean
  result: any                    // Return value or result
  logs: string[]                 // Execution logs
  sideEffects: Array<{
    type: string                 // 'database' | 'api' | 'http' | 'ai' | 'event' | 'schedule'
    [key: string]: any           // Type-specific fields
  }>
  error?: string                 // Error message if failed
}
```

## TypeScript API Reference

The eval tool has access to these typed APIs:

```typescript
// Fetch API (standard Web API)
declare function fetch(url: string | URL | Request, init?: RequestInit): Promise<Response>

// AI API
interface AI {
  textGeneration(args: { prompt: string; max_tokens?: number; temperature?: number }): Promise<{ response: string }>
  embedding(args: { text: string | string[] }): Promise<{ data: number[][] }>
  imageGeneration(args: { prompt: string; num_steps?: number }): Promise<{ image: ArrayBuffer }>
  objectGeneration(args: { prompt: string; schema: object }): Promise<{ object: any }>
  speechRecognition(args: { audio: ArrayBuffer }): Promise<{ text: string }>
  translation(args: { text: string; source_lang: string; target_lang: string }): Promise<{ translated_text: string }>
}

// API Providers
interface API {
  openai: APIProvider
  anthropic: APIProvider
  google: APIProvider
  github: APIProvider
  stripe: APIProvider
  slack: APIProvider
  [provider: string]: APIProvider
}

// Database Collections
interface Collection<T = any> {
  get(id: string): Promise<T | null>
  find(query: object, options?: { limit?: number; offset?: number }): Promise<T[]>
  search(query: string, options?: { limit?: number; vector?: boolean }): Promise<T[]>
  put(id: string, data: T): Promise<void>
  delete(id: string): Promise<void>
  list(options?: { limit?: number; cursor?: string }): Promise<{ items: T[]; cursor?: string }>
}

interface Database {
  users: Collection<{ id: string; email: string; name: string }>
  documents: Collection<{ id: string; title: string; content: string; embedding?: number[] }>
  events: Collection<{ id: string; type: string; data: any; timestamp: number }>
  [collection: string]: Collection
}

// Event System
declare function on(event: string, callback: (data: any) => void | Promise<void>): void
declare function every(interval: string | number, callback: () => void | Promise<void>): void
declare function send(event: string, data?: any): Promise<void>
```

## Testing

### With curl

```bash
# Initialize
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {},
    "id": 1
  }'

# List tools
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 2
  }'

# Call eval tool
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "eval",
      "arguments": {
        "code": "const result = await api.github.searchRepositories({ query: \"mcp\" }); return result[0];"
      }
    },
    "id": 3
  }'
```

### With MCP Inspector

```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Connect to server
mcp-inspector http://localhost:8787
```

### With Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "mock-platform": {
      "url": "https://your-worker.workers.dev"
    }
  }
}
```

## Implementation Details

### Session Management

Sessions are stored in-memory (Map). For production:
- Use Durable Objects for persistent sessions
- Implement session cleanup/expiration
- Add session authentication

### AI Model

Uses Cloudflare Workers AI `gpt-oss-120b` model via:
- Vercel AI SDK `generateObject()`
- JSON mode (no schema validation)
- Conversation context (last 10 messages)

### AI Gateway

Routes all AI requests through Cloudflare AI Gateway for:
- Request/response logging
- Performance analytics
- Cost tracking
- Rate limiting
- Caching

### Error Handling

If AI generation fails, returns a simple fallback response.

## Limitations

- **In-memory sessions**: Lost on worker restart
- **No actual execution**: All responses are AI-generated mocks
- **Rate limits**: Subject to AI Gateway and Workers AI limits
- **Context window**: Limited to last 10 messages

## Production Considerations

For production use, consider:

1. **Durable Objects** for session persistence
2. **Authentication** for access control
3. **Rate limiting** per client/session
4. **Caching** for common patterns
5. **Monitoring** via AI Gateway analytics
6. **Error tracking** with Sentry/etc.
7. **Session cleanup** to prevent memory leaks
8. **Better prompting** for more accurate mocks

## References

- [Model Context Protocol](https://modelcontextprotocol.io)
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai)
- [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway)
- [Vercel AI SDK](https://sdk.vercel.ai)
