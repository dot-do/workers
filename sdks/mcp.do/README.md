# mcp.do

**Turn any SDK into AI tools. Instantly.**

```bash
npm install mcp.do
```

---

## Your SDK Doesn't Speak AI

You built a great SDK. But AI assistants can't use it:

- Claude, GPT, and other AIs need MCP (Model Context Protocol)
- Implementing MCP servers is tedious boilerplate
- Every method needs tool definitions and schemas
- Stdio transport handling is error-prone
- No way to discover what tools are available

**Your SDK should just work with AI.**

## What If Every SDK Was AI-Ready?

```typescript
import { mcp } from 'mcp.do'
import { workflows } from 'workflows.do'

// One line to expose any SDK as MCP tools
mcp.stdio(workflows, 'workflows')

// That's it. Now Claude can use your SDK.
```

```bash
# In your claude_desktop_config.json
{
  "mcpServers": {
    "workflows": {
      "command": "npx",
      "args": ["workflows.do", "--mcp"]
    }
  }
}
```

**mcp.do** gives you:
- Auto-generate MCP tools from any object
- Stdio transport for local AI assistants
- Type-safe tool definitions
- Works with every .do SDK out of the box

## Expose Tools in 3 Steps

### 1. Import Your SDK

```typescript
import { mcp } from 'mcp.do'
import { tasks } from 'tasks.do'
import { workflows } from 'workflows.do'
import { searches } from 'searches.do'
```

### 2. Serve as MCP

```typescript
// Simple - expose everything
mcp.stdio(tasks, 'tasks')

// Or with configuration
const server = mcp.serve(tasks, {
  name: 'tasks',
  description: 'Task management tools',
  transport: 'stdio'
})

await server.start()
```

### 3. Use in AI Assistants

Claude can now call your tools:

```
User: Create a task to review the PR

Claude: I'll create that task for you.
[Calling tasks.create with {"title": "Review PR", "priority": "high"}]

Done! Created task "Review PR" with high priority.
```

## The Difference

| Without mcp.do | With mcp.do |
|---------------|-------------|
| Manual MCP implementation | One-line setup |
| Write tool schemas by hand | Auto-generated from types |
| Handle stdio yourself | Built-in transport |
| No type safety | Full TypeScript support |
| Each SDK separate | Unified MCP layer |

## Everything You Need

```typescript
import { mcp } from 'mcp.do'

// Serve any object as MCP tools
mcp.stdio(mySDK, 'my-tools')

// Get tools from an SDK
const tools = mcp.tools(mySDK)

// Create custom server
const server = mcp.server({
  name: 'custom',
  description: 'Custom MCP server',
  transport: 'stdio'
})

server.addTool({
  name: 'myTool',
  description: 'Does something',
  inputSchema: {
    type: 'object',
    properties: {
      input: { type: 'string' }
    }
  }
}, async (args) => {
  return { result: 'done' }
})

await server.start()
```

## Works With All .do SDKs

Every .do SDK automatically includes MCP support:

```typescript
// All of these work as MCP servers
import { tasks } from 'tasks.do'
import { workflows } from 'workflows.do'
import { searches } from 'searches.do'
import { analytics } from 'analytics.do'

// Expose them all
mcp.stdio(tasks, 'tasks')
mcp.stdio(workflows, 'workflows')
mcp.stdio(searches, 'searches')
mcp.stdio(analytics, 'analytics')
```

## Claude Desktop Integration

```json
{
  "mcpServers": {
    "workflows": {
      "command": "npx",
      "args": ["workflows.do", "--mcp"]
    },
    "tasks": {
      "command": "npx",
      "args": ["tasks.do", "--mcp"]
    },
    "searches": {
      "command": "npx",
      "args": ["searches.do", "--mcp"]
    }
  }
}
```

## MCP Tool Types

```typescript
interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

interface MCPPrompt {
  name: string
  description?: string
  arguments?: Array<{
    name: string
    description?: string
    required?: boolean
  }>
}
```

## Make AI Work With Your Code

Every SDK should be AI-accessible. Now it can be.

```bash
npm install mcp.do
```

[Start integrating at mcp.do](https://mcp.do)

---

MIT License
