# n8n.do

n8n on Cloudflare - Workflow automation without Kubernetes.

## The Hero

You're a startup founder. You need n8n's power - webhooks triggering workflows, data flowing between systems, complex branching logic. But:

- **Self-hosted n8n** means YOUR servers, YOUR problems, YOUR 3am pages
- **n8n Cloud** starts at $20/month, scales to $200+ as you grow
- **Zapier** costs $600+/month for real usage
- **Make.com** nickel-and-dimes every operation

You can't afford ops. You can't afford Kubernetes. You need **workflow automation that just works**.

## The Vision

```typescript
import { n8n } from '@dotdo/n8n'

n8n`when webhook received, fetch contacts from CRM, route B2B to airtable, B2C to hubspot`
n8n`every day at 9am, sync salesforce opportunities to slack #deals`
n8n`on new github issue, classify with AI, assign to appropriate team`
```

Natural language. Tagged templates. Workflows as sentences.

No YAML. No visual editor required. No infrastructure to manage.

## Promise Pipelining

Chain workflows without `Promise.all`. One network round trip:

```typescript
const synced = await n8n`fetch all postgres tables`
  .map(table => n8n`transform ${table} to analytics schema`)
  .map(transformed => n8n`load ${transformed} to bigquery`)
// One network round trip!
```

ETL pipelines in three lines. The system handles parallelization, retries, and state.

```typescript
const notified = await n8n`get all overdue invoices from stripe`
  .map(invoice => n8n`send reminder email for ${invoice}`)
  .map(sent => n8n`log ${sent} to analytics`)
  .map(logged => n8n`update CRM for ${logged}`)
```

## Agent Integration

Let Ralph build your workflows:

```typescript
import { ralph } from 'agents.do'

ralph`create a workflow that processes new orders`
// Ralph analyzes your systems, generates the workflow, tests it

ralph`when a github PR is merged, update linear ticket and notify slack`
// Natural language -> running workflow
```

Or have Priya design the automation strategy:

```typescript
import { priya } from 'agents.do'

priya`design automation strategy for customer onboarding`
// Priya creates a plan, Ralph implements each workflow
  .map(workflow => ralph`implement ${workflow}`)
```

## When You Need Control

For complex logic, use the structured API:

```typescript
import { N8n } from '@dotdo/n8n'

const n8n = new N8n({ id: 'my-workflows' })

export const syncContacts = n8n.createWorkflow(
  { id: 'sync-contacts', trigger: { type: 'webhook' } },
  async ({ trigger, nodes }) => {
    // HTTP request to fetch contacts
    const contacts = await nodes.httpRequest({
      url: 'https://api.crm.com/contacts',
      method: 'GET',
      headers: { Authorization: `Bearer ${trigger.data.apiKey}` }
    })

    // Transform data with code node
    const transformed = await nodes.code({
      language: 'javascript',
      code: `
        return items.map(contact => ({
          email: contact.email,
          name: contact.firstName + ' ' + contact.lastName,
          company: contact.company?.name
        }))
      `,
      items: contacts
    })

    // Conditional branching
    const [hasCompany, noCompany] = await nodes.if({
      condition: '{{ $json.company !== undefined }}',
      items: transformed
    })

    // Parallel processing
    await Promise.all([
      nodes.airtable.create({ base: 'contacts', table: 'B2B', records: hasCompany }),
      nodes.airtable.create({ base: 'contacts', table: 'B2C', records: noCompany })
    ])

    return { synced: transformed.length }
  }
)
```

## Architecture

```
                    +----------------------+
                    |      n8n.do          |
                    | (Cloudflare Worker)  |
                    +----------------------+
                              |
              +---------------+---------------+
              |               |               |
    +------------------+ +------------------+ +------------------+
    |   WorkflowDO     | |   ExecutionDO    | |  CredentialDO    |
    |  (definitions)   | |   (runs/state)   | |  (secrets)       |
    +------------------+ +------------------+ +------------------+
              |               |               |
              +---------------+---------------+
                              |
                    +-------------------+
                    |  Cloudflare Queues |
                    |  (node execution)  |
                    +-------------------+
```

**Key insight**: Durable Objects provide single-threaded, strongly consistent state. Each workflow gets its own WorkflowDO for definition storage. ExecutionDO tracks run state with step memoization. CredentialDO securely stores and retrieves encrypted credentials.

## Installation

```bash
npm install @dotdo/n8n
```

## Quick Start

### Natural Language Workflows

```typescript
import { n8n } from '@dotdo/n8n'

// Simple webhook response
n8n`when webhook /hello is called, respond with "Hello World"`

// Data sync
n8n`every hour, sync shopify orders to google sheets`

// Conditional routing
n8n`on new zendesk ticket, if priority is high route to slack #urgent, else email support team`

// AI-powered processing
n8n`when email received, classify intent with AI, route to appropriate workflow`
```

### Trigger Types

```typescript
// Webhook trigger
n8n`when webhook /orders is called, process the order`

// Cron trigger
n8n`every day at 9am, generate daily report`
n8n`every monday at 8am, send weekly summary`

// Event trigger
n8n`on stripe payment_succeeded, update customer status`
n8n`on github push to main, deploy to production`

// Interval trigger
n8n`every 5 minutes, check for new leads`
```

### Complex Pipelines

```typescript
// Multi-stage data processing
const processed = await n8n`fetch new signups from database`
  .map(user => n8n`enrich ${user} with clearbit data`)
  .map(enriched => n8n`score ${enriched} for sales qualification`)
  .map(scored => scored.score > 80
    ? n8n`route ${scored} to sales team`
    : n8n`add ${scored} to nurture campaign`)

// Fan-out notifications
const notified = await n8n`get all users affected by outage`
  .map(user => [
    n8n`send email to ${user}`,
    n8n`send sms to ${user}`,
    n8n`update status page for ${user}`
  ])
```

### Node Types (Structured API)

```typescript
// HTTP Request
const response = await nodes.httpRequest({
  url: 'https://api.example.com/data',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: { key: 'value' }
})

// Code Node (JavaScript)
const result = await nodes.code({
  language: 'javascript',
  code: `
    const processed = items.map(item => ({
      ...item,
      timestamp: new Date().toISOString()
    }))
    return processed
  `,
  items: inputData
})

// Code Node (Python)
const pythonResult = await nodes.code({
  language: 'python',
  code: `
import json
result = [{'id': item['id'], 'processed': True} for item in items]
return result
  `,
  items: inputData
})

// Conditional (If)
const [trueBranch, falseBranch] = await nodes.if({
  condition: '{{ $json.status === "active" }}',
  items: data
})

// Switch (Multiple Branches)
const branches = await nodes.switch({
  rules: [
    { output: 0, condition: '{{ $json.type === "email" }}' },
    { output: 1, condition: '{{ $json.type === "sms" }}' },
    { output: 2, condition: 'true' }  // Default
  ],
  items: data
})
```

### Credentials Management

```typescript
import { N8n } from '@dotdo/n8n'

const n8n = new N8n({ id: 'my-app' })

// Store credentials
await n8n.credentials.create({
  name: 'My Slack',
  type: 'slack',
  data: { accessToken: 'xoxb-...' }
})

// Use in workflows
n8n`send message to slack #general using My Slack credential`

// Or in structured API
const slackWorkflow = n8n.createWorkflow(
  { id: 'notify-slack', trigger: { type: 'webhook' } },
  async ({ trigger, nodes }) => {
    await nodes.slack.message({
      credential: 'My Slack',
      channel: '#notifications',
      text: trigger.data.message
    })
  }
)
```

### MCP Tools Integration

```typescript
import { n8nTools, invokeTool } from '@dotdo/n8n/mcp'

// List available workflow tools
console.log(n8nTools.map(t => t.name))
// ['workflow_create', 'workflow_execute', 'workflow_list', 'node_run', ...]

// AI-native workflow execution
const result = await invokeTool('workflow_execute', {
  workflowId: 'sync-contacts',
  data: { source: 'crm', destination: 'airtable' }
})

// Create workflow from natural language
await invokeTool('workflow_create', {
  natural: 'When a new row is added to Google Sheets, create a task in Asana'
})
```

## Deployment

### wrangler.toml

```toml
name = "n8n-workflows"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[durable_objects.bindings]]
name = "WORKFLOW_DO"
class_name = "WorkflowDO"

[[durable_objects.bindings]]
name = "EXECUTION_DO"
class_name = "ExecutionDO"

[[durable_objects.bindings]]
name = "CREDENTIAL_DO"
class_name = "CredentialDO"

[[durable_objects.migrations]]
tag = "v1"
new_classes = ["WorkflowDO", "ExecutionDO", "CredentialDO"]

[[queues.producers]]
queue = "workflow-execution"
binding = "WORKFLOW_QUEUE"

[[queues.consumers]]
queue = "workflow-execution"

[vars]
ENVIRONMENT = "production"
```

### Deploy

```bash
npx wrangler deploy
```

### Serve with Hono

```typescript
import { Hono } from 'hono'
import { serve } from '@dotdo/n8n/hono'

const app = new Hono()

app.all('/api/n8n/*', serve({
  client: n8n,
  workflows: [syncContacts, processOrder]
}))

export default app
```

## Error Handling

```typescript
// Natural language with retry
n8n`when webhook fails, retry 3 times with exponential backoff`

// Structured API
n8n.createWorkflow(
  {
    id: 'error-handling',
    trigger: { type: 'webhook' },
    settings: {
      retryOnFail: true,
      maxRetries: 3,
      waitBetweenRetries: 5000
    }
  },
  async ({ trigger, nodes }) => {
    try {
      await nodes.httpRequest({ url: 'https://unreliable-api.com' })
    } catch (error) {
      await nodes.executeWorkflow({
        workflowId: 'error-handler',
        data: { error: error.message, workflow: 'error-handling' }
      })
    }
  }
)
```

## Execution History

```typescript
// List recent executions
const executions = await n8n.executions.list({
  workflowId: 'sync-contacts',
  limit: 10,
  status: 'success'  // success | error | running | waiting
})

// Get execution details
const execution = await n8n.executions.get(executionId)
console.log(execution.data)      // All node outputs
console.log(execution.duration)
console.log(execution.status)

// Retry failed execution
await n8n.executions.retry(executionId)
```

## Why Cloudflare?

| Feature | Self-Hosted n8n | n8n.do |
|---------|-----------------|--------|
| Infrastructure | Your servers | Zero |
| Cold starts | Node.js startup | None (DO stays warm) |
| Execution limits | Memory-bound | Unlimited duration |
| Scaling | Manual worker pools | Automatic |
| Credentials | Your encryption | Built-in vault |
| Global latency | Single region | Edge everywhere |

## The Rewrites Ecosystem

n8n.do is part of the rewrites family - popular infrastructure reimplemented on Cloudflare:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [supabase.do](https://supabase.do) | Supabase | Postgres/BaaS for AI |
| [inngest.do](https://inngest.do) | Inngest | Durable workflows for AI |
| **n8n.do** | n8n | Visual automation for AI |
| [kafka.do](https://kafka.do) | Kafka | Event streaming for AI |
| [nats.do](https://nats.do) | NATS | Messaging for AI |

## Related Domains

- **workflows.do** - Workflow orchestration
- **inngest.do** - Event-driven durable execution
- **triggers.do** - Event triggers and webhooks
- **cron.do** - Scheduled tasks

## License

MIT
