# make.do

Make.com (Integromat) on Cloudflare - Visual scenario builder with advanced data routing.

## The Problem

Modern automation needs visual workflow design:
- Connect apps without code
- Transform and route data between services
- Handle complex branching and error flows
- Schedule and trigger on webhooks

Traditional solutions require:
- Proprietary cloud platforms
- Per-operation pricing at scale
- Limited customization options
- No self-hosting capability

## The Vision

Drop-in Make.com alternative running entirely on Cloudflare.

```typescript
import { Make } from '@dotdo/make'

const make = new Make({ id: 'my-automation' })

// Define a scenario with modules
export const leadCapture = make.createScenario({
  id: 'lead-capture',
  trigger: { type: 'webhook', path: '/leads' },
  modules: [
    {
      id: 'validate',
      type: 'filter',
      condition: '{{data.email}} contains "@"'
    },
    {
      id: 'enrich',
      type: 'http',
      action: 'GET',
      url: 'https://api.clearbit.com/v2/people/email/{{data.email}}'
    },
    {
      id: 'route',
      type: 'router',
      routes: [
        { condition: '{{enrich.company.employees}} > 100', target: 'enterprise' },
        { condition: 'true', target: 'smb' }
      ]
    },
    {
      id: 'enterprise',
      type: 'salesforce',
      action: 'create',
      object: 'Lead',
      mapping: { Email: '{{data.email}}', Company: '{{enrich.company.name}}' }
    },
    {
      id: 'smb',
      type: 'hubspot',
      action: 'create',
      object: 'contact',
      mapping: { email: '{{data.email}}' }
    }
  ]
})

// Execute a scenario
await make.run('lead-capture', { email: 'ceo@bigcorp.com' })
```

No vendor lock-in. No per-operation costs. Just scenarios that work.

## Features

- **Visual Canvas** - Drag-and-drop scenario builder (coming soon)
- **Module Types** - Triggers, actions, aggregators, iterators, routers, filters
- **Data Mapping** - JSONPath and Mustache-style variable interpolation
- **Error Handling** - Error routes, retries, break/continue error handlers
- **Scheduling** - Cron schedules, interval triggers, webhooks
- **TypeScript First** - Full type safety for scenario definitions
- **Edge Native** - Runs on Cloudflare's global network
- **AI Native** - MCP tools via fsx.do and gitx.do for AI orchestration

## Architecture

```
                    +----------------------+
                    |      make.do         |
                    |  (Cloudflare Worker) |
                    +----------------------+
                              |
              +---------------+---------------+---------------+
              |               |               |               |
    +------------------+ +------------------+ +------------------+ +------------------+
    |    ScenarioDO    | |    ModuleDO      | |    RouterDO      | |   SchedulerDO    |
    |  (orchestration) | | (step execution) | | (data routing)   | |  (cron/webhooks) |
    +------------------+ +------------------+ +------------------+ +------------------+
              |               |               |               |
              +---------------+---------------+---------------+
                              |
                    +-------------------+
                    |  Cloudflare Queues |
                    | (module execution) |
                    +-------------------+
                              |
              +---------------+---------------+
              |               |               |
        +----------+   +----------+    +----------+
        |  fsx.do  |   | gitx.do  |    |  llm.do  |
        |   (MCP)  |   |   (MCP)  |    |   (MCP)  |
        +----------+   +----------+    +----------+
```

**Key insight**: Durable Objects provide single-threaded, strongly consistent state. Each scenario execution gets its own ScenarioDO for orchestration. Module execution uses ModuleDO for isolation. Routers handle complex data flow patterns.

## Installation

```bash
npm install @dotdo/make
```

## Quick Start

### Define Scenarios

```typescript
import { Make } from '@dotdo/make'

const make = new Make({ id: 'my-app' })

// Simple scenario
const simpleSync = make.createScenario({
  id: 'simple-sync',
  trigger: { type: 'webhook', path: '/sync' },
  modules: [
    {
      id: 'fetch',
      type: 'http',
      action: 'GET',
      url: '{{trigger.url}}'
    },
    {
      id: 'transform',
      type: 'transformer',
      mapping: { name: '{{fetch.data.name | uppercase}}' }
    },
    {
      id: 'save',
      type: 'fsx',
      action: 'writeFile',
      path: '/data/{{transform.name}}.json',
      content: '{{transform | json}}'
    }
  ]
})

// Complex scenario with routing
const multiPathWorkflow = make.createScenario({
  id: 'multi-path',
  trigger: { type: 'cron', schedule: '0 9 * * *' },
  modules: [
    {
      id: 'list-files',
      type: 'fsx',
      action: 'readdir',
      path: '/inbox'
    },
    {
      id: 'iterate',
      type: 'iterator',
      source: '{{list-files.files}}'
    },
    {
      id: 'classify',
      type: 'llm',
      action: 'classify',
      prompt: 'Classify this document: {{iterate.item.content}}',
      categories: ['invoice', 'contract', 'other']
    },
    {
      id: 'route',
      type: 'router',
      routes: [
        { condition: '{{classify.category}} == "invoice"', target: 'process-invoice' },
        { condition: '{{classify.category}} == "contract"', target: 'process-contract' },
        { condition: 'true', target: 'archive' }
      ]
    },
    // ... route handlers
  ]
})
```

### Module Types

```typescript
// Trigger modules (start scenarios)
{ type: 'webhook', path: '/events' }
{ type: 'cron', schedule: '*/5 * * * *' }
{ type: 'email', mailbox: 'inbox@make.do' }

// Action modules (do things)
{ type: 'http', action: 'POST', url: '...', body: '...' }
{ type: 'fsx', action: 'writeFile', path: '...', content: '...' }
{ type: 'gitx', action: 'commit', message: '...', files: [...] }
{ type: 'llm', action: 'generate', prompt: '...' }

// Flow control modules
{ type: 'filter', condition: '{{data.value}} > 10' }
{ type: 'router', routes: [...] }
{ type: 'iterator', source: '{{array}}' }
{ type: 'aggregator', source: '{{items}}', groupBy: '{{item.category}}' }

// Error handling modules
{ type: 'error-handler', action: 'retry', maxRetries: 3 }
{ type: 'error-handler', action: 'ignore' }
{ type: 'error-handler', action: 'route', target: 'error-path' }
```

### Data Mapping

```typescript
// Variable interpolation
'{{module.output.field}}'

// Nested access
'{{module.output.nested.deep.value}}'

// Array access
'{{module.output.items[0].name}}'

// Built-in functions
'{{data.name | uppercase}}'
'{{data.amount | currency}}'
'{{data.date | formatDate "YYYY-MM-DD"}}'
'{{data.items | length}}'
'{{data.value | default "N/A"}}'

// JSON serialization
'{{data | json}}'
'{{data | json 2}}'  // Pretty print with 2-space indent
```

### Error Handling

```typescript
make.createScenario({
  id: 'error-example',
  trigger: { type: 'webhook', path: '/process' },
  modules: [
    {
      id: 'risky-operation',
      type: 'http',
      action: 'POST',
      url: '{{data.url}}',
      errorHandler: {
        action: 'route',
        target: 'error-path',
        // Or: action: 'retry', maxRetries: 3, backoff: 'exponential'
        // Or: action: 'ignore'
        // Or: action: 'break' (stop scenario)
      }
    },
    {
      id: 'error-path',
      type: 'slack',
      action: 'postMessage',
      channel: '#errors',
      text: 'Operation failed: {{error.message}}'
    }
  ]
})
```

### Scheduling

```typescript
// Cron schedule
{ type: 'cron', schedule: '0 9 * * MON-FRI' }  // 9am weekdays

// Interval
{ type: 'interval', every: '15m' }

// Webhook
{ type: 'webhook', path: '/my-trigger' }

// Email
{ type: 'email', mailbox: 'orders@make.do' }
```

### Serve with Hono

```typescript
import { Hono } from 'hono'
import { serve } from '@dotdo/make/hono'

const app = new Hono()

app.all('/api/make/*', serve({
  client: make,
  scenarios: [leadCapture, simpleSync]
}))

export default app
```

## MCP Integration

make.do is AI-native with built-in MCP tool support:

```typescript
// Use fsx.do for filesystem operations
{
  id: 'read-config',
  type: 'fsx',
  action: 'readFile',
  path: '/config/settings.json'
}

// Use gitx.do for version control
{
  id: 'commit-changes',
  type: 'gitx',
  action: 'commit',
  message: 'Auto-generated by make.do',
  files: ['{{modified-files}}']
}

// Use llm.do for AI operations
{
  id: 'summarize',
  type: 'llm',
  action: 'generate',
  model: 'claude-3-opus',
  prompt: 'Summarize this document: {{document.content}}'
}
```

## API Reference

### Make Client

```typescript
const make = new Make({
  id: 'my-app',          // App identifier
  logging: true,         // Enable execution logs
  timezone: 'UTC'        // Default timezone
})

// Create scenarios
make.createScenario(config)

// Run a scenario
await make.run('scenario-id', inputData)

// List scenarios
await make.listScenarios()

// Get execution history
await make.getHistory('scenario-id', { limit: 100 })

// Pause/resume scenarios
await make.pause('scenario-id')
await make.resume('scenario-id')
```

### Scenario Definition

```typescript
interface ScenarioConfig {
  id: string
  name?: string
  description?: string
  trigger: TriggerConfig
  modules: ModuleConfig[]
  errorHandler?: ErrorHandlerConfig
  timeout?: string  // e.g., '30m'
}
```

## The Rewrites Ecosystem

make.do is part of the rewrites family - reimplementations of popular infrastructure on Cloudflare:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [supabase.do](https://supabase.do) | Supabase | Postgres/BaaS for AI |
| [inngest.do](https://inngest.do) | Inngest | Workflows/Jobs for AI |
| **make.do** | Make.com | Visual automation for AI |
| kafka.do | Kafka | Event streaming for AI |
| nats.do | NATS | Messaging for AI |

Each rewrite follows the same pattern:
- Durable Objects for state
- SQLite for persistence
- Cloudflare Queues for messaging
- Compatible API with the original

## Why Cloudflare?

1. **Global Edge** - Scenarios run close to users
2. **No Cold Starts** - Durable Objects stay warm
3. **Unlimited Duration** - No execution timeouts
4. **Built-in Queues** - Reliable module execution
5. **Single-Threaded DO** - No race conditions in data routing

## Related Domains

- **workflows.do** - Workflow orchestration
- **triggers.do** - Event triggers and webhooks
- **inngest.do** - Durable background jobs
- **automation.do** - Business process automation

## License

MIT
