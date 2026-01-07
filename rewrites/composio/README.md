# composio.do

Composio on Cloudflare - AI agent tool integration platform with managed auth.

## The Problem

AI agents need to interact with real-world tools and APIs:
- Execute actions in external services (GitHub, Slack, Salesforce...)
- Handle authentication securely (OAuth, API keys)
- Manage permissions and scopes
- Connect to various agent frameworks (LangChain, CrewAI, Autogen)

Traditional solutions require:
- Building custom integrations for each service
- Managing OAuth flows and token refresh
- Handling rate limits and retries
- Maintaining tool schemas for each framework

## The Vision

Drop-in Composio replacement running entirely on Cloudflare with MCP-native tool definitions.

```typescript
import { Composio } from '@dotdo/composio'
import { tools } from '@dotdo/composio/mcp'

const composio = new Composio({ apiKey: env.COMPOSIO_API_KEY })

// Connect a user to GitHub via OAuth
const connection = await composio.connect({
  userId: 'user-123',
  app: 'github',
  redirectUrl: 'https://myapp.com/callback'
})

// Get tools for an agent
const githubTools = await composio.getTools({
  apps: ['github'],
  actions: ['create_issue', 'create_pr', 'list_repos']
})

// Execute an action
const result = await composio.execute({
  action: 'github_create_issue',
  params: {
    repo: 'my-org/my-repo',
    title: 'Bug: Login fails on mobile',
    body: 'Steps to reproduce...'
  },
  entityId: 'user-123'
})
```

AI agents get authenticated tool access without managing credentials.

## Features

- **150+ Tool Integrations** - GitHub, Slack, Notion, Salesforce, HubSpot, and more
- **Managed OAuth/API Key Auth** - Secure credential storage with automatic refresh
- **Tool Execution Sandbox** - Isolated execution with rate limiting
- **Agent Framework Support** - LangChain, CrewAI, Autogen, LlamaIndex adapters
- **Action Triggers** - Webhooks and event subscriptions
- **MCP Native** - First-class Model Context Protocol support

## Architecture

```
                    +----------------------+
                    |    composio.do       |
                    |  (Cloudflare Worker) |
                    +----------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    |    ToolsDO       | |   ConnectionDO   | |   ExecutionDO    |
    | (tool registry)  | | (OAuth/API keys) | | (action sandbox) |
    +------------------+ +------------------+ +------------------+
              |               |               |
              +---------------+---------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    |     TriggerDO    | |    EntityDO      | |     RateDO       |
    | (webhooks/events)| | (user mappings)  | | (rate limiting)  |
    +------------------+ +------------------+ +------------------+
```

**Key insight**: Each user entity gets its own ConnectionDO for credential isolation. Tool execution happens in sandboxed ExecutionDO instances with rate limiting per entity.

## Installation

```bash
npm install @dotdo/composio
```

## Quick Start

### Initialize Client

```typescript
import { Composio } from '@dotdo/composio'

const composio = new Composio({
  apiKey: env.COMPOSIO_API_KEY
})
```

### Connect a User to an App

```typescript
// OAuth flow - get redirect URL
const { redirectUrl } = await composio.connect({
  userId: 'user-123',
  app: 'github',
  redirectUrl: 'https://myapp.com/callback'
})

// After user authorizes, exchange code
await composio.completeAuth({
  userId: 'user-123',
  app: 'github',
  code: 'oauth-code-from-callback'
})

// API key auth
await composio.connect({
  userId: 'user-123',
  app: 'openai',
  credentials: {
    apiKey: 'sk-...'
  }
})
```

### Get Tools for Agent Frameworks

```typescript
// LangChain
import { composioTools } from '@dotdo/composio/langchain'

const tools = await composioTools.getTools({
  apps: ['github', 'slack'],
  entityId: 'user-123'
})

const agent = new Agent({ tools })

// CrewAI
import { composioTools } from '@dotdo/composio/crewai'

const tools = await composioTools.getTools({
  apps: ['notion'],
  entityId: 'user-123'
})

// MCP Native
import { composioTools } from '@dotdo/composio/mcp'

const mcpServer = composioTools.createMCPServer({
  apps: ['github', 'slack', 'notion'],
  entityId: 'user-123'
})
```

### Execute Actions

```typescript
// Direct execution
const result = await composio.execute({
  action: 'github_create_issue',
  params: {
    repo: 'owner/repo',
    title: 'Issue title',
    body: 'Issue description',
    labels: ['bug']
  },
  entityId: 'user-123'
})

// Batch execution
const results = await composio.executeBatch([
  { action: 'github_create_issue', params: {...}, entityId: 'user-123' },
  { action: 'slack_send_message', params: {...}, entityId: 'user-123' }
])
```

### Triggers and Webhooks

```typescript
// Subscribe to events
await composio.triggers.subscribe({
  app: 'github',
  event: 'push',
  entityId: 'user-123',
  webhookUrl: 'https://myapp.com/webhooks/github'
})

// Handle trigger
const handler = composio.triggers.createHandler()
app.post('/webhooks/github', handler)
```

### List Available Tools

```typescript
// Get all available apps
const apps = await composio.apps.list()

// Get actions for an app
const actions = await composio.actions.list({ app: 'github' })

// Search actions
const searchActions = await composio.actions.search({
  query: 'create issue',
  apps: ['github', 'jira', 'linear']
})
```

## MCP Integration

Composio is MCP-native. Every tool is exposed as an MCP tool.

```typescript
import { Composio } from '@dotdo/composio'
import { createMCPServer } from '@dotdo/composio/mcp'

const composio = new Composio({ apiKey: env.COMPOSIO_API_KEY })

// Create MCP server with selected tools
const mcpServer = createMCPServer({
  composio,
  apps: ['github', 'slack', 'notion'],
  entityId: 'user-123'
})

// Tools are automatically exposed with proper schemas
// {
//   name: 'github_create_issue',
//   description: 'Create a new issue in a GitHub repository',
//   inputSchema: { type: 'object', properties: {...} }
// }
```

## Tool Categories

| Category | Apps | Actions |
|----------|------|---------|
| **Developer** | GitHub, GitLab, Bitbucket, Linear, Jira | Create issues, PRs, manage repos |
| **Communication** | Slack, Discord, Teams, Email | Send messages, manage channels |
| **Productivity** | Notion, Asana, Monday, Trello | Create tasks, update boards |
| **CRM** | Salesforce, HubSpot, Pipedrive | Manage contacts, deals, activities |
| **Storage** | Google Drive, Dropbox, Box | Upload, download, share files |
| **Calendar** | Google Calendar, Outlook | Create events, manage schedules |
| **AI/ML** | OpenAI, Anthropic, Cohere | Generate text, embeddings |

## Auth Methods

```typescript
// OAuth 2.0 (most apps)
await composio.connect({
  app: 'github',
  userId: 'user-123',
  redirectUrl: 'https://...'
})

// API Key
await composio.connect({
  app: 'openai',
  userId: 'user-123',
  credentials: { apiKey: 'sk-...' }
})

// Bearer Token
await composio.connect({
  app: 'linear',
  userId: 'user-123',
  credentials: { bearerToken: 'lin_...' }
})

// Basic Auth
await composio.connect({
  app: 'jira',
  userId: 'user-123',
  credentials: {
    email: 'user@company.com',
    apiToken: '...'
  }
})
```

## Rate Limiting

```typescript
// Configure per-entity rate limits
const composio = new Composio({
  apiKey: env.COMPOSIO_API_KEY,
  rateLimit: {
    maxRequests: 100,
    windowMs: 60000  // 100 requests per minute per entity
  }
})

// Per-app limits
await composio.setAppRateLimit({
  app: 'github',
  maxRequests: 50,
  windowMs: 60000
})
```

## The Rewrites Ecosystem

composio.do is part of the rewrites family - reimplementations of popular infrastructure on Cloudflare:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [inngest.do](https://inngest.do) | Inngest | Workflows/Jobs for AI |
| **composio.do** | Composio | Tool integrations for AI |
| kafka.do | Kafka | Event streaming for AI |
| nats.do | NATS | Messaging for AI |

Each rewrite follows the same pattern:
- Durable Objects for state
- SQLite for persistence
- MCP-native tool definitions
- Compatible API with the original

## Why Cloudflare?

1. **Global Edge** - Tool execution close to agents
2. **Durable Objects** - Per-entity credential isolation
3. **Workers KV** - Fast tool schema caching
4. **R2** - Large response storage
5. **Queues** - Reliable webhook delivery

## Related Domains

- **tools.do** - Generic tool registry
- **auth.do** - Authentication platform
- **agents.do** - AI agent platform
- **workflows.do** - Workflow orchestration

## License

MIT
