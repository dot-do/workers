# Mock MCP Server - Interactive Testing Quick Start

Get the Mock MCP Server running and test it interactively in 3 steps.

## Prerequisites

- Node.js 18+
- pnpm installed
- Terminal access

## Step-by-Step Guide

### Step 1: Start the Mock Server (Terminal 1)

```bash
cd /Users/nathanclevenger/Projects/.do/workers/mcp
pnpm dev:mock
```

**Expected output:**
```
⛅️ wrangler 4.x.x
-------------------
Your worker has access to the following bindings:
- AI: (AI)
- Vars:
  - ENVIRONMENT: "development"

⎔ Starting local server...
[wrangler:inf] Ready on http://localhost:8787
```

### Step 2: Launch MCP Inspector (Terminal 2)

Open a new terminal and run:

```bash
cd /Users/nathanclevenger/Projects/.do/workers/mcp
pnpm inspect:mock
```

**Expected output:**
```
🚀 MCP Inspector Test Launcher
================================

✅ Mock MCP Server is running
   Status: ok
   Service: mock-mcp-server
   Version: 1.0.0-poc

Testing MCP connection...
✅ MCP Initialize successful
   Protocol: 2024-11-05
   Server: mock-mcp-server v1.0.0-poc

✅ Tools available:
   - eval: Execute code in a sandboxed environment with full platform API access.

🔍 Launching MCP Inspector...

Inspector Configuration:
   Server URL: http://localhost:8787
   Inspector UI: http://localhost:6274

📝 Usage Instructions:
   1. Open http://localhost:6274 in your browser
   ...
```

### Step 3: Test in Your Browser

1. **Open**: http://localhost:6274
2. **Connect**: Inspector auto-connects to your mock server
3. **Explore**: Click on "Tools" tab
4. **Try It**: Click on "eval" tool

## Your First Test

Copy this code into the MCP Inspector:

```javascript
const repos = await api.github.searchRepositories({
  query: 'cloudflare workers'
})

return {
  found: repos.length,
  topRepo: repos[0].name,
  stars: repos[0].stars
}
```

**Click "Execute"**

The AI will generate a realistic mock response like:

```json
{
  "success": true,
  "result": {
    "found": 156,
    "topRepo": "cloudflare/workers-sdk",
    "stars": 2847
  },
  "logs": [
    "Searching GitHub repositories for 'cloudflare workers'",
    "Found 156 repositories",
    "Returning top repository: cloudflare/workers-sdk"
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

## More Examples to Try

### Example 2: Database + AI

```javascript
const docs = await db.documents.search('machine learning', { limit: 5 })

const summary = await ai.textGeneration({
  prompt: 'Summarize these ML papers',
  max_tokens: 200
})

return {
  documentsFound: docs.length,
  summary: summary.response
}
```

### Example 3: Full Pipeline

```javascript
// Fetch data
const response = await fetch('https://api.example.com/data')
const data = await response.json()

// Generate embedding
const embedding = await ai.embedding({ text: JSON.stringify(data) })

// Store in database
await db.documents.put('doc-123', {
  data,
  embedding: embedding.data[0]
})

// Schedule processing
every('1 hour', async () => {
  const pending = await db.documents.find({ processed: false })
  // Process pending documents
})

return 'Pipeline configured successfully'
```

## Visual Overview

```
┌─────────────────┐
│   Terminal 1    │
│                 │
│  pnpm dev:mock  │
│                 │
│  ✅ Server      │
│  localhost:8787 │
└─────────────────┘
         │
         │ HTTP
         │
         ▼
┌─────────────────┐      ┌──────────────────┐
│   Terminal 2    │      │    Browser       │
│                 │      │                  │
│ pnpm inspect    │─────▶│  localhost:6274  │
│     :mock       │      │                  │
│                 │      │  MCP Inspector   │
│  ✅ Inspector   │      │  🔍 Test Tools   │
└─────────────────┘      └──────────────────┘
         │                        │
         │                        │ JSON-RPC
         ▼                        ▼
┌─────────────────────────────────────────┐
│         Mock MCP Server                 │
│  • Receives code via "eval" tool        │
│  • Sends to Cloudflare Workers AI       │
│  • AI generates realistic mock response │
│  • Returns with logs & side effects     │
└─────────────────────────────────────────┘
                    │
                    │ AI Gateway
                    ▼
            ┌──────────────┐
            │ Workers AI   │
            │ gpt-oss-120b │
            └──────────────┘
```

## What's Happening?

1. **You write code** in the MCP Inspector
2. **Inspector sends** JSON-RPC request to mock server
3. **Mock server** forwards to Cloudflare Workers AI
4. **AI analyzes** your code and generates realistic mock response
5. **Response includes**:
   - Return value (what your code would return)
   - Logs (what operations would be performed)
   - Side effects (database writes, API calls, events)

## Troubleshooting

### Server won't start
```bash
# Check if port is in use
lsof -i :8787

# Kill process and retry
kill -9 <PID>
pnpm dev:mock
```

### Inspector won't connect
```bash
# Test server manually
curl http://localhost:8787/health

# Should return:
# {"status":"ok","service":"mock-mcp-server","version":"1.0.0-poc"}
```

### AI responses are too generic

1. Check `wrangler.mock.jsonc` AI Gateway configuration
2. Ensure AI binding is working
3. Check terminal logs for errors

## Next Steps

- **Read full docs**: [MOCK_POC.md](./MOCK_POC.md)
- **Testing guide**: [TESTING.mock.md](./TESTING.mock.md)
- **Run automated tests**: `pnpm test:mock`
- **Try TypeScript client**: `npx tsx examples/mock-client.ts`

## Keyboard Shortcuts

In MCP Inspector:
- `Cmd/Ctrl + Enter` - Execute tool
- `Cmd/Ctrl + K` - Clear console
- `Esc` - Close modal

## Tips

1. **Use conversation context**: The AI remembers previous requests (up to 10)
2. **Be specific**: More detailed code gets better mock responses
3. **Check logs**: Terminal shows AI generation process
4. **Watch side effects**: See what APIs/database operations were "called"

## Clean Up

When done testing:

1. **Terminal 2**: Press `Ctrl+C` to stop inspector
2. **Terminal 1**: Press `Ctrl+C` to stop server

---

**Happy Testing! 🚀**
