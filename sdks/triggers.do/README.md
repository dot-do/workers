# triggers.do

**When this happens, do that. Automatically.**

```bash
npm install triggers.do
```

## Quick Start

```typescript
// Cloudflare Workers - import env adapter first
import 'rpc.do/env'
import { triggers } from 'triggers.do'

// Or use the factory for custom config
import { Triggers } from 'triggers.do'
const triggers = Triggers({ baseURL: 'https://custom.example.com' })
```

---

## Your Automation Is a Mess

You need to react to events across your system. Customer signups. Webhook callbacks. Scheduled tasks. Threshold breaches.

But connecting everything means:
- Polling APIs in expensive cron jobs
- Scattered webhook handlers with no visibility
- Manual processes that get forgotten
- Events that slip through the cracks
- Building the same if-this-then-that logic over and over

**Your events deserve a unified system, not scattered scripts.**

## What If Triggers Just Worked?

```typescript
import triggers from 'triggers.do'

// Describe what you want in plain English
const alert = await triggers.do`
  When a new order is placed over $100,
  notify the sales team on Slack
`

// Or define with full control
const highValue = await triggers.create({
  name: 'high-value-order',
  event: 'order.created',
  conditions: [{ field: 'amount', operator: 'gt', value: 100 }],
  actions: [
    { type: 'slack', channel: '#sales', message: 'New high-value order: ${{amount}}' },
    { type: 'email', to: 'sales@company.com', template: 'high-value-alert' }
  ]
})

// Schedule recurring tasks
await triggers.schedule({
  name: 'daily-report',
  cron: '0 9 * * *',
  timezone: 'America/New_York',
  action: { type: 'workflow', id: 'generate-report' }
})
```

**triggers.do** gives you:
- Unified triggers for events, webhooks, and schedules
- Powerful conditions with field-level matching
- Multiple actions per trigger
- Full visibility with logs and testing
- Enable/disable without deleting

## Automate in 3 Steps

### 1. Define Your Trigger

```typescript
import triggers from 'triggers.do'

// Natural language for simple triggers
const simple = await triggers.do`
  When a user signs up for the enterprise plan,
  send a welcome email and notify the sales team
`

// Full control for complex logic
const complex = await triggers.create({
  name: 'enterprise-signup',
  event: 'user.created',
  conditions: [
    { field: 'plan', operator: 'eq', value: 'enterprise' },
    { field: 'company.size', operator: 'gte', value: 100 }
  ],
  actions: [
    { type: 'email', to: '{{user.email}}', template: 'enterprise-welcome' },
    { type: 'slack', channel: '#sales', message: 'Enterprise signup: {{company.name}}' },
    { type: 'workflow', id: 'enterprise-onboarding' }
  ]
})
```

### 2. Set Your Conditions

```typescript
// Field-level conditions with operators
const conditions = [
  { field: 'amount', operator: 'gt', value: 1000 },
  { field: 'status', operator: 'eq', value: 'active' },
  { field: 'tags', operator: 'contains', value: 'vip' },
  { field: 'email', operator: 'endsWith', value: '@enterprise.com' },
  { field: 'metadata.source', operator: 'in', value: ['google', 'referral'] }
]

// Test your trigger before deploying
const result = await triggers.test('enterprise-signup', {
  plan: 'enterprise',
  company: { name: 'Acme Corp', size: 500 }
})
console.log(result.matched) // true
console.log(result.actionsWouldExecute) // [{ type: 'email', ... }, ...]
```

### 3. Add Your Actions

```typescript
// Multiple action types
const actions = [
  // Send webhooks
  { type: 'webhook', url: 'https://api.example.com/notify', data: { event: '{{event}}' } },

  // Send emails
  { type: 'email', to: 'team@company.com', template: 'alert', data: { amount: '{{amount}}' } },

  // Post to Slack
  { type: 'slack', channel: '#alerts', message: 'New event: {{event.type}}' },

  // Trigger workflows
  { type: 'workflow', id: 'process-order' },

  // Call functions
  { type: 'function', id: 'calculate-bonus' },

  // Emit events
  { type: 'event', name: 'order.processed', data: { orderId: '{{id}}' } }
]

// With delays and retries
const reliable = {
  type: 'webhook',
  url: 'https://api.example.com/notify',
  delay: '5m',
  retry: { attempts: 3, delay: '1m' }
}
```

## The Difference

**Without triggers.do:**
- Cron jobs polling APIs every minute
- Webhook handlers scattered across services
- No idea what triggers exist
- Testing means deploying to production
- Events lost when services restart
- Manual processes that break silently

**With triggers.do:**
- Event-driven, not polling
- All triggers in one place
- Full visibility with logs
- Test triggers before deploying
- Durable execution guaranteed
- Automated and observable

## Everything You Need

```typescript
// Webhook triggers
const github = await triggers.webhook({
  name: 'github-push',
  path: '/webhooks/github',
  secret: env.GITHUB_WEBHOOK_SECRET, // via rpc.do/env
  conditions: [{ field: 'ref', operator: 'eq', value: 'refs/heads/main' }],
  actions: [{ type: 'workflow', id: 'ci-pipeline' }]
})
console.log(github.url) // https://triggers.do/webhooks/github

// Scheduled triggers
await triggers.schedule({
  name: 'weekly-cleanup',
  cron: '0 0 * * 0',
  action: { type: 'function', id: 'cleanup-old-data' }
})

// Manage triggers
await triggers.enable('github-push')
await triggers.disable('weekly-cleanup')

// View logs
const logs = await triggers.logs('github-push', { limit: 100 })

// View events
const events = await triggers.events('github-push', { matched: true })

// Manually fire
await triggers.fire('enterprise-signup', {
  plan: 'enterprise',
  company: { name: 'Test Corp' }
})
```

## Condition Operators

| Operator | Description | Example |
|----------|-------------|---------|
| `eq` | Equals | `{ field: 'status', operator: 'eq', value: 'active' }` |
| `neq` | Not equals | `{ field: 'type', operator: 'neq', value: 'test' }` |
| `gt` | Greater than | `{ field: 'amount', operator: 'gt', value: 100 }` |
| `gte` | Greater than or equal | `{ field: 'count', operator: 'gte', value: 10 }` |
| `lt` | Less than | `{ field: 'age', operator: 'lt', value: 18 }` |
| `lte` | Less than or equal | `{ field: 'score', operator: 'lte', value: 50 }` |
| `contains` | Contains value | `{ field: 'tags', operator: 'contains', value: 'vip' }` |
| `startsWith` | Starts with | `{ field: 'email', operator: 'startsWith', value: 'admin' }` |
| `endsWith` | Ends with | `{ field: 'domain', operator: 'endsWith', value: '.com' }` |
| `matches` | Regex match | `{ field: 'phone', operator: 'matches', value: '^\\+1' }` |
| `exists` | Field exists | `{ field: 'metadata.custom', operator: 'exists', value: true }` |
| `in` | Value in array | `{ field: 'country', operator: 'in', value: ['US', 'CA'] }` |

## Configuration

```typescript
import { Triggers } from 'triggers.do'

// For Cloudflare Workers, import env adapter first
import 'rpc.do/env'

const triggers = Triggers({
  // API key is read from TRIGGERS_API_KEY or DO_API_KEY environment variables
})
```

Or set `TRIGGERS_API_KEY` or `DO_API_KEY` in your environment.

## Stop Missing Events

Events happen. Make sure you react. Define your triggers once, let them run forever, debug them instantly.

**Your automation should be an asset, not a liability.**

```bash
npm install triggers.do
```

[Start automating at triggers.do](https://triggers.do)

---

MIT License
