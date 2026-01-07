# make.do

Make.com reimagined for the AI era. Natural language automation with promise pipelining.

## The Problem

**For automation architects who've outgrown Make.com's pricing** - processing millions of operations at $10k+/month while watching every webhook cost you money.

The stakes are real:
- **Per-operation fees compound** - 10M ops/month at $0.001 = $10,000
- **Vendor lock-in** - Your scenarios are trapped in their proprietary format
- **Data leaving your infrastructure** - Every operation routes through their cloud
- **Limited by their imagination** - No AI-native operations, no code when you need it

Traditional automation platforms were built for a world without AI. They charge per click while AI agents need to orchestrate millions.

## The Vision

Automation that speaks your language. Literally.

```typescript
import { make } from '@dotdo/make'

make`when webhook /leads: validate, enrich from clearbit, route to salesforce or hubspot`
make`every hour: check inventory, alert slack if low stock`
make`process uploaded CSV: parse, validate, insert to database`
```

No drag-and-drop. No per-operation costs. Just describe what you want.

### Promise Pipelining

Chain operations without `Promise.all`. One network round trip:

```typescript
const processed = await make`watch /inbox`
  .map(file => make`classify ${file}`)
  .map(classified => make`route ${classified} to handler`)
// Single network round trip - CapnWeb pipelining!

const enriched = await make`fetch new leads from webhook`
  .map(lead => make`enrich ${lead} with clearbit`)
  .map(enriched => [
    make`create ${enriched} in salesforce`,
    make`notify slack about ${enriched}`
  ])
```

### AI-Native from the Ground Up

Every scenario understands AI. Every module can think:

```typescript
make`when email arrives: classify intent, draft response, route to agent or human`

make`every day at 9am:
  summarize yesterday's sales,
  identify trends,
  draft report for team`

make`when order placed:
  analyze for fraud risk,
  if suspicious alert security else process normally`
```

Built-in LLM operations - no "AI block" add-on. No extra per-token fees on top of your provider costs.

### Agent Integration

Let agents build your automations:

```typescript
import { ralph } from 'agents.do'

ralph`build a scenario that syncs Stripe invoices to Airtable`
ralph`create a webhook that enriches leads and routes to salesforce`
ralph`automate our onboarding emails based on user behavior`
```

Priya plans the automation. Ralph builds it. Quinn tests it. The whole team, automated.

## When You Need Control

For complex scenarios, drop down to the structured API:

```typescript
import { Make } from '@dotdo/make'

const make = new Make({ id: 'my-automation' })

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

await make.run('lead-capture', { email: 'ceo@bigcorp.com' })
```

Full type safety. Full control. Same runtime.

## Features

- **Natural Language** - Describe scenarios in plain English
- **Promise Pipelining** - Chain operations with `.map()`, single round trip
- **AI-Native** - LLM operations are first-class citizens
- **Agent Integration** - Let AI agents build your automations
- **Visual Canvas** - Drag-and-drop builder (coming soon)
- **Module Types** - Triggers, actions, aggregators, iterators, routers, filters
- **Data Mapping** - JSONPath and Mustache-style variable interpolation
- **Error Handling** - Error routes, retries, break/continue handlers
- **Edge Native** - Runs on Cloudflare's global network
- **Zero Per-Op Costs** - Flat rate, unlimited operations

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

### Natural Language Scenarios

```typescript
import { make } from '@dotdo/make'

// Simple webhook handler
make`when /orders webhook: validate, save to database, send confirmation email`

// Scheduled jobs
make`every monday at 9am: generate weekly report, send to #team-updates`

// File processing
make`when file uploaded to /inbox:
  extract text with OCR,
  classify document type,
  route to appropriate folder`

// Multi-step with AI
make`when support ticket created:
  analyze sentiment and urgency,
  if urgent escalate to human else draft AI response,
  log to analytics`
```

### Promise Pipelining in Action

```typescript
// Process a batch of leads with enrichment and routing
const results = await make`fetch leads from /api/leads`
  .map(lead => make`enrich ${lead} from clearbit`)
  .map(enriched => make`score ${enriched} for sales readiness`)
  .map(scored => scored.score > 80
    ? make`create opportunity in salesforce for ${scored}`
    : make`add ${scored} to nurture campaign`)

// Parallel processing with aggregation
const reports = await make`list all departments`
  .map(dept => make`generate monthly report for ${dept}`)
  .map(report => make`send ${report} to department head`)
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

### Serve with Hono

```typescript
import { Hono } from 'hono'
import { serve } from '@dotdo/make/hono'

const app = new Hono()

app.all('/api/make/*', serve({
  client: make,
  scenarios: [leadCapture, orderProcessing]
}))

export default app
```

## MCP Integration

make.do exposes all operations as MCP tools for AI orchestration:

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
