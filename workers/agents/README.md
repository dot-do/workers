# @dotdo/agents

Autonomous multi-step AI agent execution.

## Overview

This worker manages autonomous AI agents that can execute multi-step tasks using tools, maintain memory, and achieve complex goals. Unlike `workers/ai` which handles single-step generation, agents can reason, plan, and execute iteratively.

**Binding:** `env.AGENTS`

## Installation

```bash
pnpm add @dotdo/agents
```

## Usage

Access via service binding:

```typescript
// Create an agent
const agent = await env.AGENTS.create({
  task: 'Research competitor pricing strategies',
  tools: ['web-search', 'scrape', 'analyze'],
  memory: true
})

// Run the agent
const run = await env.AGENTS.run(agent.id, {
  competitor: 'Acme Corp'
})

// Check status
const status = await env.AGENTS.getRun(run.id)
```

## Binding Convention

Configure in `wrangler.json`:

```json
{
  "services": [
    {
      "binding": "AGENTS",
      "service": "worker-agents"
    }
  ]
}
```

## Available Transports

| Transport | Example |
|-----------|---------|
| Workers RPC | `await env.AGENTS.create(config)` |
| REST | `POST /api/agents` |
| CapnWeb | WebSocket RPC protocol |
| MCP | `{ jsonrpc: '2.0', method: 'create', params: [...] }` |

## Core Methods

### Agent CRUD

```typescript
// Create
const agent = await env.AGENTS.create({
  task: 'Monitor competitor updates',
  tools: ['web-search', 'alert'],
  schedule: '0 9 * * *',  // Daily at 9am
  webhook: 'https://...'
})

// Get
const agent = await env.AGENTS.get(agentId)

// List
const agents = await env.AGENTS.list({ status: 'running' })

// Update
await env.AGENTS.update(agentId, { tools: ['new-tool'] })

// Delete
await env.AGENTS.delete(agentId)
```

### Lifecycle

```typescript
// Run an agent
const run = await env.AGENTS.run(agentId, inputParams)

// Pause
await env.AGENTS.pause(agentId)

// Resume
await env.AGENTS.resume(agentId)
```

### Run Management

```typescript
// Get run details
const run = await env.AGENTS.getRun(runId)

// List runs for an agent
const runs = await env.AGENTS.runs(agentId, {
  status: 'completed',
  limit: 10
})

// Cancel a run
await env.AGENTS.cancelRun(runId)
```

### Pre-defined Types

```typescript
// List available agent types
const types = await env.AGENTS.types()
// [{ type: 'researcher', capabilities: [...] }, ...]

// Spawn a pre-configured agent
const agent = await env.AGENTS.spawn('researcher', {
  task: 'Analyze market trends'
})
```

### Orchestration

```typescript
// Orchestrate multiple agents for a complex task
const result = await env.AGENTS.orchestrate(
  'Plan and execute a product launch',
  {
    tools: ['calendar', 'email', 'slack'],
    context: { product: 'New Widget' }
  }
)
```

## Agent Types

| Type | Description | Capabilities |
|------|-------------|--------------|
| **researcher** | Gathers and analyzes information | web-search, summarization, analysis |
| **writer** | Creates content | content-creation, editing, formatting |
| **monitor** | Watches for changes/events | observation, alerting, pattern-detection |
| **assistant** | General-purpose tasks | conversation, task-completion, scheduling |
| **analyst** | Data analysis | data-analysis, visualization, insights |

## Agent Configuration

```typescript
interface AgentConfig {
  name?: string           // Display name
  task: string            // Task description
  capabilities?: string[] // Required capabilities
  tools?: string[]        // Available tools
  schedule?: string       // Cron schedule
  webhook?: string        // Completion callback
  timeout?: number        // Max execution time (ms)
  memory?: boolean        // Enable memory persistence
}
```

## Architecture

`workers/agents` is one of four function execution backends:

```
workers/functions (umbrella)
    ├── workers/eval     → Code functions
    ├── workers/ai       → Generative functions
    ├── workers/agents   → Agentic functions (this worker)
    └── workers/humans   → Human functions
```

## Dependencies

- `env.LLM` - Model access for agent reasoning
- `env.AI` - Generative primitives (summarize, extract)
- `env.HUMANS` - Escalation to humans when needed

## Testing

```bash
pnpm test
```

## License

MIT
