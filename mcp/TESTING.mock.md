# Testing the Mock MCP Server

Complete guide to testing the AI-powered Mock MCP Server using various tools.

## Quick Test

### 1. Start the Mock Server

```bash
# Terminal 1
pnpm dev:mock
```

Wait for server to start at `http://localhost:8787`

### 2. Run Basic Tests

```bash
# Terminal 2
pnpm test:mock
```

This runs automated tests with curl and shows mock AI responses.

## Interactive Testing with MCP Inspector

The MCP Inspector provides a web UI to interactively test your MCP server.

### Setup

**Step 1: Start Mock Server**
```bash
# Terminal 1
pnpm dev:mock
```

**Step 2: Launch Inspector**
```bash
# Terminal 2
pnpm inspect:mock
```

The inspector will:
1. Check if the server is running
2. Test MCP connection
3. Open the inspector UI at http://localhost:6274
4. Show usage instructions

**Step 3: Open Browser**

Navigate to http://localhost:6274

### Using the Inspector

#### Connection

The inspector should auto-connect to your mock server. If not:
1. Click "Configure" or "Settings"
2. Set transport type to "SSE" or "HTTP"
3. Set URL to `http://localhost:8787`
4. Click "Connect"

#### Test Tools

1. **List Tools**: Click "Tools" tab to see available tools
   - You should see the "eval" tool

2. **View Tool Details**: Click on "eval" tool
   - See the complete TypeScript API documentation
   - View input schema

3. **Call the Tool**: Click "Try it" or "Execute"

#### Example 1: Database Search + AI

```javascript
const docs = await db.documents.search('machine learning papers', {
  limit: 5,
  vector: true
})

const summary = await ai.textGeneration({
  prompt: `Summarize these documents: ${docs.map(d => d.title).join(', ')}`,
  max_tokens: 200
})

return {
  found: docs.length,
  titles: docs.map(d => d.title),
  summary: summary.response
}
```

**Expected Response**: AI-generated mock showing:
- Document search results
- AI-generated summary
- Logs of operations
- Side effects (database queries, AI calls)

#### Example 2: GitHub API Integration

```javascript
const repos = await api.github.searchRepositories({
  query: 'cloudflare workers mcp',
  sort: 'stars',
  limit: 3
})

const topRepo = repos[0]
const issues = await api.github.listIssues({
  owner: topRepo.owner,
  repo: topRepo.name,
  state: 'open'
})

return {
  repository: topRepo.name,
  stars: topRepo.stars,
  openIssues: issues.length,
  url: topRepo.url
}
```

**Expected Response**: Mock data for:
- GitHub repo search results
- Issue counts
- Realistic repository data

#### Example 3: Multi-Step AI Pipeline

```javascript
// Fetch external data
const response = await fetch('https://example.com/article.html')
const html = await response.text()

// Extract text
const text = html.replace(/<[^>]*>/g, '').slice(0, 5000)

// Generate embedding
const embedding = await ai.embedding({ text })

// Store with metadata
await db.documents.put('article-456', {
  id: 'article-456',
  url: 'https://example.com/article.html',
  content: text,
  embedding: embedding.data[0],
  createdAt: Date.now()
})

// Schedule daily task
every('1 day', async () => {
  const unsummarized = await db.documents.find({ summarized: false })
  for (const doc of unsummarized) {
    const summary = await ai.textGeneration({
      prompt: `Summarize: ${doc.content}`
    })
    await db.documents.put(doc.id, {
      ...doc,
      summary: summary.response,
      summarized: true
    })
  }
})

return 'Article processed and daily summarization scheduled'
```

**Expected Response**: Complete pipeline mock with:
- HTTP fetch logs
- Text extraction
- Embedding generation
- Database storage
- Scheduled task registration

#### Example 4: Event-Driven Workflow

```javascript
// Register event listener
on('webhook.github.push', async (event) => {
  const { repository, commits } = event.data

  const analysis = await ai.textGeneration({
    prompt: `Analyze these commits: ${commits.map(c => c.message).join(', ')}`,
    max_tokens: 300
  })

  await db.events.put(`analysis-${event.id}`, {
    repository,
    analysis: analysis.response,
    timestamp: Date.now()
  })

  await send('analysis.complete', {
    repository,
    analysis: analysis.response
  })
})

return 'Event listener registered for GitHub push webhooks'
```

**Expected Response**: Event handler registration with side effects

### Conversation Context

The mock server maintains conversation context! Try:

**First Request:**
```javascript
const user = { name: 'Alice', role: 'engineer' }
await db.users.put('alice', user)
return 'User created'
```

**Second Request:**
```javascript
const alice = await db.users.get('alice')
return `Alice is a ${alice.role}`
```

The AI remembers the previous context and generates consistent responses.

## Manual Testing with curl

### Test 1: Initialize

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "initialize",
    "params": {},
    "id": 1
  }' | jq .
```

### Test 2: List Tools

```bash
curl -X POST http://localhost:8787 \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "params": {},
    "id": 2
  }' | jq .
```

### Test 3: Call eval Tool

```bash
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
  }' | jq .
```

## Testing with TypeScript Client

Use the example client:

```bash
# Install dependencies
pnpm install

# Run TypeScript client
npx tsx examples/mock-client.ts
```

The client demonstrates:
- Initialization
- Tool listing
- Multiple eval examples
- Different API patterns

## Programmatic Testing

Create your own test:

```typescript
import { MockMCPClient } from './examples/mock-client'

const client = new MockMCPClient('http://localhost:8787')

await client.initialize()

const result = await client.eval(`
  const repos = await api.github.searchRepositories({ query: 'workers' })
  return { count: repos.length, top: repos[0].name }
`)

console.log(result)
```

## Observability

### AI Gateway Logs

If you configured AI Gateway:

1. Go to Cloudflare Dashboard → AI → AI Gateway
2. Select your gateway
3. View request logs, tokens used, latency
4. See all AI model calls from the mock server

### Worker Logs

```bash
# In the terminal running pnpm dev:mock
# You'll see logs like:
[Mock MCP] Method: tools/call
[Mock MCP] AI generation error: ... (if any)
```

### Session State

The server maintains session state in memory. Each request ID creates a session that remembers conversation context.

## Testing Checklist

- [ ] Server starts successfully
- [ ] Health check returns OK
- [ ] Initialize returns protocol version
- [ ] Tools/list returns eval tool
- [ ] Eval tool shows TypeScript API docs
- [ ] Simple eval executes and returns mock
- [ ] Database operations are mocked
- [ ] API calls are mocked
- [ ] AI operations are mocked
- [ ] Logs show realistic operations
- [ ] Side effects are tracked
- [ ] Conversation context is maintained
- [ ] Error cases return proper errors

## Troubleshooting

### Server won't start

```bash
# Check if port 8787 is in use
lsof -i :8787

# Kill existing process
kill -9 <PID>

# Try again
pnpm dev:mock
```

### Inspector won't connect

1. Check server is running: `curl http://localhost:8787/health`
2. Check MCP endpoint: `curl -X POST http://localhost:8787 -d '{"jsonrpc":"2.0","method":"initialize","id":1}'`
3. Check inspector logs for errors

### AI responses are generic

1. Verify AI Gateway configuration in `wrangler.mock.jsonc`
2. Check AI Gateway logs in Cloudflare dashboard
3. Ensure Workers AI binding is configured
4. Check console logs for AI generation errors

### No conversation context

Session IDs are based on request IDs. Use the same ID for related requests:

```javascript
// First request with id: "session-1"
// Second request with id: "session-1" (same ID)
```

## Next Steps

After testing:

1. **Deploy to production**: `pnpm deploy:mock`
2. **Configure AI Gateway**: Update wrangler.mock.jsonc with real values
3. **Add authentication**: Implement token-based auth
4. **Enhance prompts**: Improve AI prompt for better mocks
5. **Add Durable Objects**: For persistent session state

## References

- [MCP Inspector Docs](https://modelcontextprotocol.io/docs/tools/inspector)
- [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway)
- [Workers AI Models](https://developers.cloudflare.com/workers-ai/models)
- [MCP Specification](https://spec.modelcontextprotocol.io)
