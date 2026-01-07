# n8n.do

n8n on Cloudflare - Fair-code workflow automation with code flexibility.

## The Problem

Modern applications need workflow automation:
- Connect disparate systems and APIs
- Handle complex business logic with branching
- Process data transformations at scale
- Trigger workflows from webhooks, schedules, or events

Traditional solutions require:
- Self-hosting infrastructure
- Managing node process memory
- Scaling worker pools manually
- Complex credential management

## The Vision

Drop-in n8n replacement running entirely on Cloudflare.

```typescript
import { N8n } from '@dotdo/n8n'

const n8n = new N8n({ id: 'my-workflows' })

// Define a workflow with nodes
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

// Execute workflow via webhook
await n8n.trigger('sync-contacts', { apiKey: 'xxx' })
```

No infrastructure to manage. No worker pools to scale. Just workflows that work.

## Features

- **Visual Workflow Editor** - Browser-based node graph editor
- **400+ Integrations** - Pre-built nodes for popular services
- **Code Nodes** - JavaScript and Python for custom logic
- **Webhook Triggers** - HTTP endpoints that start workflows
- **Sub-workflows** - Compose workflows from other workflows
- **Credentials Management** - Secure encrypted credential storage
- **MCP Tools** - AI-native workflow creation and execution via fsx.do and gitx.do

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

### Define Workflows

```typescript
import { N8n } from '@dotdo/n8n'

const n8n = new N8n({ id: 'my-app' })

// Simple webhook workflow
const helloWorkflow = n8n.createWorkflow(
  { id: 'hello', trigger: { type: 'webhook' } },
  async ({ trigger }) => {
    return { message: `Hello ${trigger.data.name}!` }
  }
)

// Multi-node workflow
const processOrder = n8n.createWorkflow(
  { id: 'process-order', trigger: { type: 'webhook' } },
  async ({ trigger, nodes }) => {
    // Fetch order details
    const order = await nodes.httpRequest({
      url: `https://api.store.com/orders/${trigger.data.orderId}`,
      method: 'GET'
    })

    // Validate with code
    const validated = await nodes.code({
      language: 'javascript',
      code: `
        if (!$json.items || $json.items.length === 0) {
          throw new Error('Empty order')
        }
        return { ...$json, validated: true }
      `,
      items: [order]
    })

    // Branch based on total
    const [highValue, standard] = await nodes.switch({
      rules: [
        { output: 0, condition: '{{ $json.total > 1000 }}' },
        { output: 1, condition: 'true' }
      ],
      items: validated
    })

    // Different processing paths
    if (highValue.length > 0) {
      await nodes.slack.message({
        channel: '#vip-orders',
        text: `High value order: $${highValue[0].total}`
      })
    }

    await nodes.email.send({
      to: order.customer.email,
      subject: 'Order Confirmed',
      template: 'order-confirmation',
      data: validated[0]
    })

    return { processed: true }
  }
)
```

### Node Types

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

// Merge nodes
const merged = await nodes.merge({
  mode: 'combine',  // combine | append | wait
  inputs: [branch1, branch2]
})

// Split in batches
const batches = await nodes.splitInBatches({
  batchSize: 100,
  items: largeDataset
})

// Wait
await nodes.wait({
  duration: '5m'  // 5 minutes
})
```

### Trigger Types

```typescript
// Webhook trigger
{ trigger: { type: 'webhook' } }

// Cron trigger
{ trigger: { type: 'cron', expression: '0 9 * * *' } }  // Daily at 9am

// Event trigger
{ trigger: { type: 'event', event: 'order/created' } }

// Manual trigger
{ trigger: { type: 'manual' } }

// Interval trigger
{ trigger: { type: 'interval', every: '5m' } }  // Every 5 minutes
```

### Credentials Management

```typescript
import { N8n } from '@dotdo/n8n'

const n8n = new N8n({ id: 'my-app' })

// Store credentials
await n8n.credentials.create({
  name: 'My Slack',
  type: 'slack',
  data: {
    accessToken: 'xoxb-...'
  }
})

// Use in workflows
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

// List credentials
const creds = await n8n.credentials.list()

// Delete credentials
await n8n.credentials.delete('My Slack')
```

### Sub-workflows

```typescript
const validateOrder = n8n.createWorkflow(
  { id: 'validate-order', trigger: { type: 'workflow' } },
  async ({ trigger }) => {
    // Validation logic
    return { valid: true, order: trigger.data }
  }
)

const processOrder = n8n.createWorkflow(
  { id: 'process-order', trigger: { type: 'webhook' } },
  async ({ trigger, nodes }) => {
    // Call sub-workflow
    const validated = await nodes.executeWorkflow({
      workflowId: 'validate-order',
      data: trigger.data
    })

    if (!validated.valid) {
      throw new Error('Invalid order')
    }

    // Continue processing...
    return { processed: true }
  }
)
```

### MCP Tools Integration

```typescript
import { n8nTools, invokeTool } from '@dotdo/n8n/mcp'
import { fsx } from 'fsx.do'
import { gitx } from 'gitx.do'

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

// Read workflow definitions from filesystem
const workflowFile = await fsx.read('/workflows/sync.json')

// Version control workflows with gitx
await gitx.commit({
  message: 'Add contact sync workflow',
  files: ['/workflows/sync.json']
})
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
      // Error workflow
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
console.log(execution.data)  // All node outputs
console.log(execution.duration)
console.log(execution.status)

// Retry failed execution
await n8n.executions.retry(executionId)
```

## The Rewrites Ecosystem

n8n.do is part of the rewrites family - reimplementations of popular infrastructure on Cloudflare:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [supabase.do](https://supabase.do) | Supabase | Postgres/BaaS for AI |
| [inngest.do](https://inngest.do) | Inngest | Durable workflows for AI |
| **n8n.do** | n8n | Visual automation for AI |
| kafka.do | Kafka | Event streaming for AI |
| nats.do | NATS | Messaging for AI |

Each rewrite follows the same pattern:
- Durable Objects for state
- SQLite for persistence
- Cloudflare Queues for messaging
- Compatible API with the original

## Why Cloudflare?

1. **Global Edge** - Workflows run close to users
2. **No Cold Starts** - Durable Objects stay warm
3. **Unlimited Duration** - No execution timeouts
4. **Built-in Queues** - Reliable node execution
5. **Single-Threaded DO** - No race conditions in workflow state

## Related Domains

- **workflows.do** - Workflow orchestration
- **inngest.do** - Event-driven durable execution
- **triggers.do** - Event triggers and webhooks
- **cron.do** - Scheduled tasks

## License

MIT
