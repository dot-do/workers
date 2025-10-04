# Agent Worker - AI Code Generation Microservice

AI-powered code generation agent using Durable Objects for stateful, long-running operations.

## Features

- **Durable Objects**: Stateful code generation sessions
- **WebSocket Updates**: Real-time progress streaming
- **Phase-wise Generation**: Blueprint-based incremental code generation
- **Auto-Review**: Automated code validation and error correction
- **RPC Interface**: Service-to-service communication
- **REST API**: HTTP endpoints for external access

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Agent Service (RPC)                      │
│              - createAgent()                                 │
│              - getStatus()                                   │
│              - generateCode()                                │
│              - sendMessage()                                 │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            CodeGeneratorAgent (Durable Object)               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  State Management                                       │ │
│  │  - Blueprint & Phases                                   │ │
│  │  - Generated Files                                      │ │
│  │  - Review Cycles                                        │ │
│  └────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  WebSocket Connections                                  │ │
│  │  - Real-time updates                                    │ │
│  │  - Progress streaming                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Type check
pnpm typecheck

# Run tests
pnpm test

# Deploy to Cloudflare
pnpm deploy
```

## API Endpoints

### Create Agent

```bash
POST /agents
{
  "query": "Create a blog application with user authentication",
  "language": "typescript",
  "frameworks": ["next.js", "tailwind"],
  "template": "nextjs-app"
}

Response:
{
  "success": true,
  "agentId": "...",
  "sessionId": "...",
  "wsUrl": "wss://agent.do/agents/{sessionId}/ws"
}
```

### Get Status

```bash
GET /agents/{sessionId}

Response:
{
  "success": true,
  "state": {
    "sessionId": "...",
    "currentDevState": "PHASE_GENERATING",
    "mvpGenerated": false,
    "phasesCounter": 2,
    "previewURL": "https://..."
  }
}
```

### Start Generation

```bash
POST /agents/{sessionId}/generate
{
  "reviewCycles": 3,
  "autoFix": true
}

Response:
{
  "success": true,
  "message": "Code generation started"
}
```

### Send Message

```bash
POST /agents/{sessionId}/message
{
  "message": "Add authentication to the login page"
}

Response:
{
  "success": true,
  "response": "I'll add authentication to the login page..."
}
```

### Get Files

```bash
GET /agents/{sessionId}/files

Response:
{
  "success": true,
  "files": {
    "src/app/page.tsx": {
      "path": "src/app/page.tsx",
      "content": "...",
      "language": "typescript",
      ...
    }
  }
}
```

### WebSocket Connection

```javascript
const ws = new WebSocket('wss://agent.do/agents/{sessionId}/ws')

ws.onmessage = (event) => {
  const message = JSON.parse(event.data)

  switch (message.type) {
    case 'state_update':
      console.log('State:', message.data.currentDevState)
      break
    case 'file_generated':
      console.log('File:', message.data.path)
      break
    case 'phase_complete':
      console.log('Phase:', message.data.phase)
      break
    case 'complete':
      console.log('Generation complete!')
      break
  }
}
```

## RPC Interface

```typescript
// Service-to-service calls
const result = await env.AGENT_SERVICE.createAgent({
  query: 'Create a blog app',
  language: 'typescript',
  frameworks: ['next.js']
})

const status = await env.AGENT_SERVICE.getStatus(result.sessionId)
```

## Configuration

### Environment Variables

Required in `.dev.vars`:

```bash
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
CLOUDFLARE_ACCOUNT_ID=...
CUSTOM_DOMAIN=agent.do
```

### Bindings

- **CODE_GENERATOR**: Durable Object namespace for agents
- **DB**: Database RPC service
- **AI_SERVICE**: AI generation RPC service
- **QUEUE**: Queue service for async tasks
- **SANDBOX_BUCKET**: R2 bucket for sandbox files
- **ASSETS_BUCKET**: R2 bucket for generated assets

## Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

## Deployment

```bash
# Deploy to production
pnpm deploy

# Deploy to staging
CLOUDFLARE_ENV=staging pnpm deploy
```

## Status

- ✅ Basic structure and types
- ✅ RPC interface
- ✅ HTTP API
- ✅ WebSocket support
- ⏳ Agent implementation (TODO)
- ⏳ MCP tools (TODO)
- ⏳ Tests (TODO)

## Next Steps

1. Implement core agent logic (blueprint, phase generation, review cycles)
2. Add MCP tools for AI agent integration
3. Integrate with sandbox service for code execution
4. Add comprehensive tests
5. Deploy to production

## Related

- [workers/CLAUDE.md](../CLAUDE.md) - Workers architecture overview
- [projects/agent/CLAUDE.md](../../projects/agent/CLAUDE.md) - Original agent template
- [workers/ai/CLAUDE.md](../ai/CLAUDE.md) - AI service integration
