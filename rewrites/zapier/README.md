# zapier.do

Zapier on Cloudflare - No-code automation with triggers, actions, and multi-step Zaps running on the edge.

## The Problem

Modern businesses need automation to connect their apps:
- Trigger workflows when events happen
- Call APIs across 5000+ integrations
- Transform and filter data between steps
- Handle complex multi-step workflows

Traditional solutions require:
- Centralized platform with usage limits
- Per-task pricing that scales expensively
- Vendor lock-in to proprietary platform
- Cold starts and latency issues

## The Vision

Drop-in Zapier replacement running entirely on Cloudflare with MCP tools for AI-native automation.

```typescript
import { Zapier } from '@dotdo/zapier'
import { fsx, gitx } from 'dotdo'

const zapier = new Zapier({ id: 'my-automation' })

// Define a Zap with triggers and actions
export const newUserZap = zapier.createZap({
  name: 'New User Onboarding',
  trigger: {
    app: 'webhook',
    event: 'user/created',
    filters: [{ field: 'data.verified', condition: 'equals', value: true }]
  },
  actions: [
    {
      name: 'Create CRM Contact',
      app: 'salesforce',
      action: 'createContact',
      inputs: {
        email: '{{trigger.data.email}}',
        name: '{{trigger.data.name}}'
      }
    },
    {
      name: 'Send Welcome Email',
      app: 'sendgrid',
      action: 'sendEmail',
      inputs: {
        to: '{{trigger.data.email}}',
        template: 'welcome'
      }
    },
    {
      name: 'Log to File',
      app: 'fsx.do',
      action: 'write',
      inputs: {
        path: '/logs/onboarding/{{formatDate(trigger.timestamp, "YYYY-MM-DD")}}.jsonl',
        content: '{{json(steps)}}'
      }
    }
  ]
})

// Send events to trigger Zaps
await zapier.trigger({
  event: 'user/created',
  data: { email: 'user@example.com', name: 'Jane', verified: true }
})
```

No vendor lock-in. AI-native with MCP tools. Just automation that works.

## Features

- **Triggers** - Webhooks, schedules (cron), polling, and event subscriptions
- **Actions** - API calls to 5000+ apps with built-in connectors
- **Multi-step Zaps** - Chain actions with data passing between steps
- **Filters & Paths** - Conditional logic to route workflows
- **Formatter** - Data transformation with templates and functions
- **AI-Native** - MCP tools for fsx.do, gitx.do integration
- **Edge Native** - Runs on Cloudflare's global network

## Architecture

```
                    +----------------------+
                    |     zapier.do        |
                    |  (Cloudflare Worker) |
                    +----------------------+
                              |
              +---------------+---------------+---------------+
              |               |               |               |
    +------------------+ +------------------+ +------------------+ +------------------+
    |     TriggerDO    | |     ActionDO     | |    FilterDO      | |   FormatterDO    |
    | (event sources)  | | (API execution)  | | (conditionals)   | | (transforms)     |
    +------------------+ +------------------+ +------------------+ +------------------+
              |               |               |               |
              +---------------+---------------+---------------+
                              |
                    +-------------------+
                    |  Cloudflare Queues |
                    |  (step execution)  |
                    +-------------------+
                              |
              +---------------+---------------+
              |                               |
    +------------------+             +------------------+
    |      fsx.do      |             |     gitx.do      |
    |  (file storage)  |             | (version control)|
    +------------------+             +------------------+
```

**Key insight**: Durable Objects provide single-threaded, strongly consistent state. Each Zap execution gets its own execution context with step memoization. MCP tools (fsx.do, gitx.do) enable AI-native file and git operations.

## Installation

```bash
npm install @dotdo/zapier
```

## Quick Start

### Define Triggers

```typescript
import { Zapier } from '@dotdo/zapier'

const zapier = new Zapier({ id: 'my-app' })

// Webhook trigger
const webhookTrigger = {
  app: 'webhook',
  event: 'incoming',
  config: {
    path: '/hooks/my-webhook',
    method: 'POST'
  }
}

// Schedule trigger (cron)
const scheduleTrigger = {
  app: 'schedule',
  event: 'cron',
  config: {
    expression: '0 9 * * *'  // Daily at 9am UTC
  }
}

// Polling trigger
const pollTrigger = {
  app: 'poll',
  event: 'new-item',
  config: {
    url: 'https://api.example.com/items',
    interval: '5m',
    dedupeField: 'id'
  }
}
```

### Define Actions

```typescript
// Built-in app action
const slackAction = {
  name: 'Post to Slack',
  app: 'slack',
  action: 'postMessage',
  inputs: {
    channel: '#general',
    text: 'New user: {{trigger.data.name}}'
  }
}

// HTTP action (any API)
const httpAction = {
  name: 'Call API',
  app: 'http',
  action: 'request',
  inputs: {
    method: 'POST',
    url: 'https://api.example.com/users',
    headers: { 'Content-Type': 'application/json' },
    body: '{{json(trigger.data)}}'
  }
}

// MCP tool action (AI-native)
const fsxAction = {
  name: 'Write to File',
  app: 'fsx.do',
  action: 'write',
  inputs: {
    path: '/data/{{trigger.data.id}}.json',
    content: '{{json(trigger.data)}}'
  }
}

const gitxAction = {
  name: 'Commit Changes',
  app: 'gitx.do',
  action: 'commit',
  inputs: {
    message: 'Add user {{trigger.data.id}}',
    files: ['{{steps.writeFile.path}}']
  }
}
```

### Create Multi-Step Zaps

```typescript
export const orderProcessingZap = zapier.createZap({
  name: 'Order Processing',
  trigger: {
    app: 'webhook',
    event: 'order/created'
  },
  actions: [
    // Step 1: Validate order
    {
      name: 'validateOrder',
      app: 'code',
      action: 'run',
      inputs: {
        code: `
          if (trigger.data.total < 0) throw new Error('Invalid total')
          return { valid: true, orderId: trigger.data.id }
        `
      }
    },
    // Step 2: Charge payment
    {
      name: 'chargePayment',
      app: 'stripe',
      action: 'createCharge',
      inputs: {
        amount: '{{trigger.data.total}}',
        currency: 'usd',
        source: '{{trigger.data.paymentMethod}}'
      }
    },
    // Step 3: Send confirmation
    {
      name: 'sendConfirmation',
      app: 'sendgrid',
      action: 'sendEmail',
      inputs: {
        to: '{{trigger.data.email}}',
        subject: 'Order Confirmed: {{trigger.data.id}}',
        body: 'Your order total: ${{trigger.data.total}}'
      }
    },
    // Step 4: Log to filesystem (AI-native)
    {
      name: 'logOrder',
      app: 'fsx.do',
      action: 'append',
      inputs: {
        path: '/orders/{{formatDate(now(), "YYYY-MM")}}.jsonl',
        content: '{{json(steps)}}\n'
      }
    }
  ]
})
```

### Filters and Conditional Paths

```typescript
export const conditionalZap = zapier.createZap({
  name: 'Conditional Routing',
  trigger: { app: 'webhook', event: 'lead/created' },
  actions: [
    {
      name: 'checkScore',
      app: 'filter',
      action: 'only_continue_if',
      inputs: {
        conditions: [
          { field: 'trigger.data.score', condition: 'greater_than', value: 50 }
        ]
      }
    },
    {
      name: 'routeByType',
      app: 'path',
      action: 'switch',
      inputs: {
        field: 'trigger.data.type',
        cases: {
          'enterprise': [
            { app: 'slack', action: 'postMessage', inputs: { channel: '#sales-enterprise' } }
          ],
          'startup': [
            { app: 'slack', action: 'postMessage', inputs: { channel: '#sales-startup' } }
          ],
          'default': [
            { app: 'slack', action: 'postMessage', inputs: { channel: '#sales-general' } }
          ]
        }
      }
    }
  ]
})
```

### Formatter (Data Transformation)

```typescript
const transformAction = {
  name: 'transformData',
  app: 'formatter',
  action: 'transform',
  inputs: {
    operations: [
      { type: 'text', action: 'uppercase', field: 'name' },
      { type: 'number', action: 'round', field: 'total', decimals: 2 },
      { type: 'date', action: 'format', field: 'created', format: 'YYYY-MM-DD' },
      { type: 'lookup', table: 'regions', key: 'countryCode', value: 'regionName' }
    ]
  }
}
```

### Template Expressions

```typescript
// Access trigger data
'{{trigger.data.email}}'

// Access previous step outputs
'{{steps.validateOrder.orderId}}'
'{{steps.chargePayment.chargeId}}'

// Built-in functions
'{{formatDate(trigger.timestamp, "YYYY-MM-DD HH:mm")}}'
'{{json(trigger.data)}}'
'{{lookup(trigger.data.code, "countries", "name")}}'
'{{math(trigger.data.price * 0.9)}}'  // 10% discount
'{{slugify(trigger.data.title)}}'
'{{truncate(trigger.data.description, 100)}}'
```

### Serve with Hono

```typescript
import { Hono } from 'hono'
import { serve } from '@dotdo/zapier/hono'

const app = new Hono()

app.all('/api/zapier/*', serve({
  client: zapier,
  zaps: [newUserZap, orderProcessingZap, conditionalZap]
}))

export default app
```

## MCP Integration (AI-Native)

zapier.do integrates with MCP tools for AI-native file and git operations:

```typescript
// File operations via fsx.do
{
  app: 'fsx.do',
  action: 'read' | 'write' | 'append' | 'delete' | 'list' | 'stat',
  inputs: { path: '/path/to/file', content: '...' }
}

// Git operations via gitx.do
{
  app: 'gitx.do',
  action: 'clone' | 'commit' | 'push' | 'pull' | 'branch' | 'merge',
  inputs: { repo: 'org/repo', message: '...', files: [...] }
}
```

## Built-in App Connectors

| Category | Apps |
|----------|------|
| **CRM** | Salesforce, HubSpot, Pipedrive |
| **Email** | SendGrid, Mailchimp, Gmail |
| **Chat** | Slack, Discord, Teams |
| **Storage** | fsx.do, S3, Google Drive, Dropbox |
| **Code** | gitx.do, GitHub, GitLab |
| **Database** | Supabase, Airtable, Notion |
| **Payments** | Stripe, PayPal |
| **HTTP** | Any REST API |

## Error Handling and Retries

```typescript
export const reliableZap = zapier.createZap({
  name: 'Reliable Processing',
  config: {
    retries: {
      attempts: 5,
      backoff: 'exponential',
      maxDelay: '1h'
    },
    errorHandling: 'continue' | 'halt' | 'branch'
  },
  trigger: { ... },
  actions: [
    {
      name: 'riskyAction',
      app: 'http',
      action: 'request',
      errorPath: [
        { app: 'slack', action: 'postMessage', inputs: { channel: '#alerts' } }
      ]
    }
  ]
})
```

## The Rewrites Ecosystem

zapier.do is part of the rewrites family - reimplementations of popular infrastructure on Cloudflare:

| Rewrite | Original | Purpose |
|---------|----------|---------|
| [fsx.do](https://fsx.do) | fs (Node.js) | Filesystem for AI |
| [gitx.do](https://gitx.do) | git | Version control for AI |
| [inngest.do](https://inngest.do) | Inngest | Workflows/Jobs for AI |
| **zapier.do** | Zapier | Automation for AI |
| [kafka.do](https://kafka.do) | Kafka | Event streaming for AI |
| [nats.do](https://nats.do) | NATS | Messaging for AI |

Each rewrite follows the same pattern:
- Durable Objects for state
- SQLite for persistence
- Cloudflare Queues for messaging
- Compatible API with the original

## Why Cloudflare?

1. **Global Edge** - Zaps run close to users
2. **No Cold Starts** - Durable Objects stay warm
3. **Unlimited Duration** - No execution timeouts
4. **Built-in Queues** - Reliable step execution
5. **Single-Threaded DO** - No race conditions in Zap execution

## Related Domains

- **workflows.do** - Workflow orchestration
- **triggers.do** - Event triggers and webhooks
- **inngest.do** - Event-driven durable execution
- **cron.do** - Scheduled tasks

## License

MIT
